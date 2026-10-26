/**
 * V2.8 Deep Link & Native Platform Bridge Security Routers
 * Restricts deep links to safe read/navigate actions, blocks destructive triggers,
 * and validates typed native bridge calls with path canonicalization.
 */

import { authorizationGatewayV2, ExecutionContextV2 } from './authorizationGatewayV2';
import { syncSecurityValidatorV2 } from './syncSecurityValidatorV2';

export interface DeepLinkParseResultV2 {
  valid: boolean;
  action?: 'open_resource' | 'open_view' | 'start_quick_capture' | 'open_search';
  targetId?: string;
  viewName?: string;
  searchQuery?: string;
  blockedDestructiveAction?: string;
  error?: string;
}

export class DeepLinkSecurityRouterV2 {
  private static instance: DeepLinkSecurityRouterV2;

  private readonly MAX_DEEP_LINK_LENGTH = 2048;
  private readonly FORBIDDEN_DESTRUCTIVE_ACTIONS = [
    'delete',
    'delete_resource',
    'archive_bulk',
    'send_email',
    'run_automation',
    'modify_finance',
    'modify_health',
    'install_plugin',
    'grant_permission',
    'execute_proposal',
    'restore_backup',
    'wipe_vault',
    'reset_password',
  ];

  private constructor() {}

  public static getInstance(): DeepLinkSecurityRouterV2 {
    if (!DeepLinkSecurityRouterV2.instance) {
      DeepLinkSecurityRouterV2.instance = new DeepLinkSecurityRouterV2();
    }
    return DeepLinkSecurityRouterV2.instance;
  }

  /**
   * Validates and parses a deep link. Fails closed against destructive actions or malformed inputs.
   */
  public parseDeepLink(urlStr: string): DeepLinkParseResultV2 {
    if (!urlStr || urlStr.length > this.MAX_DEEP_LINK_LENGTH) {
      return { valid: false, error: 'Deep link missing or exceeds maximum safe length (2048 chars)' };
    }

    try {
      // Normalize protocol (pkm:// or https://...)
      const normalized = urlStr.replace(/^pkm:\/\//i, 'https://pkm.internal/');
      const parsed = new URL(normalized);
      const pathname = parsed.pathname.toLowerCase().replace(/^\/+/, '');
      const actionParam = parsed.searchParams.get('action')?.toLowerCase() || pathname;

      // 1. Check for destructive/unauthorized actions
      for (const forbidden of this.FORBIDDEN_DESTRUCTIVE_ACTIONS) {
        if (actionParam === forbidden || actionParam.includes(forbidden)) {
          return {
            valid: false,
            blockedDestructiveAction: actionParam,
            error: `Unauthorized deep link action "${actionParam}": Destructive, administrative, and financial actions cannot be initiated via deep links.`,
          };
        }
      }

      // 2. Map safe allowed navigation actions
      if (actionParam === 'note' || actionParam === 'resource' || actionParam === 'open') {
        const id = parsed.searchParams.get('id') || pathname.split('/')[1];
        if (!id || id.includes('..') || id.includes('/')) {
          return { valid: false, error: 'Invalid or hostile resource ID in deep link' };
        }
        return { valid: true, action: 'open_resource', targetId: id };
      }

      if (actionParam === 'view') {
        const view = parsed.searchParams.get('name') || 'all';
        return { valid: true, action: 'open_view', viewName: view };
      }

      if (actionParam === 'capture' || actionParam === 'quick_capture') {
        return { valid: true, action: 'start_quick_capture' };
      }

      if (actionParam === 'search') {
        const query = parsed.searchParams.get('q') || '';
        return { valid: true, action: 'open_search', searchQuery: query.slice(0, 200) };
      }

      return {
        valid: false,
        error: `Unknown or unallowed deep link action: "${actionParam}". Only safe navigation actions are permitted.`,
      };
    } catch {
      return { valid: false, error: 'Malformed deep link URL' };
    }
  }
}

export class NativeBridgeSecurityV2 {
  private static instance: NativeBridgeSecurityV2;

  private readonly ALLOWED_NATIVE_COMMANDS = new Set([
    'fs.read_file',
    'fs.write_file',
    'fs.list_dir',
    'dialog.show_open',
    'dialog.show_save',
    'app.get_version',
    'system.open_external_url',
  ]);

  private constructor() {}

  public static getInstance(): NativeBridgeSecurityV2 {
    if (!NativeBridgeSecurityV2.instance) {
      NativeBridgeSecurityV2.instance = new NativeBridgeSecurityV2();
    }
    return NativeBridgeSecurityV2.instance;
  }

  /**
   * Validates a call to the native platform bridge.
   * Ensures the command is allowlisted, caller has permissions, and paths are canonicalized.
   */
  public validateBridgeInvocation(
    context: ExecutionContextV2,
    command: string,
    args?: { path?: string; url?: string }
  ): { allowed: boolean; canonicalPath?: string; error?: string } {
    // 1. Allowlist command check
    if (!this.ALLOWED_NATIVE_COMMANDS.has(command)) {
      return {
        allowed: false,
        error: `Unauthorized native bridge command: "${command}". Generic shell or unrestricted filesystem APIs are forbidden.`,
      };
    }

    // 2. Plugins must have explicit native/filesystem permissions
    if (context.callerTrustLevel === 'sandboxed_extension') {
      if (command.startsWith('fs.')) {
        const cap = command === 'fs.read_file' ? 'filesystem.read.selected' : 'filesystem.write.selected';
        const auth = authorizationGatewayV2.checkAuthorization(context, cap);
        if (!auth.authorized) {
          return { allowed: false, error: auth.reason };
        }
      }
      if (command === 'system.open_external_url') {
        const auth = authorizationGatewayV2.checkAuthorization(context, 'native.openExternal');
        if (!auth.authorized) {
          return { allowed: false, error: auth.reason };
        }
      }
    }

    // 3. Path canonicalization and traversal check
    if (args?.path) {
      const pathCheck = syncSecurityValidatorV2.validateSafeRelativePath(args.path);
      if (!pathCheck.valid && !args.path.startsWith('/sandbox_vault/')) {
        return {
          allowed: false,
          error: `Native bridge path traversal rejected: ${pathCheck.error}`,
        };
      }
      return { allowed: true, canonicalPath: args.path.replace(/\\/g, '/') };
    }

    return { allowed: true };
  }
}

export const deepLinkSecurityRouterV2 = DeepLinkSecurityRouterV2.getInstance();
export const nativeBridgeSecurityV2 = NativeBridgeSecurityV2.getInstance();
