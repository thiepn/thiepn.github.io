import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Inbox,
  Calendar,
  FileText,
  Lock,
  CornerDownLeft,
  Tag,
  Check,
} from 'lucide-react';
import { Note } from '../../../types';

export type QuickCaptureDestination = 'inbox' | 'daily' | 'new_note';

interface DesktopQuickCaptureWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCapture: (content: string, destination: QuickCaptureDestination, title?: string) => Promise<void>;
  isVaultLocked?: boolean;
  onUnlockVault?: () => void;
}

export const DesktopQuickCaptureWindow: React.FC<DesktopQuickCaptureWindowProps> = ({
  isOpen,
  onClose,
  onSaveCapture,
  isVaultLocked = false,
  onUnlockVault,
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<QuickCaptureDestination>('inbox');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setTitle('');
      setSaving(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!content.trim() || saving) return;
    if (isVaultLocked) {
      if (onUnlockVault) onUnlockVault();
      return;
    }

    setSaving(true);
    try {
      await onSaveCapture(content.trim(), destination, title.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to save Quick Capture:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Global Quick Capture
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {isVaultLocked ? (
            <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Encrypted Vault is Locked
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs">
                To protect end-to-end encryption keys, please unlock your vault before capturing notes.
              </p>
              {onUnlockVault && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUnlockVault();
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Unlock Vault
                </button>
              )}
            </div>
          ) : (
            <>
              {destination === 'new_note' && (
                <input
                  type="text"
                  placeholder="Note Title (optional)..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}

              <textarea
                ref={textareaRef}
                rows={5}
                placeholder="Type your thought, markdown note, task list, or idea... (Markdown supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />

              {/* Destination Selector */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDestination('inbox')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      destination === 'inbox'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <Inbox className="w-3 h-3" />
                    Inbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination('daily')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      destination === 'daily'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Today's Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination('new_note')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      destination === 'new_note'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    New Note
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 hidden sm:inline">
                    ⌘+Enter to save
                  </span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!content.trim() || saving}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Capture'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
