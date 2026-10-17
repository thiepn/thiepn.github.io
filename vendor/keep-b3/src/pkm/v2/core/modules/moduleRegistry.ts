import { V2ModuleManifest, V2ModuleInstance, ModuleRoute, ModuleHomeSection } from './moduleContract';
import { CORE_MODULES } from './coreModules';
import { DOMAIN_MODULES } from './domainModules';

class ModuleRegistryV2 {
  private modules: Map<string, V2ModuleInstance> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.bootstrap();
  }

  private bootstrap() {
    // Register Core
    for (const manifest of CORE_MODULES) {
      this.modules.set(manifest.id, {
        manifest,
        isEnabled: true,
        isLoaded: true,
      });
    }

    // Load saved enabled domains preferences from localStorage safely
    let enabledPrefs: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem('pkm_v2_enabled_modules');
      if (raw) enabledPrefs = JSON.parse(raw);
    } catch {
      // Fallback
    }

    // Register Domain Modules
    for (const manifest of DOMAIN_MODULES) {
      const isEnabled = enabledPrefs[manifest.id] !== undefined
        ? enabledPrefs[manifest.id]
        : manifest.defaultEnabled;

      this.modules.set(manifest.id, {
        manifest,
        isEnabled,
        isLoaded: false,
      });
    }
  }

  public getAll(): V2ModuleInstance[] {
    return Array.from(this.modules.values());
  }

  public get(id: string): V2ModuleInstance | undefined {
    return this.modules.get(id);
  }

  public isEnabled(id: string): boolean {
    const mod = this.modules.get(id);
    return mod ? mod.isEnabled : false;
  }

  public setEnabled(id: string, enabled: boolean): void {
    const mod = this.modules.get(id);
    if (!mod) return;
    if (mod.manifest.isCore) {
      console.warn(`Cannot disable core module: ${id}`);
      return;
    }

    mod.isEnabled = enabled;
    this.persistPreferences();
    this.notify();
  }

  public async loadModule(id: string): Promise<boolean> {
    const mod = this.modules.get(id);
    if (!mod) return false;
    if (mod.isLoaded) return true;

    try {
      // Lazy load simulation or dynamic import
      mod.isLoaded = true;
      this.notify();
      return true;
    } catch (err: any) {
      mod.error = err instanceof Error ? err : new Error(String(err));
      console.error(`Failed to load module ${id}:`, err);
      return false;
    }
  }

  public getActiveRoutes(): ModuleRoute[] {
    const routes: ModuleRoute[] = [];
    for (const mod of this.modules.values()) {
      if (mod.isEnabled) {
        routes.push(...mod.manifest.routes);
      }
    }
    return routes;
  }

  public getActiveHomeSections(): ModuleHomeSection[] {
    const sections: ModuleHomeSection[] = [];
    for (const mod of this.modules.values()) {
      if (mod.isEnabled && mod.manifest.homeSection) {
        sections.push(mod.manifest.homeSection);
      }
    }
    return sections.sort((a, b) => a.priority - b.priority);
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }

  private persistPreferences() {
    try {
      const prefs: Record<string, boolean> = {};
      for (const [id, mod] of this.modules.entries()) {
        if (!mod.manifest.isCore) {
          prefs[id] = mod.isEnabled;
        }
      }
      localStorage.setItem('pkm_v2_enabled_modules', JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save module preferences', e);
    }
  }
}

export const moduleRegistryV2 = new ModuleRegistryV2();
