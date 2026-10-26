import React from 'react';
import {
  Mail,
  Calendar,
  FileText,
  Zap,
  Sparkles,
  Clock,
  CheckCircle,
  Eye,
  Archive,
  AlertCircle,
  Paperclip,
  User,
  Folder,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { UniversalInboxItem, InboxState } from '../inboxTypes';

export interface UniversalInboxItemRowProps {
  item: UniversalInboxItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: (e: React.MouseEvent) => void;
  onUpdateState: (state: InboxState) => void;
  onOpenSnoozeModal?: () => void;
}

export const UniversalInboxItemRow: React.FC<UniversalInboxItemRowProps> = ({
  item,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onUpdateState,
  onOpenSnoozeModal,
}) => {
  const getSourceIcon = () => {
    switch (item.source) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500 stroke-[2.25]" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-emerald-500 stroke-[2.25]" />;
      case 'file':
        return <FileText className="w-4 h-4 text-amber-500 stroke-[2.25]" />;
      case 'local-capture':
        return <Zap className="w-4 h-4 text-purple-500 stroke-[2.25]" />;
      default:
        return <Sparkles className="w-4 h-4 text-stone-500 stroke-[2.25]" />;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isUnprocessed = item.state === 'new' || item.state === 'seen';
  const hasArtifacts = item.generatedArtifacts && item.generatedArtifacts.length > 0;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-start gap-3 p-3.5 border-b border-stone-200 dark:border-stone-800/80 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-amber-50/80 dark:bg-amber-950/30'
          : item.state === 'new'
          ? 'bg-white dark:bg-stone-900 hover:bg-stone-50/90 dark:hover:bg-stone-800/50'
          : 'bg-stone-50/50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400 hover:bg-stone-100/70 dark:hover:bg-stone-800/40'
      }`}
    >
      {/* Checkbox */}
      <div
        onClick={onToggleCheck}
        className="mt-0.5 flex-shrink-0 cursor-pointer p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          className="rounded border-stone-300 dark:border-stone-700 text-amber-600 focus:ring-amber-500 pointer-events-none"
        />
      </div>

      {/* Source Icon */}
      <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60">
        {getSourceIcon()}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 truncate">
            {/* Unseen indicator dot */}
            {item.state === 'new' && (
              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
            )}

            <span className={`text-xs truncate ${item.state === 'new' ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-300'}`}>
              {item.senderOrOwner || 'Capture'}
            </span>

            {/* External Badge (e.g. Changed externally) */}
            {item.externalState?.hasChangedExternally && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <AlertCircle className="w-2.5 h-2.5" />
                Updated
              </span>
            )}

            {/* External Starred / Important */}
            {item.externalState?.isImportant && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                Important
              </span>
            )}
          </div>

          <span className="text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap flex-shrink-0">
            {formatTime(item.receivedAt)}
          </span>
        </div>

        {/* Title */}
        <h4 className={`text-sm truncate mb-1 ${item.state === 'new' ? 'font-semibold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-800 dark:text-stone-200'}`}>
          {item.title}
        </h4>

        {/* Preview snippet */}
        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
          {item.preview || item.contentExcerpt || 'No preview available'}
        </p>

        {/* Metadata Pills: Attachments, Threads, Generated Artifacts */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {item.attachmentsMeta && item.attachmentsMeta.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              <Paperclip className="w-3 h-3" />
              {item.attachmentsMeta.length} {item.attachmentsMeta.length === 1 ? 'file' : 'files'}
            </span>
          )}

          {item.threadMeta && item.threadMeta.messageCount > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
              {item.threadMeta.messageCount} messages
            </span>
          )}

          {item.matchedPersonName && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <User className="w-3 h-3" />
              {item.matchedPersonName}
            </span>
          )}

          {item.matchedProjectTitle && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              <Folder className="w-3 h-3" />
              {item.matchedProjectTitle}
            </span>
          )}

          {hasArtifacts && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 font-medium">
              <CheckCircle className="w-3 h-3 text-green-600" />
              {item.generatedArtifacts?.length} {item.generatedArtifacts?.length === 1 ? 'Artifact' : 'Artifacts'}
            </span>
          )}

          {item.state === 'snoozed' && item.snoozedUntil && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              <Clock className="w-3 h-3" />
              Snoozed until {item.snoozedUntil}
            </span>
          )}
        </div>
      </div>

      {/* Quick Action buttons on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center pl-2">
        {item.state === 'new' && (
          <button
            title="Mark Seen"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateState('seen');
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        {isUnprocessed && (
          <button
            title="Mark Processed"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateState('processed');
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenSnoozeModal && (
          <button
            title="Snooze Item"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSnoozeModal();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          title="Dismiss from Inbox"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateState('dismissed');
          }}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
