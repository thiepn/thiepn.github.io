/**
 * PKM V1.9: Consolidated Universal Resource Registry
 * 
 * Provides a single, strongly-typed metadata descriptor for all Personal OS resource types.
 * Replaces scattered duplicate definitions with bounded access contracts for:
 * - Label & Iconography
 * - Preview generation
 * - Open/Navigation handlers
 * - Search integration
 * - Export adapters
 */

export type ResourceDomainType =
  | 'note'
  | 'daily-note'
  | 'task'
  | 'person'
  | 'reference'
  | 'finance-account'
  | 'finance-transaction'
  | 'flashcard'
  | 'decision'
  | 'habit'
  | 'canvas'
  | 'universal-inbox-item';

export interface ResourceDefinition {
  type: ResourceDomainType;
  label: string;
  pluralLabel: string;
  iconName: string;
  category: 'Knowledge' | 'Action' | 'Domain' | 'Spatial' | 'Communication';
  isCanonical: boolean;
  storageBackend: 'notes' | 'properties' | 'finance' | 'reference' | 'people' | 'tracking' | 'canvas' | 'inbox';
  getTitle: (item: any) => string;
  getSubtitle?: (item: any) => string;
  getSearchableText: (item: any) => string;
  formatForExport?: (item: any) => Record<string, any>;
}

class UniversalResourceRegistry {
  private definitions = new Map<ResourceDomainType, ResourceDefinition>();

  constructor() {
    this.registerDefaults();
  }

  public register(def: ResourceDefinition): void {
    this.definitions.set(def.type, def);
  }

  public get(type: ResourceDomainType): ResourceDefinition | undefined {
    return this.definitions.get(type);
  }

  public getAll(): ResourceDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getByStorage(storageBackend: string): ResourceDefinition[] {
    return this.getAll().filter((d) => d.storageBackend === storageBackend);
  }

  private registerDefaults(): void {
    this.register({
      type: 'note',
      label: 'Note',
      pluralLabel: 'Notes',
      iconName: 'FileText',
      category: 'Knowledge',
      isCanonical: true,
      storageBackend: 'notes',
      getTitle: (n) => n?.title || 'Untitled Note',
      getSubtitle: (n) => n?.tags?.map((t: string) => `#${t}`).join(' ') || '',
      getSearchableText: (n) => `${n?.title || ''}\n${n?.content || ''}\n${(n?.tags || []).join(' ')}`,
      formatForExport: (n) => ({ id: n?.id, title: n?.title, content: n?.content, tags: n?.tags, createdAt: n?.createdAt }),
    });

    this.register({
      type: 'daily-note',
      label: 'Daily Note',
      pluralLabel: 'Daily Notes',
      iconName: 'Calendar',
      category: 'Knowledge',
      isCanonical: true,
      storageBackend: 'notes',
      getTitle: (n) => n?.title || 'Daily Log',
      getSubtitle: (n) => n?.date || 'Journal',
      getSearchableText: (n) => `${n?.title || ''}\n${n?.content || ''}`,
    });

    this.register({
      type: 'task',
      label: 'Task',
      pluralLabel: 'Tasks',
      iconName: 'CheckSquare',
      category: 'Action',
      isCanonical: false, // Derived from Note lines with task tokens
      storageBackend: 'notes',
      getTitle: (t) => t?.title || t?.text || 'Untitled Task',
      getSubtitle: (t) => t?.dueDate ? `Due: ${t.dueDate}` : (t?.completed ? 'Completed' : 'Pending'),
      getSearchableText: (t) => `${t?.text || ''} ${t?.tags?.join(' ') || ''}`,
    });

    this.register({
      type: 'person',
      label: 'Person Contact',
      pluralLabel: 'People',
      iconName: 'Users',
      category: 'Domain',
      isCanonical: true,
      storageBackend: 'people',
      getTitle: (p) => p?.name || 'Unnamed Person',
      getSubtitle: (p) => p?.organization || p?.role || p?.emails?.[0] || '',
      getSearchableText: (p) => `${p?.name || ''} ${p?.organization || ''} ${p?.role || ''} ${(p?.emails || []).join(' ')}`,
    });

    this.register({
      type: 'reference',
      label: 'Academic Reference',
      pluralLabel: 'References',
      iconName: 'BookOpen',
      category: 'Domain',
      isCanonical: true,
      storageBackend: 'reference',
      getTitle: (r) => r?.title || 'Untitled Reference',
      getSubtitle: (r) => `${(r?.authors || []).join(', ')} (${r?.year || 'n.d.'})`,
      getSearchableText: (r) => `${r?.title || ''} ${(r?.authors || []).join(' ')} ${r?.abstract || ''} ${r?.doi || ''}`,
    });

    this.register({
      type: 'finance-account',
      label: 'Finance Account',
      pluralLabel: 'Accounts',
      iconName: 'CreditCard',
      category: 'Domain',
      isCanonical: true,
      storageBackend: 'finance',
      getTitle: (a) => a?.name || 'Account',
      getSubtitle: (a) => `${a?.type || 'asset'} • ${a?.currency || 'USD'}`,
      getSearchableText: (a) => `${a?.name || ''} ${a?.institution || ''} ${a?.accountNumber || ''}`,
    });

    this.register({
      type: 'finance-transaction',
      label: 'Finance Transaction',
      pluralLabel: 'Transactions',
      iconName: 'DollarSign',
      category: 'Domain',
      isCanonical: true,
      storageBackend: 'finance',
      getTitle: (t) => t?.payee || t?.description || 'Transaction',
      getSubtitle: (t) => `${t?.date || ''} • ${t?.category || 'Uncategorized'}`,
      getSearchableText: (t) => `${t?.payee || ''} ${t?.description || ''} ${t?.category || ''}`,
    });

    this.register({
      type: 'canvas',
      label: 'Spatial Canvas',
      pluralLabel: 'Canvases',
      iconName: 'Layout',
      category: 'Spatial',
      isCanonical: true,
      storageBackend: 'canvas',
      getTitle: (c) => c?.title || 'Untitled Canvas',
      getSubtitle: (c) => `${c?.nodes?.length || 0} elements`,
      getSearchableText: (c) => `${c?.title || ''} ${(c?.nodes || []).map((n: any) => n.text || '').join(' ')}`,
    });

    this.register({
      type: 'universal-inbox-item',
      label: 'Inbox Capture',
      pluralLabel: 'Inbox Items',
      iconName: 'Inbox',
      category: 'Communication',
      isCanonical: true,
      storageBackend: 'inbox',
      getTitle: (i) => i?.title || i?.subject || 'Inbox Item',
      getSubtitle: (i) => `${i?.source || 'Local'} • ${i?.receivedAt || ''}`,
      getSearchableText: (i) => `${i?.title || ''} ${i?.snippet || ''} ${i?.source || ''}`,
    });
  }
}

export const universalResourceRegistry = new UniversalResourceRegistry();
