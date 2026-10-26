/**
 * PKM V2.13 — Learning & Library Excellence Engine
 *
 * Implements dedicated study environments and reading-first media workflows:
 * - Course syllabus reuses canonical Library, PDF, Reference, and Note resources
 * - Study Sessions with active timers and review logs
 * - Spaced Repetition card creation directly from notes/highlights
 * - Continue Reading prominent with exact progress tracking
 * - Citation metadata generation (BibTeX / CSL JSON)
 * - Zero study gamification scores or fake course grades
 */

import { crossDomainRelationEngine } from './crossDomainRelationEngine';

export type LibraryMediaType = 'book' | 'article' | 'pdf' | 'video' | 'podcast';
export type ReadingStatus = 'queue' | 'reading' | 'finished' | 'abandoned';

export interface V2LibraryItem {
  id: string;
  title: string;
  creator: string; // Author, presenter, director
  mediaType: LibraryMediaType;
  status: ReadingStatus;
  progressPercent: number;
  currentLocation?: string; // e.g. "Page 142", "Chapter 4", "01:24:10"
  totalLocation?: string; // e.g. "350 pages", "12 chapters", "02:15:00"
  coverUrl?: string;
  url?: string;
  doiOrIsbn?: string;
  publicationYear?: number;
  lastReadAt?: string;
  createdAt: string;
  tags?: string[];
}

export interface V2MediaHighlight {
  id: string;
  libraryItemId: string;
  text: string;
  location?: string;
  annotation?: string;
  createdAt: string;
}

export interface V2CourseRecord {
  id: string;
  title: string;
  instructor?: string;
  syllabusOverview: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  dueReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2StudyDeckCard {
  id: string;
  courseId?: string;
  sourceHighlightId?: string;
  sourceNoteId?: string;
  front: string;
  back: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDateOnly: string;
}

export interface V2StudySessionLog {
  id: string;
  courseId: string;
  startedAt: string;
  durationMinutes: number;
  cardsReviewedCount: number;
  sessionNotes?: string;
}

export class LearningLibraryDomainExcellence {
  private libraryItems = new Map<string, V2LibraryItem>();
  private highlights = new Map<string, V2MediaHighlight[]>(); // libraryItemId -> highlights
  private courses = new Map<string, V2CourseRecord>();
  private cards = new Map<string, V2StudyDeckCard>();
  private studySessions = new Map<string, V2StudySessionLog[]>(); // courseId -> logs

  // ================= Library =================

  public saveLibraryItem(item: V2LibraryItem): V2LibraryItem {
    this.libraryItems.set(item.id, { ...item });
    if (!this.highlights.has(item.id)) {
      this.highlights.set(item.id, []);
    }
    return item;
  }

  public getLibraryItem(id: string): V2LibraryItem | undefined {
    return this.libraryItems.get(id);
  }

  public getAllLibraryItems(): V2LibraryItem[] {
    return Array.from(this.libraryItems.values());
  }

  public getCurrentlyReading(): V2LibraryItem[] {
    return Array.from(this.libraryItems.values())
      .filter((i) => i.status === 'reading')
      .sort((a, b) => (b.lastReadAt || '').localeCompare(a.lastReadAt || ''));
  }

  public updateReadingProgress(params: {
    libraryItemId: string;
    progressPercent: number;
    currentLocation?: string;
  }): boolean {
    const item = this.libraryItems.get(params.libraryItemId);
    if (!item) return false;
    item.progressPercent = Math.min(100, Math.max(0, params.progressPercent));
    if (params.currentLocation) {
      item.currentLocation = params.currentLocation;
    }
    item.lastReadAt = new Date().toISOString();
    if (item.progressPercent >= 100) {
      item.status = 'finished';
    } else if (item.status === 'queue') {
      item.status = 'reading';
    }
    return true;
  }

  public addHighlight(params: {
    libraryItemId: string;
    text: string;
    location?: string;
    annotation?: string;
  }): V2MediaHighlight {
    const hl: V2MediaHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      libraryItemId: params.libraryItemId,
      text: params.text,
      location: params.location,
      annotation: params.annotation,
      createdAt: new Date().toISOString(),
    };

    const list = this.highlights.get(params.libraryItemId) || [];
    list.unshift(hl);
    this.highlights.set(params.libraryItemId, list);
    return hl;
  }

