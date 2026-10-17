import { Note, Folder, FilterState, NoteColorKey } from '../types';

export interface ParsedQuery {
  rawTerms: string[];
  tags: string[];
  colors: string[];
  folderNames: string[];
  type?: 'text' | 'checklist';
  isPinned?: boolean;
  isFavorite?: boolean;
  isLocked?: boolean;
  hasReminder?: boolean;
  hasImages?: boolean;
  hasLinks?: boolean;
  isArchived?: boolean;
  includeArchived?: boolean;
  month?: string; // "YYYY-MM"
  beforeDate?: string;
  afterDate?: string;
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    rawTerms: [],
    tags: [],
    colors: [],
    folderNames: [],
  };

  const tokens = query.trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Tag matching: #tag or tag:tag
    if (lower.startsWith('#') && lower.length > 1) {
      result.tags.push(lower.slice(1));
    } else if (lower.startsWith('tag:') && lower.length > 4) {
      result.tags.push(lower.slice(4));
    }
    // Color matching: color:yellow
    else if (lower.startsWith('color:') && lower.length > 6) {
      result.colors.push(lower.slice(6));
    }
    // Folder matching: in:work or folder:work
    else if (lower.startsWith('in:') && lower.length > 3) {
      const folderVal = lower.slice(3);
      if (folderVal === 'archive' || folderVal === 'archived') {
        result.isArchived = true;
      } else if (folderVal === 'all') {
        result.includeArchived = true;
      } else {
        result.folderNames.push(folderVal);
      }
    } else if (lower.startsWith('folder:') && lower.length > 7) {
      result.folderNames.push(lower.slice(7));
    }
    // Type matching: type:checklist or type:text
    else if (lower === 'type:checklist' || lower === 'has:todo' || lower === 'is:checklist') {
      result.type = 'checklist';
    } else if (lower === 'type:text' || lower === 'is:text') {
      result.type = 'text';
    }
    // Archive / Status matching
    else if (lower === 'is:archived' || lower === 'is:archive' || lower === 'scope:archive' || lower === 'scope:archived') {
      result.isArchived = true;
    } else if (lower === 'is:active' || lower === 'scope:active') {
      result.isArchived = false;
    } else if (lower === 'is:all' || lower === 'scope:all') {
      result.includeArchived = true;
    }
    // Flags
    else if (lower === 'is:pinned' || lower === 'pinned:true') {
      result.isPinned = true;
    } else if (lower === 'is:favorite' || lower === 'is:starred' || lower === 'is:fav') {
      result.isFavorite = true;
    } else if (lower === 'is:locked' || lower === 'is:secure') {
      result.isLocked = true;
    } else if (lower === 'has:reminder' || lower === 'is:reminder') {
      result.hasReminder = true;
    } else if (lower === 'has:images' || lower === 'has:image' || lower === 'has:photo') {
      result.hasImages = true;
    } else if (lower === 'has:links' || lower === 'has:link' || lower === 'is:linked') {
      result.hasLinks = true;
    } else if (lower === 'is:untagged' || lower === 'tag:none') {
      result.tags.push('__untagged__');
    } else if (lower === 'is:unorganized' || lower === 'in:none' || lower === 'folder:none') {
      result.folderNames.push('__unorganized__');
    }
    // Month matching: month:2026-08
    else if (lower.startsWith('month:') && lower.length >= 12) {
      result.month = lower.slice(6);
    } else if (lower.startsWith('before:')) {
      result.beforeDate = lower.slice(7);
    } else if (lower.startsWith('after:')) {
      result.afterDate = lower.slice(6);
    } else {
      result.rawTerms.push(lower);
    }
  }

  return result;
}

