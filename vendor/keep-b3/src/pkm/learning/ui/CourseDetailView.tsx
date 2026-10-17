/**
 * Phase P51 — Course Detail Workspace View
 *
 * Dedicated tab surface for an individual Course note with full management of
 * curriculum tree, learning objectives, materials, practice sets, assessments,
 * study history, and scoped AI tutor assistance.
 */

import React, { useState, useEffect } from 'react';
import {
  CourseRecord,
  LearningObjective,
  CourseStudyMaterial,
  StudyMaterialRole,
  StudyMaterialStatus,
  ObjectiveStatus,
  ObjectiveConfidence,
} from '../learningTypes';
import { learningService } from '../learningService';
import { learningStorage } from '../learningStorage';
import { exportCourseSummaryToMarkdown } from '../learningExport';
import { useWorkspace } from '../../useWorkspace';
import {
  BookOpen,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Download,
  Share2,
  User,
  Target,
  Compass,
  FileQuestion,
  HelpCircle,
  BarChart2,
  Edit3,
} from 'lucide-react';
import { CurriculumTreeBuilder } from './CurriculumTreeBuilder';
import { StudySessionModal } from './StudySessionModal';
import { AIStudyModal } from './AIStudyModal';

interface CourseDetailViewProps {
  courseId: string;
}

