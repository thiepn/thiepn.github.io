import { Note, Folder, AppSettings, SavedSearch } from '../types';
import {
  VaultIndex,
  ParsedNote,
  PKMWikiLink,
} from './types';
import {
  DiagnosticCategory,
  DiagnosticIssue,
  DiagnosticIssueType,
  DiagnosticSeverity,
  DiagnosticAction,
  StorageBreakdown,
  VaultDiagnosticsReport,
  DiagnosticsScanProgress,
  RepairCheckpoint,
} from './doctorTypes';
import { PKMResolver } from './resolver';
import { resolveTransclusion } from './transclusion';
import { parseSmartQuery } from './queryParser';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';
import { buildVaultIndex } from './vaultIndex';
import { detectVaultDuplicates } from './intelligence/duplicateDetector';
import { suggestOrphanConnections, isNoteOrphan } from './intelligence/orphanAdvisor';
import { detectMOCClusters, generateMOCContent } from './intelligence/mocDetector';
import { diagnoseReviewSystem } from './review/reviewDoctor';

/**
 * Scan Broken WikiLinks across all non-trashed notes in the vault
 */
export function scanBrokenWikiLinks(vaultIndex: VaultIndex, notes: Note[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const notesMap = new Map<string, Note>();
  for (const n of notes) {
    if (n && !n.trashed) notesMap.set(n.id, n);
  }

  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    const rawNote = notesMap.get(noteId);
    if (!rawNote) continue;

    const allLinks = parsed.outgoingLinks;
    for (const link of allLinks) {
      const resolveTarget = link.subpath
        ? `${link.target}${link.subpath.type === 'block' ? '#^' : '#'}${link.subpath.target}`
        : link.target;
      const res = PKMResolver.resolveLink(resolveTarget, vaultIndex, { currentNoteId: noteId });

      if (res.status === 'missing') {
        // Distinguish missing note vs missing heading vs missing block
        let issueType: DiagnosticIssueType = 'missing_target_note';
        let severity: DiagnosticSeverity = 'error';
        let title = `Missing Target Note: "${link.target}"`;
        let description = `Note "${parsed.title}" contains link [[${link.raw}]] targeting note "${link.target}", which does not exist in the vault.`;

        if (link.subpath) {
          // Check if base note actually exists
          let baseTarget = link.target;
          const hashIdx = link.target.indexOf('#');
          if (hashIdx > -1) {
            baseTarget = link.target.slice(0, hashIdx).trim();
          }

          const baseRes = baseTarget
            ? PKMResolver.resolveLink(baseTarget, vaultIndex, { currentNoteId: noteId })
            : { status: 'resolved', resolvedNoteId: noteId, resolvedNoteTitle: parsed.title };

          if (baseRes.status === 'resolved' && baseRes.resolvedNoteId) {
            if (link.subpath.type === 'heading') {
              issueType = 'missing_target_heading';
              severity = 'warning';
              title = `Missing Heading: "#${link.subpath.target}"`;
              description = `Note "${parsed.title}" links to heading "#${link.subpath.target}" in "${baseRes.resolvedNoteTitle || baseTarget}", but this heading does not exist.`;
            } else {
              issueType = 'missing_target_block';
              severity = 'warning';
              title = `Missing Block: "#^${link.subpath.target}"`;
              description = `Note "${parsed.title}" links to block ID "^${link.subpath.target}" in "${baseRes.resolvedNoteTitle || baseTarget}", but this block does not exist.`;
            }
          }
        }

        const actions: DiagnosticAction[] = [];
        if (issueType === 'missing_target_note') {
          // Extract plain target name without subpath
          let targetName = link.target;
          const hIdx = targetName.indexOf('#');
          if (hIdx > -1) targetName = targetName.slice(0, hIdx).trim();

          actions.push({
            id: `create-note-${noteId}-${link.charOffset}`,
            label: `Create Note "${targetName}"`,
            description: `Create a new note titled "${targetName}" to resolve this link`,
            actionType: 'create_missing_note',
            params: { title: targetName },
          });
        }

        actions.push({
          id: `repoint-link-${noteId}-${link.charOffset}`,
          label: 'Select Replacement Target',
          description: 'Repoint this link to another note in your vault',
          actionType: 'repoint_link',
          requiresTargetSelection: true,
          params: { sourceNoteId: noteId, oldLinkRaw: link.raw },
        });

        issues.push({
          id: `broken-link-${noteId}-${link.charOffset}`,
          category: 'broken_links',
          type: issueType,
          severity,
          title,
          description,
          sourceId: noteId,
          sourceName: parsed.title,
          targetName: link.target,
          location: {
            line: link.line,
            charOffset: link.charOffset,
            rawSnippet: link.raw,
          },
          metadata: {
            target: link.target,
            subpath: link.subpath?.target,
            subpathType: link.subpath?.type,
          },
          suggestedActions: actions,
        });
      } else if (res.status === 'resolved' && res.subpathStatus === 'not_found' && link.subpath) {
        // Target note found, but subpath heading or block is missing
        const isHeading = link.subpath.type === 'heading';
        const issueType: DiagnosticIssueType = isHeading
          ? 'missing_target_heading'
          : 'missing_target_block';

        issues.push({
          id: `broken-subpath-${noteId}-${link.charOffset}`,
          category: 'broken_links',
          type: issueType,
          severity: 'warning',
          title: isHeading
            ? `Missing Heading: "#${link.subpath.target}"`
            : `Missing Block: "#^${link.subpath.target}"`,
          description: `Note "${parsed.title}" links to ${isHeading ? 'heading' : 'block'} "#${
            isHeading ? '' : '^'
          }${link.subpath.target}" in "${res.resolvedNoteTitle || link.target}", which is not present in that note.`,
          sourceId: noteId,
          sourceName: parsed.title,
          targetName: res.resolvedNoteTitle || link.target,
          location: {
            line: link.line,
            charOffset: link.charOffset,
            rawSnippet: link.raw,
          },
          metadata: {
            target: link.target,
            subpath: link.subpath.target,
            subpathType: link.subpath.type,
          },
          suggestedActions: [
            {
              id: `repoint-subpath-${noteId}-${link.charOffset}`,
              label: 'Update Link',
              description: 'Select another target or remove the subpath',
              actionType: 'repoint_link',
              requiresTargetSelection: true,
              params: { sourceNoteId: noteId, oldLinkRaw: link.raw },
            },
          ],
        });
      }
    }
  }

  return issues;
}

