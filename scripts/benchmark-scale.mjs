import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import budgets from '../performance-budgets.json' with { type: 'json' };
import { searchCatalogue } from '../src/lib/search-core.ts';

const fixture = JSON.parse(await fs.readFile(new URL('../tests/fixtures/catalogue-250.json', import.meta.url), 'utf8'));
if (!Array.isArray(fixture) || fixture.length !== budgets.scaleFixtureProjects) {
  throw new Error(`Expected ${budgets.scaleFixtureProjects} fixture projects, found ${fixture?.length ?? 'invalid'}.`);
}

const queries = ['fixture', 'project 199', 'learning', 'game', 'productivity', 'fixture 250', 'projct 042', 'tools'];
const iterations = 160;
const samples = [];

// Warm JIT/cache paths before collecting timings.
for (const query of queries) searchCatalogue(fixture, query, 20);

for (let round = 0; round < iterations; round += 1) {
  for (const query of queries) {
    const start = performance.now();
    searchCatalogue(fixture, query, 20);
    samples.push(performance.now() - start);
  }
}

samples.sort((a, b) => a - b);
const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * .95))];

const archiveSamples = [];
for (let round = 0; round < 1000; round += 1) {
  const start = performance.now();
  const category = round % 2 ? 'learning' : 'games';
  [...fixture]
    .filter((project) => project.category === category)
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '') || a.title.localeCompare(b.title));
  archiveSamples.push(performance.now() - start);
}
archiveSamples.sort((a, b) => a - b);
const archiveP95 = archiveSamples[Math.min(archiveSamples.length - 1, Math.floor(archiveSamples.length * .95))];

console.log(`Scale benchmark / ${fixture.length} artifacts`);
console.log(`Search average: ${average.toFixed(3)} ms`);
console.log(`Search p95:     ${p95.toFixed(3)} ms`);
console.log(`Archive p95:    ${archiveP95.toFixed(3)} ms`);

if (average > budgets.searchAverageMs) throw new Error(`Search average ${average.toFixed(2)}ms exceeds ${budgets.searchAverageMs}ms.`);
if (p95 > budgets.searchP95Ms) throw new Error(`Search p95 ${p95.toFixed(2)}ms exceeds ${budgets.searchP95Ms}ms.`);
if (archiveP95 > budgets.archiveInteractionP95Ms) throw new Error(`Archive p95 ${archiveP95.toFixed(2)}ms exceeds ${budgets.archiveInteractionP95Ms}ms.`);
