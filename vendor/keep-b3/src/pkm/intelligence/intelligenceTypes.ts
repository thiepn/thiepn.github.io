import { Note } from '../../types';
import { VaultIndex } from '../types';

/**
 * Wikilink Completion Candidate
 */
export interface WikilinkCandidate {
  noteId?: string;
  title: string;
  displayTitle: string;
  isAlias: boolean;
  canonicalTitle?: string;
  alias?: string;
  folderPath?: string;
  tags?: string[];
  score: number; // 0 to 1+
  matchType: 'exact' | 'prefix' | 'alias' | 'fuzzy' | 'contextual' | 'new_note';
  snippet?: string;
  scoreBreakdown?: {
    textMatch: number;
    structural: number;
    contentContext: number;
    recency: number;
    semanticBonus: number;
  };
}

/**
 * Tag Suggestion for a Note
 */
export interface TagSuggestion {
  tag: string;
  score: number; // 0 to 1
  confidence: 'strong' | 'moderate';
  reason: string; // e.g. "Frequent in related notes", "Co-occurs with #machine-learning"
  source: 'co_occurrence' | 'related_notes' | 'folder' | 'keywords';
}

/**
 * Connection Suggestion for an Orphan Note
 */
export interface OrphanConnectionSuggestion {
  orphanNoteId: string;
  targetNoteId: string;
  targetTitle: string;
  score: number; // 0 to 1
  confidence: 'strong' | 'moderate';
  rationale: string; // e.g. "Shared concepts: regression, estimator"
  sharedTags?: string[];
  sharedTerms?: string[];
  isMOC?: boolean;
}

/**
 * Duplicate Detection Match Level
 */
export type DuplicateMatchLevel = 'exact' | 'near_exact' | 'high_similarity';

/**
 * Candidate Duplicate Pair
 */
export interface DuplicateCandidatePair {
  id: string; // Unique pair ID (e.g. sorted "noteA---noteB")
  noteAId: string;
  noteATitle: string;
  noteBId: string;
  noteBTitle: string;
  level: DuplicateMatchLevel;
  similarityScore: number; // 0 to 1
  reason: string;
  snippetA: string;
  snippetB: string;
  modifiedA: string;
  modifiedB: string;
  ignored?: boolean;
}

/**
 * Duplicate Grouping for 3+ Identical / Near-Identical Notes
 */
export interface DuplicateGroup {
  groupId: string;
  level: DuplicateMatchLevel;
  similarityScore: number;
  notes: Array<{
    id: string;
    title: string;
    modifiedTimestamp: string;
    snippet: string;
  }>;
  reason: string;
}

/**
 * MOC / Topic Cluster Suggestion
 */
export interface MOCClusterSuggestion {
  id: string;
  suggestedTitle: string;
  memberNoteIds: string[];
  memberTitles: string[];
  coherenceScore: number; // 0 to 1
  clusterType: 'tag_based' | 'folder_based' | 'topic_lexical';
  queryFilter?: {
    tag?: string;
    folder?: string;
  };
  dominantTags: string[];
  dominantTerms: string[];
  hasExistingHub: boolean;
  existingHubTitle?: string;
}

/**
 * Explainability breakdown for Related Notes
 */
export interface KnowledgeExplanation {
  sharedTerms: string[];
  sharedTags: string[];
  sharedFolder?: string;
  sharedNeighbors: string[];
  summary: string;
}

/**
 * User Settings for Knowledge Assistance
 */
export interface KnowledgeAssistanceSettings {
  linkSuggestionsEnabled: boolean;
  tagSuggestionsEnabled: boolean;
  duplicateDetectionEnabled: boolean;
  mocSuggestionsEnabled: boolean;
  localEmbeddingsEnabled: boolean;
  debugScoreExplainability: boolean;
  duplicateThreshold: number; // Default 0.85
  minClusterSize: number; // Default 5
  maxClusterSize: number; // Default 30
}

export const DEFAULT_INTELLIGENCE_SETTINGS: KnowledgeAssistanceSettings = {
  linkSuggestionsEnabled: true,
  tagSuggestionsEnabled: true,
  duplicateDetectionEnabled: true,
  mocSuggestionsEnabled: true,
  localEmbeddingsEnabled: false, // Explicit opt-in
  debugScoreExplainability: false,
  duplicateThreshold: 0.85,
  minClusterSize: 5,
  maxClusterSize: 30,
};

/**
 * Ignored entities / dismissals persisted locally
 */
export interface KnowledgeDismissals {
  dismissedTags: Record<string, string[]>; // noteId -> tag[]
  dismissedOrphanLinks: Record<string, string[]>; // orphanNoteId -> targetNoteId[]
  ignoredDuplicatePairs: string[]; // sorted "idA---idB"
  dismissedMOCClusters: string[]; // clusterId[]
}
