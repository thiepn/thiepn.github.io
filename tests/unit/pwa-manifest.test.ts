import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA manifest', () => {
  it('uses a stable standalone THIEPN install identity', () => {
    const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8')) as {
      name?: string;
      short_name?: string;
      id?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      prefer_related_applications?: boolean;
    };

    expect(manifest.name).toBe('THIEPN');
    expect(manifest.short_name).toBe('THIEPN');
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.prefer_related_applications).toBe(false);
  });
});
