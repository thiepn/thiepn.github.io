import React, { useState } from 'react';
import { Settings, Calendar, X, Check, Clock, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { temporalService } from '../temporalService';
import { TemporalSettings, TemporalRole } from '../temporalTypes';

export interface TemporalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemporalSettingsModal: React.FC<TemporalSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const current = temporalService.getSettings();
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1>(current.firstDayOfWeek);
  const [defaultView, setDefaultView] = useState(current.defaultView);
  const [agendaHorizonDays, setAgendaHorizonDays] = useState(current.agendaHorizonDays);
  const [showCompletedInAgenda, setShowCompletedInAgenda] = useState(current.showCompletedInAgenda);
  const [autoAddCompletionDate, setAutoAddCompletionDate] = useState(current.autoAddCompletionDate);
  const [propertyRoles, setPropertyRoles] = useState<Record<string, TemporalRole>>({
    ...current.recognizedPropertyRoles,
  });

  const [newPropKey, setNewPropKey] = useState('');
  const [newPropRole, setNewPropRole] = useState<TemporalRole>('due');

  const handleSave = () => {
    temporalService.saveSettings({
      firstDayOfWeek,
      defaultView,
      agendaHorizonDays,
      showCompletedInAgenda,
      autoAddCompletionDate,
      recognizedPropertyRoles: propertyRoles,
    });
    onClose();
  };

  const handleAddPropMapping = () => {
    if (!newPropKey.trim()) return;
    const cleanKey = newPropKey.trim().toLowerCase();
    setPropertyRoles((prev) => ({
      ...prev,
      [cleanKey]: newPropRole,
    }));
    setNewPropKey('');
  };

  const handleRemovePropMapping = (key: string) => {
    setPropertyRoles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="temporal-settings-title"
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60">
          <div className="flex items-center gap-2.5 font-semibold text-stone-900 dark:text-stone-100 text-sm">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span id="temporal-settings-title">Temporal & Calendar Preferences</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:text-stone-300"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* General Calendar Settings */}
          <div className="space-y-3">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
              Display & Week Calculation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                  First Day of Week
                </label>
                <select
                  value={firstDayOfWeek}
                  onChange={(e) => setFirstDayOfWeek(Number(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>Monday (ISO Standard)</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                  Agenda Horizon
                </label>
                <select
                  value={agendaHorizonDays}
                  onChange={(e) => setAgendaHorizonDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days (Default)</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task Completion Options */}
          <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
              Task Workflow & Markdown Tokens
            </h4>

            <label className="flex items-center gap-2 cursor-pointer text-stone-800 dark:text-stone-200">
              <input
                type="checkbox"
                checked={autoAddCompletionDate}
                onChange={(e) => setAutoAddCompletionDate(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Automatically append completion date token (<code className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">✅ YYYY-MM-DD</code>) upon checking off tasks</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-stone-800 dark:text-stone-200">
              <input
                type="checkbox"
                checked={showCompletedInAgenda}
                onChange={(e) => setShowCompletedInAgenda(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Show completed tasks in agenda view by default</span>
            </label>
          </div>

          {/* YAML / Frontmatter Property Mapping */}
          <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
                Recognized Note Date Properties
              </h4>
              <span className="text-[10px] text-stone-400">Maps YAML frontmatter keys to roles</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {Object.entries(propertyRoles).map(([key, role]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-amber-700 dark:text-amber-300 font-semibold">{key}</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-stone-700 dark:text-stone-300 text-[11px] capitalize">{role}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePropMapping(key)}
                    className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title={`Remove mapping for ${key}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new mapping */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newPropKey}
                onChange={(e) => setNewPropKey(e.target.value)}
                placeholder="Property name (e.g. milestone)"
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
              />
              <select
                value={newPropRole}
                onChange={(e) => setNewPropRole(e.target.value as TemporalRole)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
              >
                <option value="due">Due</option>
                <option value="scheduled">Scheduled</option>
                <option value="start">Start</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
              </select>
              <button
                type="button"
                onClick={handleAddPropMapping}
                className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
