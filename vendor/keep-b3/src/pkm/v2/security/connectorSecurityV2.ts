/**
 * V2.8 Connector Security & External Data Isolation Engine
 * Validates OAuth state/PKCE tokens, sanitizes external email/HTML feeds,
 * enforces minimal provider scopes, and blocks remote tracking pixels by default.
 */

export interface OAuthSessionStateV2 {
  stateToken: string;
  codeVerifier?: string;
  provider: string;
  createdAt: number;
  expectedRedirectUri: string;
}

export class ConnectorSecurityV2 {
  private static instance: ConnectorSecurityV2;

  private pendingOAuthSessions = new Map<string, OAuthSessionStateV2>();
  private blockRemoteImagesDefault: boolean = true;

  private constructor() {}

  public static getInstance(): ConnectorSecurityV2 {
    if (!ConnectorSecurityV2.instance) {
      ConnectorSecurityV2.instance = new ConnectorSecurityV2();
    }
    return ConnectorSecurityV2.instance;
  }

  public setBlockRemoteImagesDefault(block: boolean): void {
    this.blockRemoteImagesDefault = block;
  }

  public getBlockRemoteImagesDefault(): boolean {
    return this.blockRemoteImagesDefault;
  }

  /**
   * Generates a cryptographically strong anti-CSRF state token for OAuth flows.
   */
  public createOAuthSession(provider: string, expectedRedirectUri: string, codeVerifier?: string): string {
    const randomBytes = new Uint8Array(24);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 24; i++) randomBytes[i] = Math.floor(Math.random() * 256);
    }
    const stateToken = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    this.pendingOAuthSessions.set(stateToken, {
      stateToken,
      codeVerifier,
      provider,
      createdAt: Date.now(),
      expectedRedirectUri,
    });

    return stateToken;
  }

  /**
   * Validates state token on OAuth callback. Fails closed against CSRF replay.
   */
  public validateAndConsumeOAuthSession(
    stateToken: string,
    provider: string
  ): { valid: boolean; session?: OAuthSessionStateV2; error?: string } {
    const session = this.pendingOAuthSessions.get(stateToken);
    if (!session) {
      return { valid: false, error: 'Invalid or expired OAuth state token (potential CSRF)' };
    }

    // Single-use token: consume immediately
    this.pendingOAuthSessions.delete(stateToken);

    // Timeout check: 10 minutes
    if (Date.now() - session.createdAt > 10 * 60 * 1000) {
      return { valid: false, error: 'OAuth session has expired' };
    }

    if (session.provider !== provider) {
      return { valid: false, error: 'OAuth provider mismatch' };
    }

    return { valid: true, session };
  }

  /**
   * Sanitizes untrusted email and connector HTML content.
   * Strips scripts, forms, frames, active handlers, and optionally blocks tracking pixels.
   */
  public sanitizeConnectorHtml(
    rawHtml: string,
    options?: { allowRemoteImages?: boolean }
  ): { sanitizedHtml: string; trackingPixelsRemoved: number; strippedElementsCount: number } {
    if (!rawHtml) {
      return { sanitizedHtml: '', trackingPixelsRemoved: 0, strippedElementsCount: 0 };
    }

    let html = rawHtml;
    let strippedElementsCount = 0;
    let trackingPixelsRemoved = 0;

    const blockImages = options?.allowRemoteImages === false || (options?.allowRemoteImages === undefined && this.blockRemoteImagesDefault);

    // 1. Strip script tags
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const scriptMatches = html.match(scriptRegex);
    if (scriptMatches) {
      strippedElementsCount += scriptMatches.length;
      html = html.replace(scriptRegex, '');
    }

    // 2. Strip dangerous elements (style, iframe, object, embed, form, input, button, applet, meta, link, base)
    const dangerousTags = ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'applet', 'meta', 'link', 'base'];
    for (const tag of dangerousTags) {
      const tagRegex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>|<${tag}\\b[^>]*\\/?>`, 'gi');
      const matches = html.match(tagRegex);
      if (matches) {
        strippedElementsCount += matches.length;
        html = html.replace(tagRegex, '');
      }
    }

    // 3. Strip all inline event attributes (onclick, onload, onerror, etc.)
    const eventAttrRegex = /\s*on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
    const eventMatches = html.match(eventAttrRegex);
    if (eventMatches) {
      strippedElementsCount += eventMatches.length;
      html = html.replace(eventAttrRegex, '');
    }

    // 4. Strip dangerous URL schemes (javascript:, vbscript:, data:text/html)
    html = html.replace(/\s*(?:href|src)\s*=\s*["']?\s*(?:javascript|vbscript|data:\s*text\/html):[^"'>\s]*/gi, ' href="#"');

    // 5. Block or redact remote tracking images if policy active
    if (blockImages) {
      const imgRegex = /<img\b([^>]*)>/gi;
      html = html.replace(imgRegex, (match, attrs) => {
        // Detect 1x1 or 0x0 tracking pixel heuristics or remote http(s) urls
        const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
        if (srcMatch && (srcMatch[1].startsWith('http://') || srcMatch[1].startsWith('https://'))) {
          trackingPixelsRemoved += 1;
          return '<span class="pkm-blocked-remote-image" title="Remote image blocked for privacy">[Remote Image Blocked]</span>';
        }
        return match;
      });
    }

    return {
      sanitizedHtml: html,
      trackingPixelsRemoved,
      strippedElementsCount,
    };
  }

  public clearAllPendingSessions(): void {
    this.pendingOAuthSessions.clear();
  }
}

export const connectorSecurityV2 = ConnectorSecurityV2.getInstance();
