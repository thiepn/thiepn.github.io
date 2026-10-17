/**
 * V2.8 Plugin Sandbox Security & Adversarial Isolation Engine
 * Enforces network allowlists, prevents localhost/RFC1918 SSRF, detects redirect escapes,
 * protects against message floods/runaways, and gates permission escalations on update.
 */

import { authorizationGatewayV2, ExecutionContextV2 } from './authorizationGatewayV2';
import { SecurityCapabilityV2 } from './securityTypesV2';

export interface PluginManifestV2 {
  id: string;
  name: string;
  version: string;
  requestedCapabilities: SecurityCapabilityV2[];
  allowedNetworkOrigins?: string[];
  maxStorageBytes?: number;
}

export interface PluginNetworkCheckResult {
  allowed: boolean;
  reason?: string;
  blockedTarget?: string;
}

export class PluginSandboxSecurityV2 {
  private static instance: PluginSandboxSecurityV2;

  // Stored approved manifests to detect permission escalation on updates
  private installedManifests = new Map<string, PluginManifestV2>();
  private pluginStorageUsage = new Map<string, number>();
  private messageRateWindow = new Map<string, { count: number; windowStartMs: number }>();

  private readonly DEFAULT_MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5MB
  private readonly MAX_MESSAGE_RATE_PER_SEC = 100;
  private readonly MAX_MESSAGE_PAYLOAD_BYTES = 1024 * 1024; // 1MB

  private constructor() {}

  public static getInstance(): PluginSandboxSecurityV2 {
    if (!PluginSandboxSecurityV2.instance) {
      PluginSandboxSecurityV2.instance = new PluginSandboxSecurityV2();
    }
    return PluginSandboxSecurityV2.instance;
  }

  /**
   * Registers or updates a plugin manifest, checking for permission escalations.
   * Returns whether manual user authorization is required due to added capabilities.
   */
  public registerPluginManifest(manifest: PluginManifestV2): {
    requiresUserApproval: boolean;
    addedCapabilities: SecurityCapabilityV2[];
    addedOrigins: string[];
  } {
    const existing = this.installedManifests.get(manifest.id);
    if (!existing) {
      this.installedManifests.set(manifest.id, manifest);
      authorizationGatewayV2.registerGrant(
        manifest.id,
        'plugin',
        manifest.requestedCapabilities,
        manifest.allowedNetworkOrigins
      );
      return {
        requiresUserApproval: manifest.requestedCapabilities.length > 0,
        addedCapabilities: [...manifest.requestedCapabilities],
        addedOrigins: [...(manifest.allowedNetworkOrigins || [])],
      };
    }

    // Check for escalated permissions in new version
    const existingCaps = new Set(existing.requestedCapabilities);
    const addedCaps = manifest.requestedCapabilities.filter((c) => !existingCaps.has(c));

    const existingOrigins = new Set(existing.allowedNetworkOrigins || []);
    const addedOrigins = (manifest.allowedNetworkOrigins || []).filter((o) => !existingOrigins.has(o));

    const requiresApproval = addedCaps.length > 0 || addedOrigins.length > 0;

    if (!requiresApproval) {
      // Safe update
      this.installedManifests.set(manifest.id, manifest);
      authorizationGatewayV2.registerGrant(
        manifest.id,
        'plugin',
        manifest.requestedCapabilities,
        manifest.allowedNetworkOrigins
      );
    }

    return {
      requiresUserApproval: requiresApproval,
      addedCapabilities: addedCaps,
      addedOrigins,
    };
  }

  /**
   * Approves an escalated manifest update explicitly by user.
   */
  public approveManifestUpdate(manifest: PluginManifestV2): void {
    this.installedManifests.set(manifest.id, manifest);
    authorizationGatewayV2.registerGrant(
      manifest.id,
      'plugin',
      manifest.requestedCapabilities,
      manifest.allowedNetworkOrigins
    );
  }

  /**
   * Validates if an outgoing network request from a plugin is permissible.
   * Fails closed if attempting to access localhost, RFC1918 private ranges, or unauthorized origins.
   */
  public validatePluginNetworkRequest(
    pluginId: string,
    targetUrl: string,
    redirectChain: string[] = []
  ): PluginNetworkCheckResult {
    const manifest = this.installedManifests.get(pluginId);
    if (!manifest) {
      return { allowed: false, reason: 'Unregistered plugin', blockedTarget: targetUrl };
    }

    // Check network.request capability
    const context: ExecutionContextV2 = {
      callerId: pluginId,
      callerTrustLevel: 'sandboxed_extension',
      vaultSessionGeneration: authorizationGatewayV2.getVaultSessionGeneration(),
    };

    const auth = authorizationGatewayV2.checkAuthorization(context, 'network.request');
    if (!auth.authorized) {
      return { allowed: false, reason: auth.reason, blockedTarget: targetUrl };
    }

    // Validate target URL and all redirect chain URLs
    const allUrlsToValidate = [targetUrl, ...redirectChain];
    for (const urlStr of allUrlsToValidate) {
      const urlCheck = this.isUrlOriginSafeAndAllowlisted(urlStr, manifest.allowedNetworkOrigins || []);
      if (!urlCheck.allowed) {
        return urlCheck;
      }
    }

    return { allowed: true };
  }

