import React, { useState, useEffect, useRef } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Sigma,
  Table,
  Minus,
  Calendar,
  GraduationCap,
  HelpCircle,
  Timer,
} from 'lucide-react';
import { SlashCommandItem, filterSlashCommands } from './slashCommands';

const ICON_MAP: Record<string, React.ReactNode> = {
  Heading1: <Heading1 className="w-4 h-4 text-purple-400" />,
  Heading2: <Heading2 className="w-4 h-4 text-purple-400" />,
  Heading3: <Heading3 className="w-4 h-4 text-purple-400" />,
  CheckSquare: <CheckSquare className="w-4 h-4 text-emerald-400" />,
  List: <List className="w-4 h-4 text-blue-400" />,
  ListOrdered: <ListOrdered className="w-4 h-4 text-blue-400" />,
  Quote: <Quote className="w-4 h-4 text-amber-400" />,
  Code: <Code className="w-4 h-4 text-rose-400" />,
  Sigma: <Sigma className="w-4 h-4 text-teal-400" />,
  Table: <Table className="w-4 h-4 text-cyan-400" />,
  Minus: <Minus className="w-4 h-4 text-stone-400" />,
  Calendar: <Calendar className="w-4 h-4 text-amber-400" />,
  GraduationCap: <GraduationCap className="w-4 h-4 text-amber-400" />,
  HelpCircle: <HelpCircle className="w-4 h-4 text-purple-400" />,
  Timer: <Timer className="w-4 h-4 text-red-400" />,
};

interface SlashCommandsMenuProps {
  isOpen: boolean;
  query: string;
  onSelect: (command: SlashCommandItem) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const SlashCommandsMenu: React.FC<SlashCommandsMenuProps> = ({
  isOpen,
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = filterSlashCommands(query);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  const style: React.CSSProperties = position
    ? {
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }
    : {};

  return (
    <div
      ref={containerRef}
      style={style}
      className="z-50 w-72 max-h-80 overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-1.5 text-stone-200 select-none backdrop-blur-md"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-stone-500 border-b border-stone-800 flex items-center justify-between">
        <span>Insert Block</span>
        <span>{filtered.length} commands</span>
      </div>

      <div className="pt-1 space-y-0.5">
        {filtered.map((cmd, idx) => (
          <button
            key={cmd.id}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-purple-600/30 text-white border border-purple-500/30'
                : 'text-stone-300 hover:bg-stone-800 border border-transparent'
            }`}
          >
            <div className="p-1 rounded bg-stone-850 border border-stone-700/60 flex items-center justify-center shrink-0">
              {ICON_MAP[cmd.iconName] || <List className="w-4 h-4 text-purple-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{cmd.title}</div>
              <div className="text-[10px] text-stone-400 truncate">{cmd.description}</div>
            </div>
            <span className="text-[9px] font-mono text-stone-500 shrink-0">
              {cmd.id}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
