import React, { useState, useEffect, useRef } from 'react';
import { Note, Folder } from '../../../types';
import {
  AIScope,
  AIGroundedMode,
  AIChatMessage,
  AIConversation,
  AISourceContext,
  AICitation,
  AIProposedAction,
} from '../types';
import { aiOrchestrator } from '../orchestrator';
import { aiSettingsService } from '../aiSettingsService';
import { conversationStorageService } from '../conversationStorage';
import { AIScopePicker } from './AIScopePicker';
import { AIContextInspectorModal } from './AIContextInspectorModal';
import {
  Sparkles,
  Send,
  Square,
  RefreshCw,
  Copy,
  Check,
  FilePlus,
  ArrowDownToLine,
  Layers,
  ChevronDown,
  Info,
  Shield,
  Eye,
  BookOpen,
  Lock,
  Globe,
  Plus,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';

interface AICopilotWorkspaceProps {
  allNotes: Note[];
  folders: Folder[];
  activeNote?: Note | null;
  onOpenNote?: (noteId: string, headingId?: string, blockId?: string) => void;
  onCreateNewNote?: (title: string, content: string) => void;
  onInsertIntoNote?: (text: string) => void;
  onOpenSettings?: () => void;
  onClose?: () => void;
}

export const AICopilotWorkspace: React.FC<AICopilotWorkspaceProps> = ({
  allNotes,
  folders,
  activeNote,
  onOpenNote,
  onCreateNewNote,
  onInsertIntoNote,
  onOpenSettings,
  onClose,
}) => {
  const [settings, setSettings] = useState(aiSettingsService.getSettings());
  const [conversation, setConversation] = useState<AIConversation | null>(
    aiOrchestrator.getActiveConversation() ||
      aiOrchestrator.startNewConversation(
        activeNote
          ? {
              type: 'current_note',
              label: `Current Note: ${activeNote.title}`,
              currentNoteId: activeNote.id,
            }
          : {
              type: 'entire_vault',
              label: 'Entire Vault',
            }
      )
  );

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScopePickerOpen, setIsScopePickerOpen] = useState(false);
  const [isContextInspectorOpen, setIsContextInspectorOpen] = useState(false);
  const [inspectorSources, setInspectorSources] = useState<AISourceContext[]>([]);
  const [activeCitationHover, setActiveCitationHover] = useState<{
    citation: AICitation;
    x: number;
    y: number;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubSettings = aiSettingsService.subscribe((s) => setSettings(s));
    const unsubConv = aiOrchestrator.subscribe((conv) => setConversation(conv));
    return () => {
      unsubSettings();
      unsubConv();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isGenerating]);

  // Update scope when active note changes if current scope is 'current_note'
  useEffect(() => {
    if (activeNote && conversation && conversation.scope.type === 'current_note') {
      conversation.scope.currentNoteId = activeNote.id;
      conversation.scope.label = `Current Note: ${activeNote.title}`;
    }
  }, [activeNote]);

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isGenerating) return;
    const prompt = inputPrompt.trim();
    setInputPrompt('');
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      if (settings.mode === 'disabled') {
        throw new Error('AI Assistance is currently disabled. Please enable it in Settings.');
      }

      await aiOrchestrator.askVault(prompt, {
        notes: allNotes,
        folders,
        scope: conversation?.scope,
        groundedMode: conversation?.groundedMode,
        onStreamUpdate: () => {
          // Trigger re-render
        },
      });

      if (conversation && settings.persistConversations) {
        await conversationStorageService.saveConversation(conversation);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    aiOrchestrator.stopGeneration();
    setIsGenerating(false);
  };

  const handleNewChat = () => {
    const newConv = aiOrchestrator.startNewConversation(
      activeNote
        ? {
            type: 'current_note',
            label: `Current Note: ${activeNote.title}`,
            currentNoteId: activeNote.id,
          }
        : {
            type: 'entire_vault',
            label: 'Entire Vault',
          }
    );
    setConversation(newConv);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNote = (msg: AIChatMessage) => {
    if (!conversation) return;
    const noteData = conversationStorageService.exportConversationToNote(conversation);
    onCreateNewNote?.(noteData.title || 'AI Synthesis', noteData.content || msg.content);
  };

  const handleCitationClick = (citation: AICitation) => {
    if (citation.noteId) {
      onOpenNote?.(citation.noteId, citation.headingId, citation.blockId);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 overflow-hidden select-text text-sm">
      {/* Top Navigation Bar */}
      <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <span>Knowledge Copilot</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  settings.mode === 'local'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : settings.mode === 'external'
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600'
                }`}
              >
                {settings.mode === 'local' ? 'Local AI' : settings.mode === 'external' ? 'External AI' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs flex items-center gap-1 font-medium"
            title="New Conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scope & Grounded Mode Bar */}
      <div className="px-3.5 py-2 border-b border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        {/* Scope Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsScopePickerOpen(!isScopePickerOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium text-neutral-700 dark:text-neutral-300"
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span className="truncate max-w-[180px]">
              {conversation?.scope.label || 'Select Scope'}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isScopePickerOpen && (
            <div className="absolute top-full left-0 mt-1 z-40">
              <AIScopePicker
                currentScope={
                  conversation?.scope || { type: 'entire_vault', label: 'Entire Vault' }
                }
                onSelectScope={(sc) => {
                  if (conversation) {
                    conversation.scope = sc;
                  }
                  setIsScopePickerOpen(false);
                }}
                activeNote={activeNote}
                allNotes={allNotes}
                folders={folders}
                onClose={() => setIsScopePickerOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Grounded Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => {
                if (conversation) conversation.groundedMode = 'vault_only';
              }}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                conversation?.groundedMode === 'vault_only'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Vault Only
            </button>
            <button
              onClick={() => {
                if (conversation) conversation.groundedMode = 'vault_plus_general';
              }}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                conversation?.groundedMode === 'vault_plus_general'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Vault + General
            </button>
          </div>
        </div>
      </div>

      {/* AI Disabled Banner if Mode C */}
      {settings.mode === 'disabled' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>AI Assistance is disabled. Configure Local or External AI to activate.</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-500 shrink-0"
          >
            Settings
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!conversation || conversation.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-3">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                Ask your Knowledge Vault
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Reason over notes, ask cross-document comparisons, or summarize topics with traceable source citations.
              </p>
            </div>

            {/* Quick Prompt Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2 text-xs text-left">
              <button
                onClick={() => {
                  setInputPrompt('Summarize what I have written in this scope');
                }}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                "Summarize what I have written..."
              </button>
              <button
                onClick={() => {
                  setInputPrompt('What are the key concepts and disagreements?');
                }}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                "What are the key concepts..."
              </button>
            </div>
          </div>
        )}

        {conversation?.messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-sky-600 text-white px-4 py-2.5 text-xs shadow-xs">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start space-y-2">
              <div className="max-w-[95%] rounded-xl rounded-tl-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 p-4 text-xs space-y-3">
                {/* Scope Summary Badge */}
                {msg.scopeSummary && (
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 border-b border-neutral-200 dark:border-neutral-700/60 pb-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    <span>{msg.scopeSummary}</span>
                    {msg.sources.length > 0 && (
                      <button
                        onClick={() => {
                          setInspectorSources(msg.sources);
                          setIsContextInspectorOpen(true);
                        }}
                        className="ml-auto text-sky-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Sources</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Assistant Message Body with Interactive Citation Chips */}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-neutral-800 dark:text-neutral-200">
                  {msg.content || (msg.isPartial ? 'Searching vault & reasoning...' : '')}
                </div>

                {/* Verified Citations List */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 space-y-1">
                    <div className="font-semibold text-[11px] text-neutral-500 uppercase tracking-wider">
                      Sources Cited
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c) => (
                        <button
                          key={c.markerId}
                          onClick={() => handleCitationClick(c)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveCitationHover({
                              citation: c,
                              x: rect.left,
                              y: rect.top - 8,
                            });
                          }}
                          onMouseLeave={() => setActiveCitationHover(null)}
                          className="px-2 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-sky-700 dark:text-sky-300 hover:border-sky-500 font-medium text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <span>[{c.markerNumber}]</span>
                          <span className="truncate max-w-[140px]">{c.noteTitle}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Actions */}
                <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleSaveToNote(msg)}
                      className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1"
                    >
                      <FilePlus className="w-3 h-3" />
                      <span>Save as Note</span>
                    </button>

                    {onInsertIntoNote && (
                      <button
                        onClick={() => onInsertIntoNote(msg.content)}
                        className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                        <span>Insert</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] text-neutral-400">
                    {msg.providerName || (msg.mode === 'local' ? 'Local Model' : 'External')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Citation Excerpt Tooltip */}
      {activeCitationHover && (
        <div
          className="fixed z-50 p-2.5 rounded-lg bg-neutral-900 text-white text-xs shadow-xl border border-neutral-700 max-w-xs pointer-events-none transform -translate-y-full"
          style={{
            left: `${activeCitationHover.x}px`,
            top: `${activeCitationHover.y}px`,
          }}
        >
          <div className="font-semibold text-sky-400 mb-1 flex items-center gap-1">
            <span>[{activeCitationHover.citation.markerNumber}]</span>
            <span className="truncate">{activeCitationHover.citation.noteTitle}</span>
          </div>
          <p className="text-neutral-300 line-clamp-3 font-mono text-[10px]">
            {activeCitationHover.citation.quoteExcerpt}
          </p>
        </div>
      )}

      {/* Input Prompt Box */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={settings.mode === 'disabled' || isGenerating}
            placeholder={
              settings.mode === 'disabled'
                ? 'AI is disabled. Enable in Settings.'
                : 'Ask a question or request a synthesis...'
            }
            className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputPrompt.trim() || settings.mode === 'disabled'}
              className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Context & Privacy Inspector Modal */}
      {isContextInspectorOpen && (
        <AIContextInspectorModal
          sources={inspectorSources}
          totalTokens={inspectorSources.reduce((acc, s) => acc + s.tokenEstimate, 0)}
          mode={settings.mode}
          providerName={settings.externalProvider.modelId}
          onToggleRedactSource={(markerId) => {
            setInspectorSources((prev) =>
              prev.map((s) => (s.markerId === markerId ? { ...s, isRedacted: !s.isRedacted } : s))
            );
          }}
          onClose={() => setIsContextInspectorOpen(false)}
        />
      )}
    </div>
  );
};