/**
 * Scan Ambiguous Links that resolve to multiple notes with same title/alias
 */
export function scanAmbiguousLinks(vaultIndex: VaultIndex, notes: Note[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    for (const link of parsed.outgoingLinks) {
      const res = PKMResolver.resolveLink(link.target, vaultIndex, { currentNoteId: noteId });

      if (res.status === 'ambiguous' && res.candidates && res.candidates.length > 1) {
        issues.push({
          id: `ambiguous-link-${noteId}-${link.charOffset}`,
          category: 'ambiguous_links',
          type: 'ambiguous_link_target',
          severity: 'warning',
          title: `Ambiguous Link: "[[${link.target}]]"`,
          description: `Link "[[${link.target}]]" matches ${res.candidates.length} notes: ${res.candidates
            .map((c) => `"${c.title}"`)
            .join(', ')}. Disambiguate by selecting the exact target note.`,
          sourceId: noteId,
          sourceName: parsed.title,
          targetName: link.target,
          location: {
            line: link.line,
            charOffset: link.charOffset,
            rawSnippet: link.raw,
          },
          metadata: {
            target: link.target,
            candidates: res.candidates,
          },
          suggestedActions: [
            {
              id: `disambiguate-${noteId}-${link.charOffset}`,
              label: 'Select Intended Note',
              description: 'Choose the specific note this link should target',
              actionType: 'repoint_link',
              requiresTargetSelection: true,
              params: {
                sourceNoteId: noteId,
                oldLinkRaw: link.raw,
                candidates: res.candidates,
              },
            },
          ],
        });
      }
    }
  }

  return issues;
}

/**
 * Scan Orphan Notes (notes with zero incoming and zero outgoing links)
 */
export function scanOrphanNotes(vaultIndex: VaultIndex, notes: Note[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    const rawNote = notes.find((n) => n.id === noteId);
    if (!rawNote || rawNote.trashed || rawNote.archived) continue;

    const incomingCount = (vaultIndex.backlinks[noteId] || []).length;
    const outgoingCount = (vaultIndex.forwardLinks[noteId] || []).length;
    const explicitLinksCount = (rawNote.linkedNoteIds || []).length;

    if (incomingCount === 0 && outgoingCount === 0 && explicitLinksCount === 0) {
      issues.push({
        id: `orphan-${noteId}`,
        category: 'orphan_notes',
        type: 'orphan_note',
        severity: 'info',
        title: `Orphan Note: "${parsed.title || 'Untitled'}"`,
        description: `This note has no incoming backlinks and does not link to any other notes in your vault.`,
        sourceId: noteId,
        sourceName: parsed.title || 'Untitled',
        metadata: {
          count: 0,
        },
        suggestedActions: [
          {
            id: `open-orphan-${noteId}`,
            label: 'Open Note',
            description: 'View and add links or tags to this note',
            actionType: 'open_note',
            params: { noteId },
          },
        ],
      });
    }
  }

  return issues;
}

/**
 * Scan Tags for rare tags, empty tags, and casing duplicates
 */
