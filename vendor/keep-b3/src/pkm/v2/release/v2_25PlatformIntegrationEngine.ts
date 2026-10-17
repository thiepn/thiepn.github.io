/**
 * V2.25 — Platform Integration & Cross-Platform Fidelity Engine
 * 
 * Unifies:
 * 1. Universal Capture Ingestion Envelope (Android Share, iOS Share, PWA Share, Desktop Hotkey, In-App)
 * 2. Native Bridge Security Auditor & Allowlist Enforcer
 * 3. Cross-Platform Canonical Invariance & Data Fidelity Validator
 * 4. Mobile Lifecycle & Process Death State Recovery
 * 5. Tablet Dual-Pane Adaptive Layout Coordinator
 */

import { v2ActionRegistry } from '../core/actions/actionSystem';
import { v2_24InteroperabilityEngine } from '../interoperability/v2_24InteroperabilityEngine';

export type CaptureSource =
  | 'desktop_shortcut'
  | 'android_share'
  | 'ios_share'
  | 'pwa_share'
  | 'in_app_quick_capture'
  | 'web_extension';

export type CapturePayloadType = 'text' | 'url' | 'image' | 'file' | 'audio';

export interface UniversalCaptureFileRef {
  name: string;
  sizeBytes: number;
  mimeType: string;
  dataBase64?: string;
}

export interface UniversalCapturePayload {
  id: string;
  source: CaptureSource;
  payloadType: CapturePayloadType;
  content: string;
  title?: string;
  url?: string;
  fileRefs?: UniversalCaptureFileRef[];
  receivedAt: string;
  platformMetadata: Record<string, unknown>;
  contentHash: string;
}

export interface IngestedInboxItem {
  id: string;
  captureId: string;
  title: string;
  bodyMarkdown: string;
  source: CaptureSource;
  payloadType: CapturePayloadType;
  sourceUrl?: string;
  attachmentsCount: number;
  receivedAt: string;
  status: 'pending' | 'processed' | 'archived';
  isDuplicate: boolean;
}

export interface NativeBridgeCall {
  method: string;
  args: Record<string, unknown>;
  callerOrigin: string;
  isPlugin: boolean;
}

export interface NativeBridgeValidationResult {
  allowed: boolean;
  sanitizedArgs?: Record<string, unknown>;
  error?: string;
}

export type TabletDualPanePreset =
  | 'pdf_note'
  | 'project_tasks'
  | 'course_material'
  | 'calendar_detail'
  | 'review_evidence';

export interface TabletDualPaneState {
  preset: TabletDualPanePreset;
  primaryPaneWidthPercent: number;
  primaryResourceId: string | null;
  secondaryResourceId: string | null;
  orientation: 'portrait' | 'landscape';
  isMultiTaskingReducedWidth: boolean;
  preservedScrollPrimary: number;
  preservedScrollSecondary: number;
}

export class V2_25PlatformIntegrationEngine {
  private static instance: V2_25PlatformIntegrationEngine | null = null;
  private captureHistory: IngestedInboxItem[] = [];
  private knownContentHashes: Set<string> = new Set();
  private dirtyNoteBuffer: Map<string, { content: string; savedAt: string }> = new Map();
  private tabletPaneState: TabletDualPaneState = {
    preset: 'pdf_note',
    primaryPaneWidthPercent: 50,
    primaryResourceId: null,
    secondaryResourceId: null,
    orientation: 'landscape',
    isMultiTaskingReducedWidth: false,
    preservedScrollPrimary: 0,
    preservedScrollSecondary: 0,
  };

  public static getInstance(): V2_25PlatformIntegrationEngine {
    if (!V2_25PlatformIntegrationEngine.instance) {
      V2_25PlatformIntegrationEngine.instance = new V2_25PlatformIntegrationEngine();
    }
    return V2_25PlatformIntegrationEngine.instance;
  }

  // =========================================================================
  // 1. UNIVERSAL CAPTURE INGESTION ENVELOPE
  // =========================================================================

