import { Note, Folder } from '../../types';

export type ExtractionMode = 'link' | 'embed';
export type ExtractionOpenTarget = 'stay' | 'beside' | 'current-tab' | 'new-tab';

export interface ExtractionRequest {
  sourceNote: Note;
  selectionText: string;
  selectionStart: number;
  selectionEnd: number;
  targetTitle: string;
  targetFolderId?: string | null;
  mode: ExtractionMode;
  customAlias?: string;
  openTarget: ExtractionOpenTarget;
  addSourceContextMetadata?: boolean;
}

export interface ExtractionValidation {
  valid: boolean;
  suggestedTitle: string;
  sanitizedTitle: string;
  isDuplicate: boolean;
  existingNote?: Note;
  error?: string;
}

export interface ExtractionResult {
  success: boolean;
  targetNote?: Note;
  updatedSourceNote?: Note;
  replacementText: string;
  error?: string;
}
