/**
 * V2.8 Secure Credential Broker & Secret Redaction Engine
 * Isolates credentials, redacts tokens in logs and export archives, and provides capability-gated use.
 */

import { authorizationGatewayV2, ExecutionContextV2 } from './authorizationGatewayV2';

export interface SecureCredentialMetadata {
  id: string;
  provider: 'git' | 'openai' | 'anthropic' | 'google' | 'oauth_connector' | 'custom';
  name: string;
  createdAt: number;
  lastUsedAt?: number;
  redactedPreview: string; // e.g. "ghp_****1234"
}

export class SecureCredentialBrokerV2 {
  private static instance: SecureCredentialBrokerV2;

  private secretsStore = new Map<string, string>(); // In-memory runtime secrets
  private metadataStore = new Map<string, SecureCredentialMetadata>();

  private constructor() {}

  public static getInstance(): SecureCredentialBrokerV2 {
    if (!SecureCredentialBrokerV2.instance) {
      SecureCredentialBrokerV2.instance = new SecureCredentialBrokerV2();
    }
    return SecureCredentialBrokerV2.instance;
  }

  public storeCredential(
    id: string,
    provider: SecureCredentialMetadata['provider'],
    name: string,
    secretValue: string
  ): void {
    if (!secretValue || secretValue.trim().length === 0) return;

    this.secretsStore.set(id, secretValue);
    const len = secretValue.length;
    const preview =
      len > 8
        ? `${secretValue.slice(0, 4)}****${secretValue.slice(-4)}`
        : '********';

    this.metadataStore.set(id, {
      id,
      provider,
      name,
      createdAt: Date.now(),
      redactedPreview: preview,
    });
  }

  public removeCredential(id: string): boolean {
    this.secretsStore.delete(id);
    return this.metadataStore.delete(id);
  }

  public listCredentialMetadata(): SecureCredentialMetadata[] {
    return Array.from(this.metadataStore.values());
  }

  /**
   * Capability-checked usage of a raw credential.
   * Plugins and extensions cannot retrieve the raw secret directly; they must invoke through a verified callback.
   */
  public async useCredential<T>(
    context: ExecutionContextV2,
    credentialId: string,
    operation: (secret: string) => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const auth = authorizationGatewayV2.checkAuthorization(context, 'credentials.use');
    if (!auth.authorized) {
      return { success: false, error: auth.reason || 'Unauthorized credential access' };
    }

    const secret = this.secretsStore.get(credentialId);
    if (!secret) {
      return { success: false, error: 'Credential not found' };
    }

    // Update metadata
    const meta = this.metadataStore.get(credentialId);
    if (meta) {
      meta.lastUsedAt = Date.now();
    }

    try {
      const result = await operation(secret);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: this.redactSecretsInString(err?.message || 'Operation failed') };
    }
  }

  /**
   * Redacts any active credentials or known token patterns from an arbitrary string.
   */
  public redactSecretsInString(input: string): string {
    if (!input) return input;
    let sanitized = input;

    // 1. Redact all stored credentials
    for (const secret of this.secretsStore.values()) {
      if (secret && secret.length >= 6) {
        sanitized = sanitized.split(secret).join('[REDACTED_SECRET]');
      }
    }

    // 2. Generic heuristics for common secret patterns (API keys, Bearer tokens, GitHub/AWS/Google keys)
    sanitized = sanitized.replace(/(ghp_[A-Za-z0-9_]{20,})/g, 'ghp_[REDACTED]');
    sanitized = sanitized.replace(/(sk-[A-Za-z0-9_-]{20,})/g, 'sk-[REDACTED]');
    sanitized = sanitized.replace(/(AIza[0-9A-Za-z-_]{35})/g, 'AIza[REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi, 'Bearer [REDACTED_TOKEN]');
    sanitized = sanitized.replace(/password\s*[:=]\s*["']?([^"'\s]+)["']?/gi, 'password=[REDACTED]');

    return sanitized;
  }

  /**
   * Recursively redacts objects before serialization into logs or support archives.
   */
  public redactSecretsInObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.redactSecretsInString(obj) as any;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSecretsInObject(item)) as any;
    }

    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('key')
      ) {
        result[k] = '[REDACTED_FIELD]';
      } else {
        result[k] = this.redactSecretsInObject(v);
      }
    }
    return result;
  }

  public clearAllCredentials(): void {
    this.secretsStore.clear();
    this.metadataStore.clear();
  }
}

export const secureCredentialBrokerV2 = SecureCredentialBrokerV2.getInstance();
