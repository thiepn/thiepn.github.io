import React, { useState } from 'react';
import {
  Footprints,
  Moon,
  Plus,
  Flame,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { ActivitySummary, SleepSession } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthActivitySleepTabProps {
  activitySummaries: ActivitySummary[];
  sleepSessions: SleepSession[];
  onRefresh: () => void;
}

export const HealthActivitySleepTab: React.FC<HealthActivitySleepTabProps> = ({
  activitySummaries,
  sleepSessions,
  onRefresh,
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);

  // Form states for Activity
  const [actDate, setActDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [actSteps, setActSteps] = useState<string>('8000');
  const [actActiveMins, setActActiveMins] = useState<string>('45');
  const [actEnergy, setActEnergy] = useState<string>('350');
  const [actNotes, setActNotes] = useState<string>('');

  // Form states for Sleep
  const [sleepDate, setSleepDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sleepStart, setSleepStart] = useState<string>('23:00');
  const [sleepEnd, setSleepEnd] = useState<string>('07:00');
  const [sleepDuration, setSleepDuration] = useState<string>('480');
  const [sleepDeep, setSleepDeep] = useState<string>('90');
  const [sleepLight, setSleepLight] = useState<string>('240');
  const [sleepRem, setSleepRem] = useState<string>('110');
  const [sleepAwake, setSleepAwake] = useState<string>('40');
  const [sleepNotes, setSleepNotes] = useState<string>('');

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = parseInt(actSteps, 10);
    const mins = parseInt(actActiveMins, 10);
    const energy = parseInt(actEnergy, 10);

    healthService.saveActivitySummary({
      date: actDate,
      steps: !isNaN(steps) ? steps : undefined,
      activeMinutes: !isNaN(mins) ? mins : undefined,
      estimatedActiveEnergyKcal: !isNaN(energy) ? energy : undefined,
      source: 'manual',
      notes: actNotes.trim() || undefined,
    });

    setIsActivityModalOpen(false);
    onRefresh();
  };

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(sleepDuration, 10);
    const deep = parseInt(sleepDeep, 10);
    const light = parseInt(sleepLight, 10);
    const rem = parseInt(sleepRem, 10);
    const awake = parseInt(sleepAwake, 10);

    healthService.saveSleepSession({
      date: sleepDate,
      startTime: sleepStart,
      endTime: sleepEnd,
      durationMinutes: !isNaN(dur) ? dur : 480,
      stages: {
        deepMinutes: !isNaN(deep) ? deep : undefined,
        lightMinutes: !isNaN(light) ? light : undefined,
        remMinutes: !isNaN(rem) ? rem : undefined,
        awakeMinutes: !isNaN(awake) ? awake : undefined,
      },
      source: 'manual',
      notes: sleepNotes.trim() || undefined,
    });

    setIsSleepModalOpen(false);
    onRefresh();
  };

  const handleDeleteSleep = (id: string) => {
    if (confirm('Delete this sleep record?')) {
      healthService.deleteSleepSession(id);
      onRefresh();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Footprints className="w-5 h-5 text-emerald-500" />
          Activity & Sleep Records
        </h2>
        <p className="text-xs text-stone-500">
          Daily movement metrics and sleep session durations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-emerald-500" />
              Daily Activity Summaries
            </h3>
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Activity
            </button>
          </div>

          {activitySummaries.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400">
              No activity logs recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {activitySummaries.map((act) => (
                <div
                  key={act.id}
                  className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                      {act.date}
                    </span>
                    <span className="text-[10px] text-stone-400 capitalize px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">
                      {act.source}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <div className="text-base font-black text-stone-900 dark:text-stone-100">
                        {act.steps?.toLocaleString() || '0'}
                      </div>
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Steps</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <div className="text-base font-black text-stone-900 dark:text-stone-100">
                        {act.activeMinutes || '0'}
                      </div>
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Active Mins</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <div className="text-base font-black text-stone-900 dark:text-stone-100">
                        {act.estimatedActiveEnergyKcal || '0'}
                      </div>
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Active kcal</div>
                    </div>
                  </div>

                  {act.notes && (
                    <p className="text-xs text-stone-500 italic pt-1">"{act.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sleep Sessions Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              Sleep Sessions
            </h3>
            <button
              type="button"
              onClick={() => setIsSleepModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Sleep
            </button>
          </div>

          {sleepSessions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400">
              No sleep sessions recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {sleepSessions.map((slp) => (
                <div
                  key={slp.id}
                  className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2.5 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                      {slp.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400 capitalize px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">
                        {slp.source}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSleep(slp.id)}
                        className="p-1 text-stone-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                      {Math.floor(slp.durationMinutes / 60)}h {slp.durationMinutes % 60}m
                    </div>
                    <div className="text-xs text-stone-500">
                      {slp.startTime} → {slp.endTime}
                    </div>
                  </div>

                  {slp.stages && (
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-1">
                      <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                        <span className="font-bold block">{slp.stages.deepMinutes || 0}m</span>
                        <span>Deep</span>
                      </div>
                      <div className="p-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                        <span className="font-bold block">{slp.stages.lightMinutes || 0}m</span>
                        <span>Light</span>
                      </div>
                      <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                        <span className="font-bold block">{slp.stages.remMinutes || 0}m</span>
                        <span>REM</span>
                      </div>
                      <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        <span className="font-bold block">{slp.stages.awakeMinutes || 0}m</span>
                        <span>Awake</span>
                      </div>
                    </div>
                  )}

                  {slp.notes && <p className="text-xs text-stone-500 italic">"{slp.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Activity Log Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Log Activity Summary</h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Date</label>
                <input
                  type="date"
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Steps</label>
                  <input
                    type="number"
                    value={actSteps}
                    onChange={(e) => setActSteps(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Active Mins</label>
                  <input
                    type="number"
                    value={actActiveMins}
                    onChange={(e) => setActActiveMins(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Active kcal</label>
                  <input
                    type="number"
                    value={actEnergy}
                    onChange={(e) => setActEnergy(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  placeholder="e.g. Hiking in the hills"
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Sleep Modal */}
      {isSleepModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Log Sleep Session</h3>
              <button onClick={() => setIsSleepModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSleep} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Date</label>
                <input
                  type="date"
                  value={sleepDate}
                  onChange={(e) => setSleepDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Bedtime</label>
                  <input
                    type="time"
                    value={sleepStart}
                    onChange={(e) => setSleepStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Wake Time</label>
                  <input
                    type="time"
                    value={sleepEnd}
                    onChange={(e) => setSleepEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Total Mins</label>
                  <input
                    type="number"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">Deep (m)</label>
                  <input
                    type="number"
                    value={sleepDeep}
                    onChange={(e) => setSleepDeep(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">Light (m)</label>
                  <input
                    type="number"
                    value={sleepLight}
                    onChange={(e) => setSleepLight(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">REM (m)</label>
                  <input
                    type="number"
                    value={sleepRem}
                    onChange={(e) => setSleepRem(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">Awake (m)</label>
                  <input
                    type="number"
                    value={sleepAwake}
                    onChange={(e) => setSleepAwake(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSleepModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
