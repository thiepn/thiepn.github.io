import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  LayoutTemplate,
  Search,
  CheckSquare,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Download,
  Upload,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { NoteTemplate, Note } from '../../types';
import { PREBUILT_TEMPLATES } from '../../data/templates';
import { NOTE_COLORS } from '../../utils/colors';
import { TemplateCreator } from './TemplateCreator';
import {
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from '../../pkm/templates/templateUtils';

export interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  allNotes?: Note[];
  currentNoteToSave?: Note | null;
  onSaveAsTemplate?: (newTemplate: NoteTemplate) => void;
  initialTab?: 'library' | 'creator';
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  allNotes = [],
  currentNoteToSave = null,
  onSaveAsTemplate,
  initialTab = 'library',
}) => {
  // Primary Tab: 'library' | 'creator'
  const [activeTab, setActiveTab] = useState<'library' | 'creator'>(() => {
    return currentNoteToSave ? 'creator' : initialTab;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<NoteTemplate[]>(() => {
    return getCustomTemplates();
  });

  // Listen for storage updates
  useEffect(() => {
    const handleSync = () => {
      setCustomTemplates(getCustomTemplates());
    };
    window.addEventListener('keepnotes_templates_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('keepnotes_templates_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // If currentNoteToSave changes and is non-null, activate creator
  useEffect(() => {
    if (currentNoteToSave) {
      setActiveTab('creator');
      setEditingTemplate(null);
    }
  }, [currentNoteToSave]);

  const allTemplates = useMemo(() => {
    return [...customTemplates, ...PREBUILT_TEMPLATES];
  }, [customTemplates]);

  const categories = useMemo(() => {
    const set = new Set<string>([
      'All',
      'Work',
      'Personal',
      'Study',
      'Creative',
      'Development',
      'Finance',
      'Health',
    ]);
    if (customTemplates.length > 0) set.add('Custom');
    return Array.from(set);
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tmpl) => {
      if (selectedCategory !== 'All' && tmpl.category !== selectedCategory) {
        if (selectedCategory === 'Custom' && !tmpl.isCustom) return false;
        if (selectedCategory !== 'Custom') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tmpl.title.toLowerCase().includes(q) ||
          tmpl.description.toLowerCase().includes(q) ||
          tmpl.content.toLowerCase().includes(q) ||
          (tmpl.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Handlers
  const handleOpenCreatorNew = () => {
    setEditingTemplate(null);
    setActiveTab('creator');
  };

  const handleEditCustomTemplate = (tmpl: NoteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(tmpl);
    setActiveTab('creator');
  };

  const handleDuplicateTemplate = (tmpl: NoteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: NoteTemplate = {
      ...tmpl,
      id: `custom-tmpl-${Date.now()}`,
      title: `${tmpl.title} (Copy)`,
      isCustom: true,
    };
    const updated = saveCustomTemplate(copy);
    setCustomTemplates(updated);
    setStatusNotice(`Duplicated "${tmpl.title}"!`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleDeleteTemplate = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomTemplate(id);
    setCustomTemplates(updated);
    setStatusNotice(`Deleted template "${title}".`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleExportTemplatesJSON = () => {
    const dataStr = JSON.stringify(customTemplates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keepnotes_templates_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Exported custom templates as JSON.');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleImportTemplatesJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          let count = 0;
          parsed.forEach((t) => {
            if (t.id && t.title) {
              saveCustomTemplate({ ...t, isCustom: true });
              count++;
            }
          });
          setCustomTemplates(getCustomTemplates());
          setStatusNotice(`Imported ${count} templates successfully!`);
        }
      } catch (err) {
        console.error('Failed to import templates', err);
        setStatusNotice('Error importing templates file.');
      }
      setTimeout(() => setStatusNotice(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSavedFromCreator = (template: NoteTemplate) => {
    setCustomTemplates(getCustomTemplates());
    if (onSaveAsTemplate) {
      onSaveAsTemplate(template);
    }
    setActiveTab('library');
    setEditingTemplate(null);
    setStatusNotice(`Template "${template.title}" saved successfully!`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleUseFromCreator = (template: NoteTemplate) => {
    setCustomTemplates(getCustomTemplates());
    if (onSaveAsTemplate) {
      onSaveAsTemplate(template);
    }
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-stone-900 w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MASTER HEADER & TAB SWITCHER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-700/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="template-modal-title"
                className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                <span>Note Templates & Creator</span>
                {statusNotice && (
                  <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-in fade-in">
                    {statusNotice}
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose a pre-designed structure or save a note&rsquo;s structure as a reusable template
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Tab Pill Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-stone-200/80 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('library');
                  setEditingTemplate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'library'
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-amber-500" />
                <span>Library ({allTemplates.length})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreatorNew}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'creator'
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Template Creator</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. BODY CONTENT: LIBRARY TAB VS CREATOR TAB */}
        {activeTab === 'creator' ? (
          <div className="flex-1 overflow-hidden">
            <TemplateCreator
              allNotes={allNotes}
              initialNote={currentNoteToSave}
              editingTemplate={editingTemplate}
              onSaveTemplate={handleSavedFromCreator}
              onUseTemplateNow={handleUseFromCreator}
              onCancel={() => {
                setActiveTab('library');
                setEditingTemplate(null);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Library Filter & Actions Bar */}
            <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-50/40 dark:bg-stone-950/30">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search & Export/Import Controls */}
              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportTemplatesJSON}
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors text-xs"
                  title="Export custom templates as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors text-xs"
                  title="Import templates from JSON file"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportTemplatesJSON}
                />

                <button
                  type="button"
                  onClick={handleOpenCreatorNew}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ml-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Template</span>
                </button>
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-stone-400">
                  <LayoutTemplate className="w-12 h-12 stroke-[1.5] text-stone-300 dark:text-stone-700 mb-2" />
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                    No templates found
                  </p>
                  <p className="text-xs text-stone-400 max-w-sm mt-1">
                    Try searching for another keyword or create your own custom template using the Template Creator.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreatorNew}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                  >
                    + Create First Template
                  </button>
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const colorConf =
                    NOTE_COLORS[tmpl.color || 'default'] || NOTE_COLORS.default;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        onSelectTemplate(tmpl);
                        onClose();
                      }}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                        colorConf.bgLight
                      } ${colorConf.borderLight} ${colorConf.bgDark} ${colorConf.borderDark}`}
                    >
                      <div>
                        {/* Top Metadata Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-900/5 dark:bg-stone-100/10 text-stone-700 dark:text-stone-300">
                              {tmpl.category}
                            </span>
                            {tmpl.isCustom && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                Custom
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {tmpl.type === 'checklist' ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-stone-400" />
                            )}

                            {/* Custom Template Actions */}
                            {tmpl.isCustom && (
                              <div
                                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleEditCustomTemplate(tmpl, e)}
                                  className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10"
                                  title="Edit in Template Creator"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDuplicateTemplate(tmpl, e)}
                                  className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10"
                                  title="Duplicate template"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDeleteTemplate(tmpl.id, tmpl.title, e)
                                  }
                                  className="p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60"
                                  title="Delete custom template"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-1 line-clamp-1">
                          {tmpl.title}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mb-3 leading-relaxed">
                          {tmpl.description}
                        </p>

                        {/* Content Outline Preview */}
                        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] font-mono text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
                          {tmpl.content ||
                            tmpl.checklist?.map((c) => `• ${c.text}`).join('\n') ||
                            ''}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {tmpl.tags?.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] text-stone-500 dark:text-stone-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1">
                          <span>Use Template</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
