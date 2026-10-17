/**
 * V1.3 — Unified Secure Deep Link Router
 * Parses, sanitizes, and routes incoming internal and native deep links.
 * Enforces strict security boundaries: strictly prohibits destructive operations
 * or unauthorized payload execution via deep links.
 */

import { DeepLinkRoute, PlatformError } from './platformTypes';
import { platformRegistry } from './platformCapabilityRegistry';

export type DeepLinkNavigationHandler = (route: DeepLinkRoute) => void;

export class DeepLinkRouter {
  private static instance: DeepLinkRouter | null = null;
  private pendingRoute: DeepLinkRoute | null = null;
  private isVaultLocked: boolean = false;
  private listeners: Set<DeepLinkNavigationHandler> = new Set();
  private auditLog: Array<{ timestamp: string; url: string; accepted: boolean; reason?: string }> = [];

  private constructor() {
    this.initNativeLinkListeners();
  }

  public static getInstance(): DeepLinkRouter {
    if (!DeepLinkRouter.instance) {
      DeepLinkRouter.instance = new DeepLinkRouter();
    }
    return DeepLinkRouter.instance;
  }

  public setVaultLockStatus(isLocked: boolean): void {
    this.isVaultLocked = isLocked;
    if (!isLocked && this.pendingRoute) {
      const routeToDispatch = this.pendingRoute;
      this.pendingRoute = null;
      this.dispatch(routeToDispatch);
    }
  }

