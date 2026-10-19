import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('functional Hub copy contracts', () => {
  it('keeps actions and accessibility while removing redundant shell captions', () => {
    const shell = read('src/components/workspace/WorkspaceShell.astro');
    const menu = read('src/components/shell/MobileMenu.astro');
    const footer = read('src/components/shell/SiteFooter.astro');
    expect(shell).toContain('data-workspace-notice role="status"');
    expect(shell).toContain('aria-label="Search matches and commands"');
    expect(menu).toContain('aria-label="Close navigation menu"');
    expect(menu).not.toContain('Find anything');
    expect(footer).toContain('/privacy/');
    expect(footer).not.toContain('A digital workshop by Jonathan.');
  });
  it('retains real product safety disclosures while omitting sales taglines', () => {
    const scan = read('src/pages/scan/index.astro');
    const byte = read('src/pages/byte/index.astro');
    expect(scan).toContain('data-scan-release-pending');
    expect(scan).toContain('install-guide__eyebrow');
    expect(scan).not.toContain('Scan it.<br />Keep it local.');
    expect(byte).toContain('unknown-publisher warning');
    expect(byte).toContain('Verify the installer checksum');
    expect(byte).not.toContain('Byte is waiting on the desktop.');
  });
  it('keeps dialog operation labels without decorative search prompts', () => {
    const modal = read('src/components/search/CatalogueSearch.astro');
    expect(modal).toContain('data-catalogue-search-results');
    expect(modal).toContain('aria-describedby="catalogue-search-help"');
    expect(modal).not.toContain('Find something interesting');
    expect(modal).not.toContain('<span>Try</span>');
  });
});