export function scanTags(vaultIndex: VaultIndex, notes: Note[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Collect all raw tag occurrences from raw notes (both explicit tags and content #tags)
  const rawTagCounts = new Map<string, number>();
  const lowerTagMap = new Map<string, Set<string>>();

  for (const n of notes) {
    if (n.trashed) continue;

    // 1. Explicit tags
    for (const t of n.tags || []) {
      const clean = (t || '').trim().replace(/^#/, '');
      if (!clean) {
        issues.push({
          id: `tag-empty-${n.id}`,
          category: 'tags',
          type: 'empty_tag',
          severity: 'warning',
          title: 'Empty Tag Detected',
          description: `An empty or whitespace-only tag exists in note "${n.title}".`,
          sourceId: n.id,
          sourceName: n.title,
          suggestedActions: [],
        });
        continue;
      }

      rawTagCounts.set(clean, (rawTagCounts.get(clean) || 0) + 1);
      const lower = clean.toLowerCase();
      if (!lowerTagMap.has(lower)) {
        lowerTagMap.set(lower, new Set());
      }
      lowerTagMap.get(lower)!.add(clean);
    }

    // 2. In-content tags
    const inlineTagMatches = (n.content || '').match(/(?:^|\s)#([a-zA-Z0-9_\-/]+)/g);
    if (inlineTagMatches) {
      for (const match of inlineTagMatches) {
        const clean = match.trim().replace(/^#/, '');
        if (clean && !clean.match(/^\d+$/)) {
          rawTagCounts.set(clean, (rawTagCounts.get(clean) || 0) + 1);
          const lower = clean.toLowerCase();
          if (!lowerTagMap.has(lower)) {
            lowerTagMap.set(lower, new Set());
          }
          lowerTagMap.get(lower)!.add(clean);
        }
      }
    }
  }

  // Also merge with vaultIndex.tagCounts if not present
  for (const tag of Object.keys(vaultIndex.tagCounts)) {
    const lower = tag.toLowerCase().trim();
    if (!lowerTagMap.has(lower)) {
      lowerTagMap.set(lower, new Set([tag]));
      rawTagCounts.set(tag, vaultIndex.tagCounts[tag] || 1);
    }
  }

  // 1. Detect Casing Duplicates
  for (const [lower, variants] of lowerTagMap.entries()) {
    if (variants.size > 1) {
      const variantList = Array.from(variants);
      const totalOccurrences = variantList.reduce(
        (sum, v) => sum + (rawTagCounts.get(v) || 0),
        0
      );

      // Pick canonical tag (most frequent variant, or lower)
      const sortedByFreq = [...variantList].sort(
        (a, b) => (rawTagCounts.get(b) || 0) - (rawTagCounts.get(a) || 0)
      );
      const canonical = sortedByFreq[0] || lower;

      issues.push({
        id: `tag-case-dup-${lower}`,
        category: 'tags',
        type: 'casing_duplicate_tag',
        severity: 'warning',
        title: `Tag Casing Inconsistency: ${variantList.map((v) => `#${v}`).join(', ')}`,
        description: `Found ${variants.size} casing variations of the same tag (${variantList
          .map((v) => `#${v} (${rawTagCounts.get(v) || 0})`)
          .join(', ')}). You can merge them into a single canonical tag.`,
        metadata: {
          canonicalTag: canonical,
          variantTags: variantList,
          count: totalOccurrences,
        },
        suggestedActions: [
          {
            id: `merge-tag-${lower}`,
            label: `Merge into #${canonical}`,
            description: `Update all notes to use #${canonical}`,
            actionType: 'merge_tags',
            params: { canonicalTag: canonical, variantTags: variantList },
          },
        ],
      });
    }
  }

  // 2. Detect Rare Tags (used only 1 time)
  for (const [lower, variants] of lowerTagMap.entries()) {
    const totalCount = Array.from(variants).reduce(
      (sum, v) => sum + (rawTagCounts.get(v) || 0),
      0
    );

    if (totalCount === 1) {
      const tag = Array.from(variants)[0];
      const noteIds = vaultIndex.tagToNoteIds[lower] || [];
      const noteTitle = noteIds[0] ? vaultIndex.notes[noteIds[0]]?.title : undefined;

      issues.push({
        id: `tag-rare-${lower}`,
        category: 'tags',
        type: 'rare_tag',
        severity: 'info',
        title: `Single-Use Tag: #${tag}`,
        description: `Tag #${tag} is only used once${
          noteTitle ? ` in "${noteTitle}"` : ''
        }. Consider standardizing with existing tags if applicable.`,
        sourceId: noteIds[0],
        sourceName: noteTitle,
        metadata: {
          canonicalTag: tag,
          count: 1,
        },
        suggestedActions: [
          {
            id: `rename-tag-${lower}`,
            label: `Review Tag #${tag}`,
            description: 'View note containing this tag',
            actionType: 'open_note',
            params: { noteId: noteIds[0] },
          },
        ],
      });
    }
  }

  return issues;
}

/**
 * Scan Folders for empty / unused folders
 */
export function scanFolders(folders: Folder[], notes: Note[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const activeNotes = notes.filter((n) => !n.trashed);

  const folderCountMap = new Map<string, number>();
  for (const folder of folders) {
    folderCountMap.set(folder.id, 0);
  }

  for (const n of activeNotes) {
    if (n.folderId && folderCountMap.has(n.folderId)) {
      folderCountMap.set(n.folderId, (folderCountMap.get(n.folderId) || 0) + 1);
    }
  }

  for (const folder of folders) {
    const count = folderCountMap.get(folder.id) || 0;
    if (count === 0) {
      issues.push({
        id: `empty-folder-${folder.id}`,
        category: 'folders',
        type: 'empty_folder',
        severity: 'info',
        title: `Empty Folder: "${folder.name}"`,
        description: `Folder "${folder.name}" contains 0 notes.`,
        sourceId: folder.id,
        sourceName: folder.name,
        metadata: {
          count: 0,
        },
        suggestedActions: [
          {
            id: `delete-folder-${folder.id}`,
            label: `Delete Folder "${folder.name}"`,
            description: 'Remove this empty folder structure',
            actionType: 'delete_empty_folder',
            isDestructive: true,
            params: { folderId: folder.id, folderName: folder.name },
          },
        ],
      });
    }
  }

  return issues;
}

/**
 * Scan Attachments for unreferenced blobs, duplicate images, and broken file references
 */
export function scanAttachments(
  notes: Note[],
  pdfAttachments: PDFAttachment[] = []
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const nonTrashedNotes = notes.filter((n) => !n.trashed);

  // 1. Detect unreferenced PDF attachments
  const referencedPdfIds = new Set<string>();
  for (const n of nonTrashedNotes) {
    const content = n.content || '';
    for (const pdf of pdfAttachments) {
      if (
        content.includes(pdf.id) ||
        content.includes(pdf.name) ||
        (n.sourceUrl && n.sourceUrl.includes(pdf.id))
      ) {
        referencedPdfIds.add(pdf.id);
      }
    }
  }

  for (const pdf of pdfAttachments) {
    if (!referencedPdfIds.has(pdf.id)) {
      const sizeBytes = (pdf as any).sizeBytes || pdf.size || 0;
      issues.push({
        id: `unref-pdf-${pdf.id}`,
        category: 'attachments',
        type: 'unreferenced_attachment_blob',
        severity: 'info',
        title: `Unreferenced PDF: "${pdf.name}"`,
        description: `PDF "${pdf.name}" (${(sizeBytes / 1024).toFixed(
          1
        )} KB) is stored in database attachments but is not referenced in any note.`,
        sourceId: pdf.id,
        sourceName: pdf.name,
        metadata: {
          sizeBytes,
        },
        suggestedActions: [
          {
            id: `delete-unref-pdf-${pdf.id}`,
            label: `Delete Unreferenced PDF`,
            description: `Permanently free ${(sizeBytes / 1024).toFixed(1)} KB of storage`,
            actionType: 'delete_unreferenced_attachment',
            isDestructive: true,
            params: { attachmentId: pdf.id, name: pdf.name, type: 'pdf' },
          },
        ],
      });
    }
  }

  // 2. Detect duplicate images across notes by dataUrl length or content match
  const imageHashToNotes = new Map<
    string,
    Array<{ noteId: string; noteTitle: string; imageId: string; name: string }>
  >();

  for (const n of nonTrashedNotes) {
    for (const img of n.images || []) {
      const dataUrl = typeof img === 'string' ? img : img?.dataUrl;
      if (!dataUrl) continue;

      const imgName = typeof img === 'string' ? 'Embedded Image' : img.name || 'Image';
      const imgId = typeof img === 'string' ? `img-${dataUrl.slice(0, 16)}` : img.id || 'img';

      // Use content substring or length as stable key
      const key = `${dataUrl.length}-${dataUrl.slice(0, 80)}`;
      if (!imageHashToNotes.has(key)) {
        imageHashToNotes.set(key, []);
      }
      imageHashToNotes.get(key)!.push({
        noteId: n.id,
        noteTitle: n.title,
        imageId: imgId,
        name: imgName,
      });
    }
  }

  for (const [key, occurrences] of imageHashToNotes.entries()) {
    if (occurrences.length > 1) {
      issues.push({
        id: `dup-img-${key.slice(0, 20)}`,
        category: 'attachments',
        type: 'duplicate_attachment',
        severity: 'info',
        title: `Duplicate Image Attachment: "${occurrences[0].name}"`,
        description: `Identical image attachment exists across ${occurrences.length} notes (${occurrences
          .map((o) => `"${o.noteTitle}"`)
          .join(', ')}).`,
        metadata: {
          count: occurrences.length,
          duplicateIds: occurrences.map((o) => o.imageId),
        },
        suggestedActions: [],
      });
    }
  }

  return issues;
}

/**
 * Scan Invalid Content Structures:
 * - Broken transclusions
 * - Malformed query blocks
 * - Stale canvas note references
 */
export function scanInvalidStructures(
  vaultIndex: VaultIndex,
  notes: Note[],
  canvasBoards: CanvasBoard[] = []
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const notesMap = new Map<string, Note>();
  for (const n of notes) {
    if (n && !n.trashed) notesMap.set(n.id, n);
  }

  // 1. Scan Broken Transclusions
  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    for (const embed of parsed.embeds) {
      const transRes = resolveTransclusion(embed.raw.replace(/^!\[\[/, '').replace(/\]\]$/, ''), noteId, vaultIndex, {
        allNotesLookup: notesMap,
      });

      if (transRes.status !== 'resolved') {
        let severity: DiagnosticSeverity = 'error';
        let desc = transRes.error || `Transclusion "${embed.raw}" could not be resolved.`;

        if (transRes.status === 'circular_dependency') {
          desc = `Circular transclusion detected: ${transRes.cycleChain?.join(' ➔ ')}`;
        }

        issues.push({
          id: `broken-transclusion-${noteId}-${embed.charOffset}`,
          category: 'invalid_structures',
          type: 'broken_transclusion',
          severity,
          title: `Broken Transclusion: ${embed.raw}`,
          description: desc,
          sourceId: noteId,
          sourceName: parsed.title,
          targetName: embed.target,
          location: {
            line: embed.line,
            charOffset: embed.charOffset,
            rawSnippet: embed.raw,
          },
          suggestedActions: [
            {
              id: `fix-transclusion-${noteId}-${embed.charOffset}`,
              label: 'Update Transclusion Target',
              description: 'Select replacement note target',
              actionType: 'repoint_link',
              requiresTargetSelection: true,
              params: { sourceNoteId: noteId, oldLinkRaw: embed.raw },
            },
          ],
        });
      }
    }
  }

  // 2. Scan Malformed Query Blocks
  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    for (const codeBlock of parsed.codeBlocks) {
      if (codeBlock.type === 'query' || codeBlock.language.toLowerCase() === 'query') {
        const queryRes = parseSmartQuery(codeBlock.content);
        if (queryRes.error) {
          issues.push({
            id: `query-err-${noteId}-${codeBlock.lineStart}`,
            category: 'invalid_structures',
            type: 'malformed_query_block',
            severity: 'warning',
            title: `Malformed Smart Query in "${parsed.title}"`,
            description: `Query syntax error at line ${queryRes.error.line}, col ${queryRes.error.column}: ${queryRes.error.message}.${
              queryRes.error.suggestion ? ` ${queryRes.error.suggestion}` : ''
            }`,
            sourceId: noteId,
            sourceName: parsed.title,
            location: {
              line: codeBlock.lineStart + (queryRes.error.line - 1),
              rawSnippet: codeBlock.content,
            },
            metadata: {
              querySyntaxError: queryRes.error.message,
              querySuggestion: queryRes.error.suggestion,
            },
            suggestedActions: [
              {
                id: `fix-query-${noteId}-${codeBlock.lineStart}`,
                label: 'Edit Query Block',
                description: 'Open note to fix the query syntax',
                actionType: 'open_note',
                params: { noteId },
              },
            ],
          });
        }
      }
    }
  }

  // 3. Scan Stale Canvas Note References
  for (const board of canvasBoards) {
    const rawNodes = board.nodes || [];
    const boardTitle = board.title || (board as any).name || 'Canvas';
    const staleNodes = rawNodes.filter((node) => {
      if (node.type === 'note' && (node as any).noteId) {
        return !vaultIndex.notes[(node as any).noteId];
      }
      return false;
    });

    if (staleNodes.length > 0) {
      issues.push({
        id: `stale-canvas-note-${board.id}`,
        category: 'invalid_structures',
        type: 'stale_canvas_note_ref',
        severity: 'warning',
        title: `Stale Note Cards on Canvas "${boardTitle}"`,
        description: `Board "${boardTitle}" contains ${staleNodes.length} card(s) referencing notes that have been deleted from your vault.`,
        sourceId: board.id,
        sourceName: boardTitle,
        metadata: {
          boardId: board.id,
          staleNodeIds: staleNodes.map((n) => n.id),
          count: staleNodes.length,
        },
        suggestedActions: [
          {
            id: `remove-stale-nodes-${board.id}`,
            label: `Remove Stale Cards (${staleNodes.length})`,
            description: 'Clean orphaned note cards from this spatial canvas',
            actionType: 'remove_stale_canvas_node',
            isDestructive: true,
            params: { boardId: board.id, staleNodeIds: staleNodes.map((n) => n.id) },
          },
          {
            id: `open-canvas-${board.id}`,
            label: 'Open Canvas',
            description: 'Inspect canvas board',
            actionType: 'open_canvas',
            params: { boardId: board.id },
          },
        ],
      });
    }
  }

  return issues;
}

