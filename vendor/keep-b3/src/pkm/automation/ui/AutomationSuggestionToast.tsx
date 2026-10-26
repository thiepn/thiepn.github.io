/**
 * Phase P36: Automation Suggestion Toast
 * Non-intrusive interactive prompt for confirmation-required automation rules.
 */

import React from 'react';
import { Sparkles, Check, X, ArrowRight } from 'lucide-react';
import { AutomationSuggestion } from '../automationTypes';
import { automationEngine } from '../automationEngine';

interface AutomationSuggestionToastProps {
  suggestions: AutomationSuggestion[];
}

export const AutomationSuggestionToast: React.FC<AutomationSuggestionToastProps> = ({
  suggestions,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  const activeSuggestion = suggestions[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="p-4 rounded-2xl bg-stone-900 dark:bg-stone-800 text-white shadow-2xl border border-stone-700/80 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 fill-stone-950" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Automation Suggestion
              </span>
              <h4 className="text-xs font-bold leading-tight">{activeSuggestion.title}</h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => automationEngine.dismissSuggestion(activeSuggestion.id)}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors"
            title="Dismiss suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">{activeSuggestion.description}</p>

        {activeSuggestion.noteTitle && (
          <div className="text-[11px] text-stone-400 font-mono bg-stone-950/60 px-2.5 py-1 rounded-lg">
            Target: {activeSuggestion.noteTitle}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => automationEngine.dismissSuggestion(activeSuggestion.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => automationEngine.applySuggestion(activeSuggestion.id)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Apply Automation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
