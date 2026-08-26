import fs from 'node:fs';
import path from 'node:path';

const fail = [];
const note = [];
const read = (file) => fs.readFileSync(file, 'utf8');

function srgbChannel(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}
function contrast(a, b) {
  const one = luminance(a);
  const two = luminance(b);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

const surfaces = {
  light: ['#eceae3', '#f2f0e9', '#f8f6f0', '#fffefa', '#e4e1d8'],
  dark: ['#0b0c0c', '#101111', '#141515', '#191a1a', '#202120'],
};
const textTokens = {
  light: { ink: '#151613', secondary: '#555650', muted: '#62635d' },
  dark: { ink: '#f0eee8', secondary: '#aaa8a2', muted: '#888983' },
};
for (const mode of ['light', 'dark']) {
  for (const [name, color] of Object.entries(textTokens[mode])) {
    const minimum = Math.min(...surfaces[mode].map((background) => contrast(color, background)));
    if (minimum < 4.5) fail.push(`${mode} ${name} text contrast falls below 4.5:1 (${minimum.toFixed(2)}).`);
    else note.push(`${mode} ${name}: ${minimum.toFixed(2)}:1 minimum`);
  }
}

// Project accents are used as small record/index text on the page canvas. Audit that use.
const projectDir = 'src/content/projects';
for (const file of fs.readdirSync(projectDir).filter((entry) => entry.endsWith('.md'))) {
  const source = read(path.join(projectDir, file));
  const code = /\ncode:\s*([^\n]+)/.exec(source)?.[1]?.trim().replace(/["']/g, '') ?? file;
  const light = /accent:\s*\n\s*light:\s*["']?(#[0-9a-fA-F]{6})/.exec(source)?.[1];
  const dark = /accent:[\s\S]*?\n\s*dark:\s*["']?(#[0-9a-fA-F]{6})/.exec(source)?.[1];
  if (!light || !dark) continue;
  const lightRatio = contrast(light, '#eceae3');
  const darkRatio = contrast(dark, '#0b0c0c');
  if (lightRatio < 4.5) fail.push(`${code} light accent ${light} is ${lightRatio.toFixed(2)}:1 on the light canvas.`);
  if (darkRatio < 4.5) fail.push(`${code} dark accent ${dark} is ${darkRatio.toFixed(2)}:1 on the dark canvas.`);
}

const base = read('src/layouts/BaseLayout.astro');
if (!/<html\s+lang="en"/.test(base)) fail.push('Document language is missing from BaseLayout.');
if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(base)) fail.push('Viewport disables browser zoom.');
if (!base.includes('Skip to main content')) fail.push('Skip link missing.');

const primitives = read('src/styles/primitives.css');
if (!primitives.includes(':focus-visible')) fail.push('Global focus-visible treatment missing.');
if (!primitives.includes('outline:3px solid currentColor')) fail.push('Global focus-visible indicator is weaker than the P2D 3px contract.');
if (!primitives.includes('scroll-margin-block')) fail.push('Focusable controls lack sticky-header focus clearance.');

const motion = read('src/styles/motion.css');
if (!motion.includes('prefers-reduced-motion: reduce')) fail.push('Reduced-motion CSS guard missing.');
const responsive = read('src/styles/responsive.css');
if (!responsive.includes('forced-colors: active')) fail.push('Forced-colors CSS guard missing.');
if (/--text-meta:\s*\.(?:[0-6]\d)rem/.test(responsive)) fail.push('Responsive CSS shrinks the canonical metadata token below the P2D floor.');

const searchComponent = read('src/components/search/CatalogueSearch.astro');
if (!searchComponent.includes('aria-describedby="catalogue-search-help"')) fail.push('Project search input lacks keyboard/combobox help text.');
if (!searchComponent.includes('aria-busy="false"')) fail.push('Project search results lack an initial aria-busy state.');
if (!/catalogue-search__shortcuts button,[\s\S]*?min-height:44px/.test(searchComponent)) fail.push('Project search suggestions are below the 44px target contract.');

const searchController = read('src/scripts/catalogue-search.ts');
if (/createElement\(['"]button['"]\)[\s\S]{0,500}role['"],\s*['"]option/.test(searchController)) fail.push('Search listbox options are implemented as buttons with overridden option roles.');
if (!searchController.includes("option.setAttribute('role', 'option')")) fail.push('Search options do not expose role=option.');
if (!searchController.includes("resultsEl.setAttribute('aria-busy', 'true')")) fail.push('Search loading is not announced with aria-busy.');

const galleryComponent = read('src/components/records/ArtifactGallery.astro');
if (!galleryComponent.includes('aria-describedby="gallery-dialog-caption"')) fail.push('Gallery inspector is not described by its active caption.');
if (!galleryComponent.includes('data-gallery-dialog-status')) fail.push('Gallery inspector lacks a live announcement region.');
if (!/gallery-inspector button\{min-height:44px/.test(galleryComponent)) fail.push('Gallery inspector controls are below the 44px target contract.');
const galleryController = read('src/scripts/gallery-controller.ts');
if (!galleryController.includes('data-gallery-dialog-status')) fail.push('Gallery controller does not announce view changes.');
if (!galleryController.includes('closeButton?.focus()')) fail.push('Gallery inspector does not establish a deterministic initial focus target.');

const statusLabel = read('src/components/artifacts/StatusLabel.astro');
if (!statusLabel.includes('Project status: ')) fail.push('Project status labels lack screen-reader context.');

const collectionController = read('src/scripts/collection-map-controller.ts');
if (collectionController.includes("setAttribute('aria-current'")) fail.push('Collection preview selection misuses aria-current.');
if (!collectionController.includes("setAttribute('aria-pressed'")) fail.push('Collection relationship buttons do not expose pressed state.');

const readabilityFiles = [
  'src/components/shell/SiteHeader.astro',
  'src/components/shell/MobileMenu.astro',
  'src/components/shell/ThemeControl.astro',
  'src/components/shell/SiteFooter.astro',
  'src/components/search/CatalogueSearch.astro',
  'src/components/archive/ArchiveControls.astro',
  'src/components/archive/ProjectArchive.astro',
  'src/components/records/ArtifactGallery.astro',
  'src/components/artifacts/StatusLabel.astro',
  'src/components/books/BookCard.astro',
];
for (const file of readabilityFiles) {
  const source = read(file);
  const undersized = source.match(/(?<!\d)\.(?:[0-5]\d|6[0-7])rem\b/g);
  if (undersized?.length) fail.push(`${file} contains P2D sub-floor rem text sizes: ${[...new Set(undersized)].join(', ')}.`);
}

const allSourceFiles = [];
for (const root of ['src/components', 'src/pages', 'src/scripts']) {
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(astro|ts|css)$/.test(entry.name)) allSourceFiles.push(full);
    }
  };
  walk(root);
}
const source = allSourceFiles.map(read).join('\n');
if (/ondrag|dragstart|draggable\s*=\s*["']true/i.test(source)) fail.push('A dragging-only interaction remains in first-party UI source.');

const imageWithoutAlt = /<img\b(?![^>]*\balt=)[^>]*>/gis.exec(source);
if (imageWithoutAlt) fail.push('A first-party img element is missing an explicit alt attribute.');
const unsafeBlankTarget = /<a\b(?=[^>]*target=["']_blank["'])(?![^>]*rel=["'][^"']*noopener)[^>]*>/gis.exec(source);
if (unsafeBlankTarget) fail.push('A target=_blank link is missing rel=noopener.');

if (fail.length) {
  console.error('Phase 12 accessibility source audit failed:');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('Phase 12 accessibility source audit passed.');
for (const item of note) console.log(`  ${item}`);
