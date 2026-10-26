/**
 * Person Timeline Aggregation Engine for Phase P48
 * 
 * Aggregates interactions, meetings, related tasks, and backlink events into
 * a clean, chronological timeline without recording surveillance/view metrics.
 */

import { Note } from '../../types';
import { InteractionRecord, PersonRecord, PersonTimelineItem } from './peopleTypes';
import { extractTasksFromNote } from '../tasks/taskParser';
import { parseCanonicalDate } from '../temporal/dateUtils';
import { parseTaskTemporalMetadata } from '../temporal/taskTemporalParser';

/**
 * Builds a derived, chronological timeline for a specific person
 */
export function buildPersonTimeline(options: {
  person: PersonRecord;
  allNotes: Note[];
  interactions: InteractionRecord[];
  filterType?: 'all' | 'interactions' | 'tasks' | 'meetings' | 'notes';
  limit?: number;
}): PersonTimelineItem[] {
  const { person, allNotes, interactions, filterType = 'all', limit = 100 } = options;
  const items: PersonTimelineItem[] = [];

  const personId = person.id;
  const personTitle = person.noteTitle.trim().toLowerCase();
  const personWikilink = `[[${person.noteTitle.trim().toLowerCase()}]]`;

  // 1. Interactions involving this person
  const relatedInteractions = interactions.filter(
    (i) => !i.isTrashed && (i.participantPersonIds.includes(personId) || i.participantTitles.some((t) => t.toLowerCase() === personTitle))
  );

  for (const inter of relatedInteractions) {
    if (filterType === 'tasks') continue;
    if (filterType === 'meetings' && inter.interactionType !== 'meeting') continue;

    items.push({
      id: `timeline-inter-${inter.id}`,
      date: inter.date,
      time: inter.time,
      type: inter.interactionType === 'meeting' ? 'meeting' : 'interaction',
      interactionType: inter.interactionType,
      title: inter.title,
      snippet: inter.summary,
      resourceId: inter.id,
      resourceType: 'note',
      participants: inter.participantPersonIds.map((id, idx) => ({
        id,
        name: inter.participantTitles[idx] || 'Participant',
      })),
    });
  }

  // 2. Tasks related to this person (inside Person note, or mentioning [[Person]] in other notes)
  if (filterType === 'all' || filterType === 'tasks') {
    for (const note of allNotes) {
      if (note.trashed) continue;
      const isPersonNote = note.id === person.id;
      const tasks = extractTasksFromNote(note);

      for (const t of tasks) {
        const textLower = t.text.toLowerCase();
        const isMentioned = textLower.includes(personWikilink) || textLower.includes(personTitle);

        if (isPersonNote || isMentioned) {
          const meta = parseTaskTemporalMetadata(t.rawLine || t.text);
          const taskDate = meta.dueDate || meta.scheduledDate || (note.updatedAt ? note.updatedAt.slice(0, 10) : '2026-09-07');
          const cleanDate = parseCanonicalDate(taskDate).dateOnly || '2026-09-07';

          items.push({
            id: `timeline-task-${t.id}`,
            date: cleanDate,
            type: 'task',
            title: meta.cleanText || t.text,
            completed: t.completed,
            resourceId: note.id,
            resourceType: 'task',
            snippet: isPersonNote ? undefined : `In note "${note.title}"`,
          });
        }
      }
    }
  }

  // 3. Notes explicitly mentioning or referencing this person (backlinks)
  if (filterType === 'all' || filterType === 'notes') {
    for (const note of allNotes) {
      if (note.id === person.id || note.trashed) continue;
      const contentLower = note.content.toLowerCase();
      // Check if note is not an interaction already listed
      if (relatedInteractions.some((i) => i.id === note.id)) continue;

      if (contentLower.includes(personWikilink)) {
        const dateStr = note.updatedAt ? note.updatedAt.slice(0, 10) : '2026-09-07';
        items.push({
          id: `timeline-ref-${note.id}`,
          date: dateStr,
          type: 'note-reference',
          title: `Mentioned in ${note.title}`,
          resourceId: note.id,
          resourceType: 'note',
          snippet: note.tags?.length ? `Tags: ${note.tags.join(', ')}` : undefined,
        });
      }
    }
  }

  // 4. Sort strictly descending by date (newest first)
  items.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.time && b.time) {
      return b.time.localeCompare(a.time);
    }
    return 0;
  });

  return items.slice(0, limit);
}
