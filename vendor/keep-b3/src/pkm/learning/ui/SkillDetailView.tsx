/**
 * Phase P51 — Skill Detail Workspace View
 *
 * Dedicated tab surface for an individual Skill note with related courses,
 * evidence notes, study sessions, and review connections.
 */

import React, { useState, useEffect } from 'react';
import { SkillRecord } from '../learningTypes';
import { learningService } from '../learningService';
import { learningStorage } from '../learningStorage';
import { useWorkspace } from '../../useWorkspace';
import {
  Award,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Clock,
  Plus,
  Compass,
  Edit3,
} from 'lucide-react';
import { StudySessionModal } from './StudySessionModal';

interface SkillDetailViewProps {
  skillId: string;
}

export const SkillDetailView: React.FC<SkillDetailViewProps> = ({ skillId }) => {
  const { openNote, openCourse, openResource } = useWorkspace();
  const [skill, setSkill] = useState<SkillRecord | undefined>(() =>
    learningService.getSkill(skillId)
  );
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    const unsub = learningService.subscribe(() => {
      setSkill(learningService.getSkill(skillId));
    });
    return () => unsub();
  }, [skillId]);

  if (!skill) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>Skill note not found or has been trashed.</p>
      </div>
    );
  }

  const studySessions = learningStorage.getStudySessionsForSkill(skill.id);
  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Skill &bull; {skill.status}
                </span>
                {skill.level && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    Level: {skill.level}
                  </span>
                )}
                {skill.areaTitle && (
                  <button
                    onClick={() => skill.areaId && openNote(skill.areaId)}
                    className="text-xs text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" />
                    {skill.areaTitle}
                  </button>
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {skill.title}
                <button
                  onClick={() => openNote(skill.id)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  title="Open source Markdown note"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Clock className="w-4 h-4" />
                Log Practice Session
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Total Practice Time:{' '}
              <strong className="text-zinc-700 dark:text-zinc-200">
                {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
              </strong>
            </span>
            <span>
              Related Courses:{' '}
              <strong className="text-zinc-700 dark:text-zinc-200">
                {skill.relatedCourseTitles.length}
              </strong>
            </span>
            <span>
              Evidence Notes:{' '}
              <strong className="text-zinc-700 dark:text-zinc-200">
                {skill.evidenceNoteIds.length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full p-6 flex flex-col gap-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Related Courses */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Related Courses
            </h3>
            {skill.relatedCourseTitles.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                No related courses specified. Add <code>courses: ["[[Course Title]]"]</code> in frontmatter.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {skill.relatedCourseTitles.map((title, idx) => {
                  const courseId = skill.relatedCourseIds[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => courseId && openCourse(courseId, title)}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {title}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Open Course &rarr;
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evidence Notes */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Evidence & Practice Notes
            </h3>
            {skill.evidenceNoteIds.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                No explicit evidence notes linked. Add <code>evidence: ["[[Project Note]]"]</code> in frontmatter.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {skill.evidenceNoteIds.map((noteId) => (
                  <div
                    key={noteId}
                    onClick={() => openNote(noteId)}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Note #{noteId.slice(0, 8)}
                    </span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">Open Note &rarr;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Practice Sessions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Deliberate Practice Sessions
            </h3>
            <button
              onClick={() => setShowSessionModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Practice
            </button>
          </div>

          {studySessions.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
              No deliberate practice sessions recorded for this skill yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {studySessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {s.activityType} &bull; {s.durationMinutes} minutes
                      </span>
                      {s.note && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.note}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{s.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StudySessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        defaultSkillId={skill.id}
      />
    </div>
  );
};
