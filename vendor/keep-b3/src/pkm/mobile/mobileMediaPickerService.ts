/**
 * P47 — Mobile Media & Document Picker Service
 * 
 * Manages camera capture, photo library selection, and document imports
 * routing directly through canonical P26 Attachment and Media pipelines.
 */

import { mobileCapabilityService } from './mobileCapabilityService';

export interface PickedMediaFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  isImage: boolean;
  isPdf: boolean;
}

class MobileMediaPickerService {
  /**
   * Prompts user to pick photos or documents using native file picker
   */
  public async pickDocumentOrMedia(options: {
    accept?: string;
    multiple?: boolean;
    capture?: 'user' | 'environment';
  } = {}): Promise<PickedMediaFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '*/*';
      input.multiple = Boolean(options.multiple);
      if (options.capture) {
        input.capture = options.capture;
      }

      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (files.length === 0) {
          resolve([]);
          return;
        }

        const results: PickedMediaFile[] = [];
        for (const file of files) {
          try {
            const dataUrl = await this.readFileAsDataUrl(file);
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

            results.push({
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              dataUrl,
              isImage,
              isPdf,
            });
          } catch (err) {
            console.error(`[MobileMediaPickerService] Error reading file ${file.name}:`, err);
          }
        }

        mobileCapabilityService.triggerHaptic('selection');
        resolve(results);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Opens camera to take a photo directly
   */
  public async takePhoto(): Promise<PickedMediaFile | null> {
    const files = await this.pickDocumentOrMedia({
      accept: 'image/*',
      multiple: false,
      capture: 'environment',
    });
    return files[0] || null;
  }

  /**
   * Reads a File object to Base64 Data URL
   */
  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Shares a file or note content using native OS share sheet (Share Out)
   */
  public async shareExport(content: {
    title: string;
    text?: string;
    url?: string;
    fileName?: string;
    fileBlob?: Blob;
  }): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;

    try {
      if (navigator.share) {
        const shareData: ShareData = {
          title: content.title,
          text: content.text,
          url: content.url,
        };

        if (content.fileBlob && content.fileName && navigator.canShare) {
          const file = new File([content.fileBlob], content.fileName, { type: content.fileBlob.type });
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }

        await navigator.share(shareData);
        mobileCapabilityService.triggerHaptic('success');
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[MobileMediaPickerService] Share failed:', err);
      }
    }

    return false;
  }
}

export const mobileMediaPickerService = new MobileMediaPickerService();
