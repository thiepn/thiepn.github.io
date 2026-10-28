/** Source-note classification shared by Planning and KEEP's cross-domain index. */
import type { Note } from '../../types';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';

export type PlanningNoteKind = 'goal' | 'project' | 'area' | 'review';
export function classifyPlanningNote(note: Pick<Note, 'content' | 'tags'>): PlanningNoteKind | null {
  const props = parseFrontmatterAST(note.content || '').ast.properties || {};
  const kind = String(props.type || '').toLowerCase().trim();
  const tags = (note.tags || []).map(tag => tag.toLowerCase().trim().replace(/^#/, ''));
  if (kind === 'goal' || tags.includes('goal')) return 'goal';
  if (kind === 'project' || tags.includes('project')) return 'project';
  if (kind === 'area' || tags.includes('area')) return 'area';
  if (['review', 'weekly-review', 'monthly-review'].includes(kind) || tags.includes('review') || tags.includes('weekly-review')) return 'review';
  return null;
}
