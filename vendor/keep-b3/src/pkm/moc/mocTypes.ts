import { Note } from '../../types';

export type MOCHierarchyMode = 'folder' | 'link' | 'flat';
export type MOCSortField = 'title' | 'updated' | 'created';

export interface MOCConfig {
  folder?: string;
  tag?: string;
  linksTo?: string;
  linkedFrom?: string;
  hierarchy: MOCHierarchyMode;
  depth: number;
  sort: MOCSortField;
  limit: number;
  showCounts: boolean;
}

export interface MOCItemNode {
  id: string;
  title: string;
  folderName?: string;
  level: number;
  note?: Note;
  children: MOCItemNode[];
  backlinkCount: number;
  childCount: number;
  isCycle?: boolean;
  pathKey: string;
}

export interface MOCResult {
  rootItems: MOCItemNode[];
  totalMatches: number;
  truncatedCount: number;
  error?: string;
}
