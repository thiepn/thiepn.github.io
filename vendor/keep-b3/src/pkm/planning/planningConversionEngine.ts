/**
 * Phase P49 — Planning Note Conversion Engine
 * 
 * Safely converts ordinary notes or quick captures to canonical Projects, Goals,
 * or Areas.
 * 
 * Non-negotiable principle: NEVER replaces or deletes the existing note body.
 * Surgically adds canonical frontmatter properties and optional outline headings
 * only if requested and missing.
 */

import { Note } from '../../types';
import { updateFrontmatter } from '../properties/frontmatterEngine';

export interface ConvertToPlanningParams {
  note: Note;
  targetType: 'project' | 'goal' | 'area';
  initialProperties?: Record<string, unknown>;
  appendTemplateHeadings?: boolean;
}

export function convertNoteToPlanning(params: ConvertToPlanningParams): {
  updatedContent: string;
  tags: string[];
} {
  const { note, targetType, initialProperties = {}, appendTemplateHeadings = false } = params;

  let content = note.content || '';
  const existingTags = note.tags ? [...note.tags] : [];

  if (!existingTags.includes(targetType)) {
    existingTags.push(targetType);
  }

  // 1. Prepare frontmatter updates
  const frontmatterUpdates: Record<string, unknown> = {
    type: targetType,
    status: targetType === 'area' ? 'active' : (initialProperties.status || 'active'),
    ...initialProperties,
  };

  // 2. Apply frontmatter update surgically
  content = updateFrontmatter(content, frontmatterUpdates);

  // 3. Optionally append default outline sections if missing
  if (appendTemplateHeadings) {
    if (targetType === 'project') {
      if (!content.includes('## Next Actions') && !content.includes('## Tasks')) {
        content += '\n\n## Next Actions\n- [ ] Initial planning step\n\n## Notes\n';
      }
    } else if (targetType === 'goal') {
      if (!content.includes('## Success Criteria') && !content.includes('## Outcome')) {
        content += '\n\n## Outcome\n\n## Success Criteria\n\n## Projects\n';
      }
    } else if (targetType === 'area') {
      if (!content.includes('## Responsibilities') && !content.includes('## Standards')) {
        content += '\n\n## Responsibilities\n\n## Standards\n\n## Projects\n';
      }
    }
  }

  return {
    updatedContent: content,
    tags: existingTags,
  };
}
