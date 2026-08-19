import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import {
  CATEGORY_PREFIX,
  DEFAULT_TAG,
  DEFAULT_TYPE,
  PATHS,
  SCRIPT_ROOT,
  nextCode,
  parseArgs,
  readJson,
  readTaxonomyArray,
  serializeMarkdown,
  slugify,
  writeJson,
} from './lib/catalogue-files.mjs';

const args = parseArgs();
if (args.help) {
  console.log(`Usage: npm run project:add -- --title "Project" --category games [options]\n\n` +
    `Options:\n` +
    `  --slug <slug>              Stable URL slug (derived from title by default)\n` +
    `  --type <type>              Controlled project type\n` +
    `  --repo owner/name          GitHub repository\n` +
    `  --live https://...         Public destination\n` +
    `  --subtitle <text>          Short descriptor\n` +
    `  --summary <text>           Catalogue summary\n` +
    `  --tag <controlled-tag>     Initial topic tag\n` +
    `  --status <status>          Default: experiment\n` +
    `  --visibility <state>       Default: hold\n` +
    `  --no-refresh               Do not regenerate derived catalogue files\n` +
    `  --yes                      Accept the proposed accession code non-interactively\n` +
    `  --dry-run                  Print proposal without writing`);
  process.exit(0);
}

const title = String(args.title ?? '').trim();
const [projectTypes, projectStatuses, projectVisibilities, topicTags] = await Promise.all([
  readTaxonomyArray('PROJECT_TYPES'), readTaxonomyArray('PROJECT_STATUSES'),
  readTaxonomyArray('PROJECT_VISIBILITIES'), readTaxonomyArray('TOPIC_TAGS'),
]);
const category = String(args.category ?? '').trim();
if (!title) throw new Error('--title is required.');
if (!(category in CATEGORY_PREFIX)) throw new Error(`--category must be one of: ${Object.keys(CATEGORY_PREFIX).join(', ')}`);

const ledger = await readJson(PATHS.ledger);
const curation = await readJson(PATHS.curation);
const slug = slugify(args.slug || title);
if (!slug) throw new Error('Could not derive a valid slug.');
const code = String(args.code || nextCode(CATEGORY_PREFIX[category], ledger));
if (!new RegExp(`^${CATEGORY_PREFIX[category]}-\\d{3,}$`).test(code)) throw new Error(`Code ${code} does not match category ${category}.`);
if (ledger.projects?.[code]) throw new Error(`Catalogue code already exists: ${code}`);
if (Object.values(ledger.projects ?? {}).includes(slug)) throw new Error(`Slug is already registered: ${slug}`);

const visibility = String(args.visibility || 'hold');
const status = String(args.status || 'experiment');
if (!projectVisibilities.includes(visibility)) throw new Error(`--visibility must be one of: ${projectVisibilities.join(', ')}`);
if (!projectStatuses.includes(status)) throw new Error(`--status must be one of: ${projectStatuses.join(', ')}`);
const type = String(args.type || DEFAULT_TYPE[category]);
if (!projectTypes.includes(type)) throw new Error(`--type must be one of: ${projectTypes.join(', ')}`);
const tag = String(args.tag || DEFAULT_TAG[category]);
if (!topicTags.includes(tag)) throw new Error(`--tag must be one of the controlled topic tags: ${topicTags.join(', ')}`);
const liveUrl = args.live ? String(args.live) : null;
if (liveUrl) { const parsed = new URL(liveUrl); if (parsed.protocol !== 'https:') throw new Error('--live must use HTTPS.'); }
const repo = args.repo ? String(args.repo) : null;
if (repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('--repo must use owner/name format.');
if (visibility === 'listed' && !liveUrl) throw new Error('Listed projects require --live. Create a HOLD record first when no working destination exists.');
const today = new Date().toISOString().slice(0, 10);
const data = {
  schemaVersion: 1,
  code,
  slug,
  title,
  subtitle: String(args.subtitle || 'Catalogue candidate'),
  aliases: [],
  category,
  type,
  status,
  visibility,
  summary: String(args.summary || `${title} is a newly indexed artifact awaiting final editorial description and catalogue review.`),
  repo,
  liveUrl,
  unavailable: !liveUrl,
  tags: [tag],
  capabilityTags: [],
  platforms: ['desktop'],
  controls: [],
  collections: [],
  accent: { light: '#5F635D', dark: '#B0B5AC' },
  preview: { tier: 'P1', type: 'auto', provenance: 'static' },
  actions: { primaryLabel: category === 'games' ? 'Play' : category === 'learning' ? 'Start learning' : 'Open artifact', source: Boolean(repo) },
  dateAdded: today,
  yearAdded: Number(today.slice(0, 4)),
  capabilities: [
    { title: 'Primary interaction', description: 'Define the artifact’s primary workflow, interaction, or learning loop before public promotion.' },
    { title: 'Distinctive system', description: 'Document the system or capability that makes this artifact meaningfully different from adjacent projects.' },
    { title: 'Completion state', description: 'Describe the concrete result, progression state, or outcome a visitor should understand from the artifact.' },
  ],
};
const body = `${title} is registered in THE INDEX as a HOLD artifact.\n\nReplace this editorial placeholder before changing visibility to listed.`;
const file = path.join(PATHS.projects, `${slug}.md`);

console.log(`${code}  ${title}`);
console.log(`slug: ${slug}`);
console.log(`visibility: ${visibility}`);
console.log(`file: ${path.relative(process.cwd(), file)}`);
if (args.dryRun) process.exit(0);

if (!args.code && !args.yes) {
  if (!process.stdin.isTTY) throw new Error(`Proposed accession code ${code}. Re-run with --yes to accept it in a non-interactive environment.`);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await prompt.question(`Accept proposed permanent code ${code}? [y/N] `)).trim().toLowerCase();
  prompt.close();
  if (!['y', 'yes'].includes(answer)) { console.log('No files changed.'); process.exit(0); }
}

await fs.mkdir(PATHS.projects, { recursive: true });
await fs.writeFile(file, serializeMarkdown(data, body), { encoding: 'utf8', flag: 'wx' });
ledger.projects[code] = slug;
await writeJson(PATHS.ledger, ledger);

if (visibility === 'listed' && !curation.archiveOrder.includes(slug)) {
  curation.archiveOrder.push(slug);
  await writeJson(PATHS.curation, curation);
}

if (!args.noRefresh) {
  const refresh = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts/refresh-catalogue.mjs')], {
    stdio: 'inherit',
    env: process.env,
  });
  if (refresh.status !== 0) throw new Error('Project was created, but derived catalogue refresh failed.');
}

console.log(`Created ${code} / ${slug}. ${visibility === 'hold' ? 'It remains private to the catalogue until promoted.' : args.noRefresh ? 'It is listed; run npm run catalogue:refresh to update derived outputs.' : 'It is listed and included in generated catalogue outputs.'}`);