/**
 * Scan Possible Duplicates across the vault
 */
export function scanPossibleDuplicates(notes: Note[], vaultIndex?: VaultIndex): DiagnosticIssue[] {
  const { pairs } = detectVaultDuplicates(notes, vaultIndex);
  const issues: DiagnosticIssue[] = [];

  for (const pair of pairs) {
    issues.push({
      id: `dup-pair-${pair.id}`,
      category: 'possible_duplicates',
      type: 'duplicate_note_pair',
      severity: pair.level === 'exact' ? 'warning' : 'info',
      title: `Possible Duplicate: "${pair.noteATitle}" & "${pair.noteBTitle}"`,
      description: `${pair.reason} (Similarity: ${Math.round(pair.similarityScore * 100)}%)`,
      sourceId: pair.noteAId,
      sourceName: pair.noteATitle,
      targetName: pair.noteBTitle,
      metadata: {
        target: pair.noteBId,
        count: Math.round(pair.similarityScore * 100),
      },
      suggestedActions: [
        {
          id: `compare-${pair.id}`,
          label: 'Compare & Merge',
          description: 'Side-by-side diff comparison and 1-click merge with preserved backlinks',
          actionType: 'compare_duplicates',
          params: {
            pairId: pair.id,
            noteAId: pair.noteAId,
            noteBId: pair.noteBId,
            similarityScore: pair.similarityScore,
            reason: pair.reason,
          },
        },
        {
          id: `ignore-${pair.id}`,
          label: 'Ignore Pair',
          description: 'Dismiss duplicate suggestion for these notes',
          actionType: 'ignore_duplicate_pair',
          params: { pairId: pair.id },
        },
      ],
    });
  }

  return issues;
}

