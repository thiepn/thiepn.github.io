import { describe, expect, it, vi } from 'vitest';
import { waitForProtectionBypass } from '../../scripts/vercel/wait-protection-bypass.mjs';

describe('P6 deployment-protection readiness', () => {
  it('returns immediately when the bypass is active', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await expect(
      waitForProtectionBypass({
        url: 'https://candidate.vercel.app/',
        secret: 'a'.repeat(32),
        fetchImpl,
        sleepImpl: vi.fn(),
      }),
    ).resolves.toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('waits through Vercel SSO propagation redirects', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 302,
          headers: { location: 'https://vercel.com/sso-api' },
        }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const sleepImpl = vi.fn(async () => {});

    await expect(
      waitForProtectionBypass({
        url: 'https://candidate.vercel.app/',
        secret: 'b'.repeat(32),
        fetchImpl,
        sleepImpl,
        attempts: 3,
        intervalMs: 25,
      }),
    ).resolves.toBe(2);

    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed after the bounded activation window', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 302 }));
    await expect(
      waitForProtectionBypass({
        url: 'https://candidate.vercel.app/',
        secret: 'c'.repeat(32),
        fetchImpl,
        sleepImpl: vi.fn(async () => {}),
        attempts: 2,
        intervalMs: 25,
      }),
    ).rejects.toThrow('did not become active');
  });

  it('rejects non-Vercel origins and malformed bypass secrets', async () => {
    await expect(
      waitForProtectionBypass({
        url: 'https://evil.test/',
        secret: 'd'.repeat(32),
      }),
    ).rejects.toThrow('clean Vercel');
    await expect(
      waitForProtectionBypass({
        url: 'https://candidate.vercel.app/',
        secret: 'short',
      }),
    ).rejects.toThrow('invalid');
  });
});
