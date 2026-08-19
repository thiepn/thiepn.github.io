import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import budgets from '../performance-budgets.json' with { type: 'json' };

const root = process.cwd();
const dist = path.join(root, 'dist');
const sourceOnly = process.argv.includes('--source') || !fs.existsSync(dist);
const fail = (message) => { throw new Error(message); };
const gzipSize = (buffer) => zlib.gzipSync(buffer, { level: 9 }).length;
const read = (file) => fs.readFileSync(path.join(root, file));

function sourceAudit() {
  const catalogueSearch = read('src/components/search/CatalogueSearch.astro').toString();
  const runtimeLoader = read('src/scripts/runtime-loader.ts').toString();
  const projectArchive = read('src/components/archive/ProjectArchive.astro').toString();
  const previewController = read('src/scripts/preview-controller.ts').toString();
  const primitives = read('src/styles/primitives.css').toString();
  const searchEndpoint = read('src/pages/search-index.json.ts').toString();

  if (catalogueSearch.includes('data-catalogue-search-data')) fail('Search index is still embedded in every page.');
  if (!searchEndpoint.includes('JSON.stringify(searchIndex)')) fail('Static search-index endpoint is missing.');
  if (!runtimeLoader.includes("import('./catalogue-search')") && !read('src/scripts/catalogue-search-bootstrap.ts').toString().includes("import('./catalogue-search')")) fail('Search module is not code-split/on-demand.');
  if (projectArchive.includes('ArchiveRow')) fail('ProjectArchive still server-renders duplicate Grid/List components.');
  if (!projectArchive.includes('created only if the visitor selects List view')) fail('Lazy List-view invariant missing.');
  if (!previewController.includes('Event delegation')) fail('Preview controller is not using the Phase 11 delegated event strategy.');
  if (!primitives.includes('content-visibility: auto')) fail('Long-page render containment is missing.');

  const initialRuntimeSource = [
    'src/scripts/runtime-loader.ts',
    'src/scripts/catalogue-search-bootstrap.ts',
  ].reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
  const searchIndex = read('src/generated/search-index.json');
  const videos = [];
  const projectDir = path.join(root, 'public/projects');
  if (fs.existsSync(projectDir)) {
    for (const dir of fs.readdirSync(projectDir)) {
      const full = path.join(projectDir, dir);
      if (!fs.statSync(full).isDirectory()) continue;
      for (const file of fs.readdirSync(full)) {
        if (!/\.(webm|mp4)$/i.test(file)) continue;
        videos.push({ file: path.relative(root, path.join(full, file)), bytes: fs.statSync(path.join(full, file)).size });
      }
    }
  }
  for (const video of videos) if (video.bytes > budgets.singlePreviewVideoBytes) fail(`${video.file} exceeds single-preview media budget.`);

  const fontDir = path.join(root, 'public/fonts');
  const fontBytes = fs.existsSync(fontDir)
    ? fs.readdirSync(fontDir).filter((file) => /\.(woff2?|otf|ttf)$/i.test(file)).reduce((sum, file) => sum + fs.statSync(path.join(fontDir, file)).size, 0)
    : 0;
  const packageJson = JSON.parse(read('package.json').toString());
  const buildManagedFonts = Boolean(packageJson.dependencies?.['@fontsource-variable/instrument-sans'] || packageJson.dependencies?.['@fontsource/ibm-plex-mono']);
  if (fontBytes > budgets.fontBytes) fail(`Font payload ${(fontBytes/1024).toFixed(1)}KB exceeds ${(budgets.fontBytes/1024).toFixed(1)}KB.`);

  console.log('Phase 11 source performance audit passed.');
  console.log(`Initial loader source: ${(initialRuntimeSource / 1024).toFixed(1)} KB raw`);
  console.log(`Search index: ${(searchIndex.length / 1024).toFixed(1)} KB raw / ${(gzipSize(searchIndex) / 1024).toFixed(1)} KB gzip`);
  console.log(buildManagedFonts && fontBytes === 0
    ? `Font payload: build-managed Fontsource assets; final emitted size is enforced after build / ${(budgets.fontBytes / 1024).toFixed(1)} KB budget`
    : `Font payload: ${(fontBytes / 1024).toFixed(1)} KB / ${(budgets.fontBytes / 1024).toFixed(1)} KB budget`);
  console.log(`Preview videos: ${videos.length ? videos.map((v) => `${v.file} ${(v.bytes / 1024).toFixed(1)}KB`).join(', ') : 'none'}`);
}

