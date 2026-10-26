/**
 * Phase P51 — Learning Data Export Utilities
 *
 * Provides privacy-conscious CSV and JSON export routines for Study Sessions,
 * Course Curricula, Learning Objectives, and Assessments.
 */

import { StudySession, CourseRecord, LearningObjective, AssessmentRecord } from './learningTypes';

export function exportStudySessionsToCSV(sessions: StudySession[]): string {
  const headers = ['ID', 'Date', 'Duration (min)', 'Activity Type', 'Course IDs', 'Course Titles', 'Skill Titles', 'Note'];
  const rows = sessions.map((s) => [
    s.id,
    s.date,
    s.durationMinutes.toString(),
    `"${(s.activityType || '').replace(/"/g, '""')}"`,
    `"${(s.courseIds || []).join('; ')}"`,
    `"${(s.courseTitles || []).join('; ').replace(/"/g, '""')}"`,
    `"${(s.skillTitles || []).join('; ').replace(/"/g, '""')}"`,
    `"${(s.note || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportLearningObjectivesToCSV(objectives: LearningObjective[]): string {
  const headers = ['ID', 'Course ID', 'Title', 'Status', 'Confidence', 'Completed Date', 'Description'];
  const rows = objectives.map((obj) => [
    obj.id,
    obj.courseId || '',
    `"${(obj.title || '').replace(/"/g, '""')}"`,
    obj.status,
    obj.confidence || '',
    obj.completedAt || '',
    `"${(obj.description || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportCourseSummaryToMarkdown(
  course: CourseRecord,
  objectives: LearningObjective[],
  sessions: StudySession[],
  assessments: AssessmentRecord[]
): string {
  const totalStudyMin = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalHours = Math.floor(totalStudyMin / 60);
  const remMinutes = totalStudyMin % 60;
  const timeStr = `${totalHours}h ${remMinutes}m`;

  const completedObjs = objectives.filter((o) => o.status === 'complete').length;

  let md = `# Course Summary: ${course.title}\n\n`;
  md += `**Status:** ${course.status}\n`;
  if (course.areaTitle) md += `**Area:** [[${course.areaTitle}]]\n`;
  if (course.goalTitle) md += `**Goal:** [[${course.goalTitle}]]\n`;
  if (course.examDate) md += `**Exam Date:** ${course.examDate}\n`;
  md += `**Total Recorded Study Time:** ${timeStr} across ${sessions.length} sessions\n`;
  md += `**Objectives:** ${completedObjs} of ${objectives.length} complete\n\n`;

  md += `## Learning Objectives\n\n`;
  if (objectives.length === 0) {
    md += `_No structured learning objectives recorded._\n\n`;
  } else {
    for (const obj of objectives) {
      const mark = obj.status === 'complete' ? '[x]' : '[ ]';
      md += `- ${mark} **${obj.title}** (${obj.status}${obj.completedAt ? ` - completed ${obj.completedAt}` : ''})\n`;
      if (obj.description) {
        md += `  > ${obj.description}\n`;
      }
    }
    md += '\n';
  }

  md += `## Assessments & Milestone History\n\n`;
  if (assessments.length === 0) {
    md += `_No assessment notes linked._\n\n`;
  } else {
    for (const a of assessments) {
      const scoreStr = a.score !== undefined ? `${a.score}${a.scoreMax ? ` / ${a.scoreMax}` : ''}${a.scorePercent !== undefined ? ` (${a.scorePercent}%)` : ''}` : a.grade || 'No numerical score';
      md += `- **${a.title}** (${a.assessmentType}, ${a.date}): ${scoreStr}\n`;
    }
    md += '\n';
  }

  md += `## Recent Study Sessions\n\n`;
  if (sessions.length === 0) {
    md += `_No study sessions logged yet._\n\n`;
  } else {
    for (const s of sessions.slice(0, 10)) {
      md += `- **${s.date}** — ${s.activityType} (${s.durationMinutes} min)${s.note ? `: ${s.note}` : ''}\n`;
    }
  }

  return md;
}
