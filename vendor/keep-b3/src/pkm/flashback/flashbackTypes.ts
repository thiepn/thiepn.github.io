import { Note } from '../../types';

export type FlashbackWindowKey = '7days' | '30days' | '1year';

export interface FlashbackItem {
  note: Note;
  windowKey: FlashbackWindowKey;
  windowLabel: string;
  matchedDate: Date;
  dateFormatted: string;
  excerpt: string;
  folderName?: string;
  tags: string[];
  backlinkCount: number;
}

export interface FlashbackPreferences {
  dismissedNoteIds: string[];
  lastUpdated?: string;
}
