import {
  VaultIndex,
  ParsedNote,
  ResolvedLinkTarget,
  ResolutionStatus,
  PKMHeading,
  PKMBlock,
} from './types';
import { slugify } from './parser';

export interface ResolveOptions {
  currentNoteId?: string; // If resolving relative subpaths like [[#Heading]] within same note
}

/**
 * Canonical Resolver for PKM Links & Targets
 */
export class PKMResolver {
  /**
   * Resolves a target string (e.g. "Project Plan", "note:id123", "Plan#Architecture", "#Summary", "Plan#^block-1")
   * against the provided VaultIndex.
   */
  static resolveLink(
    targetRaw: string,
    vaultIndex: VaultIndex,
    options?: ResolveOptions
  ): ResolvedLinkTarget {
    const rawTrimmed = targetRaw.trim();
    if (!rawTrimmed) {
      return { status: 'missing', targetRaw };
    }

    // 1. Separate target note part from subpath (#Heading or #^block-id)
    let noteTargetPart = rawTrimmed;
    let subpathPart: string | null = null;
    const hashIdx = rawTrimmed.indexOf('#');

    if (hashIdx > -1) {
      noteTargetPart = rawTrimmed.slice(0, hashIdx).trim();
      subpathPart = rawTrimmed.slice(hashIdx + 1).trim();
    }

    let targetParsedNote: ParsedNote | null = null;
    let resolutionStatus: ResolutionStatus = 'missing';
    let candidates: Array<{ noteId: string; title: string }> | undefined;

    // 2. Intra-note reference (e.g. "[[#Architecture]]" or "[[#^b1]]" within current note)
    if (!noteTargetPart && subpathPart && options?.currentNoteId) {
      targetParsedNote = vaultIndex.notes[options.currentNoteId] || null;
      if (targetParsedNote) {
        resolutionStatus = 'resolved';
      }
    }
    // 3. Direct ID reference (e.g. "note:note-welcome" or matching exact note ID)
    else if (noteTargetPart.startsWith('note:')) {
      const explicitId = noteTargetPart.slice(5).trim();
      if (vaultIndex.notes[explicitId]) {
        targetParsedNote = vaultIndex.notes[explicitId];
        resolutionStatus = 'resolved';
      } else {
        resolutionStatus = 'missing';
      }
    }
    // 4. Exact note ID lookup
    else if (vaultIndex.notes[noteTargetPart]) {
      targetParsedNote = vaultIndex.notes[noteTargetPart];
      resolutionStatus = 'resolved';
    }
    // 5. Title / Alias lookup
    else if (noteTargetPart) {
      const normalizedTarget = noteTargetPart.toLowerCase();

      // Check title lookup
      const titleMatches = vaultIndex.titleToNoteIds[normalizedTarget] || [];
      
      if (titleMatches.length === 1) {
        targetParsedNote = vaultIndex.notes[titleMatches[0]] || null;
        resolutionStatus = targetParsedNote ? 'resolved' : 'missing';
      } else if (titleMatches.length > 1) {
        resolutionStatus = 'ambiguous';
        candidates = titleMatches.map((id) => ({
          noteId: id,
          title: vaultIndex.notes[id]?.title || id,
        }));
      } else {
        // Check alias lookup
        const aliasMatches = vaultIndex.aliasToNoteIds[normalizedTarget] || [];
        if (aliasMatches.length === 1) {
          targetParsedNote = vaultIndex.notes[aliasMatches[0]] || null;
          resolutionStatus = targetParsedNote ? 'resolved' : 'missing';
        } else if (aliasMatches.length > 1) {
          resolutionStatus = 'ambiguous';
          candidates = aliasMatches.map((id) => ({
            noteId: id,
            title: vaultIndex.notes[id]?.title || id,
          }));
        } else {
          resolutionStatus = 'missing';
        }
      }
    }

    if (resolutionStatus !== 'resolved' || !targetParsedNote) {
      return {
        status: resolutionStatus,
        targetRaw,
        candidates,
      };
    }

    // 6. Resolve Subpath (Heading or Block)
    let resolvedHeading: PKMHeading | undefined;
    let resolvedBlock: PKMBlock | undefined;
    let subpathStatus: 'found' | 'not_found' | 'none' = 'none';

    if (subpathPart) {
      if (subpathPart.startsWith('^')) {
        const blockId = subpathPart.slice(1).trim();
        resolvedBlock = targetParsedNote.blockMap[blockId];
        subpathStatus = resolvedBlock ? 'found' : 'not_found';
      } else {
        const targetSlug = slugify(subpathPart);
        const lowerText = subpathPart.toLowerCase();

        resolvedHeading = targetParsedNote.headings.find(
          (h) => h.slug === targetSlug || h.text.toLowerCase() === lowerText
        );
        subpathStatus = resolvedHeading ? 'found' : 'not_found';
      }
    }

    return {
      status: 'resolved',
      targetRaw,
      resolvedNoteId: targetParsedNote.noteId,
      resolvedNoteTitle: targetParsedNote.title,
      resolvedHeading,
      resolvedBlock,
      subpathStatus,
    };
  }

  /**
   * Resolves all outgoing links of a given note to their current targets in the vault
   */
  static resolveAllOutgoing(
    note: ParsedNote,
    vaultIndex: VaultIndex
  ): {
    resolved: Array<{ link: ParsedNote['outgoingLinks'][0]; target: ResolvedLinkTarget }>;
    unresolved: Array<ParsedNote['outgoingLinks'][0]>;
    ambiguous: Array<{ link: ParsedNote['outgoingLinks'][0]; candidates: Array<{ noteId: string; title: string }> }>;
  } {
    const resolved: Array<{ link: ParsedNote['outgoingLinks'][0]; target: ResolvedLinkTarget }> = [];
    const unresolved: Array<ParsedNote['outgoingLinks'][0]> = [];
    const ambiguous: Array<{ link: ParsedNote['outgoingLinks'][0]; candidates: Array<{ noteId: string; title: string }> }> = [];

    for (const link of note.outgoingLinks) {
      const res = this.resolveLink(link.target, vaultIndex, { currentNoteId: note.noteId });
      if (res.status === 'resolved') {
        resolved.push({ link, target: res });
      } else if (res.status === 'ambiguous') {
        ambiguous.push({ link, candidates: res.candidates || [] });
      } else {
        unresolved.push(link);
      }
    }

    return { resolved, unresolved, ambiguous };
  }
}
