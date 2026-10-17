import React, { useState, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Image as ImageIcon,
  Brush,
  Bell,
  Pin,
  Folder as FolderIcon,
  Palette,
  Tag,
  Plus,
  X,
  Calendar,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Note, Folder, NoteColorKey, ChecklistItem, NoteImage } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';
import { extractClipboardContent } from '../pkm/webCapture';
import { extractHashtags } from '../utils/linking';
import { TagAutocompleteInput } from './TagAutocompleteInput';
import { fireConfetti } from '../utils/confetti';
import { soundscapeService } from '../utils/soundscapes';

interface QuickNoteInputProps {
  folders: Folder[];
  allNotes?: Note[];
  defaultColor?: NoteColorKey;
  defaultFolderId?: string | null;
  selectedFolderId?: string | null;
  onCreateNote?: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveNote?: (note: Partial<Note>) => void;
  onOpenDrawingModal: (onSaveDrawing: (dataUrl: string) => void) => void;
}

export const QuickNoteInput: React.FC<QuickNoteInputProps> = ({
  folders,
  allNotes = [],
  defaultColor,
  defaultFolderId,
  selectedFolderId,
  onCreateNote,
  onSaveNote,
  onOpenDrawingModal,
}) => {
  const activeInitialFolder = selectedFolderId !== undefined ? selectedFolderId : defaultFolderId || null;
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'checklist'>('text');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [color, setColor] = useState<NoteColorKey>(defaultColor || 'default');
  const [folderId, setFolderId] = useState<string | null>(activeInitialFolder);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderDate, setReminderDate] = useState<string | null>(null);
  const [images, setImages] = useState<NoteImage[]>([]);

  // Popups
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close popups or save and close on outside click / escape
  useEffect(() => {
    if (!isExpanded && !showColorPicker && !showFolderPicker && !showTagPicker && !showReminderPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (isExpanded) {
          handleSaveAndClose();
        } else {
          setShowColorPicker(false);
          setShowFolderPicker(false);
          setShowTagPicker(false);
          setShowReminderPicker(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker || showFolderPicker || showTagPicker || showReminderPicker) {
          setShowColorPicker(false);
          setShowFolderPicker(false);
          setShowTagPicker(false);
          setShowReminderPicker(false);
        } else if (isExpanded) {
          handleSaveAndClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isExpanded) {
          handleSaveAndClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, showColorPicker, showFolderPicker, showTagPicker, showReminderPicker, title, content, checklist, color, folderId, tags, isPinned, reminderDate, images]);

  // Auto-parse hashtags from title, content, and checklist items into tags
  useEffect(() => {
    const checklistText = checklist.map((c) => c.text).join('\n');
    const extracted = extractHashtags(`${title}\n${content}\n${checklistText}`);
    if (extracted.length > 0) {
      setTags((prev) => {
        const combined = Array.from(new Set([...prev, ...extracted]));
        if (combined.length !== prev.length) {
          return combined;
        }
        return prev;
      });
    }
  }, [title, content, checklist]);

  const handleSaveAndClose = () => {
    const hasText = content.trim().length > 0;
    const hasTitle = title.trim().length > 0;
    const hasItems = checklist.some((c) => c.text.trim().length > 0);
    const hasImages = images.length > 0;

    if (hasText || hasTitle || hasItems || hasImages) {
      const checklistText = checklist.map((c) => c.text).join('\n');
      const extracted = extractHashtags(`${title}\n${content}\n${checklistText}`);
      const mergedTags = Array.from(new Set([...tags, ...extracted]));

      const notePayload = {
        title: title.trim() || 'Untitled Note',
        content,
        type,
        checklist: checklist.filter((c) => c.text.trim().length > 0),
        color,
        folderId: folderId === 'unorganized' ? null : folderId,
        tags: mergedTags,
        pinned: isPinned,
        archived: false,
        trashed: false,
        reminderDate,
        images,
      };

      if (onCreateNote) {
        onCreateNote(notePayload);
      } else if (onSaveNote) {
        onSaveNote(notePayload);
      }
    }

    // Reset state
    setTitle('');
    setContent('');
    setType('text');
    setChecklist([]);
    setNewChecklistText('');
    setColor(defaultColor || 'default');
    setFolderId(activeInitialFolder);
    setTags([]);
    setIsPinned(false);
    setReminderDate(null);
    setImages([]);
    setShowColorPicker(false);
    setShowFolderPicker(false);
    setShowTagPicker(false);
    setShowReminderPicker(false);
    setIsExpanded(false);
  };

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: newChecklistText.trim(),
        completed: false,
      },
    ]);
    setNewChecklistText('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const toggleChecklistItem = (id: string, e?: React.MouseEvent) => {
    const targetItem = checklist.find((item) => item.id === id);
    const willBeCompleted = targetItem ? !targetItem.completed : false;
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    if (
      willBeCompleted &&
      updated.length > 0 &&
      updated.every((item) => item.completed)
    ) {
      fireConfetti(e?.clientX, e?.clientY);
    }
    setChecklist(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: reader.result as string,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const extracted = await extractClipboardContent(e.clipboardData);
    if (extracted.images.length > 0) {
      e.preventDefault();
      setImages((prev) => [...prev, ...extracted.images]);
    }

    if (extracted.hasHtml && extracted.markdown) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newText = content.slice(0, start) + extracted.markdown + content.slice(end);
      setContent(newText);
      if (extracted.title && !title) {
        setTitle(extracted.title);
      }
    }
  };

  const colorConfig = NOTE_COLORS[color] || NOTE_COLORS.default;

  const renderColorPaletteMenu = (positionClasses: string) => (
    <div
      className={`absolute ${positionClasses} p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl z-50 min-w-[270px] max-w-[310px] space-y-2.5`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-800">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-amber-500" />
          Color Palette
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700"
          style={{
            backgroundColor: color === 'default' ? '#f5f5f4' : NOTE_COLORS[color].hex + '28',
            color: color === 'default' ? '#44403c' : '#1c1917',
          }}
        >
          {NOTE_COLORS[color]?.name || 'Default'}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2 pt-0.5">
        {COLOR_KEYS.map((k) => {
          const cfg = NOTE_COLORS[k];
          const isSelected = color === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setColor(k);
                setShowColorPicker(false);
                if (!isExpanded) {
                  setIsExpanded(true);
                }
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all relative ${
                isSelected
                  ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-900 scale-110 shadow-xs'
                  : 'hover:scale-110 hover:shadow-xs border border-stone-300 dark:border-stone-600'
              }`}
              style={{ backgroundColor: cfg.hex }}
              title={cfg.name}
              aria-label={`Select ${cfg.name} note color`}
            >
              {isSelected && (
                <Check
                  className="w-3.5 h-3.5 text-stone-950 stroke-[3]"
                />
              )}
            </button>
          );
        })}
      </div>

      {color !== 'default' && (
        <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setColor('default');
            }}
            className="text-[11px] text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100 font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to default
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto my-3 px-2 sm:px-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      <div
        ref={containerRef}
        className={`rounded-2xl transition-all duration-200 shadow-sm border ${
          colorConfig.borderLight
        } ${colorConfig.bgLight} ${colorConfig.bgDark} ${colorConfig.borderDark}`}
      >
        {!isExpanded ? (
          /* Collapsed State */
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center justify-between px-4 py-3 cursor-text text-stone-700 dark:text-stone-300"
          >
            <span className="text-sm font-semibold">Take a note...</span>
            <div
              className="flex items-center gap-1 text-stone-600 dark:text-stone-400"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Color Palette Tool */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowFolderPicker(false);
                    setShowTagPicker(false);
                    setShowReminderPicker(false);
                  }}
                  className={`p-2 rounded-xl transition-colors relative ${
                    showColorPicker || color !== 'default'
                      ? 'bg-stone-200/90 dark:bg-stone-800 text-stone-950 dark:text-white'
                      : 'hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-800'
                  }`}
                  title={`Color Palette (${NOTE_COLORS[color]?.name || 'Default'})`}
                  aria-label="Select note color"
                >
                  <Palette className="w-4 h-4 stroke-[2.25]" />
                  {color !== 'default' && (
                    <span
                      className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-stone-900 shadow-xs"
                      style={{ backgroundColor: NOTE_COLORS[color].hex }}
                    />
                  )}
                </button>
                {showColorPicker && renderColorPaletteMenu('right-0 top-full mt-2')}
              </div>

              <button
                type="button"
                onClick={() => {
                  setType('checklist');
                  setIsExpanded(true);
                }}
                className="p-2 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl transition-colors"
                title="New Checklist"
                aria-label="New Checklist"
              >
                <CheckSquare className="w-4 h-4 stroke-[2.25]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(true);
                  onOpenDrawingModal((dataUrl) => {
                    setImages((prev) => [
                      ...prev,
                      {
                        id: `draw-${Date.now()}`,
                        name: 'Drawing.png',
                        dataUrl,
                      },
                    ]);
                  });
                }}
                className="p-2 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl transition-colors"
                title="New Drawing Note"
                aria-label="New Drawing Note"
              >
                <Brush className="w-4 h-4 stroke-[2.25]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(true);
                  fileInputRef.current?.click();
                }}
                className="p-2 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl transition-colors"
                title="Upload Image"
                aria-label="Upload Image"
              >
                <ImageIcon className="w-4 h-4 stroke-[2.25]" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded State */
          <div className="p-4 space-y-3">
            {/* Title & Pin Bar */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={() => soundscapeService.playTypewriterClick()}
                className="w-full bg-transparent text-base font-bold text-stone-950 dark:text-white placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/50'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
                title={isPinned ? 'Unpin note' : 'Pin note to top'}
              >
                <Pin className="w-4 h-4 stroke-[2.25]" />
              </button>
            </div>

            {/* Images attached preview */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="h-20 w-auto object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages(images.filter((i) => i.id !== img.id))
                      }
                      className="absolute top-1 right-1 p-1 bg-stone-950/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Content Textarea or Checklist */}
            {type === 'text' ? (
              <textarea
                placeholder="Take a note... (supports markdown, [[Note Link]])"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={() => soundscapeService.playTypewriterClick()}
                onPaste={handlePaste}
                rows={3}
                className="w-full bg-transparent text-sm font-normal text-stone-900 dark:text-stone-100 placeholder-stone-500 dark:placeholder-stone-400 resize-y focus:outline-none leading-relaxed"
              />
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-stone-950 dark:text-stone-50 font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => toggleChecklistItem(item.id, e as unknown as React.MouseEvent)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-400"
                    />
                    <span
                      className={`flex-1 ${
                        item.completed ? 'line-through text-stone-500 dark:text-stone-400' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-stone-500 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add new checklist item input */}
                <div className="flex items-center gap-2 pt-1">
                  <Plus className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                  <input
                    type="text"
                    placeholder="List item"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      soundscapeService.playTypewriterClick();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    className="w-full bg-transparent text-sm font-medium text-stone-950 dark:text-stone-100 placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none"
                  />
                  {newChecklistText && (
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-2 py-0.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tags & Folder & Reminder Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {folderId && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-semibold border border-stone-300 dark:border-stone-700">
                  <FolderIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>
                    {folders.find((f) => f.id === folderId)?.name || 'Folder'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFolderId(null)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              {reminderDate && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-200 dark:bg-sky-950 text-sky-950 dark:text-sky-200 text-xs font-semibold border border-sky-300 dark:border-sky-800">
                  <Bell className="w-3 h-3 text-sky-700 dark:text-sky-400" />
                  <span>{new Date(reminderDate).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setReminderDate(null)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              {tags.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold border border-amber-300/80 dark:border-amber-800/80"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Toolbar & Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-300/70 dark:border-stone-800 text-stone-700 dark:text-stone-300">
              <div className="flex items-center gap-1 relative">
                {/* Color Palette Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPicker(!showColorPicker);
                      setShowFolderPicker(false);
                      setShowTagPicker(false);
                      setShowReminderPicker(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors relative ${
                      showColorPicker || color !== 'default'
                        ? 'bg-stone-200/90 dark:bg-stone-800 text-stone-950 dark:text-white'
                        : 'hover:bg-stone-200/80 dark:hover:bg-stone-800'
                    }`}
                    title={`Color Palette: ${NOTE_COLORS[color]?.name || 'Default'}`}
                    aria-label="Change note color"
                  >
                    <Palette className="w-4 h-4" />
                    {color !== 'default' && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-stone-900"
                        style={{ backgroundColor: NOTE_COLORS[color].hex }}
                      />
                    )}
                  </button>
                  {showColorPicker && renderColorPaletteMenu('left-0 bottom-full mb-2')}
                </div>

                {/* Folder Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFolderPicker(!showFolderPicker);
                      setShowColorPicker(false);
                      setShowTagPicker(false);
                      setShowReminderPicker(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                    title="Select Folder"
                  >
                    <FolderIcon className="w-4 h-4" />
                  </button>
                  {showFolderPicker && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFolderId(null);
                          setShowFolderPicker(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium"
                      >
                        No Folder (Unorganized)
                      </button>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setFolderId(f.id);
                            setShowFolderPicker(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-950 dark:text-stone-100 font-semibold flex items-center gap-2"
                        >
                          <FolderIcon
                            className="w-3.5 h-3.5"
                            style={{ color: f.color || '#f59e0b' }}
                          />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tag adder popup */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTagPicker(!showTagPicker);
                      setShowColorPicker(false);
                      setShowFolderPicker(false);
                      setShowReminderPicker(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showTagPicker
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'hover:bg-stone-200/80 dark:hover:bg-stone-800'
                    }`}
                    title="Add Label / Tag"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  {showTagPicker && (
                    <div className="absolute left-0 bottom-full mb-2 min-w-[200px] p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs">
                      <TagAutocompleteInput
                        tags={tags}
                        notes={allNotes}
                        onAddTag={(newTag) => {
                          if (!tags.includes(newTag)) {
                            setTags((prev) => [...prev, newTag]);
                          }
                          setShowTagPicker(false);
                        }}
                        onRemoveTag={(t) => {
                          setTags((prev) => prev.filter((tag) => tag !== t));
                        }}
                        placeholder="tag-name..."
                        inputClassName="w-full px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-medium focus:outline-none"
                        dropdownPosition="top"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Reminder Date Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReminderPicker(!showReminderPicker);
                      setShowColorPicker(false);
                      setShowFolderPicker(false);
                      setShowTagPicker(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                    title="Set Reminder"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  {showReminderPicker && (
                    <div className="absolute left-0 bottom-full mb-2 p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const tom = new Date(Date.now() + 86400000);
                          tom.setHours(9, 0, 0, 0);
                          setReminderDate(tom.toISOString());
                          setShowReminderPicker(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        Tomorrow 9:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextWeek = new Date(Date.now() + 7 * 86400000);
                          nextWeek.setHours(9, 0, 0, 0);
                          setReminderDate(nextWeek.toISOString());
                          setShowReminderPicker(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        Next Week
                      </button>
                      <input
                        type="datetime-local"
                        onChange={(e) => {
                          if (e.target.value) {
                            setReminderDate(new Date(e.target.value).toISOString());
                            setShowReminderPicker(false);
                          }
                        }}
                        className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 text-[11px] bg-stone-50 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Drawing note button */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenDrawingModal((dataUrl) => {
                      setImages((prev) => [
                        ...prev,
                        {
                          id: `draw-${Date.now()}`,
                          name: 'Drawing.png',
                          dataUrl,
                        },
                      ]);
                    });
                  }}
                  className="p-1.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Sketch / Drawing"
                >
                  <Brush className="w-4 h-4" />
                </button>

                {/* Image upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Upload Image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Switch between text and checklist */}
                <button
                  type="button"
                  onClick={() => setType(type === 'text' ? 'checklist' : 'text')}
                  className="p-1.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors text-xs font-bold"
                  title="Switch between text & checklist"
                >
                  {type === 'text' ? <CheckSquare className="w-4 h-4" /> : 'Text'}
                </button>
              </div>

              {/* Close / Save Button */}
              <button
                id="btn-quick-note-close"
                type="button"
                onClick={handleSaveAndClose}
                className="px-4 py-1.5 rounded-xl bg-stone-950 dark:bg-white hover:bg-stone-800 dark:hover:bg-stone-100 text-white dark:text-stone-950 text-xs font-bold shadow-xs transition-colors"
              >
                Close & Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
