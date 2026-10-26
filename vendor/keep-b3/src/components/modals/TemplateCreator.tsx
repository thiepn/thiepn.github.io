import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  LayoutTemplate,
  CheckSquare,
  FileText,
  Tag,
  Palette,
  Eye,
  Edit3,
  Calendar,
  Clock,
  Zap,
  Wand2,
  Trash2,
  Plus,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Info,
  Check,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { NoteTemplate, Note, ChecklistItem, NoteColorKey, NoteType } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import {
  SUPPORTED_TEMPLATE_VARIABLES,
  renderTemplateContent,
  parameterizeNoteText,
  extractStructureFromMarkdown,
  cleanChecklistItems,
  extractStructureFromNote,
  saveCustomTemplate,
} from '../../pkm/templates/templateUtils';

interface TemplateCreatorProps {
  allNotes?: Note[];
  initialNote?: Note | null;
  editingTemplate?: NoteTemplate | null;
  onSaveTemplate: (template: NoteTemplate) => void;
  onUseTemplateNow?: (template: NoteTemplate) => void;
  onCancel: () => void;
}

const CATEGORY_PRESETS = [
  'Work',
  'Personal',
  'Study',
  'Creative',
  'Development',
  'Finance',
  'Health',
  'Custom',
];

const PREBUILT_SNIPPETS = [
  {
    label: 'Meeting Outline',
    content: `## 🤝 Meeting: {{title}}
- **Date**: {{date}} ({{weekday}})
- **Attendees**: [Name 1], [Name 2]
- **Objective**: Review key milestones and resolve open blockers

---

### 📌 Agenda
1. Milestone review
2. High-priority blockers
3. Resource allocation

---

### 💡 Decisions Made
- [x] Approved design direction
- [ ] Schedule technical spike

---

### 📋 Action Items
- [ ] @Assignee: Complete PR review by end of week
- [ ] @Lead: Update sprint backlog
`,
  },
  {
    label: 'Daily Standup & Focus',
    content: `## ☀️ Daily Focus — {{date}} ({{weekday}})

### 🎯 Top 3 High-Impact Priorities
1. 
2. 
3. 

### ⏳ Scheduled Timeblocks
- **Morning**: Deep work on primary objective
- **Afternoon**: Syncs and code reviews

### 🚧 Current Blockers
- None

### 💭 Daily Reflection & Wins
- 
`,
  },
  {
    label: 'Sprint Retrospective',
    content: `## 🔄 Sprint Retrospective — {{date}}
**Facilitator**: {{author}} | **Scope**: Sprint {{year}}

---

### 🟢 What went well?
- Fast turnaround on production bug fixes
- Clean documentation and test coverage

### 🔴 What went wrong or stalled?
- Flaky CI test runner
- Late requirements changes

### 🟡 Actionable Improvements
- [ ] Set up automated flaky test quarantine
- [ ] Define strict sprint freeze 48h before release
`,
  },
  {
    label: 'Markdown Grid Table',
    content: `| Item Name | Category | Status | Owner | Due Date |
| :--- | :--- | :--- | :--- | :--- |
| Core Engine Spec | Spec | Complete | Alice | {{date}} |
| Visual UI Shell | Frontend | In Progress | Bob | {{date}} |
| Security Audit | Hardening | Pending | Charlie | {{date}} |
`,
  },
  {
    label: 'Bug Report / Incident',
    content: `## 🚨 Incident / Bug Spec: {{title}}
- **Reported Date**: {{datetime}}
- **Severity**: High / P1
- **Affected Surface**: Web App

---

### 🐞 Steps to Reproduce
1. Navigate to notes feed
2. Open target item
3. Trigger action

### 🎯 Expected vs. Actual Behavior
- **Expected**: Data updates smoothly without reload
- **Actual**: Intermittent state reset

### 🔍 Root Cause Analysis & Fix Plan
- [ ] Write repro test case
- [ ] Deploy patch
`,
  },
];

