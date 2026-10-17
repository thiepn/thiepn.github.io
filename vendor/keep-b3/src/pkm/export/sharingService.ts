/**
 * PKM V1.8: Sharing & Clipboard Service
 * Web Share API, clipboard formatting (Markdown / Rich HTML / Plain text), and download fallbacks.
 */

import { Note } from '../../types';
import { revealClozeDeletions, triggerFileDownload } from '../publishing';

export interface ShareResult {
  success: boolean;
  method: 'web-share' | 'clipboard' | 'download';
  error?: string;
}

/**
 * Copies note content to clipboard formatted as clean Markdown
 */
export async function copyNoteAsMarkdown(note: Note): Promise<boolean> {
  try {
    const cleanContent = revealClozeDeletions(note.content || '');
    const text = `# ${note.title || 'Untitled'}\n\n${cleanContent}`;
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Failed to copy markdown to clipboard:', err);
    return false;
  }
}

/**
 * Copies rich HTML to clipboard with plaintext fallback
 */
export async function copyHtmlToClipboard(html: string, plainTextFallback: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      const textBlob = new Blob([plainTextFallback], { type: 'text/plain' });
      const htmlBlob = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainTextFallback);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, falling back to writeText:', err);
    try {
      await navigator.clipboard.writeText(plainTextFallback);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Triggers native OS Share Sheet if supported, otherwise falls back to clipboard
 */
export async function shareViaWebShareApi(data: {
  title: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<ShareResult> {
  if (navigator.share) {
    try {
      if (data.files && data.files.length > 0 && navigator.canShare && navigator.canShare({ files: data.files })) {
        await navigator.share({
          title: data.title,
          text: data.text,
          files: data.files,
        });
        return { success: true, method: 'web-share' };
      }

      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return { success: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'web-share', error: 'Share cancelled' };
      }
    }
  }

  // Fallback: Copy to clipboard
  try {
    const textToCopy = `${data.title}\n\n${data.text || ''}`;
    await navigator.clipboard.writeText(textToCopy);
    return { success: true, method: 'clipboard' };
  } catch (clipErr: any) {
    return { success: false, method: 'clipboard', error: clipErr.message };
  }
}
