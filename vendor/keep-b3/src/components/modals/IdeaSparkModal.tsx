import React, { useState, useEffect, useRef } from 'react';
import {
  Dices,
  X,
  ArrowRight,
  Lightbulb,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
  Check,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import { soundscapeService } from '../../utils/soundscapes';
import { fireConfetti } from '../../utils/confetti';

interface IdeaSparkModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onCreateSynthesizedNote: (title: string, content: string, linkedIds: string[]) => void;
}

export interface SparkPrompt {
  id: string;
  title: string;
  question: string;
  category: 'Synthesis' | 'Creativity' | 'Critical Thinking' | 'Cross-Pollination' | 'Actionable' | 'First Principles' | 'Futures';
}

export const SPARK_PROMPTS: SparkPrompt[] = [
  {
    id: 'bridge',
    title: 'The Bridge Principle',
    question: 'What underlying pattern or shared constraint connects these two separate thoughts?',
    category: 'Synthesis',
  },
  {
    id: 'inversion',
    title: 'Perspective Inversion',
    question: 'If the primary argument of the first note were applied as a solution to the second note, what unexpected breakthrough occurs?',
    category: 'Creativity',
  },
  {
    id: 'collision',
    title: 'Constructive Collision',
    question: 'Where do these two notes directly disagree or create tension, and what third idea resolves the tension?',
    category: 'Critical Thinking',
  },
  {
    id: 'analogy',
    title: 'Analogical Transfer',
    question: 'How can the structure or methodology in the first note be borrowed to rethink the second note?',
    category: 'Cross-Pollination',
  },
  {
    id: '10x',
    title: 'The 10x Synthesis',
    question: 'Combine the best insight from both notes into a single practical rule of thumb or actionable checklist item.',
    category: 'Actionable',
  },
  {
    id: 'first-principles',
    title: 'First Principles Deconstruction',
    question: 'Strip both notes down to their most fundamental axioms. Which foundational truth do they both depend on?',
    category: 'First Principles',
  },
  {
    id: 'second-order',
    title: 'Second-Order Dynamics',
    question: 'If the ideas in Note A and Note B compound over 5 years, what emergent outcome do they create together?',
    category: 'Futures',
  },
];

