import { Note } from '../../types';
import { PropertyDefinition, PropertyDictionary, PropertyType } from './propertyTypes';
import { parseFrontmatterAST, inferPropertyType } from './frontmatterEngine';

/**
 * Builds a complete PropertyDictionary from a list of notes
 */
export function buildPropertyDictionary(notes: Note[]): PropertyDictionary {
  const dictionary: PropertyDictionary = {};

  for (const note of notes) {
    if (!note || note.trashed || !note.content) continue;

    const { ast } = parseFrontmatterAST(note.content);
    if (!ast.hasFrontmatter || ast.hasSyntaxError) continue;

    for (const [key, rawVal] of Object.entries(ast.properties)) {
      if (!key) continue;
      const cleanKey = key.trim();
      const inferred = inferPropertyType(cleanKey, rawVal);

      if (!dictionary[cleanKey]) {
        dictionary[cleanKey] = {
          key: cleanKey,
          type: inferred,
          inferredTypes: [inferred],
          usageCount: 1,
          commonValues: [],
          options: [],
          hasTypeConflict: false,
        };
      } else {
        const def = dictionary[cleanKey];
        def.usageCount++;
        if (!def.inferredTypes.includes(inferred)) {
          def.inferredTypes.push(inferred);
        }
        if (def.inferredTypes.length > 1) {
          def.hasTypeConflict = true;
        }
      }

      // Collect sample values & options
      const def = dictionary[cleanKey];
      if (typeof rawVal === 'string' && rawVal.trim()) {
        const strVal = rawVal.trim();
        if (!def.commonValues.includes(strVal) && def.commonValues.length < 15) {
          def.commonValues.push(strVal);
        }
        if (def.type === 'select' && !def.options?.includes(strVal)) {
          def.options = def.options || [];
          def.options.push(strVal);
        }
      } else if (Array.isArray(rawVal)) {
        for (const item of rawVal) {
          const itemStr = String(item).trim();
          if (itemStr && !def.commonValues.includes(itemStr) && def.commonValues.length < 15) {
            def.commonValues.push(itemStr);
          }
          if (def.type === 'multiselect') {
            def.options = def.options || [];
            if (!def.options.includes(itemStr)) {
              def.options.push(itemStr);
            }
          }
        }
      }
    }
  }

  // Pre-seed standard common properties if not found
  const standardProperties: { key: string; type: PropertyType; options?: string[] }[] = [
    { key: 'status', type: 'select', options: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
    { key: 'priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
    { key: 'due', type: 'date' },
    { key: 'tags', type: 'multiselect' },
    { key: 'aliases', type: 'multiselect' },
  ];

  for (const std of standardProperties) {
    if (!dictionary[std.key]) {
      dictionary[std.key] = {
        key: std.key,
        type: std.type,
        inferredTypes: [std.type],
        usageCount: 0,
        commonValues: [],
        options: std.options || [],
        hasTypeConflict: false,
      };
    } else if (std.options) {
      const def = dictionary[std.key];
      def.options = Array.from(new Set([...(def.options || []), ...std.options]));
    }
  }

  return dictionary;
}

/**
 * Returns available property keys for auto-completion
 */
export function getAvailablePropertyKeys(dictionary: PropertyDictionary): string[] {
  return Object.keys(dictionary).sort((a, b) => {
    const usageA = dictionary[a]?.usageCount || 0;
    const usageB = dictionary[b]?.usageCount || 0;
    return usageB - usageA;
  });
}
