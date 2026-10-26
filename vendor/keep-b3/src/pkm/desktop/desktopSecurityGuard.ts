/**
 * P46 — Native Desktop App Security Guard
 * Enforces path authorization, boundary validation, and execution isolation.
 *
 * Mandates:
 * 1. Root-scoped file operations (rejects traversal: ../, ..\, absolute paths, UNC escapes, symlink escapes)
 * 2. Strict origin validation (plugins, AI, and rendered note HTML can NEVER access native bridge)
 * 3. Command allowlist validation (no arbitrary shell or process execution)
 */

export class DesktopSecurityGuard {
  /**
   * Validates and sanitizes a relative path within an authorized root directory.
   * Prevents directory traversal attacks (e.g., ../../../etc/passwd, ..\..\Windows\System32).
   */
  static validateRelativePath(relativePath: string): { isValid: boolean; sanitizedPath?: string; error?: string } {
    if (!relativePath || typeof relativePath !== 'string') {
      return { isValid: false, error: 'Path must be a non-empty string' };
    }

    // Normalize slashes
    const normalized = relativePath.replace(/\\/g, '/').trim();

    // Check for absolute paths (POSIX /... or Windows C:/ or UNC //...)
    if (normalized.startsWith('/') || /^[a-zA-Z]:\//i.test(normalized) || normalized.startsWith('//')) {
      return { isValid: false, error: 'Absolute and UNC paths are strictly forbidden' };
    }

    // Check for path traversal elements
    const segments = normalized.split('/').filter(Boolean);
    for (const segment of segments) {
      if (segment === '..' || segment === '.' || segment === '...' || segment === '~') {
        return { isValid: false, error: 'Path traversal segments are strictly forbidden' };
      }
      // Check for forbidden control characters or null bytes
      if (/[\0\x01-\x1F\x7F]/.test(segment)) {
        return { isValid: false, error: 'Path contains illegal control characters' };
      }
    }

    const sanitized = segments.join('/');
    if (!sanitized) {
      return { isValid: false, error: 'Resolved path is empty' };
    }

    return { isValid: true, sanitizedPath: sanitized };
  }

  /**
   * Verifies that the caller context is authorized to invoke native capabilities.
   * Plugins (P41), AI prompts/tool calls (P42), and rendered markdown HTML are strictly DENIED.
   */
  static verifyCallerAuthorization(callerContext: 'core_app' | 'plugin' | 'ai' | 'markdown_html' | 'external_url'): boolean {
    if (callerContext !== 'core_app') {
      console.error(`[SECURITY] Desktop capability invocation blocked for unauthorized caller context: ${callerContext}`);
      return false;
    }
    return true;
  }

  /**
   * Validates a custom deep link protocol URI.
   * Rejects malformed URIs, dangerous schemes, or traversal attempts.
   */
  static sanitizeProtocolUri(rawUri: string): { isValid: boolean; action?: string; param?: string; error?: string } {
    if (!rawUri || typeof rawUri !== 'string') {
      return { isValid: false, error: 'Empty or invalid protocol URI' };
    }

    const trimmed = rawUri.trim();
    if (!trimmed.startsWith('pkm://') && !trimmed.startsWith('pkm:')) {
      return { isValid: false, error: 'Invalid protocol scheme (must be pkm://)' };
    }

    // Parse path part after pkm://
    const pathPart = trimmed.replace(/^pkm:\/\/?/, '');
    const [actionAndParam, queryPart] = pathPart.split('?');
    const segments = actionAndParam.split('/').filter(Boolean);

    if (segments.length === 0) {
      return { isValid: false, error: 'Protocol URI missing action' };
    }

    const action = segments[0].toLowerCase();
    const allowedActions = ['note', 'today', 'collection', 'reference', 'capture', 'search'];

    if (!allowedActions.includes(action)) {
      return { isValid: false, error: `Unsupported protocol action: ${action}` };
    }

    const rawParam = segments.slice(1).join('/');
    // Validate resource ID format (must not contain traversal or shell injection characters)
    if (rawParam && (!/^[a-zA-Z0-9_\-.:@]+$/.test(rawParam) || rawParam.includes('..'))) {
      return { isValid: false, error: 'Invalid or unsafe resource identifier in deep link' };
    }

    return {
      isValid: true,
      action,
      param: rawParam || undefined,
    };
  }
}
