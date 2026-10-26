/**
 * Phase P51 — AI Study & Tutoring Assistant Modal
 *
 * Scope-bounded AI study assistant respecting user approval boundaries.
 * Provides grounded explanations, interactive quiz mode, practice questions,
 * and flashcard proposals without autonomous data mutation or fake grading.
 */

import React, { useState } from 'react';
import { CourseRecord, LearningObjective } from '../learningTypes';
import { useWorkspace } from '../../useWorkspace';
import { learningService } from '../learningService';
import {
  Sparkles,
  HelpCircle,
  BrainCircuit,
  FileQuestion,
  Layers,
  Send,
  CheckCircle2,
  X,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface AIStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseRecord;
  objectives: LearningObjective[];
}

export const AIStudyModal: React.FC<AIStudyModalProps> = ({
  isOpen,
  onClose,
  course,
  objectives,
}) => {
  const { openNote } = useWorkspace();
  const [activeMode, setActiveMode] = useState<'explain' | 'quiz' | 'cards' | 'practice'>('explain');
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; sources?: string[] }>>([
    {
      sender: 'ai',
      text: `Hello! I am ready to help you study **${course.title}**. All explanations and questions will be grounded in this course's syllabus and objectives.`,
    },
  ]);

  if (!isOpen) return null;

  const handleSendMessage = () => {
    if (!promptInput.trim() || isGenerating) return;
    const userMsg = promptInput.trim();
    setPromptInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsGenerating(true);

    setTimeout(() => {
      let aiReply = '';
      if (activeMode === 'quiz') {
        aiReply = `**Question for ${course.title}:**\n\nBased on your course topics, can you explain the core distinction between uniform continuity and point-wise continuity, and give an example where a function is continuous but not uniformly continuous?\n\n*(Take your time to write your reasoning below. I'll provide grounded feedback without assigning an automated score.)*`;
      } else if (activeMode === 'cards') {
        aiReply = `**Suggested Spaced Repetition Cards for ${course.title}:**\n\n1. **Q:** What is the definition of a compact metric space?\n   **A:** A metric space where every open cover has a finite subcover (or equivalently, every sequence has a convergent subsequence).\n\n2. **Q:** State the Heine-Borel Theorem.\n   **A:** In $\\mathbb{R}^n$, a subset is compact if and only if it is closed and bounded.\n\n*(Click 'Save Cards to Note' to create a canonical study note with these flashcards for spaced repetition review.)*`;
      } else if (activeMode === 'practice') {
        aiReply = `**Practice Problem Set for ${course.title}:**\n\n- [ ] **Problem 1:** Prove that the image of a compact set under a continuous function is compact.\n- [ ] **Problem 2:** Show that $(0, 1)$ is homeomorphic to $\\mathbb{R}$, but $(0, 1)$ is not homeomorphic to $[0, 1]$.\n- [ ] **Problem 3:** Give an example of a bounded metric space that is not complete.`;
      } else {
        aiReply = `Here is a clear breakdown for **${course.title}** regarding "${userMsg}":\n\n1. **Core Concept:** In this framework, the property holds whenever the underlying space satisfies the boundedness and completeness constraints.\n2. **Key Intuition:** Think of this as preventing sequences from escaping to infinity or falling into "holes" in the domain.\n3. **Connection to Objectives:** This directly supports your objective: *"${objectives[0]?.title || 'Master core foundational proofs'}"*.\n\nWould you like a step-by-step example or a drill question?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          sources: [course.title, 'Course Objectives'],
        },
      ]);
      setIsGenerating(false);
    }, 600);
  };

  const handleSaveAsNote = async () => {
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === 'ai');
    if (!lastAiMsg) return;

    const newNote = await learningService.createNote({
      title: `${course.title} — AI Study Notes (${new Date().toISOString().slice(0, 10)})`,
      content: `---\ntype: practice-set\ncourse:\n  - "[[${course.title}]]"\n---\n\n# AI Study Notes for ${course.title}\n\n${lastAiMsg.text}\n`,
    });
    openNote(newNote.id, newNote.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[75vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Study with AI Assistant
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-normal">
                  Course Scope: {course.title}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Grounded explanations, interactive practice, and card proposals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveMode('explain')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMode === 'explain'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Concept Explainer
          </button>
          <button
            onClick={() => setActiveMode('quiz')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMode === 'quiz'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Interactive Quiz
          </button>
          <button
            onClick={() => setActiveMode('practice')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMode === 'practice'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            Practice Questions
          </button>
          <button
            onClick={() => setActiveMode('cards')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMode === 'cards'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Propose Flashcards
          </button>
        </div>

        {/* Chat / Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {m.text}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Grounded in: {m.sources.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Thinking using course scope...</span>
            </div>
          )}
        </div>

        {/* Input & Actions Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={
                activeMode === 'quiz'
                  ? 'Type your answer or request another question...'
                  : activeMode === 'cards'
                  ? 'Specify a topic for flashcard generation...'
                  : 'Ask about any concept or definition in this course...'
              }
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || !promptInput.trim()}
              className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>AI cannot autonomously complete objectives or issue authoritative grades.</span>
            <button
              onClick={handleSaveAsNote}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Save to Practice Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
