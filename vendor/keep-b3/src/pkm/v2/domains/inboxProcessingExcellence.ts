/**
 * PKM V2.13 — Universal Intake & Inbox Processing Excellence Engine
 *
 * Implements low-friction intake triage and contextual filing:
 * - Clear distinction between Local and External source items
 * - Contextual process destinations (Note, Task, Project, Library, Person Interaction, Archive)
 * - Source provenance preserved after filing
 * - External connector outages never impact local processing
 * - Zero Inbox-Zero gamification or guilt meters (inbox count is purely factual)
 */

export type InboxSourceType = 'quick_capture' | 'share_target' | 'web_clipper' | 'email' | 'file_drop' | 'api_connector';
export type ProcessDestination = 'note' | 'task' | 'project' | 'library' | 'person_interaction' | 'archive' | 'dismiss';

export interface V2InboxItem {
  id: string;
  title: string;
  content: string;
  sourceType: InboxSourceType;
  isExternal: boolean;
  externalProviderName?: string;
  externalSourceUrl?: string;
  capturedAt: string;
  processed: boolean;
  processedDestination?: ProcessDestination;
  processedTargetResourceId?: string;
  tags?: string[];
}

export interface InboxProcessResult {
  success: boolean;
  inboxItemId: string;
  destination: ProcessDestination;
  createdResourceId?: string;
  provenanceRecorded: boolean;
}

export class InboxProcessingExcellence {
  private items = new Map<string, V2InboxItem>();

  public captureItem(params: {
    title: string;
    content: string;
    sourceType: InboxSourceType;
    isExternal?: boolean;
    externalProviderName?: string;
    externalSourceUrl?: string;
    tags?: string[];
  }): V2InboxItem {
    const item: V2InboxItem = {
      id: `inbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: params.title,
      content: params.content,
      sourceType: params.sourceType,
      isExternal: Boolean(params.isExternal),
      externalProviderName: params.externalProviderName,
      externalSourceUrl: params.externalSourceUrl,
      capturedAt: new Date().toISOString(),
      processed: false,
      tags: params.tags,
    };

    this.items.set(item.id, item);
    return item;
  }

  public getUnprocessedItems(): V2InboxItem[] {
    return Array.from(this.items.values())
      .filter((i) => !i.processed)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }

  public getAllItems(): V2InboxItem[] {
    return Array.from(this.items.values()).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }

  /**
   * Processes an item into a canonical destination, recording provenance
   */
  public processItem(params: {
    inboxItemId: string;
    destination: ProcessDestination;
    targetResourceId?: string;
  }): InboxProcessResult {
    const item = this.items.get(params.inboxItemId);
    if (!item) {
      return {
        success: false,
        inboxItemId: params.inboxItemId,
        destination: params.destination,
        provenanceRecorded: false,
      };
    }

    item.processed = true;
    item.processedDestination = params.destination;
    item.processedTargetResourceId = params.targetResourceId;

    return {
      success: true,
      inboxItemId: item.id,
      destination: params.destination,
      createdResourceId: params.targetResourceId,
      provenanceRecorded: true,
    };
  }

  public clear(): void {
    this.items.clear();
  }
}

export const inboxProcessingExcellence = new InboxProcessingExcellence();
