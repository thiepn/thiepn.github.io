/**
 * PKM Phase P39: Publication Storage & Persistence Service
 * Safely persists publication configs locally, integrates with backups, and provides CRUD operations.
 */

import { Publication, PublicationSource } from './publishingTypes';

const STORAGE_KEY = 'keepnotes_publications_v1';

export class PublicationStorageService {
  private inMemoryCache: Publication[] | null = null;

  /**
   * Retrieves all saved publications from local storage
   */
  public getPublications(): Publication[] {
    if (this.inMemoryCache !== null) {
      return [...this.inMemoryCache];
    }

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.inMemoryCache = [];
        return [];
      }
      const parsed: Publication[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.inMemoryCache = parsed;
        return [...parsed];
      }
    } catch (err) {
      console.error('Failed to load publications from storage:', err);
    }
    this.inMemoryCache = [];
    return [];
  }

  /**
   * Retrieves a single publication by ID
   */
  public getPublication(id: string): Publication | undefined {
    const list = this.getPublications();
    return list.find((p) => p.id === id);
  }

  /**
   * Creates or updates a publication
   */
  public savePublication(pub: Publication): Publication {
    const list = this.getPublications();
    const now = new Date().toISOString();
    const updated: Publication = {
      ...pub,
      updatedAt: now,
      createdAt: pub.createdAt || now,
    };

    const index = list.findIndex((p) => p.id === pub.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }

    this.persist(list);
    return updated;
  }

  /**
   * Deletes a publication by ID
   */
  public deletePublication(id: string): boolean {
    const list = this.getPublications();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.persist(filtered);
      return true;
    }
    return false;
  }

  /**
   * Duplicates an existing publication with a new ID
   */
  public duplicatePublication(id: string): Publication | undefined {
    const source = this.getPublication(id);
    if (!source) return undefined;

    const newId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const copy: Publication = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      lastBuiltAt: undefined,
      lastBuildSummary: undefined,
    };

    return this.savePublication(copy);
  }

  /**
   * Factory method to create a clean, default publication config
   */
  public createDefaultPublication(
    name = 'My Digital Garden',
    source?: Partial<PublicationSource>
  ): Publication {
    const id = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    return {
      id,
      name,
      description: 'Static website exported from PKM notes',
      source: {
        type: 'all-notes',
        includeLinkedNotes: 'never',
        excludeDrafts: true,
        excludeTags: ['private', 'confidential', 'secret'],
        excludeDailyNotes: true,
        excludeTemplates: true,
        excludeArchived: true,
        ...source,
      },
      output: {
        format: 'static-site',
        theme: 'auto',
        basePath: '/',
        siteTitle: name,
        siteDescription: 'Personal knowledge base & digital garden',
        author: '',
        language: 'en',
        noindex: false,
      },
      options: {
        includeBacklinks: true,
        includeStaticSearch: true,
        includeTableOfContents: true,
        includeBibliography: true,
        propertyAllowlist: ['author', 'date', 'tags', 'aliases'],
        stripImageMetadata: true,
        packageMedia: true,
        enableSitemap: true,
        enableRss: false,
        strictMode: false,
        hidePrivateTags: true,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Persists list to localStorage
   */
  private persist(list: Publication[]): void {
    this.inMemoryCache = list;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.error('Failed to save publications to storage:', err);
    }
  }

  /**
   * Clears in-memory cache (for testing or reset)
   */
  public resetCache(): void {
    this.inMemoryCache = null;
  }
}

export const publicationStorage = new PublicationStorageService();
