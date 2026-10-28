/**
 * V2.8 Sync Protocol Security & Adversarial Remote Handling Engine
 * Protects against protocol downgrade, replay attacks, malformed resources,
 * path traversal in sync payloads, and attachment hash mismatches.
 */

export interface SyncHandshakeV2 {
  remoteVaultId: string;
  expectedVaultId: string;
  protocolVersion: number;
  minSupportedProtocolVersion: number;
  encryptionMode: 'e2ee_aes_gcm' | 'none';
  clientVersion: string;
}

export interface SyncResourceEnvelopeV2 {
  resourceId: string;
  revision: number;
  lastKnownRevision: number;
  type: string;
  title: string;
  path?: string;
  isTombstone?: boolean;
  contentHash?: string;
  content?: string;
  attachmentHash?: string;
  attachmentSize?: number;
}

export class SyncSecurityValidatorV2 {
  private static instance: SyncSecurityValidatorV2;

  private readonly CURRENT_PROTOCOL_VERSION = 2;
  private readonly MIN_ALLOWED_PROTOCOL_VERSION = 2;

  private constructor() {}

  public static getInstance(): SyncSecurityValidatorV2 {
    if (!SyncSecurityValidatorV2.instance) {
      SyncSecurityValidatorV2.instance = new SyncSecurityValidatorV2();
    }
    return SyncSecurityValidatorV2.instance;
  }

  /**
   * Validates peer/remote sync handshake. Fails closed on vault mismatch or protocol downgrade.
   */
  public validateHandshake(handshake: SyncHandshakeV2): {
    valid: boolean;
    error?: string;
    downgradeAttemptDetected?: boolean;
  } {
    if (!handshake.remoteVaultId || handshake.remoteVaultId !== handshake.expectedVaultId) {
      return {
        valid: false,
        error: `Vault ID mismatch: remote specified "${handshake.remoteVaultId}", local expected "${handshake.expectedVaultId}"`,
      };
    }

    if (handshake.protocolVersion < this.MIN_ALLOWED_PROTOCOL_VERSION) {
      return {
        valid: false,
        downgradeAttemptDetected: true,
        error: `Protocol downgrade attack rejected: remote protocol v${handshake.protocolVersion} is below minimum allowed v${this.MIN_ALLOWED_PROTOCOL_VERSION}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates incoming sync envelope before merging.
   * Rejects path traversal, replay of stale revisions, and malformed tombstones.
   */
  public validateIncomingSyncResource(
    envelope: SyncResourceEnvelopeV2,
    currentLocalRevision: number
  ): { valid: boolean; quarantined?: boolean; error?: string } {
    // 1. Replay attack / stale revision validation
    if (envelope.revision <= currentLocalRevision) {
      return {
        valid: false,
        error: `Stale or replayed revision rejected: incoming rev ${envelope.revision} <= local rev ${currentLocalRevision}`,
      };
    }

    // 2. Path traversal check
    if (envelope.path) {
      const pathSafe = this.validateSafeRelativePath(envelope.path);
      if (!pathSafe.valid) {
        return {
          valid: false,
          quarantined: true,
          error: `Path traversal detected in sync resource path: ${pathSafe.error}`,
        };
      }
    }

    // 3. Resource ID sanitization
    if (!envelope.resourceId || envelope.resourceId.includes('/') || envelope.resourceId.includes('..')) {
      return {
        valid: false,
        quarantined: true,
        error: 'Invalid or hostile resource ID in sync payload',
      };
    }

    // 4. Tombstone validation
    if (envelope.isTombstone && envelope.content && envelope.content.length > 0) {
      return {
        valid: false,
        quarantined: true,
        error: 'Malformed tombstone: Tombstones must not contain payload body data',
      };
    }

    return { valid: true };
  }

  /**
   * Validates attachment hash integrity.
   */
  public verifyAttachmentIntegrity(
    declaredHash: string,
    actualComputedHash: string,
    declaredSize: number,
    actualSizeBytes: number
  ): { valid: boolean; error?: string } {
    if (declaredSize !== actualSizeBytes) {
      return {
        valid: false,
        error: `Attachment size mismatch: declared ${declaredSize} bytes, received ${actualSizeBytes} bytes`,
      };
    }

    if (declaredHash.toLowerCase() !== actualComputedHash.toLowerCase()) {
      return {
        valid: false,
        error: `Attachment SHA-256 mismatch: substitution attack detected. Declared ${declaredHash}, computed ${actualComputedHash}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates that a relative path does not escape root (no ../, no absolute /, no null bytes).
   */
  public validateSafeRelativePath(relPath: string): { valid: boolean; error?: string } {
    if (!relPath) return { valid: false, error: 'Empty path' };

    // Null byte injection
    if (relPath.includes('\0')) {
      return { valid: false, error: 'Null byte in path' };
    }

    // Absolute paths
    if (relPath.startsWith('/') || relPath.startsWith('\\') || /^[A-Za-z]:/i.test(relPath)) {
      return { valid: false, error: 'Absolute path is forbidden' };
    }

    // Path traversal segments
    const normalized = relPath.replace(/\\/g, '/');
    const segments = normalized.split('/');
    for (const segment of segments) {
      if (segment === '..') {
        return { valid: false, error: 'Directory traversal segment (..) is forbidden' };
      }
    }

    return { valid: true };
  }
}

export const syncSecurityValidatorV2 = SyncSecurityValidatorV2.getInstance();
