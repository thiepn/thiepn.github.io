import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/data/site';

describe('site configuration', () => {
  it('targets the root GitHub Pages site or its production custom domain', () => {
    expect(SITE.url).toBe('https://thiepn.dev');
    expect(new URL(SITE.url).pathname).toBe('/');
  });

  it('preserves the design-system identity in later phases', () => {
    expect(SITE.designSystem).toBe('THE INDEX / DS-01');
    expect(SITE.phase).toBeGreaterThanOrEqual(15);
  });
});
