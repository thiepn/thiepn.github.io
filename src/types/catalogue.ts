import type {
  CapabilityTag,
  CollectionType,
  Control,
  Platform,
  PreviewTier,
  PreviewType,
  ProjectCategory,
  ProjectStatus,
  ProjectType,
  ProjectVisibility,
  TopicTag,
} from '../data/taxonomy';

export interface CatalogueProject {
  code: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  type: ProjectType;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  summary: string;
  repo?: string | null;
  liveUrl?: string | null;
  previewRoute?: string;
  unavailable?: boolean;
  yearAdded: number;
  tags: readonly TopicTag[];
  capabilityTags?: readonly CapabilityTag[];
  platforms?: readonly Platform[];
  controls?: readonly Control[];
  collections?: readonly string[];
  accent: { light: string; dark: string };
  capabilities?: readonly { title: string; description: string; previewState?: string }[];
  gallery?: readonly { label: string; caption: string; variant: string }[];
  preview: {
    tier: PreviewTier;
    type: PreviewType;
    component?: string;
    poster?: string;
    source?: string;
  };
}

export interface CatalogueCollection {
  code: string;
  slug: string;
  title: string;
  summary: string;
  editorialNote?: string;
  keywords?: readonly string[];
  type: CollectionType;
  projects: readonly string[];
  anchors?: readonly string[];
  relationships?: readonly { from: string; to: string; label: string; note?: string }[];
}

export interface CatalogueStats {
  totalRegistered: number;
  totalListed: number;
  status: Record<ProjectStatus, number>;
  categories: Record<ProjectCategory, number>;
}
