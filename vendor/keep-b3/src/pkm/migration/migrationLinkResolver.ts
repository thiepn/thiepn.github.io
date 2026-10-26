/**
 * P40 — Migration Link & Attachment Graph Resolver
 * Builds link graph before commit, resolves relative paths, wikilinks, aliases,
 * headings, block references, and produces link resolution metrics.
 */

import { AttachmentCandidate, LinkResolutionStats, MigrationWarning, NoteCandidate } from './migrationTypes';
import { getBaseFileName } from './adapters/baseAdapter';

export interface ResolvedLinkGraph {
  notesWithResolvedLinks: NoteCandidate[];
  stats: LinkResolutionStats;
  warnings: MigrationWarning[];
}

export function resolveMigrationLinkGraph(
  notes: NoteCandidate[],
  attachments: AttachmentCandidate[],
  existingNotes: { id: string; title: string; aliases?: string[] }[] = []
): ResolvedLinkGraph {
  const warnings: MigrationWarning[] = [];

  // Build note lookup index:
  // Title (lowercase) -> NoteCandidate[]
  const titleMap = new Map<string, NoteCandidate[]>();
  const aliasMap = new Map<string, NoteCandidate[]>();
  const pathMap = new Map<string, NoteCandidate>();
  const originalIdMap = new Map<string, NoteCandidate>();

  notes.forEach((note) => {
    const tLower = note.title.toLowerCase();
    const list = titleMap.get(tLower) || [];
    list.push(note);
    titleMap.set(tLower, list);

    pathMap.set(note.sourcePath.toLowerCase(), note);
    pathMap.set(getBaseFileName(note.sourcePath).toLowerCase(), note);

    if (note.sourceOriginalId) {
      originalIdMap.set(note.sourceOriginalId.toLowerCase(), note);
    }

    note.aliases.forEach((alias) => {
      const aLower = alias.toLowerCase();
      const aList = aliasMap.get(aLower) || [];
      aList.push(note);
      aliasMap.set(aLower, aList);
    });
  });

  // Build attachment lookup index
  const attachmentMap = new Map<string, AttachmentCandidate>();
  attachments.forEach((att) => {
    attachmentMap.set(att.sourcePath.toLowerCase(), att);
    attachmentMap.set(att.originalName.toLowerCase(), att);
  });

  const stats: LinkResolutionStats = {
    totalLinks: 0,
    resolvedDirect: 0,
    resolvedFuzzyOrAlias: 0,
    ambiguous: 0,
    missingInternal: 0,
    external: 0,
    mediaEmbeds: 0,
    blockRefsResolved: 0,
  };

  const processedNotes: NoteCandidate[] = notes.map((note) => {
    let updatedMarkdown = note.rawMarkdown;
    const noteFolder = (note.folderPath || '').toLowerCase();

    note.links.forEach((link) => {
      stats.totalLinks++;
      if (link.isEmbed && (link.target.endsWith('.png') || link.target.endsWith('.jpg') || link.target.endsWith('.pdf'))) {
        stats.mediaEmbeds++;
      }

      const targetRaw = link.target.trim();
      const targetLower = targetRaw.toLowerCase();
      const targetBase = getBaseFileName(targetRaw).toLowerCase();

      // Check direct title match
      const directMatches = titleMap.get(targetLower) || titleMap.get(targetBase) || [];

      if (directMatches.length === 1) {
        stats.resolvedDirect++;
        if (link.blockId) stats.blockRefsResolved++;
        return;
      }

      if (directMatches.length > 1) {
        // Disambiguate using folder proximity
        const proximityMatch = directMatches.find((m) => (m.folderPath || '').toLowerCase() === noteFolder);
        if (proximityMatch) {
          stats.resolvedDirect++;
        } else {
          stats.ambiguous++;
          warnings.push({
            id: `warn_ambig_${note.id}_${targetRaw}`,
            severity: 'warning',
            category: 'ambiguous-link',
            message: `Link [[${targetRaw}]] in "${note.title}" matches multiple imported notes with the same title.`,
            noteTitle: note.title,
            sourcePath: note.sourcePath,
            snippet: `[[${targetRaw}]]`,
            remediation: 'Qualify link with folder path or alias if necessary.',
          });
        }
        return;
      }

      // Check alias matches
      const aliasMatches = aliasMap.get(targetLower) || [];
      if (aliasMatches.length === 1) {
        stats.resolvedFuzzyOrAlias++;
        return;
      }

      // Check relative path matches
      const pathMatch = pathMap.get(targetLower) || pathMap.get(targetBase);
      if (pathMatch) {
        stats.resolvedDirect++;
        // Rewrite relative link to clean Wikilink e.g. [Link](../Folder/Target.md) -> [[Target]]
        if (!link.isWikilink) {
          const regex = new RegExp(`\\[([^\\]]*)\\]\\(${escapeRegex(targetRaw)}\\)`, 'g');
          updatedMarkdown = updatedMarkdown.replace(regex, (m, label) => {
            return `[[${pathMatch.title}${label && label !== pathMatch.title ? `|${label}` : ''}]]`;
          });
        }
        return;
      }

      // Check existing notes in live vault
      const existingMatch = existingNotes.find(
        (en) => en.title.toLowerCase() === targetLower || (en.aliases && en.aliases.some((a) => a.toLowerCase() === targetLower))
      );
      if (existingMatch) {
        stats.resolvedDirect++;
        return;
      }

      // Check if target is an attachment
      const attMatch = attachmentMap.get(targetLower) || attachmentMap.get(targetBase);
      if (attMatch) {
        stats.resolvedDirect++;
        attMatch.referencedByNotePaths.push(note.sourcePath);
        return;
      }

      // If not external URL, mark as missing internal note
      if (!targetRaw.startsWith('http://') && !targetRaw.startsWith('https://')) {
        stats.missingInternal++;
        warnings.push({
          id: `warn_miss_${note.id}_${targetRaw}`,
          severity: 'info',
          category: 'broken-link',
          message: `Unresolved internal link [[${targetRaw}]] in note "${note.title}".`,
          noteTitle: note.title,
          sourcePath: note.sourcePath,
          snippet: `[[${targetRaw}]]`,
          remediation: 'A placeholder note will be linked when created in the future.',
        });
      } else {
        stats.external++;
      }
    });

    // Check referenced attachments existence
    note.attachments.forEach((attRef) => {
      const attLower = attRef.toLowerCase();
      const baseLower = getBaseFileName(attRef).toLowerCase();
      const exists = attachmentMap.has(attLower) || attachmentMap.has(baseLower);
      if (!exists) {
        warnings.push({
          id: `warn_miss_att_${note.id}_${attRef}`,
          severity: 'warning',
          category: 'missing-attachment',
          message: `Missing media attachment reference "${attRef}" in note "${note.title}".`,
          noteTitle: note.title,
          sourcePath: note.sourcePath,
          remediation: 'Verify that the attachment file was included in the selected import files.',
        });
      }
    });

    return {
      ...note,
      rawMarkdown: updatedMarkdown,
    };
  });

  return {
    notesWithResolvedLinks: processedNotes,
    stats,
    warnings,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
