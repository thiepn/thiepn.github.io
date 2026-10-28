/**
 * V2.17 Knowledge Maps & Living MOC (Maps of Content) Engine
 * 
 * Manages user-owned Maps of Content, generates deterministic link suggestions,
 * and detects broken or orphaned MOC entries without forcing automatic mutations.
 */

export interface MOCSuggestedAddition {
  noteId: string;
  noteTitle: string;
  reason: string;
  relevanceScore: number;
}

export interface MOCDiagnosticResult {
  mocNoteId: string;
  mocTitle: string;
  totalLinkedNotes: number;
  brokenLinkCount: number;
  brokenLinks: Array<{ raw: string; targetTitle: string }>;
  suggestedAdditions: MOCSuggestedAddition[];
}

export class V2MocMaintenanceEngine {
  private static instance: V2MocMaintenanceEngine | null = null;

  private constructor() {}

  public static getInstance(): V2MocMaintenanceEngine {
    if (!V2MocMaintenanceEngine.instance) {
      V2MocMaintenanceEngine.instance = new V2MocMaintenanceEngine();
    }
    return V2MocMaintenanceEngine.instance;
  }

  /**
   * Analyzes an existing Map of Content Note for broken links and candidate additions.
   */
  public analyzeMOC(
    mocNote: { id: string; title: string; content: string; tags?: string[] },
    allNotes: Array<{ id: string; title: string; content: string; tags?: string[]; relations?: Array<{ type: string; targetId: string }> }>
  ): MOCDiagnosticResult {
    const titleMap = new Map<string, { id: string; title: string }>();
    for (const n of allNotes) {
      titleMap.set(n.title.toLowerCase(), { id: n.id, title: n.title });
    }

    // Extract links in MOC
    const linkRegex = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
    let match: RegExpExecArray | null;
    const existingLinkedTitles = new Set<string>();
    const brokenLinks: Array<{ raw: string; targetTitle: string }> = [];

    while ((match = linkRegex.exec(mocNote.content)) !== null) {
      const targetTitle = match[1].trim();
      existingLinkedTitles.add(targetTitle.toLowerCase());

      if (!titleMap.has(targetTitle.toLowerCase())) {
        brokenLinks.push({
          raw: match[0],
          targetTitle,
        });
      }
    }

    // Identify suggested candidate additions
    const suggestions: MOCSuggestedAddition[] = [];
    const mocTags = new Set((mocNote.tags || []).map((t) => t.toLowerCase()));

    for (const note of allNotes) {
      if (note.id === mocNote.id) continue;
      if (existingLinkedTitles.has(note.title.toLowerCase())) continue; // Already linked

      // 1. Backlink candidate: Note explicitly links to this MOC
      if (note.content.includes(`[[${mocNote.title}`) || note.content.toLowerCase().includes(`[[${mocNote.title.toLowerCase()}`)) {
        suggestions.push({
          noteId: note.id,
          noteTitle: note.title,
          reason: `Explicitly links back to [[${mocNote.title}]]`,
          relevanceScore: 95,
        });
        continue;
      }

      // 2. Shared tags candidate
      const noteTags = (note.tags || []).map((t) => t.toLowerCase());
      const sharedTags = noteTags.filter((t) => mocTags.has(t));
      if (sharedTags.length > 0) {
        suggestions.push({
          noteId: note.id,
          noteTitle: note.title,
          reason: `Shares topic tags: #${sharedTags.join(', #')}`,
          relevanceScore: 80 + sharedTags.length * 5,
        });
        continue;
      }

      // 3. Explicit typed relation
      if (note.relations && note.relations.some((r) => r.targetId === mocNote.id)) {
        suggestions.push({
          noteId: note.id,
          noteTitle: note.title,
          reason: 'Connected via explicit structural relation',
          relevanceScore: 90,
        });
      }
    }

    return {
      mocNoteId: mocNote.id,
      mocTitle: mocNote.title,
      totalLinkedNotes: existingLinkedTitles.size,
      brokenLinkCount: brokenLinks.length,
      brokenLinks,
      suggestedAdditions: suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 15),
    };
  }
}

export const v2MocMaintenanceEngine = V2MocMaintenanceEngine.getInstance();
