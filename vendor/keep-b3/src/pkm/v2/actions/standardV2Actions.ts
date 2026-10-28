/**
 * Standard V2.0 / V2.1 Action Registrations
 * 
 * Central registry for all core resource and workflow actions.
 * Enforces risk tiers, reversible undo payloads, and integration with ActionSystemV2.
 */

import { actionSystemV2 } from '../core/actions/actionSystem';
import { V2ActionDefinition } from '../core/actions/actionTypes';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { connectionIndexV2 } from '../core/connections/connectionIndex';

export function initializeStandardV2Actions(options?: {
  onUpdateResource?: (resource: ResourceCore) => Promise<void> | void;
  onDeleteResource?: (id: string, type: ResourceType) => Promise<void> | void;
  onNavigate?: (id: string, type: ResourceType) => void;
  onOpenModal?: (modalName: string, payload?: any) => void;
}): void {
  // 1. Favorite / Pin Toggle
  actionSystemV2.register<{ resource: ResourceCore }, ResourceCore>({
    id: 'resource.toggle_favorite',
    label: 'Toggle Favorite',
    description: 'Pin or favorite the current resource for fast access',
    category: 'edit',
    risk: 'safe',
    undoable: true,
    handler: async (payload) => {
      const prevPinned = !!payload.resource.pinned;
      const updated = {
        ...payload.resource,
        pinned: !prevPinned,
        updatedAt: Date.now(),
      };

      if (options?.onUpdateResource) {
        await options.onUpdateResource(updated);
      }

      return {
        success: true,
        actionId: 'resource.toggle_favorite',
        timestamp: Date.now(),
        data: updated,
        undo: {
          description: `Revert favorite status on ${payload.resource.title}`,
          revert: async () => {
            if (options?.onUpdateResource) {
              await options.onUpdateResource({ ...payload.resource, pinned: prevPinned });
            }
            return true;
          },
        },
      };
    },
  });

  // 2. Archive Resource
  actionSystemV2.register<{ resource: ResourceCore }, ResourceCore>({
    id: 'resource.archive',
    label: 'Archive Resource',
    description: 'Retain resource while marking it inactive',
    category: 'edit',
    risk: 'safe',
    undoable: true,
    handler: async (payload) => {
      const prevArchived = !!payload.resource.archived;
      const updated = {
        ...payload.resource,
        archived: true,
        updatedAt: Date.now(),
      };

      if (options?.onUpdateResource) {
        await options.onUpdateResource(updated);
      }

      return {
        success: true,
        actionId: 'resource.archive',
        timestamp: Date.now(),
        data: updated,
        undo: {
          description: `Unarchive ${payload.resource.title}`,
          revert: async () => {
            if (options?.onUpdateResource) {
              await options.onUpdateResource({ ...payload.resource, archived: prevArchived });
            }
            return true;
          },
        },
      };
    },
  });

  // 3. Trash / Delete Resource
  actionSystemV2.register<{ resource: ResourceCore }, ResourceCore>({
    id: 'resource.trash',
    label: 'Move to Trash',
    description: 'Soft delete resource with recovery capabilities',
    category: 'edit',
    risk: 'destructive',
    requiresConfirmation: false,
    undoable: true,
    handler: async (payload) => {
      const prevTrashed = !!payload.resource.trashed;
      const updated = {
        ...payload.resource,
        trashed: true,
        updatedAt: Date.now(),
      };

      if (options?.onUpdateResource) {
        await options.onUpdateResource(updated);
      }

      return {
        success: true,
        actionId: 'resource.trash',
        timestamp: Date.now(),
        data: updated,
        undo: {
          description: `Restore ${payload.resource.title} from Trash`,
          revert: async () => {
            if (options?.onUpdateResource) {
              await options.onUpdateResource({ ...payload.resource, trashed: prevTrashed });
            }
            return true;
          },
        },
      };
    },
  });

  // 4. Add Structured Relation
  actionSystemV2.register<{
    sourceId: string;
    sourceType: ResourceType;
    targetId: string;
    targetType: ResourceType;
    relationLabel: string;
  }, any>({
    id: 'resource.add_relation',
    label: 'Add Connection',
    description: 'Link the current resource to another resource via a typed relation',
    category: 'edit',
    risk: 'safe',
    undoable: true,
    handler: async (payload) => {
      const edge = connectionIndexV2.addRelation(
        payload.sourceId,
        payload.sourceType,
        payload.targetId,
        payload.targetType,
        payload.relationLabel
      );

      return {
        success: true,
        actionId: 'resource.add_relation',
        timestamp: Date.now(),
        data: edge,
        undo: {
          description: `Remove connection "${payload.relationLabel}"`,
          revert: () => {
            connectionIndexV2.removeEdge(edge.id);
            return true;
          },
        },
      };
    },
  });

  // 5. Remove Structured Relation
  actionSystemV2.register<{ edgeId: string }, boolean>({
    id: 'resource.remove_relation',
    label: 'Remove Connection',
    description: 'Disconnect the relation between two resources',
    category: 'edit',
    risk: 'safe',
    undoable: true,
    handler: async (payload) => {
      const edge = connectionIndexV2.getEdge(payload.edgeId);
      const success = connectionIndexV2.removeEdge(payload.edgeId);

      return {
        success,
        actionId: 'resource.remove_relation',
        timestamp: Date.now(),
        data: success,
        undo: edge
          ? {
              description: `Restore connection "${edge.relationLabel}"`,
              revert: () => {
                connectionIndexV2.addEdge(edge);
                return true;
              },
            }
          : undefined,
      };
    },
  });

  // 6. Share / Export
  actionSystemV2.register<{ resource: ResourceCore }, void>({
    id: 'resource.export',
    label: 'Export Resource',
    description: 'Export resource as Markdown, JSON, or PDF format',
    category: 'export',
    risk: 'safe',
    handler: async (payload) => {
      if (options?.onOpenModal) {
        options.onOpenModal('export_center', payload.resource);
      }
      return {
        success: true,
        actionId: 'resource.export',
        timestamp: Date.now(),
      };
    },
  });

  // 7. Focus / Start Context
  actionSystemV2.register<{ resource: ResourceCore }, void>({
    id: 'context.start',
    label: 'Start Focus Context',
    description: 'Enter a dedicated context session focused on this resource',
    category: 'navigation',
    risk: 'safe',
    handler: async (payload) => {
      if (options?.onOpenModal) {
        options.onOpenModal('start_context', payload.resource);
      }
      return {
        success: true,
        actionId: 'context.start',
        timestamp: Date.now(),
      };
    },
  });
}
