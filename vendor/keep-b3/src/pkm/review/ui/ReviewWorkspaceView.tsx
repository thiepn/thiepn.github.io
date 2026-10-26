import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Layers,
  Settings,
  BarChart3,
  BookOpen,
  Folder as FolderIcon,
  Tag,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import { ReviewFilterScope, ReviewSettings } from '../reviewTypes';
import { reviewService, ActiveReviewItem } from '../reviewService';
import { cardIndex } from '../cardIndex';
import { reviewStorageService } from '../reviewStorageService';
import { ReviewSessionView } from './ReviewSessionView';
import { CardBrowserView } from './CardBrowserView';
import { ReviewAnalyticsView } from './ReviewAnalyticsView';
import { CardGeneratorStudioView } from './CardGeneratorStudioView';

export interface ReviewWorkspaceViewProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId?: string;
  onOpenNote: (noteId: string, line?: number) => void;
  onUpdateNoteContent?: (noteId: string, updatedContent: string) => void;
}

export const ReviewWorkspaceView: React.FC<ReviewWorkspaceViewProps> = ({
  notes,
  folders,
  activeNoteId,
  onOpenNote,
  onUpdateNoteContent,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'browser' | 'generator' | 'practice' | 'analytics' | 'settings'>('queue');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [scopeType, setScopeType] = useState<'vault' | 'activeNote' | 'folder' | 'tag'>('vault');
  const [activeSessionQueue, setActiveSessionQueue] = useState<ActiveReviewItem[] | null>(null);
  const [isPracticeSession, setIsPracticeSession] = useState(false);
  const [settings, setSettings] = useState<ReviewSettings>(reviewService.getSettings());

  // Sync notes into card index on load or notes change
  useEffect(() => {
    reviewService.syncNotes(notes);
  }, [notes]);

  // Subscribe to review service / storage updates
  useEffect(() => {
    const unsub = reviewService.subscribe(() => {
      setSettings(reviewService.getSettings());
    });
    return unsub;
  }, []);

  // Compute scope
  const currentScope: ReviewFilterScope = useMemo(() => {
    if (scopeType === 'activeNote' && activeNoteId) {
      return { noteId: activeNoteId };
    }
    if (scopeType === 'folder' && selectedFolderId !== 'all') {
      return { folderId: selectedFolderId };
    }
    if (scopeType === 'tag' && selectedTag !== 'all') {
      return { tag: selectedTag };
    }
    return {};
  }, [scopeType, activeNoteId, selectedFolderId, selectedTag]);

  // Available tags across cards
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const card of cardIndex.getAllCards()) {
      for (const t of card.tags) {
        tags.add(t.replace(/^#/, ''));
      }
    }
    return Array.from(tags).sort();
  }, [notes]);

  const queueSummary = useMemo(() => {
    return reviewService.getQueueSummary(currentScope);
  }, [currentScope, notes]);

  const handleStartSession = (practice = false) => {
    const queue = reviewService.buildReviewQueue({
      ...currentScope,
      practiceMode: practice,
    });
    setIsPracticeSession(practice);
    setActiveSessionQueue(queue);
  };

  const handleFinishSession = () => {
    setActiveSessionQueue(null);
    setIsPracticeSession(false);
  };

  const handleUpdateSettings = (partial: Partial<ReviewSettings>) => {
    reviewService.updateSettings(partial);
    setSettings(reviewService.getSettings());
  };

  // If inside an active review session, render full ReviewSessionView
  if (activeSessionQueue !== null) {
    return (
      <ReviewSessionView
        queue={activeSessionQueue}
        practiceMode={isPracticeSession}
        onFinishSession={handleFinishSession}
        onOpenNote={onOpenNote}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 dark:bg-neutral-950 overflow-y-auto">
      {/* Workspace Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Knowledge Review & Active Recall
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Spaced repetition powered by deterministic FSRS-4.5
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-50 dark:bg-neutral-800/50 text-xs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'queue'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Review Queue
            </button>
            <button
              onClick={() => setActiveTab('browser')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'browser'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Card Browser
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'generator'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Card Studio (P8)
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'practice'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Practice / Cram
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Body per Tab */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-6">
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Scope Selector Bar */}
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">Study Scope:</span>
                <select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as any)}
                  className="py-1 px-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none"
                >
                  <option value="vault">Entire Vault</option>
                  {activeNoteId && <option value="activeNote">Current Note Only</option>}
                  <option value="folder">By Folder</option>
                  <option value="tag">By Tag</option>
                </select>

                {scopeType === 'folder' && (
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="py-1 px-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                  >
                    <option value="all">Select Folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}

                {scopeType === 'tag' && (
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="py-1 px-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                  >
                    <option value="all">Select Tag</option>
                    {availableTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-neutral-500">
                Total scoped: <span className="font-medium text-neutral-800 dark:text-neutral-200">{queueSummary.totalCards}</span> cards
              </div>
            </div>

            {/* Queue Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Due for Review</div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {queueSummary.dueCount}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Requires immediate recall</div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">New Cards Available</div>
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {queueSummary.newCount}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Daily limit: {settings.dailyNewLimit}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">In Learning</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {queueSummary.learningCount}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Steps & lapses</div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Mature Knowledge</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {queueSummary.matureCount}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Interval ≥ 21 days</div>
              </div>
            </div>

            {/* Main Action Banner */}
            <div className="p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-full">
                <Brain className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {queueSummary.dueCount + queueSummary.newCount > 0
                    ? `Ready to review ${queueSummary.dueCount + Math.min(queueSummary.newCount, settings.dailyNewLimit)} cards`
                    : 'All caught up for today!'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Active recall strengthens biological memory traces. Rated with FSRS-4.5.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => handleStartSession(false)}
                  disabled={queueSummary.dueCount + queueSummary.newCount === 0}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-40"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Review Session</span>
                </button>
                <button
                  onClick={() => handleStartSession(true)}
                  disabled={queueSummary.totalCards === 0}
                  className="px-4 py-2.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-40"
                >
                  Practice All (No Schedule Change)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'browser' && <CardBrowserView onOpenNote={onOpenNote} />}

        {activeTab === 'generator' && (
          <CardGeneratorStudioView
            notes={notes}
            activeNoteId={activeNoteId}
            onUpdateNoteContent={onUpdateNoteContent}
            onOpenNote={onOpenNote}
          />
        )}

        {activeTab === 'practice' && (
          <div className="p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Practice & Cram Mode
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Study any card in your notes without altering FSRS scheduling states, due dates, or historical stability calculations.
              </p>
            </div>
            <button
              onClick={() => handleStartSession(true)}
              disabled={queueSummary.totalCards === 0}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Cram Session ({queueSummary.totalCards} cards)</span>
            </button>
          </div>
        )}

        {activeTab === 'analytics' && <ReviewAnalyticsView />}

        {activeTab === 'settings' && (
          <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-6 max-w-2xl mx-auto">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              Spaced Repetition Settings
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-neutral-800 dark:text-neutral-200">
                    Desired Retention Target
                  </label>
                  <p className="text-neutral-500">
                    Target recall probability (0.70 to 0.98). Default 90%
                  </p>
                </div>
                <select
                  value={settings.desiredRetention}
                  onChange={(e) => handleUpdateSettings({ desiredRetention: parseFloat(e.target.value) })}
                  className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value={0.80}>80%</option>
                  <option value={0.85}>85%</option>
                  <option value={0.90}>90% (Recommended)</option>
                  <option value={0.95}>95%</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-neutral-800 dark:text-neutral-200">
                    Daily New Card Limit
                  </label>
                  <p className="text-neutral-500">
                    Maximum new flashcards introduced per day
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={settings.dailyNewLimit}
                  onChange={(e) => handleUpdateSettings({ dailyNewLimit: parseInt(e.target.value, 10) || 20 })}
                  className="w-20 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-right font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-neutral-800 dark:text-neutral-200">
                    Bury Sibling Cards Until Tomorrow
                  </label>
                  <p className="text-neutral-500">
                    Prevents seeing multiple cloze deletions from the same sentence on the same day
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.burySiblings}
                  onChange={(e) => handleUpdateSettings({ burySiblings: e.target.checked })}
                  className="w-4 h-4 rounded text-neutral-900"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-neutral-800 dark:text-neutral-200">
                    Show Predicted Rating Intervals
                  </label>
                  <p className="text-neutral-500">
                    Display forecasted intervals on Again / Hard / Good / Easy buttons
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showPredictedIntervals}
                  onChange={(e) => handleUpdateSettings({ showPredictedIntervals: e.target.checked })}
                  className="w-4 h-4 rounded text-neutral-900"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
