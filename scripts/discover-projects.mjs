import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, parseArgs, readProjects, writeJson } from './lib/catalogue-files.mjs';
import { listUserRepos, normalizeRepository } from './lib/github-api.mjs';

const args = parseArgs();
const owner = String(args.owner || 'thiepn');
let fixture = null;
if (args.fixture) fixture = JSON.parse(await fs.readFile(path.resolve(String(args.fixture)), 'utf8'));
const projects = await readProjects();
const indexedRepos = new Map(projects.filter(({ data }) => data.repo).map(({ data }) => [data.repo.toLowerCase(), data.slug]));
const repositories = await listUserRepos(owner, { fixture });
const hubRepo = `${owner}/${owner}.github.io`.toLowerCase();

const records = repositories
  .map(normalizeRepository)
  .filter((repo) => repo.repo.toLowerCase() !== hubRepo)
  .map((repo) => {
    const topics = repo.topics.map((topic) => topic.toLowerCase());
    const indexedSlug = indexedRepos.get(repo.repo.toLowerCase()) ?? null;
    const state = indexedSlug
      ? 'indexed'
      : topics.includes('thiepn-hub-ignore')
        ? 'ignored'
        : topics.includes('thiepn-hub')
          ? 'candidate'
          : 'unindexed';
    return { ...repo, indexedSlug, state };
  });

const payload = {
  schemaVersion: 1,
  owner,
  fetchedAt: new Date().toISOString(),
  repositories: records,
};
await writeJson(path.join(PATHS.generated, 'github-discovery.json'), payload);

const counts = Object.groupBy ? Object.groupBy(records, (item) => item.state) : records.reduce((acc, item) => ((acc[item.state] ||= []).push(item), acc), {});
console.log(`GitHub discovery: ${records.length} repositories.`);
for (const state of ['candidate', 'unindexed', 'indexed', 'ignored']) console.log(`${state.padEnd(9)} ${(counts[state] ?? []).length}`);
const discoveries = records.filter((item) => item.state === 'candidate' || item.state === 'unindexed');
if (discoveries.length) {
  console.log('\nUnindexed repositories (never auto-published):');
  discoveries.forEach((item) => console.log(`- ${item.repo}${item.state === 'candidate' ? ' [thiepn-hub]' : ''}`));
}
