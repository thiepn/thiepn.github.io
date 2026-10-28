import React, { useState, useMemo } from 'react';
import {
  FileText,
  Hash,
  Box,
  Image as ImageIcon,
  Search,
  X,
  Plus,
  Folder as FolderIcon,
  Tag,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { parseNote } from '../parser';
import { PKMHeading, PKMBlock } from '../types';

export type CanvasResourceInsertType = 'note' | 'section' | 'block' | 'media';

interface CanvasResourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onInsertNote: (note: Note) => void;
  onInsertSection: (note: Note, heading: PKMHeading) => void;
  onInsertBlock: (note: Note, blockId: string) => void;
  onInsertMedia: (mediaType: 'image' | 'pdf' | 'audio', url: string, title?: string) => void;
}

export const CanvasResourcePickerModal: React.FC<CanvasResourcePickerModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onInsertNote,
  onInsertSection,
  onInsertBlock,
  onInsertMedia,
}) => {
  const [activeTab, setActiveTab] = useState<CanvasResourceInsertType>('note');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteForSection, setSelectedNoteForSection] = useState<Note | null>(null);
  const [selectedNoteForBlock, setSelectedNoteForBlock] = useState<Note | null>(null);
  const [customBlockId, setCustomBlockId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'pdf' | 'audio'>('image');

  const foldersMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const activeNotes = useMemo(() => {
    return notes.filter((n) => !n.trashed && !n.archived);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return activeNotes.slice(0, 35);
    const q = searchQuery.toLowerCase().trim();
    return activeNotes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 35);
  }, [activeNotes, searchQuery]);

  // Headings for selected note in Section tab
  const noteHeadings = useMemo<PKMHeading[]>(() => {
    if (!selectedNoteForSection) return [];
    const parsed = parseNote(selectedNoteForSection);
    return parsed.headings || [];
  }, [selectedNoteForSection]);

  // Blocks for selected note in Block tab
  const noteBlocks = useMemo<PKMBlock[]>(() => {
    if (!selectedNoteForBlock) return [];
    const parsed = parseNote(selectedNoteForBlock);
    return parsed.blocks || [];
  }, [selectedNoteForBlock]);

  if (!isOpen) return null;

  return (
    <div
      id="canvas-resource-picker-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="canvas-resource-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Insert on Canvas"
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[85vh] text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Resource Tabs */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Add to Infinite Canvas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('note');
              setSelectedNoteForSection(null);
              setSelectedNoteForBlock(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'note'
                ? 'bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('section');
              setSelectedNoteForSection(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'section'
                ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Section / Heading</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('block');
              setSelectedNoteForBlock(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'block'
                ? 'bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Block (^id)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'media'
                ? 'bg-white dark:bg-stone-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Card</span>
          </button>
        </div>

        {/* Tab 1: Note Cards */}
        {activeTab === 'note' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-stone-100 dark:border-stone-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vault notes to place on canvas..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">No matching notes found</div>
              ) : (
                filteredNotes.map((note) => {
                  const folder = note.folderId ? foldersMap.get(note.folderId) : null;
                  return (
                    <div
                      key={note.id}
                      onClick={() => onInsertNote(note)}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {note.title || 'Untitled Note'}
                          </span>
                          {folder && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                              <FolderIcon className="w-2.5 h-2.5" />
                              {folder.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                          {note.content ? note.content.slice(0, 90) : 'Empty note'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0"
                      >
                        Place Note
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Section Cards */}
        {activeTab === 'section' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedNoteForSection ? (
              <>
                <div className="p-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Step 1: Choose source note containing heading..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteForSection(note)}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {note.title || 'Untitled Note'}
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                          {note.content ? note.content.slice(0, 90) : 'Empty note'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">
                      Selected Note:
                    </span>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {selectedNoteForSection.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNoteForSection(null)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    Change Note
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Step 2: Choose Heading Section to place on Canvas
                  </div>

                  {noteHeadings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-850 rounded-xl">
                      No markdown headings (e.g. # Heading) found in this note.
                    </div>
                  ) : (
                    noteHeadings.map((h, idx) => (
                      <div
                        key={`${h.slug}-${idx}`}
                        onClick={() => onInsertSection(selectedNoteForSection, h)}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {'#'.repeat(h.level)}
                          </span>
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {h.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0"
                        >
                          Place Section
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Block Cards */}
        {activeTab === 'block' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedNoteForBlock ? (
              <>
                <div className="p-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Step 1: Choose source note containing block..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteForBlock(note)}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {note.title || 'Untitled Note'}
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                          {note.content ? note.content.slice(0, 90) : 'Empty note'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">
                      Selected Note:
                    </span>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {selectedNoteForBlock.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNoteForBlock(null)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Change Note
                  </button>
                </div>

                {/* Detected Blocks */}
                {noteBlocks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Discovered Block References (^id):
                    </div>
                    {noteBlocks.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => onInsertBlock(selectedNoteForBlock, b.id)}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="overflow-hidden pr-2">
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ^{b.id}
                          </span>
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                            {b.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0"
                        >
                          Place Block
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Block Identifier Entry */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 space-y-2">
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Enter or create Block ID (^identifier)
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customBlockId}
                      onChange={(e) => setCustomBlockId(e.target.value)}
                      placeholder="e.g. quote-1 or summary-block"
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = customBlockId.replace(/^\^/, '').trim();
                        if (clean) onInsertBlock(selectedNoteForBlock, clean);
                      }}
                      disabled={!customBlockId.trim()}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors"
                    >
                      Place Block
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Media Cards */}
        {activeTab === 'media' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Media Type
              </label>
              <div className="flex items-center gap-2">
                {(['image', 'pdf', 'audio'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMediaType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      mediaType === t
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Media URL or Attachment Path
              </label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/image.png or attachment:id"
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Title / Label (Optional)
              </label>
              <input
                type="text"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                placeholder="Descriptive title..."
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (mediaUrl.trim()) {
                    onInsertMedia(mediaType, mediaUrl.trim(), mediaTitle.trim() || undefined);
                  }
                }}
                disabled={!mediaUrl.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl transition-colors shadow-md"
              >
                Place Media Card
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
