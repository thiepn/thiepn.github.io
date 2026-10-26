import React, { useState, useEffect } from 'react';
import { Note } from '../../../types';
import {
  AIWritingCommandType,
  AIProposedAction,
  AIDiffChunk,
  AISettings,
} from '../types';
import { aiOrchestrator } from '../orchestrator';
import { aiSettingsService } from '../aiSettingsService';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Plus,
  ArrowRight,
  AlertTriangle,
  X,
  FileEdit,
  AlignLeft,
  ListTree,
  BookOpen,
} from 'lucide-react';

interface AIWritingAssistantModalProps {
  activeNote: Note | null;
  selectedText?: string;
  allNotes: Note[];
  initialCommand?: AIWritingCommandType;
  onApplyAction: (action: AIProposedAction) => void;
  onCreateNewNote?: (title: string, content: string) => void;
  onClose: () => void;
}

export const AIWritingAssistantModal: React.FC<AIWritingAssistantModalProps> = ({
  activeNote,
  selectedText,
  allNotes,
  initialCommand = 'rewrite',
  onApplyAction,
  onCreateNewNote,
  onClose,
}) => {
  const [command, setCommand] = useState<AIWritingCommandType>(initialCommand);
  const [rewriteTone, setRewriteTone] = useState<'clear' | 'academic' | 'concise' | 'technical'>('clear');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [diff, setDiff] = useState<AIDiffChunk[] | undefined>(undefined);
  const [proposedAction, setProposedAction] = useState<AIProposedAction | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const settings = aiSettingsService.getSettings();

  useEffect(() => {
    handleGenerate();
  }, [command]);

  const handleGenerate = async () => {
    if (!activeNote) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedText('');
    setDiff(undefined);
    setIsStale(false);

    try {
      const res = await aiOrchestrator.executeWritingAssistant(
        {
          command,
          targetNoteId: activeNote.id,
          selectedText,
          customPrompt: command === 'custom' ? customPrompt : undefined,
          rewriteTone,
        },
        {
          notes: allNotes,
          onStreamUpdate: (partial) => {
            setGeneratedText(partial);
          },
        }
      );

      setGeneratedText(res.proposedText);
      setDiff(res.diff);
      setProposedAction(res.action);

      // Check for staleness
      const stale = aiOrchestrator.isActionStale(res.action, activeNote);
      setIsStale(stale);
    } catch (err: any) {
      setErrorMessage(err.message || 'Writing assistance failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = (type: 'replace_selection' | 'insert_below') => {
    if (!proposedAction) return;
    if (isStale) {
      alert('The source note was modified while generating this proposal. Please regenerate or insert below to avoid overwriting newer changes.');
      return;
    }
    onApplyAction({
      ...proposedAction,
      type,
    });
    onClose();
  };

  const handleCreateNote = () => {
    if (!generatedText) return;
    const title = `${command.toUpperCase()}: ${activeNote?.title || 'Note'}`;
    onCreateNewNote?.(title, generatedText);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="writing-assistant-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col text-neutral-800 dark:text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="writing-assistant-title" className="font-semibold text-base">
                AI Writing Assistant
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Transform, rewrite, or summarize selected note text with traceable diffs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Command Selector Bar */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'rewrite', label: 'Rewrite', icon: FileEdit },
            { id: 'summarize', label: 'Summarize', icon: AlignLeft },
            { id: 'outline', label: 'Outline', icon: ListTree },
            { id: 'explain', label: 'Explain', icon: BookOpen },
            { id: 'shorten', label: 'Shorten', icon: Sparkles },
          ].map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => setCommand(cmd.id as AIWritingCommandType)}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-colors shrink-0 ${
                  command === cmd.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cmd.label}</span>
              </button>
            );
          })}
        </div>

        {/* Stale Note Version Alert Banner */}
        {isStale && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Stale Source Warning</strong>: The underlying note was modified during generation. Direct replacement is disabled to prevent overwriting edits.
            </span>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content & Diff Viewer */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Source Excerpt Preview */}
          {selectedText && (
            <div className="space-y-1">
              <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
                Original Selection
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                {selectedText}
              </div>
            </div>
          )}

          {/* Generated Result / Diff */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
                {diff ? 'Proposed Changes (Diff)' : 'Generated Output'}
              </div>
              {isGenerating && (
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Generating...</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 min-h-[160px] max-h-72 overflow-y-auto font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
              {diff ? (
                <div>
                  {diff.map((chunk, idx) => {
                    if (chunk.type === 'added') {
                      return (
                        <span
                          key={idx}
                          className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-0.5 rounded"
                        >
                          {chunk.value}
                        </span>
                      );
                    } else if (chunk.type === 'removed') {
                      return (
                        <span
                          key={idx}
                          className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 line-through px-0.5 rounded opacity-75"
                        >
                          {chunk.value}
                        </span>
                      );
                    }
                    return <span key={idx}>{chunk.value}</span>;
                  })}
                </div>
              ) : (
                generatedText || (isGenerating ? 'Synthesizing...' : 'No output generated.')
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNote}
              disabled={!generatedText || isGenerating}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save as Note</span>
            </button>

            {selectedText && !isStale && (
              <button
                onClick={() => handleAccept('replace_selection')}
                disabled={!generatedText || isGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Replace Selection</span>
              </button>
            )}

            <button
              onClick={() => handleAccept('insert_below')}
              disabled={!generatedText || isGenerating}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-200 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Insert Below</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
