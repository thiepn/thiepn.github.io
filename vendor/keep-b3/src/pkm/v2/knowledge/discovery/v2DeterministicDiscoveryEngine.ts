/**
 * V2.17 Deterministic Local Knowledge Discovery Engine
 * 
 * Computes related note candidates using deterministic graph proximity and lexical overlap,
 * prioritizing explicit connections, providing human-readable explanations, and operating
 * with zero AI or cloud dependencies.
 */

export interface RelatedNoteSuggestion {
  targetNoteId: string;
  targetNoteTitle: string;
  similarityScore: number;
  explanation: string;
  sharedTerms: string[];
  connectionPath?: string[];
}

export class V2DeterministicDiscoveryEngine {
  private static instance: V2DeterministicDiscoveryEngine | null = null;
  private readonly stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'be',
    'this', 'that', 'with', 'from', 'by', 'as', 'are', 'was', 'were', 'will', 'have', 'has'
  ]);

  private constructor() {}

  public static getInstance(): V2DeterministicDiscoveryEngine {
    if (!V2DeterministicDiscoveryEngine.instance) {
      V2DeterministicDiscoveryEngine.instance = new V2DeterministicDiscoveryEngine();
    }
    return V2DeterministicDiscoveryEngine.instance;
  }

  /**
   * Tokenizes text into unique lowercase significant word stems.
   */
  public extractSignificantTerms(text: string): Set<string> {
    const tokens = text.toLowerCase().match(/\b[a-zA-Z]{3,}\b/g) || [];
    const significant = new Set<string>();
    for (const t of tokens) {
      if (!this.stopWords.has(t)) {
        significant.add(t);
      }
    }
    return significant;
  }

  /**
   * Finds related notes deterministically without AI.
   */
  public findRelatedNotes(
    currentNote: { id: string; title: string; content: string; tags?: string[]; relations?: Array<{ type: string; targetId: string }> },
    allNotes: Array<{ id: string; title: string; content: string; tags?: string[]; relations?: Array<{ type: string; targetId: string }> }>
  ): RelatedNoteSuggestion[] {
    const currentTerms = this.extractSignificantTerms(currentNote.content);
    const currentTags = new Set((currentNote.tags || []).map((t) => t.toLowerCase()));
    const suggestions: RelatedNoteSuggestion[] = [];

    for (const candidate of allNotes) {
      if (candidate.id === currentNote.id) continue;

      let score = 0;
      const explanationParts: string[] = [];
      const sharedTermsList: string[] = [];

      // 1. Explicit shared relations (Graph proximity)
      if (currentNote.relations && candidate.relations) {
        const sharedTarget = currentNote.relations.find((r1) => candidate.relations!.some((r2) => r2.targetId === r1.targetId));
        if (sharedTarget) {
          score += 40;
          explanationParts.push(`Co-connected to Resource (${sharedTarget.type})`);
        }
      }

      // 2. Shared Topic Tags
      const candidateTags = (candidate.tags || []).map((t) => t.toLowerCase());
      const sharedTags = candidateTags.filter((t) => currentTags.has(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 15;
        explanationParts.push(`Shares topic tags: #${sharedTags.join(', #')}`);
      }

      // 3. Lexical Jaccard Term Overlap
      const candidateTerms = this.extractSignificantTerms(candidate.content);
      const intersection: string[] = [];
      for (const term of currentTerms) {
        if (candidateTerms.has(term)) {
          intersection.push(term);
        }
      }

      if (intersection.length >= 2) {
        score += Math.min(intersection.length * 5, 30);
        sharedTermsList.push(...intersection.slice(0, 5));
        explanationParts.push(`Shares ${intersection.length} key terms (${intersection.slice(0, 3).join(', ')})`);
      }

      if (score >= 15) {
        suggestions.push({
          targetNoteId: candidate.id,
          targetNoteTitle: candidate.title,
          similarityScore: Math.min(score, 100),
          explanation: explanationParts.join('; '),
          sharedTerms: sharedTermsList,
        });
      }
    }

    return suggestions.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 10);
  }
}

export const v2DeterministicDiscoveryEngine = V2DeterministicDiscoveryEngine.getInstance();
