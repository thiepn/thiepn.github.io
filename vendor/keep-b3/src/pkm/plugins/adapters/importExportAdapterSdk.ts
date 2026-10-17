/**
 * Phase P40 / V1.5: Import & Export Adapter Extensibility Framework
 * 
 * Defines the contract for external format converters.
 * Enforces the Staged Import Pipeline:
 * Source -> Extension Parser -> Normalized Staging Bundle -> Core Validation -> Preview -> Canonical Commit
 * 
 * Adapters NEVER write directly to canonical storage.
 */

export interface StagedImportNote {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  folder?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface StagedImportResource {
  id: string;
  type: 'note' | 'task' | 'contact' | 'asset' | 'table';
  data: any;
}

export interface PluginStagedImportBundle {
  sourceFormat: string;
  sourceVersion?: string;
  exportedAt?: string;
  notes: StagedImportNote[];
  resources?: StagedImportResource[];
  warnings: string[];
  totalBytes: number;
}

export interface ImportAdapter {
  id: string;
  name: string;
  supportedExtensions: string[];
  description: string;
  parse(files: Array<{ name: string; size: number; content: string | ArrayBuffer }>): Promise<PluginStagedImportBundle>;
}

export interface ExportProjection {
  notes: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    folder?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  exportedAt: string;
  vaultName: string;
}

export interface ExportAdapter {
  id: string;
  name: string;
  targetExtension: string;
  description: string;
  transform(projection: ExportProjection): Promise<{ filename: string; mimeType: string; data: string | ArrayBuffer }>;
}

export class ImportAdapterRegistry {
  private adapters = new Map<string, ImportAdapter>();

  public register(adapter: ImportAdapter): void {
    if (!adapter.id || !adapter.name) {
      throw new Error('Adapter must have an id and name.');
    }
    this.adapters.set(adapter.id, adapter);
  }

  public unregister(id: string): void {
    this.adapters.delete(id);
  }

  public get(id: string): ImportAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAll(): ImportAdapter[] {
    return Array.from(this.adapters.values());
  }

  public findByExtension(ext: string): ImportAdapter[] {
    const cleanExt = ext.replace(/^\./, '').toLowerCase();
    return this.getAll().filter((a) =>
      a.supportedExtensions.map((e) => e.replace(/^\./, '').toLowerCase()).includes(cleanExt)
    );
  }
}

export const importAdapterRegistry = new ImportAdapterRegistry();
