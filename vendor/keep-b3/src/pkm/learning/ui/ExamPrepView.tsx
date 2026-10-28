/**
 * Phase P51 — Exam Preparation Dashboard Component
 *
 * Provides a consolidated, factual exam preparation cockpit showing days remaining,
 * curriculum status, learning objectives, unfinished practice sets, due flashcards,
 * and assessment history without gamified stress or fake predictive metrics.
 */

import React, { useState } from 'react';
import { CourseRecord, ExamPrepSummary } from '../learningTypes';
import { learningService } from '../learningService';
import { learningStorage } from '../learningStorage';
import { useWorkspace } from '../../useWorkspace';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
  FileQuestion,
  BookOpen,
  ListTodo,
  TrendingUp,
  AlertCircle,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import { StudySessionModal } from './StudySessionModal';
import { AIStudyModal } from './AIStudyModal';

interface ExamPrepViewProps {
  courseId?: string;
}

export const ExamPrepView: React.FC<ExamPrepViewProps> = ({ courseId }) => {
  const { openNote, openResource, openReview } = useWorkspace();
  const [coursesWithExams, setCoursesWithExams] = useState<CourseRecord[]>(() => {
    return learningService.getAllCourses().filter((c) => !!c.examDate);
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courseId || (coursesWithExams[0]?.id ?? '')
  );
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const selectedCourse = learningService.getCourse(selectedCourseId);
  const summary: ExamPrepSummary | null = selectedCourseId
    ? learningService.computeExamPrepSummary(selectedCourseId)
    : null;

  if (coursesWithExams.length === 0 && !courseId) {
    return (
      <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl mx-auto my-12">
        <Calendar className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">No Exam Dates Configured</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
          Add an <code>exam: YYYY-MM-DD</code> property to any Course note to track factual exam preparation, practice sets, and review queues.
        </p>
      </div>
    );
  }

  const practiceSets = selectedCourseId ? learningService.getPracticeSetsForCourse(selectedCourseId) : [];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto p-6">
      {/* Top Selector & Course Header */}
      {!courseId && coursesWithExams.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Select Course:
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
          >
            {coursesWithExams.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (Exam: {c.examDate})
              </option>
            ))}
          </select>
        </div>
      )}

      {summary && selectedCourse && (
        <>
          {/* Hero Exam Countdown & Status Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-indigo-100 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                  Exam Preparation Cockpit
                </span>
                {selectedCourse.areaTitle && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Area: {selectedCourse.areaTitle}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedCourse.title}</h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Target Exam Date: <strong>{summary.examDate}</strong>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 min-w-[120px] shadow-sm">
                {summary.isPast ? (
                  <>
                    <span className="text-xl font-bold text-zinc-500">Completed</span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Exam Passed</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {summary.daysRemaining}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Days Remaining</span>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Clock className="w-4 h-4" />
                  Log Study Session
                </button>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-4 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Practice & Drill
                </button>
              </div>
            </div>
          </div>

          {/* Factual Metrics 4-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Curriculum Coverage */}
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium">Curriculum Topics</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {summary.curriculumCompleted} / {summary.curriculumTotal}
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      summary.curriculumTotal > 0
                        ? (summary.curriculumCompleted / summary.curriculumTotal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {summary.curriculumTotal > 0
                  ? `${Math.round((summary.curriculumCompleted / summary.curriculumTotal) * 100)}% complete`
                  : 'No curriculum defined'}
              </span>
            </div>

            {/* 2. Objectives Completed */}
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium">Learning Objectives</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {summary.objectivesCompleted} / {summary.objectivesTotal}
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      summary.objectivesTotal > 0
                        ? (summary.objectivesCompleted / summary.objectivesTotal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {summary.objectivesTotal > 0
                  ? `${Math.round((summary.objectivesCompleted / summary.objectivesTotal) * 100)}% verified`
                  : 'No objectives defined'}
              </span>
            </div>

            {/* 3. Due Spaced Repetition Cards */}
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium">Due Flashcards</span>
                <Layers className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {summary.dueFlashcardsCount} cards
              </div>
              <button
                onClick={() => openReview()}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline text-left font-medium"
              >
                Open Review Session &rarr;
              </button>
            </div>

            {/* 4. Recent Study Time */}
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium">Recent Study (14d)</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {Math.floor(summary.recentStudyMinutes / 60)}h {summary.recentStudyMinutes % 60}m
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Across verified study sessions
              </span>
            </div>
          </div>

          {/* Practice Sets & Milestone Assessments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Practice Sets Section */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-indigo-500" />
                  Practice Problem Sets
                </h3>
                <button
                  onClick={() => openNote(selectedCourse.id)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Course Note
                </button>
              </div>

              {practiceSets.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                  No practice sets linked to this course. Create a note with <code>type: practice-set</code>.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {practiceSets.map((ps) => (
                    <div
                      key={ps.id}
                      onClick={() => openNote(ps.id)}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {ps.title}
                        </span>
                        {ps.topic && <span className="text-[11px] text-zinc-500">Topic: {ps.topic}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {ps.completedTasks} / {ps.totalTasks} solved
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assessment & Mock Exam Results */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Past Assessments & Mock Exams
                </h3>
              </div>

              {summary.recentAssessments.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                  No mock exams or assessments recorded yet for this course.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {summary.recentAssessments.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => openNote(a.id)}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {a.title}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {a.date} &bull; {a.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.scorePercent !== undefined ? (
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {a.scorePercent}%
                          </span>
                        ) : a.grade ? (
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                            {a.grade}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Completed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {selectedCourse && (
        <>
          <StudySessionModal
            isOpen={showSessionModal}
            onClose={() => setShowSessionModal(false)}
            defaultCourseId={selectedCourse.id}
          />
          <AIStudyModal
            isOpen={showAiModal}
            onClose={() => setShowAiModal(false)}
            course={selectedCourse}
            objectives={learningStorage.getCourseConfig(selectedCourse.id).objectives || []}
          />
        </>
      )}
    </div>
  );
};
