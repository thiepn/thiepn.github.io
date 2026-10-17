import React, { useState } from 'react';
import {
  X,
  Plus,
  FileText,
  CheckSquare,
  Folder,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  Heart,
  Plane,
  Shield,
  GitBranch,
  Sparkles,
  Link,
  Search,
} from 'lucide-react';
import { ResourceType, createResourceEnvelope } from '../core/resource/resourceCore';
import { moduleRegistryV2 } from '../core/modules/moduleRegistry';

export interface UnifiedCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateResource: (type: ResourceType, title: string, data: any, prefilledRelation?: { id: string; type: ResourceType; label: string }) => Promise<void> | void;
  activeContext?: { id: string; title: string; type: ResourceType };
  initialResourceType?: ResourceType;
}

interface ResourceOption {
  type: ResourceType;
  label: string;
  category: 'core' | 'knowledge' | 'life';
  icon: React.ReactNode;
  primaryPrompt: string;
  secondaryPrompt?: string;
  secondaryFieldKey?: string;
}

const RESOURCE_OPTIONS: ResourceOption[] = [
  {
    type: 'note',
    label: 'Markdown Note',
    category: 'core',
    icon: <FileText className="w-4 h-4 text-stone-500" />,
    primaryPrompt: 'Note title',
    secondaryPrompt: 'Initial content or summary (optional)',
    secondaryFieldKey: 'content',
  },
  {
    type: 'task',
    label: 'Task / Action Item',
    category: 'core',
    icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
    primaryPrompt: 'What needs to be done?',
    secondaryPrompt: 'Due date / timeframe (e.g. 2026-09-15)',
    secondaryFieldKey: 'dueDate',
  },
  {
    type: 'project',
    label: 'Project',
    category: 'core',
    icon: <Folder className="w-4 h-4 text-amber-500" />,
    primaryPrompt: 'Project Name',
    secondaryPrompt: 'Target outcome or deliverable',
    secondaryFieldKey: 'outcome',
  },
  {
    type: 'person',
    label: 'Person / Contact',
    category: 'life',
    icon: <Users className="w-4 h-4 text-blue-500" />,
    primaryPrompt: 'Full Name',
    secondaryPrompt: 'Organization or relationship role',
    secondaryFieldKey: 'organization',
  },
  {
    type: 'decision',
    label: 'Decision Record',
    category: 'life',
    icon: <GitBranch className="w-4 h-4 text-teal-500" />,
    primaryPrompt: 'Decision question or proposition',
    secondaryPrompt: 'Options considered (comma separated)',
    secondaryFieldKey: 'options',
  },
  {
    type: 'course',
    label: 'Course / Learning Deck',
    category: 'knowledge',
    icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
    primaryPrompt: 'Course title',
    secondaryPrompt: 'Topic or subject area',
    secondaryFieldKey: 'topic',
  },
  {
    type: 'book',
    label: 'Book / Reference',
    category: 'knowledge',
    icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
    primaryPrompt: 'Book title',
    secondaryPrompt: 'Author(s)',
    secondaryFieldKey: 'author',
  },
  {
    type: 'transaction',
    label: 'Finance Transaction',
    category: 'life',
    icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
    primaryPrompt: 'Transaction Description',
    secondaryPrompt: 'Amount ($ e.g. 45.00)',
    secondaryFieldKey: 'amount',
  },
  {
    type: 'habit',
    label: 'Habit / Routine',
    category: 'life',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    primaryPrompt: 'Habit Name',
    secondaryPrompt: 'Target frequency (e.g. Daily, 3x/week)',
    secondaryFieldKey: 'frequency',
  },
  {
    type: 'asset',
    label: 'Asset / Physical Property',
    category: 'life',
    icon: <Shield className="w-4 h-4 text-orange-500" />,
    primaryPrompt: 'Asset Name',
    secondaryPrompt: 'Location / Serial Number',
    secondaryFieldKey: 'serial',
  },
  {
    type: 'itinerary',
    label: 'Travel Itinerary',
    category: 'life',
    icon: <Plane className="w-4 h-4 text-sky-500" />,
    primaryPrompt: 'Trip Destination / Name',
    secondaryPrompt: 'Dates (e.g. Oct 10 - Oct 18)',
    secondaryFieldKey: 'dates',
  },
];

export const UnifiedCreateModal: React.FC<UnifiedCreateModalProps> = ({
  isOpen,
  onClose,
  onCreateResource,
  activeContext,
  initialResourceType = 'note',
}) => {
  const [selectedType, setSelectedType] = useState<ResourceType>(initialResourceType);
  const [title, setTitle] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeContextLink, setIncludeContextLink] = useState(true);

  if (!isOpen) return null;

  const currentOption = RESOURCE_OPTIONS.find((opt) => opt.type === selectedType) || RESOURCE_OPTIONS[0];

  const filteredOptions = RESOURCE_OPTIONS.filter((opt) => {
    if (!searchQuery) return true;
    return (
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Record<string, any> = {};
    if (currentOption.secondaryFieldKey && secondaryValue.trim()) {
      data[currentOption.secondaryFieldKey] = secondaryValue.trim();
    }

    const prefilledRelation =
      activeContext && includeContextLink
        ? {
            id: activeContext.id,
            type: activeContext.type,
            label: selectedType === 'task' ? 'task_of' : 'related_to',
          }
        : undefined;

    await onCreateResource(selectedType, title.trim(), data, prefilledRelation);
    setTitle('');
    setSecondaryValue('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 id="create-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Create New Resource
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close creation dialog"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Resource Type Chooser */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Resource Type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium transition-all text-left ${
                    selectedType === opt.type
                      ? 'bg-white dark:bg-stone-800 shadow-xs border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <span className="shrink-0">{opt.icon}</span>
                  <span className="truncate">{opt.label.split('/')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Context Prefill Indicator (Visible Prefill Principle) */}
          {activeContext && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs text-stone-700 dark:text-stone-300 truncate">
                  Link to active context: <strong className="font-semibold">{activeContext.title}</strong>
                </span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeContextLink}
                  onChange={(e) => setIncludeContextLink(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>Attach</span>
              </label>
            </div>
          )}

          {/* Primary Input Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              {currentOption.primaryPrompt}
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${currentOption.label.toLowerCase()}...`}
              className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Secondary Field (Minimal initial fields) */}
          {currentOption.secondaryPrompt && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                {currentOption.secondaryPrompt}
              </label>
              <input
                type="text"
                value={secondaryValue}
                onChange={(e) => setSecondaryValue(e.target.value)}
                placeholder="Optional detail..."
                className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
            >
              Create {currentOption.label.split('/')[0]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
