/**
 * Phase P59 - Context Lens Inspector Panel
 * Provides a rich, domain-adaptive contextual panel displaying
 * Working Set items, Explainability tooltips, "What Changed?" diffs,
 * and AI Scope Previews.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  CheckSquare,
  FileText,
  Users,
  Inbox,
  Scale,
  Clock,
  AlertCircle,
  Pin,
  PinOff,
  Sparkles,
  HelpCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  ContextDescriptor,
  WorkingSetItem,
  AttentionItem,
  ContextAIScopePreview,
} from '../contextTypes';
import { contextEngine } from '../contextEngine';
import { contextStorage } from '../contextStorage';
import { attentionEngine } from '../attentionEngine';

interface ContextLensPanelProps {
  context: ContextDescriptor | null;
  notes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onOpenResource?: (resourceType: string, id: string) => void;
  onClose?: () => void;
  onNewNoteInContext?: (context: ContextDescriptor) => void;
  onOpenContextSwitcher?: () => void;
}

type LensTab = 'overview' | 'tasks' | 'notes' | 'decisions' | 'timeline' | 'attention';

export const ContextLensPanel: React.FC<ContextLensPanelProps> = ({
  context,
  notes,
  folders,
  onOpenNote,
  onOpenResource,
  onClose,
  onNewNoteInContext,
  onOpenContextSwitcher,
}) => {
  const [activeTab, setActiveTab] = useState<LensTab>('overview');
  const [selectedExplainerItem, setSelectedExplainerItem] = useState<WorkingSetItem | null>(null);
  const [showAIScopeModal, setShowAIScopeModal] = useState(false);
  const [aiScopePreview, setAIScopePreview] = useState<ContextAIScopePreview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Subscribe to context changes
  const [, setTick] = useState(0);
  useEffect(() => {
    return contextEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const snapshot = useMemo(() => {
    if (!context) return null;
    return contextEngine.getSnapshot(context, notes, folders);
  }, [context, notes, folders]);

  if (!context || !snapshot) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-900 border-l border-slate-800">
        <Layers className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Active Context</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select a Project, Course, Goal, Trip, or Daily context to inspect its unified working set.
        </p>
        {onOpenContextSwitcher && (
          <button
            onClick={onOpenContextSwitcher}
            className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
          >
            Select Context
          </button>
        )}
      </div>
    );
  }

  const isPinned = contextEngine.isPinned();

  const handleTogglePin = () => {
    contextEngine.setPinned(!isPinned);
  };

  const handleOpenAIScope = () => {
    const preview = contextEngine.getAIScopePreview(context, notes);
    setAIScopePreview(preview);
    setShowAIScopeModal(true);
    setAiAnswer(null);
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    // Deterministic client-side synthesis over bounded working set
    setTimeout(() => {
      setIsAiLoading(false);
      const topTasks = snapshot.workingSet.tasks.slice(0, 3).map((t) => `• ${t.title}`).join('\n');
      const topNotes = snapshot.workingSet.notes.slice(0, 3).map((n) => `• ${n.title}`).join('\n');
      setAiAnswer(
        `Based on the explicit Working Set for **${context.title}**:\n\n` +
        `**Key Priorities:**\n${topTasks || '• No open tasks in current scope'}\n\n` +
        `**Relevant Documentation:**\n${topNotes || '• No notes in current scope'}\n\n` +
        `*Note: Sensitive domains (Health/Finance) were excluded to protect privacy. Recommendations are proposals only.*`
      );
    }, 400);
  };

  const handlePinResource = (item: WorkingSetItem) => {
    if (item.isPinned) {
      contextStorage.unpinResource(context.id, item.resourceId);
    } else {
      contextStorage.pinResource(context.id, item);
    }
    setTick((t) => t + 1);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200 border-l border-slate-800 text-xs">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-blue-400 font-bold shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-100 truncate">{context.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono uppercase">
                {context.type}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">{context.subtitle || 'Active Working Context'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Unpin Context (allow auto-switching)' : 'Pin Context (keep active during navigation)'}
            className={`p-1.5 rounded transition-colors ${
              isPinned ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleOpenAIScope}
            title="Ask AI with Bounded Context Scope"
            className="p-1.5 rounded text-purple-400 hover:bg-purple-950/40 border border-purple-800/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/20 px-2 py-1 space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
            activeTab === 'tasks' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Tasks</span>
          <span className="px-1 py-0.2 bg-slate-700/60 rounded text-[9px] font-mono text-slate-300">
            {snapshot.workingSet.tasks.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
            activeTab === 'notes' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Notes</span>
          <span className="px-1 py-0.2 bg-slate-700/60 rounded text-[9px] font-mono text-slate-300">
            {snapshot.workingSet.notes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
            activeTab === 'timeline' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Changed</span>
          {snapshot.whatChanged.eventsCount > 0 && (
            <span className="px-1 py-0.2 bg-blue-900 text-blue-300 rounded text-[9px] font-mono">
              {snapshot.whatChanged.eventsCount}
            </span>
          )}
        </button>
        {snapshot.attention.length > 0 && (
          <button
            onClick={() => setActiveTab('attention')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
              activeTab === 'attention' ? 'bg-amber-950/40 text-amber-300' : 'text-amber-500 hover:text-amber-400'
            }`}
          >
            <span>Attention</span>
            <span className="px-1 py-0.2 bg-amber-900 text-amber-200 rounded text-[9px] font-mono">
              {snapshot.attention.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Headline & Status */}
            <div className="p-2.5 bg-slate-950/60 rounded-md border border-slate-800/80">
              <h4 className="text-xs font-semibold text-slate-200">{snapshot.summary.headline}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{snapshot.summary.statusText}</p>
              {snapshot.summary.nextMilestone && (
                <div className="mt-2 text-[10px] text-blue-400 bg-blue-950/40 border border-blue-900/50 px-2 py-1 rounded">
                  {snapshot.summary.nextMilestone}
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              {snapshot.summary.keyMetrics.map((m, idx) => (
                <div key={idx} className="p-2 bg-slate-950/40 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                  <div className={`text-sm font-semibold mt-0.5 ${
                    m.tone === 'rose' ? 'text-rose-400' :
                    m.tone === 'amber' ? 'text-amber-400' :
                    m.tone === 'emerald' ? 'text-emerald-400' :
                    m.tone === 'purple' ? 'text-purple-400' :
                    'text-blue-400'
                  }`}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-col space-y-1.5">
              {onNewNoteInContext && (
                <button
                  onClick={() => onNewNoteInContext(context)}
                  className="w-full flex items-center justify-between p-2 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>New Note in this Context</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Working Set Tasks</span>
              <span>{snapshot.workingSet.tasks.length} tasks</span>
            </div>
            {snapshot.workingSet.tasks.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-3 text-center">No tasks linked to this context.</p>
            ) : (
              snapshot.workingSet.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2 rounded bg-slate-950/40 border border-slate-800 flex items-start justify-between space-x-2 group"
                >
                  <div className="flex items-start space-x-2 min-w-0">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-slate-200 font-medium truncate">{task.title}</div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <span>{task.subtitle}</span>
                        {task.date && <span className="text-amber-400 font-mono">· {task.date}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => setSelectedExplainerItem(task)}
                      title="Why is this relevant?"
                      className="p-1 rounded text-slate-500 hover:text-blue-400"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onOpenNote(task.resourceId)}
                      title="Open Note"
                      className="p-1 rounded text-slate-500 hover:text-slate-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Context Documentation</span>
              <span>{snapshot.workingSet.notes.length} notes</span>
            </div>
            {snapshot.workingSet.notes.map((noteItem) => (
              <div
                key={noteItem.id}
                className="p-2 rounded bg-slate-950/40 border border-slate-800 flex items-center justify-between space-x-2 group hover:border-slate-700 transition-colors"
              >
                <div
                  onClick={() => onOpenNote(noteItem.resourceId)}
                  className="flex items-center space-x-2 min-w-0 cursor-pointer flex-1"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-slate-200 font-medium truncate flex items-center space-x-1">
                      <span>{noteItem.title}</span>
                      {noteItem.isPinned && (
                        <span className="px-1 py-0.2 bg-amber-950/80 text-amber-300 text-[8px] rounded">PINNED</span>
                      )}
                      {noteItem.isSuggested && (
                        <span className="px-1 py-0.2 bg-purple-950/80 text-purple-300 text-[8px] rounded">SUGGESTED</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{noteItem.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePinResource(noteItem)}
                    title={noteItem.isPinned ? 'Unpin from Context' : 'Pin to Context'}
                    className={`p-1 rounded ${noteItem.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setSelectedExplainerItem(noteItem)}
                    title="Why is this relevant?"
                    className="p-1 rounded text-slate-500 hover:text-blue-400"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TIMELINE / WHAT CHANGED TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Semantic Changes</span>
              <button
                onClick={() => contextEngine.markContextReviewed(context.id)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Mark Reviewed
              </button>
            </div>
            {snapshot.whatChanged.events.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-slate-950/40 rounded border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-slate-400">No changes since last review.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Last reviewed: {new Date(snapshot.whatChanged.lastReviewedAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {snapshot.whatChanged.events.map((evt) => (
                  <div key={evt.id} className="p-2 bg-slate-950/40 border border-slate-800 rounded">
                    <div className="text-[10px] text-blue-400 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-slate-200 mt-0.5">{evt.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ATTENTION TAB */}
        {activeTab === 'attention' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 mb-1">Context Attention Signals</div>
            {snapshot.attention.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded border ${
                  item.severity === 'important'
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase">
                  <span>{item.sourceDomain} · {item.reason}</span>
                  {item.dueAt && <span className="font-mono">{item.dueAt}</span>}
                </div>
                <p className="text-xs text-slate-200 mt-1">{item.explanation}</p>
                <div className="mt-2 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      attentionEngine.snoozeItem(item.id, 1);
                      setTick((t) => t + 1);
                    }}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                  >
                    Snooze 1d
                  </button>
                  {item.actionTarget?.type === 'note' && (
                    <button
                      onClick={() => onOpenNote(item.actionTarget!.id)}
                      className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500 font-medium"
                    >
                      {item.actionLabel || 'Open'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WHY IS THIS RELEVANT MODAL / TOOLTIP */}
      {selectedExplainerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 max-w-sm w-full shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                <HelpCircle className="w-4 h-4" />
                <span>Why is this relevant?</span>
              </div>
              <button
                onClick={() => setSelectedExplainerItem(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200">{selectedExplainerItem.title}</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">{selectedExplainerItem.subtitle}</p>
            </div>

            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400 font-mono text-[9px] uppercase">Provenance & Relation</div>
              <div className="text-slate-200">{selectedExplainerItem.relevanceExplanation}</div>
              <div className="text-slate-500 text-[10px] mt-1">
                Classification: <span className="text-blue-400 uppercase font-mono">{selectedExplainerItem.relevanceType}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedExplainerItem(null)}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* AI SCOPE & ASK MODAL */}
      {showAIScopeModal && aiScopePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-lg w-full shadow-2xl text-xs space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Ask Current Context ({aiScopePreview.contextTitle})</span>
              </div>
              <button
                onClick={() => setShowAIScopeModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope disclosure */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">Explicit Scope Disclosure:</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-emerald-400 font-mono">INCLUDED IN WORKING SET:</div>
                <div className="flex flex-wrap gap-1.5">
                  {aiScopePreview.includedSources.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 rounded text-[10px]">
                      {s.title} {s.itemCount ? `(${s.itemCount})` : ''}
                    </span>
                  ))}
                </div>

                <div className="text-[10px] text-rose-400 font-mono pt-1">EXCLUDED SENSITIVE BOUNDARIES:</div>
                <div className="flex flex-wrap gap-1.5">
                  {aiScopePreview.excludedSensitiveSources.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded text-[10px]">
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Q&A */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  placeholder="Ask a question about this context..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAskAI}
                  disabled={isAiLoading || !aiQuestion.trim()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded transition-colors"
                >
                  {isAiLoading ? 'Synthesizing...' : 'Ask'}
                </button>
              </div>

              {aiAnswer && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded text-slate-200 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {aiAnswer}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>Proposal-only. Does not mutate canonical vault data.</span>
              <button
                onClick={() => setShowAIScopeModal(false)}
                className="px-3 py-1 bg-slate-800 text-slate-200 rounded hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
