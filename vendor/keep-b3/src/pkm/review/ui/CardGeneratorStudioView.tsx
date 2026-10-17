import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Copy,
  Check,
  BookOpen,
  FileText,
  Eye,
  HelpCircle,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Note } from '../../../types';
import { extractCardsFromNote } from '../cardParser';
import { ReviewCard } from '../reviewTypes';
import { cardIndex } from '../cardIndex';
import { reviewService } from '../reviewService';
import { fireConfetti } from '../../../utils/confetti';
import { soundscapeService } from '../../../utils/soundscapes';

export interface CardGeneratorStudioViewProps {
  notes: Note[];
  activeNoteId?: string;
  onUpdateNoteContent?: (noteId: string, updatedContent: string) => void;
  onOpenNote?: (noteId: string, line?: number) => void;
}

export const CardGeneratorStudioView: React.FC<CardGeneratorStudioViewProps> = ({
  notes,
  activeNoteId,
  onUpdateNoteContent,
  onOpenNote,
}) => {
  // Selected note for extraction/editing
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => {
    if (activeNoteId) return activeNoteId;
    const active = notes.filter((n) => !n.trashed);
    return active[0]?.id || '';
  });

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  // Sub-modes: 'auto-extract' | 'cloze-builder' | 'qa-builder'
  const [studioMode, setStudioMode] = useState<'auto-extract' | 'cloze-builder' | 'qa-builder'>('auto-extract');

  // Cloze Builder state
  const [clozeSourceText, setClozeSourceText] = useState<string>(() => {
    return activeNote?.content?.slice(0, 300) || 'Distributed consensus requires quorum agreement among Byzantine nodes.';
  });
  const [clozeIndex, setClozeIndex] = useState<number>(1);
  const [clozeHint, setClozeHint] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<string>('quorum agreement');

  // Q&A Builder state
  const [qaQuestion, setQaQuestion] = useState<string>('');
  const [qaAnswer, setQaAnswer] = useState<string>('');
  const [cardAddedNotice, setCardAddedNotice] = useState<boolean>(false);

  // Cards currently present in selected note
  const existingCardsInNote = useMemo(() => {
    if (!activeNote) return [];
    return extractCardsFromNote(activeNote);
  }, [activeNote]);

  // Suggested flashcards candidate extraction from raw note content
  const candidateSentences = useMemo(() => {
    if (!activeNote || !activeNote.content) return [];
    const lines = activeNote.content.split('\n');
    const candidates: { prompt: string; answer: string; rawSnippet: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.includes('{{c') || line.startsWith('Q:') || line.startsWith('**Q:')) {
        continue;
      }

      // Definition match: Term :: Definition OR Term: Definition
      const defMatch = line.match(/^[-*+]?\s*([^:]{3,40})\s*(?:::|:)\s*(.{15,})$/);
      if (defMatch) {
        candidates.push({
          prompt: `What is ${defMatch[1].trim()}?`,
          answer: defMatch[2].trim(),
          rawSnippet: `**Q:** What is ${defMatch[1].trim()}?\n**A:** ${defMatch[2].trim()}\n^card-${Date.now().toString(36)}`,
        });
        continue;
      }

      // Bullet insights with sufficient depth
      const bulletMatch = line.match(/^[-*+]\s+(.{30,})$/);
      if (bulletMatch && candidates.length < 5) {
        const text = bulletMatch[1].trim();
        const words = text.split(' ');
        if (words.length >= 6) {
          const keyTerm = words.slice(0, 3).join(' ');
          candidates.push({
            prompt: `Explain the concept regarding "${keyTerm}..."`,
            answer: text,
            rawSnippet: `**Q:** Explain the concept regarding "${keyTerm}..."\n**A:** ${text}\n^card-${Date.now().toString(36)}`,
          });
        }
      }
    }

    return candidates.slice(0, 6);
  }, [activeNote]);

  // Generated Cloze Snippet
  const generatedClozeSnippet = useMemo(() => {
    if (!selectedWord.trim()) return clozeSourceText;
    const replacement = clozeHint.trim()
      ? `{{c${clozeIndex}::${selectedWord}::${clozeHint.trim()}}}`
      : `{{c${clozeIndex}::${selectedWord}}}`;

    return clozeSourceText.replace(selectedWord, replacement);
  }, [clozeSourceText, selectedWord, clozeIndex, clozeHint]);

  // Add Q&A Card to Active Note
  const handleAppendQaCard = () => {
    if (!activeNote || !qaQuestion.trim() || !qaAnswer.trim()) return;
    const cardBlock = `\n\n**Q:** ${qaQuestion.trim()}\n**A:** ${qaAnswer.trim()}\n^card-${Date.now().toString(36)}\n`;
    const updated = (activeNote.content || '') + cardBlock;

    if (onUpdateNoteContent) {
      onUpdateNoteContent(activeNote.id, updated);
    }
    reviewService.syncNotes(notes);
    fireConfetti();
    soundscapeService.playCompletionChime();
    setQaQuestion('');
    setQaAnswer('');
    setCardAddedNotice(true);
    setTimeout(() => setCardAddedNotice(false), 2500);
  };

  // Add Cloze Card to Active Note
  const handleAppendClozeCard = () => {
    if (!activeNote || !generatedClozeSnippet.trim()) return;
    const cardBlock = `\n\n${generatedClozeSnippet.trim()}\n^card-${Date.now().toString(36)}\n`;
    const updated = (activeNote.content || '') + cardBlock;

    if (onUpdateNoteContent) {
      onUpdateNoteContent(activeNote.id, updated);
    }
    reviewService.syncNotes(notes);
    fireConfetti();
    soundscapeService.playCompletionChime();
    setCardAddedNotice(true);
    setTimeout(() => setCardAddedNotice(false), 2500);
  };

  // Append Candidate to Active Note
  const handleAppendCandidate = (candidate: { rawSnippet: string }) => {
    if (!activeNote) return;
    const updated = (activeNote.content || '') + `\n\n${candidate.rawSnippet}\n`;
    if (onUpdateNoteContent) {
      onUpdateNoteContent(activeNote.id, updated);
    }
    reviewService.syncNotes(notes);
    fireConfetti();
    soundscapeService.playCompletionChime();
    setCardAddedNotice(true);
    setTimeout(() => setCardAddedNotice(false), 2500);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* Top Bar: Note Selector & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Flashcard & Cloze Generator Studio
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Tool P8
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Extract active recall question-answer cards and cloze deletions directly from your notes
          </p>
        </div>

        {/* Note Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              className="bg-transparent font-semibold text-stone-800 dark:text-stone-200 max-w-[200px] truncate focus:outline-hidden"
            >
              {notes
                .filter((n) => !n.trashed)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || 'Untitled Note'}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {cardAddedNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Card successfully generated and attached to note!</span>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setStudioMode('auto-extract')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            studioMode === 'auto-extract'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ Auto-Extract Candidates ({candidateSentences.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioMode('cloze-builder')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            studioMode === 'cloze-builder'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>🧩 Cloze Deletion Maker</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioMode('qa-builder')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            studioMode === 'qa-builder'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>📝 Q&A Card Composer</span>
        </button>
      </div>

      {/* Sub-view 1: Auto-Extract Candidates */}
      {studioMode === 'auto-extract' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">
              Found {candidateSentences.length} potential cards in <strong>{activeNote?.title}</strong>:
            </span>
            <span className="text-stone-400 font-mono text-[11px]">
              {existingCardsInNote.length} cards already indexed
            </span>
          </div>

          {candidateSentences.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              No candidate definition or structured lines detected in this note. Switch to the Cloze Maker or Q&A Composer to create cards manually!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {candidateSentences.map((cand, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                      Suggested Card #{idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {cand.prompt}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
                      {cand.answer}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAppendCandidate(cand)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Note</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-view 2: Cloze Deletion Maker */}
      {studioMode === 'cloze-builder' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Side */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Original Passage
                </label>
                <textarea
                  rows={4}
                  value={clozeSourceText}
                  onChange={(e) => setClozeSourceText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Word to Mask
                  </label>
                  <input
                    type="text"
                    value={selectedWord}
                    onChange={(e) => setSelectedWord(e.target.value)}
                    placeholder="Word to hide"
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Optional Hint
                  </label>
                  <input
                    type="text"
                    value={clozeHint}
                    onChange={(e) => setClozeHint(e.target.value)}
                    placeholder="e.g. key condition"
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-stone-500 font-medium">Cloze Index:</span>
                {[1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setClozeIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      clozeIndex === idx
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    c{idx}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Side */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                  Active Recall Preview
                </span>

                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 text-xs leading-relaxed space-y-2">
                  <div className="text-stone-500 font-semibold text-[11px]">Prompt (Tested):</div>
                  <div className="text-stone-800 dark:text-stone-200">
                    {clozeSourceText.replace(
                      selectedWord,
                      `[... ${clozeHint ? `(${clozeHint})` : ''}]`
                    )}
                  </div>
                  <div className="text-stone-500 font-semibold text-[11px] pt-1">Revealed Answer:</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedWord}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAppendClozeCard}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Append Cloze Card to Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 3: Q&A Composer */}
      {studioMode === 'qa-builder' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Question / Prompt
                </label>
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="e.g. What is the CAP Theorem?"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Answer
                </label>
                <textarea
                  rows={4}
                  value={qaAnswer}
                  onChange={(e) => setQaAnswer(e.target.value)}
                  placeholder="e.g. A distributed data store can simultaneously provide at most two of: Consistency, Availability, and Partition Tolerance."
                  className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleAppendQaCard}
                disabled={!qaQuestion.trim() || !qaAnswer.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Append Q&A Card to Note</span>
              </button>
            </div>

            {/* Live Flip-card Preview */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                  Flashcard Card Preview
                </span>
                <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                      Front (Question)
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {qaQuestion || 'What is the concept?'}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                      Back (Answer)
                    </span>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                      {qaAnswer || 'The answer explanation will be revealed here upon active recall flip.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