/**
 * Scan Orphan Notes for Suggested Connections
 */
export function scanOrphanConnectionsDiagnostics(notes: Note[], vaultIndex?: VaultIndex): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const nonTrashed = notes.filter((n) => !n.trashed);

  for (const note of nonTrashed) {
    if (isNoteOrphan(note.id, nonTrashed, vaultIndex)) {
      const suggestions = suggestOrphanConnections(note.id, nonTrashed, vaultIndex, { limit: 3 });
      if (suggestions.length > 0) {
        issues.push({
          id: `orphan-conn-${note.id}`,
          category: 'orphan_connections',
          type: 'orphan_connection_suggestion',
          severity: 'info',
          title: `Suggested Connections for Orphan: "${note.title}"`,
          description: `Identified ${suggestions.length} potential connection(s): ${suggestions.map((s) => `"${s.targetTitle}"`).join(', ')}`,
          sourceId: note.id,
          sourceName: note.title,
          metadata: {
            candidates: suggestions.map((s) => ({ noteId: s.targetNoteId, title: s.targetTitle })),
          },
          suggestedActions: suggestions.map((s) => ({
            id: `conn-${note.id}-${s.targetNoteId}`,
            label: `Link to "${s.targetTitle}"`,
            description: s.rationale,
            actionType: 'apply_orphan_connection' as const,
            params: { orphanNoteId: note.id, targetTitle: s.targetTitle, targetNoteId: s.targetNoteId },
          })),
        });
      }
    }
  }

  return issues;
}

/**
 * Scan MOC Hub Opportunities for Clusters
 */
export function scanMOCClusterDiagnostics(notes: Note[], vaultIndex?: VaultIndex): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const clusters = detectMOCClusters(notes, vaultIndex);

  for (const cluster of clusters) {
    issues.push({
      id: `moc-cluster-${cluster.id}`,
      category: 'moc_clusters',
      type: 'unhubbed_moc_cluster',
      severity: 'info',
      title: `Suggested Topic Hub: "${cluster.suggestedTitle}"`,
      description: `Detected cohesive cluster of ${cluster.memberNoteIds.length} notes (${cluster.dominantTerms.join(', ')}) without a central MOC hub.`,
      sourceId: cluster.id,
      sourceName: cluster.suggestedTitle,
      metadata: {
        count: cluster.memberNoteIds.length,
        candidates: cluster.memberNoteIds.map((id, idx) => ({ noteId: id, title: cluster.memberTitles[idx] })),
      },
      suggestedActions: [
        {
          id: `create-moc-${cluster.id}`,
          label: `Create "${cluster.suggestedTitle}"`,
          description: 'Generate living or manual Map of Content',
          actionType: 'create_moc_from_cluster',
          params: { cluster },
        },
      ],
    });
  }

  return issues;
}