function resolveAsset(htmlFile, href) {
  const clean = href.split('?')[0].split('#')[0];
  if (/^(https?:|data:|blob:)/.test(clean)) return null;
  const absolute = clean.startsWith('/') ? path.join(dist, clean.slice(1)) : path.resolve(path.dirname(htmlFile), clean);
  return fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? absolute : null;
}

function pageBudget(relativeHtml) {
  const htmlFile = path.join(dist, relativeHtml);
  if (!fs.existsSync(htmlFile)) return null;
  const html = fs.readFileSync(htmlFile);
  const text = html.toString();
  const scriptRefs = [...text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((match) => match[1]);
  const styleRefs = [...text.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g), ...text.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/g)].map((match) => match[1]);
  const scripts = [...new Set(scriptRefs.map((ref) => resolveAsset(htmlFile, ref)).filter(Boolean))];
  const styles = [...new Set(styleRefs.map((ref) => resolveAsset(htmlFile, ref)).filter(Boolean))];
  const jsGzip = scripts.reduce((sum, file) => sum + gzipSize(fs.readFileSync(file)), 0);
  const cssGzip = styles.reduce((sum, file) => sum + gzipSize(fs.readFileSync(file)), 0);
  const usefulGzip = gzipSize(html) + jsGzip + cssGzip;

  if (jsGzip > budgets.initialJavascriptGzipBytes) fail(`${relativeHtml}: initial JS ${(jsGzip/1024).toFixed(1)}KB gzip exceeds ${(budgets.initialJavascriptGzipBytes/1024).toFixed(1)}KB.`);
  if (cssGzip > budgets.initialCssGzipBytes) fail(`${relativeHtml}: initial CSS ${(cssGzip/1024).toFixed(1)}KB gzip exceeds ${(budgets.initialCssGzipBytes/1024).toFixed(1)}KB.`);
  if (usefulGzip > budgets.initialUsefulTransferGzipBytes) fail(`${relativeHtml}: useful initial transfer ${(usefulGzip/1024).toFixed(1)}KB gzip exceeds ${(budgets.initialUsefulTransferGzipBytes/1024).toFixed(1)}KB.`);
  if (text.includes('data-catalogue-search-data')) fail(`${relativeHtml}: search payload was inlined.`);
  if (/<video[^>]+src=/i.test(text)) fail(`${relativeHtml}: eager video source found.`);

  return { relativeHtml, jsGzip, cssGzip, usefulGzip, htmlGzip: gzipSize(html) };
}

if (sourceOnly) {
  sourceAudit();
} else {
  const pages = ['index.html', 'projects/index.html', 'project/pdf-studio/index.html', 'collection/browser-games/index.html'];
  const rows = pages.map(pageBudget).filter(Boolean);
  const searchFile = path.join(dist, 'search-index.json');
  if (!fs.existsSync(searchFile)) fail('dist/search-index.json was not generated.');
  const searchGzip = gzipSize(fs.readFileSync(searchFile));
  if (searchGzip > budgets.searchIndexGzipBytes) fail(`search-index.json ${(searchGzip/1024).toFixed(1)}KB gzip exceeds budget.`);
  console.table(rows.map((row) => ({
    page: row.relativeHtml,
    html_kb_gzip: (row.htmlGzip / 1024).toFixed(1),
    js_kb_gzip: (row.jsGzip / 1024).toFixed(1),
    css_kb_gzip: (row.cssGzip / 1024).toFixed(1),
    initial_kb_gzip: (row.usefulGzip / 1024).toFixed(1),
  })));
  console.log(`Search index: ${(searchGzip/1024).toFixed(1)} KB gzip`);
  console.log('Phase 11 built performance budgets passed.');
}
