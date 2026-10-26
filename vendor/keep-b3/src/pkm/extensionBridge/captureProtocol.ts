/**
 * PKM Phase P34: Universal Browser Extension & Capture Bridge Protocol
 * Defines versioned schemas, message structures, URL normalizers, payload validators,
 * and security constants for extension <-> PKM communication.
 */

export const CAPTURE_PROTOCOL_VERSION = 'pkm-capture/1';

export type CaptureMode =
  | 'link'
  | 'selection'
  | 'article'
  | 'page'
  | 'image'
  | 'screenshot'
  | 'pdf'
  | 'quick-note';

export type CaptureDestination = 'inbox' | 'daily' | 'new_note' | 'active_note';

export interface CaptureImageAttachment {
  name: string;
  dataUrl: string;
  size?: number;
  mimeType?: string;
  originalUrl?: string;
}

export interface ExtractedArticleMetadata {
  title?: string;
  byline?: string;
  contentHtml?: string;
  textContent?: string;
  excerpt?: string;
  siteName?: string;
  publishedTime?: string;
  readingTimeMinutes?: number;
}

export interface CapturePayload {
  id: string; // Cryptographically unique ID for idempotency & deduplication
  mode: CaptureMode;
  sourceUrl?: string;
  sourceTitle?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  text?: string;
  html?: string;
  quickNoteText?: string;
  extractedArticle?: ExtractedArticleMetadata;
  images?: CaptureImageAttachment[];
  destination: CaptureDestination;
  tags: string[];
  capturedAt: string; // ISO 8601 string
  metadata?: Record<string, unknown>;
}

export type BridgeMessageType =
  | 'HANDSHAKE_REQUEST'
  | 'HANDSHAKE_RESPONSE'
  | 'STATUS_REQUEST'
  | 'STATUS_RESPONSE'
  | 'CAPTURE_SUBMIT_REQUEST'
  | 'CAPTURE_SUBMIT_RESPONSE'
  | 'DRAIN_PENDING_REQUEST'
  | 'DRAIN_PENDING_RESPONSE'
  | 'REVOKE_REQUEST'
  | 'REVOKE_RESPONSE'
  | 'CONFIG_GET_REQUEST'
  | 'CONFIG_GET_RESPONSE';

export interface BridgeMessage<T = unknown> {
  protocol: string; // Must match CAPTURE_PROTOCOL_VERSION
  type: BridgeMessageType;
  requestId: string;
  pairingSecret?: string;
  clientInstanceId?: string;
  payload?: T;
  timestamp: number;
}

export interface CaptureSubmitResult {
  success: boolean;
  captureId: string;
  noteId?: string;
  noteTitle?: string;
  destination: CaptureDestination;
  isDuplicateRetry: boolean;
  wasStagedForUnlock: boolean;
  error?: string;
}

export interface BridgeStatusPayload {
  appReady: boolean;
  vaultStatus: 'unencrypted' | 'unlocked' | 'locked';
  protocolVersion: string;
  defaultDestination: CaptureDestination;
  inboxFolderName: string;
  pairedClientsCount: number;
}

export interface ExtensionBridgeConfig {
  enabled: boolean;
  pairingSecret: string;
  trustedOrigins: string[];
  pairedClients: Array<{
    id: string;
    name: string;
    pairedAt: string;
    lastSeenAt: string;
  }>;
  defaultDestination: CaptureDestination;
  defaultMode: CaptureMode;
  customTemplate?: string;
  autoOpenAfterCapture: boolean;
  includeImagesInArticles: boolean;
}

export const DEFAULT_EXTENSION_BRIDGE_CONFIG: ExtensionBridgeConfig = {
  enabled: true,
  pairingSecret: '',
  trustedOrigins: [
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  ],
  pairedClients: [],
  defaultDestination: 'inbox',
  defaultMode: 'article',
  autoOpenAfterCapture: false,
  includeImagesInArticles: true,
};

/**
 * Normalizes a source URL conservatively:
 * - Strips common tracking query parameters (utm_*, gclid, fbclid, etc.)
 * - Validates protocol is http, https, or valid file/blob
 * - Prevents javascript:, vbscript:, and malicious payload schemes
 */
export function normalizeSourceUrl(rawUrl?: string): {
  normalized: string;
  isSafe: boolean;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { normalized: '', isSafe: true };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { normalized: '', isSafe: true };
  }

  // Security check: block dangerous pseudo-schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:application/javascript')
  ) {
    return {
      normalized: '',
      isSafe: false,
      error: 'UNSAFE_URL_SCHEME: Script execution URLs are forbidden.',
    };
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http, https, file, blob protocols
    if (!['http:', 'https:', 'file:', 'blob:'].includes(parsed.protocol)) {
      return {
        normalized: '',
        isSafe: false,
        error: `UNSUPPORTED_PROTOCOL: Protocol ${parsed.protocol} is not permitted for capture provenance.`,
      };
    }

    // Strip common ad/analytics tracking parameters conservatively
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'mc_cid',
      'mc_eid',
      '_ga',
      '_gl',
      'ref_src',
      'ref_url',
    ];

    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }

    return {
      normalized: parsed.toString(),
      isSafe: true,
    };
  } catch (_e) {
    // If it's a relative URL or non-standard string, return sanitized string if safe
    return {
      normalized: trimmed.replace(/[\r\n\t]/g, ''),
      isSafe: true,
    };
  }
}