/**
 * Safe string byte length calculation for browser and Node environments
 */
function getByteLength(str: string): number {
  try {
    if (typeof Blob !== 'undefined') {
      return new Blob([str]).size;
    }
  } catch {
    // Fall through
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8');
  }
  return str.length;
}

/**
 * Calculate detailed Storage Breakdown and query browser storage quota estimates
 */
export async function scanStorageBreakdown(
  notes: Note[],
  folders: Folder[],
  canvasBoards: CanvasBoard[] = [],
  pdfAttachments: PDFAttachment[] = []
): Promise<StorageBreakdown> {
  let notesBytes = 0;
  let imagesBytes = 0;
  let audioBytes = 0;
  let imageCount = 0;
  let audioCount = 0;

  for (const n of notes) {
    // Note text size
    const textStr = JSON.stringify({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: n.tags,
      checklist: n.checklist,
    });
    notesBytes += getByteLength(textStr);

    // Images size
    for (const img of n.images || []) {
      imageCount++;
      if (typeof img === 'string') {
        imagesBytes += getByteLength(img);
      } else if (img && typeof img === 'object') {
        imagesBytes += (img as any).size || getByteLength((img as any).dataUrl || '');
      }
    }

    // Audio size
    for (const aud of n.audios || []) {
      audioCount++;
      if (aud && typeof aud === 'object') {
        audioBytes += (aud as any).size || getByteLength((aud as any).dataUrl || '');
      }
    }
  }

  // PDFs size
  let pdfBytes = 0;
  for (const pdf of pdfAttachments) {
    pdfBytes += pdf.size || (pdf as any).sizeBytes || 0;
  }

  // Canvases size
  let canvasBytes = 0;
  for (const board of canvasBoards) {
    canvasBytes += getByteLength(JSON.stringify(board));
  }

  // Cache & metadata estimate
  const cacheEstimatedBytes = Math.round((notesBytes + canvasBytes) * 0.4);

  const totalAppBytes = notesBytes + imagesBytes + audioBytes + pdfBytes + canvasBytes + cacheEstimatedBytes;

  // Browser Storage Quota Estimate API
  let quotaReport: StorageBreakdown['quotaReport'] | undefined;
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    try {
      const est = await navigator.storage.estimate();
      if (est.quota && est.usage !== undefined) {
        quotaReport = {
          usage: est.usage,
          quota: est.quota,
          usagePercent: Math.round((est.usage / est.quota) * 1000) / 10,
          isEstimate: true,
        };
      }
    } catch {
      // Ignore estimation errors
    }
  }

  return {
    notesBytes,
    notesCount: notes.length,
    imagesBytes,
    imagesCount: imageCount,
    pdfBytes,
    pdfCount: pdfAttachments.length,
    audioBytes,
    audioCount,
    canvasBytes,
    canvasCount: canvasBoards.length,
    otherAttachmentsBytes: 0,
    otherAttachmentsCount: 0,
    cacheEstimatedBytes,
    totalAppBytes,
    quotaReport,
  };
}

/**
 * Execute full comprehensive vault diagnostics
 */
export async function runFullVaultDiagnostics(
  notes: Note[],
  folders: Folder[],
  canvasBoards: CanvasBoard[] = [],
  pdfAttachments: PDFAttachment[] = [],
  vaultIndex?: VaultIndex,
  onProgress?: (progress: DiagnosticsScanProgress) => void
): Promise<VaultDiagnosticsReport> {
  const startTime = performance.now();

  onProgress?.({
    phase: 'Building Vault Index',
    currentStep: 1,
    totalSteps: 7,
    percent: 15,
  });

  const index = vaultIndex || buildVaultIndex(notes);

  onProgress?.({
    phase: 'Scanning Broken WikiLinks',
    currentStep: 2,
    totalSteps: 7,
    percent: 30,
  });
  const brokenLinks = scanBrokenWikiLinks(index, notes);

  onProgress?.({
    phase: 'Scanning Ambiguous Links & Orphans',
    currentStep: 3,
    totalSteps: 7,
    percent: 45,
  });
  const ambiguousLinks = scanAmbiguousLinks(index, notes);
  const orphanNotes = scanOrphanNotes(index, notes);

  onProgress?.({
    phase: 'Analyzing Tags & Folder Structures',
    currentStep: 4,
    totalSteps: 7,
    percent: 60,
  });
  const tagIssues = scanTags(index, notes);
  const folderIssues = scanFolders(folders, notes);

  onProgress?.({
    phase: 'Auditing Attachments & Embedded Media',
    currentStep: 5,
    totalSteps: 8,
    percent: 65,
  });
  const attachmentIssues = scanAttachments(notes, pdfAttachments);

  onProgress?.({
    phase: 'Verifying Transclusions & Query Blocks',
    currentStep: 6,
    totalSteps: 8,
    percent: 75,
  });
  const invalidStructureIssues = scanInvalidStructures(index, notes, canvasBoards);

  onProgress?.({
    phase: 'Analyzing Knowledge Intelligence & Duplicates',
    currentStep: 7,
    totalSteps: 8,
    percent: 88,
  });
  const duplicateIssues = scanPossibleDuplicates(notes, index);
  const orphanConnectionIssues = scanOrphanConnectionsDiagnostics(notes, index);
  const mocClusterIssues = scanMOCClusterDiagnostics(notes, index);
  const reviewDiagResult = diagnoseReviewSystem(notes);
  const reviewIssues = reviewDiagResult.issues;

  onProgress?.({
    phase: 'Computing Storage Diagnostics & Quotas',
    currentStep: 8,
    totalSteps: 8,
    percent: 100,
  });
  const storageBreakdown = await scanStorageBreakdown(
    notes,
    folders,
    canvasBoards,
    pdfAttachments
  );

  const allIssues: DiagnosticIssue[] = [
    ...brokenLinks,
    ...ambiguousLinks,
    ...orphanNotes,
    ...tagIssues,
    ...folderIssues,
    ...attachmentIssues,
    ...invalidStructureIssues,
    ...duplicateIssues,
    ...orphanConnectionIssues,
    ...mocClusterIssues,
    ...reviewIssues,
  ];

  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;

  const issuesByCategory: Record<DiagnosticCategory, DiagnosticIssue[]> = {
    broken_links: brokenLinks,
    ambiguous_links: ambiguousLinks,
    orphan_notes: orphanNotes,
    tags: tagIssues,
    folders: folderIssues,
    attachments: attachmentIssues,
    storage: [],
    invalid_structures: invalidStructureIssues,
    possible_duplicates: duplicateIssues,
    orphan_connections: orphanConnectionIssues,
    moc_clusters: mocClusterIssues,
    review_system: reviewIssues,
    quarantined_resources: [],
  };

  for (const issue of allIssues) {
    if (issue.severity === 'error' || (issue.severity as string) === 'critical') errorsCount++;
    else if (issue.severity === 'warning') warningsCount++;
    else if (issue.severity === 'info') infoCount++;
  }

  const durationMs = performance.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    totalIssues: allIssues.length,
    errorsCount,
    warningsCount,
    infoCount,
    issues: allIssues,
    issuesByCategory,
    storageBreakdown,
    durationMs,
  };
}

