import React from 'react';
import { AlignLeft, Clock, Check, RefreshCw, Compass } from 'lucide-react';

interface EditorStatusBarProps {
  content: string;
  isSaving?: boolean;
  typewriterActive?: boolean;
  onToggleTypewriter?: () => void;
  onToggleOutline?: () => void;
  isOutlineOpen?: boolean;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  content,
  isSaving = false,
  typewriterActive = false,
  onToggleTypewriter,
  onToggleOutline,
  isOutlineOpen = false,
}) => {
  const text = content || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 220));

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-stone-950/80 border-t border-stone-800/80 text-[11px] font-mono text-stone-400 select-none">
      {/* Metrics */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          <strong className="text-stone-300 font-bold">{words.toLocaleString()}</strong> words
        </span>
        <span className="text-stone-600">·</span>
        <span className="tabular-nums">
          <strong className="text-stone-300 font-bold">{characters.toLocaleString()}</strong> chars
        </span>
        <span className="text-stone-600">·</span>
        <span className="flex items-center gap-1 text-stone-400">
          <Clock className="w-3 h-3 text-stone-500" />
          <span>{readingTimeMin} min read</span>
        </span>
      </div>

      {/* Save Status & View Controls */}
      <div className="flex items-center gap-3">
        {/* Save pulse */}
        <div className="flex items-center gap-1.5 text-stone-400">
          {isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              <span className="text-amber-400 text-[10px]">Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px]">Saved</span>
            </>
          )}
        </div>

        {/* Typewriter Mode Button */}
        {onToggleTypewriter && (
          <button
            onClick={onToggleTypewriter}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              typewriterActive
                ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Toggle Centered Typewriter Mode (Alt+T)"
          >
            Typewriter
          </button>
        )}

        {/* Outline Drawer Toggle */}
        {onToggleOutline && (
          <button
            onClick={onToggleOutline}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isOutlineOpen
                ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Toggle Outline Drawer"
          >
            <AlignLeft className="w-3 h-3" />
            <span>Outline</span>
          </button>
        )}
      </div>
    </div>
  );
};
