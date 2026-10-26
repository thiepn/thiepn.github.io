/**
 * Phase P51 — Learning Service & Indexer
 *
 * Central coordinator for Courses, Skills, Learning Objectives, Curriculum Trees,
 * Study Materials, Study Sessions, Practice Sets, and Assessment records.
 *
 * Strict non-negotiable principles:
 * - Pure derived in-memory projection from canonical Markdown notes.
 * - Zero secondary LMS backend or artificial mastery metrics.
 * - Spaced repetition is routed exclusively through P38.
 * - Tasks remain canonical P25 tasks.
 * - Vault Lock immediately purges all in-memory indexes.
 */

import { Note, Folder } from '../../types';
import {
  CourseRecord,
  SkillRecord,
  AssessmentRecord,
  PracticeSetRecord,
  CourseStatus,
  SkillStatus,
  AssessmentStatus,
  AssessmentType,
  CourseProgressMode,
  CourseProgressSummary,
  ExamPrepSummary,
  CurriculumItem,
  LearningObjective,
  CourseStudyMaterial,
  StudySession,
  CourseStructuredConfig,
} from './learningTypes';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';
import { parseRelationReferences } from '../collections/relationEngine';
import { learningStorage } from './learningStorage';
import { cardIndex } from '../review/cardIndex';
import { reviewService } from '../review/reviewService';
import { extractTasksFromNote } from '../tasks/taskParser';
import { storageService } from '../../services/storage';

class LearningService {
  private rawNotesMap: Map<string, Note> = new Map();
  private courses: CourseRecord[] = [];
  private coursesById: Map<string, CourseRecord> = new Map();
  private skills: SkillRecord[] = [];
  private skillsById: Map<string, SkillRecord> = new Map();
  private assessments: AssessmentRecord[] = [];
  private assessmentsById: Map<string, AssessmentRecord> = new Map();
  private practiceSets: PracticeSetRecord[] = [];
  private practiceSetsById: Map<string, PracticeSetRecord> = new Map();

