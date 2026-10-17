/**
 * V2.12 Native File Integration Router
 * 
 * Manages untrusted external file imports, OS "Open With" triggers, and Drag-and-Drop
 * workflows with path-traversal sanitization and safe destination routing.
 */

export type SupportedExternalFileType = 'markdown' | 'text' | 'pdf' | 'image' | 'audio' | 'backup_package' | 'portable_vault' | 'generic';

export interface FileRoutingDecision {
  fileType: SupportedExternalFileType;
  action: 'import_to_vault' | 'open_temporary' | 'attach_to_note' | 'inspect_backup' | 'import_portable_vault';
  sanitizedFilename: string;
  mimeType: string;
  size: number;
  requiresUserConfirmation: boolean;
  promptMessage: string;
}

export interface InboundFilePayload {
  name: string;
  size: number;
  type?: string;
  content?: string;
  binaryData?: ArrayBuffer | Blob;
  path?: string;
}

export class NativeFileIntegrationRouter {
  private static instance: NativeFileIntegrationRouter | null = null;

  private constructor() {}

  public static getInstance(): NativeFileIntegrationRouter {
    if (!NativeFileIntegrationRouter.instance) {
      NativeFileIntegrationRouter.instance = new NativeFileIntegrationRouter();
    }
    return NativeFileIntegrationRouter.instance;
  }

  /**
   * Sanitizes untrusted filenames against path traversal attacks (e.g., ../../etc/passwd)
   */
  public sanitizeFilename(rawName: string): string {
    if (!rawName) return 'unnamed_file';
    
    // 1. Strip absolute/relative path prefixes and null bytes
    const basename = rawName
      .replace(/[\0\x00-\x1f\x7f]/g, '')
      .replace(/^.*[\\/]/, '')
      .replace(/^\.+/, '');

    // 2. Remove dangerous special characters
    const cleaned = basename.replace(/[^a-zA-Z0-9._\-\s()[\]]/g, '_').trim();
    return cleaned.slice(0, 120) || 'unnamed_file';
  }

  /**
   * Identifies the file type based on extension and MIME type
   */
  public detectFileType(filename: string, mimeType?: string): SupportedExternalFileType {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      return 'markdown';
    }
    if (lowerName.endsWith('.txt')) {
      return 'text';
    }
    if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lowerName) || mimeType?.startsWith('image/')) {
      return 'image';
    }
    if (/\.(mp3|wav|m4a|ogg|aac|webm)$/i.test(lowerName) || mimeType?.startsWith('audio/')) {
      return 'audio';
    }
    if (lowerName.endsWith('.keepnotes') || lowerName.endsWith('.pkmbackup.json')) {
      return 'backup_package';
    }
    if (lowerName.endsWith('.zip') || lowerName.endsWith('.pkmvault')) {
      return 'portable_vault';
    }
    return 'generic';
  }

  /**
   * Evaluates the routing decision for an incoming external file or OS Open-With request
   */
  public evaluateRouting(
    file: InboundFilePayload,
    context: { isDroppedIntoNote: boolean; targetNoteId?: string }
  ): FileRoutingDecision {
    const sanitizedFilename = this.sanitizeFilename(file.name);
    const fileType = this.detectFileType(sanitizedFilename, file.type);
    const mimeType = file.type || 'application/octet-stream';

    // 1. Drag into active note -> Attach or embed
    if (context.isDroppedIntoNote && context.targetNoteId) {
      return {
        fileType,
        action: 'attach_to_note',
        sanitizedFilename,
        mimeType,
        size: file.size,
        requiresUserConfirmation: false,
        promptMessage: `Attach ${sanitizedFilename} to active note.`,
      };
    }

    // 2. Backup or Vault Packages -> Inspect / Restore
    if (fileType === 'backup_package') {
      return {
        fileType,
        action: 'inspect_backup',
        sanitizedFilename,
        mimeType,
        size: file.size,
        requiresUserConfirmation: true,
        promptMessage: `Inspect and verify backup archive "${sanitizedFilename}" before restoring.`,
      };
    }

    if (fileType === 'portable_vault') {
      return {
        fileType,
        action: 'import_portable_vault',
        sanitizedFilename,
        mimeType,
        size: file.size,
        requiresUserConfirmation: true,
        promptMessage: `Import portable vault archive "${sanitizedFilename}".`,
      };
    }

    // 3. External Markdown/Text Files -> Choice: Open Temporarily vs Import
    if (fileType === 'markdown' || fileType === 'text') {
      return {
        fileType,
        action: 'import_to_vault',
        sanitizedFilename,
        mimeType,
        size: file.size,
        requiresUserConfirmation: true,
        promptMessage: `How would you like to open "${sanitizedFilename}"? Import into your vault or view temporarily?`,
      };
    }

    // 4. PDFs / Images / Audio / Generic -> Import into Library / Media
    return {
      fileType,
      action: 'import_to_vault',
      sanitizedFilename,
      mimeType,
      size: file.size,
      requiresUserConfirmation: false,
      promptMessage: `Import "${sanitizedFilename}" to Universal Inbox / Reference Library.`,
    };
  }

  /**
   * Generates a safe Markdown snippet for an attached file
   */
  public formatAttachmentMarkdown(sanitizedFilename: string, fileType: SupportedExternalFileType, attachmentId: string): string {
    if (fileType === 'image') {
      return `![${sanitizedFilename}](app://media/${attachmentId})\n`;
    }
    if (fileType === 'pdf') {
      return `\n> 📄 **PDF Reference:** [${sanitizedFilename}](app://reference/${attachmentId})\n`;
    }
    if (fileType === 'audio') {
      return `\n> 🎵 **Audio Memo:** [${sanitizedFilename}](app://audio/${attachmentId})\n`;
    }
    return `\n📎 [Attachment: ${sanitizedFilename}](app://attachment/${attachmentId})\n`;
  }
}

export const nativeFileIntegrationRouter = NativeFileIntegrationRouter.getInstance();
