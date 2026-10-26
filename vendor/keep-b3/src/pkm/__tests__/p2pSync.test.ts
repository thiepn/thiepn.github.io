/**
 * Phase P32: Peer-to-Peer Device Sync Test Suite
 * Validates ECDH/HKDF key negotiation, SAS fingerprint generation, AES-GCM encryption,
 * manifest diffing, 3-way text merge, chunking, device trust, and recovery points.
 */

import {
  generateEphemeralECDHKeyPair,
  deriveSessionKeyAndSAS,
  encryptPayload,
  decryptPayload,
  computeSHA256Hex,
  generateHumanPairingCode,
  generateRandomToken,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../p2p/p2pCrypto';
import {
  buildSyncManifest,
  compareSyncManifests,
  recordTombstone,
  getStoredTombstones,
} from '../p2p/p2pManifest';
import { p2pStagingService } from '../p2p/p2pStagingService';
import { p2pDeviceManager } from '../p2p/p2pDeviceManager';
import { merge3Text } from '../mergeEngine';
import { Note, Folder } from '../../types';

export async function runP2PDeviceSyncTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  console.log('--- Running Phase P32: P2P Device Sync Tests ---');

  // Test 1: Ephemeral ECDH Key Pair Generation
  try {
    const peerA = await generateEphemeralECDHKeyPair();
    const peerB = await generateEphemeralECDHKeyPair();

    assert(Boolean(peerA.publicKeyBase64 && peerA.keyPair), 'Peer A generated valid ECDH P-256 key pair');
    assert(Boolean(peerB.publicKeyBase64 && peerB.keyPair), 'Peer B generated valid ECDH P-256 key pair');

    // Test 2: Symmetric Session Key and Identical Short Authentication String (SAS) Derivation
    const sessionA = await deriveSessionKeyAndSAS(peerA.keyPair.privateKey, peerB.publicKeyBase64);
    const sessionB = await deriveSessionKeyAndSAS(peerB.keyPair.privateKey, peerA.publicKeyBase64);

    assert(Boolean(sessionA.sessionKey && sessionB.sessionKey), 'Both peers derived AES-GCM session keys');
    assert(sessionA.sasPhrase === sessionB.sasPhrase, `Both peers computed identical SAS auth phrase: "${sessionA.sasPhrase}"`);
    assert(sessionA.sasCode === sessionB.sasCode, 'Both peers computed identical SAS numerical auth code');

    // Test 3: Authenticated AES-GCM Payload Encryption & Decryption
    const secretMessage = JSON.stringify({ noteId: 'note-123', title: 'Private Sync Note', body: 'Sensitive PKM text' });
    const encrypted = await encryptPayload(secretMessage, sessionA.sessionKey);
    const decrypted = await decryptPayload(encrypted, sessionB.sessionKey);

    assert(decrypted === secretMessage, 'Encrypted payload successfully decrypted by peer with shared session key');

    // Test 4: Tampering & Invalid Key Detection
    let tamperingDetected = false;
    try {
      const rawBytes = new Uint8Array(base64ToArrayBuffer(encrypted));
      rawBytes[rawBytes.length - 1] ^= 0x01; // corrupt last byte
      const tampered = arrayBufferToBase64(rawBytes.buffer);
      await decryptPayload(tampered, sessionB.sessionKey);
    } catch {
      tamperingDetected = true;
    }
    assert(tamperingDetected, 'AES-GCM rejected tampered ciphertext');
  } catch (err: any) {
    failed++;
    errors.push(`Crypto negotiation failed: ${err.message}`);
  }

  // Test 5: Human Pairing Code Generation & Format
  try {
    const code = generateHumanPairingCode();
    assert(/^PKM-\d{4}-\d{4}$/.test(code), `Generated human pairing code matches format: ${code}`);
  } catch (err: any) {
    failed++;
    errors.push(`Pairing code error: ${err.message}`);
  }

  function createMockNote(partial: Partial<Note>): Note {
    return {
      id: partial.id || 'note-1',
      title: partial.title || 'Untitled',
      content: partial.content || '',
      type: partial.type || 'text',
      checklist: partial.checklist || [],
      color: partial.color || 'default',
      tags: partial.tags || [],
      folderId: partial.folderId || null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: partial.updatedAt || new Date().toISOString(),
      reminderDate: null,
      images: [],
      ...partial,
    };
  }

  function createMockFolder(partial: Partial<Folder>): Folder {
    return {
      id: partial.id || 'folder-1',
      name: partial.name || 'Folder',
      icon: partial.icon || 'Folder',
      color: partial.color || 'blue',
      createdAt: partial.createdAt || new Date().toISOString(),
      ...partial,
    };
  }

  // Test 6: Sync Manifest Generation & Canonical Hashes
  try {
    const sampleNotes: Note[] = [
      createMockNote({
        id: 'note-a',
        title: 'Project Alpha',
        content: '# Alpha\nWork in progress.',
        tags: ['project', 'work'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T10:00:00Z',
      }),
      createMockNote({
        id: 'note-b',
        title: 'Meeting Notes',
        content: 'Action items discussed.',
        tags: ['meeting'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T12:00:00Z',
      }),
    ];
    const sampleFolders: Folder[] = [
      createMockFolder({ id: 'folder-1', name: 'Work', color: 'blue', icon: 'Folder' }),
    ];

    const manifestLocal = await buildSyncManifest({
      vaultId: 'vault-1',
      notes: sampleNotes,
      folders: sampleFolders,
    });

    assert(manifestLocal.entries.length === 3, 'Manifest correctly recorded 2 notes and 1 folder');
    assert(manifestLocal.entries[0].contentHash.length === 64, 'Computed valid SHA-256 content hashes');

    // Test 7: Symmetric Diff - Identical Manifests
    const diffIdentical = compareSyncManifests(manifestLocal, manifestLocal);
    assert(diffIdentical.identicalCount === 3, 'Identical vaults detect 3 identical resources');
    assert(diffIdentical.toSend.length === 0 && diffIdentical.toReceive.length === 0, 'No delta transfer needed for identical vaults');

    // Test 8: Symmetric Diff - Additions and Remote Modifications
    const sampleRemoteNotes: Note[] = [
      createMockNote({ ...sampleNotes[0], content: '# Alpha\nWork completed.' }), // modified on remote
      createMockNote({ id: 'note-c', title: 'Remote Idea', content: 'New idea from mobile', createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' }), // new on remote
    ];

    const manifestRemote = await buildSyncManifest({
      vaultId: 'vault-1',
      notes: sampleRemoteNotes,
      folders: sampleFolders,
    });

    const diff = compareSyncManifests(manifestLocal, manifestRemote);
    assert(diff.toReceive.some((r) => r.id === 'note-c'), 'Diff correctly identified note-c to receive from remote');
    assert(diff.toSend.some((s) => s.id === 'note-b'), 'Diff correctly identified note-b to send to remote');
  } catch (err: any) {
    failed++;
    errors.push(`Manifest diff error: ${err.message}`);
  }

  // Test 9: 3-Way Text Merge Integration (Reusing mergeEngine)
  try {
    const baseText = 'Line 1\nLine 2\nLine 3';
    const localEdit = 'Line 1 (local updated)\nLine 2\nLine 3';
    const remoteEdit = 'Line 1\nLine 2\nLine 3 (remote updated)';

    const merged = merge3Text(baseText, localEdit, remoteEdit);
    assert(merged.clean, '3-way text merge cleanly combined non-conflicting edits');
    assert(
      merged.mergedText.includes('local updated') && merged.mergedText.includes('remote updated'),
      'Merged output contains both local and remote independent changes'
    );

    // Conflict case
    const conflictingLocal = 'Line 1 (Conflict A)\nLine 2\nLine 3';
    const conflictingRemote = 'Line 1 (Conflict B)\nLine 2\nLine 3';
    const conflictResult = merge3Text(baseText, conflictingLocal, conflictingRemote);
    assert(!conflictResult.clean, '3-way text merge detected conflicting simultaneous edits');
  } catch (err: any) {
    failed++;
    errors.push(`3-way merge test error: ${err.message}`);
  }

  // Test 10: P2P Staging Buffer & Resource Verification
  try {
    await p2pStagingService.clearStaging();
    const testPayload = {
      id: 'staged-note-1',
      type: 'note' as const,
      logicalVersion: 1,
      contentHash: await computeSHA256Hex(JSON.stringify({ note: { id: 'staged-note-1', title: 'Staged' } })),
      updatedAt: new Date().toISOString(),
      data: { note: { id: 'staged-note-1', title: 'Staged Note' } as any },
    };

    await p2pStagingService.stageResource(testPayload);
    const stagedList = p2pStagingService.getAllStaged();
    assert(stagedList.length === 1 && stagedList[0].id === 'staged-note-1', 'Successfully staged resource in isolation');

    await p2pStagingService.clearStaging();
    assert(p2pStagingService.getAllStaged().length === 0, 'Clean staging rollback succeeded');
  } catch (err: any) {
    failed++;
    errors.push(`Staging test error: ${err.message}`);
  }

  // Test 11: Paired Device Trust Management
  try {
    const testDeviceId = `dev-test-${generateRandomToken(6)}`;
    const reg = p2pDeviceManager.registerDevice({
      id: testDeviceId,
      name: 'Test iPad Mini',
      publicKeyFingerprint: 'sha256-test-fp',
      trustStatus: 'trusted',
    });

    assert(reg.name === 'Test iPad Mini', 'Successfully registered paired device');
    assert(p2pDeviceManager.getDevice(testDeviceId)?.trustStatus === 'trusted', 'Device is trusted');

    p2pDeviceManager.renameDevice(testDeviceId, 'My Personal iPad');
    assert(p2pDeviceManager.getDevice(testDeviceId)?.name === 'My Personal iPad', 'Device renamed successfully');

    p2pDeviceManager.forgetDevice(testDeviceId);
    assert(!p2pDeviceManager.getDevice(testDeviceId), 'Device trust revoked and removed');
  } catch (err: any) {
    failed++;
    errors.push(`Device manager error: ${err.message}`);
  }

  return { passed, failed, errors };
}