  private isLocked = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    learningStorage.subscribe(() => this.notify());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in learning service listener:', err);
      }
    }
  }

  /**
   * Rebuild the entire in-memory learning index from vault notes
   */
  public rebuild(notes: Note[], folders: Folder[] = []): void {
    if (this.isLocked) return;

    const activeNotes = notes.filter((n) => !n.trashed);
    this.rawNotesMap = new Map(activeNotes.map((n) => [n.id, n]));
    const titleToNoteMap = new Map<string, Note>();
    for (const note of activeNotes) {
      if (note.title) {
        titleToNoteMap.set(note.title.trim().toLowerCase(), note);
      }
    }

    const rawCourses: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawSkills: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawAssessments: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawPracticeSets: Array<{ note: Note; props: Record<string, any> }> = [];

    // 1. Classify notes by frontmatter type or tags
    for (const note of activeNotes) {
      const { ast } = parseFrontmatterAST(note.content || '');
      const props = ast.properties || {};
      const noteType = String(props.type || '').toLowerCase().trim();
      const tags = (note.tags || []).map((t) => t.toLowerCase().trim());

      if (noteType === 'course' || tags.includes('course')) {
        rawCourses.push({ note, props });
      } else if (noteType === 'skill' || tags.includes('skill')) {
        rawSkills.push({ note, props });
      } else if (noteType === 'assessment' || tags.includes('assessment')) {
        rawAssessments.push({ note, props });
      } else if (noteType === 'practice-set' || noteType === 'exercises' || tags.includes('practice-set')) {
        rawPracticeSets.push({ note, props });
      }
    }

    // 2. Index Courses
    this.courses = rawCourses.map(({ note, props }) => {
      // Area relation
      const rawArea = parseRelationReferences(props.area);
      let areaId: string | undefined = undefined;
      let areaTitle: string | undefined = undefined;
      if (rawArea.length > 0) {
        const matchedArea = titleToNoteMap.get(rawArea[0].toLowerCase()) || activeNotes.find((n) => n.id === rawArea[0]);
        if (matchedArea) {
          areaId = matchedArea.id;
          areaTitle = matchedArea.title;
        } else {
          areaTitle = rawArea[0];
        }
      }

      // Goal relation
      const rawGoal = parseRelationReferences(props.goal || props.goals);
      let goalId: string | undefined = undefined;
      let goalTitle: string | undefined = undefined;
      if (rawGoal.length > 0) {
        const matchedGoal = titleToNoteMap.get(rawGoal[0].toLowerCase()) || activeNotes.find((n) => n.id === rawGoal[0]);
        if (matchedGoal) {
          goalId = matchedGoal.id;
          goalTitle = matchedGoal.title;
        } else {
          goalTitle = rawGoal[0];
        }
      }

      // Project relation
      const rawProject = parseRelationReferences(props.project || props.projects);
      let projectId: string | undefined = undefined;
      let projectTitle: string | undefined = undefined;
      if (rawProject.length > 0) {
        const matchedProject = titleToNoteMap.get(rawProject[0].toLowerCase()) || activeNotes.find((n) => n.id === rawProject[0]);
        if (matchedProject) {
          projectId = matchedProject.id;
          projectTitle = matchedProject.title;
        } else {
          projectTitle = rawProject[0];
        }
      }

      // Instructors / People
      const rawInstructors = parseRelationReferences(props.instructor || props.instructors || props.teacher || props.people);
      const instructorIds: string[] = [];
      const instructorTitles: string[] = [];
      for (const ref of rawInstructors) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          instructorIds.push(matched.id);
          instructorTitles.push(matched.title);
        } else {
          instructorTitles.push(ref);
        }
      }

      const progressMode = (props['progress-mode'] || props.progressMode || 'curriculum') as CourseProgressMode;
      const status = (props.status || 'active') as CourseStatus;
      const examDate = props.exam || props['exam-date'] || props.examDate;

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Course',
        status,
        start: props.start,
        end: props.end,
        examDate,
        areaId,
        areaTitle,
        goalId,
        goalTitle,
        projectId,
        projectTitle,
        instructorIds,
        instructorTitles,
        organization: props.organization || props.school || props.university,
        level: props.level,
        language: props.language,
        currentModuleId: props['current-module'] || props.currentModuleId,
        progressMode,
        manualProgress: typeof props.progress === 'number' ? props.progress : undefined,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    this.coursesById = new Map(this.courses.map((c) => [c.id, c]));

    // 3. Index Skills
    this.skills = rawSkills.map(({ note, props }) => {
      // Area
      const rawArea = parseRelationReferences(props.area);
      let areaId: string | undefined = undefined;
      let areaTitle: string | undefined = undefined;
      if (rawArea.length > 0) {
        const matchedArea = titleToNoteMap.get(rawArea[0].toLowerCase()) || activeNotes.find((n) => n.id === rawArea[0]);
        if (matchedArea) {
          areaId = matchedArea.id;
          areaTitle = matchedArea.title;
        } else {
          areaTitle = rawArea[0];
        }
      }

      // Related courses
      const rawCoursesRef = parseRelationReferences(props.course || props.courses || props['related-courses']);
      const relatedCourseIds: string[] = [];
      const relatedCourseTitles: string[] = [];
      for (const ref of rawCoursesRef) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          relatedCourseIds.push(matched.id);
          relatedCourseTitles.push(matched.title);
        } else {
          relatedCourseTitles.push(ref);
        }
      }

      // Evidence notes
      const rawEvidence = parseRelationReferences(props.evidence || props['evidence-notes']);
      const evidenceNoteIds: string[] = [];
      for (const ref of rawEvidence) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) evidenceNoteIds.push(matched.id);
      }

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Skill',
        status: (props.status || 'active') as SkillStatus,
        level: props.level,
        areaId,
        areaTitle,
        relatedCourseIds,
        relatedCourseTitles,
        evidenceNoteIds,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    this.skillsById = new Map(this.skills.map((s) => [s.id, s]));

    // 4. Index Assessments
    this.assessments = rawAssessments.map(({ note, props }) => {
      // Course relation
      const rawCourse = parseRelationReferences(props.course || props.courses);
      let courseId: string | undefined = undefined;
      let courseTitle: string | undefined = undefined;
      if (rawCourse.length > 0) {
        const matched = titleToNoteMap.get(rawCourse[0].toLowerCase()) || this.coursesById.get(rawCourse[0]);
        if (matched) {
          courseId = matched.id;
          courseTitle = matched.title;
        } else {
          courseTitle = rawCourse[0];
        }
      }

      const rawScore = typeof props.score === 'number' ? props.score : undefined;
      const rawScoreMax = typeof props['score-max'] === 'number' ? props['score-max'] : typeof props.scoreMax === 'number' ? props.scoreMax : undefined;
      let scorePercent: number | undefined = undefined;
      if (rawScore !== undefined && rawScoreMax && rawScoreMax > 0) {
        scorePercent = Math.round((rawScore / rawScoreMax) * 100);
      }

      const assessmentType = (props['assessment-type'] || props.type || 'exam') as AssessmentType;
      const date = props.date || (note.createdAt ? note.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
      const status = (props.status || (date > new Date().toISOString().slice(0, 10) ? 'upcoming' : 'completed')) as AssessmentStatus;

      // Objectives
      const rawObjs = parseRelationReferences(props.objective || props.objectives);
      const objectiveIds: string[] = [];
      const objectiveTitles: string[] = [];
      for (const ref of rawObjs) {
        objectiveTitles.push(ref);
      }

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Assessment',
        courseId,
        courseTitle,
        assessmentType,
        date,
        dueDate: props.due || props['due-date'],
        score: rawScore,
        scoreMax: rawScoreMax,
        scorePercent,
        grade: props.grade ? String(props.grade) : undefined,
        status,
        objectiveIds,
        objectiveTitles,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    this.assessmentsById = new Map(this.assessments.map((a) => [a.id, a]));

    // 5. Index Practice Sets
    this.practiceSets = rawPracticeSets.map(({ note, props }) => {
      const rawCourse = parseRelationReferences(props.course || props.courses);
      let courseId: string | undefined = undefined;
      let courseTitle: string | undefined = undefined;
      if (rawCourse.length > 0) {
        const matched = titleToNoteMap.get(rawCourse[0].toLowerCase()) || this.coursesById.get(rawCourse[0]);
        if (matched) {
          courseId = matched.id;
          courseTitle = matched.title;
        } else {
          courseTitle = rawCourse[0];
        }
      }

      const noteTasks = extractTasksFromNote(note);
      const completedTasks = noteTasks.filter((t) => t.completed).length;

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Practice Set',
        courseId,
        courseTitle,
        topic: props.topic,
        totalTasks: noteTasks.length,
        completedTasks,
        openTasks: noteTasks.length - completedTasks,
        tags: note.tags || [],
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    this.practiceSetsById = new Map(this.practiceSets.map((p) => [p.id, p]));

    this.notify();
  }

  // ==========================================
  // GETTERS
  // ==========================================
  public getAllCourses(): CourseRecord[] {
    return [...this.courses];
  }

  public getCourse(id: string): CourseRecord | undefined {
    return this.coursesById.get(id);
  }

  public getActiveCourses(): CourseRecord[] {
    return this.courses.filter((c) => c.status === 'active');
  }

  public getAllSkills(): SkillRecord[] {
    return [...this.skills];
  }

  public getSkill(id: string): SkillRecord | undefined {
    return this.skillsById.get(id);
  }

  public getAllAssessments(): AssessmentRecord[] {
    return [...this.assessments];
  }

  public getAssessmentsForCourse(courseId: string): AssessmentRecord[] {
    return this.assessments.filter((a) => a.courseId === courseId);
  }

  public getPracticeSetsForCourse(courseId: string): PracticeSetRecord[] {
    return this.practiceSets.filter((p) => p.courseId === courseId);
  }

  // ==========================================
  // PROGRESS COMPUTATION (Transparent & Explainable)
  // ==========================================
  public computeCourseProgress(courseId: string): CourseProgressSummary {
    const course = this.getCourse(courseId);
    if (!course) {
      return {
        mode: 'none',
        totalCurriculum: 0,
        completedCurriculum: 0,
        totalObjectives: 0,
        completedObjectives: 0,
        percentage: null,
        displayText: 'Course not found',
      };
    }

    const config = learningStorage.getCourseConfig(courseId);
    const curriculum = config.curriculum || [];
    const objectives = config.objectives || [];

    const totalCurriculum = curriculum.length;
    const completedCurriculum = curriculum.filter((c) => c.status === 'complete').length;

    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter((o) => o.status === 'complete').length;

    const mode = course.progressMode || 'curriculum';

    if (mode === 'none') {
      return {
        mode: 'none',
        totalCurriculum,
        completedCurriculum,
        totalObjectives,
        completedObjectives,
        percentage: null,
        displayText: 'No progress metric configured',
      };
    }

    if (mode === 'manual') {
      const pct = course.manualProgress !== undefined ? course.manualProgress : 0;
      return {
        mode: 'manual',
        totalCurriculum,
        completedCurriculum,
        totalObjectives,
        completedObjectives,
        percentage: pct,
        displayText: `Manual progress: ${pct}%`,
      };
    }

    if (mode === 'objectives') {
      if (totalObjectives === 0) {
        return {
          mode: 'objectives',
          totalCurriculum,
          completedCurriculum,
          totalObjectives: 0,
          completedObjectives: 0,
          percentage: null,
          displayText: 'No objectives defined',
        };
      }
      const pct = Math.round((completedObjectives / totalObjectives) * 100);
      return {
        mode: 'objectives',
        totalCurriculum,
        completedCurriculum,
        totalObjectives,
        completedObjectives,
        percentage: pct,
        displayText: `${completedObjectives} / ${totalObjectives} objectives marked complete (${pct}%)`,
      };
    }

    // Default: 'curriculum'
    if (totalCurriculum === 0) {
      return {
        mode: 'curriculum',
        totalCurriculum: 0,
        completedCurriculum: 0,
        totalObjectives,
        completedObjectives,
        percentage: null,
        displayText: 'No curriculum items defined',
      };
    }
    const pct = Math.round((completedCurriculum / totalCurriculum) * 100);
    return {
      mode: 'curriculum',
      totalCurriculum,
      completedCurriculum,
      totalObjectives,
      completedObjectives,
      percentage: pct,
      displayText: `${completedCurriculum} / ${totalCurriculum} topics complete (${pct}%)`,
    };
  }

  // ==========================================
  // EXAM PREPARATION SUMMARY (Factual Composition)
  // ==========================================
  public computeExamPrepSummary(courseId: string): ExamPrepSummary | null {
    const course = this.getCourse(courseId);
    if (!course || !course.examDate) return null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const examDate = course.examDate;
    const diffMs = new Date(examDate).getTime() - new Date(todayStr).getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isPast = daysRemaining < 0;

    const config = learningStorage.getCourseConfig(courseId);
    const curriculum = config.curriculum || [];
    const objectives = config.objectives || [];

    const curriculumCompleted = curriculum.filter((c) => c.status === 'complete').length;
    const objectivesCompleted = objectives.filter((o) => o.status === 'complete').length;

    // Practice Sets
    const practiceSets = this.getPracticeSetsForCourse(courseId);
    const openPracticeSetsCount = practiceSets.filter((p) => p.openTasks > 0).length;

    // Due flashcards: collect all note IDs linked to course materials and curriculum items
    const linkedNoteIds = new Set<string>([course.id]);
    for (const mat of config.materials || []) {
      if (mat.resourceType === 'note') linkedNoteIds.add(mat.resourceId);
    }
    for (const item of curriculum) {
      for (const resId of item.linkedResourceIds || []) {
        linkedNoteIds.add(resId);
      }
    }

    let dueCards = 0;
    for (const noteId of linkedNoteIds) {
      const summary = reviewService.getQueueSummary({ noteId });
      dueCards += summary.dueCount;
    }

    // Tasks for course note & linked notes
    let openTasksCount = 0;
    for (const noteId of linkedNoteIds) {
      const note = this.rawNotesMap.get(noteId);
      if (note) {
        const tasks = extractTasksFromNote(note);
        openTasksCount += tasks.filter((t) => !t.completed).length;
      }
    }

    // Recent study sessions (last 14 days)
    const sessions = learningStorage.getStudySessionsForCourse(courseId);
    const twoWeeksAgoStr = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentSessions = sessions.filter((s) => s.date >= twoWeeksAgoStr);
    const recentStudyMinutes = recentSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    // Recent assessments
    const courseAssessments = this.getAssessmentsForCourse(courseId).sort((a, b) => b.date.localeCompare(a.date));
    const recentAssessments = courseAssessments.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      score: a.score,
      scoreMax: a.scoreMax,
      scorePercent: a.scorePercent,
      grade: a.grade,
      date: a.date,
      type: a.assessmentType,
    }));

    return {
      courseId,
      courseTitle: course.title,
      examDate,
      daysRemaining,
      isPast,
      curriculumCompleted,
      curriculumTotal: curriculum.length,
      objectivesCompleted,
      objectivesTotal: objectives.length,
      openPracticeSetsCount,
      dueFlashcardsCount: dueCards,
      openTasksCount,
      recentStudyMinutes,
      recentAssessments,
    };
  }

  // ==========================================
  // CURRICULUM MANAGEMENT & CYCLE DETECTION
  // ==========================================
  public addCurriculumItem(courseId: string, item: Omit<CurriculumItem, 'id' | 'courseId' | 'order' | 'createdAt' | 'updatedAt'>): CurriculumItem {
    const config = learningStorage.getCourseConfig(courseId);
    const id = `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newItem: CurriculumItem = {
      ...item,
      id,
      courseId,
      order: (config.curriculum || []).length,
      createdAt: now,
      updatedAt: now,
    };

    config.curriculum.push(newItem);
    learningStorage.saveCourseConfig(config);
    return newItem;
  }

  public updateCurriculumItem(courseId: string, itemId: string, patch: Partial<CurriculumItem>): void {
    const config = learningStorage.getCourseConfig(courseId);
    const itemIndex = config.curriculum.findIndex((c) => c.id === itemId);
    if (itemIndex === -1) return;

    // Cycle check if parentId is being modified
    if (patch.parentId && patch.parentId !== config.curriculum[itemIndex].parentId) {
      if (this.wouldCreateCurriculumCycle(config.curriculum, itemId, patch.parentId)) {
        throw new Error('Cannot set parent: This would create a circular hierarchy in the curriculum tree.');
      }
    }

    const updated = {
      ...config.curriculum[itemIndex],
      ...patch,
      updatedAt: Date.now(),
    };

    if (patch.status === 'complete' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString().slice(0, 10);
    } else if (patch.status && patch.status !== 'complete') {
      updated.completedAt = undefined;
    }

    config.curriculum[itemIndex] = updated;
    learningStorage.saveCourseConfig(config);
  }

  public deleteCurriculumItem(courseId: string, itemId: string): void {
    const config = learningStorage.getCourseConfig(courseId);
    // Note: Deleting curriculum item NEVER deletes linked note or resource!
    config.curriculum = config.curriculum.filter((c) => c.id !== itemId && c.parentId !== itemId);
    learningStorage.saveCourseConfig(config);
  }

  public reorderCurriculum(courseId: string, reorderedItems: CurriculumItem[]): void {
    const config = learningStorage.getCourseConfig(courseId);
    config.curriculum = reorderedItems.map((item, idx) => ({
      ...item,
      order: idx,
      updatedAt: Date.now(),
    }));
    learningStorage.saveCourseConfig(config);
  }

  private wouldCreateCurriculumCycle(items: CurriculumItem[], movingItemId: string, proposedParentId: string): boolean {
    if (movingItemId === proposedParentId) return true;
    let current: string | undefined = proposedParentId;
    const visited = new Set<string>();

    while (current) {
      if (current === movingItemId) return true;
      if (visited.has(current)) break;
      visited.add(current);
      const parentItem = items.find((i) => i.id === current);
      current = parentItem?.parentId;
    }
    return false;
  }

  // ==========================================
  // LEARNING OBJECTIVES MANAGEMENT
  // ==========================================
  public addObjective(courseId: string, objective: Omit<LearningObjective, 'id' | 'courseId' | 'order' | 'createdAt' | 'updatedAt'>): LearningObjective {
    const config = learningStorage.getCourseConfig(courseId);
    const id = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newObj: LearningObjective = {
      ...objective,
      id,
      courseId,
      order: (config.objectives || []).length,
      createdAt: now,
      updatedAt: now,
    };

    config.objectives.push(newObj);
    learningStorage.saveCourseConfig(config);
    return newObj;
  }

  public updateObjective(courseId: string, objectiveId: string, patch: Partial<LearningObjective>): void {
    const config = learningStorage.getCourseConfig(courseId);
    const index = config.objectives.findIndex((o) => o.id === objectiveId);
    if (index === -1) return;

    const updated = {
      ...config.objectives[index],
      ...patch,
      updatedAt: Date.now(),
    };

    // User-driven explicit completion tracking
    if (patch.status === 'complete' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString().slice(0, 10);
    } else if (patch.status && patch.status !== 'complete') {
      updated.completedAt = undefined;
    }

    config.objectives[index] = updated;
    learningStorage.saveCourseConfig(config);
  }

  public deleteObjective(courseId: string, objectiveId: string): void {
    const config = learningStorage.getCourseConfig(courseId);
    config.objectives = config.objectives.filter((o) => o.id !== objectiveId);
    learningStorage.saveCourseConfig(config);
  }

  // ==========================================
  // STUDY MATERIALS MANAGEMENT
  // ==========================================
  public addStudyMaterial(courseId: string, material: Omit<CourseStudyMaterial, 'id' | 'courseId' | 'order'>): CourseStudyMaterial {
    const config = learningStorage.getCourseConfig(courseId);
    const id = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMat: CourseStudyMaterial = {
      ...material,
      id,
      courseId,
      order: (config.materials || []).length,
    };

    config.materials.push(newMat);
    learningStorage.saveCourseConfig(config);
    return newMat;
  }

  public removeStudyMaterial(courseId: string, materialId: string): void {
    const config = learningStorage.getCourseConfig(courseId);
    config.materials = config.materials.filter((m) => m.id !== materialId);
    learningStorage.saveCourseConfig(config);
  }

  // ==========================================
  // VAULT DOCTOR INTEGRITY DIAGNOSTICS
  // ==========================================
  public runDoctorDiagnostics(notes: Note[]): Array<{
    id: string;
    level: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    actionLabel?: string;
    courseId?: string;
  }> {
    const issues: Array<{
      id: string;
      level: 'error' | 'warning' | 'info';
      category: string;
      message: string;
      actionLabel?: string;
      courseId?: string;
    }> = [];

    const activeNoteIds = new Set(notes.filter((n) => !n.trashed).map((n) => n.id));
    const allConfigs = learningStorage.getAllCourseConfigs();

    // 1. Orphan Course Configs (Config exists without Note)
    for (const [courseId, config] of allConfigs.entries()) {
      if (!activeNoteIds.has(courseId)) {
        issues.push({
          id: `learning_orphan_config_${courseId}`,
          level: 'warning',
          category: 'Learning Integrity',
          message: `Orphaned course curriculum config found for missing/trashed note (${courseId}).`,
          actionLabel: 'Clean Up Config',
          courseId,
        });
      }

      // 2. Curriculum cycles or invalid parent references
      const itemIds = new Set((config.curriculum || []).map((c) => c.id));
      for (const item of config.curriculum || []) {
        if (item.parentId && !itemIds.has(item.parentId)) {
          issues.push({
            id: `learning_invalid_parent_${item.id}`,
            level: 'error',
            category: 'Learning Integrity',
            message: `Curriculum item "${item.title}" references missing parent ID (${item.parentId}).`,
            courseId,
          });
        }
      }

      // 3. Duplicate Objective IDs
      const seenObjIds = new Set<string>();
      for (const obj of config.objectives || []) {
        if (seenObjIds.has(obj.id)) {
          issues.push({
            id: `learning_duplicate_obj_${obj.id}`,
            level: 'error',
            category: 'Learning Integrity',
            message: `Duplicate objective ID detected: "${obj.title}" (${obj.id}).`,
            courseId,
          });
        }
        seenObjIds.add(obj.id);
      }
    }

    // 4. Invalid Assessment Scores (e.g. score > scoreMax)
    for (const a of this.assessments) {
      if (a.score !== undefined && a.scoreMax !== undefined && a.score > a.scoreMax) {
        issues.push({
          id: `learning_invalid_score_${a.id}`,
          level: 'warning',
          category: 'Learning Integrity',
          message: `Assessment "${a.title}" has score (${a.score}) greater than maximum (${a.scoreMax}).`,
          courseId: a.courseId,
        });
      }
    }

    // 5. Course Date Anomalies (start > end)
    for (const c of this.courses) {
      if (c.start && c.end && c.start > c.end) {
        issues.push({
          id: `learning_date_anomaly_${c.id}`,
          level: 'warning',
          category: 'Learning Integrity',
          message: `Course "${c.title}" start date (${c.start}) is after end date (${c.end}).`,
          courseId: c.id,
        });
      }
    }

    return issues;
  }

  public async createNote(noteData: {
    title: string;
    content: string;
    tags?: string[];
    folderId?: string | null;
  }): Promise<Note> {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      type: 'text',
      checklist: [],
      tags: noteData.tags || [],
      color: 'default',
      folderId: noteData.folderId || null,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveNote(newNote);
    window.dispatchEvent(new CustomEvent('pkm:note-created', { detail: newNote }));
    return newNote;
  }

  // ==========================================
  // LOCK / SECURITY PURGE
  // ==========================================
  public lock(): void {
    this.isLocked = true;
    this.rawNotesMap.clear();
    this.courses = [];
    this.coursesById.clear();
    this.skills = [];
    this.skillsById.clear();
    this.assessments = [];
    this.assessmentsById.clear();
    this.practiceSets = [];
    this.practiceSetsById.clear();
    learningStorage.lock();
    this.notify();
  }

  public unlock(): void {
    this.isLocked = false;
    learningStorage.unlock();
  }
}

export const learningService = new LearningService();
