/**
 * PKM Phase P34: Browser Extension Background Service Worker (Manifest V3)
 * Handles context menus, keyboard shortcuts, background capture queues,
 * and delivery to active PKM application instances.
 */

declare const chrome: any;
declare const browser: any;

import {
  CAPTURE_PROTOCOL_VERSION,
  CapturePayload,
  CaptureMode,
  CaptureDestination,
} from '../../pkm/extensionBridge/captureProtocol';

interface StoredExtensionSettings {
  appUrl: string;
  pairingSecret: string;
  defaultDestination: CaptureDestination;
  defaultMode: CaptureMode;
  autoOpenAfterCapture: boolean;
  tags: string[];
}

const DEFAULT_SETTINGS: StoredExtensionSettings = {
  appUrl: 'http://localhost:3000',
  pairingSecret: '',
  defaultDestination: 'inbox',
  defaultMode: 'article',
  autoOpenAfterCapture: false,
  tags: ['web-clip'],
};

// Setup Context Menus on Installation
export function initializeContextMenus(): void {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      // 1. Save Article / Page
      chrome.contextMenus.create({
        id: 'pkm-save-page',
        title: 'Save Page to PKM',
        contexts: ['page'],
      });

      // 2. Save Selection
      chrome.contextMenus.create({
        id: 'pkm-save-selection',
        title: 'Save Selection to PKM',
        contexts: ['selection'],
      });

      // 3. Save Link
      chrome.contextMenus.create({
        id: 'pkm-save-link',
        title: 'Save Link to PKM',
        contexts: ['link'],
      });

      // 4. Save Image
      chrome.contextMenus.create({
        id: 'pkm-save-image',
        title: 'Save Image to PKM',
        contexts: ['image'],
      });
    });
  });
}

// Background Capture Queue Manager
export class BackgroundCaptureQueue {
  private queueKey = 'pkm_pending_capture_queue';

  public async getPendingQueue(): Promise<CapturePayload[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(this.queueKey);
      return Array.isArray(data[this.queueKey]) ? data[this.queueKey] : [];
    }
    return [];
  }

  public async enqueue(payload: CapturePayload): Promise<void> {
    const queue = await this.getPendingQueue();
    // Prevent duplicate entries in queue
    if (!queue.some((p) => p.id === payload.id)) {
      queue.push(payload);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [this.queueKey]: queue });
      }
    }
  }

  public async dequeue(captureId: string): Promise<void> {
    const queue = await this.getPendingQueue();
    const filtered = queue.filter((p) => p.id !== captureId);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [this.queueKey]: filtered });
    }
  }

  public async clear(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove(this.queueKey);
    }
  }
}

export const backgroundCaptureQueue = new BackgroundCaptureQueue();

// Handle Context Menu Actions
if (typeof chrome !== 'undefined' && chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;

    const captureId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let mode: CaptureMode = 'article';
    let sourceUrl = info.pageUrl || tab.url || '';
    let sourceTitle = tab.title || 'Captured Web Page';
    let text: string | undefined = undefined;
    let html: string | undefined = undefined;

    if (info.menuItemId === 'pkm-save-selection') {
      mode = 'selection';
      text = info.selectionText || '';
    } else if (info.menuItemId === 'pkm-save-link') {
      mode = 'link';
      sourceUrl = info.linkUrl || sourceUrl;
      sourceTitle = info.selectionText || info.linkUrl || sourceTitle;
    } else if (info.menuItemId === 'pkm-save-image') {
      mode = 'image';
      sourceUrl = info.srcUrl || sourceUrl;
    }

    const payload: CapturePayload = {
      id: captureId,
      mode,
      sourceUrl,
      sourceTitle,
      text,
      html,
      destination: 'inbox',
      tags: ['web-clip', mode],
      capturedAt: new Date().toISOString(),
    };

    await backgroundCaptureQueue.enqueue(payload);
  });
}

// Handle Keyboard Shortcuts
if (typeof chrome !== 'undefined' && chrome.commands) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'quick-capture-command') {
      // Trigger popup or capture current tab
    }
  });
}

initializeContextMenus();
