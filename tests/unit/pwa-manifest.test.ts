import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA manifest', () => {
  it('uses a stable standalone THIEPN install identity with PNG launcher icons', () => {
    const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8')) as {
      name?: string;
      short_name?: string;
      id?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      prefer_related_applications?: boolean;
      icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
    };

    expect(manifest.name).toBe('THIEPN');
    expect(manifest.short_name).toBe('THIEPN');
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.prefer_related_applications).toBe(false);

    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
    expect(manifest.icons?.some((icon) => icon.type === 'image/svg+xml')).toBe(false);
  });
});
