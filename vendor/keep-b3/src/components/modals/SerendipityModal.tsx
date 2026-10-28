import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  Shuffle,
  X,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Plus,
  RefreshCw,
  Quote,
  Flame,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import { soundscapeService } from '../../utils/soundscapes';
import { fireConfetti } from '../../utils/confetti';

interface SerendipityModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onOpenNote: (note: Note) => void;
  onCreateReflectionNote: (title: string, content: string, tags: string[]) => void;
}

interface SerendipityCard {
  quote: string;
  sourceNote?: Note;
  authorOrSource: string;
  tagOrFolder?: string;
  sparkQuestion: string;
  category: string;
}

const CLASSIC_AXIOMS: SerendipityCard[] = [
  {
    quote: 'The best way to have a good idea is to have a lot of ideas.',
    authorOrSource: 'Linus Pauling',
    tagOrFolder: 'Creativity',
    sparkQuestion: 'Which recent assumption in your notes can you invert to find a radical new approach?',
    category: 'Creativity',
  },
  {
    quote: 'Simplicity is prerequisite for reliability.',
    authorOrSource: 'Edsger W. Dijkstra',
    tagOrFolder: 'Engineering',
    sparkQuestion: 'What is one complex note or project you can simplify down to a single sentence?',
    category: 'Architecture',
  },
  {
    quote: 'Study the science of art. Study the art of science. Develop your senses — especially learn how to see. Realize that everything connects to everything else.',
    authorOrSource: 'Leonardo da Vinci',
    tagOrFolder: 'Polymathy',
    sparkQuestion: 'How does your most analytical note relate to your most artistic or intuitive thought?',
    category: 'Synthesis',
  },
  {
    quote: 'The first principle is that you must not fool yourself — and you are the easiest person to fool.',
    authorOrSource: 'Richard P. Feynman',
    tagOrFolder: 'Critical Thinking',
    sparkQuestion: 'Where might you be holding an unexamined belief in your current working notes?',
    category: 'Mindset',
  },
  {
    quote: 'A point of view is worth 80 IQ points.',
    authorOrSource: 'Alan Kay',
    tagOrFolder: 'Perspective',
    sparkQuestion: 'If you looked at your active problem from the perspective of an alien archaeologist, what stands out?',
    category: 'Discovery',
  },
  {
    quote: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.',
    authorOrSource: 'Marie Curie',
    tagOrFolder: 'Knowledge',
    sparkQuestion: 'What intimidating topic in your backlog can you break down into small, curious questions?',
    category: 'Mastery',
  },
];

const REFLECTION_QUESTIONS = [
  'How does this insight intersect with your top focus for today?',
  'If you applied this principle to a completely different domain, what happens?',
  'What is the counter-intuitive opposite of this idea, and when is it true?',
  'How would your future self 5 years from now expand upon this note?',
  'What single immediate action or habit does this quote inspire right now?',
];

export const SerendipityModal: React.FC<SerendipityModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onOpenNote,
  onCreateReflectionNote,
}) => {
  const [currentCard, setCurrentCard] = useState<SerendipityCard | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [cardFlip, setCardFlip] = useState(false);

  const drawCard = () => {
    setCardFlip(true);
    soundscapeService.playTypewriterClick();

    setTimeout(() => {
      // Find eligible notes with at least 15 words
      const eligibleNotes = notes.filter(
        (n) => !n.trashed && (n.content?.trim().length > 30 || (n.checklist && n.checklist.length > 0))
      );

      // 60% chance to draw from user notes if available, otherwise axioms
      if (eligibleNotes.length > 0 && (Math.random() < 0.65 || CLASSIC_AXIOMS.length === 0)) {
        const randomNote = eligibleNotes[Math.floor(Math.random() * eligibleNotes.length)];
        let snippet = '';

        if (randomNote.content?.trim()) {
          const sentences = randomNote.content
            .split(/(?<=[.?!])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 25 && s.length <= 250);

          if (sentences.length > 0) {
            snippet = sentences[Math.floor(Math.random() * sentences.length)];
          } else {
            snippet = randomNote.content.slice(0, 160).trim() + '...';
          }
        } else if (randomNote.checklist?.length) {
          const item = randomNote.checklist[Math.floor(Math.random() * randomNote.checklist.length)];
          snippet = `Task: ${item.text}`;
        }

        const folder = folders.find((f) => f.id === randomNote.folderId);
        const folderName = folder ? folder.name : randomNote.tags?.[0] || 'Personal Vault';
        const question = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)];

        setCurrentCard({
          quote: snippet || randomNote.title || 'Untitled Thought',
          sourceNote: randomNote,
          authorOrSource: randomNote.title || 'Untitled Note',
          tagOrFolder: folderName,
          sparkQuestion: question,
          category: 'Vault Memory',
        });
      } else {
        const axiom = CLASSIC_AXIOMS[Math.floor(Math.random() * CLASSIC_AXIOMS.length)];
        setCurrentCard(axiom);
      }

      setIsRevealed(true);
      setCardFlip(false);
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
      drawCard();
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSynthesize = () => {
    if (!currentCard) return;
    fireConfetti();
    const title = `Serendipity Reflection: ${currentCard.authorOrSource.slice(0, 35)}`;
    const content = `> "${currentCard.quote}"\n> — *${currentCard.authorOrSource}*\n\n### Reflection\n**Spark Prompt**: ${currentCard.sparkQuestion}\n\n*My synthesized insights:*\n- \n\n${currentCard.sourceNote ? `[[${currentCard.sourceNote.title}]]` : ''}`;
    onCreateReflectionNote(title, content, ['serendipity', 'reflection']);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              <Compass className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Serendipity Oracle & Wisdom Cookie
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Surfacing unexpected sparks and hidden wisdom from your vault.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close Serendipity Oracle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Content Area */}
        <div className="p-6 space-y-5">
          {currentCard && (
            <div
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                cardFlip ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              } ${
                currentCard.sourceNote
                  ? 'bg-gradient-to-br from-amber-50/50 via-white to-stone-50/50 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/20 border-amber-200/70 dark:border-amber-900/50 shadow-sm'
                  : 'bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800/40 border-stone-200 dark:border-stone-800 shadow-sm'
              }`}
            >
              {/* Category / Source Pill */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100 dark:border-stone-800 text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentCard.category}
                </span>

                <span className="text-stone-400 dark:text-stone-500 text-[11px] font-mono">
                  {currentCard.tagOrFolder}
                </span>
              </div>

              {/* Quote Body */}
              <div className="relative py-2">
                <Quote className="w-6 h-6 text-amber-500/20 dark:text-amber-400/20 absolute -top-1 -left-2 -z-0 pointer-events-none" />
                <p className="text-base sm:text-lg font-serif italic text-stone-900 dark:text-stone-100 leading-relaxed relative z-10 pl-2">
                  "{currentCard.quote}"
                </p>
              </div>

              {/* Attribution */}
              <div className="pt-3 text-right">
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  — {currentCard.authorOrSource}
                </span>
              </div>

              {/* Spark Reflection Prompt */}
              <div className="mt-5 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Serendipitous Question
                </div>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                  {currentCard.sparkQuestion}
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={drawCard}
              className="py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Crack Another Card
            </button>

            <div className="flex items-center gap-2">
              {currentCard?.sourceNote && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentCard.sourceNote) {
                      onOpenNote(currentCard.sourceNote);
                      onClose();
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 font-medium text-xs transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  Open Source
                </button>
              )}

              <button
                type="button"
                onClick={handleSynthesize}
                className="py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Capture Reflection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