/**
 * Fast Pre-flight Quick Diagnostics (<50ms)
 * Focuses on structural integrity: broken links, folder hierarchy, and storage estimates
 */
export async function runQuickVaultDiagnostics(
  notes: Note[],
  folders: Folder[],
  canvasBoards: CanvasBoard[] = [],
  pdfAttachments: PDFAttachment[] = []
): Promise<VaultDiagnosticsReport> {
  const startTime = performance.now();
  const index = buildVaultIndex(notes);

  const brokenLinks = scanBrokenWikiLinks(index, notes);
  const tagIssues = scanTags(index, notes);
  const folderIssues = scanFolders(folders, notes);
  const invalidStructureIssues = scanInvalidStructures(index, notes, canvasBoards);
  const storageBreakdown = await scanStorageBreakdown(notes, folders, canvasBoards, pdfAttachments);

  const allIssues: DiagnosticIssue[] = [
    ...brokenLinks,
    ...tagIssues,
    ...folderIssues,
    ...invalidStructureIssues,
  ];

  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;

  const issuesByCategory: Record<DiagnosticCategory, DiagnosticIssue[]> = {
    broken_links: brokenLinks,
    ambiguous_links: [],
    orphan_notes: [],
    tags: tagIssues,
    folders: folderIssues,
    attachments: [],
    storage: [],
    invalid_structures: invalidStructureIssues,
    possible_duplicates: [],
    orphan_connections: [],
    moc_clusters: [],
    review_system: [],
    quarantined_resources: [],
  };

  for (const issue of allIssues) {
    if (issue.severity === 'error' || (issue.severity as string) === 'critical') errorsCount++;
    else if (issue.severity === 'warning') warningsCount++;
    else if (issue.severity === 'info') infoCount++;
  }

  return {
    timestamp: new Date().toISOString(),
    totalIssues: allIssues.length,
    errorsCount,
    warningsCount,
    infoCount,
    issues: allIssues,
    issuesByCategory,
    storageBreakdown,
    durationMs: performance.now() - startTime,
  };
}


// ==========================================
// REPAIR & FIX HELPERS
// ==========================================

/**
 * Safely create a missing note to resolve broken links
 */
export function repairCreateMissingNote(
  title: string,
  options?: { folderId?: string | null; tags?: string[] }
): Note {
  const newNote: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    content: `# ${title.trim()}\n\nCreated automatically by Vault Doctor to resolve links.`,
    type: 'text',
    checklist: [],
    color: 'default',
    tags: options?.tags || [],
    folderId: options?.folderId || null,
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reminderDate: null,
    images: [],
  };
  return newNote;
}

/**
 * Safely repoint a link inside a source note's content
 */
