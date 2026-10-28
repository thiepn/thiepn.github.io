/**
 * Rollup Engine for Phase P43
 * 
 * Computes derived aggregate values across related notes.
 * Supports direct relations and derived inverse relations.
 */

import { Note } from '../../types';
import { parseFrontmatterAST, formatDateOnly, isDateOnlyString } from '../properties/frontmatterEngine';
import { RollupConfig, RollupOperation } from './collectionTypes';
import { resolveRelationTargets } from './relationEngine';
import { relationIndex } from './relationIndex';

export interface RollupEvaluationResult {
  value: any;
  type: 'number' | 'text' | 'boolean' | 'date' | 'array' | 'null';
  count: number;
  error?: string;
}

/**
 * Extracts a target property value from a note (handles frontmatter properties and system fields like 'title')
 */
function extractNotePropertyValue(note: Note, propertyKey: string): any {
  if (!note) return null;

  if (propertyKey === 'title') return note.title;
  if (propertyKey === 'createdAt' || propertyKey === 'created') return note.createdAt;
  if (propertyKey === 'updatedAt' || propertyKey === 'updated') return note.updatedAt;
  if (propertyKey === 'tags') return note.tags || [];
  if (propertyKey === 'folderId' || propertyKey === 'folder') return note.folderId;

  if (!note.content) return null;
  const { ast } = parseFrontmatterAST(note.content);
  if (!ast.hasFrontmatter || ast.hasSyntaxError) return null;

  // Direct key lookup or case-insensitive
  if (Object.prototype.hasOwnProperty.call(ast.properties, propertyKey)) {
    return ast.properties[propertyKey];
  }
  const lower = propertyKey.toLowerCase();
  for (const [k, v] of Object.entries(ast.properties)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

/**
 * Evaluates a rollup on a source note
 */
export function evaluateRollup(
  sourceNote: Note,
  config: RollupConfig,
  allNotes: Note[]
): RollupEvaluationResult {
  if (!sourceNote || !config || !config.relationPropertyId || !config.targetPropertyId) {
    return { value: null, type: 'null', count: 0, error: 'Incomplete rollup configuration' };
  }

  const noteMap = new Map(allNotes.map((n) => [n.id, n]));
  let relatedNotes: Note[] = [];

  // 1. Check if it's an inverse relation (e.g. '__inverse:client' or incoming relation)
  if (config.relationPropertyId.startsWith('__inverse:')) {
    const propKey = config.relationPropertyId.slice(10);
    const incoming = relationIndex.getIncomingRelations(sourceNote.id, propKey);
    relatedNotes = incoming
      .map((e) => noteMap.get(e.sourceNoteId))
      .filter((n): n is Note => Boolean(n && !n.trashed));
  } else {
    // 2. Direct relation from source note's frontmatter
    const rawRelationVal = extractNotePropertyValue(sourceNote, config.relationPropertyId);
    const targets = resolveRelationTargets(rawRelationVal, allNotes);
    relatedNotes = targets
      .map((t) => (t.targetNoteId ? noteMap.get(t.targetNoteId) : null))
      .filter((n): n is Note => Boolean(n && !n.trashed));
  }

  const relatedCount = relatedNotes.length;
  if (relatedCount === 0) {
    // Return standard empty values based on operation
    switch (config.operation) {
      case 'count':
      case 'count_non_empty':
      case 'sum':
        return { value: 0, type: 'number', count: 0 };
      case 'any':
      case 'all':
        return { value: false, type: 'boolean', count: 0 };
      default:
        return { value: null, type: 'null', count: 0 };
    }
  }

  // Extract values from related notes
  const targetValues = relatedNotes.map((n) => extractNotePropertyValue(n, config.targetPropertyId));

  switch (config.operation) {
    case 'count': {
      return { value: relatedCount, type: 'number', count: relatedCount };
    }

    case 'count_non_empty': {
      const nonEmpty = targetValues.filter((v) => v !== null && v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0));
      return { value: nonEmpty.length, type: 'number', count: relatedCount };
    }

    case 'sum': {
      const numbers = targetValues.filter((v) => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
      if (numbers.length === 0) return { value: 0, type: 'number', count: relatedCount };
      const sumVal = numbers.reduce((acc, curr) => acc + curr, 0);
      return { value: sumVal, type: 'number', count: relatedCount };
    }

    case 'average': {
      const numbers = targetValues.filter((v) => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
      if (numbers.length === 0) return { value: null, type: 'null', count: relatedCount };
      const sumVal = numbers.reduce((acc, curr) => acc + curr, 0);
      const avg = sumVal / numbers.length;
      return { value: avg, type: 'number', count: relatedCount };
    }

    case 'min': {
      const numbers = targetValues.filter((v) => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
      if (numbers.length === 0) return { value: null, type: 'null', count: relatedCount };
      return { value: Math.min(...numbers), type: 'number', count: relatedCount };
    }

    case 'max': {
      const numbers = targetValues.filter((v) => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
      if (numbers.length === 0) return { value: null, type: 'null', count: relatedCount };
      return { value: Math.max(...numbers), type: 'number', count: relatedCount };
    }

    case 'earliest': {
      const dates = targetValues
        .map((v) => formatDateOnly(v))
        .filter((d) => d && isDateOnlyString(d))
        .sort();
      return { value: dates.length > 0 ? dates[0] : null, type: 'date', count: relatedCount };
    }

    case 'latest': {
      const dates = targetValues
        .map((v) => formatDateOnly(v))
        .filter((d) => d && isDateOnlyString(d))
        .sort();
      return { value: dates.length > 0 ? dates[dates.length - 1] : null, type: 'date', count: relatedCount };
    }

    case 'any': {
      const hasAny = targetValues.some((v) => Boolean(v));
      return { value: hasAny, type: 'boolean', count: relatedCount };
    }

    case 'all': {
      const hasAll = targetValues.every((v) => Boolean(v));
      return { value: hasAll, type: 'boolean', count: relatedCount };
    }

    case 'unique_values': {
      const unique = new Set<string>();
      for (const val of targetValues) {
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (item) unique.add(String(item));
          });
        } else if (val !== null && val !== undefined && val !== '') {
          unique.add(String(val));
        }
      }
      return { value: Array.from(unique), type: 'array', count: relatedCount };
    }

    case 'join': {
      const delimiter = config.delimiter || ', ';
      const flatStrings: string[] = [];
      for (const val of targetValues) {
        if (Array.isArray(val)) {
          flatStrings.push(...val.map(String));
        } else if (val !== null && val !== undefined && val !== '') {
          flatStrings.push(String(val));
        }
      }
      return { value: flatStrings.join(delimiter), type: 'text', count: relatedCount };
    }

    default:
      return { value: null, type: 'null', count: relatedCount, error: `Unsupported rollup operation '${config.operation}'` };
  }
}