  /**
   * Parses and validates a raw deep link URI.
   * Throws or returns null if malicious or unrecognized.
   */
  public parseUrl(rawUrl: string): { route: DeepLinkRoute | null; error?: PlatformError } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { route: null, error: platformRegistry.normalizeError('MALICIOUS_DEEP_LINK_REJECTED', 'Empty URL') };
    }

    const trimmed = rawUrl.trim();

    // 1. Security check: prohibit path traversal, scripts, or dangerous schemes
    if (
      trimmed.includes('../') ||
      trimmed.includes('..\\') ||
      trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:') ||
      trimmed.toLowerCase().startsWith('file:')
    ) {
      this.logAudit(trimmed, false, 'Path traversal or dangerous protocol scheme');
      return {
        route: null,
        error: platformRegistry.normalizeError('MALICIOUS_DEEP_LINK_REJECTED', 'Unauthorized protocol or path traversal attempt'),
      };
    }

    // 2. Parse protocol scheme: accept app://, pkm://, https://*personal-os*/app/..., or relative /app/...
    let path = '';
    let queryString = '';

    if (trimmed.startsWith('app://') || trimmed.startsWith('pkm://')) {
      const withoutScheme = trimmed.replace(/^(app|pkm):\/\//, '');
      const qIndex = withoutScheme.indexOf('?');
      if (qIndex !== -1) {
        path = withoutScheme.substring(0, qIndex);
        queryString = withoutScheme.substring(qIndex + 1);
      } else {
        path = withoutScheme;
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const u = new URL(trimmed);
        path = u.pathname.replace(/^\/?(app\/)?/, '');
        queryString = u.search.replace(/^\?/, '');
      } catch {
        this.logAudit(trimmed, false, 'Invalid HTTP URL');
        return { route: null, error: platformRegistry.normalizeError('MALICIOUS_DEEP_LINK_REJECTED', 'Malformed URL') };
      }
    } else {
      // Relative path e.g. "note/123" or "/app/note/123"
      const cleaned = trimmed.replace(/^\/?(app\/)?/, '');
      const qIndex = cleaned.indexOf('?');
      if (qIndex !== -1) {
        path = cleaned.substring(0, qIndex);
        queryString = cleaned.substring(qIndex + 1);
      } else {
        path = cleaned;
      }
    }

    const params = new URLSearchParams(queryString);
    const segments = path.split('/').filter(Boolean);
    const primaryAction = segments[0]?.toLowerCase() || '';
    const secondaryId = segments[1] || '';

    // 3. Prohibit dangerous / destructive actions
    const forbiddenActions = ['delete', 'destroy', 'execute', 'run', 'send_email', 'pay', 'health_mutate', 'ai_accept'];
    if (forbiddenActions.includes(primaryAction)) {
      this.logAudit(trimmed, false, `Prohibited destructive action: ${primaryAction}`);
      return {
        route: null,
        error: platformRegistry.normalizeError('MALICIOUS_DEEP_LINK_REJECTED', `Direct deep link invocation of action '${primaryAction}' is forbidden for security`),
      };
    }

    // 4. Match against whitelist of valid safe routes
    let matchedRoute: DeepLinkRoute | null = null;

    if (primaryAction === 'note' && secondaryId) {
      matchedRoute = {
        action: 'open_resource',
        resourceType: 'note',
        resourceId: secondaryId,
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'project' && secondaryId) {
      matchedRoute = {
        action: 'open_resource',
        resourceType: 'project',
        resourceId: secondaryId,
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'task' && secondaryId) {
      matchedRoute = {
        action: 'open_resource',
        resourceType: 'task',
        resourceId: secondaryId,
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'context' && secondaryId) {
      matchedRoute = {
        action: 'open_resource',
        resourceType: 'context',
        resourceId: secondaryId,
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'today') {
      matchedRoute = {
        action: 'open_view',
        viewName: 'today',
        requiresUnlock: false,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'calendar') {
      matchedRoute = {
        action: 'open_view',
        viewName: 'calendar',
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'finance') {
      matchedRoute = {
        action: 'open_view',
        viewName: 'finance',
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'library') {
      matchedRoute = {
        action: 'open_view',
        viewName: 'library',
        requiresUnlock: true,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'settings') {
      matchedRoute = {
        action: 'open_settings',
        requiresUnlock: false,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'search') {
      const q = params.get('q') || secondaryId || '';
      matchedRoute = {
        action: 'search',
        searchQuery: q,
        requiresUnlock: false,
        rawUrl: trimmed,
      };
    } else if (primaryAction === 'capture') {
      const text = params.get('text') || '';
      const url = params.get('url') || '';
      matchedRoute = {
        action: 'quick_capture',
        captureText: text,
        captureUrl: url,
        requiresUnlock: false,
        rawUrl: trimmed,
      };
    } else {
      this.logAudit(trimmed, false, `Unrecognized route target: ${primaryAction}`);
      return {
        route: null,
        error: platformRegistry.normalizeError('CAPABILITY_UNAVAILABLE', `Deep link destination '${primaryAction}' does not exist`),
      };
    }

    this.logAudit(trimmed, true);
    return { route: matchedRoute };
  }

  /**
   * Ingests, parses, and executes navigation for a deep link
   */
  public handleUrl(rawUrl: string): boolean {
    const { route, error } = this.parseUrl(rawUrl);
    if (!route || error) {
      return false;
    }

    if (route.requiresUnlock && this.isVaultLocked) {
      // Hold pending route until unlocked
      this.pendingRoute = route;
      return true;
    }

    this.dispatch(route);
    return true;
  }

  public subscribe(handler: DeepLinkNavigationHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private dispatch(route: DeepLinkRoute): void {
    for (const handler of this.listeners) {
      try {
        handler(route);
      } catch (err) {
        console.error('Error in deep link dispatch handler:', err);
      }
    }
  }

  private logAudit(url: string, accepted: boolean, reason?: string): void {
    this.auditLog.unshift({
      timestamp: new Date().toISOString(),
      url: url.length > 200 ? url.substring(0, 200) + '...' : url,
      accepted,
      reason,
    });
    if (this.auditLog.length > 50) {
      this.auditLog.pop();
    }
  }

  public getAuditLog() {
    return [...this.auditLog];
  }

  private initNativeLinkListeners(): void {
    if (typeof window === 'undefined') return;

    // 1. Web / PWA query param listener on cold launch e.g. ?open=app://note/123
    try {
      const params = new URLSearchParams(window.location.search);
      const deepParam = params.get('deeplink') || params.get('open');
      if (deepParam) {
        setTimeout(() => this.handleUrl(deepParam), 100);
      }
    } catch {
      // Ignore URL parsing errors
    }

    // 2. Custom Protocol Window Message Listener (e.g. from Tauri/Capacitor native shell)
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'PKM_DEEP_LINK' && typeof event.data.url === 'string') {
        this.handleUrl(event.data.url);
      }
    });
  }
}

export const deepLinkRouter = DeepLinkRouter.getInstance();