export const TemplateCreator: React.FC<TemplateCreatorProps> = ({
  allNotes = [],
  initialNote = null,
  editingTemplate = null,
  onSaveTemplate,
  onUseTemplateNow,
  onCancel,
}) => {
  // Source Note Selection
  const [selectedSourceNoteId, setSelectedSourceNoteId] = useState<string>(
    initialNote?.id || ''
  );
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [showNotePicker, setShowNotePicker] = useState(false);

  // Template Form State
  const [templateId] = useState<string>(
    editingTemplate?.id || `custom-tmpl-${Date.now()}`
  );
  const [title, setTitle] = useState<string>(
    editingTemplate?.title ||
      (initialNote ? `${initialNote.title || 'Note'} Template` : '')
  );
  const [description, setDescription] = useState<string>(
    editingTemplate?.description ||
      (initialNote
        ? `Reusable template derived from "${initialNote.title || 'Untitled Note'}"`
        : '')
  );
  const [category, setCategory] = useState<string>(
    editingTemplate?.category || 'Work'
  );
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [noteType, setNoteType] = useState<NoteType>(
    editingTemplate?.type || initialNote?.type || 'text'
  );
  const [color, setColor] = useState<NoteColorKey>(
    editingTemplate?.color || initialNote?.color || 'default'
  );
  const [content, setContent] = useState<string>(
    editingTemplate?.content || initialNote?.content || ''
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (editingTemplate?.checklist) return editingTemplate.checklist;
    if (initialNote?.checklist) return cleanChecklistItems(initialNote.checklist);
    return [
      { id: 'item-1', text: 'Define primary objective', completed: false },
      { id: 'item-2', text: 'Execute implementation checklist', completed: false },
      { id: 'item-3', text: 'Conduct review and verify output', completed: false },
    ];
  });
  const [tags, setTags] = useState<string[]>(
    editingTemplate?.tags || initialNote?.tags || ['template']
  );
  const [tagInput, setTagInput] = useState('');

  // Mode: 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [copiedVarToast, setCopiedVarToast] = useState<string | null>(null);
  const [structureMessage, setStructureMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Automatically extract structure if initialized with a note and not editing an existing template
  useEffect(() => {
    if (initialNote && !editingTemplate) {
      const extracted = extractStructureFromNote(initialNote);
      setTitle(extracted.title);
      setDescription(extracted.description);
      setContent(extracted.content);
      setChecklist(extracted.checklist);
      setColor(extracted.color);
      setNoteType(extracted.type);
      setTags(extracted.tags);
      setSelectedSourceNoteId(initialNote.id);
    }
  }, [initialNote, editingTemplate]);

  // Load structure from selected note
  const handleSelectSourceNote = (note: Note) => {
    setSelectedSourceNoteId(note.id);
    setShowNotePicker(false);
    const extracted = extractStructureFromNote(note);
    setTitle(extracted.title);
    setDescription(extracted.description);
    setContent(extracted.content);
    setChecklist(extracted.checklist);
    setColor(extracted.color);
    setNoteType(extracted.type);
    setTags(extracted.tags);

    setStructureMessage(`Loaded structure from "${note.title || 'Untitled'}"!`);
    setTimeout(() => setStructureMessage(null), 3500);
  };

  // Quick Action 1: Extract Structure Only
  const handleExtractStructureOnly = () => {
    if (noteType === 'text') {
      const outline = extractStructureFromMarkdown(content);
      setContent(outline);
      setStructureMessage('Extracted clean outline and removed prose sentences.');
    } else {
      setChecklist(cleanChecklistItems(checklist));
      setStructureMessage('Reset all checklist items to fresh uncompleted state.');
    }
    setTimeout(() => setStructureMessage(null), 3000);
  };

  // Quick Action 2: Auto-Parameterize Dates & Variables
  const handleAutoParameterize = () => {
    if (noteType === 'text') {
      const parameterized = parameterizeNoteText(content, title);
      setContent(parameterized);
      setStructureMessage('Replaced specific dates, weekdays & title with dynamic variables.');
    }
    const parameterizedTitle = parameterizeNoteText(title);
    setTitle(parameterizedTitle);
    setTimeout(() => setStructureMessage(null), 3000);
  };

  // Insert Variable at cursor position
  const handleInsertVariable = (varKey: string) => {
    const varText = `{{${varKey}}}`;
    if (noteType === 'text') {
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart || 0;
        const end = textareaRef.current.selectionEnd || 0;
        const newText = content.substring(0, start) + varText + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
              start + varText.length;
          }
        }, 50);
      } else {
        setContent((prev) => `${prev} ${varText}`);
      }
    } else {
      // Add as checklist item template or append to active title
      setTitle((prev) => `${prev} ${varText}`);
    }

    setCopiedVarToast(`Inserted ${varText}`);
    setTimeout(() => setCopiedVarToast(null), 2000);
  };

  // Insert Snippet
  const handleInsertSnippet = (snippetContent: string) => {
    setContent((prev) => (prev ? `${prev.trim()}\n\n${snippetContent}` : snippetContent));
    setStructureMessage('Snippet appended to template.');
    setTimeout(() => setStructureMessage(null), 2500);
  };

  // Add / Remove Tag
  const handleAddTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Checklist Item Helpers
  const handleAddChecklistItem = () => {
    setChecklist([
      ...checklist,
      { id: `item-${Date.now()}`, text: '', completed: false },
    ]);
  };

  const handleUpdateChecklistItem = (id: string, newText: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  // Build the compiled template object
  const compiledTemplate: NoteTemplate = useMemo(() => {
    const cat = category === 'Custom' && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : category;

    return {
      id: templateId,
      title: title.trim() || 'Untitled Template',
      description: description.trim() || 'Custom reusable note template',
      category: cat,
      content: noteType === 'text' ? content : '',
      type: noteType,
      checklist: noteType === 'checklist' ? checklist : undefined,
      color,
      tags,
      isCustom: true,
    };
  }, [
    templateId,
    title,
    description,
    category,
    customCategoryInput,
    noteType,
    content,
    checklist,
    color,
    tags,
  ]);

  // Live Simulated Preview
  const simulatedRenderedTitle = useMemo(() => {
    return renderTemplateContent(compiledTemplate.title, {
      title: 'Sample Note',
    });
  }, [compiledTemplate.title]);

  const simulatedRenderedContent = useMemo(() => {
    return renderTemplateContent(compiledTemplate.content, {
      title: simulatedRenderedTitle,
    });
  }, [compiledTemplate.content, simulatedRenderedTitle]);

  // Save Handler
  const handleSave = () => {
    if (!title.trim()) {
      setStructureMessage('Please provide a title for the template.');
      return;
    }
    saveCustomTemplate(compiledTemplate);
    onSaveTemplate(compiledTemplate);
  };

  // Save and Immediately Create Note
  const handleSaveAndUse = () => {
    if (!title.trim()) {
      setStructureMessage('Please provide a title for the template.');
      return;
    }
    saveCustomTemplate(compiledTemplate);
    if (onUseTemplateNow) {
      onUseTemplateNow(compiledTemplate);
    } else {
      onSaveTemplate(compiledTemplate);
    }
  };

  const filteredNotesForPicker = useMemo(() => {
    if (!noteSearchQuery.trim()) return allNotes.slice(0, 15);
    const q = noteSearchQuery.toLowerCase();
    return allNotes
      .filter(
        (n) =>
          !n.trashed &&
          ((n.title || '').toLowerCase().includes(q) ||
            (n.content || '').toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [allNotes, noteSearchQuery]);

  const currentColorConfig = NOTE_COLORS[color] || NOTE_COLORS.default;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
      {/* 1. TOP STATUS BAR & NOTE SOURCE SELECTOR */}
      <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotePicker(!showNotePicker)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold flex items-center gap-2 hover:border-amber-400 dark:hover:border-amber-500 transition-colors shadow-2xs"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              <span className="max-w-[180px] sm:max-w-xs truncate">
                {selectedSourceNoteId
                  ? allNotes.find((n) => n.id === selectedSourceNoteId)?.title ||
                    'Custom Note Selected'
                  : 'Import Structure from Note...'}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {/* Note Picker Dropdown */}
            {showNotePicker && (
              <div
                className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search vault notes..."
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {filteredNotesForPicker.length === 0 ? (
                    <div className="text-center py-4 text-xs text-stone-400">
                      No matching notes found
                    </div>
                  ) : (
                    filteredNotesForPicker.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => handleSelectSourceNote(note)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                          selectedSourceNoteId === note.id
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold'
                            : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <span className="truncate">{note.title || 'Untitled Note'}</span>
                        <span className="text-[10px] uppercase font-mono text-stone-400 shrink-0">
                          {note.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification message */}
          {structureMessage && (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{structureMessage}</span>
            </div>
          )}
        </div>

        {/* View Switcher: Editor vs Live Preview */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-200/80 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Template Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Simulated Preview</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN BODY: STUDIO VS SIMULATED PREVIEW */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {viewMode === 'editor' ? (
          <>
            {/* Template Identity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Title & Description */}
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Template Title <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Sprint Retro & Planning"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-hidden focus:border-amber-500 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Description & Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="Briefly describe when and how to use this template..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-hidden focus:border-amber-500 text-stone-800 dark:text-stone-200"
                  />
                </div>
              </div>

              {/* Category & Color */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-hidden focus:border-amber-500 text-stone-800 dark:text-stone-200"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {category === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom category name..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Accent Color Theme
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(Object.keys(NOTE_COLORS) as NoteColorKey[]).slice(0, 8).map((cKey) => {
                      const c = NOTE_COLORS[cKey];
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setColor(cKey)}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            c.bgLight
                          } ${c.borderLight} ${
                            color === cKey
                              ? 'scale-115 ring-2 ring-amber-500 shadow-xs'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          title={`Color: ${c.name}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Structure Transformation Toolbar */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Smart Structure Tools:
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExtractStructureOnly}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Strip paragraphs of prose while preserving headings, tables, and task outlines"
                >
                  <RefreshCw className="w-3 h-3 text-amber-500" />
                  <span>Extract Structure Only</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoParameterize}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Detect specific dates and replace with dynamic {{date}}, {{time}}, {{weekday}}"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Auto-Parameterize Variables</span>
                </button>
              </div>
            </div>

            {/* Dynamic Variables Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dynamic Template Variables (Click to Insert):</span>
                </label>
                {copiedVarToast && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">
                    {copiedVarToast}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {SUPPORTED_TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertVariable(v.key)}
                    className="group px-2 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-amber-950/60 border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600 text-stone-800 dark:text-stone-200 text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                    title={`${v.description} (Evaluates to "${v.sample}")`}
                  >
                    <span className="text-amber-600 dark:text-amber-400 font-bold">+</span>
                    <span>{`{{${v.key}}}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note Type Selector (Markdown vs Checklist) */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Note Format:
                </span>
                <div className="flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => setNoteType('text')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      noteType === 'text'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-bold'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Markdown Content</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteType('checklist')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      noteType === 'checklist'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-bold'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Task Checklist</span>
                  </button>
                </div>
              </div>

              {/* Prebuilt Snippets Dropdown */}
              {noteType === 'text' && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-stone-400">Append Structure:</span>
                  {PREBUILT_SNIPPETS.slice(0, 3).map((snippet) => (
                    <button
                      key={snippet.label}
                      type="button"
                      onClick={() => handleInsertSnippet(snippet.content)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors border border-stone-200 dark:border-stone-700"
                    >
                      + {snippet.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Editor */}
            {noteType === 'text' ? (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Template Content & Markdown Structure
                </label>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="## Heading Outline...&#10;- Action items&#10;| Tables | with | headers |&#10;Include {{date}}, {{time}}, {{title}}..."
                  rows={10}
                  className="w-full p-3.5 font-mono text-xs bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-2xl focus:outline-hidden focus:border-amber-500 text-stone-900 dark:text-stone-100 leading-relaxed resize-y"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Template Checklist Items ({checklist.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto p-1">
                  {checklist.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                    >
                      <span className="text-[11px] font-mono text-stone-400 w-5 text-right">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                        placeholder="Task description (supports {{date}}, {{title}})..."
                        className="flex-1 px-2 py-1 text-xs bg-transparent border-0 focus:outline-none text-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                        title="Delete task item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Suggested Tags
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white w-24"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-2 py-1 text-xs font-bold rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-amber-500 hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* --- SIMULATED LIVE PREVIEW MODE --- */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulated live note with interpolated variables for today:</span>
              </span>
              <span className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                Category: {compiledTemplate.category}
              </span>
            </div>

            {/* Note Card Mockup Container */}
            <div
              className={`p-6 rounded-3xl border shadow-lg transition-all ${
                currentColorConfig.bgLight
              } ${currentColorConfig.borderLight} ${currentColorConfig.bgDark} ${
                currentColorConfig.borderDark
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 border-b border-black/5 dark:border-white/5 pb-2">
                <h2 className="text-lg font-bold text-stone-950 dark:text-white tracking-tight">
                  {simulatedRenderedTitle}
                </h2>
                <div className="flex items-center gap-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-black/5 dark:bg-white/10 text-stone-700 dark:text-stone-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Body */}
              {noteType === 'text' ? (
                <div className="prose prose-stone dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {simulatedRenderedContent || (
                    <span className="text-stone-400 italic">No content in template.</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-4 rounded-md border border-stone-400 dark:border-stone-600 flex items-center justify-center bg-white dark:bg-stone-800" />
                      <span className="text-stone-800 dark:text-stone-200">
                        {renderTemplateContent(item.text, { title: simulatedRenderedTitle })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-stone-500">
                <span>Created from template &ldquo;{title}&rdquo;</span>
                <span className="font-mono">Ready to instantiate</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER ACTIONS */}
      <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-800 font-semibold text-xs transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold text-xs transition-colors border border-stone-300 dark:border-stone-700 flex items-center gap-1.5 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>Save Template</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndUse}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md hover:shadow-lg"
          >
            <span>Save & Create Note Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
