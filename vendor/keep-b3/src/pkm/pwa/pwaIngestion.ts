/**
 * PWA Registration & Web Share Target Ingestion
 */

export interface IncomingSharePayload {
  title?: string;
  text?: string;
  url?: string;
  action?: 'daily-note' | 'quick-capture' | 'new-note' | 'search';
  isShareTarget: boolean;
}

/**
 * Register Service Worker for offline capability
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // Registered successfully
        if (reg.installing) {
          console.debug('[PWA] Service worker installing');
        } else if (reg.active) {
          console.debug('[PWA] Service worker active');
        }
      })
      .catch((err) => {
        console.debug('[PWA] Service worker registration skipped or restricted:', err);
      });
  });
}

/**
 * Inspects window.location.search on app startup to detect Web Share Target payloads or App Shortcuts
 */
export function parseInitialPWARequest(): IncomingSharePayload | null {
  if (typeof window === 'undefined' || !window.location.search) {
    return null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title') || undefined;
    const text = params.get('text') || undefined;
    const url = params.get('url') || undefined;
    const action = (params.get('action') as IncomingSharePayload['action']) || undefined;
    const shareTarget = params.get('share-target') === 'true' || Boolean(title || text || url);

    if (!action && !title && !text && !url) {
      return null;
    }

    // Clean up the URL parameters in address bar so user doesn't re-trigger on refresh
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);

    return {
      title,
      text,
      url,
      action,
      isShareTarget: shareTarget,
    };
  } catch (err) {
    console.warn('[PWA] Error parsing URL search params:', err);
    return null;
  }
}
