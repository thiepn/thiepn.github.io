import React, { useEffect } from 'react';
import { Keyboard, X, Sparkles, Command, FileText, Search, Layout, Palette } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups: ShortcutGroup[] = [
    {
      title: 'Global Navigation & Fast Actions',
      icon: <Search className="w-4 h-4 text-sky-500" />,
      shortcuts: [
        { keys: ['/'], description: 'Focus and select search bar from anywhere' },
        { keys: ['J', 'or', '↓'], description: 'Navigate to next note in feed' },
        { keys: ['K', 'or', '↑'], description: 'Navigate to previous note in feed' },
        { keys: ['Enter'], description: 'Open currently focused note' },
        { keys: ['X'], description: 'Toggle selection of focused note' },
        { keys: ['Shift', 'Click'], description: 'Select a contiguous range of notes' },
        { keys: ['*'], description: 'Select / Deselect all visible notes' },
        { keys: ['P'], description: 'Pin / Unpin selected or focused note' },
        { keys: ['S', 'or', 'F'], description: 'Favorite / Star selected or focused note' },
        { keys: ['D'], description: 'Duplicate selected or focused note' },
        { keys: ['E', 'or', 'A'], description: 'Archive / Unarchive selected or focused note' },
        { keys: ['Delete', 'or', '#'], description: 'Move selected or focused note to trash' },
        { keys: ['C'], description: 'Quick capture fleeting note' },
        { keys: ['N'], description: 'Create new blank note' },
        { keys: ['Esc'], description: 'Clear search / deselect notes / close dialogs' },
      ],
    },
    {
      title: 'Note Editor & Markdown Formatting',
      icon: <FileText className="w-4 h-4 text-amber-500" />,
      shortcuts: [
        { keys: [modKey, 'B'], description: 'Format bold text (**bold**)' },
        { keys: [modKey, 'I'], description: 'Format italic text (*italic*)' },
        { keys: [modKey, 'K'], description: 'Insert WikiLink or web hyperlink' },
        { keys: [modKey, 'Shift', 'X'], description: 'Format strikethrough (~~strike~~)' },
        { keys: [modKey, 'E'], description: 'Insert code snippet or block (`code`)' },
        { keys: ['[['], description: 'Trigger bidirectional WikiLink search dropdown' },
        { keys: ['/'], description: 'Open Slash Commands Palette in note editor (QoL 2)' },
        { keys: ['Enter'], description: 'Auto-create next checklist task (checklist mode)' },
        { keys: ['Backspace'], description: 'Delete empty checklist item & focus previous' },
        { keys: [modKey, 'Enter'], description: 'Save changes and close note editor' },
      ],
    },
    {
      title: 'Universal Switcher & Palettes',
      icon: <Command className="w-4 h-4 text-indigo-500" />,
      shortcuts: [
        { keys: [modKey, 'K'], description: 'Universal Command Palette & Quick Switcher' },
        { keys: [modKey, 'O'], description: 'Quick Switcher · Instant Note Jump (QoL 9)' },
        { keys: ['Alt', 'Left'], description: 'History · Navigate Back to previous note (QoL 4)' },
        { keys: ['Alt', 'Right'], description: 'History · Navigate Forward to next note (QoL 4)' },
        { keys: ['Alt', 'T'], description: 'Toggle Centered Typewriter Mode (QoL 10)' },
        { keys: [modKey, 'P'], description: 'Command Palette quick access' },
        { keys: [modKey, 'Shift', 'F'], description: 'Open Vault Search & Query Explorer surface' },
        { keys: [modKey, 'Shift', 'T'], description: 'Open Note Templates Library & Creator' },
        { keys: [modKey, 'Alt', 'T'], description: 'Open Vault Task Center (Global Action Items & Agenda)' },
        { keys: [modKey, 'Alt', 'M'], description: 'Open Note Compare & Merge Studio (Visual Diff & Consolidation)' },
        { keys: [modKey, 'Alt', 'Z'], description: 'Show / toggle Zen Focus Bar (Mini-Player Mode)' },
        { keys: ['Alt', 'T'], description: 'Quick cycle favorite themes in Theme Palette' },
        { keys: ['Alt', 'Shift', 'T'], description: 'Open Theme Studio & Color Customizer' },
        { keys: ['Alt', 'D'], description: "Jump directly to Today's Daily Note" },
        { keys: ['Alt', 'R'], description: 'Open random note (Serendipity quick pick)' },
        { keys: ['Alt', 'Shift', 'R'], description: 'Open Serendipity Oracle & Discovery Studio' },
        { keys: ['Alt', 'W'], description: 'Open Writing Sprint Arena & Flow Mode' },
        { keys: ['Alt', 'Shift', 'W'], description: 'Writing Sprint Studio & Pacing Arena' },
        { keys: ['Alt', 'I'], description: 'Open Mind Sparks · Idea Combinator Studio (Feature 8)' },
        { keys: ['Alt', 'M'], description: 'Open Thought Matrix · 2×2 Decision & Priority Studio (Feature 9)' },
        { keys: ['Alt', 'C'], description: 'Open Cornell Notes · Structured Study & Active Recall Studio (Feature 10)' },
        { keys: ['Alt', 'P'], description: 'Open Pomodoro Deep Work Flow & Interstitial Journaling Hub (P1)' },
        { keys: ['Alt', 'Z'], description: 'Open Zettelkasten Slip-Box & Concept Extraction Studio (P2)' },
        { keys: ['Alt', 'K'], description: 'Open Chrono Capsule & Incremental Reading Studio (P3)' },
        { keys: ['Alt', 'X'], description: 'Open Multi-Note Comparison & Synthesis Matrix (P4)' },
        { keys: ['Alt', 'V'], description: 'Open Voice Memo Transcriber & Audio Studio (P5)' },
        { keys: ['Alt', 'B'], description: 'Open Visual Mind Map & Concept Outline Studio (P6)' },
        { keys: ['Alt', 'Y'], description: 'Open Hotkey Super-Palette & Macro Automation Engine (P7)' },
        { keys: ['Alt', 'H'], description: 'Open Vault Statistics & 52-Week Writing Activity Heatmap' },
        { keys: ['Alt', 'F'], description: 'Open Flashcard Generation & Active Recall Studio (P8)' },
        { keys: ['Alt', 'G'], description: 'Open Markdown Presentation & Slide Deck Studio (P9)' },
        { keys: ['Alt', 'Q'], description: 'Open Reactive Computational Sandbox & Formula Matrix (P10)' },
        { keys: ['Alt', 'Shift', 'G'], description: 'Open Knowledge Quests & Gamification Hub' },
        { keys: ['Alt', 'Shift', 'H'], description: 'Open Vault Health & Link Integrity Doctor' },
        { keys: ['Alt', 'Shift', 'E'], description: 'Open Complete Standalone Vault Archive Exporter' },
        { keys: ['?'], description: 'Open this keyboard shortcuts cheat-sheet' },
      ],
    },
    {
      title: 'View Modes & Workspace Layout',
      icon: <Layout className="w-4 h-4 text-emerald-500" />,
      shortcuts: [
        { keys: [modKey, '1'], description: 'Switch to Masonry Grid View' },
        { keys: [modKey, '2'], description: 'Switch to Compact List View' },
        { keys: [modKey, '3'], description: 'Switch to Stacked View' },
        { keys: [modKey, '4'], description: 'Switch to Calendar View' },
        { keys: [modKey, '5'], description: 'Switch to Knowledge Graph View' },
        { keys: [modKey, '6'], description: 'Switch to Interactive Kanban Board View' },
        { keys: [modKey, 'Shift', 'T'], description: 'Reopen Recently Closed Tab (QoL 1)' },
        { keys: [modKey, 'W'], description: 'Close Active Workspace Tab (QoL 1)' },
        { keys: [modKey, 'Tab'], description: 'Cycle Next Workspace Tab (QoL 1)' },
        { keys: ['/'], description: 'Trigger Interactive Slash Command Menu (QoL 2)' },
        { keys: ['#'], description: 'Trigger Inline Tag Autocomplete (QoL 7)' },
        { keys: [modKey, 'Shift', 'L'], description: 'Toggle Light / Dark theme mode' },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 max-h-[85vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-stone-950 dark:text-white text-base">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Speed up note taking and navigation across all views
              </p>
            </div>
          </div>

          <button
            id="btn-close-shortcuts-modal"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.title}
              className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                {group.icon}
                <span>{group.title}</span>
              </div>

              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-1 rounded-md hover:bg-stone-100/70 dark:hover:bg-stone-700/50 transition-colors"
                  >
                    <span className="text-stone-700 dark:text-stone-300 font-medium">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {shortcut.keys.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-0.5 min-w-[22px] text-center text-[11px] font-mono font-semibold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded shadow-2xs">
                            {key}
                          </kbd>
                          {kIdx < shortcut.keys.length - 1 && (
                            <span className="text-stone-400 text-[10px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center border-t border-stone-100 dark:border-stone-800">
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">Esc</kbd> anytime to close dialogs.
          </p>
        </div>
      </div>
    </div>
  );
};