export function repairRepointLink(
  sourceNote: Note,
  oldLinkRaw: string,
  newTarget: string,
  newAlias?: string
): Note {
  let replacement = `[[${newTarget}${newAlias ? `|${newAlias}` : ''}]]`;
  if (oldLinkRaw.startsWith('!')) {
    replacement = `!${replacement}`;
  }

  const updatedContent = (sourceNote.content || '').replace(oldLinkRaw, replacement);

  return {
    ...sourceNote,
    content: updatedContent,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merge multiple tag casing variants into a single canonical tag across notes
 */
export function repairMergeTags(
  notes: Note[],
  canonicalTag: string,
  variantTags: string[]
): Note[] {
  const lowerCanonical = canonicalTag.toLowerCase();
  const variantsSet = new Set(variantTags.map((v) => v.toLowerCase()));

  return notes.map((note) => {
    let modified = false;

    // 1. Update note.tags array
    const updatedTags: string[] = [];
    const seen = new Set<string>();

    for (const t of note.tags || []) {
      if (variantsSet.has(t.toLowerCase())) {
        if (!seen.has(canonicalTag)) {
          updatedTags.push(canonicalTag);
          seen.add(canonicalTag);
          if (t !== canonicalTag) modified = true;
        }
      } else {
        if (!seen.has(t)) {
          updatedTags.push(t);
          seen.add(t);
        }
      }
    }

    // 2. Update inline #tag occurrences in markdown content
    let updatedContent = note.content || '';
    for (const v of variantTags) {
      if (v !== canonicalTag) {
        const regex = new RegExp(`#${v}\\b`, 'g');
        if (regex.test(updatedContent)) {
          updatedContent = updatedContent.replace(regex, `#${canonicalTag}`);
          modified = true;
        }
      }
    }

    if (modified) {
      return {
        ...note,
        tags: updatedTags,
        content: updatedContent,
        updatedAt: new Date().toISOString(),
      };
    }
    return note;
  });
}

/**
 * Remove stale note cards from a CanvasBoard
 */
export function repairRemoveStaleCanvasNodes(
  board: CanvasBoard,
  staleNodeIds: string[]
): CanvasBoard {
  const staleSet = new Set(staleNodeIds);

  const rawNodes = board.nodes || [];
  const rawConnectors = board.connectors || (board as any).edges || [];

  const updatedNodes = rawNodes.filter((n) => !staleSet.has(n.id));
  const updatedConnectors = rawConnectors.filter(
    (c: any) => !staleSet.has(c.fromNodeId) && !staleSet.has(c.toNodeId)
  );

  return {
    ...board,
    nodes: updatedNodes,
    connectors: updatedConnectors,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create recovery checkpoint before performing bulk fixes
 */
export function createRecoveryCheckpoint(
  notes: Note[],
  folders: Folder[],
  savedSearches: SavedSearch[],
  settings: AppSettings,
  description = 'Pre-Doctor Cleanup Checkpoint'
): RepairCheckpoint {
  const checkpoint: RepairCheckpoint = {
    id: `checkpoint-${Date.now()}`,
    timestamp: new Date().toISOString(),
    description,
    backupJSON: JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        description,
        notes,
        folders,
        savedSearches,
        settings,
      },
      null,
      2
    ),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('keepnotes_last_checkpoint', JSON.stringify(checkpoint));
    }
  } catch {
    // ignore
  }

  return checkpoint;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merges a duplicate note into a surviving note, consolidating tags, images, audios,
 * and automatically rewriting all backlinks in the vault to point to the surviving note.
 */
export function repairMergeDuplicateNotes(
  notes: Note[],
  survivingNoteId: string,
  discardedNoteId: string,
  mergedContent: string,
  customTitle?: string
): { updatedNotes: Note[]; survivingNote: Note; discardedNote: Note; rewrittenLinksCount: number } {
  const surviving = notes.find((n) => n.id === survivingNoteId);
  const discarded = notes.find((n) => n.id === discardedNoteId);

  if (!surviving || !discarded) {
    throw new Error('Both surviving and discarded notes must exist to merge.');
  }

  // 1. Union of tags
  const mergedTags = Array.from(
    new Set([...(surviving.tags || []), ...(discarded.tags || [])])
  );

  // 2. Union of images
  const existingImageUrls = new Set(
    (surviving.images || []).map((img) => (typeof img === 'string' ? img : img.dataUrl))
  );
  const mergedImages = [...(surviving.images || [])];
  for (const img of discarded.images || []) {
    const url = typeof img === 'string' ? img : img.dataUrl;
    if (!existingImageUrls.has(url)) {
      mergedImages.push(img);
      existingImageUrls.add(url);
    }
  }

  // 3. Union of audios
  const existingAudioUrls = new Set((surviving.audios || []).map((a) => a.dataUrl));
  const mergedAudios = [...(surviving.audios || [])];
  for (const aud of discarded.audios || []) {
    if (!existingAudioUrls.has(aud.dataUrl)) {
      mergedAudios.push(aud);
      existingAudioUrls.add(aud.dataUrl);
    }
  }

  const finalSurvivingNote: Note = {
    ...surviving,
    title: customTitle || surviving.title,
    content: mergedContent,
    tags: mergedTags,
    images: mergedImages,
    audios: mergedAudios,
    pinned: surviving.pinned || discarded.pinned,
    isFavorite: surviving.isFavorite || discarded.isFavorite,
    updatedAt: new Date().toISOString(),
  };

  const finalDiscardedNote: Note = {
    ...discarded,
    trashed: true,
    updatedAt: new Date().toISOString(),
  };

  // 4. Update all backlinks across other notes
  let rewrittenLinksCount = 0;
  const discardedTitle = discarded.title?.trim();
  const survivingTitle = finalSurvivingNote.title?.trim();

  const updatedNotes = notes.map((n) => {
    if (n.id === survivingNoteId) return finalSurvivingNote;
    if (n.id === discardedNoteId) return finalDiscardedNote;

    let content = n.content || '';
    let modified = false;

    if (discardedTitle && survivingTitle && discardedTitle !== survivingTitle) {
      const linkRegex = new RegExp(`\\[\\[${escapeRegex(discardedTitle)}(\\|([^\\]]+))?\\]\\]`, 'gi');
      if (linkRegex.test(content)) {
        content = content.replace(linkRegex, (_match, _hasAlias, aliasText) => {
          rewrittenLinksCount++;
          modified = true;
          return aliasText ? `[[${survivingTitle}|${aliasText}]]` : `[[${survivingTitle}]]`;
        });
      }
    }

    // Also update linkedNoteIds array if present
    let linkedNoteIds = n.linkedNoteIds;
    if (linkedNoteIds && linkedNoteIds.includes(discardedNoteId)) {
      linkedNoteIds = Array.from(
        new Set(
          linkedNoteIds.map((id) => (id === discardedNoteId ? survivingNoteId : id))
        )
      );
      modified = true;
    }

    if (modified) {
      return {
        ...n,
        content,
        linkedNoteIds,
        updatedAt: new Date().toISOString(),
      };
    }

    return n;
  });

  return {
    updatedNotes,
    survivingNote: finalSurvivingNote,
    discardedNote: finalDiscardedNote,
    rewrittenLinksCount,
  };
}
