/**
 * Phase P51 — Central Learning & Curriculum Operating Hub
 *
 * Provides a unified overview for deliberate learning: active courses, skills,
 * study session logs, exam prep cockpits, and review analytics.
 */

import React, { useState, useEffect } from 'react';
import { CourseRecord, SkillRecord, CourseStatus } from '../learningTypes';
import { learningService } from '../learningService';
import { learningStorage } from '../learningStorage';
import { exportStudySessionsToCSV } from '../learningExport';
import { useWorkspace } from '../../useWorkspace';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Calendar,
  Layers,
  Plus,
  TrendingUp,
  Download,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Compass,
  Filter,
} from 'lucide-react';
import { StudySessionModal } from './StudySessionModal';
import { ExamPrepView } from './ExamPrepView';

type HubTab = 'courses' | 'skills' | 'sessions' | 'exams' | 'analytics';

export const LearningWorkspaceView: React.FC = () => {
  const { openNote, openCourse, openSkill } = useWorkspace();
  const [activeTab, setActiveTab] = useState<HubTab>('courses');
  const [courses, setCourses] = useState<CourseRecord[]>(() => learningService.getAllCourses());
  const [skills, setSkills] = useState<SkillRecord[]>(() => learningService.getAllSkills());
  const [studySessions, setStudySessions] = useState(() => learningStorage.getStudySessions());
  const [courseFilter, setCourseFilter] = useState<CourseStatus | 'all'>('active');

  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    const unsub = learningService.subscribe(() => {
      setCourses(learningService.getAllCourses());
      setSkills(learningService.getAllSkills());
      setStudySessions(learningStorage.getStudySessions());
    });
    return () => unsub();
  }, []);

  const filteredCourses =
    courseFilter === 'all' ? courses : courses.filter((c) => c.status === courseFilter);

  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const coursesWithExams = courses.filter((c) => !!c.examDate);

  const handleExportSessionsCSV = () => {
    const csv = exportStudySessionsToCSV(studySessions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `study_sessions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Learning & Curriculum Hub
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Courses, skills, deliberate practice, spaced recall, and exam preparation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Clock className="w-4 h-4" />
                Log Study Session
              </button>
              <button
                onClick={async () => {
                  const newNote = await learningService.createNote({
                    title: 'New Course',
                    content: `---\ntype: course\nstatus: active\nprogress-mode: curriculum\n---\n\n# New Course\n\n## Overview\n\n- \n\n## Syllabus & Modules\n\n- \n`,
                  });
                  openCourse(newNote.id, newNote.title);
                }}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Course Note
              </button>
              <button
                onClick={async () => {
                  const newNote = await learningService.createNote({
                    title: 'New Skill',
                    content: `---\ntype: skill\nstatus: active\nlevel: Beginner\n---\n\n# New Skill\n\n## Overview & Scope\n\n- \n\n## Practice Routine\n\n- \n`,
                  });
                  openSkill(newNote.id, newNote.title);
                }}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Skill Note
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Active Courses:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {courses.filter((c) => c.status === 'active').length}
              </strong>
            </span>
            <span>
              Active Skills:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {skills.filter((s) => s.status === 'active').length}
              </strong>
            </span>
            <span>
              Total Study Logged:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
              </strong>
            </span>
            {coursesWithExams.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Upcoming Exams: <strong>{coursesWithExams.length}</strong>
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 -mb-6 pt-2">
            {[
              { id: 'courses', label: `Courses (${courses.length})`, icon: BookOpen },
              { id: 'skills', label: `Skills (${skills.length})`, icon: Award },
              { id: 'sessions', label: `Study Sessions (${studySessions.length})`, icon: Clock },
              { id: 'exams', label: `Exam Cockpit (${coursesWithExams.length})`, icon: Calendar },
              { id: 'analytics', label: 'Review & Analytics', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as HubTab)}
                  className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full p-6 flex-1 flex flex-col gap-6">
        {/* TAB 1: COURSES */}
        {activeTab === 'courses' && (
          <div className="flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
                {(['active', 'planned', 'completed', 'paused', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCourseFilter(filter)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                      courseFilter === filter
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Courses Grid */}
            {filteredCourses.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <BookOpen className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No courses match filter
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Create a new note with <code>type: course</code> in frontmatter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((c) => {
                  const prog = learningService.computeCourseProgress(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => openCourse(c.id, c.title)}
                      className="p-5 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer transition-all flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {c.status}
                          </span>
                          {c.examDate && (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {c.examDate}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {c.title}
                        </h3>

                        {c.areaTitle && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            {c.areaTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{prog.displayText}</span>
                        </div>
                        {prog.percentage !== null && (
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all"
                              style={{ width: `${prog.percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SKILLS */}
        {activeTab === 'skills' && (
          <div className="flex flex-col gap-4">
            {skills.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <Award className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No skills indexed yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Create a new note with <code>type: skill</code> to track deliberate practice and proficiency.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openSkill(s.id, s.title)}
                    className="p-5 bg-white dark:bg-zinc-900 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {s.status}
                        </span>
                        {s.level && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {s.level}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {s.title}
                      </h3>

                      {s.areaTitle && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          {s.areaTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                      <span>{s.relatedCourseTitles.length} courses</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Open Skill &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDY SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Study & Practice Logs
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Explicitly recorded study events across all courses and skills
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSessionsCSV}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Session
                </button>
              </div>
            </div>

            {studySessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No study sessions recorded yet. Use the timer or quick log.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {studySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {s.activityType} &bull; {s.durationMinutes} min
                          </span>
                          {s.courseTitles && s.courseTitles.length > 0 && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                              {s.courseTitles.join(', ')}
                            </span>
                          )}
                          {s.skillTitles && s.skillTitles.length > 0 && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                              {s.skillTitles.join(', ')}
                            </span>
                          )}
                        </div>
                        {s.note && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{s.note}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono text-zinc-400">{s.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EXAM PREP */}
        {activeTab === 'exams' && <ExamPrepView />}

        {/* TAB 5: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Factual Learning Summary & Audit
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transparent study metrics without artificial mastery estimations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Total Recorded Study Time</span>
                <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                </span>
                <span className="text-[11px] text-zinc-400">
                  Across {studySessions.length} logged sessions
                </span>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Active Learning Projects</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {courses.filter((c) => c.status === 'active').length +
                    skills.filter((s) => s.status === 'active').length}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {courses.filter((c) => c.status === 'active').length} courses,{' '}
                  {skills.filter((s) => s.status === 'active').length} skills
                </span>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Targeted Upcoming Exams</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {coursesWithExams.length}
                </span>
                <span className="text-[11px] text-zinc-400">Course evaluations scheduled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <StudySessionModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
    </div>
  );
};
