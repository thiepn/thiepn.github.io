import React from 'react';
import {
  ArrowLeft,
  Star,
  PanelRight,
  FileText,
  CheckSquare,
  Users,
  GraduationCap,
  Plane,
  Shield,
  GitBranch,
  DollarSign,
  Heart,
  Sparkles,
  BookOpen,
  Folder,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { ResourceActionMenu } from './ResourceActionMenu';

export interface ResourceHeaderV2Props {
  resource: ResourceCore;
  contextName?: string;
  onBack?: () => void;
  onToggleFavorite?: () => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
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
  onOpenConnections?: () => void;
  onAddRelation?: () => void;
  onAddTask?: () => void;
  onStartContext?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
}

export function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case 'note':
      return <FileText className="w-4 h-4 text-stone-500" />;
    case 'task':
      return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    case 'project':
      return <Folder className="w-4 h-4 text-amber-500" />;
    case 'person':
      return <Users className="w-4 h-4 text-blue-500" />;
    case 'course':
      return <GraduationCap className="w-4 h-4 text-purple-500" />;
    case 'book':
    case 'highlight':
      return <BookOpen className="w-4 h-4 text-indigo-500" />;
    case 'transaction':
      return <DollarSign className="w-4 h-4 text-emerald-600" />;
    case 'health_metric':
    case 'workout':
      return <Heart className="w-4 h-4 text-rose-500" />;
    case 'itinerary':
    case 'reservation':
      return <Plane className="w-4 h-4 text-sky-500" />;
    case 'asset':
      return <Shield className="w-4 h-4 text-orange-500" />;
    case 'decision':
    case 'prediction':
      return <GitBranch className="w-4 h-4 text-teal-500" />;
    case 'habit':
    case 'routine':
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    default:
      return <FileText className="w-4 h-4 text-stone-500" />;
  }
}

export const ResourceHeaderV2: React.FC<ResourceHeaderV2Props> = ({
  resource,
  contextName,
  onBack,
  onToggleFavorite,
  onToggleInspector,
  isInspectorOpen,
  primaryAction,
  secondaryAction,
  onOpenConnections,
  onAddRelation,
  onAddTask,
  onStartContext,
  onExport,
  onShare,
  onArchive,
  onTrash,
  onRestore,
}) => {
  const isArchived = !!resource.archived;
  const isTrashed = !!resource.trashed;

  return (
    <header className="px-4 py-2.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 sticky top-0 z-30 select-none">
      {/* Left: Back button & Breadcrumb / Identity */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-stone-100 dark:bg-stone-800 shrink-0">
            {getResourceTypeIcon(resource.type)}
          </div>

          <div className="flex flex-col min-w-0">
            {contextName && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate leading-none mb-0.5">
                {contextName}
              </span>
            )}
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 truncate leading-snug">
                {resource.title || 'Untitled'}
              </h1>

              {/* Status / Type Pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                  {resource.type}
                </span>

                {isArchived && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    Archived
                  </span>
                )}

                {isTrashed && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                    Trash
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Primary 1-3 Visible Actions & More Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Visible Primary Action (e.g. + Task, Follow-up, Log) */}
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {primaryAction.icon}
            <span className="hidden sm:inline">{primaryAction.label}</span>
          </button>
        )}

        {/* Secondary Action */}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors"
          >
            {secondaryAction.icon}
            <span>{secondaryAction.label}</span>
          </button>
        )}

        {/* Favorite Toggle Action */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={resource.pinned ? 'Unpin favorite' : 'Pin to favorites'}
            className={`p-1.5 rounded-lg transition-colors ${
              resource.pinned
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Star className={`w-4 h-4 ${resource.pinned ? 'fill-amber-500' : ''}`} />
          </button>
        )}

        {/* Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            type="button"
            onClick={onToggleInspector}
            aria-label={isInspectorOpen ? 'Close resource inspector' : 'Open resource inspector'}
            aria-expanded={isInspectorOpen}
            className={`p-1.5 rounded-lg transition-colors ${
              isInspectorOpen
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}

        {/* Canonical 6-Tier More Action Menu */}
        <ResourceActionMenu
          resource={resource}
          onOpenInspector={onToggleInspector}
          onOpenConnections={onOpenConnections}
          onAddRelation={onAddRelation}
          onAddTask={onAddTask}
          onStartContext={onStartContext}
          onExport={onExport}
          onShare={onShare}
          onToggleFavorite={onToggleFavorite}
          onArchive={onArchive}
          onTrash={onTrash}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
};