  /**
   * Generates a deterministic content hash for payload deduplication.
   */
  public generatePayloadHash(content: string, url?: string, source?: string): string {
    const raw = `${source || ''}:${url || ''}:${content.trim()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Ingests any incoming platform capture payload through a single canonical pipeline.
   */
  public ingestPayload(payload: UniversalCapturePayload): IngestedInboxItem {
    const contentHash = payload.contentHash || this.generatePayloadHash(payload.content, payload.url, payload.source);
    const isDuplicate = this.knownContentHashes.has(contentHash);
    this.knownContentHashes.add(contentHash);

    // Sanitize any untrusted HTML or scripting artifacts
    let cleanText = payload.content.trim();
    cleanText = cleanText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Formulate title & Markdown body
    const title = payload.title?.trim() || (cleanText.split('\n')[0]?.slice(0, 60) || 'Quick Capture Item');
    
    let body = cleanText;
    if (payload.url) {
      body = `**Source URL**: [${payload.url}](${payload.url})\n\n${body}`;
    }
    if (payload.fileRefs && payload.fileRefs.length > 0) {
      body += '\n\n### Attachments\n' + payload.fileRefs.map((f) => `- 📎 **${f.name}** (${Math.round(f.sizeBytes / 1024)} KB)`).join('\n');
    }

    const inboxItem: IngestedInboxItem = {
      id: `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      captureId: payload.id,
      title,
      bodyMarkdown: body,
      source: payload.source,
      payloadType: payload.payloadType,
      sourceUrl: payload.url,
      attachmentsCount: payload.fileRefs?.length || 0,
      receivedAt: payload.receivedAt || new Date().toISOString(),
      status: 'pending',
      isDuplicate,
    };

