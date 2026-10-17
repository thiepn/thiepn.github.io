import React, { useEffect, useRef, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Info,
  Lightbulb,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Table,
  Code,
  Sigma,
  Workflow,
  Search,
  Link2,
  ExternalLink,
  Anchor,
  Calendar,
  Clock,
  CalendarClock,
  Sparkles,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { SlashCommand, filterSlashCommands } from './slashCommands';

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number };
  onSelectCommand: (command: SlashCommand) => void;
  onClose: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  position,
  onSelectCommand,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = React.useMemo(() => {
    return filterSlashCommands(query);
  }, [query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelectCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelectCommand, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const activeEl = menuRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const renderIcon = (iconName: string) => {
    const iconClass = 'w-4 h-4 shrink-0';
    switch (iconName) {
      case 'Heading1':
        return <Heading1 className={iconClass} />;
      case 'Heading2':
        return <Heading2 className={iconClass} />;
      case 'Heading3':
        return <Heading3 className={iconClass} />;
      case 'Heading4':
        return <Heading4 className={iconClass} />;
      case 'List':
        return <List className={iconClass} />;
      case 'ListOrdered':
        return <ListOrdered className={iconClass} />;
      case 'CheckSquare':
        return <CheckSquare className={iconClass} />;
      case 'Quote':
        return <Quote className={iconClass} />;
      case 'Minus':
        return <Minus className={iconClass} />;
      case 'Info':
        return <Info className={`${iconClass} text-blue-500`} />;
      case 'Lightbulb':
        return <Lightbulb className={`${iconClass} text-emerald-500`} />;
      case 'AlertOctagon':
        return <AlertOctagon className={`${iconClass} text-indigo-500`} />;
      case 'AlertTriangle':
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      case 'ShieldAlert':
        return <ShieldAlert className={`${iconClass} text-red-500`} />;
      case 'CheckCircle2':
        return <CheckCircle2 className={`${iconClass} text-teal-500`} />;
      case 'Table':
        return <Table className={iconClass} />;
      case 'Code':
        return <Code className={iconClass} />;
      case 'Sigma':
        return <Sigma className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case 'Workflow':
        return <Workflow className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      case 'Search':
        return <Search className={iconClass} />;
      case 'Link2':
        return <Link2 className={iconClass} />;
      case 'ExternalLink':
        return <ExternalLink className={iconClass} />;
      case 'Anchor':
        return <Anchor className={iconClass} />;
      case 'Calendar':
        return <Calendar className={iconClass} />;
      case 'Clock':
        return <Clock className={iconClass} />;
      case 'CalendarClock':
        return <CalendarClock className={iconClass} />;
      case 'ImageIcon':
        return <ImageIcon className={`${iconClass} text-amber-500`} />;
      case 'Camera':
        return <Camera className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        style={{
          top: Math.min(position.top, window.innerHeight - 100),
          left: Math.min(position.left, window.innerWidth - 280),
        }}
        className="fixed z-50 w-64 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl text-xs text-stone-500 text-center select-none"
      >
        No matching commands
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Slash commands"
      style={{
        top: Math.min(position.top, Math.max(10, window.innerHeight - 340)),
        left: Math.min(position.left, Math.max(10, window.innerWidth - 300)),
      }}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl p-1.5 text-xs text-stone-800 dark:text-stone-200 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500 flex items-center justify-between border-b border-stone-100 dark:border-stone-800 mb-1 pb-1">
        <span>Insert block or element</span>
        <span className="font-mono lowercase text-[9px]">/{query}</span>
      </div>

      <div className="space-y-0.5">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              type="button"
              data-index={idx}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectCommand(cmd);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-amber-100/80 dark:bg-amber-950/60 text-stone-950 dark:text-white font-medium'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  isSelected
                    ? 'bg-amber-200/80 dark:bg-amber-900/80'
                    : 'bg-stone-100 dark:bg-stone-800'
                }`}
              >
                {renderIcon(cmd.icon)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{cmd.title}</span>
                  {cmd.hotkeyHint && (
                    <span className="text-[10px] font-mono text-stone-400">
                      {cmd.hotkeyHint}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  {cmd.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
