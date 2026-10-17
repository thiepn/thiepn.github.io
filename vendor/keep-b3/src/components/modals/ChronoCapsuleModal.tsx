import React, { useState, useMemo, useEffect } from 'react';
import {
  Hourglass,
  BookOpen,
  Mail,
  Lock,
  Unlock,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Shuffle,
  Tag,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  Compass,
  Award,
  Zap,
  Bookmark,
  Share2,
  FastForward,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  ChronoCapsule,
  IncrementalReadingItem,
  CHRONO_STORAGE_CAPSULES,
  CHRONO_STORAGE_READING,
  getDueReadingItems,
  advanceReadingItem,
  getDueCapsules,
  getUpcomingCapsules,
  formatTimeUntilUnlock,
} from '../../pkm/chrono/chronoTypes';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

export interface ChronoCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onOpenNote?: (noteId: string) => void;
  onCreateReflectionNote?: (title: string, content: string, tags?: string[]) => Promise<void> | void;
}

type ChronoTab = 'reading' | 'capsules' | 'seal' | 'add_reading';

export const ChronoCapsuleModal: React.FC<ChronoCapsuleModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  onOpenNote,
  onCreateReflectionNote,
}) => {
  const [activeTab, setActiveTab] = useState<ChronoTab>('reading');

  // Chrono Capsules State
  const [capsules, setCapsules] = useState<ChronoCapsule[]>(() => {
    try {
      const raw = localStorage.getItem(CHRONO_STORAGE_CAPSULES);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Seed initial demo capsule if none exist
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    return [
      {
        id: 'cap-seed-1',
        title: 'Q4 Vision & Focus Predictions',
        message: 'Looking back on our architecture choices: did the local-first PKM foundation scale gracefully? Are we writing daily? Remember to celebrate small compounding wins.',
        sealedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        unlockAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Ready to unseal right away!
        isOpened: false,
        category: 'reflection',
        tags: ['future-self', 'vision'],
      },
    ];
  });

  // Incremental Reading Queue State
  const [readingQueue, setReadingQueue] = useState<IncrementalReadingItem[]>(() => {
    try {
      const raw = localStorage.getItem(CHRONO_STORAGE_READING);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Seed initial demo items from existing notes or defaults
    const todayStr = new Date().toISOString().slice(0, 10);
    return [
      {
        id: 'read-seed-1',
        noteId: notes[0]?.id || 'demo-1',
        title: notes[0]?.title || 'Incremental Reading & Knowledge Compounding',
        excerpt: notes[0]?.content?.slice(0, 300) || 'Incremental reading is a technique where you break long-form literature into bite-sized excerpts that resurface over spaced intervals, preventing reading fatigue while allowing deep synthesis.',
        currentIntervalDays: 1,
        nextReviewDate: todayStr,
        reviewsCount: 0,
        priority: 4,
        isCompleted: false,
        tags: ['reading', 'learning'],
      },
    ];
  });

  // New Capsule Form State
  const [capsuleTitle, setCapsuleTitle] = useState('');
  const [capsuleMessage, setCapsuleMessage] = useState('');
  const [capsuleCategory, setCapsuleCategory] = useState<ChronoCapsule['category']>('reflection');
  const [capsulePresetDays, setCapsulePresetDays] = useState<number>(30);
  const [capsuleSelectedNoteId, setCapsuleSelectedNoteId] = useState<string>('');
  const [sealedSuccess, setSealedSuccess] = useState(false);

  // New Reading Item Form State
  const [newReadingNoteId, setNewReadingNoteId] = useState<string>(() => notes[0]?.id || '');
  const [newReadingExcerpt, setNewReadingExcerpt] = useState<string>('');
  const [newReadingPriority, setNewReadingPriority] = useState<number>(3);
  const [newReadingInterval, setNewReadingInterval] = useState<number>(3);

  // Active unsealed modal view
  const [inspectingCapsule, setInspectingCapsule] = useState<ChronoCapsule | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHRONO_STORAGE_CAPSULES, JSON.stringify(capsules));
    } catch {}
  }, [capsules]);

  useEffect(() => {
    try {
      localStorage.setItem(CHRONO_STORAGE_READING, JSON.stringify(readingQueue));
    } catch {}
  }, [readingQueue]);

  // Due reading items today
  const dueReadingItems = useMemo(() => {
    return getDueReadingItems(readingQueue);
  }, [readingQueue]);

  // Due & upcoming capsules
  const dueCapsules = useMemo(() => {
    return getDueCapsules(capsules).filter((c) => !c.isOpened);
  }, [capsules]);

  const upcomingCapsules = useMemo(() => {
    return getUpcomingCapsules(capsules);
  }, [capsules]);

  const openedCapsules = useMemo(() => {
    return capsules.filter((c) => c.isOpened);
  }, [capsules]);

  // Reading Review Actions
  const handleReviewReadingItem = (item: IncrementalReadingItem, grade: 'soon' | 'later' | 'done') => {
    const updated = advanceReadingItem(item, grade);
    setReadingQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
    soundscapeService.playCompletionChime();
    if (grade === 'done') fireConfetti();
  };

  // Resurface a random note for incremental reading
  const handleResurfaceRandomNote = () => {
    const eligible = notes.filter((n) => !n.trashed && (n.content || '').length > 60);
    if (eligible.length === 0) return;
    const randomNote = eligible[Math.floor(Math.random() * eligible.length)];

    const newItem: IncrementalReadingItem = {
      id: `read-${Date.now()}`,
      noteId: randomNote.id,
      title: randomNote.title || 'Untitled Excerpt',
      excerpt: randomNote.content?.slice(0, 350) || '',
      currentIntervalDays: 1,
      nextReviewDate: new Date().toISOString().slice(0, 10),
      reviewsCount: 0,
      priority: 3,
      isCompleted: false,
      tags: randomNote.tags || ['serendipity'],
    };

    setReadingQueue((prev) => [newItem, ...prev]);
    fireConfetti();
  };

  // Unseal Capsule
  const handleUnsealCapsule = (capsule: ChronoCapsule) => {
    const updated: ChronoCapsule = {
      ...capsule,
      isOpened: true,
      openedAt: new Date().toISOString(),
    };
    setCapsules((prev) => prev.map((c) => (c.id === capsule.id ? updated : c)));
    setInspectingCapsule(updated);
    fireConfetti();
    soundscapeService.playCompletionChime();
  };

  // Submit New Time Capsule
  const handleSealNewCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleTitle.trim() || !capsuleMessage.trim()) return;

    const now = new Date();
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + capsulePresetDays);

    const sourceNote = notes.find((n) => n.id === capsuleSelectedNoteId);

    const newCapsule: ChronoCapsule = {
      id: `cap-${Date.now()}`,
      title: capsuleTitle.trim(),
      message: capsuleMessage.trim(),
      sourceNoteId: sourceNote?.id,
      sourceNoteTitle: sourceNote?.title,
      sealedAt: now.toISOString(),
      unlockAt: unlockDate.toISOString(),
      isOpened: false,
      category: capsuleCategory,
      tags: ['future-letter', capsuleCategory],
    };

    setCapsules((prev) => [newCapsule, ...prev]);
    fireConfetti();
    soundscapeService.playCompletionChime();
    setSealedSuccess(true);
    setTimeout(() => setSealedSuccess(false), 3000);

    // Reset form
    setCapsuleTitle('');
    setCapsuleMessage('');
    setCapsuleSelectedNoteId('');
    setActiveTab('capsules');
  };

  // Submit New Reading Item
  const handleAddReadingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNote = notes.find((n) => n.id === newReadingNoteId);
    if (!targetNote) return;

    const excerptText = newReadingExcerpt.trim() || targetNote.content.slice(0, 300);

    const newItem: IncrementalReadingItem = {
      id: `read-${Date.now()}`,
      noteId: targetNote.id,
      title: targetNote.title || 'Untitled Note',
      excerpt: excerptText,
      currentIntervalDays: newReadingInterval,
      nextReviewDate: new Date().toISOString().slice(0, 10),
      reviewsCount: 0,
      priority: newReadingPriority,
      isCompleted: false,
      tags: targetNote.tags || ['incremental-reading'],
    };

    setReadingQueue((prev) => [newItem, ...prev]);
    fireConfetti();
    setNewReadingExcerpt('');
    setActiveTab('reading');
  };

  // Log unsealed capsule to daily note / new note
  const handleLogCapsuleToNote = async () => {
    if (!inspectingCapsule || !onCreateReflectionNote) return;
    const title = `⏳ Unsealed Capsule: ${inspectingCapsule.title}`;
    const content = `# ${title}\n\n* **Sealed on:** ${new Date(inspectingCapsule.sealedAt).toLocaleDateString()}\n* **Unsealed on:** ${new Date().toLocaleDateString()}\n* **Category:** ${inspectingCapsule.category}\n\n---\n\n### ✉️ Original Message from Past Self:\n> ${inspectingCapsule.message}\n\n---\n\n### 💭 Reflection Today:\n`;

    await onCreateReflectionNote(title, content, ['chrono-capsule', 'reflection']);
    fireConfetti();
    setInspectingCapsule(null);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chrono Capsule & Spaced Incremental Reading Studio (P3)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Chrono Capsule & Incremental Reading Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Tool P3
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Spaced incremental reading queues & time-locked sealed capsules sent into the future
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Ribbon */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-stone-100/60 dark:bg-stone-950/40 border-b border-stone-200 dark:border-stone-800 text-xs shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('reading')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'reading'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Incremental Reading ({dueReadingItems.length} Due)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('capsules')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'capsules'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Time Capsules ({dueCapsules.length} Unsealable)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seal')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'seal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Seal New Capsule</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add_reading')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'add_reading'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Queue Vault Excerpt</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500 font-mono">
            <span>Shortcut: Alt + K</span>
          </div>
        </div>

        {/* Tab 1: Incremental Reading Deck */}
        {activeTab === 'reading' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-indigo-500" />
                  <span>Today's Resurfaced Reading Deck</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Digest literature and long notes incrementally without cognitive overload
                </p>
              </div>

              <button
                type="button"
                onClick={handleResurfaceRandomNote}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-stone-700 dark:text-stone-300 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Resurface Random Gem</span>
              </button>
            </div>

            {dueReadingItems.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  All Due Incremental Readings Complete!
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  You've reviewed all scheduled reading items for today. Use the button above to resurface a forgotten note, or queue new excerpts from your vault.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {dueReadingItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                            Interval: {item.currentIntervalDays}d
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Reviewed {item.reviewsCount} times
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {item.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenNote?.(item.noteId)}
                        className="text-stone-400 hover:text-indigo-600 transition-colors p-1"
                        title="Open full note in workspace"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 font-serif leading-relaxed italic whitespace-pre-wrap">
                      "{item.excerpt}"
                    </div>

                    {/* Spaced Review Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReviewReadingItem(item, 'soon')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors flex items-center gap-1"
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          <span>Soon (1-3d)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReviewReadingItem(item, 'later')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Later (7-30d)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReviewReadingItem(item, 'done')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Fully Digested</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReadingQueue((prev) => prev.filter((q) => q.id !== item.id));
                        }}
                        className="text-stone-400 hover:text-rose-500 p-1 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Time Capsules (Sealed & Unlocked) */}
        {activeTab === 'capsules' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Section 1: Ready to Unseal */}
            {dueCapsules.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Unlock className="w-4 h-4 animate-bounce" />
                  <span>Ready to Unseal! ({dueCapsules.length} Arrived)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {dueCapsules.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-600 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {cap.category}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Sealed {new Date(cap.sealedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {cap.title}
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                        {cap.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleUnsealCapsule(cap)}
                        className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unseal Capsule Ceremony</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Sealed in Time (Upcoming) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500" />
                <span>Sealed in Time ({upcomingCapsules.length} Capsules Locked)</span>
              </h3>

              {upcomingCapsules.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
                  No upcoming capsules locked. Switch to "Seal New Capsule" to send a letter into the future!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {upcomingCapsules.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                          {cap.category}
                        </span>
                        <span className="font-mono text-stone-400">
                          {formatTimeUntilUnlock(cap.unlockAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {cap.title}
                      </h4>
                      <div className="p-2.5 rounded-xl bg-stone-200/50 dark:bg-stone-800/50 text-[11px] text-stone-500 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Locked until {new Date(cap.unlockAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Unlocked / Opened Archives */}
            {openedCapsules.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Past Unsealed Capsules ({openedCapsules.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {openedCapsules.map((cap) => (
                    <div
                      key={cap.id}
                      onClick={() => setInspectingCapsule(cap)}
                      className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-1 hover:border-indigo-400 cursor-pointer transition-colors"
                    >
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {cap.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-2">{cap.message}</p>
                      <span className="text-[10px] text-indigo-500 font-semibold block pt-1">
                        View Letter →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Seal New Capsule */}
        {activeTab === 'seal' && (
          <form onSubmit={handleSealNewCapsule} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>Write a Letter to Your Future Self</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Seal predictions, reflections, or goals to be unlocked on a specific future date
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Capsule Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Predictions for Q1 Architecture Launch"
                  value={capsuleTitle}
                  onChange={(e) => setCapsuleTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={capsuleCategory}
                  onChange={(e) => setCapsuleCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="prediction">🔮 Future Prediction</option>
                  <option value="reflection">💭 Life / Work Reflection</option>
                  <option value="goal">🎯 Milestone & Goal</option>
                  <option value="letter">✉️ Open Letter</option>
                </select>
              </div>
            </div>

            {/* Unlock Duration Presets */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Unlock Horizon
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: '1 Week', days: 7 },
                  { label: '1 Month', days: 30 },
                  { label: '3 Months (Quarter)', days: 90 },
                  { label: '6 Months', days: 180 },
                  { label: '1 Year', days: 365 },
                ].map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setCapsulePresetDays(p.days)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      capsulePresetDays === p.days
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1 flex-1 flex flex-col min-h-[160px]">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Message to Your Future Self
              </label>
              <textarea
                rows={6}
                placeholder="What are you currently feeling, thinking, working on, or hoping for? Be candid — no one else will read this."
                value={capsuleMessage}
                onChange={(e) => setCapsuleMessage(e.target.value)}
                className="w-full flex-1 p-3.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!capsuleTitle.trim() || !capsuleMessage.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Seal Capsule with Wax Stamp</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Queue Vault Excerpt */}
        {activeTab === 'add_reading' && (
          <form onSubmit={handleAddReadingItem} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-500" />
                <span>Queue Vault Note for Incremental Reading</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose any note or literature excerpt from your vault to review on a spaced repetition schedule
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Select Source Note
              </label>
              <select
                value={newReadingNoteId}
                onChange={(e) => {
                  setNewReadingNoteId(e.target.value);
                  const found = notes.find((n) => n.id === e.target.value);
                  if (found) setNewReadingExcerpt(found.content.slice(0, 300));
                }}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {notes
                  .filter((n) => !n.trashed)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || 'Untitled'}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Excerpt Snippet to Digest
              </label>
              <textarea
                rows={5}
                value={newReadingExcerpt}
                onChange={(e) => setNewReadingExcerpt(e.target.value)}
                placeholder="Paste or edit the excerpt..."
                className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-serif leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Starting Interval
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setNewReadingInterval(days)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        newReadingInterval === days
                          ? 'bg-indigo-600 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {days} {days === 1 ? 'day' : 'days'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewReadingPriority(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        newReadingPriority === p
                          ? 'bg-indigo-600 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      ★ {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Spaced Reading Deck</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + K</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Inspecting Unsealed Capsule Full View Dialog */}
      {inspectingCapsule && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInspectingCapsule(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Capsule Unsealed
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCapsule(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {inspectingCapsule.title}
            </h3>

            <div className="text-[11px] text-stone-400 flex items-center gap-3">
              <span>Sealed: {new Date(inspectingCapsule.sealedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Category: {inspectingCapsule.category}</span>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap font-serif italic">
              "{inspectingCapsule.message}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleLogCapsuleToNote}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Save Reflection as Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
