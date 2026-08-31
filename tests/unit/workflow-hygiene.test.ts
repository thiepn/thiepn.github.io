import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('post-launch repository hygiene', () => {
  it('uses the tracked lockfile in routine audit workflows', () => {
    for (const path of ['.github/workflows/link-health.yml', '.github/workflows/media-audit.yml']) {
      const source = read(path);
      expect(source).toContain('npm ci --no-audit --no-fund');
      expect(source).not.toContain('npm install --no-audit --no-fund');
    }
    expect(fs.existsSync('package-lock.json')).toBe(true);
  });

  it('does not retain obsolete Phase 15 materialization workflows', () => {
    expect(fs.existsSync('.github/workflows/phase15-bootstrap.yml')).toBe(false);
    expect(fs.existsSync('.github/workflows/phase15-finalize.yml')).toBe(false);
  });

  it('keeps the public footer on the current portfolio identity', () => {
    const footer = read('src/components/shell/SiteFooter.astro');
    expect(footer).toContain('Independent digital portfolio');
    expect(footer.toLowerCase()).not.toContain('project universe');
  });
});
