/**
 * PKM Phase P39: Publication Source Snapshot & Note Scope Resolver
 * Deterministically resolves the exact set of notes, dependencies, and assets for a publication.
 */

import { Note, Folder } from '../../types';
import { VaultIndex } from '../types';
import { parseFrontmatter } from '../parser';
import { vaultManager } from '../indexer';
import { PKMResolver } from '../resolver';
import {
  Publication,
  PublicationSource,
  ResolvedPublicationSnapshot,
} from './publishingTypes';
import { buildPublicationSlugMap } from './publicationSlug';

/**
 * Checks if a note should be excluded based on publication exclusion rules
 */
export function isNoteExcluded(
  note: Note,
  source: PublicationSource,
  isExplicitDirectSelection = false
): boolean {
  // Always exclude trashed notes
  if (note.trashed) return true;

  // Exclude archived if configured
  if (source.excludeArchived && note.archived) return true;

  // If user explicitly selected this specific note as a single-note or selected-notes, bypass tag/type exclusions
  if (isExplicitDirectSelection) {
    return false;
  }

  // Check Draft / Publish frontmatter
  if (source.excludeDrafts) {
    const { frontmatter } = parseFrontmatter(note.content || '');
    if (frontmatter) {
      if (frontmatter.publish === false || frontmatter.publish === 'false') return true;
      if (frontmatter.draft === true || frontmatter.draft === 'true') return true;
      if (typeof frontmatter.status === 'string' && frontmatter.status.toLowerCase() === 'draft') return true;
    }
  }

  // Check Excluded Tags
  if (source.excludeTags && source.excludeTags.length > 0) {
    const noteTags = (note.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
    const excluded = source.excludeTags.map((t) => t.toLowerCase().replace(/^#/, ''));
    if (noteTags.some((tag) => excluded.includes(tag))) {
      return true;
    }
  }

  // Check Daily Notes
  if (source.excludeDailyNotes) {
    const isDaily =
      (note as any).isDailyNote === true ||
      /^\d{4}-\d{2}-\d{2}$/.test(note.title?.trim() || '');
    if (isDaily) return true;
  }

  // Check Templates
  if (source.excludeTemplates) {
    const isTemplate =
      (note as any).isTemplate === true ||
      (note.tags || []).some((t) => t.toLowerCase().includes('template'));
    if (isTemplate) return true;
  }

  return false;
}

/**
 * Resolves all subfolder IDs recursively
 */
function getSubfolderIds(folderId: string, folders: Folder[]): Set<string> {
  const result = new Set<string>([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      const parent = (f as any).parentId || (f as any).parentFolderId;
      if (parent && result.has(parent) && !result.has(f.id)) {
        result.add(f.id);
        added = true;
      }
    }
  }
  return result;
}

/**
 * Extracts wikilinks and transclusion targets from note content
 */
export function extractTargetNoteIdsFromContent(
  content: string,
  vaultIndex: VaultIndex,
  notes: Note[]
): { forwardLinkIds: string[]; transclusionIds: string[]; assetIds: string[] } {
  const forwardLinkIds: string[] = [];
  const transclusionIds: string[] = [];
  const assetIds: string[] = [];

  const titleToNoteMap = new Map<string, Note>();
  notes.forEach((n) => {
    if (n.title) titleToNoteMap.set(n.title.toLowerCase().trim(), n);
  });

  // Wikilinks: [[Target]]
  const linkRegex = /\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    const resolved = PKMResolver.resolveLink(rawTarget, vaultIndex);
    if (resolved.resolvedNoteId) {
      forwardLinkIds.push(resolved.resolvedNoteId);
    } else {
      const direct = titleToNoteMap.get(rawTarget.toLowerCase());
      if (direct) forwardLinkIds.push(direct.id);
    }
  }

  // Transclusions: ![[Target]]
  const transRegex = /!\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  while ((match = transRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    // Check if it's an image/media or note
    if (/\.(png|jpe?g|gif|webp|svg|mp3|wav|m4a|pdf)$/i.test(rawTarget)) {
      assetIds.push(rawTarget);
    } else {
      const resolved = PKMResolver.resolveLink(rawTarget, vaultIndex);
      if (resolved.resolvedNoteId) {
        transclusionIds.push(resolved.resolvedNoteId);
      } else {
        const direct = titleToNoteMap.get(rawTarget.toLowerCase());
        if (direct) transclusionIds.push(direct.id);
      }
    }
  }

  return { forwardLinkIds, transclusionIds, assetIds };
}

/**
 * Deterministically resolves a publication snapshot from source configuration and vault state.
 */
export function resolvePublicationSnapshot(
  publication: Publication,
  allNotes: Note[],
  folders: Folder[] = [],
  vaultIndex: VaultIndex = vaultManager.getIndex()
): ResolvedPublicationSnapshot {
  const noteById = new Map<string, Note>();
  allNotes.forEach((n) => noteById.set(n.id, n));

  const source = publication.source;
  const primaryNoteIds = new Set<string>();
  const referencedAssets = new Set<string>();
  const referencedCitations = new Set<string>();

  // 1. Initial Source Selection
  switch (source.type) {
    case 'single-note': {
      if (source.noteId && noteById.has(source.noteId)) {
        primaryNoteIds.add(source.noteId);
      }
      break;
    }

    case 'selected-notes': {
      if (source.noteIds && Array.isArray(source.noteIds)) {
        source.noteIds.forEach((id) => {
          if (noteById.has(id)) {
            const note = noteById.get(id)!;
            if (!isNoteExcluded(note, source, true)) {
              primaryNoteIds.add(id);
            }
          }
        });
      }
      break;
    }

    case 'folder': {
      let allowedFolderIds = new Set<string>();
      if (source.folderId) {
        if (source.includeSubfolders) {
          allowedFolderIds = getSubfolderIds(source.folderId, folders);
        } else {
          allowedFolderIds.add(source.folderId);
        }
      }

      allNotes.forEach((note) => {
        if (note.folderId && allowedFolderIds.has(note.folderId)) {
          if (!isNoteExcluded(note, source, false)) {
            primaryNoteIds.add(note.id);
          }
        }
      });
      break;
    }

    case 'moc': {
      // Crawl MOC tree starting from root MOC note
      if (source.mocNoteId && noteById.has(source.mocNoteId)) {
        const rootNote = noteById.get(source.mocNoteId)!;
        primaryNoteIds.add(rootNote.id);

        const visited = new Set<string>([rootNote.id]);
        const queue: string[] = [rootNote.id];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const note = noteById.get(currentId);
          if (!note) continue;

          const { forwardLinkIds } = extractTargetNoteIdsFromContent(note.content || '', vaultIndex, allNotes);
          for (const targetId of forwardLinkIds) {
            if (!visited.has(targetId) && noteById.has(targetId)) {
              visited.add(targetId);
              const targetNote = noteById.get(targetId)!;
              if (!isNoteExcluded(targetNote, source, false)) {
                primaryNoteIds.add(targetId);
                queue.push(targetId);
              }
            }
          }
        }
      }
      break;
    }

    case 'all-notes':
    default: {
      allNotes.forEach((note) => {
        if (!isNoteExcluded(note, source, false)) {
          primaryNoteIds.add(note.id);
        }
      });
      break;
    }
  }

  // 2. Link Expansion (one-level or recursive)
  const expansionMode = source.includeLinkedNotes || 'never';
  if (expansionMode !== 'never' && primaryNoteIds.size > 0) {
    const queue = Array.from(primaryNoteIds);
    const visited = new Set<string>(primaryNoteIds);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const note = noteById.get(currentId);
      if (!note) continue;

      const { forwardLinkIds } = extractTargetNoteIdsFromContent(note.content || '', vaultIndex, allNotes);
      for (const targetId of forwardLinkIds) {
        if (!visited.has(targetId) && noteById.has(targetId)) {
          visited.add(targetId);
          const targetNote = noteById.get(targetId)!;
          if (!isNoteExcluded(targetNote, source, false)) {
            primaryNoteIds.add(targetId);
            if (expansionMode === 'recursive') {
              queue.push(targetId);
            }
          }
        }
      }
    }
  }

  // 3. Resolve Embedded Dependencies (Transclusions)
  const embeddedNoteIds = new Set<string>();
  primaryNoteIds.forEach((id) => {
    const note = noteById.get(id);
    if (!note) return;

    // Collect citations: [@key]
    const citationMatches = (note.content || '').match(/\[@([a-zA-Z0-9_:.-]+)\]/g);
    if (citationMatches) {
      citationMatches.forEach((m) => {
        const key = m.replace(/^\[@|\]$/g, '');
        if (key) referencedCitations.add(key);
      });
    }

    const { transclusionIds, assetIds } = extractTargetNoteIdsFromContent(note.content || '', vaultIndex, allNotes);
    assetIds.forEach((a) => referencedAssets.add(a));

    for (const transId of transclusionIds) {
      if (!primaryNoteIds.has(transId) && noteById.has(transId)) {
        embeddedNoteIds.add(transId);
      }
    }
  });

  // 4. Construct Note Lists
  const primaryNotes: Note[] = [];
  primaryNoteIds.forEach((id) => {
    const n = noteById.get(id);
    if (n) primaryNotes.push(n);
  });

  const embeddedNotes: Note[] = [];
  embeddedNoteIds.forEach((id) => {
    const n = noteById.get(id);
    if (n) embeddedNotes.push(n);
  });

  const allPublishedNotes = [...primaryNotes, ...embeddedNotes];
  const allPublishedNoteIds = new Set(allPublishedNotes.map((n) => n.id));

  // 5. Build Deterministic Slug Map
  const slugMap = buildPublicationSlugMap(
    primaryNotes,
    folders,
    publication.output.customSlugOverrides || {}
  );

  // 6. Identify Home Note
  let homeNote: Note | undefined;
  if (publication.homeNoteId && noteById.has(publication.homeNoteId)) {
    homeNote = noteById.get(publication.homeNoteId);
  } else if (source.type === 'single-note' && source.noteId && noteById.has(source.noteId)) {
    homeNote = noteById.get(source.noteId);
  } else if (primaryNotes.length > 0) {
    // Look for note titled "Home", "Index", "Overview", or pick the first note
    const candidateHome = primaryNotes.find(
      (n) => /^(home|index|overview|readme|start)$/i.test(n.title?.trim() || '')
    );
    homeNote = candidateHome || primaryNotes[0];
  }

  return {
    publication,
    primaryNotes,
    embeddedNotes,
    allPublishedNotes,
    allPublishedNoteIds,
    slugMap,
    noteById,
    homeNote,
    referencedAssets,
    referencedCitations,
    vaultIndex,
  };
}
