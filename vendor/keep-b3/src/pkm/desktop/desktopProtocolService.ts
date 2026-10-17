/**
 * P46 — Native Protocol & Deep Link Service
 * Handles registration and dispatching of custom scheme links (pkm://...).
 *
 * Rules:
 * 1. Strictly bounded grammar (pkm://note/<id>, pkm://today, pkm://collection/<id>, pkm://reference/<id>, pkm://capture, pkm://search).
 * 2. Deep links navigate and inspect only; they NEVER trigger destructive actions, deletions, or silent mutations.
 * 3. Second-instance invocations forward protocol payload into running instance without spawning multiple vault writers.
 */

import { ParsedProtocolUri } from './desktopTypes';
import { DesktopSecurityGuard } from './desktopSecurityGuard';

export type ProtocolActionHandler = (parsed: ParsedProtocolUri) => void;

export class DesktopProtocolService {
  private isNativeAvailable: boolean = false;
  private actionHandlers: Set<ProtocolActionHandler> = new Set();
  private lastHandledUri: string | null = null;
  private recentInvocationCount: number = 0;
  private lastInvocationTime: number = 0;

  constructor() {
    this.detectCapabilities();
    this.initProtocolListeners();
  }

  private detectCapabilities(): void {
    if (typeof window !== 'undefined' && (window as any).__TAURI__ && (window as any).__TAURI__.core) {
      this.isNativeAvailable = true;
    }
  }

  public isAvailable(): boolean {
    return this.isNativeAvailable;
  }

  public getLastHandledUri(): string | null {
    return this.lastHandledUri;
  }

  public subscribe(handler: ProtocolActionHandler): () => void {
    this.actionHandlers.add(handler);
    return () => this.actionHandlers.delete(handler);
  }

  /**
   * Initializes native deep-link listeners when running under Tauri desktop shell.
   */
  private async initProtocolListeners(): Promise<void> {
    if (this.isNativeAvailable && typeof window !== 'undefined' && (window as any).__TAURI__) {
      const tauriEvent = (window as any).__TAURI__.event;
      if (tauriEvent && tauriEvent.listen) {
        try {
          await tauriEvent.listen('deep-link-received', (event: any) => {
            const rawUri = event.payload && typeof event.payload === 'string' ? event.payload : event.payload?.url;
            if (rawUri) {
              this.handleIncomingUri(rawUri);
            }
          });
        } catch (err) {
          console.warn('Failed to register native deep-link listener:', err);
        }
      }
    }
  }

  /**
   * Parses, sanitizes, rate-limits, and dispatches an incoming protocol URI.
   */
  public handleIncomingUri(rawUri: string): ParsedProtocolUri {
    const now = Date.now();
    // Rate-limiting check: max 10 deep-links per 5 seconds
    if (now - this.lastInvocationTime > 5000) {
      this.recentInvocationCount = 1;
      this.lastInvocationTime = now;
    } else {
      this.recentInvocationCount++;
      if (this.recentInvocationCount > 10) {
        console.warn('[SECURITY] Deep link rate limit exceeded, ignoring:', rawUri);
        return {
          isValid: false,
          action: 'unknown',
          rawUri,
          error: 'Rate limit exceeded',
        };
      }
    }

    const sanitized = DesktopSecurityGuard.sanitizeProtocolUri(rawUri);
    if (!sanitized.isValid || !sanitized.action) {
      console.warn('[SECURITY] Invalid protocol URI rejected:', rawUri, sanitized.error);
      return {
        isValid: false,
        action: 'unknown',
        rawUri,
        error: sanitized.error || 'Invalid URI',
      };
    }

    const parsed: ParsedProtocolUri = {
      isValid: true,
      action: sanitized.action as any,
      resourceId: sanitized.param,
      rawUri,
    };

    this.lastHandledUri = rawUri;
    this.dispatchToHandlers(parsed);
    return parsed;
  }

  private dispatchToHandlers(parsed: ParsedProtocolUri): void {
    this.actionHandlers.forEach((handler) => {
      try {
        handler(parsed);
      } catch (err) {
        console.error('Error in protocol handler:', err);
      }
    });
  }

  public parseProtocolUrl(rawUri: string): {
    isValid: boolean;
    action: 'note' | 'daily' | 'today' | 'collection' | 'reference' | 'capture' | 'search' | 'unknown';
    targetId?: string;
    rawUri: string;
    error?: string;
  } {
    const sanitized = DesktopSecurityGuard.sanitizeProtocolUri(rawUri);
    if (!sanitized.isValid || !sanitized.action) {
      return {
        isValid: false,
        action: 'unknown',
        rawUri,
        error: sanitized.error || 'Invalid URI',
      };
    }
    const action = sanitized.action === 'today' ? 'daily' : (sanitized.action as any);
    return {
      isValid: true,
      action,
      targetId: sanitized.param,
      rawUri,
    };
  }

  /**
   * Generates a canonical deep-link URI for a given note or resource.
   */
  public generateDeepLink(action: 'note' | 'today' | 'collection' | 'reference' | 'capture', resourceId?: string): string {
    if (action === 'today' || action === 'capture') {
      return `pkm://${action}`;
    }
    if (resourceId) {
      return `pkm://${action}/${encodeURIComponent(resourceId)}`;
    }
    return `pkm://${action}`;
  }
}

export const desktopProtocolService = new DesktopProtocolService();
