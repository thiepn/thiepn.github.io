import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, parseArgs, readProjects, writeJson } from './lib/catalogue-files.mjs';
import { getRepository, normalizeRepository } from './lib/github-api.mjs';

const args = parseArgs();
const projects = (await readProjects()).filter(({ data }) => Boolean(data.repo));
const destination = path.join(PATHS.generated, 'github.json');
let previous = { schemaVersion: 1, fetchedAt: null, projects: {} };
try { previous = JSON.parse(await fs.readFile(destination, 'utf8')); } catch {}
let fixtures = {};
if (args.fixture) fixtures = JSON.parse(await fs.readFile(path.resolve(String(args.fixture)), 'utf8'));

async function syncProject({ data }) {
  const fixtureRepo = fixtures[data.repo];
  try {
    if (args.offline && !fixtureRepo) throw new Error('offline mode');
    let repo;
    try { repo = await getRepository(data.repo, { fixture: fixtureRepo }); }
    catch (primaryError) {
      if ((process.env.GITHUB_TOKEN || process.env.GH_TOKEN) && !fixtureRepo) repo = await getRepository(data.repo, { token: null });
      else throw primaryError;
    }
    return [data.slug, { ...normalizeRepository(repo), stale: false, error: null }, true];
  } catch (error) {
    const cached = previous.projects?.[data.slug];
    if (cached) return [data.slug, { ...cached, stale: true, error: String(error?.message ?? error) }, false];
    return [data.slug, {
      repo: data.repo, exists: null, archived: null, disabled: null, private: null, defaultBranch: null,
      language: null, pushedAt: null, updatedAt: null, createdAt: null, homepage: null, hasPages: null,
      topics: [], sizeKb: null, stars: null, visibility: null, stale: true, error: String(error?.message ?? error),
    }, false];
  }
}

const results = {};
let fresh = 0;
let stale = 0;
const concurrency = Math.max(1, Math.min(8, Number(args.concurrency || 5)));
for (let index = 0; index < projects.length; index += concurrency) {
  const batch = await Promise.all(projects.slice(index, index + concurrency).map(syncProject));
  for (const [slug, record, isFresh] of batch) {
    results[slug] = record;
    if (isFresh) fresh += 1; else stale += 1;
  }
}

await writeJson(destination, { schemaVersion: 1, fetchedAt: new Date().toISOString(), projects: results });
console.log(`GitHub metadata: ${fresh} fresh / ${stale} cached-or-unavailable (${concurrency} concurrent).`);