type TabType =
  | 'curriculum'
  | 'objectives'
  | 'materials'
  | 'practice'
  | 'assessments'
  | 'history'
  | 'ai';

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({ courseId }) => {
  const { openNote, openResource, openReview } = useWorkspace();
  const [course, setCourse] = useState<CourseRecord | undefined>(() =>
    learningService.getCourse(courseId)
  );
  const [config, setConfig] = useState(() => learningStorage.getCourseConfig(courseId));
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // New Objective Form State
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');

  // New Material Form State
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatRole, setNewMatRole] = useState<StudyMaterialRole>('Textbook');
  const [newMatType, setNewMatType] = useState<'note' | 'url' | 'pdf' | 'reference'>('note');
  const [newMatResId, setNewMatResId] = useState('');
  const [newMatUrl, setNewMatUrl] = useState('');

  useEffect(() => {
    const unsub = learningService.subscribe(() => {
      setCourse(learningService.getCourse(courseId));
      setConfig(learningStorage.getCourseConfig(courseId));
    });
    return () => unsub();
  }, [courseId]);

  if (!course) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>Course not found or has been trashed.</p>
      </div>
    );
  }

  const progress = learningService.computeCourseProgress(course.id);
  const studySessions = learningStorage.getStudySessionsForCourse(course.id);
  const assessments = learningService.getAssessmentsForCourse(course.id);
  const practiceSets = learningService.getPracticeSetsForCourse(course.id);

  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const handleAddObjective = () => {
    if (!newObjTitle.trim()) return;
    learningService.addObjective(course.id, {
      title: newObjTitle.trim(),
      description: newObjDesc.trim() || undefined,
      status: 'not-started',
      confidence: 'not-confident',
    });
    setNewObjTitle('');
    setNewObjDesc('');
    setConfig(learningStorage.getCourseConfig(course.id));
  };

  const handleAddMaterial = () => {
    if (!newMatTitle.trim()) return;
    learningService.addStudyMaterial(course.id, {
      title: newMatTitle.trim(),
      role: newMatRole,
      resourceType: newMatType,
      resourceId: newMatResId.trim() || newMatTitle.trim(),
      url: newMatUrl.trim() || undefined,
      status: 'not-started',
    });
    setNewMatTitle('');
    setNewMatResId('');
    setNewMatUrl('');
    setConfig(learningStorage.getCourseConfig(course.id));
  };

  const handleExportMarkdown = () => {
    const md = exportCourseSummaryToMarkdown(
      course,
      config.objectives || [],
      studySessions,
      assessments
    );
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${course.title.replace(/\s+/g, '_')}_Summary.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePromoteObjectiveToNote = async (obj: LearningObjective) => {
    const newNote = await learningService.createNote({
      title: `${course.title} — ${obj.title}`,
      content: `---\ntype: learning-objective\ncourse:\n  - "[[${course.title}]]"\nstatus: ${obj.status}\nconfidence: ${obj.confidence || 'somewhat'}\n---\n\n# ${obj.title}\n\n${obj.description || ''}\n\n## Key Notes & Understanding\n\n- \n\n## Review Questions\n\n- \n`,
    });
    openNote(newNote.id, newNote.title);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Course &bull; {course.status}
                </span>
                {course.organization && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {course.organization}
                  </span>
                )}
                {course.areaTitle && (
                  <button
                    onClick={() => course.areaId && openNote(course.areaId)}
                    className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" />
                    {course.areaTitle}
                  </button>
                )}
                {course.goalTitle && (
                  <button
                    onClick={() => course.goalId && openNote(course.goalId)}
                    className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1"
                  >
                    <Target className="w-3 h-3" />
                    {course.goalTitle}
                  </button>
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {course.title}
                <button
                  onClick={() => openNote(course.id)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  title="Open source Markdown note"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </h1>
              {course.instructorTitles.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Instructors: {course.instructorTitles.join(', ')}
                </p>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Clock className="w-4 h-4" />
                Log Study Session
              </button>
              <button
                onClick={() => setShowAiModal(true)}
                className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                AI Tutor
              </button>
              <button
                onClick={handleExportMarkdown}
                className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-xl transition-colors"
                title="Export Course Summary as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress & Quick Stats Bar */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="w-full max-w-xs bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${progress.percentage !== null ? progress.percentage : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {progress.displayText}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              {course.examDate && (
                <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Exam: {course.examDate}
                </span>
              )}
              <span>
                Study Time:{' '}
                <strong className="text-zinc-700 dark:text-zinc-200">
                  {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                </strong>
              </span>
              <span>
                Objectives:{' '}
                <strong className="text-zinc-700 dark:text-zinc-200">
                  {config.objectives.filter((o) => o.status === 'complete').length} /{' '}
                  {config.objectives.length}
                </strong>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 -mb-6 pt-2">
            {[
              { id: 'curriculum', label: 'Curriculum & Syllabus', icon: Layers },
              { id: 'objectives', label: `Objectives (${config.objectives.length})`, icon: Target },
              { id: 'materials', label: `Materials (${config.materials.length})`, icon: BookOpen },
              { id: 'practice', label: `Practice (${practiceSets.length})`, icon: FileQuestion },
              { id: 'assessments', label: `Assessments (${assessments.length})`, icon: TrendingUp },
              { id: 'history', label: `Study History (${studySessions.length})`, icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
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

      {/* Main Tab Content */}
      <div className="max-w-6xl mx-auto w-full p-6 flex-1">
        {/* TAB 1: CURRICULUM */}
        {activeTab === 'curriculum' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Course Curriculum & Nested Modules
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Organize modules, lectures, and sections with status tracking
                </p>
              </div>
            </div>

            <CurriculumTreeBuilder
              courseId={course.id}
              curriculum={config.curriculum}
              objectives={config.objectives}
              onCurriculumChange={() => setConfig(learningStorage.getCourseConfig(course.id))}
            />
          </div>
        )}

        {/* TAB 2: OBJECTIVES */}
        {activeTab === 'objectives' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Learning Objectives
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Define explicit learning targets with user-verified completion tracking
                </p>
              </div>

              {/* Add Objective Form */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="e.g. Derive and apply the Spectral Theorem for self-adjoint operators..."
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Optional details, key formulas, or reference..."
                    value={newObjDesc}
                    onChange={(e) => setNewObjDesc(e.target.value)}
                    className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddObjective}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Objective
                  </button>
                </div>
              </div>

              {/* Objectives List */}
              {config.objectives.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No learning objectives created for this course yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {config.objectives.map((obj) => (
                    <div
                      key={obj.id}
                      className="p-3.5 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => {
                            const nextStatus: Record<ObjectiveStatus, ObjectiveStatus> = {
                              'not-started': 'in-progress',
                              'in-progress': 'complete',
                              'complete': 'review',
                              'review': 'not-started',
                            };
                            learningService.updateObjective(course.id, obj.id, {
                              status: nextStatus[obj.status],
                            });
                            setConfig(learningStorage.getCourseConfig(course.id));
                          }}
                          className="mt-0.5"
                          title={`Status: ${obj.status}. Click to cycle.`}
                        >
                          {obj.status === 'complete' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                          )}
                        </button>

                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-xs font-medium text-zinc-900 dark:text-zinc-100 ${
                              obj.status === 'complete' ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {obj.title}
                          </span>
                          {obj.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {obj.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {obj.status}
                            </span>
                            {obj.confidence && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium">
                                Confidence: {obj.confidence}
                              </span>
                            )}
                            {obj.completedAt && (
                              <span className="text-[10px] text-zinc-400">
                                Completed: {obj.completedAt}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePromoteObjectiveToNote(obj)}
                          className="px-2 py-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded flex items-center gap-1"
                          title="Create dedicated Markdown note for this objective"
                        >
                          <FileText className="w-3 h-3" />
                          Create Note
                        </button>
                        <button
                          onClick={() => {
                            learningService.deleteObjective(course.id, obj.id);
                            setConfig(learningStorage.getCourseConfig(course.id));
                          }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 rounded"
                          title="Delete objective"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Course Study Materials & Reference Links
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Attach textbooks, lectures, notes, PDFs, or external syllabi to this course
              </p>
            </div>

            {/* Add Material Form */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
              <select
                value={newMatRole}
                onChange={(e) => setNewMatRole(e.target.value as StudyMaterialRole)}
                className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100"
              >
                <option value="Textbook">Textbook</option>
                <option value="Lecture">Lecture</option>
                <option value="Reading">Reading</option>
                <option value="Exercise">Exercise</option>
                <option value="Reference">Reference</option>
                <option value="Supplement">Supplement</option>
                <option value="Recording">Recording</option>
              </select>

              <input
                type="text"
                placeholder="Material title..."
                value={newMatTitle}
                onChange={(e) => setNewMatTitle(e.target.value)}
                className="flex-1 min-w-[150px] text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />

              <input
                type="text"
                placeholder="URL or Note Title (optional)..."
                value={newMatUrl}
                onChange={(e) => setNewMatUrl(e.target.value)}
                className="w-48 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />

              <button
                onClick={handleAddMaterial}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Material
              </button>
            </div>

            {/* Materials List */}
            {config.materials.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No materials linked yet. Add textbooks, lecture slide notes, or syllabus URLs.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {mat.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {mat.role}
                          </span>
                          {mat.url && (
                            <a
                              href={mat.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5"
                            >
                              Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        learningService.removeStudyMaterial(course.id, mat.id);
                        setConfig(learningStorage.getCourseConfig(course.id));
                      }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRACTICE & FLASHCARDS */}
        {activeTab === 'practice' && (
          <div className="flex flex-col gap-6">
            {/* Practice Sets List */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Practice Problem Sets
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Solve tasks and exercises linked to this course
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const newNote = await learningService.createNote({
                      title: `${course.title} — Practice Set 1`,
                      content: `---\ntype: practice-set\ncourse:\n  - "[[${course.title}]]"\ntopic: General Practice\n---\n\n# ${course.title} — Practice Set 1\n\n- [ ] Problem 1: \n- [ ] Problem 2: \n- [ ] Problem 3: \n`,
                    });
                    openNote(newNote.id, newNote.title);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Practice Set
                </button>
              </div>

              {practiceSets.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No practice sets linked to this course. Create a note with{' '}
                  <code>type: practice-set</code>.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {practiceSets.map((ps) => (
                    <div
                      key={ps.id}
                      onClick={() => openNote(ps.id)}
                      className="p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {ps.title}
                        </span>
                        {ps.topic && (
                          <span className="text-[11px] text-zinc-500">Topic: {ps.topic}</span>
                        )}
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {ps.completedTasks} / {ps.totalTasks} done
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spaced Repetition Link */}
            <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Course Spaced Repetition Flashcards
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Flashcards in notes referencing this course are automatically indexed into Spaced Repetition.
                </p>
              </div>
              <button
                onClick={() => openReview()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Review Cards &rarr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: ASSESSMENTS */}
        {activeTab === 'assessments' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Assessments, Quizzes & Exams
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Track upcoming and completed evaluations
                </p>
              </div>
              <button
                onClick={async () => {
                  const newNote = await learningService.createNote({
                    title: `${course.title} — Quiz 1`,
                    content: `---\ntype: assessment\nassessment-type: quiz\ncourse:\n  - "[[${course.title}]]"\ndate: ${new Date().toISOString().slice(0, 10)}\nscore: 18\nscore-max: 20\nstatus: completed\n---\n\n# ${course.title} — Quiz 1\n\n## Results & Reflection\n\n- \n`,
                  });
                  openNote(newNote.id, newNote.title);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New Assessment Note
              </button>
            </div>

            {assessments.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No assessment notes linked to this course. Create a note with{' '}
                <code>type: assessment</code>.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openNote(a.id)}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {a.title}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {a.date} &bull; {a.assessmentType} &bull; Status: {a.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {a.score !== undefined && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {a.score}
                          {a.scoreMax ? ` / ${a.scoreMax}` : ''}
                          {a.scorePercent !== undefined ? ` (${a.scorePercent}%)` : ''}
                        </span>
                      )}
                      {a.grade && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                          {a.grade}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: STUDY HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Study Session Log
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verified study activity history for {course.title}
                </p>
              </div>
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Session
              </button>
            </div>

            {studySessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No study sessions logged for this course yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {studySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
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

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">{s.date}</span>
                      <button
                        onClick={() => learningStorage.deleteStudySession(s.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 rounded"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <StudySessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        defaultCourseId={course.id}
      />
      <AIStudyModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        course={course}
        objectives={config.objectives}
      />
    </div>
  );
};
