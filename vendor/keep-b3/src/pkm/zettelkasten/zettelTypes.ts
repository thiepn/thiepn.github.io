import { Note } from '../../types';

export type ZettelType = 'permanent' | 'literature' | 'fleeting' | 'structure';

export interface ZettelMetadata {
  id: string; // e.g. "202610121530" or "1a2"
  type: ZettelType;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  branch?: string; // folgezettel branch, e.g. "1a"
  tags: string[];
}

export interface ExtractionTemplate {
  title: string;
  zettelType: ZettelType;
  content: string;
  tags: string[];
  replaceInSource: boolean;
}

/**
 * Generates a standard Zettelkasten identifier.
 * Uses either Luhmann-style folgezettel branching (e.g., "1a1") if parentBranch is given,
 * or a canonical ISO timestamp ID (YYYYMMDDHHmm).
 */
export function generateZettelId(parentBranch?: string, existingBranches: string[] = []): string {
  if (parentBranch && parentBranch.trim()) {
    const cleanParent = parentBranch.trim();
    // Find next branch suffix: e.g. if parent is '1a', next could be '1a1', '1a2', or '1b'
    let suffix = 1;
    let candidate = `${cleanParent}${suffix}`;
    while (existingBranches.includes(candidate)) {
      suffix++;
      candidate = `${cleanParent}${suffix}`;
    }
    return candidate;
  }

  // Canonical Timestamp ID: YYYYMMDDHHmm
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());

  return `${year}${month}${day}${hours}${mins}`;
}

/**
 * Classifies any vault note into one of the 4 classic Zettelkasten note categories.
 */
export function classifyNote(note: Note): ZettelType {
  const tags = (note.tags || []).map((t) => t.toLowerCase());
  const title = (note.title || '').toLowerCase();
  const content = (note.content || '').toLowerCase();

  if (
    tags.some((t) => t.includes('moc') || t.includes('structure') || t.includes('index') || t.includes('hub')) ||
    title.includes('moc') ||
    title.includes('map of content')
  ) {
    return 'structure';
  }

  if (
    tags.some((t) => t.includes('lit') || t.includes('literature') || t.includes('book') || t.includes('paper') || t.includes('article') || t.includes('quote')) ||
    title.startsWith('lit:') ||
    content.includes('## bibliography') ||
    content.includes('## citations')
  ) {
    return 'literature';
  }

  if (
    tags.some((t) => t.includes('fleeting') || t.includes('scratch') || t.includes('inbox') || t.includes('quick')) ||
    title.startsWith('fleeting:') ||
    title.startsWith('quick:')
  ) {
    return 'fleeting';
  }

  return 'permanent';
}

/**
 * Suggests related existing notes based on shared tags and wikilinks
 */
export function findRelatedZettels(
  currentNoteId: string,
  allNotes: Note[],
  targetTags: string[] = [],
  keywordHints: string[] = []
): Note[] {
  const targetLower = targetTags.map((t) => t.toLowerCase().replace(/^#/, ''));
  const keywords = keywordHints.map((k) => k.toLowerCase()).filter((k) => k.length > 3);

  const scored: { note: Note; score: number }[] = [];

  for (const n of allNotes) {
    if (n.id === currentNoteId || n.trashed) continue;
    let score = 0;

    // Tag overlap
    for (const tag of n.tags || []) {
      const clean = tag.toLowerCase().replace(/^#/, '');
      if (targetLower.includes(clean)) score += 3;
    }

    // Keyword match in title
    const nTitle = n.title.toLowerCase();
    for (const kw of keywords) {
      if (nTitle.includes(kw)) score += 2;
    }

    if (score > 0) {
      scored.push({ note: n, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 5).map((s) => s.note);
}

/**
 * Finds all orphaned zettels (notes with 0 backlinks and 0 outgoing links)
 */
export function findOrphanZettels(allNotes: Note[]): Note[] {
  const activeNotes = allNotes.filter((n) => !n.trashed);

  // Map of incoming links
  const incomingCount = new Map<string, number>();
  activeNotes.forEach((n) => incomingCount.set(n.id, 0));

  // Count wikilinks
  const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;

  for (const n of activeNotes) {
    const text = `${n.content || ''} ${n.title || ''}`;
    let match: RegExpExecArray | null;
    while ((match = wikiRegex.exec(text)) !== null) {
      const targetTitle = match[1].trim().toLowerCase();
      const targetNote = activeNotes.find((other) => other.title.trim().toLowerCase() === targetTitle);
      if (targetNote && targetNote.id !== n.id) {
        incomingCount.set(targetNote.id, (incomingCount.get(targetNote.id) || 0) + 1);
      }
    }
  }

  // Filter notes with 0 outgoing and 0 incoming
  return activeNotes.filter((n) => {
    const text = n.content || '';
    const outgoing = (text.match(/\[\[([^\]]+)\]\]/g) || []).length;
    const incoming = incomingCount.get(n.id) || 0;
    return outgoing === 0 && incoming === 0;
  });
}
