import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PATHS, ROOT, compactText, parseArgs, publicProjects, readCollections, readProjects, writeText, xmlEscape } from './lib/catalogue-files.mjs';

const args = parseArgs();
const check = Boolean(args.check);
const svgOnly = Boolean(args.svgOnly);
const projects = publicProjects(await readProjects());
const collections = await readCollections();
const WIDTH = 1200;
const HEIGHT = 630;

function shorten(value, max = 82) { return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`; }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

const showcasePath = path.join(ROOT, 'src/data/showcase.json');
const showcase = existsSync(showcasePath) ? JSON.parse(readFileSync(showcasePath, 'utf8')) : { projects: {} };

function wrapCopy(value, limit, maxLines = 3) {
  const lines = []; let line = '';
  for (const word of compactText(value).split(/\s+/)) {
    if (line && (line + ' ' + word).length > limit) { lines.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0,maxLines-1), shorten(lines.slice(maxLines-1).join(' '),limit)];
}
function svg({ file, title, subtitle, accent = '#356142', kind = 'PROJECT' }) {
  const home = file === 'index.svg';
  const slug = home ? 'micro-arcade' : file.replace(/\.svg$/, '');
  const media = showcase.projects?.[slug]?.media;
  const mediaPath = media ? path.join(PATHS.public, media.replace(/^\//,'')) : null;
  const hasMedia = mediaPath && existsSync(mediaPath);
  const lines = wrapCopy(title, hasMedia ? 19 : 30);
  const ink = home ? '#eff3e8' : '#18231f';
  const muted = home ? '#bdcbbc' : '#526057';
  const paper = home ? '#14201f' : '#f6f7f2';
  const subtitleLines = wrapCopy(subtitle, hasMedia ? 37 : 67, 2);
  const titleY = lines.length > 1 ? 263 : 306;
  const subtitleY = titleY + (lines.length-1)*72 + 62;
  let picture = '';
  if (hasMedia) {
    const type = /\.jpe?g$/i.test(mediaPath) ? 'jpeg' : /\.png$/i.test(mediaPath) ? 'png' : 'webp';
    const data = readFileSync(mediaPath).toString('base64');
    picture = `<rect x="637" y="160" width="503" height="360" rx="8" fill="${home?'#090d14':'#e9eee5'}"/>
      <image x="653" y="176" width="471" height="328" href="data:image/${type};base64,${data}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${xmlEscape(title)}">
  <rect width="1200" height="630" fill="${paper}"/>
  <text x="64" y="85" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="-1.5">THIEPN.</text>
  <path d="M64 115H1136" stroke="${home?'#354239':'#ccd5c9'}"/>
  <text x="64" y="164" fill="${muted}" font-family="Arial, Helvetica, sans-serif" font-size="18">${home?'Independent projects by Jonathan':kind==='PROJECT'?'A project by Jonathan':kind==='LIBRARY'?'From the Library':'Explore the work'}</text>
  <text fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="${hasMedia?62:76}" font-weight="600" letter-spacing="-2.8">${lines.map((line,i)=>`<tspan x="64" y="${titleY+i*72}">${xmlEscape(line)}</tspan>`).join('')}</text>
  <text fill="${muted}" font-family="Arial, Helvetica, sans-serif" font-size="24">${subtitleLines.map((line,i)=>`<tspan x="66" y="${subtitleY+i*33}">${xmlEscape(line)}</tspan>`).join('')}</text>
  ${picture}
  <rect x="64" y="555" width="34" height="3" fill="${home?'#c6e7a8':xmlEscape(accent)}"/>
  <text x="64" y="595" fill="${muted}" font-family="Arial, Helvetica, sans-serif" font-size="18">thiepn.dev</text>
</svg>\n`;
}

const cards = [
  { file: 'index.svg', code: 'HOME', title: 'A few things worth opening.', subtitle: 'Games to play. Tools to use. Ideas to explore.', kind: 'PORTFOLIO', accent: '#555650' },
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
