import React, { useState } from 'react';
import {
  Utensils,
  AlertCircle,
  Plus,
  Trash2,
  Droplet,
  Flame,
  X,
  Sparkles,
} from 'lucide-react';
import { NutritionEntry, SymptomEntry } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthNutritionSymptomsTabProps {
  nutritionLogs: NutritionEntry[];
  symptomLogs: SymptomEntry[];
  onRefresh: () => void;
}

export const HealthNutritionSymptomsTab: React.FC<HealthNutritionSymptomsTabProps> = ({
  nutritionLogs,
  symptomLogs,
  onRefresh,
}) => {
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);

  // Form states for Nutrition
  const [nutDate, setNutDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [nutMealType, setNutMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'>('lunch');
  const [nutNotes, setNutNotes] = useState<string>('Grilled chicken salad with olive oil');
  const [nutCals, setNutCals] = useState<string>('650');
  const [nutProtein, setNutProtein] = useState<string>('45');
  const [nutCarbs, setNutCarbs] = useState<string>('30');
  const [nutFat, setNutFat] = useState<string>('22');
  const [nutWater, setNutWater] = useState<string>('500');

  // Form states for Symptom
  const [symDate, setSymDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [symName, setSymName] = useState<string>('Tension headache');
  const [symSeverity, setSymSeverity] = useState<number>(3);
  const [symDuration, setSymDuration] = useState<string>('120'); // in minutes
  const [symNotes, setSymNotes] = useState<string>('Appeared after prolonged screen time');

  const handleSaveNutrition = (e: React.FormEvent) => {
    e.preventDefault();
    healthService.saveNutritionEntry({
      date: nutDate,
      meal: nutMealType,
      energyKcal: parseInt(nutCals, 10) || undefined,
      proteinGrams: parseInt(nutProtein, 10) || undefined,
      carbsGrams: parseInt(nutCarbs, 10) || undefined,
      fatGrams: parseInt(nutFat, 10) || undefined,
      waterMl: parseInt(nutWater, 10) || undefined,
      notes: nutNotes.trim() || undefined,
    });
    setIsNutritionModalOpen(false);
    onRefresh();
  };

  const handleSaveSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    healthService.saveSymptom({
      observedAt: symDate,
      symptomName: symName.trim(),
      severity: symSeverity,
      durationMinutes: parseInt(symDuration, 10) || undefined,
      notes: symNotes.trim() || undefined,
    });
    setIsSymptomModalOpen(false);
    onRefresh();
  };

  const handleDeleteNutrition = (id: string) => {
    if (confirm('Delete this nutrition entry?')) {
      healthService.deleteNutritionEntry(id);
      onRefresh();
    }
  };

  const handleDeleteSymptom = (id: string) => {
    if (confirm('Delete this symptom record?')) {
      healthService.deleteSymptom(id);
      onRefresh();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-amber-500" />
          Nutrition & Wellness Observations
        </h2>
        <p className="text-xs text-stone-500">
          Lightweight dietary notes, hydration, and factual symptom observations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nutrition Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-500" />
              Dietary & Hydration Logs
            </h3>
            <button
              type="button"
              onClick={() => setIsNutritionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Meal / Water
            </button>
          </div>

          {nutritionLogs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400">
              No nutrition records logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {nutritionLogs.map((n) => (
                <div
                  key={n.id}
                  className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      {n.meal} • {n.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNutrition(n.id)}
                      className="p-1 text-stone-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {n.notes && (
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {n.notes}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-[11px] pt-1 text-stone-600 dark:text-stone-400">
                    {n.energyKcal && (
                      <span className="font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                        {n.energyKcal} kcal
                      </span>
                    )}
                    {n.proteinGrams && <span>P: {n.proteinGrams}g</span>}
                    {n.carbsGrams && <span>C: {n.carbsGrams}g</span>}
                    {n.fatGrams && <span>F: {n.fatGrams}g</span>}
                    {n.waterMl && (
                      <span className="text-cyan-600 font-bold">💧 {n.waterMl} mL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symptoms & Observations Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Symptom & Wellness Observations
            </h3>
            <button
              type="button"
              onClick={() => setIsSymptomModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Symptom
            </button>
          </div>

          {symptomLogs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400">
              No symptoms recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {symptomLogs.map((s) => (
                <div
                  key={s.id}
                  className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 hover:border-rose-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                      {s.observedAt}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.severity !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.severity >= 7
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : s.severity >= 4
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          Severity: {s.severity}/10
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSymptom(s.id)}
                        className="p-1 text-stone-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {s.symptomName}
                  </div>

                  {s.durationMinutes && (
                    <div className="text-[11px] text-stone-500">
                      Duration: {s.durationMinutes} min
                    </div>
                  )}

                  {s.notes && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 italic">"{s.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nutrition Modal */}
      {isNutritionModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Record Nutrition</h3>
              <button
                type="button"
                onClick={() => setIsNutritionModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNutrition} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">Date</label>
                  <input
                    type="date"
                    value={nutDate}
                    onChange={(e) => setNutDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">Meal</label>
                  <select
                    value={nutMealType}
                    onChange={(e) => setNutMealType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500">Description / Foods</label>
                <input
                  type="text"
                  value={nutNotes}
                  onChange={(e) => setNutNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500">Calories</label>
                  <input
                    type="number"
                    value={nutCals}
                    onChange={(e) => setNutCals(e.target.value)}
                    placeholder="kcal"
                    className="w-full mt-1 px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500">Protein (g)</label>
                  <input
                    type="number"
                    value={nutProtein}
                    onChange={(e) => setNutProtein(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500">Carbs (g)</label>
                  <input
                    type="number"
                    value={nutCarbs}
                    onChange={(e) => setNutCarbs(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500">Fat (g)</label>
                  <input
                    type="number"
                    value={nutFat}
                    onChange={(e) => setNutFat(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-cyan-500" />
                  Water / Hydration (mL)
                </label>
                <input
                  type="number"
                  value={nutWater}
                  onChange={(e) => setNutWater(e.target.value)}
                  placeholder="500"
                  className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNutritionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Symptom Modal */}
      {isSymptomModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Log Symptom Observation</h3>
              <button
                type="button"
                onClick={() => setIsSymptomModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSymptom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">Observed Date</label>
                  <input
                    type="date"
                    value={symDate}
                    onChange={(e) => setSymDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Severity (1-10): {symSeverity}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={symSeverity}
                    onChange={(e) => setSymSeverity(parseInt(e.target.value, 10))}
                    className="w-full mt-2 accent-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500">Symptom Name</label>
                <input
                  type="text"
                  value={symName}
                  onChange={(e) => setSymName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold"
                  placeholder="e.g. Tension Headache, Back Pain, Acid Reflux"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500">Duration (Minutes)</label>
                <input
                  type="number"
                  value={symDuration}
                  onChange={(e) => setSymDuration(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500">Context / Notes</label>
                <textarea
                  rows={2}
                  value={symNotes}
                  onChange={(e) => setSymNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs resize-none"
                  placeholder="Trigger, setting, relief measures..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSymptomModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                >
                  Save Symptom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
