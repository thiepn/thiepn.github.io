import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {
  CAPABILITY_TAGS,
  COLLECTION_TYPES,
  CONTROLS,
  PLATFORMS,
  PREVIEW_TIERS,
  PREVIEW_TYPES,
  PREVIEW_PROVENANCE,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_VISIBILITIES,
  TOPIC_TAGS,
} from './data/taxonomy';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    schemaVersion: z.literal(1),
    code: z.string().regex(/^[TLGRVX]-\d{3,}$/),
    slug,
    title: z.string().min(1),
    subtitle: z.string().min(2),
    aliases: z.array(z.string()).default([]),
    category: z.enum(PROJECT_CATEGORIES),
    type: z.enum(PROJECT_TYPES),
    status: z.enum(PROJECT_STATUSES),
    visibility: z.enum(PROJECT_VISIBILITIES),
    summary: z.string().min(20).max(240),
    repo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).nullable().optional(),
    liveUrl: z.string().url().nullable().optional(),
    previewRoute: z.string().min(1).optional(),
    unavailable: z.boolean().default(false),
    dateAdded: z.coerce.date(),
    yearAdded: z.number().int().min(2020).max(2100),
    lastMajorUpdate: z.coerce.date().optional(),
    platforms: z.array(z.enum(PLATFORMS)).default([]),
    controls: z.array(z.enum(CONTROLS)).default([]),
    capabilityTags: z.array(z.enum(CAPABILITY_TAGS)).default([]),
    tags: z.array(z.enum(TOPIC_TAGS)).min(1).max(5),
    collections: z.array(slug).default([]),
    accent: z.object({
      light: hexColor,
      dark: hexColor,
    }),
    preview: z.object({
      tier: z.enum(PREVIEW_TIERS),
      type: z.enum(PREVIEW_TYPES),
      provenance: z.enum(PREVIEW_PROVENANCE).optional(),
      component: z.string().optional(),
      poster: z.string().optional(),
      source: z.string().optional(),
      duration: z.number().int().positive().optional(),
      focalPoint: z.string().optional(),
    }),
    showcase: z.object({
      purpose: z.string().min(40).max(600).optional(),
      release: z.string().min(1).max(40).optional(),
      stack: z.array(z.string().min(2).max(40)).max(8).default([]),
      highlights: z.array(z.object({
        value: z.string().min(1).max(24),
        label: z.string().min(2).max(60),
        note: z.string().min(10).max(160).optional(),
      })).max(4).default([]),
    }).optional(),
    actions: z.object({
      primaryLabel: z.string().min(2),
      source: z.boolean().default(true),
    }),
    capabilities: z.array(z.object({
      title: z.string().min(2).max(80),
      description: z.string().min(20).max(220),
      previewState: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    })).min(3).max(8),
    gallery: z.array(z.object({
      label: z.string().min(2).max(60),
      caption: z.string().min(12).max(180),
      variant: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      source: z.string().optional(),
    })).min(2).max(5).optional(),
  }),
});

const projectCollections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collections' }),
  schema: z.object({
    schemaVersion: z.literal(1),
    code: z.string().regex(/^C-\d{3,}$/),
    slug,
    title: z.string().min(2),
    summary: z.string().min(20).max(240),
    editorialNote: z.string().min(40).max(520),
    keywords: z.array(z.string().min(2).max(48)).min(2).max(10),
    type: z.enum(COLLECTION_TYPES),
    projects: z.array(slug).min(2),
    anchors: z.array(slug).default([]),
    relationships: z.array(z.object({
      from: slug,
      to: slug,
      label: z.string().min(2).max(80),
      note: z.string().min(20).max(240),
    })).default([]),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: z.object({
    schemaVersion: z.literal(1),
    slug,
    type: z.literal('book'),
    title: z.string().min(2),
    subtitle: z.string().min(2),
    summary: z.string().min(20).max(300),
    status: z.literal('published'),
    version: z.string().min(1),
    editionLabel: z.string().min(2),
    firstPublished: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    libraryUrl: z.string().url(),
    coverUrl: z.string().url(),
    formats: z.array(z.enum(['web', 'pdf', 'epub'])).min(1),
    subjects: z.array(z.string().min(2)).min(1).max(6),
  }),
});

export const collections = { projects, collections: projectCollections, books };
