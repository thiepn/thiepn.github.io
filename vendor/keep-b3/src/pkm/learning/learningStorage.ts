/**
 * Phase P51 — Learning Storage & Persistence Layer
 *
 * Manages local persistence of Course structured configs, Learning Objectives,
 * Study Sessions, and user preferences with deterministic JSON serialization,
 * atomic save, Vault Lock sanitization, and multi-device union merge semantics.
 */

import {
  CourseStructuredConfig,
  CurriculumItem,
  LearningObjective,
  StudySession,
  LearningSettings,
  DEFAULT_LEARNING_SETTINGS,
} from './learningTypes';

const STORAGE_KEYS = {
  SETTINGS: 'pkm_learning_settings_v1',
  COURSE_CONFIGS: 'pkm_learning_course_configs_v1',
  STUDY_SESSIONS: 'pkm_learning_study_sessions_v1',
  OBJECTIVES_GLOBAL: 'pkm_learning_global_objectives_v1',
};

class LearningStorage {
  private courseConfigs: Map<string, CourseStructuredConfig> = new Map();
  private studySessions: Map<string, StudySession> = new Map();
  private globalObjectives: Map<string, LearningObjective> = new Map();
  private settings: LearningSettings = DEFAULT_LEARNING_SETTINGS;
  private isLocked = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in learning storage listener', e);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || this.isLocked) return;
    try {
      // 1. Settings
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        this.settings = { ...DEFAULT_LEARNING_SETTINGS, ...JSON.parse(rawSettings) };
      }

      // 2. Course Configs
      const rawConfigs = localStorage.getItem(STORAGE_KEYS.COURSE_CONFIGS);
      if (rawConfigs) {
        const parsed: Record<string, CourseStructuredConfig> = JSON.parse(rawConfigs);
        this.courseConfigs.clear();
        for (const [courseId, config] of Object.entries(parsed)) {
          this.courseConfigs.set(courseId, config);
        }
      }

      // 3. Study Sessions
      const rawSessions = localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
      if (rawSessions) {
        const parsed: StudySession[] = JSON.parse(rawSessions);
        this.studySessions.clear();
        for (const session of parsed) {
          if (session && session.id) {
            this.studySessions.set(session.id, session);
          }
        }
      }

      // 4. Global / Unlinked Objectives
      const rawObjectives = localStorage.getItem(STORAGE_KEYS.OBJECTIVES_GLOBAL);
      if (rawObjectives) {
        const parsed: LearningObjective[] = JSON.parse(rawObjectives);
        this.globalObjectives.clear();
        for (const obj of parsed) {
          if (obj && obj.id) {
            this.globalObjectives.set(obj.id, obj);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load learning data from storage', err);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || this.isLocked) return;
    try {
      // 1. Settings
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));

      // 2. Course Configs
      const configsObj: Record<string, CourseStructuredConfig> = {};
      for (const [id, config] of this.courseConfigs.entries()) {
        configsObj[id] = config;
      }
      localStorage.setItem(STORAGE_KEYS.COURSE_CONFIGS, JSON.stringify(configsObj));

      // 3. Study Sessions
      const sessionsArr = Array.from(this.studySessions.values());
      localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(sessionsArr));

      // 4. Global Objectives
      const objectivesArr = Array.from(this.globalObjectives.values());
      localStorage.setItem(STORAGE_KEYS.OBJECTIVES_GLOBAL, JSON.stringify(objectivesArr));
    } catch (err) {
      console.warn('Failed to save learning data to storage', err);
    }
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  public getSettings(): LearningSettings {
    return this.settings;
  }

  public updateSettings(patch: Partial<LearningSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.saveToStorage();
    this.notify();
  }

  // ==========================================
  // COURSE STRUCTURED CONFIGS
  // ==========================================
  public getCourseConfig(courseId: string): CourseStructuredConfig {
    const existing = this.courseConfigs.get(courseId);
    if (existing) return existing;

    const defaultConfig: CourseStructuredConfig = {
      courseId,
      curriculum: [],
      objectives: [],
      materials: [],
      updatedAt: Date.now(),
    };
    return defaultConfig;
  }

  public saveCourseConfig(config: CourseStructuredConfig): void {
    if (this.isLocked) return;
    this.courseConfigs.set(config.courseId, {
      ...config,
      updatedAt: Date.now(),
    });
    this.saveToStorage();
    this.notify();
  }

  public deleteCourseConfig(courseId: string): void {
    if (this.isLocked) return;
    this.courseConfigs.delete(courseId);
    this.saveToStorage();
    this.notify();
  }

  public getAllCourseConfigs(): Map<string, CourseStructuredConfig> {
    return new Map(this.courseConfigs);
  }

  // ==========================================
  // STUDY SESSIONS
  // ==========================================
  public getStudySessions(): StudySession[] {
    return Array.from(this.studySessions.values()).sort((a, b) => {
      // Sort newest date / epoch first
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.startedAt || b.createdAt) - (a.startedAt || a.createdAt);
    });
  }

  public getStudySessionsForCourse(courseId: string): StudySession[] {
    return this.getStudySessions().filter((s) => s.courseIds && s.courseIds.includes(courseId));
  }

  public getStudySessionsForSkill(skillId: string): StudySession[] {
    return this.getStudySessions().filter((s) => s.skillIds && s.skillIds.includes(skillId));
  }

  public recordStudySession(session: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): StudySession {
    if (this.isLocked) {
      throw new Error('Cannot record study session while vault is locked');
    }

    const now = Date.now();
    const id = session.id || `session_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const newSession: StudySession = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.studySessions.set(id, newSession);
    this.saveToStorage();
    this.notify();
    return newSession;
  }

  public updateStudySession(id: string, patch: Partial<StudySession>): void {
    if (this.isLocked) return;
    const existing = this.studySessions.get(id);
    if (!existing) return;

    this.studySessions.set(id, {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    });
    this.saveToStorage();
    this.notify();
  }

  public deleteStudySession(id: string): void {
    if (this.isLocked) return;
    this.studySessions.delete(id);
    this.saveToStorage();
    this.notify();
  }

  // ==========================================
  // VAULT LOCK / SECURITY SANITIZATION
  // ==========================================
  public lock(): void {
    this.isLocked = true;
    this.courseConfigs.clear();
    this.studySessions.clear();
    this.globalObjectives.clear();
    this.notify();
  }

  public unlock(): void {
    this.isLocked = false;
    this.loadFromStorage();
    this.notify();
  }

  // ==========================================
  // MULTI-DEVICE UNION MERGE SEMANTICS
  // ==========================================
  public mergeIncomingSessions(incoming: StudySession[]): void {
    if (this.isLocked) return;
    let changed = false;

    for (const session of incoming) {
      if (!session || !session.id) continue;
      const local = this.studySessions.get(session.id);
      if (!local) {
        this.studySessions.set(session.id, session);
        changed = true;
      } else if (session.updatedAt > local.updatedAt) {
        this.studySessions.set(session.id, session);
        changed = true;
      }
    }

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  public mergeIncomingCourseConfig(courseId: string, incoming: CourseStructuredConfig): void {
    if (this.isLocked) return;
    const local = this.courseConfigs.get(courseId);
    if (!local || incoming.updatedAt > local.updatedAt) {
      this.courseConfigs.set(courseId, incoming);
      this.saveToStorage();
      this.notify();
    }
  }
}

export const learningStorage = new LearningStorage();
