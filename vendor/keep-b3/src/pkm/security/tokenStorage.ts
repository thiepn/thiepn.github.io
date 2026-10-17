import { encryptAesGcm, decryptAesGcmToText } from '../encryption/aesGcm';
import { GitProvider } from '../remoteGitTypes';

const ENCRYPTED_TOKEN_STORAGE_KEY = 'keepnotes_remote_token_enc';

export interface EncryptedTokenContainer {
  format: 'keepnotes-token-enc-v1';
  createdAt: string;
  iv: string;
  ciphertext: string;
}

export interface TokenValidationResult {
  isValidFormat: boolean;
  typeDescription: string;
  warnings: string[];
}

/**
 * Token Storage Service providing hardened, non-plaintext credential management.
 * - By default, credentials exist ONLY in memory during the active session.
 * - If vault encryption is enabled, tokens can optionally be saved encrypted at rest with AES-256-GCM.
 * - Plaintext tokens are NEVER stored in localStorage.
 */
class HardenedTokenStorage {
  private inMemoryToken: string | null = null;
  private inMemoryTokenProvider: GitProvider | null = null;

  // --- Session Token Handling (Memory Only) ---

  setSessionToken(token: string | null, provider?: GitProvider): void {
    if (!token) {
      this.clearSessionToken();
      return;
    }
    this.inMemoryToken = token.trim();
    if (provider) {
      this.inMemoryTokenProvider = provider;
    }
  }

  getSessionToken(): string | null {
    return this.inMemoryToken;
  }

  clearSessionToken(): void {
    if (this.inMemoryToken) {
      // Best-effort memory overwrite before releasing reference
      this.inMemoryToken = null;
    }
    this.inMemoryTokenProvider = null;
  }

  // --- Encrypted Token Persistence (Requires Active Vault CryptoKey) ---

  /**
   * Encrypts the token using the Vault Key and saves it to localStorage.
   */
  async saveEncryptedToken(token: string, vaultKey: CryptoKey): Promise<void> {
    if (!token || !vaultKey) {
      throw new Error('Valid token and active Vault Encryption Key required');
    }

    const { iv, ciphertext } = await encryptAesGcm(vaultKey, token.trim());
    const container: EncryptedTokenContainer = {
      format: 'keepnotes-token-enc-v1',
      createdAt: new Date().toISOString(),
      iv,
      ciphertext,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ENCRYPTED_TOKEN_STORAGE_KEY, JSON.stringify(container));
    }

    // Also update in-memory cache
    this.inMemoryToken = token.trim();
  }

  /**
   * Unwraps and loads the persisted token using the Vault Key.
   */
  async loadEncryptedToken(vaultKey: CryptoKey): Promise<string | null> {
    if (!vaultKey) return null;
    if (typeof localStorage === 'undefined') return null;

    const raw = localStorage.getItem(ENCRYPTED_TOKEN_STORAGE_KEY);
    if (!raw) return null;

    try {
      const container: EncryptedTokenContainer = JSON.parse(raw);
      if (container.format !== 'keepnotes-token-enc-v1') {
        return null;
      }

      const decryptedToken = await decryptAesGcmToText(vaultKey, container.ciphertext, container.iv);
      if (decryptedToken) {
        this.inMemoryToken = decryptedToken.trim();
        return decryptedToken.trim();
      }
      return null;
    } catch (err) {
      console.error('Failed to decrypt saved remote token with vault key:', err);
      return null;
    }
  }

  hasEncryptedToken(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return Boolean(localStorage.getItem(ENCRYPTED_TOKEN_STORAGE_KEY));
  }

  deleteEncryptedToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ENCRYPTED_TOKEN_STORAGE_KEY);
    }
  }

  // --- Token Format & Masking Helpers ---

  /**
   * Masks a credential for secure UI display (e.g. "ghp_••••••••••••3a4b")
   */
  maskToken(token: string | null | undefined): string {
    if (!token) return '••••••••';
    const trimmed = token.trim();
    if (trimmed.length <= 8) {
      return '••••••••';
    }

    // Identify prefix if standard Git provider token (e.g. ghp_, github_pat_, glpat-)
    const prefixMatch = trimmed.match(/^([a-zA-Z0-9_]{3,15}_|[a-zA-Z0-9]{3,8}-)/);
    const prefix = prefixMatch ? prefixMatch[1] : trimmed.slice(0, 4);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••••••${suffix}`;
  }

  /**
   * Validates token format based on the selected Git provider.
   */
  validateTokenFormat(token: string, provider: GitProvider): TokenValidationResult {
    const trimmed = token.trim();
    if (!trimmed) {
      return {
        isValidFormat: false,
        typeDescription: 'Empty Token',
        warnings: ['Token cannot be empty'],
      };
    }

    const warnings: string[] = [];

    switch (provider) {
      case 'github': {
        if (trimmed.startsWith('ghp_')) {
          return {
            isValidFormat: true,
            typeDescription: 'GitHub Classic Personal Access Token',
            warnings: [],
          };
        }
        if (trimmed.startsWith('github_pat_')) {
          return {
            isValidFormat: true,
            typeDescription: 'GitHub Fine-Grained Personal Access Token',
            warnings: [],
          };
        }
        if (trimmed.startsWith('gho_') || trimmed.startsWith('ghu_')) {
          return {
            isValidFormat: true,
            typeDescription: 'GitHub OAuth / User-to-Server Token',
            warnings: [],
          };
        }
        warnings.push('Token does not start with standard GitHub prefix (ghp_ or github_pat_). Ensure repository permissions are granted.');
        return {
          isValidFormat: trimmed.length >= 20,
          typeDescription: 'Custom / Legacy GitHub Token',
          warnings,
        };
      }

      case 'gitlab': {
        if (trimmed.startsWith('glpat-')) {
          return {
            isValidFormat: true,
            typeDescription: 'GitLab Personal Access Token',
            warnings: [],
          };
        }
        if (trimmed.length < 20) {
          warnings.push('GitLab tokens are typically at least 20 characters.');
        }
        return {
          isValidFormat: trimmed.length >= 10,
          typeDescription: 'GitLab Access Token',
          warnings,
        };
      }

      case 'gitea': {
        return {
          isValidFormat: trimmed.length >= 16,
          typeDescription: 'Gitea / Forgejo Access Token',
          warnings: trimmed.length < 16 ? ['Gitea tokens are typically 40-character SHA hashes.'] : [],
        };
      }

      case 'custom_http':
      default: {
        return {
          isValidFormat: trimmed.length >= 4,
          typeDescription: 'Custom Git / HTTP Bearer Credential',
          warnings: [],
        };
      }
    }
  }
}

export const hardenedTokenStorage = new HardenedTokenStorage();
