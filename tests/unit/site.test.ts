import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/data/site';

describe('site configuration', () => {
  it('targets the production custom domain', () => {
    expect(SITE.url).toBe('https://thiepn.dev');
    expect(new URL(SITE.url).pathname).toBe('/');
  });

  it('uses the portfolio identity without legacy index branding', () => {
    expect(SITE.name).toBe('THIEPN');
    expect(SITE.title).toBe('THIEPN — Projects');
    expect(SITE.designSystem).toBe('THIEPN Portfolio / DS-01');
    expect(SITE.phase).toBeGreaterThanOrEqual(16);
  });
});
