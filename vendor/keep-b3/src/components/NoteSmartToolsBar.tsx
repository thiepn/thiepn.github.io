import React, { useState, useMemo } from 'react';
import { 
  Wand2, 
  Tag as TagIcon, 
  CheckSquare, 
  FileText, 
  Link2, 
  ListTree, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  RotateCcw,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Note } from '../types';
import { smartNoteService, ExtractedTask, WikiLinkSuggestion } from '../services/smartNoteService';

interface NoteSmartToolsBarProps {
  note: Note | null;
  currentTitle: string;
  currentContent: string;
  currentTags: string[];
  allNotes: Note[];
  onAddTags: (tags: string[]) => void;
  onSetTitle: (title: string) => void;
  onAppendChecklist: (tasks: Array<{ text: string; completed: boolean }>) => void;
  onPrependContent: (text: string) => void;
  onInsertContent: (text: string) => void;
}

export const NoteSmartToolsBar: React.FC<NoteSmartToolsBarProps> = ({
  note,
  currentTitle,
  currentContent,
  currentTags,
  allNotes,
  onAddTags,
  onSetTitle,
  onAppendChecklist,
  onPrependContent,
  onInsertContent,
}) => {
  const [activeTab, setActiveTab] = useState<'tags' | 'tasks' | 'summary' | 'links' | 'tools'>('tags');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Local instant analysis
  const suggestedTags = useMemo(() => {
    return smartNoteService.extractTags(currentTitle, currentContent, currentTags);
  }, [currentTitle, currentContent, currentTags]);

  const extractedTasks = useMemo(() => {
    return smartNoteService.extractTasks(currentContent);
  }, [currentContent]);

  const summary = useMemo(() => {
    return smartNoteService.generateSummary(currentTitle, currentContent);
  }, [currentTitle, currentContent]);

  const suggestedLinks = useMemo(() => {
    return smartNoteService.suggestWikiLinks(currentContent, note?.id, allNotes);
  }, [currentContent, note?.id, allNotes]);

  const derivedTitle = useMemo(() => {
    return smartNoteService.generateTitle(currentContent, currentTitle);
  }, [currentContent, currentTitle]);

  const wordCount = useMemo(() => {
    return (currentContent.trim().match(/\S+/g) || []).length;
  }, [currentContent]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleApplySummaryAsCallout = () => {
    const callout = `> [!NOTE] TL;DR\n> ${summary.summary}\n>\n${summary.keyTakeaways.map(k => `> - ${k}`).join('\n')}\n\n`;
    onPrependContent(callout);
  };

  const handleInsertWikiLink = (link: WikiLinkSuggestion) => {
    onInsertContent(` [[${link.title}]] `);
  };

  const handleInsertOutline = () => {
    const outline = smartNoteService.enhanceText(currentContent, 'outline');
    onInsertContent(`\n\n### Table of Contents\n${outline}\n\n`);
  };

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 p-3 shadow-xs transition-all">
      {/* Header and Mode Selector */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/60 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Wand2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            Smart Note Utilities
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              Offline Local Engine
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mr-2">
            <Clock className="w-3 h-3" />
            <span>{readingTime} min read</span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span>{wordCount} words</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="pt-2.5">
          {/* Subtabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tags'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <TagIcon className="w-3 h-3" />
              <span>Smart Tags {suggestedTags.length > 0 && `(${suggestedTags.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Tasks {extractedTasks.length > 0 && `(${extractedTasks.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Extractive TL;DR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'links'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <Link2 className="w-3 h-3" />
              <span>WikiLinks {suggestedLinks.length > 0 && `(${suggestedLinks.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tools'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
            >
              <ListTree className="w-3 h-3" />
              <span>Outline & Title</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-2 text-xs">
            {/* TAGS TAB */}
            {activeTab === 'tags' && (
              <div className="space-y-2">
                {suggestedTags.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400 italic py-1">
                    Add more content to your note to automatically detect semantic keywords and tags.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-stone-500 dark:text-stone-400 mr-1">Suggested:</span>
                    {suggestedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onAddTags([tag])}
                        className="px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium group"
                        title={`Click to add tag #${tag}`}
                      >
                        <span>#{tag}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px]">+</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onAddTags(suggestedTags)}
                      className="ml-auto px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors font-semibold text-[11px]"
                    >
                      Add All ({suggestedTags.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-2">
                {extractedTasks.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400 italic py-1">
                    No task patterns detected. Write lines starting with "TODO:", action verbs (Review, Schedule), or "- [ ]" to scan them automatically.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-stone-500 dark:text-stone-400">
                        Found {extractedTasks.length} action item{extractedTasks.length > 1 ? 's' : ''}:
                      </span>
                      <button
                        type="button"
                        onClick={() => onAppendChecklist(extractedTasks)}
                        className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 font-semibold text-[11px] flex items-center gap-1"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                        Append to Checklist
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {extractedTasks.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-1.5 rounded-md bg-white dark:bg-stone-800/80 border border-stone-200/70 dark:border-stone-700/60"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${t.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="flex-1 text-stone-800 dark:text-stone-200 font-medium">
                            {t.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAppendChecklist([t])}
                            className="text-[10px] text-amber-600 hover:underline shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 space-y-2">
                  <div className="font-medium text-stone-900 dark:text-stone-100 text-[12px] leading-relaxed">
                    {summary.summary}
                  </div>
                  {summary.keyTakeaways.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-stone-600 dark:text-stone-300 text-[11px]">
                      {summary.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="leading-snug">{takeaway}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${summary.summary}\n\n${summary.keyTakeaways.map(k => `- ${k}`).join('\n')}`);
                      setCopiedSummary(true);
                      setTimeout(() => setCopiedSummary(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1"
                  >
                    {copiedSummary ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplySummaryAsCallout}
                    className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 shadow-xs"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>Insert Callout at Top</span>
                  </button>
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === 'links' && (
              <div className="space-y-2">
                {suggestedLinks.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400 italic py-1">
                    No matching note titles discovered in current text. Mention other note titles to link them together!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-stone-500 dark:text-stone-400">
                      Discovered {suggestedLinks.length} potential vault cross-references:
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {suggestedLinks.map((link) => (
                        <div
                          key={link.noteId}
                          className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-stone-800/80 border border-stone-200/70 dark:border-stone-700/60"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                              [[{link.title}]]
                            </span>
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                              Context: {link.matchContext}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInsertWikiLink(link)}
                            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-[11px] shrink-0"
                          >
                            Insert Link
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TOOLS & TITLE TAB */}
            {activeTab === 'tools' && (
              <div className="space-y-3">
                {/* Auto Title */}
                <div className="p-2 rounded-lg bg-white dark:bg-stone-800/80 border border-stone-200/70 dark:border-stone-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                      Suggested Title
                    </span>
                    <p className="font-medium text-stone-800 dark:text-stone-200 truncate">
                      {derivedTitle}
                    </p>
                  </div>
                  {derivedTitle !== currentTitle && (
                    <button
                      type="button"
                      onClick={() => onSetTitle(derivedTitle)}
                      className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-medium text-[11px] shrink-0"
                    >
                      Apply Title
                    </button>
                  )}
                </div>

                {/* Outline & Structure Generator */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleInsertOutline}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5"
                  >
                    <ListTree className="w-3.5 h-3.5 text-amber-500" />
                    <span>Generate Table of Contents</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const clean = smartNoteService.enhanceText(currentContent, 'clean');
                      onInsertContent(clean.slice(currentContent.length));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Clean Spacing & Markdown</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
