import path from 'node:path';
import { PATHS, normalizeDate, parseArgs, publicProjects, readCollections, readJson, readProjects, writeJson } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = publicProjects(await readProjects());
const collections = await readCollections();
const curation = await readJson(PATHS.curation);
const collectionTitleBySlug = new Map(collections.map(({ data }) => [data.slug, data.title]));
const projectTitleBySlug = new Map(projects.map(({ data }) => [data.slug, data.title]));

const payload = {
  schemaVersion: 1,
  projects: projects.map(({ data }) => ({
    kind: 'project', code: data.code, slug: data.slug, title: data.title, subtitle: data.subtitle,
    summary: data.summary, aliases: data.aliases ?? [], category: data.category, status: data.status,
    tags: data.tags ?? [], collections: (data.collections ?? []).map((slug) => collectionTitleBySlug.get(slug) ?? slug),
    capabilityTags: data.capabilityTags ?? [], platforms: data.platforms ?? [], repo: data.repo ?? null,
    liveUrl: data.liveUrl ?? null, accentLight: data.accent.light, accentDark: data.accent.dark,
    updatedAt: normalizeDate(data.dateUpdated ?? data.lastMajorUpdate ?? data.dateAdded),
  })),
  collections: collections.map(({ data }) => ({
    kind: 'collection', code: data.code, slug: data.slug, title: data.title, summary: data.summary,
    editorialNote: data.editorialNote, projects: data.projects,
    projectTitles: data.projects.map((slug) => projectTitleBySlug.get(slug) ?? slug),
    keywords: data.keywords ?? [],
    relationshipLabels: (data.relationships ?? []).flatMap((relationship) => [relationship.label, relationship.note]),
  })),
  featured: curation.featured.filter((slug) => projects.some(({ data }) => data.slug === slug)),
};

await writeJson(path.join(PATHS.generated, 'search-index.json'), payload, { check: Boolean(args.check) });
console.log(`Search index: ${payload.projects.length} projects / ${payload.collections.length} collections.`);
