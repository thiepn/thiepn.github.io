import path from 'node:path';
import { PATHS, computeStats, parseArgs, readProjects, writeJson } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = (await readProjects()).map((entry) => entry.data);
const stats = computeStats(projects);
await writeJson(path.join(PATHS.generated, 'catalogue-stats.json'), stats, { check: Boolean(args.check) });
console.log(`Generated catalogue stats: ${stats.totalListed} listed artifacts.`);
