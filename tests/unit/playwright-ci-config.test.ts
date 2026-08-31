import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('playwright.config.ts', 'utf8');

describe('Playwright CI certification topology', () => {
  it('uses bounded two-worker parallelism in CI', () => {
    expect(source).toContain('fullyParallel: true');
    expect(source).toContain('...(isCI ? { workers: 2 } : {})');
    expect(source).not.toContain('...(isCI ? { workers: 1 } : {})');
  });

  it('retains the full desktop and mobile browser matrix', () => {
    for (const project of ['chromium', 'firefox', 'webkit', 'mobile-chromium', 'mobile-webkit']) {
      expect(source).toContain(`name: '${project}'`);
    }
    expect(source).toContain('grepInvert: mobileCertification');
    expect(source).toContain('grep: mobileCertification');
  });
});
