import path from 'node:path';
import { PATHS, collectionRoute, normalizeDate, parseArgs, projectRoute, publicProjects, readCollections, readProjects, writeJson } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = publicProjects(await readProjects());
const collections = await readCollections();
const payload = {
  schemaVersion: 1,
  identity: 'THIEPN PROJECTS',
  projects: projects.map((project) => ({
    code: project.data.code,
    slug: project.data.slug,
    title: project.data.title,
    subtitle: project.data.subtitle,
    summary: project.data.summary,
    category: project.data.category,
    type: project.data.type,
    status: project.data.status,
    route: projectRoute(project),
    liveUrl: project.data.liveUrl ?? null,
    repo: project.data.repo ?? null,
    tags: project.data.tags ?? [],
    capabilityTags: project.data.capabilityTags ?? [],
    platforms: project.data.platforms ?? [],
    collections: project.data.collections ?? [],
    previewTier: project.data.preview.tier,
    previewType: project.data.preview.type,
    previewProvenance: project.data.preview.provenance ?? null,
    updatedAt: normalizeDate(project.data.dateUpdated ?? project.data.lastMajorUpdate ?? project.data.dateAdded),
  })),
  collections: collections.map((collection) => ({
    code: collection.data.code,
    slug: collection.data.slug,
    title: collection.data.title,
    summary: collection.data.summary,
    route: collectionRoute(collection),
    projects: collection.data.projects,
  })),
};
await writeJson(path.join(PATHS.generated, 'catalogue-public.json'), payload, { check: Boolean(args.check) });
console.log(`Public project data: ${payload.projects.length} projects / ${payload.collections.length} collections.`);
