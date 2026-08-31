import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/data/site';

describe('site configuration', () => {
  it('targets the production custom domain', () => {
    expect(SITE.url).toBe('https://thiepn.dev');
    expect(new URL(SITE.url).pathname).toBe('/');
  });

  it('uses the current portfolio identity without legacy project-only branding', () => {
    expect(SITE.name).toBe('THIEPN');
    expect(SITE.title).toBe('THIEPN — Software, Games, Learning & Books');
    expect(SITE.description).toContain('software');
    expect(SITE.description).toContain('books');
    expect(SITE.description).not.toBe('Projects, tools, games & experiments.');
    expect(SITE.designSystem).toBe('THIEPN Portfolio / DS-01');
    expect(SITE.phase).toBeGreaterThanOrEqual(16);
  });
});
