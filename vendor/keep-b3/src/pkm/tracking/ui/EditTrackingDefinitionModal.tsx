import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Target,
  Repeat,
  Sparkles,
  CheckSquare,
  Activity,
  Layers,
} from 'lucide-react';
import {
  TrackingDefinition,
  RoutineDefinition,
  CheckInDefinition,
  RoutineItem,
  CheckInField,
  TrackingValueType,
  Daypart,
} from '../trackingTypes';
import { trackingService } from '../trackingService';

export type DefinitionKind = 'habit' | 'metric' | 'routine' | 'checkin';

interface EditTrackingDefinitionModalProps {
  isOpen: boolean;
  kind: DefinitionKind;
  initialDefinition?: TrackingDefinition | RoutineDefinition | CheckInDefinition | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditTrackingDefinitionModal: React.FC<EditTrackingDefinitionModalProps> = ({
  isOpen,
  kind,
  initialDefinition,
  onClose,
  onSaved,
}) => {
  // Habit / Metric States
  const [name, setName] = useState<string>(initialDefinition?.name || '');
  const [description, setDescription] = useState<string>(initialDefinition?.description || '');
  const [trackingType, setTrackingType] = useState<TrackingValueType>(
    (initialDefinition as TrackingDefinition)?.trackingType || 'completion'
  );
  const [scheduleType, setScheduleType] = useState<string>(
    initialDefinition?.schedule?.type || (kind === 'metric' ? 'none' : 'daily')
  );
  const [interval, setInterval] = useState<number>(initialDefinition?.schedule?.interval || 1);
  const [daypart, setDaypart] = useState<Daypart>(
    (initialDefinition as any)?.daypart || 'anytime'
  );
  const [targetVal, setTargetVal] = useState<string>(
    (initialDefinition as TrackingDefinition)?.target?.value?.toString() || ''
  );
  const [targetOp, setTargetOp] = useState<'gte' | 'lte' | 'eq'>(
    (initialDefinition as TrackingDefinition)?.target?.operator || 'gte'
  );
  const [unit, setUnit] = useState<string>((initialDefinition as TrackingDefinition)?.unit || '');
  const [ratingScale, setRatingScale] = useState<'1-5' | '1-10'>(
    (initialDefinition as TrackingDefinition)?.ratingScale || '1-5'
  );

  // Routine Items State
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>(
    (initialDefinition as RoutineDefinition)?.items || [
      { id: 'item-1', type: 'checklist', label: 'First Step', order: 1 },
    ]
  );

  // CheckIn Fields State
  const [checkInFields, setCheckInFields] = useState<CheckInField[]>(
    (initialDefinition as CheckInDefinition)?.fields || [
      {
        id: 'f-1',
        label: 'Daily Rating',
        type: 'rating',
        ratingScale: '1-5',
        required: true,
        order: 1,
      },
      {
        id: 'f-2',
        label: 'Reflection Note',
        type: 'text',
        placeholder: 'What went well today?',
        required: false,
        order: 2,
      },
    ]
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    const baseId =
      initialDefinition?.id ||
      `${kind}-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const resolvedSchedule =
      scheduleType === 'none'
        ? undefined
        : {
            type: scheduleType as any,
            interval: interval || 1,
            rawText: scheduleType,
          };

    if (kind === 'habit' || kind === 'metric') {
      const def: TrackingDefinition = {
        id: baseId,
        name: name.trim(),
        description: description.trim() || undefined,
        type: kind,
        trackingType,
        schedule: resolvedSchedule,
        daypart,
        target: targetVal
          ? {
              value: parseFloat(targetVal) || 0,
              operator: targetOp,
              unit: unit.trim() || undefined,
            }
          : undefined,
        unit: unit.trim() || undefined,
        ratingScale,
        status: (initialDefinition as any)?.status || 'active',
        includeInWeeklyReview: true,
        createdAt: (initialDefinition as any)?.createdAt || now,
        updatedAt: now,
      };
      trackingService.saveDefinition(def);
    } else if (kind === 'routine') {
      const routine: RoutineDefinition = {
        id: baseId,
        name: name.trim(),
        description: description.trim() || undefined,
        schedule: resolvedSchedule,
        daypart,
        items: routineItems,
        status: (initialDefinition as any)?.status || 'active',
        includeInWeeklyReview: true,
        createdAt: (initialDefinition as any)?.createdAt || now,
        updatedAt: now,
      };
      trackingService.saveRoutine(routine);
    } else if (kind === 'checkin') {
      const checkIn: CheckInDefinition = {
        id: baseId,
        name: name.trim(),
        description: description.trim() || undefined,
        schedule: resolvedSchedule,
        daypart,
        fields: checkInFields,
        status: (initialDefinition as any)?.status || 'active',
        includeInWeeklyReview: true,
        createdAt: (initialDefinition as any)?.createdAt || now,
        updatedAt: now,
      };
      trackingService.saveCheckIn(checkIn);
    }

    onSaved();
    onClose();
  };

  const getTitle = () => {
    const isEdit = !!initialDefinition;
    switch (kind) {
      case 'habit':
        return isEdit ? 'Edit Habit' : 'New Habit';
      case 'metric':
        return isEdit ? 'Edit Tracker Metric' : 'New Tracker Metric';
      case 'routine':
        return isEdit ? 'Edit Routine' : 'New Routine';
      case 'checkin':
        return isEdit ? 'Edit Check-In' : 'New Check-In';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              {getTitle()}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure parameters, recurrence schedule, and targets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Name & Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. French Listening, Morning Walk, Evening Review"
              className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Description / Intent (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short intention or instructions"
              className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Habit / Metric Specifics */}
          {(kind === 'habit' || kind === 'metric') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Tracking Type
                  </label>
                  <select
                    value={trackingType}
                    onChange={(e) => setTrackingType(e.target.value as TrackingValueType)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="completion">Completion (Done / Not done)</option>
                    <option value="duration">Duration (Minutes / Time)</option>
                    <option value="count">Count (Sessions / Times)</option>
                    <option value="number">Number (Pages, km, kg)</option>
                    <option value="rating">Rating (Subjective Score)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Daypart / Time of Day
                  </label>
                  <select
                    value={daypart}
                    onChange={(e) => setDaypart(e.target.value as Daypart)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="anytime">Anytime</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              {/* Target & Unit */}
              {trackingType !== 'completion' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Target Threshold
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={targetVal}
                      onChange={(e) => setTargetVal(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Condition
                    </label>
                    <select
                      value={targetOp}
                      onChange={(e) => setTargetOp(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="gte">At least (≥)</option>
                      <option value="lte">At most (≤)</option>
                      <option value="eq">Exact (=)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Unit Label
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="min, pages, km"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Recurrence Schedule */}
          {kind !== 'metric' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Recurrence Schedule
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="daily">Every Day (Daily)</option>
                  <option value="weekdays">Weekdays (Mon–Fri)</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="none">No schedule (Ad-hoc)</option>
                </select>
              </div>

              {scheduleType !== 'none' && scheduleType !== 'weekdays' && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Interval (Every N {scheduleType === 'daily' ? 'days' : scheduleType === 'weekly' ? 'weeks' : 'months'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* Routine Steps Builder */}
          {kind === 'routine' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Routine Steps
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setRoutineItems([
                      ...routineItems,
                      {
                        id: `item-${Date.now()}`,
                        type: 'checklist',
                        label: 'New Step',
                        order: routineItems.length + 1,
                      },
                    ])
                  }
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="space-y-2">
                {routineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded"
                  >
                    <span className="text-xs text-zinc-400 font-mono w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const updated = [...routineItems];
                        updated[idx].label = e.target.value;
                        setRoutineItems(updated);
                      }}
                      placeholder="Step label..."
                      className="flex-1 text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const updated = [...routineItems];
                        updated[idx].type = e.target.value as any;
                        setRoutineItems(updated);
                      }}
                      className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="checklist">Checklist</option>
                      <option value="habit_ref">Habit Ref</option>
                      <option value="resource_link">Link Note</option>
                    </select>
                    {routineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRoutineItems(routineItems.filter((_, i) => i !== idx))}
                        className="text-zinc-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Check-In Fields Builder */}
          {kind === 'checkin' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Form Fields
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCheckInFields([
                      ...checkInFields,
                      {
                        id: `f-${Date.now()}`,
                        label: 'New Question',
                        type: 'text',
                        required: false,
                        order: checkInFields.length + 1,
                      },
                    ])
                  }
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </button>
              </div>

              <div className="space-y-2">
                {checkInFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-2 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-mono w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...checkInFields];
                          updated[idx].label = e.target.value;
                          setCheckInFields(updated);
                        }}
                        placeholder="Field question or label..."
                        className="flex-1 text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...checkInFields];
                          updated[idx].type = e.target.value as any;
                          setCheckInFields(updated);
                        }}
                        className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="rating">Rating (1–5 / 1–10)</option>
                        <option value="text">Short Text</option>
                        <option value="long_text">Long Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes / No</option>
                      </select>
                      {checkInFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCheckInFields(checkInFields.filter((_, i) => i !== idx))}
                          className="text-zinc-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 -mx-5 -mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
            >
              Save Definition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