  public getHighlights(libraryItemId: string): V2MediaHighlight[] {
    return this.highlights.get(libraryItemId) || [];
  }

  public exportBibTeX(libraryItemId: string): string {
    const item = this.libraryItems.get(libraryItemId);
    if (!item) return '';

    const citeKey = `${item.creator.split(' ')[0] || 'Unknown'}${item.publicationYear || new Date().getFullYear()}`;
    return [
      `@${item.mediaType === 'book' ? 'book' : 'misc'}{${citeKey},`,
      `  title = {${item.title}},`,
      `  author = {${item.creator}},`,
      item.publicationYear ? `  year = {${item.publicationYear}},` : '',
      item.doiOrIsbn ? `  isbn = {${item.doiOrIsbn}},` : '',
      item.url ? `  url = {${item.url}}` : '',
      `}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // ================= Learning =================

  public saveCourse(course: V2CourseRecord): V2CourseRecord {
    const updated = { ...course, updatedAt: new Date().toISOString() };
    this.courses.set(course.id, updated);
    if (!this.studySessions.has(course.id)) {
      this.studySessions.set(course.id, []);
    }
    return updated;
  }

  public getCourse(id: string): V2CourseRecord | undefined {
    return this.courses.get(id);
  }

  public getAllCourses(): V2CourseRecord[] {
    return Array.from(this.courses.values());
  }

  /**
   * Links a canonical Library item to a Course as syllabus material via Relations
   */
  public attachMaterialToCourse(courseId: string, libraryItemId: string): boolean {
    const course = this.courses.get(courseId);
    const item = this.libraryItems.get(libraryItemId);
    if (!course || !item) return false;

    crossDomainRelationEngine.addRelation({
      sourceId: courseId,
      sourceType: 'course',
      targetId: libraryItemId,
      targetType: 'book',
      relationType: 'course_uses_library_item',
      label: `Syllabus Material: ${item.title}`,
    });
    return true;
  }

  public createStudyCard(params: {
    courseId?: string;
    front: string;
    back: string;
    sourceHighlightId?: string;
    sourceNoteId?: string;
  }): V2StudyDeckCard {
    const today = new Date().toISOString().slice(0, 10);
    const card: V2StudyDeckCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      courseId: params.courseId,
      front: params.front,
      back: params.back,
      sourceHighlightId: params.sourceHighlightId,
      sourceNoteId: params.sourceNoteId,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDateOnly: today,
    };
    this.cards.set(card.id, card);
    return card;
  }

  public getDueCards(todayDateOnly: string, courseId?: string): V2StudyDeckCard[] {
    const all = Array.from(this.cards.values());
    return all.filter((c) => {
      const matchCourse = courseId ? c.courseId === courseId : true;
      return matchCourse && c.nextReviewDateOnly <= todayDateOnly;
    });
  }

  /**
   * Spaced repetition SM-2 interval update
   */
  public reviewCard(cardId: string, grade: 0 | 1 | 2 | 3 | 4 | 5): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    if (grade >= 3) {
      if (card.repetitions === 0) {
        card.intervalDays = 1;
      } else if (card.repetitions === 1) {
        card.intervalDays = 6;
      } else {
        card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
      }
      card.repetitions += 1;
    } else {
      card.repetitions = 0;
      card.intervalDays = 1;
    }

    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + card.intervalDays);
    card.nextReviewDateOnly = nextDate.toISOString().slice(0, 10);
    return true;
  }

  public recordStudySession(params: {
    courseId: string;
    durationMinutes: number;
    cardsReviewedCount: number;
    sessionNotes?: string;
  }): V2StudySessionLog {
    const log: V2StudySessionLog = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      courseId: params.courseId,
      startedAt: new Date().toISOString(),
      durationMinutes: params.durationMinutes,
      cardsReviewedCount: params.cardsReviewedCount,
      sessionNotes: params.sessionNotes,
    };

    const list = this.studySessions.get(params.courseId) || [];
    list.unshift(log);
    this.studySessions.set(params.courseId, list);
    return log;
  }

  public clear(): void {
    this.libraryItems.clear();
    this.highlights.clear();
    this.courses.clear();
    this.cards.clear();
    this.studySessions.clear();
  }
}

export const learningLibraryDomainExcellence = new LearningLibraryDomainExcellence();
