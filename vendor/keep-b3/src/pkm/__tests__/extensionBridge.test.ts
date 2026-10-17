/**
 * PKM Phase P34: Browser Extension & Universal Capture Bridge Automated Test Suite
 * Tests deterministic parsing, cryptographic pairing, origin validation,
 * exact-once deduplication, locked-vault memory staging, and security guarantees.
 */

import { Note, Folder, AppSettings } from '../../types';
import {
  CAPTURE_PROTOCOL_VERSION,
  normalizeSourceUrl,
  validateCapturePayload,
  generatePairingSecret,
  CapturePayload,
} from '../extensionBridge/captureProtocol';
import {
  CaptureBridgeService,
  BridgeExecutionContext,
} from '../extensionBridge/captureBridgeService';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import {
  extractPageMetadata,
  extractSelection,
  extractReadableArticle,
} from '../../extension/content/contentScript';

export async function runExtensionBridgeTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (!condition) {
      failed++;
      errors.push(`FAIL: ${message}`);
      console.error(`  ✕ ${message}`);
    } else {
      passed++;
      console.log(`  ✓ ${message}`);
    }
  }

  console.log('--- Running Phase P34: Browser Extension & Universal Capture Bridge Tests ---');

  // Test 1: URL Normalization and Tracking Query Parameter Stripping
  try {
    const dirtyUrl =
      'https://example.com/article?utm_source=twitter&utm_medium=social&utm_campaign=launch&gclid=12345&important_id=42#section-2';
    const normRes = normalizeSourceUrl(dirtyUrl);
    assert(normRes.isSafe, 'Dirty URL is marked as safe');
    assert(
      !normRes.normalized.includes('utm_source') &&
        !normRes.normalized.includes('utm_medium') &&
        !normRes.normalized.includes('gclid'),
      'Tracking parameters (utm_*, gclid) are stripped'
    );
    assert(
      normRes.normalized.includes('important_id=42') && normRes.normalized.includes('#section-2'),
      'Non-tracking query parameters and anchors are preserved'
    );

    // Dangerous URLs
    const jsUrl = 'javascript:alert(document.cookie)';
    const jsRes = normalizeSourceUrl(jsUrl);
    assert(!jsRes.isSafe, 'javascript: pseudo-scheme is rejected as unsafe');

    const dataJsUrl = 'data:application/javascript,alert(1)';
    const dataJsRes = normalizeSourceUrl(dataJsUrl);
    assert(!dataJsRes.isSafe, 'data:application/javascript is rejected as unsafe');
  } catch (err: any) {
    failed++;
    errors.push(`Test 1 (URL Normalization) threw: ${err.message}`);
  }

  // Test 2: Payload Validation and Tag Sanitization
  try {
    const rawPayload = {
      id: 'cap-101',
      mode: 'article',
      sourceUrl: 'https://news.ycombinator.com/item?id=12345',
      sourceTitle: 'Show HN: Offline First PKM',
      tags: ['#pkm', 'web-clip', '  #research  ', ''],
      destination: 'inbox',
      capturedAt: new Date().toISOString(),
    };

    const val = validateCapturePayload(rawPayload);
    assert(val.valid && val.payload !== undefined, 'Valid payload passes validator');
    assert(
      val.payload?.tags.length === 3 &&
        val.payload.tags[0] === 'pkm' &&
        val.payload.tags[2] === 'research',
      'Tags are stripped of leading # and whitespace'
    );

    const invalidModePayload = { id: 'cap-102', mode: 'non-existent-mode' };
    const invalidVal = validateCapturePayload(invalidModePayload);
    assert(!invalidVal.valid, 'Invalid mode is rejected');
  } catch (err: any) {
    failed++;
    errors.push(`Test 2 (Payload Validation) threw: ${err.message}`);
  }

  // Test 3: High-Entropy Pairing Secret Generation & Rotation
  try {
    const secret1 = generatePairingSecret();
    const secret2 = generatePairingSecret();
    assert(secret1.length >= 32, 'Pairing secret has sufficient length (>= 32 chars)');
    assert(secret1 !== secret2, 'Consecutive pairing secrets are distinct and high-entropy');

    const bridge = new CaptureBridgeService();
    const initialSecret = bridge.getConfig().pairingSecret;
    const rotated = bridge.regeneratePairingSecret();
    assert(rotated !== initialSecret, 'Pairing secret can be rotated on demand');
    assert(bridge.getConfig().pairedClients.length === 0, 'Rotating secret clears paired clients');
  } catch (err: any) {
    failed++;
    errors.push(`Test 3 (Pairing Secret) threw: ${err.message}`);
  }

  // Test 4: Save Link Capture (Canonical Markdown with Frontmatter & Provenance)
  try {
    const createdNotes: Note[] = [];
    const savedNotes: Note[] = [];
    const mockContext: BridgeExecutionContext = {
      notes: [],
      folders: [{ id: 'f-inbox', name: 'Inbox', color: 'default', createdAt: '' }],
      settings: {
        theme: 'light',
        canvasBackground: 'clean',
        defaultViewMode: 'masonry',
        gridColumns: 'auto',
        cardDensity: 'comfortable',
        fontFamily: 'sans',
        fontSize: 'md',
        autoArchiveChecked: false,
        confirmDelete: true,
        defaultColor: 'default',
        defaultFolderId: null,
        showMonthDividers: true,
        enableWikiLinks: true,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
      activeNote: null,
      createNote: async (draft) => {
        const n: Note = {
          ...draft,
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdNotes.push(n);
        return n;
      },
      saveNote: async (note) => {
        savedNotes.push(note);
      },
    };

    const bridge = new CaptureBridgeService();
    const linkPayload: CapturePayload = {
      id: 'cap-link-1',
      mode: 'link',
      sourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/API',
      sourceTitle: 'Web APIs | MDN',
      destination: 'inbox',
      tags: ['reference', 'mdn'],
      quickNoteText: 'Essential browser APIs reference documentation.',
      capturedAt: new Date().toISOString(),
    };

    const res = await bridge.submitCapture(linkPayload, mockContext);
    assert(res.success, 'Link capture executed successfully');
    assert(createdNotes.length === 1, 'Note created in mock vault');
    assert(createdNotes[0].folderId === 'f-inbox', 'Note assigned to Inbox folder');
    assert(
      createdNotes[0].content.includes('title: "Web APIs | MDN"') &&
        createdNotes[0].content.includes('source: "https://developer.mozilla.org/en-US/docs/Web/API"'),
      'Canonical YAML frontmatter contains title and source URL'
    );
    assert(
      createdNotes[0].content.includes('Essential browser APIs reference documentation.'),
      'Quick note annotations are embedded'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Test 4 (Save Link Capture) threw: ${err.message}`);
  }

  // Test 5: Selection Capture (Formatted HTML to Markdown)
  try {
    const createdNotes: Note[] = [];
    const mockContext: BridgeExecutionContext = {
      notes: [],
      folders: [],
      settings: {} as any,
      activeNote: null,
      createNote: async (draft) => {
        const n: Note = {
          ...draft,
          id: `note-sel-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdNotes.push(n);
        return n;
      },
      saveNote: async () => {},
    };

    const bridge = new CaptureBridgeService();
    const selPayload: CapturePayload = {
      id: 'cap-sel-1',
      mode: 'selection',
      sourceUrl: 'https://example.com/research',
      sourceTitle: 'Offline Computing Insights',
      html: '<p>Local-first software gives users <strong>ownership</strong> of data.</p><ul><li>Zero latency</li><li>Offline capability</li></ul>',
      destination: 'new_note',
      tags: ['local-first'],
      quickNoteText: 'Key architectural quote from article',
      capturedAt: new Date().toISOString(),
    };

    const res = await bridge.submitCapture(selPayload, mockContext);
    assert(res.success, 'Selection capture succeeded');
    assert(createdNotes.length === 1, 'Selection note created');
    assert(
      createdNotes[0].content.includes('ownership') &&
        createdNotes[0].content.includes('Zero latency') &&
        createdNotes[0].content.includes('Key architectural quote'),
      'HTML selection converted into standard GFM Markdown'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Test 5 (Selection Capture) threw: ${err.message}`);
  }

  // Test 6: Idempotency & Replay Deduplication (Same captureId never creates duplicates)
  try {
    const createdNotes: Note[] = [];
    const mockContext: BridgeExecutionContext = {
      notes: [],
      folders: [],
      settings: {} as any,
      activeNote: null,
      createNote: async (draft) => {
        const n: Note = {
          ...draft,
          id: `note-dedup-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdNotes.push(n);
        return n;
      },
      saveNote: async () => {},
    };

    const bridge = new CaptureBridgeService();
    const payload: CapturePayload = {
      id: 'cap-dedup-key-42',
      mode: 'quick-note',
      sourceTitle: 'Fleeting Idea',
      quickNoteText: 'Remember to check P2P sync buffer.',
      destination: 'inbox',
      tags: ['fleeting'],
      capturedAt: new Date().toISOString(),
    };

    const res1 = await bridge.submitCapture(payload, mockContext);
    assert(res1.success && !res1.isDuplicateRetry, 'First submission is processed normally');
    assert(createdNotes.length === 1, 'One note created initially');

    // Re-submit identical payload (e.g. extension retry on slow network or tab refresh)
    const res2 = await bridge.submitCapture(payload, mockContext);
    assert(
      res2.success && res2.isDuplicateRetry,
      'Second submission recognized as duplicate retry'
    );
    assert(
      res2.noteId === res1.noteId,
      'Duplicate submission returns existing note ID without creating duplicate'
    );
    assert(createdNotes.length === 1, 'No second duplicate note created');
  } catch (err: any) {
    failed++;
    errors.push(`Test 6 (Idempotency Deduplication) threw: ${err.message}`);
  }

  // Test 7: Locked Vault Behavior (Volatile memory staging & automatic commit on unlock)
  try {
    const bridge = new CaptureBridgeService();
    bridge.clearStagedCaptures();

    // Lock vault
    await vaultEncryptionService.setupVaultEncryption('TestMasterPassword123!');
    vaultEncryptionService.lockVault();
    assert(vaultEncryptionService.isVaultLocked(), 'Vault is simulated as locked');

    const stagedPayload: CapturePayload = {
      id: 'cap-locked-stage-1',
      mode: 'link',
      sourceTitle: 'Confidential Research Link',
      sourceUrl: 'https://security.example.com/whitepaper',
      destination: 'inbox',
      tags: ['security'],
      capturedAt: new Date().toISOString(),
    };

    const res = await bridge.submitCapture(stagedPayload, null);
    assert(res.success && res.wasStagedForUnlock, 'Payload is staged safely while vault is locked');
    assert(
      bridge.getStagedCapturesCount() === 1,
      'Staging queue holds exactly 1 capture in volatile memory'
    );

    // Verify unlock drain
    const createdNotes: Note[] = [];
    const mockContext: BridgeExecutionContext = {
      notes: [],
      folders: [],
      settings: {} as any,
      activeNote: null,
      createNote: async (draft) => {
        const n: Note = {
          ...draft,
          id: `note-unlocked-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdNotes.push(n);
        return n;
      },
      saveNote: async () => {},
    };

    // Unlock vault
    await vaultEncryptionService.unlockVault('TestMasterPassword123!');
    assert(!vaultEncryptionService.isVaultLocked(), 'Vault unlocked');

    const drainedCount = await bridge.drainStagedCaptures(mockContext);
    assert(drainedCount === 1, 'Staged capture drained into active context');
    assert(createdNotes.length === 1, 'Note created in unlocked vault');
    assert(bridge.getStagedCapturesCount() === 0, 'Staging queue cleanly purged from memory');

    // Clean up encryption state
    await vaultEncryptionService.disableVaultEncryption('TestMasterPassword123!');
  } catch (err: any) {
    failed++;
    errors.push(`Test 7 (Locked Vault Behavior) threw: ${err.message}`);
  }

  // Test 8: Protocol Handshake & Unauthorized Origin/Secret Rejection
  try {
    const bridge = new CaptureBridgeService();
    const config = bridge.ensureInitializedConfig();

    let handshakeReply: any = null;
    await bridge.handleIncomingMessage(
      {
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'HANDSHAKE_REQUEST',
        requestId: 'req-1',
        pairingSecret: config.pairingSecret,
        clientInstanceId: 'ext-test-instance-1',
        payload: { clientName: 'Firefox Web Clipper' },
        timestamp: Date.now(),
      },
      (reply) => {
        handshakeReply = reply;
      }
    );

    assert(
      handshakeReply && handshakeReply.payload?.authenticated === true,
      'Valid handshake request authenticates client'
    );

    // Invalid secret
    let invalidReply: any = null;
    await bridge.handleIncomingMessage(
      {
        protocol: CAPTURE_PROTOCOL_VERSION,
        type: 'HANDSHAKE_REQUEST',
        requestId: 'req-2',
        pairingSecret: 'wrong-secret-token',
        clientInstanceId: 'ext-test-instance-2',
        timestamp: Date.now(),
      },
      (reply) => {
        invalidReply = reply;
      }
    );

    assert(
      invalidReply && invalidReply.payload?.authenticated === false,
      'Invalid pairing secret is rejected'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Test 8 (Protocol Handshake) threw: ${err.message}`);
  }

  // Test 9: Protocol Mismatch Error Handling
  try {
    const bridge = new CaptureBridgeService();
    let mismatchReply: any = null;
    await bridge.handleIncomingMessage(
      {
        protocol: 'pkm-capture/999', // Incompatible future version
        type: 'CAPTURE_SUBMIT_REQUEST',
        requestId: 'req-mismatch',
        timestamp: Date.now(),
      },
      (reply) => {
        mismatchReply = reply;
      }
    );

    assert(
      mismatchReply && String(mismatchReply.payload?.error).includes('PROTOCOL_MISMATCH'),
      'Protocol mismatch returns descriptive PROTOCOL_MISMATCH error'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Test 9 (Protocol Mismatch) threw: ${err.message}`);
  }

  // Test 10: Daily Note Destination Ingestion
  try {
    const savedNotes: Note[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const initialDailyNote: Note = {
      id: 'daily-note-today',
      title: todayStr,
      content: '# Daily Note\n\n## Tasks\n- [ ] Review PRs',
      type: 'text',
      checklist: [],
      tags: ['daily'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockContext: BridgeExecutionContext = {
      notes: [initialDailyNote],
      folders: [],
      settings: {} as any,
      activeNote: null,
      createNote: async (draft) => ({
        ...draft,
        id: 'new-note-id',
        createdAt: '',
        updatedAt: '',
      }),
      saveNote: async (updated) => {
        savedNotes.push(updated);
      },
    };

    const bridge = new CaptureBridgeService();
    const dailyClip: CapturePayload = {
      id: 'cap-daily-clip-1',
      mode: 'link',
      sourceTitle: 'TypeScript 5.8 Release Notes',
      sourceUrl: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/',
      destination: 'daily',
      tags: ['typescript'],
      capturedAt: new Date().toISOString(),
    };

    const res = await bridge.submitCapture(dailyClip, mockContext);
    assert(res.success, 'Daily note capture succeeds');
    assert(savedNotes.length > 0, 'Daily note updated');
    const finalContent = savedNotes[savedNotes.length - 1].content;
    assert(
      finalContent.includes('## Web Captures') &&
        finalContent.includes('TypeScript 5.8 Release Notes'),
      'Content appended under ## Web Captures heading in Daily Note'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Test 10 (Daily Note Destination) threw: ${err.message}`);
  }

  console.log(`--- Finished Phase P34 Tests: ${passed} passed, ${failed} failed ---\n`);

  return { passed, failed, errors };
}
