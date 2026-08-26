import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PATHS, compactText, parseArgs, publicProjects, readCollections, readProjects, writeText, xmlEscape } from './lib/catalogue-files.mjs';

const args = parseArgs();
const check = Boolean(args.check);
const svgOnly = Boolean(args.svgOnly);
const projects = publicProjects(await readProjects());
const collections = await readCollections();
const WIDTH = 1200;
const HEIGHT = 630;

function shorten(value, max = 82) { return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`; }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

function wrapTitle(value) {
  const words = compactText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > 27 && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0], shorten(lines.slice(1).join(' '), 31)];
}

function svg({ code, title, subtitle, accent = '#777A73', kind = 'PROJECT' }) {
  const lines = wrapTitle(title);
  const safeSubtitle = xmlEscape(shorten(compactText(subtitle)));
  const titleSize = lines.length > 1 ? 66 : compactText(title).length > 28 ? 68 : 78;
  const titleStart = lines.length > 1 ? 282 : 330;
  const titleMarkup = lines.map((line, index) => `<tspan x="88" y="${titleStart + index * 78}">${xmlEscape(line)}</tspan>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${xmlEscape(compactText(title))}">
  <rect width="1200" height="630" fill="#ECEAE3"/>
  <path d="M54 54H1146M54 576H1146M112 54V576M1088 54V576" stroke="#D0CDC4" stroke-width="1"/>
  <rect x="54" y="54" width="6" height="522" fill="${xmlEscape(accent)}"/>
  <g fill="none" stroke="#AAA79E" stroke-width="1.5" opacity=".9">
    <path d="M985 92H1100M1042 74V132"/>
    <circle cx="985" cy="92" r="5" fill="#ECEAE3"/>
    <circle cx="1100" cy="92" r="5" fill="${xmlEscape(accent)}" stroke="${xmlEscape(accent)}"/>
    <circle cx="1042" cy="132" r="5" fill="#ECEAE3"/>
  </g>
  <text x="88" y="108" fill="#555650" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="18" letter-spacing="2">${xmlEscape(code)} / ${xmlEscape(kind)}</text>
  <text fill="#151613" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="600" letter-spacing="-3.5">${titleMarkup}</text>
  <text x="90" y="${lines.length > 1 ? 455 : 405}" fill="#555650" font-family="Arial, Helvetica, sans-serif" font-size="27">${safeSubtitle}</text>
  <text x="88" y="538" fill="#151613" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="18" letter-spacing="3">THIEPN / PROJECT UNIVERSE</text>
</svg>\n`;
}

const cards = [
  { file: 'index.svg', code: 'HOME', title: 'THIEPN', subtitle: 'Games, tools, learning systems and ideas — built to be used, played and explored.', kind: 'PORTFOLIO', accent: '#555650' },
  { file: 'projects.svg', code: 'PROJECTS', title: 'Projects', subtitle: 'The complete THIEPN project catalogue: games, tools, learning systems, resources and experiments.', kind: 'DIRECTORY', accent: '#555650' },
  { file: 'books.svg', code: 'BOOKS', title: 'Books', subtitle: 'Published long-form works available through the THIEPN Library.', kind: 'LIBRARY', accent: '#555650' },
  { file: 'collections.svg', code: 'COLLECTIONS', title: 'Collections', subtitle: 'Editorial paths through related THIEPN projects, subjects and experiments.', kind: 'DIRECTORY', accent: '#555650' },
  ...projects.map((project) => ({ file: `${project.data.slug}.svg`, code: project.data.code, title: project.data.title, subtitle: project.data.subtitle, kind: 'PROJECT', accent: project.data.accent.light })),
  ...collections.map((collection) => ({ file: `collection-${collection.data.slug}.svg`, code: collection.data.code, title: collection.data.title, subtitle: collection.data.summary, kind: 'COLLECTION', accent: '#666A63' })),
];

const rendered = new Map();
for (const card of cards) {
  const content = svg(card);
  rendered.set(card.file, content);
  await writeText(path.join(PATHS.og, card.file), content, { check });
}

async function validateRasterDerivatives() {
  if (svgOnly || process.env.THIEPN_INDEX_ROOT) return;
  const manifestPath = path.join(PATHS.generated, 'og-raster-manifest.json');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
  catch { throw new Error('Raster OG manifest missing. Run `node scripts/rasterize-og.mjs` after installing Playwright Chromium.'); }
  if (manifest.version !== 1 || manifest.width !== WIDTH || manifest.height !== HEIGHT) throw new Error('Raster OG manifest has an unsupported format. Re-run `node scripts/rasterize-og.mjs`.');

  for (const card of cards) {
    const content = rendered.get(card.file);
    const entry = manifest.entries?.[card.file];
    if (!entry) throw new Error(`Raster OG derivative missing from manifest: ${card.file}`);
    if (entry.sha256 !== sha256(content)) throw new Error(`Raster OG derivative is stale: ${card.file}. Run node scripts/rasterize-og.mjs.`);
    const pngPath = path.join(PATHS.og, entry.png);
    let png;
    try { png = await fs.readFile(pngPath); }
    catch { throw new Error(`Raster OG file missing: ${entry.png}`); }
    if (png.length < 24 || png.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Raster OG file is not a PNG: ${entry.png}`);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== WIDTH || height !== HEIGHT) throw new Error(`Raster OG dimensions invalid for ${entry.png}: ${width}x${height}`);
  }
}

await validateRasterDerivatives();
console.log(`OG images: ${cards.length} canonical SVG records${svgOnly || process.env.THIEPN_INDEX_ROOT ? '' : ` + ${cards.length} verified PNG derivatives`}.`);
