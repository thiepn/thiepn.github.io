import { Note } from '../../types';

export type LocalGraphDepth = 1 | 2;

export interface LocalGraphNode {
  id: string;
  title: string;
  isCenter: boolean;
  hop: number; // 0 for center, 1 for direct neighbor, 2 for second hop
  color?: string;
  folderName?: string;
  note?: Note;
  linkCount: number;
}

export interface LocalGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'embed' | 'inferred';
  label?: string;
  score?: number;
  sharedTerms?: string[];
  rationale?: string;
}

export interface LocalGraphData {
  centerNode: LocalGraphNode | null;
  nodes: LocalGraphNode[];
  edges: LocalGraphEdge[];
  outgoingCount: number;
  backlinkCount: number;
  embedCount: number;
  inferredCount: number;
  totalNeighborsCount: number;
  hiddenCount: number;
}

export interface LocalGraphFilters {
  depth: LocalGraphDepth;
  showExplicit: boolean;
  showEmbeds: boolean;
  showInferred: boolean;
  showBacklinks: boolean;
  showOutgoing: boolean;
  semanticThreshold: number;
  maxNodes: number;
}

export const DEFAULT_LOCAL_GRAPH_FILTERS: LocalGraphFilters = {
  depth: 1,
  showExplicit: true,
  showEmbeds: true,
  showInferred: true,
  showBacklinks: true,
  showOutgoing: true,
  semanticThreshold: 0.25,
  maxNodes: 60,
};