export const IdeaSparkModal: React.FC<IdeaSparkModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onCreateSynthesizedNote,
}) => {
  const [noteA, setNoteA] = useState<Note | null>(null);
  const [noteB, setNoteB] = useState<Note | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [userInsight, setUserInsight] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [activeSlotSearch, setActiveSlotSearch] = useState<'A' | 'B' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPrompt = SPARK_PROMPTS[selectedPromptIndex] || SPARK_PROMPTS[0];

  const rollPair = () => {
    const active = notes.filter((n) => !n.trashed && !n.archived);
    if (active.length < 2) return;

    setIsRolling(true);
    soundscapeService.playTypewriterClick();

    const idxA = Math.floor(Math.random() * active.length);
    let idxB = Math.floor(Math.random() * (active.length - 1));
    if (idxB >= idxA) idxB += 1;

    setTimeout(() => {
      setNoteA(active[idxA]);
      setNoteB(active[idxB]);
      setSelectedPromptIndex(Math.floor(Math.random() * SPARK_PROMPTS.length));
      setIsRolling(false);
      setActiveSlotSearch(null);
    }, 220);
  };

  useEffect(() => {
    if (isOpen) {
      rollPair();
      setUserInsight('');
      setActiveSlotSearch(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Global ESC and Shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSlotSearch) {
          setActiveSlotSearch(null);
        } else {
          onClose();
        }
      }
      // Mod+Enter -> synthesize note
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSynthesize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSlotSearch, noteA, noteB, currentPrompt, userInsight]);

  if (!isOpen) return null;

  const handleSynthesize = () => {
    if (!noteA || !noteB) return;
    const title = `Synthesis: ${noteA.title || 'Untitled'} × ${noteB.title || 'Untitled'}`;
    const insightSection = userInsight.trim()
      ? `### Captured Synthesis Insight\n${userInsight.trim()}\n\n`
      : '';
    const content = `## 💡 Idea Spark: ${currentPrompt.title}\n\n> **Prompt (${currentPrompt.category})**: ${currentPrompt.question}\n\n### Collided Notes\n- [[${noteA.title || noteA.id}]]\n- [[${noteB.title || noteB.id}]]\n\n${insightSection}### Emerging Connection\n*Synthesized on ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} via Mind Sparks Combinator.*`;
    
    fireConfetti();
    onCreateSynthesizedNote(title, content, [noteA.id, noteB.id]);
    onClose();
  };

  const filteredSlotNotes = notes
    .filter((n) => !n.trashed && !n.archived)
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .slice(0, 10);

  const renderNoteCard = (note: Note | null, slot: 'A' | 'B') => {
    if (!note) {
      return (
        <div
          onClick={() => {
            setActiveSlotSearch(slot);
            setSearchQuery('');
          }}
          className="p-4 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600 flex flex-col items-center justify-center text-center cursor-pointer flex-1 min-w-0 transition-colors py-8 bg-stone-50/50 dark:bg-stone-900/50"
        >
          <Search className="w-5 h-5 text-stone-400 mb-1" />
          <span className="font-semibold text-xs text-stone-600 dark:text-stone-300">
            Select Note {slot}
          </span>
          <span className="text-[10px] text-stone-400">Click to choose from vault</span>
        </div>
      );
    }

    const colorConf = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const folder = folders.find((f) => f.id === note.folderId);

    return (
      <div
        className={`relative group p-4 rounded-xl border flex flex-col justify-between ${colorConf.bgLight} ${colorConf.borderLight} ${colorConf.bgDark} ${colorConf.borderDark} text-stone-900 dark:text-stone-100 shadow-xs flex-1 min-w-0`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full border border-stone-400 dark:border-stone-500 shrink-0 shadow-2xs"
                style={{ backgroundColor: colorConf.hex }}
              />
              {folder ? (
                <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[120px]">
                  📁 {folder.name}
                </span>
              ) : (
                <span className="text-[10px] text-stone-400 font-mono">Slot {slot}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSlotSearch(slot);
                setSearchQuery('');
              }}
              className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline px-1 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors"
            >
              Change
            </button>
          </div>

          <h4 className="font-bold text-sm line-clamp-2 leading-tight">
            {note.title || 'Untitled Note'}
          </h4>

          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
            {note.content || (note.checklist ? note.checklist.map((c) => c.text).join(', ') : 'No content')}
          </p>
        </div>

        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {note.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="modal-idea-spark"
      role="dialog"
      aria-modal="true"
      aria-label="Mind Sparks Idea Combinator Studio"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-xs space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Dices className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Mind Sparks · Idea Combinator Studio
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Feature 8
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Randomly colliding your notes to trigger serendipitous creative connections & cross-domain synthesis
              </p>
            </div>
          </div>
          <button
            id="btn-close-idea-spark"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close Idea Combinator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Note Collided Slots */}
        {notes.length >= 2 ? (
          <div className="space-y-4 flex-1">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {renderNoteCard(noteA, 'A')}

              <div className="flex items-center justify-center p-2 shrink-0">
                <div className="p-2.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400">
                  <ArrowRight className="w-4 h-4 hidden sm:block text-amber-500" />
                  <span className="sm:hidden font-bold text-xs text-amber-500">×</span>
                </div>
              </div>

              {renderNoteCard(noteB, 'B')}
            </div>

            {/* Note Slot Search Dropdown */}
            {activeSlotSearch && (
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    Choose note for Slot {activeSlotSearch}:
                  </span>
                  <button
                    onClick={() => setActiveSlotSearch(null)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search note by title or tag..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                  {filteredSlotNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (activeSlotSearch === 'A') setNoteA(n);
                        else setNoteB(n);
                        setActiveSlotSearch(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-100/70 dark:hover:bg-amber-950/50 flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <span className="truncate font-semibold text-stone-800 dark:text-stone-200">
                        {n.title || 'Untitled Note'}
                      </span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                  {filteredSlotNotes.length === 0 && (
                    <p className="text-stone-400 text-center py-2 text-xs">No matching notes found</p>
                  )}
                </div>
              </div>
            )}

            {/* Prompt Selector Pills */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Cognitive Angle & Prompt
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SPARK_PROMPTS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPromptIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-all ${
                      selectedPromptIndex === idx
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Creative Prompt Card */}
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> {currentPrompt.title}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/40">
                  {currentPrompt.category}
                </span>
              </div>
              <p className="text-sm font-semibold leading-relaxed">
                "{currentPrompt.question}"
              </p>
            </div>

            {/* User Synthesis Note Scratchpad */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Your Emerging Insight (Optional)
              </label>
              <textarea
                id="input-synthesis-insight"
                value={userInsight}
                onChange={(e) => setUserInsight(e.target.value)}
                placeholder="What new idea or breakthrough emerges from this combination? Jot it down here before saving..."
                rows={3}
                className="w-full p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
              Needs at least 2 notes in your vault
            </h4>
            <p className="text-xs max-w-sm mx-auto">
              Create a couple of thoughts in your vault to unlock automatic creative collisions and conceptual cross-pollination.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <button
            id="btn-roll-dice"
            type="button"
            onClick={rollPair}
            disabled={isRolling || notes.length < 2}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all ${
              isRolling ? 'opacity-50 scale-95' : ''
            }`}
          >
            <Dices className={`w-4 h-4 text-amber-500 ${isRolling ? 'animate-spin' : ''}`} />
            <span>Roll Serendipity Dice</span>
          </button>

          {noteA && noteB && (
            <button
              id="btn-synthesize-note"
              type="button"
              onClick={handleSynthesize}
              className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-sm transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Synthesize New Note</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
