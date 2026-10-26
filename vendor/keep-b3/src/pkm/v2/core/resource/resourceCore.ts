/**
 * Resource Core definitions for PKM V2.0
 * Provides a unified contract for both Markdown notes and structured resources
 * without converting notes into generic database rows or losing Markdown-first portability.
 */

export type ResourceType =
  | 'note'
  | 'task'
  | 'folder'
  | 'tag'
  | 'project'
  | 'area'
  | 'goal'
  | 'person'
  | 'organization'
  | 'habit'
  | 'routine'
  | 'course'
  | 'study_deck'
  | 'book'
  | 'highlight'
  | 'transaction'
  | 'account'
  | 'health_metric'
  | 'workout'
  | 'itinerary'
  | 'reservation'
  | 'asset'
  | 'maintenance_record'
  | 'decision'
  | 'prediction'
  | 'pdf_document'
  | 'canvas'
  | 'saved_view'
  | 'collection'
  | 'dashboard';

export interface ResourceCore {
  id: string;
  type: ResourceType;
  title: string;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  trashed?: boolean;
  tags?: string[];
  pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface ResourceRef {
  id: string;
  type: ResourceType | string;
  title: string;
  subtitle?: string;
}

export interface ResourceCapabilities {
  searchable: boolean;
  linkable: boolean;
  relatable: boolean;
  taggable: boolean;
  calendarAware: boolean;
  publishable: boolean;
  exportable: boolean;
  contextual: boolean;
  supportsMarkdownBody: boolean;
  isStructured: boolean;
  customFields?: boolean;
  archivable?: boolean;
}

export function validateResourceCore(res: Partial<ResourceCore>): boolean {
  if (!res.id || typeof res.id !== 'string') return false;
  if (!res.type || typeof res.type !== 'string') return false;
  if (typeof res.createdAt !== 'number' || res.createdAt <= 0) return false;
  if (typeof res.updatedAt !== 'number' || res.updatedAt <= 0) return false;
  return true;
}

export function createResourceEnvelope<T extends Record<string, any>>(
  type: ResourceType,
  title: string,
  data: T,
  id?: string
): ResourceCore & { data: T } {
  const now = Date.now();
  return {
    id: id || crypto.randomUUID(),
    type,
    title: title || 'Untitled',
    createdAt: now,
    updatedAt: now,
    archived: false,
    trashed: false,
    tags: [],
    metadata: {},
    data,
  };
}
