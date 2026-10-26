import React, { useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  CheckSquare,
  Quote,
} from 'lucide-react';

export interface FloatingFormatToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onApplyFormat: (formatType: 'bold' | 'italic' | 'strike' | 'code' | 'highlight' | 'wikilink' | 'link' | 'todo' | 'quote') => void;
  onClose: () => void;
}

export const FloatingFormatToolbar: React.FC<FloatingFormatToolbarProps> = ({
  isOpen,
  position,
  onApplyFormat,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: `${Math.max(10, position.top)}px`,
        left: `${Math.max(10, position.left)}px`,
      }}
      className="z-50 flex items-center gap-0.5 p-1 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl backdrop-blur-md text-stone-200 select-none animate-fade-in"
    >
      <button
        onClick={() => onApplyFormat('bold')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => onApplyFormat('italic')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => onApplyFormat('strike')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-stone-800 mx-0.5" />

      <button
        onClick={() => onApplyFormat('code')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
        title="Inline Code"
      >
        <Code className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => onApplyFormat('highlight')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-amber-400 hover:text-amber-300 transition-colors"
        title="Highlight"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-stone-800 mx-0.5" />

      <button
        onClick={() => onApplyFormat('wikilink')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-purple-400 hover:text-purple-300 transition-colors font-mono text-xs font-bold px-2"
        title="Wrap in Wiki-Link [[...]]"
      >
        [[ ]]
      </button>

      <button
        onClick={() => onApplyFormat('link')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-blue-400 hover:text-blue-300 transition-colors"
        title="Insert Markdown Link"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-stone-800 mx-0.5" />

      <button
        onClick={() => onApplyFormat('todo')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-emerald-400 hover:text-emerald-300 transition-colors"
        title="Convert to Task Checkbox"
      >
        <CheckSquare className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => onApplyFormat('quote')}
        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
        title="Convert to Blockquote"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
