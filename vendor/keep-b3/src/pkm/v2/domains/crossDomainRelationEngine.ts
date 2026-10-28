/**
 * PKM V2.13 — Cross-Domain Relation Graph & Anti-Duplication Engine
 *
 * Implements authoritative cross-domain semantic connections:
 * - Direct typed relations between first-party domains
 * - Strips duplicate string fields (e.g. raw personName, projectTitle, tripName copies)
 * - Safe relation creation/deletion (Deleting a relation NEVER deletes the target Resource)
 * - Coherent bidirectional relation traversals without duplicated inverse storage
 */

import { ResourceRef, ResourceType } from '../core/resource/resourceCore';

export type SemanticRelationType =
  | 'project_contributes_to_goal'
  | 'project_has_decision'
  | 'project_involves_person'
  | 'project_contains_task'
  | 'task_assigned_to_person'
  | 'task_for_project'
  | 'course_uses_library_item'
  | 'course_has_note'
  | 'trip_has_reservation'
  | 'trip_has_companion'
  | 'trip_has_expense'
  | 'asset_purchased_via_transaction'
  | 'asset_loaned_to_person'
  | 'decision_impacts_project'
  | 'decision_supported_by_evidence';

export interface CrossDomainRelation {
  id: string;
  sourceId: string;
  sourceType: ResourceType;
  targetId: string;
  targetType: ResourceType;
  relationType: SemanticRelationType;
  label: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AntiDuplicationSanitizationResult {
  cleanedFieldsCount: number;
  removedDuplicateKeys: string[];
  sanitizedResource: Record<string, any>;
}

export class CrossDomainRelationEngine {
  private relations = new Map<string, CrossDomainRelation>();
  private sourceIndex = new Map<string, Set<string>>(); // sourceId -> Set<relationId>
  private targetIndex = new Map<string, Set<string>>(); // targetId -> Set<relationId>

  /**
   * Registers a high-value cross-domain relation
   */
  public addRelation(params: {
    sourceId: string;
    sourceType: ResourceType;
    targetId: string;
    targetType: ResourceType;
    relationType: SemanticRelationType;
    label?: string;
    metadata?: Record<string, unknown>;
  }): CrossDomainRelation {
    const id = `rel_${params.sourceId}_${params.relationType}_${params.targetId}`;
    
    // Default human-readable label based on relation type
    const label = params.label || this.getDefaultRelationLabel(params.relationType);

    const relation: CrossDomainRelation = {
      id,
      sourceId: params.sourceId,
      sourceType: params.sourceType,
      targetId: params.targetId,
      targetType: params.targetType,
      relationType: params.relationType,
      label,
      createdAt: new Date().toISOString(),
      metadata: params.metadata,
    };

    this.relations.set(id, relation);

    if (!this.sourceIndex.has(params.sourceId)) {
      this.sourceIndex.set(params.sourceId, new Set());
    }
    this.sourceIndex.get(params.sourceId)!.add(id);

    if (!this.targetIndex.has(params.targetId)) {
      this.targetIndex.set(params.targetId, new Set());
    }
    this.targetIndex.get(params.targetId)!.add(id);

    return relation;
  }

  /**
   * Removes a relation safely.
   * GUARANTEE: Never deletes or mutates the underlying source or target resources!
   */
  public removeRelation(relationId: string): boolean {
    const relation = this.relations.get(relationId);
    if (!relation) return false;

    this.relations.delete(relationId);
    this.sourceIndex.get(relation.sourceId)?.delete(relationId);
    this.targetIndex.get(relation.targetId)?.delete(relationId);
    return true;
  }

  /**
   * Gets all relations where resource is source
   */
  public getOutgoingRelations(sourceId: string): CrossDomainRelation[] {
    const ids = this.sourceIndex.get(sourceId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.relations.get(id)!).filter(Boolean);
  }

  /**
   * Gets all relations where resource is target (Incoming)
   */
  public getIncomingRelations(targetId: string): CrossDomainRelation[] {
    const ids = this.targetIndex.get(targetId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.relations.get(id)!).filter(Boolean);
  }

  /**
   * Gets all connected resource references for a given resource
   */
  public getConnectedResources(resourceId: string): {
    outgoing: CrossDomainRelation[];
    incoming: CrossDomainRelation[];
    totalConnected: number;
  } {
    const outgoing = this.getOutgoingRelations(resourceId);
    const incoming = this.getIncomingRelations(resourceId);
    return {
      outgoing,
      incoming,
      totalConnected: outgoing.length + incoming.length,
    };
  }

  /**
   * Anti-Duplication Audit & Sanitizer:
   * Strips denormalized string copies (e.g. `personName`, `projectTitle`, `tripName`)
   * from raw resource payloads where stable Relations should be authoritative.
   */
  public sanitizeDenormalizedDuplicates(resource: Record<string, any>): AntiDuplicationSanitizationResult {
    const sanitized = { ...resource };
    const removedKeys: string[] = [];

    const denormalizedFieldsToStrip = [
      'copiedPersonName',
      'redundantProjectTitle',
      'cachedTripName',
      'snapshotCourseTitle',
      'duplicateAccountName',
    ];

    for (const key of denormalizedFieldsToStrip) {
      if (key in sanitized) {
        delete sanitized[key];
        removedKeys.push(key);
      }
    }

    return {
      cleanedFieldsCount: removedKeys.length,
      removedDuplicateKeys: removedKeys,
      sanitizedResource: sanitized,
    };
  }

  /**
   * Returns human-readable label for semantic relation types
   */
  private getDefaultRelationLabel(type: SemanticRelationType): string {
    switch (type) {
      case 'project_contributes_to_goal':
        return 'Contributes to Goal';
      case 'project_has_decision':
        return 'Project Decision';
      case 'project_involves_person':
        return 'Team / Stakeholder';
      case 'project_contains_task':
        return 'Project Task';
      case 'task_assigned_to_person':
        return 'Assigned Person';
      case 'task_for_project':
        return 'Belongs to Project';
      case 'course_uses_library_item':
        return 'Course Material';
      case 'course_has_note':
        return 'Study Note';
      case 'trip_has_reservation':
        return 'Trip Reservation';
      case 'trip_has_companion':
        return 'Travel Companion';
      case 'trip_has_expense':
        return 'Trip Expense';
      case 'asset_purchased_via_transaction':
        return 'Purchase Record';
      case 'asset_loaned_to_person':
        return 'Loaned To';
      case 'decision_impacts_project':
        return 'Impacted Project';
      case 'decision_supported_by_evidence':
        return 'Supporting Evidence';
      default:
        return 'Related Resource';
    }
  }

  public getAllRelations(): CrossDomainRelation[] {
    return Array.from(this.relations.values());
  }

  public clear(): void {
    this.relations.clear();
    this.sourceIndex.clear();
    this.targetIndex.clear();
  }
}

export const crossDomainRelationEngine = new CrossDomainRelationEngine();