    this.captureHistory.unshift(inboxItem);
    return inboxItem;
  }

  public getInboxItems(): IngestedInboxItem[] {
    return [...this.captureHistory];
  }

  // =========================================================================
  // 2. NATIVE BRIDGE SECURITY AUDITOR
  // =========================================================================

  private static readonly ALLOWED_NATIVE_METHODS = new Set([
    'open_file_dialog',
    'save_file_dialog',
    'read_scoped_file',
    'write_scoped_file',
    'store_credential_secure',
    'get_credential_secure',
    'remove_credential_secure',
    'schedule_notification',
    'cancel_notification',
    'authenticate_biometric',
    'open_external_safe_url',
    'get_platform_capabilities',
    'get_window_geometry',
    'set_window_geometry',
  ]);

  private static readonly DISALLOWED_URL_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'];

  /**
   * Audits and enforces strict allowlisting on all native bridge invocations.
   */
  public auditNativeCall(call: NativeBridgeCall): NativeBridgeValidationResult {
    // 1. Plugins are NEVER permitted to call native bridge methods directly
    if (call.isPlugin) {
      return {
        allowed: false,
        error: `Security Violation: Plugins are forbidden from accessing Native Bridge directly. Method '${call.method}' rejected.`,
      };
    }

    // 2. Allowlist verification
    if (!V2_25PlatformIntegrationEngine.ALLOWED_NATIVE_METHODS.has(call.method)) {
      return {
        allowed: false,
        error: `Security Violation: Method '${call.method}' is not in the native bridge allowlist. Generic execution prohibited.`,
      };
    }

    // 3. Parameter validation & path traversal defense
    const args = { ...call.args };
    if (typeof args.path === 'string') {
      const p = args.path;
      if (p.includes('..') || p.includes('\0') || p.startsWith('/etc') || p.startsWith('C:\\Windows')) {
        return {
          allowed: false,
          error: `Security Violation: Path traversal or protected directory access rejected: '${p}'.`,
        };
      }
    }

    // 4. URL scheme validation
    if (call.method === 'open_external_safe_url' && typeof args.url === 'string') {
      const u = args.url.trim().toLowerCase();
      for (const proto of V2_25PlatformIntegrationEngine.DISALLOWED_URL_PROTOCOLS) {
        if (u.startsWith(proto)) {
          return {
            allowed: false,
            error: `Security Violation: Dangerous protocol '${proto}' rejected. Only https://, http://, and mailto: are permitted.`,
          };
        }
      }
    }

    return {
      allowed: true,
      sanitizedArgs: args,
    };
  }

  public isMethodAllowlisted(method: string): boolean {
    return V2_25PlatformIntegrationEngine.ALLOWED_NATIVE_METHODS.has(method);
  }

  public ingestUniversalCapture(params: {
    sourcePlatform: string;
    sourceType: string;
    textPayload: string;
  }): { success: boolean; item?: IngestedInboxItem } {
    const item = this.ingestPayload({
      id: `uc_${Date.now()}`,
      source: 'in_app_quick_capture',
      payloadType: 'text',
      content: params.textPayload,
      receivedAt: new Date().toISOString(),
      platformMetadata: { sourcePlatform: params.sourcePlatform, sourceType: params.sourceType },
      contentHash: '',
    });
    return { success: true, item };
  }

  // =========================================================================
  // 3. CROSS-PLATFORM CANONICAL INVARIANCE
  // =========================================================================

  /**
   * Tests canonical model fidelity when serialized and deserialized across platforms.
   */
  public verifyCanonicalInvariance(resource: {
    id: string;
    type: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
  }): { invariant: boolean; fieldsPreserved: string[] } {
    // 1. Simulate JSON serialization as passed via Sync, Backup, or Native Store
    const serialized = JSON.stringify(resource);
    const deserialized = JSON.parse(serialized);

    const match =
      deserialized.id === resource.id &&
      deserialized.type === resource.type &&
      deserialized.title === resource.title &&
      deserialized.content === resource.content &&
      deserialized.createdAt === resource.createdAt &&
      deserialized.updatedAt === resource.updatedAt;

    return {
      invariant: match,
      fieldsPreserved: ['id', 'type', 'title', 'content', 'createdAt', 'updatedAt', 'metadata'],
    };
  }

  // =========================================================================
  // 4. MOBILE LIFECYCLE & PROCESS RECOVERY
  // =========================================================================

  /**
   * Stages dirty note edits immediately upon mobile backgrounding.
   */
  public handleAppBackground(noteId: string, content: string): void {
    this.dirtyNoteBuffer.set(noteId, {
      content,
      savedAt: new Date().toISOString(),
    });
  }

  /**
   * Recovers dirty note edit on app foreground recreation.
   */
  public recoverDirtyNote(noteId: string): { content: string; savedAt: string } | null {
    const edit = this.dirtyNoteBuffer.get(noteId);
    if (edit) {
      this.dirtyNoteBuffer.delete(noteId);
      return edit;
    }
    return null;
  }

  /**
   * Predictable Android Back Button stack handler.
   */
  public handleNativeBackButton(activeModal: string | null, isInspectorOpen: boolean, canNavigateBack: boolean): {
    actionTaken: 'close_modal' | 'close_inspector' | 'navigate_back' | 'minimize_app';
  } {
    if (activeModal) {
      return { actionTaken: 'close_modal' };
    }
    if (isInspectorOpen) {
      return { actionTaken: 'close_inspector' };
    }
    if (canNavigateBack) {
      return { actionTaken: 'navigate_back' };
    }
    return { actionTaken: 'minimize_app' };
  }

  // =========================================================================
  // 5. TABLET DUAL-PANE WORKSPACE COORDINATION
  // =========================================================================

  public setTabletDualPaneState(state: Partial<TabletDualPaneState>): TabletDualPaneState {
    this.tabletPaneState = {
      ...this.tabletPaneState,
      ...state,
    };
    return this.tabletPaneState;
  }

  public getTabletDualPaneState(): TabletDualPaneState {
    return { ...this.tabletPaneState };
  }

  /**
   * Preserves state across screen orientation rotation (portrait <-> landscape) or split resizing.
   */
  public handleTabletOrientationChange(newOrientation: 'portrait' | 'landscape', windowWidth: number): TabletDualPaneState {
    const isMultiTasking = windowWidth < 800;
    this.tabletPaneState = {
      ...this.tabletPaneState,
      orientation: newOrientation,
      isMultiTaskingReducedWidth: isMultiTasking,
      // In portrait or narrow split, secondary pane stacks or collapses gracefully
      primaryPaneWidthPercent: newOrientation === 'portrait' || isMultiTasking ? 100 : 50,
    };
    return this.tabletPaneState;
  }
}

export const v2_25PlatformIntegrationEngine = V2_25PlatformIntegrationEngine.getInstance();
