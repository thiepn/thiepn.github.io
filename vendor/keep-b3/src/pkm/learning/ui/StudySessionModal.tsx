/**
 * Phase P51 — Study Session Modal & Foreground Timer
 *
 * Allows logging intentional study activity and running a lightweight foreground
 * session timer without invasive system background monitoring.
 */

import React, { useState, useEffect } from 'react';
import { StudyActivityType, StudySession } from '../learningTypes';
import { learningStorage } from '../learningStorage';
import { learningService } from '../learningService';
import { studyTimerService, StudyTimerState } from '../learningStudyTimer';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Square,
  BookOpen,
  CheckCircle2,
  X,
  Target,
  Sparkles,
} from 'lucide-react';

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseId?: string;
  defaultSkillId?: string;
  onSaved?: (session: StudySession) => void;
}

const ACTIVITY_TYPES: StudyActivityType[] = [
  'Reading',
  'Lecture',
  'Practice',
  'Review',
  'Flashcards',
  'Listening',
  'Speaking',
  'Writing',
  'Research',
  'Other',
];

export const StudySessionModal: React.FC<StudySessionModalProps> = ({
  isOpen,
  onClose,
  defaultCourseId,
  defaultSkillId,
  onSaved,
}) => {
  const [courses, setCourses] = useState(learningService.getAllCourses());
  const [skills, setSkills] = useState(learningService.getAllSkills());
  const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId || '');
  const [selectedSkillId, setSelectedSkillId] = useState<string>(defaultSkillId || '');
  const [activityType, setActivityType] = useState<StudyActivityType>('Reading');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>('');
  const [timerState, setTimerState] = useState<StudyTimerState>(studyTimerService.getState());

  useEffect(() => {
    const unsub = studyTimerService.subscribe((state) => {
      setTimerState(state);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (defaultCourseId) setSelectedCourseId(defaultCourseId);
    if (defaultSkillId) setSelectedSkillId(defaultSkillId);
    setCourses(learningService.getAllCourses());
    setSkills(learningService.getAllSkills());
  }, [defaultCourseId, defaultSkillId, isOpen]);

  if (!isOpen) return null;

  const handleStartTimer = () => {
    const courseTitle = courses.find((c) => c.id === selectedCourseId)?.title;
    studyTimerService.start(selectedCourseId || undefined, courseTitle, activityType);
  };

  const handlePauseTimer = () => {
    studyTimerService.pause();
  };

  const handleResumeTimer = () => {
    studyTimerService.resume();
  };

  const handleStopTimer = () => {
    const res = studyTimerService.stop();
    setDurationMinutes(res.durationMinutes);
    if (res.courseId) setSelectedCourseId(res.courseId);
    if (res.activityType) setActivityType(res.activityType as StudyActivityType);
  };

  const handleSave = () => {
    if (durationMinutes <= 0) return;

    const course = courses.find((c) => c.id === selectedCourseId);
    const skill = skills.find((s) => s.id === selectedSkillId);

    const created = learningStorage.recordStudySession({
      date: sessionDate,
      durationMinutes,
      courseIds: selectedCourseId ? [selectedCourseId] : [],
      courseTitles: course ? [course.title] : [],
      skillIds: selectedSkillId ? [selectedSkillId] : [],
      skillTitles: skill ? [skill.title] : [],
      activityType,
      note: note.trim() || undefined,
    });

    if (onSaved) onSaved(created);
    onClose();
  };

  const elapsedSeconds = studyTimerService.getElapsedSeconds();
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Log Study Session</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Record deliberate study activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Timer Section */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              Live Study Timer
            </span>
            <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {formatTimer(elapsedSeconds)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!timerState.isRunning ? (
              <button
                onClick={handleStartTimer}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Timer
              </button>
            ) : timerState.isPaused ? (
              <>
                <button
                  onClick={handleResumeTimer}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume
                </button>
                <button
                  onClick={handleStopTimer}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  Use Time
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePauseTimer}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
                <button
                  onClick={handleStopTimer}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop & Apply
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {/* Course & Skill Relations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Course (Optional)
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              >
                <option value="">-- No Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Skill (Optional)
              </label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              >
                <option value="">-- No Skill --</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Activity Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors ${
                    activityType === type
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Duration and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Duration (minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                />
                <div className="flex gap-1">
                  {[15, 30, 45, 60].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setDurationMinutes(quick)}
                      className="px-2 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded font-mono text-zinc-600 dark:text-zinc-300"
                    >
                      {quick}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Session Note / Key takeaway */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reflection or Topics Covered (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Worked through Jordan normal form proof, completed 10 problems..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Recorded study time is purely factual evidence.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Log Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
