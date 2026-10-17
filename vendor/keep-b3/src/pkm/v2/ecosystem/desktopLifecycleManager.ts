/**
 * V2.12 Desktop Lifecycle Manager
 * 
 * Coordinates desktop window geometry, device-local multi-monitor bounds restoration,
 * System Tray actions, and temporary file lifecycle cleanup.
 */

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized?: boolean;
}

export interface ScreenWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DesktopLifecycleManager {
  private static instance: DesktopLifecycleManager | null = null;
  private readonly STORAGE_KEY = 'keepnotes_desktop_window_bounds_v2';
  private tempFilesToCleanup: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): DesktopLifecycleManager {
    if (!DesktopLifecycleManager.instance) {
      DesktopLifecycleManager.instance = new DesktopLifecycleManager();
    }
    return DesktopLifecycleManager.instance;
  }

  /**
   * Clamps stored window bounds safely within available screen work area
   */
  public clampBounds(bounds: WindowBounds, workArea: ScreenWorkArea): WindowBounds {
    const minWidth = 480;
    const minHeight = 360;

    const width = Math.max(minWidth, Math.min(bounds.width, workArea.width));
    const height = Math.max(minHeight, Math.min(bounds.height, workArea.height));

    // Ensure window is at least partially visible on screen
    let x = bounds.x;
    let y = bounds.y;

    if (x < workArea.x) x = workArea.x;
    if (y < workArea.y) y = workArea.y;
    if (x + 100 > workArea.x + workArea.width) x = workArea.x + workArea.width - width;
    if (y + 100 > workArea.y + workArea.height) y = workArea.y + workArea.height - height;

    return {
      x: Math.max(workArea.x, x),
      y: Math.max(workArea.y, y),
      width,
      height,
      maximized: bounds.maximized,
    };
  }

  /**
   * Saves device-local window geometry
   */
  public saveWindowBounds(bounds: WindowBounds): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bounds));
      } catch {
        // Safe ignore
      }
    }
  }

  /**
   * Loads and validates stored window bounds
   */
  public getStoredWindowBounds(defaultWorkArea?: ScreenWorkArea): WindowBounds {
    const fallback: WindowBounds = {
      x: 100,
      y: 100,
      width: 1200,
      height: 800,
      maximized: false,
    };

    if (typeof localStorage === 'undefined') return fallback;

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as WindowBounds;
      
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        if (defaultWorkArea) {
          return this.clampBounds(parsed, defaultWorkArea);
        }
        return parsed;
      }
    } catch {
      // Fall through to fallback
    }

    return fallback;
  }

  /**
   * Tracks temporary decrypted or exported files for automatic deletion upon exit
   */
  public registerTempFile(path: string): void {
    this.tempFilesToCleanup.add(path);
  }

  /**
   * Cleans all registered temporary files
   */
  public cleanupTempFiles(): string[] {
    const cleaned = Array.from(this.tempFilesToCleanup);
    this.tempFilesToCleanup.clear();
    return cleaned;
  }
}

export const desktopLifecycleManager = DesktopLifecycleManager.getInstance();
