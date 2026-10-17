import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Users,
  Boxes,
  Volume2,
  Calendar,
  FileText,
  Copy,
  X,
  Code,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  MacroDefinition,
  MacroStep,
  MacroActionType,
  MacroExecutionContext,
  DEFAULT_MACROS,
  MACRO_STORAGE_KEY,
  executeMacro,
} from '../../pkm/macros/macroTypes';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

export interface MacroAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  executionContext: MacroExecutionContext;
}

export const MacroAutomationModal: React.FC<MacroAutomationModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  executionContext,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'launcher' | 'builder'>('launcher');

  // Macros state
  const [macros, setMacros] = useState<MacroDefinition[]>(() => {
    try {
      const raw = localStorage.getItem(MACRO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_MACROS;
  });

  // Selected macro for editing or inspection
  const [selectedMacroId, setSelectedMacroId] = useState<string>(DEFAULT_MACROS[0].id);

  // Live execution runner state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeRunningStep, setActiveRunningStep] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  // Macro Composer State (for Builder tab)
  const [editingMacro, setEditingMacro] = useState<MacroDefinition | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macros));
    } catch {}
  }, [macros]);

  const selectedMacro = macros.find((m) => m.id === selectedMacroId) || macros[0];

  // Run Macro Handler
  const handleRunMacro = async (macro: MacroDefinition) => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionLogs([`Starting macro: "${macro.name}" (${macro.steps.length} steps)...`]);

    const result = await executeMacro(macro, {
      ...executionContext,
      playSound: () => {
        soundscapeService.playCompletionChime();
      },
      fireConfetti: () => {
        fireConfetti();
      },
    });

    setIsRunning(false);
    setExecutionLogs(result.logs);
    setLastDuration(result.durationMs);

    if (result.success) {
      soundscapeService.playCompletionChime();
    }
  };

  // Add Step to currently edited macro
  const handleAddStep = (action: MacroActionType) => {
    if (!editingMacro) return;

    let defaultParams: Record<string, any> = {};
    if (action === 'create_note') {
      defaultParams = { title: 'New Macro Note', content: '# New Note\n\n- ', tags: ['macro'] };
    } else if (action === 'append_daily') {
      defaultParams = { content: '\n- [ ] New item from macro' };
    } else if (action === 'open_modal') {
      defaultParams = { modalName: 'pomodoro_flow' };
    } else if (action === 'copy_text') {
      defaultParams = { text: 'Automated Snippet' };
    }

    const newStep: MacroStep = {
      id: `step-${Date.now()}`,
      action,
      params: defaultParams,
    };

    setEditingMacro({
      ...editingMacro,
      steps: [...editingMacro.steps, newStep],
    });
  };

  // Remove step
  const handleRemoveStep = (stepId: string) => {
    if (!editingMacro) return;
    setEditingMacro({
      ...editingMacro,
      steps: editingMacro.steps.filter((s) => s.id !== stepId),
    });
  };

  // Move step up/down
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!editingMacro) return;
    const newSteps = [...editingMacro.steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;

    setEditingMacro({
      ...editingMacro,
      steps: newSteps,
    });
  };

  // Save edited macro
  const handleSaveEditedMacro = () => {
    if (!editingMacro) return;
    setMacros((prev) =>
      prev.map((m) => (m.id === editingMacro.id ? editingMacro : m))
    );
    setActiveTab('launcher');
    fireConfetti();
  };

  // Create brand new macro
  const handleCreateNewMacro = () => {
    const fresh: MacroDefinition = {
      id: `macro-${Date.now()}`,
      name: 'Custom Macro Pipeline',
      description: 'Chained multi-action workflow',
      icon: 'Zap',
      shortcut: 'Alt+Shift+M',
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: `step-${Date.now()}`,
          action: 'play_sound',
          params: {},
        },
      ],
    };
    setMacros((prev) => [fresh, ...prev]);
    setSelectedMacroId(fresh.id);
    setEditingMacro(fresh);
    setActiveTab('builder');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hotkey Super-Palette & Macro Automation Engine (P7)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Hotkey Super-Palette & Macro Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Tool P7
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Compose, automate & trigger multi-step productivity pipelines with one keypress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('launcher')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'launcher'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Macro Runner</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingMacro(selectedMacro);
                  setActiveTab('builder');
                }}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'builder'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Pipeline Builder</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Macro Runner / Quick Launcher */}
        {activeTab === 'launcher' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            {/* Left: Macro List */}
            <div className="w-full md:w-80 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4 space-y-3 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Configured Macros ({macros.length})
                </span>
                <button
                  type="button"
                  onClick={handleCreateNewMacro}
                  className="p-1 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
                  title="Create new macro"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {macros.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMacroId(m.id)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedMacroId === m.id
                        ? 'bg-white dark:bg-stone-900 border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-white/80 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {m.name}
                      </h4>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {m.steps.length} sequential steps
                      </p>
                    </div>

                    {m.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[10px] text-stone-600 dark:text-stone-400 shrink-0">
                        {m.shortcut}
                      </kbd>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Selected Macro Detail & Live Runner */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {selectedMacro && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                          {selectedMacro.name}
                        </h3>
                        {selectedMacro.shortcut && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            {selectedMacro.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{selectedMacro.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMacro(selectedMacro);
                          setActiveTab('builder');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors"
                      >
                        Edit Steps
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunMacro(selectedMacro)}
                        disabled={isRunning}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{isRunning ? 'Running Macro...' : 'Execute Macro'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Pipeline Steps Visualizer */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Pipeline Execution Sequence ({selectedMacro.steps.length} Steps)
                    </label>

                    <div className="space-y-2">
                      {selectedMacro.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-bold text-stone-900 dark:text-stone-100 capitalize">
                                {step.action.replace('_', ' ')}
                              </span>
                              <div className="text-[11px] text-stone-500 font-mono truncate max-w-sm">
                                {JSON.stringify(step.params)}
                              </div>
                            </div>
                          </div>

                          <CheckCircle2 className="w-4 h-4 text-emerald-500/70 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Execution Logs Terminal */}
                  {executionLogs.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          Live Execution Output
                        </label>
                        {lastDuration !== null && (
                          <span className="text-[10px] font-mono text-emerald-500 font-bold">
                            Completed in {lastDuration}ms
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-stone-950 text-stone-300 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto border border-stone-800">
                        {executionLogs.map((log, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-2">
                            <span className="text-amber-500">➜</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Visual Pipeline Builder */}
        {activeTab === 'builder' && editingMacro && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Macro Pipeline Builder
                </h3>
                <p className="text-xs text-stone-500">Configure sequential triggers and actions</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('launcher')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedMacro}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-xs"
                >
                  Save Macro
                </button>
              </div>
            </div>

            {/* Macro Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Macro Name
                </label>
                <input
                  type="text"
                  value={editingMacro.name}
                  onChange={(e) => setEditingMacro({ ...editingMacro, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Hotkey Shortcut
                </label>
                <input
                  type="text"
                  value={editingMacro.shortcut || ''}
                  onChange={(e) => setEditingMacro({ ...editingMacro, shortcut: e.target.value })}
                  placeholder="e.g. Alt+5"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Steps Sequence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Sequential Steps ({editingMacro.steps.length})
                </label>
              </div>

              <div className="space-y-2">
                {editingMacro.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-stone-900 dark:text-stone-100 capitalize">
                          {step.action.replace('_', ' ')}
                        </span>
                        <div className="text-[11px] text-stone-500 font-mono truncate max-w-md">
                          {JSON.stringify(step.params)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === editingMacro.steps.length - 1}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Step Picker Bar */}
              <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block">
                  Add Next Step to Pipeline:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddStep('create_note')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200"
                  >
                    📝 Create Note
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStep('append_daily')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200"
                  >
                    📅 Append Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStep('open_modal')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200"
                  >
                    🪟 Open Tool
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStep('play_sound')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200"
                  >
                    🔊 Play Chime
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStep('fire_confetti')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200"
                  >
                    🎉 Confetti Burst
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + Y</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
