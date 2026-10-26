/**
 * Collection Service for Phase P43
 * 
 * Core business logic, membership evaluation, persistence, filtering, sorting, and CSV export.
 * Note: Collections do NOT store or duplicate note bodies; they project canonical notes.
 */

import { Note, Folder } from '../../types';
import { parseFrontmatterAST, formatDateOnly } from '../properties/frontmatterEngine';
import {
  Collection,
  CollectionPropertyDefinition,
  CollectionView,
  CollectionRecord,
  CollectionHealthReport,
  FilterOperator,
  PropertyValue,
} from './collectionTypes';
import { evaluateAllFormulas } from './formulaEngine';
import { evaluateRollup } from './rollupEngine';
import { relationIndex } from './relationIndex';
import { executeSmartQuery } from '../queryEngine';

const COLLECTIONS_STORAGE_KEY = 'pkm_collections_v1';

export const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'col-projects',
    name: 'Projects & Deliverables',
    description: 'Track ongoing projects, deadlines, budgets, and clients',
    icon: 'FolderKanban',
    source: { type: 'tag', tag: 'project' },
    schema: [
      { id: 'status', name: 'Status', type: 'select', options: ['planning', 'active', 'in_review', 'completed', 'on_hold'] },
      { id: 'priority', name: 'Priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
      { id: 'due', name: 'Due Date', type: 'date' },
      { id: 'client', name: 'Client', type: 'relation', relationConfig: { cardinality: 'single' } },
      { id: 'budget', name: 'Budget ($)', type: 'number' },
      { id: 'spent', name: 'Spent ($)', type: 'number' },
      {
        id: 'remaining',
        name: 'Remaining ($)',
        type: 'formula',
        formulaConfig: { expression: 'prop("budget") - prop("spent")', outputType: 'number', format: 'currency' },
      },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-projects-table',
        name: 'All Projects',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'due', direction: 'asc' }],
        visiblePropertyIds: ['title', 'status', 'priority', 'due', 'client', 'budget', 'spent', 'remaining', 'tags'],
        columnWidths: { title: 240, status: 130, priority: 110, due: 120, client: 160, budget: 110, spent: 110, remaining: 130, tags: 140 },
      },
      {
        id: 'view-projects-board',
        name: 'Status Pipeline',
        type: 'board',
        groupByPropertyId: 'status',
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'priority', direction: 'desc' }],
        visiblePropertyIds: ['title', 'due', 'priority', 'remaining', 'client'],
      },
      {
        id: 'view-projects-calendar',
        name: 'Deadlines Calendar',
        type: 'calendar',
        datePropertyId: 'due',
        filters: { conjunction: 'and', rules: [] },
        sorts: [],
        visiblePropertyIds: ['title', 'status', 'priority'],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-reading-list',
    name: 'Reading List & Books',
    description: 'Curated books, articles, and research papers with ratings and reading status',
    icon: 'BookOpen',
    source: { type: 'tag', tag: 'book' },
    schema: [
      { id: 'status', name: 'Reading Status', type: 'select', options: ['want_to_read', 'reading', 'finished', 'abandoned'] },
      { id: 'author', name: 'Author', type: 'text' },
      { id: 'rating', name: 'Rating (1-5)', type: 'number' },
      { id: 'genre', name: 'Genre', type: 'select', options: ['Non-fiction', 'Technical', 'Philosophy', 'Science', 'Fiction'] },
      { id: 'finishedDate', name: 'Finished Date', type: 'date' },
      { id: 'cover', name: 'Cover URL', type: 'url' },
    ],
    views: [
      {
        id: 'view-reading-gallery',
        name: 'Visual Gallery',
        type: 'gallery',
        isDefault: true,
        galleryCoverProperty: 'first_image',
        galleryCardSize: 'medium',
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'rating', direction: 'desc' }],
        visiblePropertyIds: ['title', 'author', 'status', 'rating', 'genre'],
      },
      {
        id: 'view-reading-table',
        name: 'All Books',
        type: 'table',
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'title', direction: 'asc' }],
        visiblePropertyIds: ['title', 'status', 'author', 'rating', 'genre', 'finishedDate'],
        columnWidths: { title: 260, status: 140, author: 180, rating: 110, genre: 130, finishedDate: 130 },
      },
      {
        id: 'view-reading-board',
        name: 'Reading Stage',
        type: 'board',
        groupByPropertyId: 'status',
        filters: { conjunction: 'and', rules: [] },
        sorts: [],
        visiblePropertyIds: ['title', 'author', 'rating'],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-people',
    name: 'People & Contacts',
    description: 'Personal and professional relationships, roles, organizations, and birthdays',
    icon: 'Users',
    source: { type: 'tag', tag: 'person' },
    schema: [
      { id: 'role', name: 'Role / Title', type: 'text' },
      { id: 'organization', name: 'Organization', type: 'relation', relationConfig: { cardinality: 'many' } },
      { id: 'email', name: 'Email', type: 'text' },
      { id: 'phone', name: 'Phone', type: 'text' },
      { id: 'birthday', name: 'Birthday', type: 'date' },
      { id: 'status', name: 'Status', type: 'select', options: ['active', 'occasional', 'archived'] },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-people-table',
        name: 'All People',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'title', direction: 'asc' }],
        visiblePropertyIds: ['title', 'role', 'organization', 'email', 'phone', 'birthday', 'status', 'tags'],
        columnWidths: { title: 220, role: 160, organization: 160, email: 180, phone: 140, birthday: 120, status: 110, tags: 130 },
      },
      {
        id: 'view-people-gallery',
        name: 'Directory Cards',
        type: 'gallery',
        galleryCardSize: 'medium',
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'title', direction: 'asc' }],
        visiblePropertyIds: ['title', 'role', 'organization', 'email', 'phone'],
      },
      {
        id: 'view-people-board',
        name: 'By Status',
        type: 'board',
        groupByPropertyId: 'status',
        filters: { conjunction: 'and', rules: [] },
        sorts: [],
        visiblePropertyIds: ['title', 'role', 'organization'],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-organizations',
    name: 'Organizations & Teams',
    description: 'Companies, non-profits, institutions, and groups',
    icon: 'Building2',
    source: { type: 'tag', tag: 'organization' },
    schema: [
      { id: 'org-type', name: 'Type', type: 'select', options: ['Company', 'Non-profit', 'University', 'Community', 'Team', 'Client'] },
      { id: 'website', name: 'Website', type: 'url' },
      { id: 'location', name: 'Location', type: 'text' },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-orgs-table',
        name: 'All Organizations',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'title', direction: 'asc' }],
        visiblePropertyIds: ['title', 'org-type', 'website', 'location', 'tags'],
        columnWidths: { title: 240, 'org-type': 140, website: 180, location: 160, tags: 130 },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-interactions',
    name: 'Interactions & Logs',
    description: 'Meetings, calls, messages, and touchpoints with linked people',
    icon: 'MessageSquare',
    source: { type: 'tag', tag: 'interaction' },
    schema: [
      { id: 'interaction-type', name: 'Type', type: 'select', options: ['meeting', 'call', 'message', 'email', 'conversation', 'appointment', 'social'] },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'people', name: 'Participants', type: 'relation', relationConfig: { cardinality: 'many' } },
      { id: 'summary', name: 'Summary', type: 'text' },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-interactions-table',
        name: 'Interaction Log',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'date', direction: 'desc' }],
        visiblePropertyIds: ['title', 'date', 'interaction-type', 'people', 'summary', 'tags'],
        columnWidths: { title: 240, date: 120, 'interaction-type': 130, people: 200, summary: 240, tags: 130 },
      },
      {
        id: 'view-interactions-calendar',
        name: 'Interactions Calendar',
        type: 'calendar',
        datePropertyId: 'date',
        filters: { conjunction: 'and', rules: [] },
        sorts: [],
        visiblePropertyIds: ['title', 'interaction-type', 'people'],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-goals',
    name: 'Goals & Outcomes',
    description: 'Long-term outcome targets, progress, and supporting projects',
    icon: 'Target',
    source: { type: 'tag', tag: 'goal' },
    schema: [
      { id: 'status', name: 'Status', type: 'select', options: ['planned', 'active', 'paused', 'achieved', 'abandoned'] },
      { id: 'target-date', name: 'Target Date', type: 'date' },
      { id: 'area', name: 'Area', type: 'relation', relationConfig: { cardinality: 'single' } },
      { id: 'priority', name: 'Priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
      { id: 'progress', name: 'Progress (%)', type: 'number' },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-goals-table',
        name: 'All Goals',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'target-date', direction: 'asc' }],
        visiblePropertyIds: ['title', 'status', 'target-date', 'area', 'priority', 'progress', 'tags'],
        columnWidths: { title: 240, status: 120, 'target-date': 120, area: 160, priority: 110, progress: 110, tags: 130 },
      },
      {
        id: 'view-goals-gallery',
        name: 'Outcome Cards',
        type: 'gallery',
        galleryCardSize: 'medium',
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'target-date', direction: 'asc' }],
        visiblePropertyIds: ['title', 'status', 'target-date', 'area', 'progress'],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-areas',
    name: 'Areas of Responsibility',
    description: 'Ongoing life domains, standards, and spheres of responsibility',
    icon: 'Layers',
    source: { type: 'tag', tag: 'area' },
    schema: [
      { id: 'status', name: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
      { id: 'people', name: 'People', type: 'relation', relationConfig: { cardinality: 'many' } },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-areas-table',
        name: 'All Areas',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'title', direction: 'asc' }],
        visiblePropertyIds: ['title', 'status', 'people', 'tags'],
        columnWidths: { title: 260, status: 120, people: 200, tags: 140 },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-reviews',
    name: 'Periodic Reviews',
    description: 'Weekly, monthly, quarterly, and annual review notes',
    icon: 'Sparkles',
    source: { type: 'tag', tag: 'review' },
    schema: [
      { id: 'period', name: 'Period', type: 'select', options: ['week', 'month', 'quarter', 'year'] },
      { id: 'period-start', name: 'Period Start', type: 'date' },
      { id: 'period-end', name: 'Period End', type: 'date' },
      { id: 'tags', name: 'Tags', type: 'tags', isSystem: true },
    ],
    views: [
      {
        id: 'view-reviews-table',
        name: 'Review History',
        type: 'table',
        isDefault: true,
        filters: { conjunction: 'and', rules: [] },
        sorts: [{ field: 'period-start', direction: 'desc' }],
        visiblePropertyIds: ['title', 'period', 'period-start', 'period-end', 'tags'],
        columnWidths: { title: 260, period: 110, 'period-start': 130, 'period-end': 130, tags: 140 },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class CollectionService {
  private inMemoryCache: Collection[] | null = null;

  /**
   * Loads all Collections from persistent storage
   */
  public loadCollections(): Collection[] {
    if (this.inMemoryCache) {
      return this.inMemoryCache;
    }
    try {
      const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      if (!raw) {
        this.inMemoryCache = [...DEFAULT_COLLECTIONS];
        this.persist(this.inMemoryCache);
        return this.inMemoryCache;
      }
      const loaded = JSON.parse(raw) as Collection[];
      if (!Array.isArray(loaded) || loaded.length === 0) {
        this.inMemoryCache = [...DEFAULT_COLLECTIONS];
        return this.inMemoryCache;
      }
      this.inMemoryCache = loaded;
      return loaded;
    } catch {
      this.inMemoryCache = [...DEFAULT_COLLECTIONS];
      return this.inMemoryCache;
    }
  }

  /**
   * Saves or updates a Collection
   */
  public saveCollection(collection: Collection): Collection {
    const list = this.loadCollections();
    const idx = list.findIndex((c) => c.id === collection.id);
    const updated = {
      ...collection,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }

    this.persist(list);
    return updated;
  }

  /**
   * Deletes a Collection (Removes schema and view metadata ONLY; never deletes notes!)
   */
  public deleteCollection(collectionId: string): boolean {
    const list = this.loadCollections();
    const filtered = list.filter((c) => c.id !== collectionId);
    if (filtered.length !== list.length) {
      this.persist(filtered);
      return true;
    }
    return false;
  }

  /**
   * Retrieves a collection by ID
   */
  public getCollectionById(collectionId: string): Collection | undefined {
    return this.loadCollections().find((c) => c.id === collectionId);
  }

  /**
   * Duplicates a Collection
   */
  public duplicateCollection(collectionId: string): Collection | null {
    const original = this.getCollectionById(collectionId);
    if (!original) return null;

    const duplicated: Collection = {
      ...original,
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${original.name} (Copy)`,
      views: original.views.map((v) => ({
        ...v,
        id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.saveCollection(duplicated);
  }

  /**
   * Evaluates base collection membership against vault notes
   */
  public getCollectionMembers(collection: Collection, allNotes: Note[]): Note[] {
    const activeNotes = allNotes.filter((n) => !n.trashed);

    switch (collection.source.type) {
      case 'folder': {
        const folderId = collection.source.folderId;
        return activeNotes.filter((n) => {
          if (folderId === null) {
            return !n.folderId;
          }
          return n.folderId === folderId;
        });
      }

      case 'tag': {
        const tag = collection.source.tag.replace(/^#/, '').toLowerCase().trim();
        return activeNotes.filter((n) =>
          (n.tags || []).some((t) => t.replace(/^#/, '').toLowerCase().trim() === tag)
        );
      }

      case 'query': {
        const results = executeSmartQuery(collection.source.query, { notes: activeNotes });
        return results.items.map((r) => r.note);
      }

      case 'notes': {
        const noteIdSet = new Set(collection.source.noteIds);
        return activeNotes.filter((n) => noteIdSet.has(n.id));
      }

      default:
        return activeNotes;
    }
  }

  /**
   * Projects member notes into full evaluated CollectionRecords with formulas & rollups
   */
  public getCollectionRecords(
    collection: Collection,
    allNotes: Note[],
    folders: Folder[]
  ): CollectionRecord[] {
    // 1. Rebuild relation index
    relationIndex.rebuild(allNotes);

    // 2. Filter member notes
    const memberNotes = this.getCollectionMembers(collection, allNotes);

    const folderMap = new Map(folders.map((f) => [f.id, f.name]));
    const formulaDefs = collection.schema
      .filter((s) => s.type === 'formula' && s.formulaConfig?.expression)
      .map((s) => ({ id: s.id, expression: s.formulaConfig!.expression }));

    const rollupDefs = collection.schema.filter(
      (s) => s.type === 'rollup' && s.rollupConfig
    );

    return memberNotes.map((note) => {
      // Parse frontmatter
      const { ast } = parseFrontmatterAST(note.content || '');
      const canonicalProps = (ast.hasFrontmatter && !ast.hasSyntaxError ? ast.properties : {}) as Record<string, PropertyValue>;

      // System values
      const words = (note.content || '').trim().split(/\s+/).filter(Boolean).length;
      const tasks = note.checklist ? note.checklist.length : 0;
      const openTasks = note.checklist ? note.checklist.filter((t) => !t.completed).length : 0;
      const incomingRelations = relationIndex.getIncomingRelations(note.id);

      const systemValues = {
        createdAtFormatted: formatDateOnly(note.createdAt),
        updatedAtFormatted: formatDateOnly(note.updatedAt),
        folderName: note.folderId ? folderMap.get(note.folderId) || 'Unknown Folder' : 'No Folder',
        wordCount: words,
        taskCount: tasks,
        openTaskCount: openTasks,
        backlinkCount: incomingRelations.length,
      };

      // 1. Evaluate Rollups
      const derivedValues: Record<string, { value: any; error?: string }> = {};
      for (const rDef of rollupDefs) {
        const res = evaluateRollup(note, rDef.rollupConfig!, allNotes);
        derivedValues[rDef.id] = { value: res.value, error: res.error };
      }

      // 2. Evaluate Formulas
      if (formulaDefs.length > 0) {
        const formulaResults = evaluateAllFormulas(formulaDefs, {
          properties: canonicalProps,
          derivedFormulas: Object.fromEntries(
            Object.entries(derivedValues).map(([k, v]) => [k, v.value])
          ),
          systemValues,
          now: new Date(),
        });
        for (const [fId, fRes] of Object.entries(formulaResults)) {
          derivedValues[fId] = { value: fRes.value, error: fRes.error };
        }
      }

      return {
        note,
        canonicalProperties: canonicalProps,
        derivedValues,
        systemValues,
      };
    });
  }

  /**
   * Applies view filters and sorting to a list of CollectionRecords
   */
  public applyViewFiltersAndSorts(
    records: CollectionRecord[],
    view: CollectionView,
    searchQuery: string = ''
  ): CollectionRecord[] {
    let filtered = records;

    // 1. In-collection fast text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        if (r.note.title.toLowerCase().includes(q)) return true;
        for (const val of Object.values(r.canonicalProperties)) {
          if (val && String(val).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    // 2. View Filter Rules
    if (view.filters && view.filters.rules.length > 0) {
      filtered = filtered.filter((record) => {
        const matches = view.filters.rules.map((rule) => this.matchFilterRule(record, rule));
        if (view.filters.conjunction === 'or') {
          return matches.some(Boolean);
        }
        return matches.every(Boolean);
      });
    }

    // 3. Multi-level Sorts
    if (view.sorts && view.sorts.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const sort of view.sorts) {
          const cmp = this.compareRecords(a, b, sort.field, sort.direction);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    return filtered;
  }

  /**
   * Checks if a single record matches a filter rule
   */
  private matchFilterRule(record: CollectionRecord, rule: { field: string; operator: FilterOperator; value?: any }): boolean {
    const val = this.getRecordFieldValue(record, rule.field);
    const targetVal = rule.value;

    switch (rule.operator) {
      case 'is_empty':
        return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      case 'is_not_empty':
        return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
      case 'equals':
        if (val === null || val === undefined) return targetVal === null || targetVal === undefined || targetVal === '';
        return String(val).toLowerCase() === String(targetVal ?? '').toLowerCase();
      case 'not_equals':
        if (val === null || val === undefined) return targetVal !== null && targetVal !== undefined && targetVal !== '';
        return String(val).toLowerCase() !== String(targetVal ?? '').toLowerCase();
      case 'contains':
        if (!val) return false;
        if (Array.isArray(val)) {
          return val.some((item) => String(item).toLowerCase().includes(String(targetVal ?? '').toLowerCase()));
        }
        return String(val).toLowerCase().includes(String(targetVal ?? '').toLowerCase());
      case 'not_contains':
        if (!val) return true;
        if (Array.isArray(val)) {
          return !val.some((item) => String(item).toLowerCase().includes(String(targetVal ?? '').toLowerCase()));
        }
        return !String(val).toLowerCase().includes(String(targetVal ?? '').toLowerCase());
      case 'greater_than':
        return Number(val) > Number(targetVal);
      case 'less_than':
        return Number(val) < Number(targetVal);
      case 'greater_than_or_equal':
        return Number(val) >= Number(targetVal);
      case 'less_than_or_equal':
        return Number(val) <= Number(targetVal);
      case 'is_checked':
        return Boolean(val) === true;
      case 'is_not_checked':
        return Boolean(val) === false;
      case 'is_before':
        if (!val || !targetVal) return false;
        return String(val) < String(targetVal);
      case 'is_after':
        if (!val || !targetVal) return false;
        return String(val) > String(targetVal);
      default:
        return true;
    }
  }

  /**
   * Retrieves any field value (title, canonical property, formula, rollup, system field)
   */
  public getRecordFieldValue(record: CollectionRecord, field: string): any {
    if (field === 'title') return record.note.title;
    if (field === 'created' || field === 'createdAt') return record.note.createdAt;
    if (field === 'updated' || field === 'updatedAt') return record.note.updatedAt;
    if (field === 'folder') return record.systemValues.folderName;
    if (field === 'tags') return record.note.tags || [];
    if (field === 'wordCount') return record.systemValues.wordCount;
    if (field === 'taskCount') return record.systemValues.taskCount;
    if (field === 'openTaskCount') return record.systemValues.openTaskCount;
    if (field === 'backlinkCount') return record.systemValues.backlinkCount;

    // Derived (formula / rollup)
    if (record.derivedValues[field]) {
      return record.derivedValues[field].value;
    }

    // Canonical frontmatter
    return record.canonicalProperties[field] ?? null;
  }

  /**
   * Compares two records for sorting with stable null handling (missing values last on asc)
   */
  private compareRecords(a: CollectionRecord, b: CollectionRecord, field: string, direction: 'asc' | 'desc'): number {
    const valA = this.getRecordFieldValue(a, field);
    const valB = this.getRecordFieldValue(b, field);

    const isNullA = valA === null || valA === undefined || valA === '';
    const isNullB = valB === null || valB === undefined || valB === '';

    if (isNullA && isNullB) return 0;
    if (isNullA) return 1; // nulls always at bottom
    if (isNullB) return -1;

    let comp = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comp = valA - valB;
    } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      comp = valA === valB ? 0 : valA ? -1 : 1;
    } else {
      comp = String(valA).localeCompare(String(valB));
    }

    return direction === 'asc' ? comp : -comp;
  }

  /**
   * Exports Collection records as a clean CSV string
   */
  public exportCollectionAsCSV(
    collection: Collection,
    records: CollectionRecord[],
    visibleOnly: boolean = true,
    activeView?: CollectionView
  ): string {
    const propsToExport = visibleOnly && activeView
      ? collection.schema.filter((s) => activeView.visiblePropertyIds.includes(s.id) || s.id === 'title')
      : collection.schema;

    // Header row
    const headers = ['Title', ...propsToExport.filter((p) => p.id !== 'title').map((p) => `"${p.name.replace(/"/g, '""')}"`)];
    const rows: string[] = [headers.join(',')];

    for (const record of records) {
      const rowData: string[] = [];
      // Title
      rowData.push(`"${record.note.title.replace(/"/g, '""')}"`);

      for (const prop of propsToExport) {
        if (prop.id === 'title') continue;
        const raw = this.getRecordFieldValue(record, prop.id);
        let formatted = '';
        if (raw === null || raw === undefined) {
          formatted = '';
        } else if (Array.isArray(raw)) {
          formatted = raw.join('; ');
        } else {
          formatted = String(raw);
        }
        rowData.push(`"${formatted.replace(/"/g, '""')}"`);
      }
      rows.push(rowData.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Diagnostic / Health check for a Collection
   */
  public inspectCollectionHealth(collection: Collection, allNotes: Note[]): CollectionHealthReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const formulaErrors: { propertyId: string; error: string }[] = [];
    const rollupErrors: { propertyId: string; error: string }[] = [];

    // Check schema formulas
    for (const prop of collection.schema) {
      if (prop.type === 'formula' && prop.formulaConfig?.expression) {
        // Inspect expression
        const testRes = evaluateAllFormulas([{ id: prop.id, expression: prop.formulaConfig.expression }], {
          properties: { budget: 100, spent: 50, num: 10, text: 'sample' },
        });
        if (testRes[prop.id]?.error) {
          formulaErrors.push({ propertyId: prop.id, error: testRes[prop.id].error! });
          errors.push(`Formula error in '${prop.name}': ${testRes[prop.id].error}`);
        }
      }
    }

    return {
      collectionId: collection.id,
      isValid: errors.length === 0,
      errors,
      warnings,
      incompatibleProperties: [],
      formulaErrors,
      rollupErrors,
      danglingRelationsCount: 0,
    };
  }

  /**
   * Helper to create a new Collection from a folder
   */
  public createCollectionFromFolder(folder: Folder): Collection {
    const col: Collection = {
      id: `col-folder-${folder.id}`,
      name: folder.name,
      description: `Collection of notes in ${folder.name}`,
      icon: 'Folder',
      source: { type: 'folder', folderId: folder.id },
      schema: [
        { id: 'status', name: 'Status', type: 'select', options: ['todo', 'in_progress', 'done'] },
        { id: 'due', name: 'Due Date', type: 'date' },
        { id: 'priority', name: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
      ],
      views: [
        {
          id: `view-table-${Date.now()}`,
          name: 'Table View',
          type: 'table',
          isDefault: true,
          filters: { conjunction: 'and', rules: [] },
          sorts: [{ field: 'title', direction: 'asc' }],
          visiblePropertyIds: ['title', 'status', 'priority', 'due'],
        },
        {
          id: `view-board-${Date.now()}`,
          name: 'Board View',
          type: 'board',
          groupByPropertyId: 'status',
          filters: { conjunction: 'and', rules: [] },
          sorts: [],
          visiblePropertyIds: ['title', 'priority', 'due'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.saveCollection(col);
  }

  /**
   * Helper to create a new Collection from a tag
   */
  public createCollectionFromTag(tag: string): Collection {
    const cleanTag = tag.replace(/^#/, '');
    const col: Collection = {
      id: `col-tag-${cleanTag.toLowerCase()}`,
      name: `#${cleanTag}`,
      description: `Notes tagged with #${cleanTag}`,
      icon: 'Tag',
      source: { type: 'tag', tag: cleanTag },
      schema: [
        { id: 'status', name: 'Status', type: 'select', options: ['active', 'archived'] },
        { id: 'created', name: 'Created', type: 'created', isSystem: true },
      ],
      views: [
        {
          id: `view-table-${Date.now()}`,
          name: 'Table View',
          type: 'table',
          isDefault: true,
          filters: { conjunction: 'and', rules: [] },
          sorts: [{ field: 'created', direction: 'desc' }],
          visiblePropertyIds: ['title', 'status', 'created'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.saveCollection(col);
  }

  /**
   * Resets in-memory caches on vault lock
   */
  public clearLockCache(): void {
    this.inMemoryCache = null;
    relationIndex.clear();
  }

  private persist(collections: Collection[]): void {
    this.inMemoryCache = collections;
    try {
      localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
    } catch {
      // safe fallback
    }
  }
}

export const collectionService = new CollectionService();
