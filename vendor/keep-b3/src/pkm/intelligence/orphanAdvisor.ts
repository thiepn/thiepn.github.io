import { Note } from '../../types';
import { VaultIndex } from '../types';
import { OrphanConnectionSuggestion } from './intelligenceTypes';
import { buildLexicalIndex, computeLexicalRelatednessForDoc } from '../lexicalRelatedness';

export interface OrphanAdvisorOptions {
  limit?: number;
  minScore?: number;
  dismissedTargets?: string[];
}

/**
 * Checks if a note is an orphan (no incoming, outgoing, or explicit links)
 */
export function isNoteOrphan(noteId: string, notes: Note[], vaultIndex?: VaultIndex): boolean {
  const note = notes.find((n) => n.id === noteId);
  if (!note || note.trashed) return false;

  if (note.linkedNoteIds && note.linkedNoteIds.length > 0) return false;

  if (vaultIndex) {
    const backlinks = vaultIndex.backlinks[noteId] || [];
    const forwardLinks = vaultIndex.forwardLinks[noteId] || [];
    return backlinks.length === 0 && forwardLinks.length === 0;
  }

  // Fallback if no vaultIndex: check content [[ links and linkedNoteIds
  const hasLinks = /\[\[(.*?)\]\]/.test(note.content || '');
  if (hasLinks) return false;

  const targetTitleLower = note.title.trim().toLowerCase();
  for (const other of notes) {
    if (other.id === noteId || other.trashed) continue;
    if (other.linkedNoteIds?.includes(noteId)) return false;
    if (other.content && other.content.toLowerCase().includes(`[[${targetTitleLower}`)) {
      return false;
    }
  }

  return true;
}

/**
 * Suggests high-quality candidate connections for an orphan note
 */
export function suggestOrphanConnections(
  orphanNoteId: string,
  allNotes: Note[],
  vaultIndex?: VaultIndex,
  options: OrphanAdvisorOptions = {}
): OrphanConnectionSuggestion[] {
  const limit = options.limit || 5;
  const minScore = options.minScore || 0.25;
  const dismissedSet = new Set(options.dismissedTargets || []);

  const orphanNote = allNotes.find((n) => n.id === orphanNoteId);
  if (!orphanNote || orphanNote.trashed) return [];

  const existingLinkPairs = new Set<string>();
  const lexicalIndex = buildLexicalIndex(allNotes);

  // 1. Get lexical similarity neighbors
  const related = computeLexicalRelatednessForDoc(
    orphanNoteId,
    lexicalIndex,
    0.15,
    15,
    existingLinkPairs
  );

  const candidateMap = new Map<string, OrphanConnectionSuggestion>();

  for (const rel of related) {
    if (dismissedSet.has(rel.targetId)) continue;
    const targetNote = allNotes.find((n) => n.id === rel.targetId);
    if (!targetNote || targetNote.trashed) continue;

    const isMOC =
      /moc\b/i.test(targetNote.title) ||
      /map of content/i.test(targetNote.title) ||
      /```moc/i.test(targetNote.content || '');

    const sharedTags: string[] = [];
    const orphanTags = new Set(orphanNote.tags?.map((t) => t.toLowerCase().replace(/^#/, '')) || []);
    for (const t of targetNote.tags || []) {
      const clean = t.toLowerCase().replace(/^#/, '');
      if (orphanTags.has(clean)) sharedTags.push(clean);
    }

    const sameFolder = orphanNote.folderId && orphanNote.folderId === targetNote.folderId;
    let combinedScore = rel.score;
    if (isMOC) combinedScore += 0.15;
    if (sameFolder) combinedScore += 0.1;
    if (sharedTags.length > 0) combinedScore += Math.min(0.2, sharedTags.length * 0.08);

    const roundedScore = Math.min(1.0, Math.round(combinedScore * 100) / 100);

    if (roundedScore >= minScore) {
      let rationale = '';
      if (rel.sharedTerms && rel.sharedTerms.length > 0) {
        rationale = `Shared concepts: ${rel.sharedTerms.slice(0, 3).join(', ')}`;
      } else if (sharedTags.length > 0) {
        rationale = `Shared tags: #${sharedTags.join(', #')}`;
      } else if (sameFolder) {
        rationale = 'Same folder and topical context';
      } else if (isMOC) {
        rationale = 'Topic hub / MOC note';
      } else {
        rationale = 'Topical relationship match';
      }

      candidateMap.set(rel.targetId, {
        orphanNoteId,
        targetNoteId: rel.targetId,
        targetTitle: targetNote.title,
        score: roundedScore,
        confidence: roundedScore >= 0.55 ? 'strong' : 'moderate',
        rationale,
        sharedTags: sharedTags.length > 0 ? sharedTags : undefined,
        sharedTerms: rel.sharedTerms,
        isMOC,
      });
    }
  }

  // 2. Also check MOC notes in vault that might share tags or folder even if lexical is weak
  for (const targetNote of allNotes) {
    if (targetNote.id === orphanNoteId || targetNote.trashed || candidateMap.has(targetNote.id)) {
      continue;
    }
    if (dismissedSet.has(targetNote.id)) continue;

    const isMOC =
      /moc\b/i.test(targetNote.title) ||
      /map of content/i.test(targetNote.title) ||
      /```moc/i.test(targetNote.content || '');

    if (!isMOC) continue;

    const orphanTags = new Set(orphanNote.tags?.map((t) => t.toLowerCase().replace(/^#/, '')) || []);
    const sharedTags: string[] = [];
    for (const t of targetNote.tags || []) {
      const clean = t.toLowerCase().replace(/^#/, '');
      if (orphanTags.has(clean)) sharedTags.push(clean);
    }

    if (sharedTags.length > 0 || (orphanNote.folderId && orphanNote.folderId === targetNote.folderId)) {
      candidateMap.set(targetNote.id, {
        orphanNoteId,
        targetNoteId: targetNote.id,
        targetTitle: targetNote.title,
        score: 0.5,
        confidence: 'moderate',
        rationale: sharedTags.length > 0 ? `Shared MOC tag: #${sharedTags.join(', #')}` : 'Knowledge Hub in same folder',
        sharedTags: sharedTags.length > 0 ? sharedTags : undefined,
        isMOC: true,
      });
    }
  }

  const results = Array.from(candidateMap.values()).sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