/**
 * Validates a capture payload received over the bridge runtime boundary
 */
export function validateCapturePayload(data: unknown): {
  valid: boolean;
  payload?: CapturePayload;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be a non-null object' };
  }

  const obj = data as Record<string, any>;

  if (!obj.id || typeof obj.id !== 'string' || obj.id.trim().length === 0) {
    return { valid: false, error: 'Missing or invalid capture id' };
  }

  const validModes: CaptureMode[] = [
    'link',
    'selection',
    'article',
    'page',
    'image',
    'screenshot',
    'pdf',
    'quick-note',
  ];

  if (!obj.mode || !validModes.includes(obj.mode)) {
    return { valid: false, error: `Invalid capture mode: ${obj.mode}` };
  }

  const validDestinations: CaptureDestination[] = [
    'inbox',
    'daily',
    'new_note',
    'active_note',
  ];

  const destination: CaptureDestination = validDestinations.includes(obj.destination)
    ? obj.destination
    : 'inbox';

  const normalizedUrlRes = normalizeSourceUrl(obj.sourceUrl);
  if (!normalizedUrlRes.isSafe) {
    return { valid: false, error: normalizedUrlRes.error };
  }

  // Sanitize tags
  const tags: string[] = Array.isArray(obj.tags)
    ? obj.tags
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0)
    : [];

  const validated: CapturePayload = {
    id: String(obj.id).slice(0, 128),
    mode: obj.mode,
    sourceUrl: normalizedUrlRes.normalized || undefined,
    sourceTitle: typeof obj.sourceTitle === 'string' ? obj.sourceTitle.slice(0, 500) : undefined,
    siteName: typeof obj.siteName === 'string' ? obj.siteName.slice(0, 200) : undefined,
    author: typeof obj.author === 'string' ? obj.author.slice(0, 200) : undefined,
    publishedTime: typeof obj.publishedTime === 'string' ? obj.publishedTime.slice(0, 100) : undefined,
    text: typeof obj.text === 'string' ? obj.text : undefined,
    html: typeof obj.html === 'string' ? obj.html : undefined,
    quickNoteText: typeof obj.quickNoteText === 'string' ? obj.quickNoteText : undefined,
    extractedArticle: obj.extractedArticle && typeof obj.extractedArticle === 'object'
      ? {
          title: typeof obj.extractedArticle.title === 'string' ? obj.extractedArticle.title.slice(0, 500) : undefined,
          byline: typeof obj.extractedArticle.byline === 'string' ? obj.extractedArticle.byline.slice(0, 200) : undefined,
          contentHtml: typeof obj.extractedArticle.contentHtml === 'string' ? obj.extractedArticle.contentHtml : undefined,
          textContent: typeof obj.extractedArticle.textContent === 'string' ? obj.extractedArticle.textContent : undefined,
          excerpt: typeof obj.extractedArticle.excerpt === 'string' ? obj.extractedArticle.excerpt.slice(0, 1000) : undefined,
          siteName: typeof obj.extractedArticle.siteName === 'string' ? obj.extractedArticle.siteName.slice(0, 200) : undefined,
          publishedTime: typeof obj.extractedArticle.publishedTime === 'string' ? obj.extractedArticle.publishedTime.slice(0, 100) : undefined,
          readingTimeMinutes: typeof obj.extractedArticle.readingTimeMinutes === 'number' ? obj.extractedArticle.readingTimeMinutes : undefined,
        }
      : undefined,
    images: Array.isArray(obj.images)
      ? obj.images
          .filter((img) => img && typeof img.dataUrl === 'string' && typeof img.name === 'string')
          .map((img) => ({
            name: String(img.name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120),
            dataUrl: String(img.dataUrl),
            size: typeof img.size === 'number' ? img.size : undefined,
            mimeType: typeof img.mimeType === 'string' ? img.mimeType : undefined,
            originalUrl: typeof img.originalUrl === 'string' ? img.originalUrl : undefined,
          }))
      : undefined,
    destination,
    tags,
    capturedAt: typeof obj.capturedAt === 'string' ? obj.capturedAt : new Date().toISOString(),
    metadata: obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : undefined,
  };

  return { valid: true, payload: validated };
}

/**
 * Generates a high-entropy random pairing secret (256-bit hex)
 */
export function generatePairingSecret(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}
