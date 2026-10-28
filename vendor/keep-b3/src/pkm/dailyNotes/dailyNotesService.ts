import { Note, Folder, AppSettings } from '../../types';
import { PREBUILT_TEMPLATES } from '../../data/templates';
import {
  DailyNotesSettings,
  DEFAULT_DAILY_NOTES_SETTINGS,
  formatDailyDate,
  parseDateFromTitle,
  getAdjacentDailyDates,
  isDailyNote,
} from './dailyNotesTypes';

class DailyNotesService {
  private settingsKey = 'keepnotes_daily_notes_settings';

  public getSettings(): DailyNotesSettings {
    if (typeof window === 'undefined') return DEFAULT_DAILY_NOTES_SETTINGS;
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (stored) {
        return { ...DEFAULT_DAILY_NOTES_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse daily notes settings from localStorage', e);
    }
    return DEFAULT_DAILY_NOTES_SETTINGS;
  }

  public saveSettings(settings: DailyNotesSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save daily notes settings to localStorage', e);
    }
  }

  /**
   * Finds an existing Daily Note for the given date in the vault
   */
  public findDailyNote(
    notes: Note[],
    targetDate: Date,
    settings: DailyNotesSettings = this.getSettings()
  ): Note | undefined {
    const targetTitle = formatDailyDate(targetDate, settings.dateFormat);
    const targetIso = targetDate.toISOString().slice(0, 10);

    // 1. Direct exact title match
    const exactMatch = notes.find(
      (n) => !n.trashed && n.title.trim().toLowerCase() === targetTitle.trim().toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // 2. Parsed date match from title
    const parsedMatch = notes.find((n) => {
      if (n.trashed) return false;
      const parsed = parseDateFromTitle(n.title, settings.dateFormat);
      if (!parsed) return false;
      return (
        parsed.getFullYear() === targetDate.getFullYear() &&
        parsed.getMonth() === targetDate.getMonth() &&
        parsed.getDate() === targetDate.getDate()
      );
    });
    if (parsedMatch) return parsedMatch;

    // 3. Fallback: match by reminderDate / dateKey if marked daily
    return notes.find((n) => {
      if (n.trashed) return false;
      if (n.reminderDate && n.reminderDate.startsWith(targetIso) && isDailyNote(n, settings)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Resolves or automatically creates the Daily Notes folder
   */
  public async ensureDailyFolder(
    folders: Folder[],
    settings: DailyNotesSettings,
    createFolder?: (name: string, color?: string) => Promise<void>
  ): Promise<string | null> {
    if (!settings.folderName && !settings.folderId) {
      return null;
    }

    if (settings.folderId) {
      const existing = folders.find((f) => f.id === settings.folderId);
      if (existing) return existing.id;
    }

    const folderName = settings.folderName || 'Daily Notes';
    const existingByName = folders.find(
      (f) => f.name.trim().toLowerCase() === folderName.trim().toLowerCase()
    );
    if (existingByName) {
      return existingByName.id;
    }

    if (createFolder) {
      // Auto-create folder with warm amber color
      await createFolder(folderName, '#f59e0b');
      // The state update will propagate; return null for first immediate tick or name
    }

    return null;
  }

  /**
   * Retrieves an existing daily note or constructs and persists a new one using configured template
   */
  public async getOrCreateDailyNote(params: {
    date: Date;
    notes: Note[];
    folders: Folder[];
    appSettings: AppSettings;
    dailySettings?: DailyNotesSettings;
    createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
    createFolder?: (name: string, color?: string) => Promise<void>;
  }): Promise<{ note: Note; isNew: boolean }> {
    const dailySettings = params.dailySettings || this.getSettings();
    const existing = this.findDailyNote(params.notes, params.date, dailySettings);

    if (existing) {
      return { note: existing, isNew: false };
    }

    // Determine Folder ID
    let folderId: string | null = null;
    if (dailySettings.folderId) {
      const match = params.folders.find((f) => f.id === dailySettings.folderId);
      if (match) folderId = match.id;
    } else if (dailySettings.folderName) {
      const matchByName = params.folders.find(
        (f) => f.name.trim().toLowerCase() === dailySettings.folderName.trim().toLowerCase()
      );
      if (matchByName) {
        folderId = matchByName.id;
      } else if (params.createFolder) {
        await params.createFolder(dailySettings.folderName, '#f59e0b');
      }
    }

    const title = formatDailyDate(params.date, dailySettings.dateFormat);
    const adjacent = getAdjacentDailyDates(params.date, dailySettings.dateFormat);

    // Prepare Template Content
    let content = '';
    const templateId = dailySettings.templateId;
    let template = PREBUILT_TEMPLATES.find((t) => t.id === templateId);

    if (template) {
      content = template.content || '';
    } else {
      // Clean default Markdown Daily Journal scaffold
      content = [
        `# ${title}`,
        '',
        `⬅️ [[${adjacent.prevTitle}]] | 📅 [[${adjacent.todayTitle}|Today]] | ➡️ [[${adjacent.nextTitle}]]`,
        '',
        '## Top Priorities',
        '- [ ] ',
        '- [ ] ',
        '- [ ] ',
        '',
        '## Log',
        '',
        '## Notes & Reflections',
        '',
      ].join('\n');
    }

    // Substitute Dynamic Template Tokens
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    content = content
      .replace(/\{\{date\}\}/g, title)
      .replace(/\{\{time\}\}/g, timeNow)
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{yesterday\}\}/g, adjacent.prevTitle)
      .replace(/\{\{tomorrow\}\}/g, adjacent.nextTitle);

    const tags = Array.from(
      new Set([...(dailySettings.autoTags || ['daily']), ...(template?.tags || [])])
    );

    const draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      content,
      type: template?.type || 'text',
      checklist: template?.checklist ? [...template.checklist] : [],
      tags,
      color: template?.color || params.appSettings.defaultColor || 'default',
      folderId,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: params.date.toISOString(),
      images: [],
    };

    const newNote = await params.createNote(draft);
    return { note: newNote, isNew: true };
  }

  /**
   * Appends a log item or captured text to an existing note under a designated Markdown heading
   */
  public appendContentToNote(
    noteContent: string,
    textToAppend: string,
    targetHeading: string = '## Log',
    includeTimestamp: boolean = true
  ): string {
    const timeStr = includeTimestamp
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const formattedEntry = timeStr ? `- **${timeStr}** ${textToAppend.trim()}` : textToAppend.trim();

    if (!targetHeading.trim()) {
      return (noteContent ? noteContent.trimEnd() + '\n\n' : '') + formattedEntry + '\n';
    }

    const headingPattern = new RegExp(`(^|\\n)(${escapeRegExp(targetHeading.trim())})\\s*(\\n|$)`, 'i');
    const match = noteContent.match(headingPattern);

    if (match && match.index !== undefined) {
      const matchIndex = match.index + match[1].length;
      const headingEnd = matchIndex + match[2].length;
      const afterHeading = noteContent.slice(headingEnd);

      // Find next heading or end of note
      const nextHeadingMatch = afterHeading.match(/\n(#{1,6}\s+[^\n]+)/);
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        const insertPosition = headingEnd + nextHeadingMatch.index;
        const before = noteContent.slice(0, insertPosition).trimEnd();
        const after = noteContent.slice(insertPosition);
        return `${before}\n${formattedEntry}\n\n${after.trimStart()}`;
      } else {
        return `${noteContent.trimEnd()}\n${formattedEntry}\n`;
      }
    }

    // Heading does not exist yet -> append heading + content to bottom
    return `${noteContent.trimEnd()}\n\n${targetHeading}\n${formattedEntry}\n`;
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const dailyNotesService = new DailyNotesService();
