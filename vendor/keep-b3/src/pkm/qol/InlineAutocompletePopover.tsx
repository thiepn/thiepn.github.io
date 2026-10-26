import React, { useState, useEffect, useRef } from 'react';
import { FileText, Tag } from 'lucide-react';
import { Note } from '../../types';

export interface AutocompleteItem {
  id: string;
  label: string;
  type: 'note' | 'tag';
  subtitle?: string;
}

interface InlineAutocompletePopoverProps {
  isOpen: boolean;
  type: 'wikilink' | 'tag';
  query: string;
  notes: Note[];
  allTags: string[];
  position: { top: number; left: number };
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
}

export const InlineAutocompletePopover: React.FC<InlineAutocompletePopoverProps> = ({
  isOpen,
  type,
  query,
  notes,
  allTags,
  position,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().trim();

  // Prepare items
  const items: AutocompleteItem[] = React.useMemo(() => {
    if (type === 'wikilink') {
      return notes
        .filter(n => !n.trashed && n.title.toLowerCase().includes(cleanQuery))
        .slice(0, 10)
        .map(n => ({
          id: n.id,
          label: n.title,
          type: 'note',
          subtitle: `${n.content?.slice(0, 50).trim() || 'Empty'}...`,
        }));
    } else {
      return allTags
        .filter(t => t.toLowerCase().includes(cleanQuery))
        .slice(0, 10)
        .map(t => ({
          id: t,
          label: `#${t}`,
          type: 'tag',
          subtitle: 'Vault Tag',
        }));
    }
  }, [type, cleanQuery, notes, allTags]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + items.length) % Math.max(1, items.length));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items.length > 0 && items[selectedIndex]) {
          e.preventDefault();
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, items, selectedIndex, onSelect, onClose]);

  // Outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: `${Math.max(10, position.top)}px`,
        left: `${Math.max(10, position.left)}px`,
      }}
      className="z-50 w-64 max-h-60 overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-1 text-stone-200 select-none backdrop-blur-md"
    >
      <div className="px-2 py-1 text-[10px] font-mono uppercase text-stone-500 border-b border-stone-800 flex items-center justify-between">
        <span>{type === 'wikilink' ? 'Link Note' : 'Tag'}</span>
        <span>{items.length} results</span>
      </div>

      <div className="pt-1 space-y-0.5">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-purple-600/30 text-white border border-purple-500/30'
                : 'text-stone-300 hover:bg-stone-800 border border-transparent'
            }`}
          >
            {item.type === 'note' ? (
              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            ) : (
              <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{item.label}</div>
              {item.subtitle && (
                <div className="text-[10px] text-stone-500 truncate">{item.subtitle}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
