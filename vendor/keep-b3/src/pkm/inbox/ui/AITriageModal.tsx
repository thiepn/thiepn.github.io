import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  User,
  Folder,
  Calendar,
  DollarSign,
  Compass,
  FileText,
} from 'lucide-react';
import { Note } from '../../../types';
import { UniversalInboxItem, AITriageProposal } from '../inboxTypes';
import { universalInboxService } from '../universalInboxService';

export interface AITriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UniversalInboxItem[];
  allNotes: Note[];
  onSaveNote: (note: Note) => void;
}

export const AITriageModal: React.FC<AITriageModalProps> = ({
  isOpen,
  onClose,
  items,
  allNotes,
  onSaveNote,
}) => {
  const [proposals, setProposals] = useState<AITriageProposal[]>(() => {
    return universalInboxService.generateAITriageBatch(items.slice(0, 10));
  });

  const [executedItemIds, setExecutedItemIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleExecuteProposal = (proposal: AITriageProposal) => {
    const item = items.find((i) => i.id === proposal.inboxItemId);
    if (!item) return;

    switch (proposal.suggestedAction) {
      case 'create_task':
        universalInboxService.createTaskFromItem(
          item.id,
          proposal.suggestedTitle || item.title,
          proposal.suggestedDueDate,
          'medium',
          undefined,
          allNotes,
          onSaveNote
        );
        break;

      case 'save_note':
        universalInboxService.saveItemAsNote(
          item.id,
          proposal.suggestedTitle || item.title,
          item.contentExcerpt,
          ['ai-triage', item.source],
          onSaveNote
        );
        break;

      case 'travel_reservation':
        universalInboxService.saveItemAsNote(
          item.id,
          proposal.suggestedTitle || `Travel: ${item.title}`,
          item.contentExcerpt,
          ['travel', 'reservation'],
          onSaveNote
        );
        break;

      case 'finance_review':
        universalInboxService.saveItemAsNote(
          item.id,
          proposal.suggestedTitle || `Receipt: ${item.title}`,
          item.contentExcerpt,
          ['finance', 'receipt'],
          onSaveNote
        );
        break;

      default:
        universalInboxService.updateItemState(item.id, 'processed');
        break;
    }

    // Mark processed
    universalInboxService.updateItemState(item.id, 'processed');
    setExecutedItemIds(new Set([...executedItemIds, item.id]));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create_task':
        return <CheckCircle className="w-4 h-4 text-amber-500" />;
      case 'save_note':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'travel_reservation':
        return <Compass className="w-4 h-4 text-sky-500" />;
      case 'finance_review':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      default:
        return <Check className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                AI Triage & Synthesis Proposals
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Proposal-only review. Actions are only executed upon explicit individual confirmation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Context Disclosure Banner */}
        <div className="px-5 py-3 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Analyzing {items.slice(0, 10).length} unprocessed items with local context matching.</span>
          </div>
          <span className="text-[11px] font-semibold text-stone-500">Zero data retention</span>
        </div>

        {/* Proposals List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {proposals.map((prop) => {
            const item = items.find((i) => i.id === prop.inboxItemId);
            if (!item) return null;
            const isDone = executedItemIds.has(item.id);

            return (
              <div
                key={prop.inboxItemId}
                className={`p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20 opacity-75'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-stone-500 capitalize">{item.source} • {item.senderOrOwner}</span>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5">{item.title}</h4>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    prop.confidence === 'high'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {prop.confidence} Confidence
                  </span>
                </div>

                {/* Proposal Action Card */}
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 my-2.5 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 mt-0.5">
                    {getActionIcon(prop.suggestedAction)}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-800 dark:text-stone-200 capitalize">
                        Suggested Action: {prop.suggestedAction.replace('_', ' ')}
                      </span>
                    </div>

                    {prop.suggestedTitle && (
                      <p className="text-stone-900 dark:text-stone-100 font-semibold mt-1">
                        "{prop.suggestedTitle}"
                      </p>
                    )}

                    <p className="text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                      <strong>Reasoning:</strong> {prop.reasoning}
                    </p>

                    {prop.suggestedDueDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1 mr-3">
                        <Calendar className="w-3 h-3" />
                        Suggested Due: {prop.suggestedDueDate}
                      </span>
                    )}

                    {prop.suggestedPersonName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                        <User className="w-3 h-3" />
                        Matched: {prop.suggestedPersonName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
                      <Check className="w-4 h-4" />
                      Action Executed & Archived
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          universalInboxService.updateItemState(item.id, 'dismissed');
                          setExecutedItemIds(new Set([...executedItemIds, item.id]));
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                      >
                        Dismiss Item
                      </button>
                      <button
                        onClick={() => handleExecuteProposal(prop)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Execute Proposal</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {executedItemIds.size} of {proposals.length} proposals completed
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-700 text-white hover:bg-stone-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
