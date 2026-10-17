/**
 * Phase P51 — Learning, Courses, Skills, Study Sessions & Curriculum System
 *
 * Core type definitions for Course notes, Skill notes, Learning Objectives,
 * Nested Curriculum, Study Materials, Study Sessions, Practice Sets, and Assessments.
 *
 * Non-negotiable principles:
 * - Courses and Skills are CANONICAL NOTES.
 * - No proprietary LMS database, no gamified XP, no streak pressure.
 * - Progress is strictly transparent and explainable (Curriculum, Objectives, Manual, or None).
 * - Zero artificial mastery score or fake "readiness probability".
 * - Objective completion is always explicit and user-driven.
 */

export type CourseStatus = 'planned' | 'active' | 'paused' | 'completed' | 'archived';
export type SkillStatus = 'active' | 'maintaining' | 'paused' | 'archived';
export type CourseProgressMode = 'curriculum' | 'objectives' | 'manual' | 'none';

export type CurriculumItemType = 'module' | 'topic' | 'lesson' | 'section';
export type CurriculumStatus = 'not-started' | 'in-progress' | 'review' | 'complete';

export type ObjectiveStatus = 'not-started' | 'in-progress' | 'review' | 'complete';
export type ObjectiveConfidence = 'not-confident' | 'somewhat' | 'confident';

export type StudyMaterialRole =
  | 'Lecture'
  | 'Textbook'
  | 'Reading'
  | 'Exercise'
  | 'Reference'
  | 'Supplement'
  | 'Recording';

export type StudyMaterialStatus = 'not-started' | 'reading' | 'complete' | 'reference-only';

export type StudyActivityType =
  | 'Reading'
  | 'Lecture'
  | 'Practice'
  | 'Review'
  | 'Flashcards'
  | 'Listening'
  | 'Speaking'
  | 'Writing'
  | 'Research'
  | 'Other';

export type AssessmentType =
  | 'quiz'
  | 'assignment'
  | 'mock-exam'
  | 'exam'
  | 'speaking-test'
  | 'self-test'
  | 'other';

export type AssessmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'submitted';

// ==========================================
// 1. COURSE RECORD (Derived from Note)
// ==========================================
export interface CourseRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  status: CourseStatus;
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  examDate?: string; // YYYY-MM-DD
  areaId?: string;
  areaTitle?: string;
  goalId?: string;
  goalTitle?: string;
  projectId?: string;
  projectTitle?: string;
  instructorIds: string[];
  instructorTitles: string[];
  organization?: string;
  level?: string;
  language?: string;
  currentModuleId?: string;
  progressMode: CourseProgressMode;
  manualProgress?: number; // 0 - 100
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. SKILL RECORD (Derived from Note)
// ==========================================
export interface SkillRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  status: SkillStatus;
  level?: string; // e.g. "Beginner", "Intermediate", "B1", "7/10"
  areaId?: string;
  areaTitle?: string;
  relatedCourseIds: string[];
  relatedCourseTitles: string[];
  evidenceNoteIds: string[];
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. LEARNING OBJECTIVE (Structured User Data)
// ==========================================
export interface LearningObjective {
  id: string;
  courseId?: string;
  skillIds?: string[];
  title: string;
  description?: string;
  status: ObjectiveStatus;
  confidence?: ObjectiveConfidence;
  sourceNoteIds?: string[];
  canonicalNoteId?: string; // If promoted to a full note
  completedAt?: string; // YYYY-MM-DD
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 4. CURRICULUM ITEM (Structured User Data)
// ==========================================
export interface CurriculumItem {
  id: string;
  courseId: string;
  parentId?: string; // If nested in module/section
  title: string;
  type: CurriculumItemType;
  status: CurriculumStatus;
  objectiveIds?: string[];
  linkedResourceIds?: string[]; // Note IDs, PDFs, References, Practice Sets
  externalUrl?: string;
  notes?: string;
  order: number;
  completedAt?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 5. STUDY MATERIAL LINK (Structured Config)
// ==========================================
export interface CourseStudyMaterial {
  id: string;
  courseId: string;
  resourceId: string;
  resourceType: 'note' | 'pdf' | 'reference' | 'media' | 'url' | 'practice-set';
  title: string;
  role: StudyMaterialRole;
  status: StudyMaterialStatus;
  url?: string;
  notes?: string;
  order: number;
}

// ==========================================
// 6. STUDY SESSION (Canonical Event Model)
// ==========================================
export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt?: number;
  durationMinutes: number;
  courseIds?: string[];
  courseTitles?: string[];
  skillIds?: string[];
  skillTitles?: string[];
  objectiveIds?: string[];
  activityType: StudyActivityType;
  note?: string;
  associatedNoteId?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 7. ASSESSMENT RECORD (Derived from Note)
// ==========================================
export interface AssessmentRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  assessmentType: AssessmentType;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  score?: number;
  scoreMax?: number;
  scorePercent?: number; // Calculated if score & scoreMax exist
  grade?: string;
  status: AssessmentStatus;
  objectiveIds: string[];
  objectiveTitles: string[];
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. PRACTICE SET RECORD (Derived from Note)
// ==========================================
export interface PracticeSetRecord {
  id: string; // Note ID
  noteId: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  topic?: string;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 9. COURSE STRUCTURED CONFIGURATION
// ==========================================
export interface CourseStructuredConfig {
  courseId: string; // Note ID
  curriculum: CurriculumItem[];
  objectives: LearningObjective[];
  materials: CourseStudyMaterial[];
  currentModuleId?: string;
  progressMode?: CourseProgressMode;
  manualProgress?: number;
  notesInboxId?: string;
  updatedAt: number;
}

// ==========================================
// 10. COURSE PROGRESS & EXAM PREP SUMMARY
// ==========================================
export interface CourseProgressSummary {
  mode: CourseProgressMode;
  totalCurriculum: number;
  completedCurriculum: number;
  totalObjectives: number;
  completedObjectives: number;
  percentage: number | null; // null if unconfigured/none
  displayText: string;
}

export interface ExamPrepSummary {
  courseId: string;
  courseTitle: string;
  examDate: string;
  daysRemaining: number;
  isPast: boolean;
  curriculumCompleted: number;
  curriculumTotal: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  openPracticeSetsCount: number;
  dueFlashcardsCount: number;
  openTasksCount: number;
  recentStudyMinutes: number;
  recentAssessments: Array<{
    id: string;
    title: string;
    score?: number;
    scoreMax?: number;
    scorePercent?: number;
    grade?: string;
    date: string;
    type: AssessmentType;
  }>;
}

// ==========================================
// 11. LEARNING SETTINGS
// ==========================================
export interface LearningSettings {
  defaultProgressMode: CourseProgressMode;
  defaultSessionDuration: number; // 30, 45, 60 minutes
  autoSuggestHabitMapping: boolean; // default false
  includeLearningInWeeklyReview: boolean; // default true
  exportWithPrivateGrades: boolean; // default false for safety
}

export const DEFAULT_LEARNING_SETTINGS: LearningSettings = {
  defaultProgressMode: 'curriculum',
  defaultSessionDuration: 45,
  autoSuggestHabitMapping: false,
  includeLearningInWeeklyReview: true,
  exportWithPrivateGrades: false,
};