export function filterNotes(
  notes: Note[] = [],
  filter?: Partial<FilterState> | null,
  folders: Folder[] = []
): Note[] {
  if (!Array.isArray(notes)) return [];
  const safeFilter: FilterState = {
    searchQuery: '',
    selectedFolderId: null,
    selectedTag: null,
    selectedColor: null,
    selectedType: 'all',
    scope: 'active',
    viewMode: 'masonry',
    ...(filter || {}),
  };

  const folderMap = new Map(folders.map((f) => [f.id, f.name.toLowerCase()]));
  const parsed = parseSearchQuery(safeFilter.searchQuery || '');

  const filtered = notes.filter((note) => {
    // 1. Primary Scope Filter (trash vs archive vs active vs reminders vs favorites)
    if (safeFilter.scope === 'trash') {
      if (!note.trashed) return false;
    } else if (safeFilter.scope === 'favorites') {
      if (note.trashed || !note.isFavorite) return false;
    } else if (parsed.isArchived === true) {
      // Explicit search for archived notes
      if (note.trashed || !note.archived) return false;
    } else if (parsed.isArchived === false) {
      // Explicit search for active notes
      if (note.trashed || note.archived) return false;
    } else if (parsed.includeArchived) {
      // Search across active + archived (exclude trash)
      if (note.trashed) return false;
    } else if (safeFilter.scope === 'archived') {
      // Dedicated archive view
      if (note.trashed || !note.archived) return false;
    } else if (safeFilter.scope === 'reminders') {
      if (note.trashed || note.archived || !note.reminderDate) return false;
    } else {
      // Normal active scope: hidden from main workspace
      if (note.trashed || note.archived) return false;
    }

    // 2. Specific Quick Filters
    if (safeFilter.selectedFolderId !== null && safeFilter.selectedFolderId !== undefined) {
      if (safeFilter.selectedFolderId === 'unorganized') {
        if (note.folderId) return false;
      } else {
        if (note.folderId !== safeFilter.selectedFolderId) return false;
      }
    }

    if (safeFilter.selectedTag) {
      if (safeFilter.selectedTag === '__untagged__') {
        if (note.tags && note.tags.length > 0) return false;
      } else {
        const cleanTag = safeFilter.selectedTag.toLowerCase().replace(/^#/, '');
        if (!note.tags || !note.tags.some((t) => t.toLowerCase() === cleanTag)) {
          return false;
        }
      }
    }

    if (safeFilter.selectedColor) {
      const noteColor = note.color || 'default';
      if (noteColor !== safeFilter.selectedColor) return false;
    }

    if (safeFilter.selectedType === 'checklist' && note.type !== 'checklist') return false;
    if (safeFilter.selectedType === 'text' && note.type !== 'text') return false;

    if (safeFilter.hasReminderOnly && !note.reminderDate) return false;
    if (safeFilter.hasImagesOnly && (!note.images || note.images.length === 0)) return false;
    if (safeFilter.hasLinksOnly && (!note.linkedNoteIds || note.linkedNoteIds.length === 0)) return false;
    if (safeFilter.isFavoriteOnly && !note.isFavorite) return false;
    if (safeFilter.pinnedOnly && !note.pinned) return false;

    if (safeFilter.selectedMonth) {
      const noteMonth = (note.createdAt || '').slice(0, 7); // "YYYY-MM"
      if (noteMonth !== safeFilter.selectedMonth) return false;
    }

    // 3. Search Query Tokens
    if (parsed.tags.length > 0) {
      const hasAllTags = parsed.tags.every((tag) => {
        if (tag === '__untagged__') {
          return !note.tags || note.tags.length === 0;
        }
        return note.tags?.some((t) => t.toLowerCase() === tag);
      });
      if (!hasAllTags) return false;
    }

    if (parsed.colors.length > 0) {
      if (!parsed.colors.includes(note.color.toLowerCase())) return false;
    }

    if (parsed.folderNames.length > 0) {
      const noteFolderName = note.folderId ? folderMap.get(note.folderId) || '' : '';
      const matchesFolder = parsed.folderNames.every((f) => {
        if (f === '__unorganized__') {
          return !note.folderId;
        }
        return noteFolderName.includes(f);
      });
      if (!matchesFolder) return false;
    }

    if (parsed.type && note.type !== parsed.type) return false;
    if (parsed.isPinned && !note.pinned) return false;
    if (parsed.isFavorite && !note.isFavorite) return false;
    if (parsed.isLocked && !note.isLocked) return false;
    if (parsed.hasReminder && !note.reminderDate) return false;
    if (parsed.hasImages && (!note.images || note.images.length === 0)) return false;
    if (parsed.hasLinks && (!note.linkedNoteIds || note.linkedNoteIds.length === 0)) return false;

    if (parsed.month) {
      const noteMonth = (note.createdAt || '').slice(0, 7);
      if (noteMonth !== parsed.month) return false;
    }

    if (parsed.beforeDate && note.createdAt > parsed.beforeDate) return false;
    if (parsed.afterDate && note.createdAt < parsed.afterDate) return false;

    // 4. Raw text terms (Title, Content, Checklist items, Tags)
    if (parsed.rawTerms.length > 0) {
      const fullText = [
        note.title || '',
        note.content || '',
        (note.tags || []).join(' '),
        (note.checklist || []).map((c) => c.text).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      const matchesAllTerms = parsed.rawTerms.every((term) =>
        fullText.includes(term)
      );
      if (!matchesAllTerms) return false;
    }

    return true;
  });

  // Apply sorting
  if (safeFilter.viewMode === 'recent') {
    // Recent view: sort strictly by updatedAt timestamp descending, top 20
    const sortedRecent = [...filtered].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || '';
      const bTime = b.updatedAt || b.createdAt || '';
      return bTime.localeCompare(aTime);
    });
    return sortedRecent.slice(0, 20);
  }

  const sortBy = safeFilter.sortBy || 'updatedAt';
  const sortOrder = safeFilter.sortOrder || 'desc';

  return filtered.sort((a, b) => {
    // Pinned notes always sort to top within their context if not trashed
    if (a.pinned !== b.pinned && !a.trashed && !b.trashed) {
      return a.pinned ? -1 : 1;
    }

    let comparison = 0;
    if (sortBy === 'manual') {
      const aOrder = typeof a.order === 'number' ? a.order : 999999;
      const bOrder = typeof b.order === 'number' ? b.order : 999999;
      comparison = aOrder - bOrder;
      if (comparison === 0) {
        const aTime = a.updatedAt || a.createdAt || '';
        const bTime = b.updatedAt || b.createdAt || '';
        comparison = bTime.localeCompare(aTime);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    } else if (sortBy === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '');
    } else if (sortBy === 'createdAt') {
      comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
    } else if (sortBy === 'reminder') {
      const aRem = a.reminderDate || '9999-99-99';
      const bRem = b.reminderDate || '9999-99-99';
      comparison = aRem.localeCompare(bRem);
    } else {
      // 'updatedAt' default
      comparison = (a.updatedAt || '').localeCompare(b.updatedAt || '');
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export interface MonthGroup {
  key: string; // "2026-08"
  label: string; // "August 2026"
  year: number;
  month: number;
  notes: Note[];
}

export function groupNotesByMonth(notes: Note[] = []): MonthGroup[] {
  if (!Array.isArray(notes)) return [];
  const groups: Record<string, Note[]> = {};

  for (const note of notes) {
    if (!note) continue;
    const key = note.createdAt ? note.createdAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(note);
  }

  // Sort months descending
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const dateObj = new Date(year, month - 1, 1);
    const label = dateObj.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });

    return {
      key,
      label,
      year,
      month,
      notes: groups[key] || [],
    };
  });
}

export function getAllUniqueTags(notes: Note[] = []): { tag: string; count: number }[] {
  if (!Array.isArray(notes)) return [];
  const map = new Map<string, number>();

  for (const n of notes) {
    if (!n || n.trashed) continue;
    for (const t of (n.tags || [])) {
      const clean = (t || '').trim().toLowerCase();
      if (clean) {
        map.set(clean, (map.get(clean) || 0) + 1);
      }
    }
  }

  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getAllUniqueColors(
  notes: Note[] = []
): { color: NoteColorKey; count: number }[] {
  if (!Array.isArray(notes)) return [];
  const map = new Map<NoteColorKey, number>();

  for (const n of notes) {
    if (!n || n.trashed) continue;
    const color = n.color || 'default';
    map.set(color, (map.get(color) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}
