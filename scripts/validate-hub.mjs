import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readFrontmatterDirectory } from './lib/catalogue-files.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const hub = JSON.parse(await readFile(resolve(root, 'src/data/hub.json'), 'utf8'));
const projectFiles = await readFrontmatterDirectory(resolve(root, 'src/content/projects'));
const projects = new Map(projectFiles.map(({ data }) => [data.slug, data]));
const failures = [];

const EXPECTED_COUNT = 26;
const EXPECTED_CATEGORIES = ['tools', 'create', 'learn', 'faith', 'explore', 'games'];
const EXPECTED_CATEGORY_COUNTS = {
  tools: 4,
  create: 4,
  learn: 6,
  faith: 3,
  explore: 2,
  games: 7,
};
const EXPECTED_EXCLUDED = ['pflegelern', 'wordfall', 'curio', 'nebula-foundry'];
const EXPECTED_ORDER = [
  'notes',
  'canvas',
  'tiny-tools',
  'thiepn-library',
  'atelier',
  'manuscript',
  'pdf-studio',
  'signal-earth',
  'steadybar',
  'wordstrike',
  'mathlab',
  'the-bible-challenge',
  'duel',
  'biblical-greek',
  'tms60',
  'unreached',
  'clean30',
  'markdown-guide',
  'gomoku',
  'artikelwerk',
  'le-carnet-francais',
  'french-3000',
  'micro-arcade',
  'voidcut',
  'impossible-transit',
  'skyspire',
];
const ALLOWED_BADGES = new Set(['beta', 'rc', 'new']);
const HTTPS = /^https:\/\//;

if (hub.schemaVersion !== 1) failures.push('Hub schemaVersion must be 1.');
if (hub.expectedCount !== EXPECTED_COUNT) failures.push(`Hub expectedCount must remain ${EXPECTED_COUNT}.`);
if (!Array.isArray(hub.projects) || hub.projects.length !== EXPECTED_COUNT) failures.push(`Hub must contain exactly ${EXPECTED_COUNT} apps.`);

const categoryIds = (hub.categories ?? []).map((category) => category.id);
if (JSON.stringify(categoryIds) !== JSON.stringify(EXPECTED_CATEGORIES)) {
  failures.push(`Hub categories must remain ${EXPECTED_CATEGORIES.join(', ')} in that order.`);
}

const excluded = [...(hub.excluded ?? [])].sort();
const expectedExcluded = [...EXPECTED_EXCLUDED].sort();
if (JSON.stringify(excluded) !== JSON.stringify(expectedExcluded)) {
  failures.push(`Hub exclusions must remain exactly: ${EXPECTED_EXCLUDED.join(', ')}.`);
}

const slugs = new Set();
const orders = new Set();
const categoryCounts = Object.fromEntries(EXPECTED_CATEGORIES.map((category) => [category, 0]));

for (const entry of hub.projects ?? []) {
  if (!entry?.slug) {
    failures.push('Every Hub entry requires a slug.');
    continue;
  }
  if (slugs.has(entry.slug)) failures.push(`Duplicate Hub slug: ${entry.slug}.`);
  slugs.add(entry.slug);

  if (!Number.isInteger(entry.order) || entry.order < 1 || entry.order > EXPECTED_COUNT) failures.push(`${entry.slug}: Hub order must be an integer from 1 to ${EXPECTED_COUNT}.`);
  if (orders.has(entry.order)) failures.push(`Duplicate Hub order: ${entry.order}.`);
  orders.add(entry.order);

  if (!EXPECTED_CATEGORIES.includes(entry.category)) failures.push(`${entry.slug}: unknown Hub category ${entry.category}.`);
  else categoryCounts[entry.category] += 1;

  if (typeof entry.description !== 'string' || entry.description.trim().length < 20 || entry.description.trim().length > 180) {
    failures.push(`${entry.slug}: Hub description must be 20–180 characters.`);
  }
  if (entry.badge !== null && entry.badge !== undefined && !ALLOWED_BADGES.has(entry.badge)) failures.push(`${entry.slug}: unsupported Hub badge ${entry.badge}.`);

  const project = projects.get(entry.slug);
  if (!project) {
    failures.push(`${entry.slug}: Hub entry has no project catalogue record.`);
    continue;
  }
  if (project.visibility !== 'listed') failures.push(`${entry.slug}: Hub apps must be listed in the public project catalogue.`);
  if (project.unavailable) failures.push(`${entry.slug}: Hub apps cannot be marked unavailable.`);
  if (!project.liveUrl || !HTTPS.test(project.liveUrl)) failures.push(`${entry.slug}: Hub apps require an HTTPS liveUrl.`);
  if (!project.preview?.tier || !project.preview?.type) failures.push(`${entry.slug}: Hub apps require preview metadata.`);
}

for (let order = 1; order <= EXPECTED_COUNT; order += 1) {
  if (!orders.has(order)) failures.push(`Hub order is not contiguous; missing position ${order}.`);
}

const actualOrder = [...(hub.projects ?? [])].sort((a, b) => a.order - b.order).map((entry) => entry.slug);
if (JSON.stringify(actualOrder) !== JSON.stringify(EXPECTED_ORDER)) failures.push('Hub app membership or canonical ordering changed unexpectedly.');

for (const slug of EXPECTED_EXCLUDED) {
  if (slugs.has(slug)) failures.push(`${slug}: explicitly excluded app cannot appear in the Hub.`);
  if (!projects.has(slug)) failures.push(`${slug}: excluded app should remain registered in the historical project catalogue.`);
}

for (const category of EXPECTED_CATEGORIES) {
  if (categoryCounts[category] !== EXPECTED_CATEGORY_COUNTS[category]) {
    failures.push(`${category}: expected ${EXPECTED_CATEGORY_COUNTS[category]} Hub apps, found ${categoryCounts[category]}.`);
  }
  if (hub.expectedCategoryCounts?.[category] !== EXPECTED_CATEGORY_COUNTS[category]) {
    failures.push(`${category}: expectedCategoryCounts must remain ${EXPECTED_CATEGORY_COUNTS[category]}.`);
  }
}

if (failures.length) {
  console.error('Hub validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Hub validation passed: ${EXPECTED_COUNT} apps across ${EXPECTED_CATEGORIES.length} categories.`);
console.log(`Categories: ${EXPECTED_CATEGORIES.map((category) => `${category} ${categoryCounts[category]}`).join(' / ')}.`);
