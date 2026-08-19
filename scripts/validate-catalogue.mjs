import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readFrontmatterDirectory, computeStats } from './lib/catalogue-files.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const projectDir = resolve(root, 'src/content/projects');
const collectionDir = resolve(root, 'src/content/collections');
const failures = [];
const warnings = [];

const [{ projects: ledgerProjects, collections: ledgerCollections, retired }, curation, relations, projectFiles, collectionFiles] = await Promise.all([
  readFile(resolve(root, 'src/data/catalogue-ledger.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'src/data/curation.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'src/data/project-relations.json'), 'utf8').then(JSON.parse),
  readFrontmatterDirectory(projectDir),
  readFrontmatterDirectory(collectionDir),
]);

const projectCodes = new Map();
const projectSlugs = new Map();
const projects = [];
const hex = /^#[0-9A-Fa-f]{6}$/;
const url = /^https:\/\//;

for (const { file, fileSlug, data } of projectFiles) {
  projects.push(data);
  if (data.schemaVersion !== 1) failures.push(`${file}: schemaVersion must be 1.`);
  if (data.slug !== fileSlug) failures.push(`${file}: slug ${data.slug} must match file name ${fileSlug}.`);
  if (projectCodes.has(data.code)) failures.push(`Duplicate project code ${data.code}: ${projectCodes.get(data.code)} and ${file}.`);
  if (projectSlugs.has(data.slug)) failures.push(`Duplicate project slug ${data.slug}: ${projectSlugs.get(data.slug)} and ${file}.`);
  projectCodes.set(data.code, file);
  projectSlugs.set(data.slug, file);

  if (ledgerProjects[data.code] !== data.slug) failures.push(`${file}: ledger must map ${data.code} to ${data.slug}.`);
  if (!Array.isArray(data.tags) || data.tags.length < 1 || data.tags.length > 5) failures.push(`${file}: projects require 1–5 topic tags.`);
  if (!hex.test(data.accent?.light ?? '') || !hex.test(data.accent?.dark ?? '')) failures.push(`${file}: light/dark accents must be six-digit hex colors.`);
  if (!data.preview?.tier || !data.preview?.type) failures.push(`${file}: preview tier and type are required.`);
  if (data.visibility === 'listed' && !data.unavailable && (!data.liveUrl || !url.test(data.liveUrl))) failures.push(`${file}: listed project requires an HTTPS liveUrl or unavailable: true.`);
  if (data.actions?.source && !data.repo) failures.push(`${file}: source action requires repo.`);
}

for (const [code, slug] of Object.entries(ledgerProjects)) {
  if (slug === '__retired__') continue;
  if (!projectCodes.has(code)) failures.push(`Ledger project ${code} → ${slug} has no project file.`);
}
for (const code of retired ?? []) {
  if (ledgerProjects[code] !== '__retired__') failures.push(`Retired code ${code} must map to __retired__.`);
}

const collectionCodes = new Map();
const collectionSlugs = new Map();
for (const { file, fileSlug, data } of collectionFiles) {
  if (data.schemaVersion !== 1) failures.push(`${file}: schemaVersion must be 1.`);
  if (data.slug !== fileSlug) failures.push(`${file}: slug ${data.slug} must match file name ${fileSlug}.`);
  if (collectionCodes.has(data.code)) failures.push(`Duplicate collection code ${data.code}.`);
  if (collectionSlugs.has(data.slug)) failures.push(`Duplicate collection slug ${data.slug}.`);
  collectionCodes.set(data.code, file);
  collectionSlugs.set(data.slug, file);
  if (ledgerCollections[data.code] !== data.slug) failures.push(`${file}: collection ledger must map ${data.code} to ${data.slug}.`);
  if (!Array.isArray(data.projects) || data.projects.length < 2) failures.push(`${file}: collection requires at least two projects.`);
  for (const slug of data.projects ?? []) if (!projectSlugs.has(slug)) failures.push(`${file}: unknown project ${slug}.`);
  for (const slug of data.anchors ?? []) if (!data.projects.includes(slug)) failures.push(`${file}: anchor ${slug} is not a collection member.`);
  for (const relation of data.relationships ?? []) {
    if (!data.projects.includes(relation.from) || !data.projects.includes(relation.to)) failures.push(`${file}: relation ${relation.from} → ${relation.to} must stay inside the collection.`);
  }
}
for (const [code, slug] of Object.entries(ledgerCollections)) {
  if (!collectionCodes.has(code)) failures.push(`Ledger collection ${code} → ${slug} has no collection file.`);
}

const publicSlugs = new Set(projects.filter((project) => project.visibility === 'listed').map((project) => project.slug));
const registeredSlugs = new Set(projects.map((project) => project.slug));
const featured = curation.featured ?? [];
const order = curation.archiveOrder ?? [];
if (new Set(featured).size !== featured.length) failures.push('Featured curation contains duplicate slugs.');
if (new Set(order).size !== order.length) failures.push('Archive curation contains duplicate slugs.');
for (const slug of featured) {
  if (!publicSlugs.has(slug)) failures.push(`Featured project ${slug} must be listed.`);
  const project = projects.find((entry) => entry.slug === slug);
  if (project && Number(project.preview.tier.slice(1)) < 3) failures.push(`Featured project ${slug} must have preview tier P3 or higher.`);
}
for (const slug of order) if (!publicSlugs.has(slug)) failures.push(`Archive order contains non-listed project ${slug}.`);
for (const slug of publicSlugs) if (!order.includes(slug)) failures.push(`Listed project ${slug} is missing from curated archive order.`);
if (order.length !== publicSlugs.size) failures.push('Curated archive order must contain every listed project exactly once.');

for (const project of projects) {
  for (const collection of project.collections ?? []) if (!collectionSlugs.has(collection)) failures.push(`${project.slug}: unknown collection ${collection}.`);
  for (const collectionSlug of project.collections ?? []) {
    const collection = collectionFiles.find((entry) => entry.data.slug === collectionSlug)?.data;
    if (collection && !collection.projects.includes(project.slug)) failures.push(`${project.slug}: project declares ${collectionSlug}, but collection does not include it.`);
  }
}

for (const [slug, related] of Object.entries(relations)) {
  if (!registeredSlugs.has(slug)) failures.push(`Relation source ${slug} is not registered.`);
  for (const target of related) if (!registeredSlugs.has(target)) failures.push(`Relation ${slug} → ${target} targets an unknown project.`);
}

const stats = computeStats(projects);
if (stats.totalRegistered !== 20) warnings.push(`Expected initial registered count 20; found ${stats.totalRegistered}.`);
if (stats.totalListed !== 19) warnings.push(`Expected initial listed count 19; found ${stats.totalListed}.`);

if (failures.length) {
  console.error('Catalogue validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Catalogue validation passed: ${stats.totalRegistered} registered / ${stats.totalListed} listed.`);
console.log(`Statuses: ${stats.status.live} live / ${stats.status.beta} beta / ${stats.status.experiment} experiment / ${stats.status.archived} archived.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);
