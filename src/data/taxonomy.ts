export const PROJECT_CATEGORIES = [
  'tools',
  'learning',
  'games',
  'resources',
  'visualizations',
  'experiments',
] as const;

export const PROJECT_TYPES = [
  'tool',
  'app',
  'game',
  'study-system',
  'flashcards',
  'quiz',
  'resource',
  'guide',
  'visualization',
  'prototype',
] as const;

export const PROJECT_STATUSES = ['live', 'beta', 'experiment', 'archived'] as const;
export const PROJECT_VISIBILITIES = ['listed', 'hidden', 'hold'] as const;
export const COLLECTION_TYPES = ['persistent', 'curated', 'temporary'] as const;
export const PLATFORMS = ['desktop', 'tablet', 'mobile'] as const;
export const CONTROLS = ['keyboard', 'mouse', 'touch'] as const;
export const CAPABILITY_TAGS = ['local-first', 'offline', 'pwa'] as const;
export const PREVIEW_TIERS = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'] as const;
export const PREVIEW_TYPES = ['auto', 'static', 'synthetic', 'video'] as const;
export const PREVIEW_PROVENANCE = ['static', 'synthetic', 'captured', 'reconstructed'] as const;

export const TOPIC_TAGS = [
  'action',
  'algorithms',
  'analysis',
  'arcade',
  'auction',
  'bible',
  'cleaning',
  'community',
  'computer-science',
  'documents',
  'exam-prep',
  'french',
  'game',
  'grammar',
  'idle',
  'incremental',
  'markdown',
  'mathematics',
  'memorization',
  'platformer',
  'pdf',
  'productivity',
  'quiz',
  'reference',
  'roguelite',
  'routines',
  'strategy',
  'study',
  'typing',
  'vocabulary',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];
export type CollectionType = (typeof COLLECTION_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Control = (typeof CONTROLS)[number];
export type CapabilityTag = (typeof CAPABILITY_TAGS)[number];
export type PreviewTier = (typeof PREVIEW_TIERS)[number];
export type PreviewType = (typeof PREVIEW_TYPES)[number];
export type PreviewProvenance = (typeof PREVIEW_PROVENANCE)[number];
export type TopicTag = (typeof TOPIC_TAGS)[number];
