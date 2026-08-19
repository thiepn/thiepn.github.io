import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SCRIPT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
export const ROOT = process.env.THIEPN_INDEX_ROOT
  ? path.resolve(process.env.THIEPN_INDEX_ROOT)
  : SCRIPT_ROOT;

export const PATHS = Object.freeze({
  projects: path.join(ROOT, 'src/content/projects'),
  collections: path.join(ROOT, 'src/content/collections'),
  ledger: path.join(ROOT, 'src/data/catalogue-ledger.json'),
  curation: path.join(ROOT, 'src/data/curation.json'),
  relations: path.join(ROOT, 'src/data/project-relations.json'),
  generated: path.join(ROOT, 'src/generated'),
  public: path.join(ROOT, 'public'),
  og: path.join(ROOT, 'public/og'),
});

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/;

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function writeJson(file, value, { check = false } = {}) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  let current = null;
  try { current = await fs.readFile(file, 'utf8'); } catch {}
  if (current === next) return { changed: false, file };
  if (check) throw new Error(`Generated file is stale: ${path.relative(ROOT, file)}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next, 'utf8');
  return { changed: true, file };
}

export async function writeText(file, value, { check = false } = {}) {
  let current = null;
  try { current = await fs.readFile(file, 'utf8'); } catch {}
  if (current === value) return { changed: false, file };
  if (check) throw new Error(`Generated file is stale: ${path.relative(ROOT, file)}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, 'utf8');
  return { changed: true, file };
}

export function parseMarkdown(raw, file = '<memory>') {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) throw new Error(`Missing YAML frontmatter in ${file}`);
  const data = YAML.parse(match[1]) ?? {};
  return { data, body: (match[2] ?? '').trim() };
}

export function serializeMarkdown(data, body = '') {
  const yaml = YAML.stringify(data, { lineWidth: 110 }).trimEnd();
  const normalizedBody = body.trim();
  return `---\n${yaml}\n---\n${normalizedBody ? `\n${normalizedBody}\n` : ''}`;
}

async function readMarkdownDirectory(directory) {
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.md')).sort();
  return Promise.all(files.map(async (name) => {
    const file = path.join(directory, name);
    const raw = await fs.readFile(file, 'utf8');
    const parsed = parseMarkdown(raw, file);
    return { ...parsed, file, filename: name };
  }));
}

export async function readProjects() {
  return readMarkdownDirectory(PATHS.projects);
}

export async function readCollections() {
  return readMarkdownDirectory(PATHS.collections);
}

export function publicProjects(projects) {
  return projects.filter(({ data }) => data.visibility === 'listed');
}

export function projectRoute(project) {
  return `/project/${project.data.slug}/`;
}

export function collectionRoute(collection) {
  return `/collection/${collection.data.slug}/`;
}

export function normalizeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export const CATEGORY_PREFIX = Object.freeze({
  tools: 'T',
  learning: 'L',
  games: 'G',
  resources: 'R',
  visualizations: 'V',
  experiments: 'X',
});

export const DEFAULT_TYPE = Object.freeze({
  tools: 'tool',
  learning: 'study-system',
  games: 'game',
  resources: 'resource',
  visualizations: 'visualization',
  experiments: 'prototype',
});

export const DEFAULT_TAG = Object.freeze({
  tools: 'productivity',
  learning: 'study',
  games: 'game',
  resources: 'reference',
  visualizations: 'mathematics',
  experiments: 'strategy',
});

export function nextCode(prefix, ledger) {
  const used = Object.keys(ledger.projects ?? {})
    .filter((code) => code.startsWith(`${prefix}-`))
    .map((code) => Number(code.split('-')[1]))
    .filter(Number.isFinite);
  const next = used.length ? Math.max(...used) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const [rawKey, inline] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inline !== undefined) {
      out[key] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}


export async function readTaxonomyArray(name) {
  const file = path.join(ROOT, 'src/data/taxonomy.ts');
  const raw = await fs.readFile(file, 'utf8');
  const match = raw.match(new RegExp(String.raw`export const ${name} = \[([\s\S]*?)\] as const;`));
  if (!match) throw new Error(`Could not read taxonomy constant ${name}.`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

// Compatibility helpers used by the existing validation layer.
export async function readFrontmatterDirectory(directory) {
  const entries = await readMarkdownDirectory(directory);
  return entries.map((entry) => ({
    file: entry.file,
    fileSlug: path.basename(entry.filename, '.md'),
    data: entry.data,
    body: entry.body,
  }));
}

export function computeStats(projects) {
  const listed = projects.filter((project) => project.visibility === 'listed');
  const countBy = (items, key, values) => Object.fromEntries(values.map((value) => [value, items.filter((item) => item[key] === value).length]));
  return {
    totalRegistered: projects.length,
    totalListed: listed.length,
    status: countBy(listed, 'status', ['live', 'beta', 'experiment', 'archived']),
    categories: countBy(listed, 'category', ['tools', 'learning', 'games', 'resources', 'visualizations', 'experiments']),
  };
}
