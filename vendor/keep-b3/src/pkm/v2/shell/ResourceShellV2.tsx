import React, { useState } from 'react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { ResourceHeaderV2 } from './ResourceHeaderV2';
import { UnifiedResourceInspector } from '../inspector/UnifiedResourceInspector';

export interface ResourceShellV2Props {
  resource: ResourceCore;
  children: React.ReactNode;
  contextName?: string;
  onBack?: () => void;
  onNavigateToResource?: (targetId: string, targetType: ResourceType) => void;
  onAddRelationClick?: () => void;
  primaryAction?: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  secondaryAction?: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  contextWorkingSet?: { id: string; title: string; type: ResourceType }[];
  contentStats?: { wordCount: number; charCount: number; readingTimeMinutes: number };
  onToggleFavorite?: () => void;
  onAddTask?: () => void;
  onStartContext?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  initialInspectorOpen?: boolean;
}

export const ResourceShellV2: React.FC<ResourceShellV2Props> = ({
  resource,
  children,
  contextName,
  onBack,
  onNavigateToResource,
  onAddRelationClick,
  primaryAction,
  secondaryAction,
  contextWorkingSet,
  contentStats,
  onToggleFavorite,
  onAddTask,
  onStartContext,
  onExport,
  onShare,
  onArchive,
  onTrash,
  onRestore,
  initialInspectorOpen = false,
}) => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(initialInspectorOpen);

  return (
    <div className="flex flex-col h-full w-full bg-stone-50/50 dark:bg-stone-950 overflow-hidden">
      {/* 1. Unified Resource Header */}
      <ResourceHeaderV2
        resource={resource}
        contextName={contextName}
        onBack={onBack}
        onToggleFavorite={onToggleFavorite}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        isInspectorOpen={isInspectorOpen}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        onOpenConnections={() => setIsInspectorOpen(true)}
        onAddRelation={onAddRelationClick}
        onAddTask={onAddTask}
        onStartContext={onStartContext}
        onExport={onExport}
        onShare={onShare}
        onArchive={onArchive}
        onTrash={onTrash}
        onRestore={onRestore}
      />

      {/* 2. Main Content Frame + Contextual Unified Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Specialized Resource Surface */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>

        {/* Unified Inspector (Desktop side panel / Mobile overlay) */}
        {isInspectorOpen && (
          <div className="absolute inset-y-0 right-0 sm:relative z-40 sm:z-10 flex">
            <UnifiedResourceInspector
              resource={resource}
              isOpen={isInspectorOpen}
              onClose={() => setIsInspectorOpen(false)}
              onNavigateToResource={onNavigateToResource}
              onAddRelationClick={onAddRelationClick}
              contextName={contextName}
              contextWorkingSet={contextWorkingSet}
              contentStats={contentStats}
            />
          </div>
        )}
      </div>
    </div>
  );
};