  private isUrlOriginSafeAndAllowlisted(
    urlStr: string,
    allowedOrigins: string[]
  ): PluginNetworkCheckResult {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { allowed: false, reason: 'Invalid or malformed URL', blockedTarget: urlStr };
    }

    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'https:' && protocol !== 'http:') {
      return {
        allowed: false,
        reason: `Forbidden protocol "${protocol}". Only https and http are permitted.`,
        blockedTarget: urlStr,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost & loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return {
        allowed: false,
        reason: 'Localhost and loopback network destinations are strictly forbidden for plugins.',
        blockedTarget: hostname,
      };
    }

    // Block RFC1918 private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x)
    if (this.isPrivateIpAddress(hostname)) {
      return {
        allowed: false,
        reason: 'Private and local network IP ranges are strictly forbidden for plugins.',
        blockedTarget: hostname,
      };
    }

    // Check allowlist
    const requestOrigin = `${parsed.protocol}//${parsed.host}`;
    const matched = allowedOrigins.some((origin) => {
      if (origin === '*') return true;
      if (origin.startsWith('*.')) {
        const domain = origin.slice(2);
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      try {
        const allowedParsed = new URL(origin);
        return allowedParsed.origin.toLowerCase() === requestOrigin.toLowerCase();
      } catch {
        return origin.toLowerCase() === hostname;
      }
    });

    if (!matched) {
      return {
        allowed: false,
        reason: `Destination origin "${requestOrigin}" is not in the declared allowed network origins for this plugin.`,
        blockedTarget: requestOrigin,
      };
    }

    return { allowed: true };
  }

  private isPrivateIpAddress(hostname: string): boolean {
    // Check IPv4 octets
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      // 10.0.0.0/8
      if (parts[0] === 10) return true;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
      // 169.254.0.0/16 (link-local)
      if (parts[0] === 169 && parts[1] === 254) return true;
    }
    return false;
  }

  /**
   * Rate limits and size-checks plugin messages to prevent UI thread starvation / memory abuse.
   */
  public checkPluginMessageRateAndSize(
    pluginId: string,
    payloadSizeBytes: number
  ): { ok: boolean; reason?: string } {
    if (payloadSizeBytes > this.MAX_MESSAGE_PAYLOAD_BYTES) {
      return {
        ok: false,
        reason: `Message payload exceeds maximum allowed size of ${this.MAX_MESSAGE_PAYLOAD_BYTES} bytes.`,
      };
    }

    const now = Date.now();
    let win = this.messageRateWindow.get(pluginId);
    if (!win || now - win.windowStartMs > 1000) {
      win = { count: 1, windowStartMs: now };
      this.messageRateWindow.set(pluginId, win);
      return { ok: true };
    }

    win.count += 1;
    if (win.count > this.MAX_MESSAGE_RATE_PER_SEC) {
      return {
        ok: false,
        reason: `Message rate limit exceeded (max ${this.MAX_MESSAGE_RATE_PER_SEC} msg/sec). Throttling plugin.`,
      };
    }

    return { ok: true };
  }

  /**
   * Enforces bounded storage quotas per plugin.
   */
  public recordPluginStorage(
    pluginId: string,
    deltaBytes: number
  ): { ok: boolean; currentUsage: number; reason?: string } {
    const current = this.pluginStorageUsage.get(pluginId) || 0;
    const manifest = this.installedManifests.get(pluginId);
    const max = manifest?.maxStorageBytes || this.DEFAULT_MAX_STORAGE_BYTES;

    const newUsage = current + deltaBytes;
    if (newUsage > max) {
      return {
        ok: false,
        currentUsage: current,
        reason: `Plugin storage quota exceeded (usage: ${newUsage} bytes, max: ${max} bytes).`,
      };
    }

    this.pluginStorageUsage.set(pluginId, Math.max(0, newUsage));
    return { ok: true, currentUsage: newUsage };
  }

  public resetAll(): void {
    this.installedManifests.clear();
    this.pluginStorageUsage.clear();
    this.messageRateWindow.clear();
  }
}

export const pluginSandboxSecurityV2 = PluginSandboxSecurityV2.getInstance();
