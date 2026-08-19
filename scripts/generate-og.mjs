import path from 'node:path';
import { PATHS, compactText, parseArgs, publicProjects, readCollections, readProjects, writeText, xmlEscape } from './lib/catalogue-files.mjs';

const args = parseArgs();
const check = Boolean(args.check);
const projects = publicProjects(await readProjects());
const collections = await readCollections();

function shorten(value, max = 78) { return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`; }

function svg({ code, title, subtitle, accent = '#777A73', kind = 'ARTIFACT' }) {
  const safeTitle = xmlEscape(compactText(title));
  const safeSubtitle = xmlEscape(shorten(compactText(subtitle)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${safeTitle}">
  <rect width="1200" height="630" fill="#ECEAE3"/>
  <path d="M54 54H1146M54 576H1146" stroke="#AAA79E" stroke-width="1"/>
  <rect x="54" y="54" width="6" height="522" fill="${xmlEscape(accent)}"/>
  <text x="86" y="104" fill="#555650" font-family="ui-monospace, monospace" font-size="18" letter-spacing="2">${xmlEscape(code)} / ${xmlEscape(kind)}</text>
  <text x="86" y="320" fill="#151613" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="600" letter-spacing="-4">${safeTitle}</text>
  <text x="88" y="378" fill="#555650" font-family="Arial, Helvetica, sans-serif" font-size="28">${safeSubtitle}</text>
  <text x="86" y="536" fill="#151613" font-family="ui-monospace, monospace" font-size="18" letter-spacing="3">THIEPN. / THE INDEX</text>
</svg>\n`;
}

await writeText(path.join(PATHS.og, 'index.svg'), svg({ code: '00', title: 'THIEPN.', subtitle: 'Projects, tools, games & experiments.', kind: 'PROJECT INDEX', accent: '#555650' }), { check });
for (const project of projects) {
  await writeText(path.join(PATHS.og, `${project.data.slug}.svg`), svg({ code: project.data.code, title: project.data.title, subtitle: project.data.subtitle, accent: project.data.accent.light }), { check });
}
for (const collection of collections) {
  await writeText(path.join(PATHS.og, `collection-${collection.data.slug}.svg`), svg({ code: collection.data.code, title: collection.data.title, subtitle: collection.data.summary, kind: 'COLLECTION', accent: '#666A63' }), { check });
}
console.log(`OG images: ${1 + projects.length + collections.length} SVG records.`);
