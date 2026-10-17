/**
 * PKM Phase P39: Publication Slug Generation & URL Resolution
 * Provides deterministic, collision-resistant, URL-safe slugs for notes, folders, and headings.
 */

import { Note, Folder } from '../../types';

/**
 * Normalizes unicode strings and converts to URL-safe alphanumeric slugs.
 * Preserves unicode letters (e.g. CJK, Cyrillic, Turkish, German umlauts) while converting spaces & punctuation to hyphens.
 */
export function generateUrlSlug(rawTitle: string): string {
  if (!rawTitle || !rawTitle.trim()) {
    return 'untitled';
  }

  // 1. Normalize unicode (NFC/NFD)
  let slug = rawTitle.trim();

  // 2. Remove common markdown symbols if present in title
  slug = slug.replace(/[#*`_~[\](){}<>!|\\/@:;=+^%&$?"',.]+/g, ' ');

  // 3. Convert whitespace to single hyphens and lowercase
  slug = slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  // 4. Remove leading/trailing hyphens and consecutive hyphens
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!slug) {
    return 'note';
  }

  return slug;
}

/**
 * Generates an anchor slug for headings inside a note
 */
export function generateHeadingSlug(headingText: string): string {
  return generateUrlSlug(headingText);
}

/**
 * Resolves deterministic, collision-safe slugs for a collection of notes in a publication.
 * Disambiguates duplicate slugs using folder context or deterministic numeric suffixes.
 */
export function buildPublicationSlugMap(
  notes: Note[],
  folders: Folder[] = [],
  customOverrides: Record<string, string> = {}
): Map<string, string> {
  const slugMap = new Map<string, string>(); // noteId -> slug
  const usedSlugs = new Map<string, string>(); // slug -> noteId
  const folderMap = new Map<string, Folder>();
  folders.forEach((f) => folderMap.set(f.id, f));

  // 1. Sort notes deterministically by title then ID so order is always stable
  const sortedNotes = [...notes].sort((a, b) => {
    const titleCmp = (a.title || '').localeCompare(b.title || '');
    if (titleCmp !== 0) return titleCmp;
    return a.id.localeCompare(b.id);
  });

  // First pass: apply custom overrides
  for (const note of sortedNotes) {
    if (customOverrides && customOverrides[note.id]) {
      const overrideSlug = generateUrlSlug(customOverrides[note.id]);
      if (!usedSlugs.has(overrideSlug)) {
        slugMap.set(note.id, overrideSlug);
        usedSlugs.set(overrideSlug, note.id);
      }
    }
  }

  // Second pass: generate slugs for remaining notes
  for (const note of sortedNotes) {
    if (slugMap.has(note.id)) continue;

    let baseSlug = generateUrlSlug(note.title);
    if (!baseSlug || baseSlug === 'untitled' || baseSlug === 'note') {
      baseSlug = `note-${note.id.substring(0, 8)}`;
    }

    let candidateSlug = baseSlug;

    if (usedSlugs.has(candidateSlug) && usedSlugs.get(candidateSlug) !== note.id) {
      // Collision detected. Try prefixing folder name if available
      if (note.folderId && folderMap.has(note.folderId)) {
        const folderSlug = generateUrlSlug(folderMap.get(note.folderId)!.name);
        const folderCandidate = `${folderSlug}-${baseSlug}`;
        if (!usedSlugs.has(folderCandidate)) {
          candidateSlug = folderCandidate;
        }
      }
    }

    // If still collision, append deterministic index suffix -2, -3, etc.
    if (usedSlugs.has(candidateSlug) && usedSlugs.get(candidateSlug) !== note.id) {
      let counter = 2;
      while (usedSlugs.has(`${candidateSlug}-${counter}`)) {
        counter++;
      }
      candidateSlug = `${candidateSlug}-${counter}`;
    }

    slugMap.set(note.id, candidateSlug);
    usedSlugs.set(candidateSlug, note.id);
  }

  return slugMap;
}

/**
 * Formats a relative HTML URL for a published note based on base path and slug
 */
export function getRelativeNoteUrl(
  targetSlug: string,
  currentSlug?: string,
  basePath = '/',
  isSingleHtmlMode = false
): string {
  if (isSingleHtmlMode) {
    return `#note-${targetSlug}`;
  }

  // If linking to the same page
  if (currentSlug && currentSlug === targetSlug) {
    return '';
  }

  // Relative path calculation from note page (which resides in /notes/) or index
  if (!currentSlug || currentSlug === 'index') {
    return `notes/${targetSlug}.html`;
  }

  // From notes/<currentSlug>.html to notes/<targetSlug>.html
  return `${targetSlug}.html`;
}
