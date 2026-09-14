import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/data/site';

describe('site configuration', () => {
  it('targets the production custom domain', () => {
    expect(SITE.url).toBe('https://thiepn.dev');
    expect(new URL(SITE.url).pathname).toBe('/');
  });

  it('uses the app-first THIEPN Hub identity', () => {
    expect(SITE.name).toBe('THIEPN');
    expect(SITE.title).toBe('THIEPN — Apps, Tools, Games & Learning');
    expect(SITE.description).toContain('THIEPN apps');
    expect(SITE.description).toContain('tools');
    expect(SITE.description).toContain('games');
    expect(SITE.description).not.toBe('Projects, tools, games & experiments.');
    expect(SITE.designSystem).toBe('THIEPN Hub / DS-02');
    expect(SITE.phase).toBeGreaterThanOrEqual(17);
  });
});
