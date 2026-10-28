import React, { useState, useEffect } from 'react';
import { X, Activity, Scale, Heart, Thermometer, Droplets, Info } from 'lucide-react';
import {
  MeasurementTypeDefinition,
  HealthMeasurement,
  HealthProfile,
} from '../healthTypes';
import { convertHealthUnit } from '../healthUnits';
import { healthService } from '../healthService';

interface HealthMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurementTypes: MeasurementTypeDefinition[];
  profile: HealthProfile;
  initialMeasurement?: HealthMeasurement | null;
  onSaved: () => void;
}

export const HealthMeasurementModal: React.FC<HealthMeasurementModalProps> = ({
  isOpen,
  onClose,
  measurementTypes,
  profile,
  initialMeasurement,
  onSaved,
}) => {
  if (!isOpen) return null;

  const defaultType = measurementTypes.find((t) => t.id === 'body-weight') || measurementTypes[0];
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialMeasurement?.typeId || defaultType?.id || 'body-weight');

  const currentType = measurementTypes.find((t) => t.id === selectedTypeId) || defaultType;

  const [date, setDate] = useState<string>(
    initialMeasurement ? initialMeasurement.observedAt.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [valueStr, setValueStr] = useState<string>(
    initialMeasurement ? initialMeasurement.value.toString() : ''
  );
  const [systolicStr, setSystolicStr] = useState<string>(
    initialMeasurement?.structuredValue ? initialMeasurement.structuredValue.systolic.toString() : '120'
  );
  const [diastolicStr, setDiastolicStr] = useState<string>(
    initialMeasurement?.structuredValue ? initialMeasurement.structuredValue.diastolic.toString() : '80'
  );
  const [pulseStr, setPulseStr] = useState<string>(
    initialMeasurement?.structuredValue?.pulse ? initialMeasurement.structuredValue.pulse.toString() : ''
  );
  const [unit, setUnit] = useState<string>(
    initialMeasurement?.unit || currentType?.defaultUnit || 'kg'
  );
  const [note, setNote] = useState<string>(initialMeasurement?.note || '');
  const [isExcluded, setIsExcluded] = useState<boolean>(initialMeasurement?.isExcluded || false);
  const [exclusionReason, setExclusionReason] = useState<string>(initialMeasurement?.exclusionReason || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialMeasurement && currentType) {
      setUnit(currentType.defaultUnit);
    }
  }, [selectedTypeId, currentType, initialMeasurement]);

  const numVal = parseFloat(valueStr);
  const alternateUnit = unit === 'kg' ? 'lb' : unit === 'lb' ? 'kg' : unit === 'celsius' ? 'fahrenheit' : unit === 'fahrenheit' ? 'celsius' : null;
  const altConv = alternateUnit && !isNaN(numVal) ? convertHealthUnit(numVal, unit, alternateUnit) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isBP = currentType?.isPairedVitals;

    if (isBP) {
      const sys = parseInt(systolicStr, 10);
      const dia = parseInt(diastolicStr, 10);
      const pul = pulseStr ? parseInt(pulseStr, 10) : undefined;

      if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) {
        setError('Please enter valid systolic and diastolic blood pressure values.');
        return;
      }

      if (initialMeasurement) {
        healthService.updateMeasurement(initialMeasurement.id, {
          typeId: selectedTypeId,
          observedAt: date,
          value: sys,
          structuredValue: { systolic: sys, diastolic: dia, pulse: pul },
          unit: 'mmHg',
          note: note.trim() || undefined,
          isExcluded,
          exclusionReason: isExcluded ? exclusionReason.trim() || 'Outlier' : undefined,
        });
      } else {
        healthService.addMeasurement({
          typeId: selectedTypeId,
          observedAt: date,
          value: sys,
          structuredValue: { systolic: sys, diastolic: dia, pulse: pul },
          unit: 'mmHg',
          note: note.trim() || undefined,
          isExcluded,
          exclusionReason: isExcluded ? exclusionReason.trim() || 'Outlier' : undefined,
          source: 'manual',
        });
      }
    } else {
      if (isNaN(numVal)) {
        setError('Please enter a valid numeric value.');
        return;
      }

      if (initialMeasurement) {
        healthService.updateMeasurement(initialMeasurement.id, {
          typeId: selectedTypeId,
          observedAt: date,
          value: numVal,
          unit,
          note: note.trim() || undefined,
          isExcluded,
          exclusionReason: isExcluded ? exclusionReason.trim() || 'Outlier' : undefined,
        });
      } else {
        healthService.addMeasurement({
          typeId: selectedTypeId,
          observedAt: date,
          value: numVal,
          unit,
          note: note.trim() || undefined,
          isExcluded,
          exclusionReason: isExcluded ? exclusionReason.trim() || 'Outlier' : undefined,
          source: 'manual',
        });
      }
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialMeasurement ? 'Edit Measurement' : 'Record Measurement'}
              </h2>
              <p className="text-xs text-stone-500">Private, local-first body observation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Measurement Type
            </label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {measurementTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Observed Date & Time
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Paired Vitals vs Standard Value Input */}
          {currentType?.isPairedVitals ? (
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  Systolic (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="120"
                  value={systolicStr}
                  onChange={(e) => setSystolicStr(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="80"
                  value={diastolicStr}
                  onChange={(e) => setDiastolicStr(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  Pulse (bpm, opt)
                </label>
                <input
                  type="number"
                  placeholder="70"
                  value={pulseStr}
                  onChange={(e) => setPulseStr(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Measurement Value
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 78.5"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {currentType?.allowedUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Unit Conversion Hint */}
          {altConv && (
            <div className="p-2.5 bg-stone-100 dark:bg-stone-800/60 rounded-xl text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-between">
              <span>Conversion preview:</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {altConv.value} {altConv.unit}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Note or Context (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Morning fasting, post-walk, arm cuff..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Outlier / Exclusion */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={isExcluded}
                onChange={(e) => setIsExcluded(e.target.checked)}
                className="rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="font-medium">Mark as outlier / exclude from trend charts</span>
            </label>
            {isExcluded && (
              <input
                type="text"
                placeholder="Reason for exclusion (e.g. incorrect reading, sensor glitch)"
                value={exclusionReason}
                onChange={(e) => setExclusionReason(e.target.value)}
                className="mt-2 w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              {initialMeasurement ? 'Save Changes' : 'Record Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
