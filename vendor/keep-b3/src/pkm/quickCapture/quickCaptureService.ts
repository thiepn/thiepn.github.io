import { Note, Folder, AppSettings } from '../../types';
import { dailyNotesService } from '../dailyNotes/dailyNotesService';
import { extractHashtags } from '../../utils/linking';
import {
  QuickCapturePayload,
  QuickCaptureSettings,
  DEFAULT_QUICK_CAPTURE_SETTINGS,
} from './quickCaptureTypes';

class QuickCaptureService {
  private settingsKey = 'keepnotes_quick_capture_settings';

  public getSettings(): QuickCaptureSettings {
    if (typeof window === 'undefined') return DEFAULT_QUICK_CAPTURE_SETTINGS;
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (stored) {
        return { ...DEFAULT_QUICK_CAPTURE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse quick capture settings from localStorage', e);
    }
    return DEFAULT_QUICK_CAPTURE_SETTINGS;
  }

  public saveSettings(settings: QuickCaptureSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save quick capture settings to localStorage', e);
    }
  }

  /**
   * Processes a capture payload and updates vault state accordingly
   */
  public async processCapture(params: {
    payload: QuickCapturePayload;
    notes: Note[];
    folders: Folder[];
    appSettings: AppSettings;
    activeNote: Note | null;
    createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
    saveNote: (updatedNote: Note) => Promise<void>;
    createFolder?: (name: string, color?: string) => Promise<void>;
  }): Promise<{ targetNote: Note; isNew: boolean }> {
    const { payload, notes, folders, appSettings, activeNote, createNote, saveNote, createFolder } =
      params;
    const settings = this.getSettings();

    // 1. Target: Append to Today's Daily Note
    if (payload.target === 'daily_append') {
      const today = new Date();
      const dailyRes = await dailyNotesService.getOrCreateDailyNote({
        date: today,
        notes,
        folders,
        appSettings,
        createNote,
        createFolder,
      });

      let textToInsert = payload.content;
      if (payload.sourceUrl) {
        textToInsert += `\n- Source: [${payload.sourceUrl}](${payload.sourceUrl})`;
      }

      const updatedContent = dailyNotesService.appendContentToNote(
        dailyRes.note.content,
        textToInsert,
        settings.appendHeading,
        payload.includeTimestamp
      );

      const extractedTags = extractHashtags(`${payload.content}\n${payload.title || ''}`);
      const combinedTags = Array.from(new Set([...(dailyRes.note.tags || []), ...payload.tags, ...extractedTags]));

      const updatedNote: Note = {
        ...dailyRes.note,
        content: updatedContent,
        tags: combinedTags,
        images: payload.images
          ? [...(dailyRes.note.images || []), ...payload.images]
          : dailyRes.note.images,
        updatedAt: new Date().toISOString(),
      };

      await saveNote(updatedNote);
      return { targetNote: updatedNote, isNew: dailyRes.isNew };
    }

    // 2. Target: Append to Active Note
    if (payload.target === 'active_note' && activeNote) {
      let textToInsert = payload.content;
      if (payload.sourceUrl) {
        textToInsert += `\n- Source: [${payload.sourceUrl}](${payload.sourceUrl})`;
      }

      const updatedContent = dailyNotesService.appendContentToNote(
        activeNote.content,
        textToInsert,
        settings.appendHeading,
        payload.includeTimestamp
      );

      const extractedTags = extractHashtags(`${payload.content}\n${payload.title || ''}`);
      const combinedTags = Array.from(new Set([...(activeNote.tags || []), ...payload.tags, ...extractedTags]));

      const updatedNote: Note = {
        ...activeNote,
        content: updatedContent,
        tags: combinedTags,
        images: payload.images
          ? [...(activeNote.images || []), ...payload.images]
          : activeNote.images,
        updatedAt: new Date().toISOString(),
      };

      await saveNote(updatedNote);
      return { targetNote: updatedNote, isNew: false };
    }

    // 3. Target: Create a standalone Note in Inbox
    let inboxFolderId: string | null = null;
    const inboxName = settings.inboxFolderName || 'Inbox';
    const existingInbox = folders.find(
      (f) => f.name.trim().toLowerCase() === inboxName.trim().toLowerCase()
    );

    if (existingInbox) {
      inboxFolderId = existingInbox.id;
    } else if (createFolder) {
      await createFolder(inboxName, '#3b82f6');
    }

    let noteTitle = payload.title?.trim();
    if (!noteTitle) {
      // Derive title from first line of content or timestamp
      const firstLine = payload.content.trim().split('\n')[0].replace(/^[#\-*\s]+/, '').trim();
      if (firstLine && firstLine.length > 0) {
        noteTitle = firstLine.slice(0, 60);
      } else {
        const timeNow = new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        noteTitle = `Capture - ${timeNow}`;
      }
    }

    let noteContent = payload.content.trim();
    if (payload.sourceUrl) {
      noteContent += `\n\n**Source:** [${payload.sourceUrl}](${payload.sourceUrl})`;
    }

    const checklist =
      payload.type === 'checklist'
        ? payload.content
            .split('\n')
            .filter((l) => l.trim().length > 0)
            .map((line, idx) => ({
              id: `item-${Date.now()}-${idx}`,
              text: line.replace(/^[-\s*\[\]x]+/, '').trim(),
              completed: false,
            }))
        : [];

    const extractedTags = extractHashtags(`${noteTitle || ''}\n${payload.content || ''}`);
    const draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      title: noteTitle,
      content: payload.type === 'text' ? noteContent : '',
      type: payload.type,
      checklist,
      tags: Array.from(new Set(['inbox', ...payload.tags, ...extractedTags])),
      color: appSettings.defaultColor || 'default',
      folderId: inboxFolderId,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: payload.images || [],
    };

    const created = await createNote(draft);
    return { targetNote: created, isNew: true };
  }
}

export const quickCaptureService = new QuickCaptureService();
