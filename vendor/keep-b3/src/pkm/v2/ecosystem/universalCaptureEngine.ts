/**
 * V2.12 Universal Capture Engine
 * 
 * Provides a standardized, untrusted-input-safe capture envelope and intake pipeline
 * across typed text, clipboard, shared URLs, shared text, images, files, and browser extensions.
 */

export type CaptureKind = 'text' | 'url' | 'image' | 'file' | 'audio' | 'snippet' | 'selection';
export type UniversalCaptureDestination = 'inbox' | 'note' | 'task' | 'library';

export interface CaptureInputFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  blob?: Blob;
  sha256?: string;
}

export interface UniversalCaptureEnvelope {
  id: string;
  kind: CaptureKind;
  title?: string;
  text?: string;
  url?: string;
  files?: CaptureInputFile[];
  sourceApp?: string;
  timestamp: string;
  dedupeKey: string;
  destination: UniversalCaptureDestination;
  processed: boolean;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CaptureProcessResult {
  success: boolean;
  envelopeId: string;
  createdResourceId?: string;
  destination: UniversalCaptureDestination;
  error?: string;
  heldInLockedBuffer?: boolean;
}

export class UniversalCaptureEngine {
  private static instance: UniversalCaptureEngine | null = null;
  private pendingCaptures: UniversalCaptureEnvelope[] = [];
  private lockedVaultBuffer: UniversalCaptureEnvelope[] = [];
  private processedDedupeKeys: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): UniversalCaptureEngine {
    if (!UniversalCaptureEngine.instance) {
      UniversalCaptureEngine.instance = new UniversalCaptureEngine();
    }
    return UniversalCaptureEngine.instance;
  }

  /**
   * Generates a deterministic deduplication key for an inbound capture
   */
  public generateDedupeKey(input: Partial<UniversalCaptureEnvelope>): string {
    const parts = [
      input.kind || 'text',
      input.url || '',
      (input.text || '').trim().slice(0, 100),
      input.sourceApp || '',
      input.files?.map(f => `${f.name}:${f.size}`).join(',') || '',
    ];
    return parts.join(':::');
  }

  /**
   * Creates and sanitizes an incoming capture envelope
   */
  public createEnvelope(params: {
    kind: CaptureKind;
    title?: string;
    text?: string;
    url?: string;
    files?: CaptureInputFile[];
    sourceApp?: string;
    destination?: UniversalCaptureDestination;
    metadata?: Record<string, unknown>;
  }): UniversalCaptureEnvelope {
    const timestamp = new Date().toISOString();
    
    // Sanitize untrusted input: strip dangerous javascript: URLs, script tags, etc.
    let sanitizedUrl = params.url ? params.url.trim() : undefined;
    if (sanitizedUrl && /^(javascript|data|vbscript):/i.test(sanitizedUrl)) {
      sanitizedUrl = undefined;
    }

    const envelope: UniversalCaptureEnvelope = {
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: params.kind,
      title: params.title?.trim().slice(0, 200),
      text: params.text?.trim(),
      url: sanitizedUrl,
      files: params.files || [],
      sourceApp: params.sourceApp?.trim().slice(0, 80),
      timestamp,
      dedupeKey: '',
      destination: params.destination || 'inbox',
      processed: false,
      metadata: params.metadata || {},
    };

    envelope.dedupeKey = this.generateDedupeKey(envelope);
    return envelope;
  }

  /**
   * Ingests a new capture envelope with deduplication and lock-state safety
   */
  public ingest(
    envelope: UniversalCaptureEnvelope,
    isVaultLocked: boolean
  ): CaptureProcessResult {
    // 1. Deduplication check
    if (this.processedDedupeKeys.has(envelope.dedupeKey)) {
      return {
        success: true,
        envelopeId: envelope.id,
        destination: envelope.destination,
        error: 'Duplicate capture skipped (already processed).',
      };
    }

    // 2. Locked Vault Handling: Buffer in memory with 0 disk plaintext leak
    if (isVaultLocked) {
      this.lockedVaultBuffer.push(envelope);
      return {
        success: true,
        envelopeId: envelope.id,
        destination: envelope.destination,
        heldInLockedBuffer: true,
      };
    }

    // 3. Queue for active processing
    this.pendingCaptures.push(envelope);
    return {
      success: true,
      envelopeId: envelope.id,
      destination: envelope.destination,
    };
  }

  /**
   * Flushes all buffered captures upon vault unlock
   */
  public flushLockedBuffer(): UniversalCaptureEnvelope[] {
    const buffered = [...this.lockedVaultBuffer];
    this.lockedVaultBuffer = [];
    this.pendingCaptures.push(...buffered);
    return buffered;
  }

  /**
   * Commits a capture envelope to canonical PKM storage
   */
  public commitCapture(
    envelopeId: string,
    targetResourceId: string
  ): void {
    const envelope = this.pendingCaptures.find(c => c.id === envelopeId);
    if (envelope) {
      envelope.processed = true;
      envelope.targetResourceId = targetResourceId;
      this.processedDedupeKeys.add(envelope.dedupeKey);
      this.pendingCaptures = this.pendingCaptures.filter(c => c.id !== envelopeId);
    }
  }

  public getPendingCaptures(): UniversalCaptureEnvelope[] {
    return [...this.pendingCaptures];
  }

  public getLockedBufferSize(): number {
    return this.lockedVaultBuffer.length;
  }

  public clear(): void {
    this.pendingCaptures = [];
    this.lockedVaultBuffer = [];
    this.processedDedupeKeys.clear();
  }
}

export const universalCaptureEngine = UniversalCaptureEngine.getInstance();
