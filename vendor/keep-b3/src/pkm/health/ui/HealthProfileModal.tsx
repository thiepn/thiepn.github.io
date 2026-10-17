import React, { useState } from 'react';
import { X, User, Shield, Lock, EyeOff } from 'lucide-react';
import { HealthProfile } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: HealthProfile;
  onSaved: () => void;
}

export const HealthProfileModal: React.FC<HealthProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [heightVal, setHeightVal] = useState<string>(
    profile.height?.value ? profile.height.value.toString() : '175'
  );
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>(
    profile.height?.unit || 'cm'
  );
  const [birthDate, setBirthDate] = useState<string>(profile.birthDate || '');
  const [weightPref, setWeightPref] = useState<'kg' | 'lb'>(
    profile.preferredUnits.weight || 'kg'
  );
  const [distancePref, setDistancePref] = useState<'km' | 'mi'>(
    profile.preferredUnits.distance || 'km'
  );
  const [tempPref, setTempPref] = useState<'celsius' | 'fahrenheit'>(
    profile.preferredUnits.temperature || 'celsius'
  );
  const [glucosePref, setGlucosePref] = useState<'mg/dL' | 'mmol/L'>(
    profile.preferredUnits.glucose || 'mg/dL'
  );
  const [hideWeightMetrics, setHideWeightMetrics] = useState<boolean>(
    profile.hideWeightMetrics || false
  );
  const [externalAiAccess, setExternalAiAccess] = useState<boolean>(
    profile.externalAiAccess || false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hNum = parseFloat(heightVal);

    healthService.saveProfile({
      birthDate: birthDate || undefined,
      height: !isNaN(hNum) && hNum > 0 ? { value: hNum, unit: heightUnit } : undefined,
      preferredUnits: {
        weight: weightPref,
        distance: distancePref,
        temperature: tempPref,
        glucose: glucosePref,
      },
      hideWeightMetrics,
      externalAiAccess,
      updatedAt: Date.now(),
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Health Profile & Preferences
              </h2>
              <p className="text-xs text-stone-500">Unit configurations and privacy settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Height & Birth Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Body Height
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="175"
                  value={heightVal}
                  onChange={(e) => setHeightVal(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <select
                  value={heightUnit}
                  onChange={(e) => setHeightUnit(e.target.value as any)}
                  className="text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-bold"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Date of Birth (optional)
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Unit Preferences */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Preferred Display Units
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">Weight / Load</label>
                <select
                  value={weightPref}
                  onChange={(e) => setWeightPref(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">Distance</label>
                <select
                  value={distancePref}
                  onChange={(e) => setDistancePref(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="mi">Miles (mi)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">Temperature</label>
                <select
                  value={tempPref}
                  onChange={(e) => setTempPref(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">Blood Glucose</label>
                <select
                  value={glucosePref}
                  onChange={(e) => setGlucosePref(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  <option value="mg/dL">mg/dL (US standard)</option>
                  <option value="mmol/L">mmol/L (International)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Sensitivity Settings */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Privacy & Sensitive Display Controls
            </h3>

            {/* Hide Weight Metrics */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hideWeightMetrics}
                onChange={(e) => setHideWeightMetrics(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                  Hide Body Weight & BMI from Overview
                </span>
                <span className="text-[11px] text-stone-500 block">
                  Allows tracking workouts, vitals, sleep, and labs without viewing weight numbers.
                </span>
              </div>
            </label>

            {/* External AI Access Default Off */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={externalAiAccess}
                onChange={(e) => setExternalAiAccess(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Allow External AI Access to Health Data
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                    Default OFF
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  When OFF, health records, labs, and vitals are completely excluded from external AI prompt payloads.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
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
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
