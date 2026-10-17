/**
 * V2.12 Mobile Platform Bridge
 * 
 * Manages mobile-specific capabilities: Android Back button stack dispatching,
 * deep-link route verification, process suspension state bundling, and privacy-safe widget sync.
 */

export interface DeepLinkRoute {
  action: 'open_note' | 'quick_capture' | 'today' | 'search' | 'open_collection' | 'oauth_callback';
  resourceId?: string;
  query?: string;
  provider?: string;
  token?: string;
  rawUrl: string;
}

export interface MobileBackHandler {
  id: string;
  priority: number; // Higher number executed first
  handleBack: () => boolean; // Return true if handled, false to delegate down
}

export class MobilePlatformBridge {
  private static instance: MobilePlatformBridge | null = null;
  private backHandlers: MobileBackHandler[] = [];
  private savedInstanceState: Record<string, unknown> | null = null;

  private constructor() {}

  public static getInstance(): MobilePlatformBridge {
    if (!MobilePlatformBridge.instance) {
      MobilePlatformBridge.instance = new MobilePlatformBridge();
    }
    return MobilePlatformBridge.instance;
  }

  /**
   * Registers a priority-based Back navigation handler
   */
  public registerBackHandler(handler: MobileBackHandler): () => void {
    this.backHandlers.push(handler);
    this.backHandlers.sort((a, b) => b.priority - a.priority);
    return () => {
      this.backHandlers = this.backHandlers.filter(h => h.id !== handler.id);
    };
  }

  /**
   * Executes the top-most Back navigation handler in the stack
   */
  public dispatchBack(): boolean {
    for (const handler of this.backHandlers) {
      if (handler.handleBack()) {
        return true; // Handled
      }
    }
    return false; // Delegated to OS
  }

  /**
   * Parses and securely sanitizes an incoming custom URL or deep link (e.g. keepnotes://note/123)
   */
  public parseDeepLink(rawUrl: string): DeepLinkRoute | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    try {
      // Normalize scheme
      const normalized = rawUrl.replace(/^keepnotes:\/\//i, 'https://keepnotes.local/');
      const url = new URL(normalized);
      const pathname = url.pathname.replace(/^\//, '');

      // 1. Note route: keepnotes://note/note-123
      if (pathname.startsWith('note/')) {
        const resourceId = pathname.slice(5).replace(/[^a-zA-Z0-9\-_]/g, '');
        return {
          action: 'open_note',
          resourceId,
          rawUrl,
        };
      }

      // 2. Quick capture route: keepnotes://capture?text=hello
      if (pathname === 'capture' || pathname === 'quick_capture') {
        return {
          action: 'quick_capture',
          query: url.searchParams.get('text') || undefined,
          rawUrl,
        };
      }

      // 3. Today route: keepnotes://today
      if (pathname === 'today') {
        return {
          action: 'today',
          rawUrl,
        };
      }

      // 4. Search route: keepnotes://search?q=meeting
      if (pathname === 'search') {
        return {
          action: 'search',
          query: url.searchParams.get('q') || undefined,
          rawUrl,
        };
      }

      // 5. OAuth callback route: keepnotes://oauth/callback?provider=google&code=xyz
      if (pathname.startsWith('oauth/')) {
        return {
          action: 'oauth_callback',
          provider: url.searchParams.get('provider') || undefined,
          token: url.searchParams.get('code') || url.searchParams.get('token') || undefined,
          rawUrl,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Saves active application state bundle on mobile app freeze/suspension
   */
  public saveSuspensionState(state: Record<string, unknown>): void {
    this.savedInstanceState = { ...state, timestamp: Date.now() };
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('keepnotes_mobile_instance_state', JSON.stringify(this.savedInstanceState));
      } catch {
        // Safe ignore
      }
    }
  }

  /**
   * Retrieves and restores application state bundle on mobile resume
   */
  public getRestorationState(): Record<string, unknown> | null {
    if (this.savedInstanceState) return this.savedInstanceState;

    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('keepnotes_mobile_instance_state');
        if (raw) {
          this.savedInstanceState = JSON.parse(raw);
          return this.savedInstanceState;
        }
      } catch {
        // Safe ignore
      }
    }
    return null;
  }

  /**
   * Generates privacy-safe widget data payload
   */
  public generateWidgetPayload(params: {
    isVaultLocked: boolean;
    todayTaskCount: number;
    completedTaskCount: number;
    dueTaskSnippet?: string;
  }): {
    status: 'locked' | 'ready';
    title: string;
    subtitle: string;
    actionUri: string;
  } {
    if (params.isVaultLocked) {
      return {
        status: 'locked',
        title: 'KeepNotes (Locked)',
        subtitle: 'Tap to unlock your vault',
        actionUri: 'keepnotes://today',
      };
    }

    return {
      status: 'ready',
      title: `Today: ${params.completedTaskCount}/${params.todayTaskCount} Done`,
      subtitle: params.dueTaskSnippet ? `Next: ${params.dueTaskSnippet}` : 'All tasks up to date',
      actionUri: 'keepnotes://today',
    };
  }
}

export const mobilePlatformBridge = MobilePlatformBridge.getInstance();
