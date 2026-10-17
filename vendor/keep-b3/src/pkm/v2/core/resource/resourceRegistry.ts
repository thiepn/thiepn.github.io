import { ResourceType, ResourceCore, ResourceCapabilities } from './resourceCore';
import { DEFAULT_RESOURCE_CAPABILITIES } from './resourceCapabilities';

export interface ResourceTypeDefinition {
  type: ResourceType;
  label: string;
  pluralLabel: string;
  iconName: string;
  category: 'core' | 'planning' | 'knowledge' | 'life' | 'analytics' | 'system';
  capabilities: ResourceCapabilities;
  routePrefix: string;
  isFirstPartyModule?: boolean;
  moduleId?: string;
}

class ResourceRegistryV2 {
  private registry: Map<ResourceType, ResourceTypeDefinition> = new Map();

  constructor() {
    this.bootstrapDefaults();
  }

  private bootstrapDefaults() {
    const definitions: ResourceTypeDefinition[] = [
      {
        type: 'note',
        label: 'Note',
        pluralLabel: 'Notes',
        iconName: 'FileText',
        category: 'core',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.note,
        routePrefix: '/notes',
        moduleId: 'core.notes',
      },
      {
        type: 'task',
        label: 'Task',
        pluralLabel: 'Tasks',
        iconName: 'CheckSquare',
        category: 'core',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.task,
        routePrefix: '/tasks',
        moduleId: 'core.tasks',
      },
      {
        type: 'folder',
        label: 'Folder',
        pluralLabel: 'Folders',
        iconName: 'Folder',
        category: 'core',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.folder,
        routePrefix: '/folders',
        moduleId: 'core.notes',
      },
      {
        type: 'project',
        label: 'Project',
        pluralLabel: 'Projects',
        iconName: 'FolderKanban',
        category: 'planning',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.project,
        routePrefix: '/projects',
        moduleId: 'core.planning',
      },
      {
        type: 'person',
        label: 'Person',
        pluralLabel: 'People',
        iconName: 'Users',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.person,
        routePrefix: '/people',
        isFirstPartyModule: true,
        moduleId: 'domain.people',
      },
      {
        type: 'habit',
        label: 'Habit',
        pluralLabel: 'Habits',
        iconName: 'Sparkles',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.habit,
        routePrefix: '/habits',
        isFirstPartyModule: true,
        moduleId: 'domain.tracking',
      },
      {
        type: 'course',
        label: 'Course',
        pluralLabel: 'Courses',
        iconName: 'GraduationCap',
        category: 'knowledge',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.course,
        routePrefix: '/learning',
        isFirstPartyModule: true,
        moduleId: 'domain.learning',
      },
      {
        type: 'book',
        label: 'Book',
        pluralLabel: 'Library',
        iconName: 'BookOpen',
        category: 'knowledge',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.book,
        routePrefix: '/library',
        isFirstPartyModule: true,
        moduleId: 'domain.library',
      },
      {
        type: 'transaction',
        label: 'Transaction',
        pluralLabel: 'Transactions',
        iconName: 'DollarSign',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.transaction,
        routePrefix: '/finance',
        isFirstPartyModule: true,
        moduleId: 'domain.finance',
      },
      {
        type: 'health_metric',
        label: 'Health Metric',
        pluralLabel: 'Health Metrics',
        iconName: 'Heart',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.health_metric,
        routePrefix: '/health',
        isFirstPartyModule: true,
        moduleId: 'domain.health',
      },
      {
        type: 'itinerary',
        label: 'Itinerary',
        pluralLabel: 'Travel Plans',
        iconName: 'Plane',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.itinerary,
        routePrefix: '/travel',
        isFirstPartyModule: true,
        moduleId: 'domain.travel',
      },
      {
        type: 'asset',
        label: 'Asset',
        pluralLabel: 'Assets',
        iconName: 'Shield',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.asset,
        routePrefix: '/assets',
        isFirstPartyModule: true,
        moduleId: 'domain.assets',
      },
      {
        type: 'decision',
        label: 'Decision',
        pluralLabel: 'Decisions',
        iconName: 'GitBranch',
        category: 'life',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.decision,
        routePrefix: '/decisions',
        isFirstPartyModule: true,
        moduleId: 'domain.decisions',
      },
      {
        type: 'pdf_document',
        label: 'PDF Document',
        pluralLabel: 'PDFs & Citations',
        iconName: 'File',
        category: 'knowledge',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.pdf_document,
        routePrefix: '/pdf',
        moduleId: 'core.media',
      },
      {
        type: 'canvas',
        label: 'Canvas',
        pluralLabel: 'Canvases',
        iconName: 'LayoutGrid',
        category: 'knowledge',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.canvas,
        routePrefix: '/canvas',
        moduleId: 'core.canvas',
      },
      {
        type: 'saved_view',
        label: 'Saved View',
        pluralLabel: 'Saved Views',
        iconName: 'Filter',
        category: 'system',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.saved_view,
        routePrefix: '/views',
        moduleId: 'core.query',
      },
      {
        type: 'collection',
        label: 'Collection',
        pluralLabel: 'Collections',
        iconName: 'Table',
        category: 'system',
        capabilities: DEFAULT_RESOURCE_CAPABILITIES.collection,
        routePrefix: '/collections',
        moduleId: 'core.query',
      },
    ];

    for (const def of definitions) {
      this.registry.set(def.type, def);
    }
  }

  public register(definition: ResourceTypeDefinition): void {
    this.registry.set(definition.type, definition);
  }

  public get(type: ResourceType): ResourceTypeDefinition | undefined {
    return this.registry.get(type);
  }

  public getAll(): ResourceTypeDefinition[] {
    return Array.from(this.registry.values());
  }

  public getSearchableTypes(): ResourceType[] {
    return Array.from(this.registry.entries())
      .filter(([_, def]) => def.capabilities.searchable)
      .map(([type]) => type);
  }

  public getLinkableTypes(): ResourceType[] {
    return Array.from(this.registry.entries())
      .filter(([_, def]) => def.capabilities.linkable)
      .map(([type]) => type);
  }

  public getRelatableTypes(): ResourceType[] {
    return Array.from(this.registry.entries())
      .filter(([_, def]) => def.capabilities.relatable)
      .map(([type]) => type);
  }

  public getLabel(type: ResourceType): string {
    return this.registry.get(type)?.label || type;
  }

  public getIconName(type: ResourceType): string {
    return this.registry.get(type)?.iconName || 'FileText';
  }
}

export const resourceRegistryV2 = new ResourceRegistryV2();
