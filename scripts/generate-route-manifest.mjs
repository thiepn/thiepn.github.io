import path from 'node:path';
import { PATHS, collectionRoute, parseArgs, projectRoute, publicProjects, readCollections, readProjects, writeJson } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = publicProjects(await readProjects());
const collections = await readCollections();
const routes = [
  '/', '/books/', '/projects/', '/collections/',
  ...projects.map(projectRoute),
  ...collections.map(collectionRoute),
  '/catalogue.json',
].sort((a, b) => a.localeCompare(b));
const payload = { schemaVersion: 1, routes };
await writeJson(path.join(PATHS.generated, 'route-manifest.json'), payload, { check: Boolean(args.check) });
console.log(`Route manifest: ${routes.length} public routes.`);
