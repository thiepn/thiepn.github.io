import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isSafeUrl, sanitizeUrl, sanitizeHtml, sanitizeSvg, stripHtmlToPlainText } from '../security/sanitizer';
import { hardenedTokenStorage } from '../security/tokenStorage';
import { vaultPurgeManager } from '../security/vaultPurge';
import { remoteSyncManager } from '../remoteSyncManager';
import {
  deriveKeyFromPassphrase,
  FAST_TEST_ARGON2ID_PARAMS,
  importRawKeyAsCryptoKey,
  generateVaultKey,
} from '../encryption';

export async function runSecurityHardeningTests() {
  console.log('--- Running Sync UX & Security Hardening Tests (P30) ---');
  let passed = 0;
  let failed = 0;

  function check(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            passed++;
          })
          .catch((err) => {
            console.error(`  ✕ ${name}:`, err);
            failed++;
          });
      }
      passed++;
    } catch (err) {
      console.error(`  ✕ ${name}:`, err);
      failed++;
    }
  }

  // 1. URL Scheme Filtering Tests
  check('Permits safe HTTPS and HTTP URLs', () => {
    assert.strictEqual(isSafeUrl('https://example.com/vault'), true);
    assert.strictEqual(isSafeUrl('http://localhost:3000'), true);
    assert.strictEqual(isSafeUrl('mailto:user@domain.com'), true);
    assert.strictEqual(isSafeUrl('note:123-abc'), true);
    assert.strictEqual(isSafeUrl('pdf:attachment-id'), true);
    assert.strictEqual(isSafeUrl('/relative/path/note'), true);
    assert.strictEqual(isSafeUrl('#heading-anchor'), true);
  });

  check('Blocks dangerous executable URI schemes (XSS vectors)', () => {
    assert.strictEqual(isSafeUrl('javascript:alert(document.cookie)'), false);
    assert.strictEqual(isSafeUrl('JAVASCRIPT:alert(1)'), false);
    assert.strictEqual(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.strictEqual(isSafeUrl('vbscript:msgbox(1)'), false);
    assert.strictEqual(isSafeUrl('file:///etc/passwd'), false);
  });

  check('sanitizeUrl returns sanitized fallback on unsafe protocols', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '#unsafe-link-blocked');
    assert.strictEqual(sanitizeUrl('https://github.com/org/repo'), 'https://github.com/org/repo');
    assert.strictEqual(sanitizeUrl(''), '#');
  });

  // 2. HTML and SVG DOMPurify Sanitization Tests
  check('sanitizeHtml strips script tags and inline execution handlers', () => {
    const maliciousHtml = '<p>Normal text</p><script>alert("pwned")</script><img src=x onerror="alert(1)">';
    const clean = sanitizeHtml(maliciousHtml);
    assert.strictEqual(clean.includes('<script>'), false);
    assert.strictEqual(clean.includes('onerror'), false);
    assert.strictEqual(clean.includes('Normal text'), true);
  });

  check('sanitizeSvg removes nested script elements from SVG diagrams', () => {
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="50" cy="50" r="40"/></svg>';
    const cleanSvg = sanitizeSvg(maliciousSvg);
    assert.strictEqual(cleanSvg.includes('<script>'), false);
    assert.strictEqual(cleanSvg.includes('circle'), true);
  });

  check('stripHtmlToPlainText converts HTML markup to safe text', () => {
    const markup = '<h3>Hello <strong>World</strong></h3><p>Some notes</p>';
    const text = stripHtmlToPlainText(markup);
    assert.strictEqual(text.includes('<'), false);
    assert.strictEqual(text.includes('Hello World'), true);
  });

  // 3. Token Storage & Masking Tests
  check('Masks tokens securely for UI presentation', () => {
    assert.strictEqual(hardenedTokenStorage.maskToken('ghp_1234567890abcdef1234'), 'ghp_••••••••••••1234');
    assert.strictEqual(hardenedTokenStorage.maskToken('github_pat_11AAAAAAA_BBBBBBBBBBBB1234'), 'github_pat_••••••••••••1234');
    assert.strictEqual(hardenedTokenStorage.maskToken('short'), '••••••••');
  });

  check('Validates token format prefixes for GitHub, GitLab, and Gitea', () => {
    const ghClassic = hardenedTokenStorage.validateTokenFormat('ghp_abcdefghijklmnopqrstuvwxyz123456', 'github');
    assert.strictEqual(ghClassic.isValidFormat, true);
    assert.strictEqual(ghClassic.typeDescription, 'GitHub Classic Personal Access Token');

    const ghFineGrained = hardenedTokenStorage.validateTokenFormat('github_pat_11ABCD_12345678901234567890', 'github');
    assert.strictEqual(ghFineGrained.isValidFormat, true);
    assert.strictEqual(ghFineGrained.typeDescription, 'GitHub Fine-Grained Personal Access Token');

    const glToken = hardenedTokenStorage.validateTokenFormat('glpat-abcdefghijklmnopqrst', 'gitlab');
    assert.strictEqual(glToken.isValidFormat, true);

    const emptyToken = hardenedTokenStorage.validateTokenFormat('', 'github');
    assert.strictEqual(emptyToken.isValidFormat, false);
  });

  // 4. Memory Zeroization & Purge on Vault Lock Tests
  check('vaultPurgeManager clears session credentials and notifies subscribers on lock', () => {
    hardenedTokenStorage.setSessionToken('ghp_test_temporary_token');
    assert.strictEqual(hardenedTokenStorage.getSessionToken(), 'ghp_test_temporary_token');

    let subscriberNotified = false;
    const unsub = vaultPurgeManager.registerPurgeCallback(() => {
      subscriberNotified = true;
    });

    const report = vaultPurgeManager.executeVaultPurge();
    assert.strictEqual(hardenedTokenStorage.getSessionToken(), null);
    assert.strictEqual(subscriberNotified, true);
    assert.strictEqual(report.clearedCaches.length >= 2, true);

    unsub();
  });

  // 5. Encrypted Token at Rest with Vault Key
  await (async () => {
    await check('Encrypts and decrypts remote token using CryptoKey without plaintext storage', async () => {
      const { cryptoKey: key } = await generateVaultKey();

      const secretToken = 'ghp_secret_access_token_super_secure';
      await hardenedTokenStorage.saveEncryptedToken(secretToken, key);

      // Verify token container in localStorage does not contain plaintext
      const rawStored = localStorage.getItem('keepnotes_remote_token_enc');
      assert.ok(rawStored);
      assert.strictEqual(rawStored.includes('ghp_secret_access_token_super_secure'), false);

      // Decrypt with key
      const decrypted = await hardenedTokenStorage.loadEncryptedToken(key);
      assert.strictEqual(decrypted, secretToken);

      // Clean up
      hardenedTokenStorage.deleteEncryptedToken();
      assert.strictEqual(hardenedTokenStorage.hasEncryptedToken(), false);
    });
  })();

  // 6. RemoteSyncManager Status Details & Pre-flight Diagnostics
  check('RemoteSyncManager status details report correct unconfigured/auth states', () => {
    const details = remoteSyncManager.getStatusDetails();
    assert.ok(details);
    assert.ok('state' in details);
    assert.ok('isAuthenticated' in details);
    assert.ok('isConfigured' in details);
  });

  console.log(`✓ Sync UX & Security Hardening (P30): ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`Security Hardening test suite had ${failed} failures`);
  }
}
