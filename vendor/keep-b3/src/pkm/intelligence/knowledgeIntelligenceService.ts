import { Note } from '../../types';
import { VaultIndex } from '../types';
import {
  KnowledgeAssistanceSettings,
  DEFAULT_INTELLIGENCE_SETTINGS,
  KnowledgeDismissals,
  WikilinkCandidate,
  TagSuggestion,
  OrphanConnectionSuggestion,
  DuplicateCandidatePair,
  DuplicateGroup,
  MOCClusterSuggestion,
  KnowledgeExplanation,
} from './intelligenceTypes';
import { rankWikilinkCandidates, WikilinkRankerOptions } from './wikilinkRanker';
import { suggestTagsForNote, TagRecommenderOptions } from './tagRecommender';
import { suggestOrphanConnections, isNoteOrphan } from './orphanAdvisor';
import { detectVaultDuplicates } from './duplicateDetector';
import { detectMOCClusters } from './mocDetector';
import { tokenizeText } from '../lexicalRelatedness';
import { semanticManager } from '../semanticManager';

const SETTINGS_KEY = 'pkm_intelligence_settings_v1';
const DISMISSALS_KEY = 'pkm_intelligence_dismissals_v1';

class KnowledgeIntelligenceService {
  private settings: KnowledgeAssistanceSettings;
  private dismissals: KnowledgeDismissals;
  private duplicateCache: {
    vaultTimestamp: string;
    pairs: DuplicateCandidatePair[];
    groups: DuplicateGroup[];
  } | null = null;
  private mocCache: {
    vaultTimestamp: string;
    suggestions: MOCClusterSuggestion[];
  } | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.dismissals = this.loadDismissals();
  }

  private loadSettings(): KnowledgeAssistanceSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_INTELLIGENCE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_INTELLIGENCE_SETTINGS };
  }

  public saveSettings(newSettings: Partial<KnowledgeAssistanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  public getSettings(): KnowledgeAssistanceSettings {
    return { ...this.settings };
  }

  private loadDismissals(): KnowledgeDismissals {
    try {
      const stored = localStorage.getItem(DISMISSALS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return {
      dismissedTags: {},
      dismissedOrphanLinks: {},
      ignoredDuplicatePairs: [],
      dismissedMOCClusters: [],
    };
  }

  private saveDismissals(): void {
    try {
      localStorage.setItem(DISMISSALS_KEY, JSON.stringify(this.dismissals));
    } catch {
      // ignore
    }
  }

  /**
   * Clears memory caches on vault lock or zeroization
   */
  public clearCache(): void {
    this.duplicateCache = null;
    this.mocCache = null;
  }

  // --- WIKILINK SUGGESTIONS ---

  public suggestLinks(
    query: string,
    localContext: {
      activeNoteId?: string;
      activeNoteContent?: string;
      currentParagraph?: string;
      currentHeading?: string;
    },
    allNotes: Note[],
    vaultIndex?: VaultIndex,
    options: WikilinkRankerOptions = {}
  ): WikilinkCandidate[] {
    if (!this.settings.linkSuggestionsEnabled) return [];
    return rankWikilinkCandidates(query, localContext, allNotes, vaultIndex, {
      ...options,
      debugExplainability: this.settings.debugScoreExplainability,
    });
  }

  // --- TAG SUGGESTIONS ---

  public suggestTags(
    note: Note,
    allNotes: Note[],
    vaultIndex?: VaultIndex,
    options: TagRecommenderOptions = {}
  ): TagSuggestion[] {
    if (!this.settings.tagSuggestionsEnabled) return [];
    const dismissed = this.dismissals.dismissedTags[note.id] || [];
    return suggestTagsForNote(note, allNotes, vaultIndex, {
      ...options,
      dismissedTags: [...dismissed, ...(options.dismissedTags || [])],
    });
  }

  public dismissTag(noteId: string, tag: string): void {
    const clean = tag.toLowerCase().replace(/^#/, '');
    const current = this.dismissals.dismissedTags[noteId] || [];
    if (!current.includes(clean)) {
      this.dismissals.dismissedTags[noteId] = [...current, clean];
      this.saveDismissals();
    }
  }

  // --- ORPHAN SUGGESTIONS ---

  public isOrphan(noteId: string, allNotes: Note[], vaultIndex?: VaultIndex): boolean {
    return isNoteOrphan(noteId, allNotes, vaultIndex);
  }

  public suggestOrphanConnections(
    orphanNoteId: string,
    allNotes: Note[],
    vaultIndex?: VaultIndex,
    limit = 5
  ): OrphanConnectionSuggestion[] {
    const dismissed = this.dismissals.dismissedOrphanLinks[orphanNoteId] || [];
    return suggestOrphanConnections(orphanNoteId, allNotes, vaultIndex, {
      limit,
      dismissedTargets: dismissed,
    });
  }

  public dismissOrphanConnection(orphanNoteId: string, targetNoteId: string): void {
    const current = this.dismissals.dismissedOrphanLinks[orphanNoteId] || [];
    if (!current.includes(targetNoteId)) {
      this.dismissals.dismissedOrphanLinks[orphanNoteId] = [...current, targetNoteId];
      this.saveDismissals();
    }
  }

  // --- DUPLICATE DETECTION ---

  public findDuplicates(
    notes: Note[],
    vaultIndex?: VaultIndex,
    forceRefresh = false
  ): { pairs: DuplicateCandidatePair[]; groups: DuplicateGroup[] } {
    if (!this.settings.duplicateDetectionEnabled) {
      return { pairs: [], groups: [] };
    }

    const latestMod = notes
      .map((n) => n.updatedAt || '')
      .sort()
      .pop() || '';

    if (!forceRefresh && this.duplicateCache && this.duplicateCache.vaultTimestamp === latestMod) {
      return {
        pairs: this.duplicateCache.pairs.filter((p) => !this.dismissals.ignoredDuplicatePairs.includes(p.id)),
        groups: this.duplicateCache.groups,
      };
    }

    const res = detectVaultDuplicates(notes, vaultIndex, {
      similarityThreshold: this.settings.duplicateThreshold,
      ignoredPairs: this.dismissals.ignoredDuplicatePairs,
    });

    this.duplicateCache = {
      vaultTimestamp: latestMod,
      pairs: res.pairs,
      groups: res.groups,
    };

    return res;
  }

  public findDuplicatesForNote(
    noteId: string,
    notes: Note[],
    vaultIndex?: VaultIndex
  ): DuplicateCandidatePair[] {
    const all = this.findDuplicates(notes, vaultIndex);
    return all.pairs.filter((p) => p.noteAId === noteId || p.noteBId === noteId);
  }

  public ignoreDuplicatePair(pairId: string): void {
    if (!this.dismissals.ignoredDuplicatePairs.includes(pairId)) {
      this.dismissals.ignoredDuplicatePairs.push(pairId);
      this.saveDismissals();
      if (this.duplicateCache) {
        this.duplicateCache.pairs = this.duplicateCache.pairs.filter((p) => p.id !== pairId);
      }
    }
  }

  // --- MOC CLUSTER SUGGESTIONS ---

  public suggestMOCs(
    notes: Note[],
    vaultIndex?: VaultIndex,
    forceRefresh = false
  ): MOCClusterSuggestion[] {
    if (!this.settings.mocSuggestionsEnabled) return [];

    const latestMod = notes
      .map((n) => n.updatedAt || '')
      .sort()
      .pop() || '';

    if (!forceRefresh && this.mocCache && this.mocCache.vaultTimestamp === latestMod) {
      return this.mocCache.suggestions.filter(
        (s) => !this.dismissals.dismissedMOCClusters.includes(s.id)
      );
    }

    const clusters = detectMOCClusters(notes, vaultIndex, {
      minClusterSize: this.settings.minClusterSize,
      maxClusterSize: this.settings.maxClusterSize,
      dismissedClusters: this.dismissals.dismissedMOCClusters,
    });

    this.mocCache = {
      vaultTimestamp: latestMod,
      suggestions: clusters,
    };

    return clusters;
  }

  public dismissMOCCluster(clusterId: string): void {
    if (!this.dismissals.dismissedMOCClusters.includes(clusterId)) {
      this.dismissals.dismissedMOCClusters.push(clusterId);
      this.saveDismissals();
      if (this.mocCache) {
        this.mocCache.suggestions = this.mocCache.suggestions.filter((s) => s.id !== clusterId);
      }
    }
  }

  // --- RELATED NOTES & EXPLAINABILITY ---

  public explainRelationship(
    sourceNote: Note,
    targetNote: Note,
    vaultIndex?: VaultIndex
  ): KnowledgeExplanation {
    const sourceTokens = new Set(tokenizeText(`${sourceNote.title} ${sourceNote.content || ''}`));
    const targetTokens = new Set(tokenizeText(`${targetNote.title} ${targetNote.content || ''}`));

    const sharedTerms: string[] = [];
    for (const t of targetTokens) {
      if (sourceTokens.has(t) && t.length > 3) {
        sharedTerms.push(t);
      }
    }

    const sourceTags = new Set((sourceNote.tags || []).map((t) => t.toLowerCase().replace(/^#/, '')));
    const sharedTags: string[] = [];
    for (const t of targetNote.tags || []) {
      const clean = t.toLowerCase().replace(/^#/, '');
      if (sourceTags.has(clean)) sharedTags.push(clean);
    }

    const sharedFolder =
      sourceNote.folderId && sourceNote.folderId === targetNote.folderId
        ? sourceNote.folderId
        : undefined;

    const sharedNeighbors: string[] = [];
    if (vaultIndex) {
      const sourceLinks = new Set(vaultIndex.forwardLinks[sourceNote.id] || []);
      const targetLinks = vaultIndex.forwardLinks[targetNote.id] || [];
      for (const tId of targetLinks) {
        if (sourceLinks.has(tId)) {
          const n = vaultIndex.notes[tId];
          if (n) sharedNeighbors.push(n.title);
        }
      }
    }

    const parts: string[] = [];
    if (sharedTerms.length > 0) {
      parts.push(`Shared concepts (${sharedTerms.slice(0, 3).join(', ')})`);
    }
    if (sharedTags.length > 0) {
      parts.push(`Shared tags (#${sharedTags.join(', #')})`);
    }
    if (sharedFolder) {
      parts.push('Same folder');
    }
    if (sharedNeighbors.length > 0) {
      parts.push(`Shared linked notes (${sharedNeighbors.slice(0, 2).join(', ')})`);
    }

    return {
      sharedTerms: sharedTerms.slice(0, 5),
      sharedTags,
      sharedFolder,
      sharedNeighbors,
      summary: parts.length > 0 ? parts.join(' • ') : 'Topical association',
    };
  }
}

export const knowledgeIntelligence = new KnowledgeIntelligenceService();
