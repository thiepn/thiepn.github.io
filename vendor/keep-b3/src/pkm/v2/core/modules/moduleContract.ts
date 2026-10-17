import { ResourceType } from '../resource/resourceCore';

export type ModuleCategory = 'core' | 'planning' | 'knowledge' | 'life' | 'system';

export interface ModuleRoute {
  path: string;
  label: string;
  iconName: string;
  componentName: string;
}

export interface ModuleHomeSection {
  id: string;
  title: string;
  priority: number;
  renderType: 'summary' | 'list' | 'counter' | 'widget';
}

export interface ModuleContextAdapter {
  supportedContextTypes: string[];
  extractContextSummary: (resourceId: string) => Promise<any>;
}

export interface V2ModuleManifest {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  isCore: boolean;                  // Core modules cannot be disabled (Notes, Tasks, Calendar, Home, Search, Security)
  defaultEnabled: boolean;
  version: string;
  resourceTypes: ResourceType[];
  routes: ModuleRoute[];
  homeSection?: ModuleHomeSection;
  iconName: string;
  lazyLoadChunk?: string;
  permissions?: string[];
}

export interface V2ModuleInstance {
  manifest: V2ModuleManifest;
  isEnabled: boolean;
  isLoaded: boolean;
  error?: Error;
  loadImplementation?: () => Promise<any>;
}
