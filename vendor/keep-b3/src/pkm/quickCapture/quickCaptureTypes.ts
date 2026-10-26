import { NoteImage } from '../../types';

export type QuickCaptureTarget = 'daily_append' | 'inbox_note' | 'active_note';

export interface QuickCapturePayload {
  content: string;
  title?: string;
  target: QuickCaptureTarget;
  type: 'text' | 'checklist';
  tags: string[];
  includeTimestamp: boolean;
  sourceUrl?: string;
  images?: NoteImage[];
}

export interface QuickCaptureSettings {
  defaultTarget: QuickCaptureTarget;
  appendHeading: string; // e.g. '## Log'
  includeTimestamp: boolean;
  autoOpenAfterCapture: boolean;
  inboxFolderName: string; // default 'Inbox'
}

export const DEFAULT_QUICK_CAPTURE_SETTINGS: QuickCaptureSettings = {
  defaultTarget: 'daily_append',
  appendHeading: '## Log',
  includeTimestamp: true,
  autoOpenAfterCapture: false,
  inboxFolderName: 'Inbox',
};
