/**
 * Phase P36: Automation Condition Evaluator
 * Pure, deterministic evaluation of typed conditions against notes, properties, tasks, captures, and origins.
 */

import { Note, Folder } from '../../types';
import {
  AutomationCondition,
  CanonicalDomainEvent,
  ConditionTrace,
} from './automationTypes';
import { parseFrontmatterAST, formatDateOnly } from '../properties/frontmatterEngine';
import { extractTasksFromNote } from '../tasks/taskParser';
import { isDailyNote, DEFAULT_DAILY_NOTES_SETTINGS } from '../dailyNotes/dailyNotesTypes';

export interface ConditionEvaluationContext {
  note?: Note | null;
  folders?: Folder[];
  event?: CanonicalDomainEvent | null;
  referenceData?: {
    id: string;
    title: string;
    citationKey: string;
    type: string;
    hasPdf: boolean;
  } | null;
}

/**
 * Checks if folderA is under folderB in folder tree hierarchy
 */
export function isFolderUnder(
  childFolderId: string | null | undefined,
  ancestorFolderId: string | null | undefined,
  folders: Folder[] = []
): boolean {
  if (!childFolderId || !ancestorFolderId) return false;
  if (childFolderId === ancestorFolderId) return true;

  // Walk up parent chain if folders have parent links, or match directly
  let current: Folder | undefined = folders.find((f) => f.id === childFolderId);
  const visited = new Set<string>();

  while (current && current.id && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.id === ancestorFolderId) return true;
    if ((current as any).parentId) {
      current = folders.find((f) => f.id === (current as any).parentId);
    } else {
      break;
    }
  }

  return false;
}

/**
 * Compares two values safely with type awareness
 */
export function evaluatePropertyComparison(
  actual: any,
  operator: string = '==',
  expected: any
): boolean {
  if (operator === 'exists') {
    return actual !== undefined && actual !== null && actual !== '';
  }

  // Handle missing/undefined
  if (actual === undefined || actual === null) {
    if (operator === '!=') return expected !== undefined && expected !== null && expected !== '';
    return expected === undefined || expected === null || expected === '';
  }

  // Handle boolean
  if (typeof actual === 'boolean' || typeof expected === 'boolean') {
    const actBool = Boolean(actual);
    const expBool = typeof expected === 'boolean' ? expected : String(expected).toLowerCase() === 'true';
    return operator === '!=' ? actBool !== expBool : actBool === expBool;
  }

  // Handle numeric comparison
  if (typeof actual === 'number' || (!isNaN(Number(actual)) && typeof expected === 'number')) {
    const actNum = Number(actual);
    const expNum = Number(expected);
    if (isNaN(actNum) || isNaN(expNum)) return false;
    switch (operator) {
      case '==':
        return actNum === expNum;
      case '!=':
        return actNum !== expNum;
      case '>':
        return actNum > expNum;
      case '<':
        return actNum < expNum;
      case '>=':
        return actNum >= expNum;
      case '<=':
        return actNum <= expNum;
      default:
        return actNum === expNum;
    }
  }

  // Handle date comparisons (YYYY-MM-DD or ISO)
  if (operator === 'before' || operator === 'after' || operator === 'is_today' || operator === 'within_days') {
    const actDate = new Date(String(actual));
    if (isNaN(actDate.getTime())) return false;

    const now = new Date();
    const todayStr = formatDateOnly(now);
    const actDateStr = formatDateOnly(actDate);

    if (operator === 'is_today') {
      return actDateStr === todayStr;
    }
    if (operator === 'before') {
      const expDate = expected ? new Date(String(expected)) : now;
      return actDate.getTime() < expDate.getTime();
    }
    if (operator === 'after') {
      const expDate = expected ? new Date(String(expected)) : now;
      return actDate.getTime() > expDate.getTime();
    }
    if (operator === 'within_days') {
      const days = Number(expected) || 7;
      const diffMs = Math.abs(actDate.getTime() - now.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= days;
    }
  }

  // Handle Arrays (e.g. multiselect tags or lists)
  if (Array.isArray(actual)) {
    const expStr = String(expected).toLowerCase().trim();
    const hasItem = actual.some((item) => String(item).toLowerCase().trim() === expStr);
    if (operator === 'contains' || operator === '==') return hasItem;
    if (operator === '!=') return !hasItem;
    return hasItem;
  }

  // String comparison (case-insensitive for equals/contains)
  const actStr = String(actual).toLowerCase().trim();
  const expStr = String(expected).toLowerCase().trim();

  switch (operator) {
    case '==':
      return actStr === expStr;
    case '!=':
      return actStr !== expStr;
    case 'contains':
      return actStr.includes(expStr);
    case 'starts_with':
      return actStr.startsWith(expStr);
    default:
      return actStr === expStr;
  }
}

/**
 * Evaluates a single condition and generates a diagnostic trace item
 */
export function evaluateSingleCondition(
  condition: AutomationCondition,
  context: ConditionEvaluationContext
): ConditionTrace {
  const note = context.note;
  const event = context.event;
  const folders = context.folders || [];
  let passed = false;
  let actualValue: any = undefined;
  let description = '';

  switch (condition.type) {
    case 'folder_equals': {
      actualValue = note?.folderId || null;
      const expected = condition.value || null;
      passed = actualValue === expected;
      description = `Folder equals "${expected || 'Root/Unassigned'}"`;
      break;
    }

    case 'folder_under': {
      actualValue = note?.folderId || null;
      const expected = condition.value;
      passed = isFolderUnder(actualValue, expected, folders);
      description = `Folder is under folder ID "${expected}"`;
      break;
    }

    case 'title_contains': {
      actualValue = note?.title || '';
      const query = String(condition.value || '').toLowerCase().trim();
      passed = actualValue.toLowerCase().includes(query);
      description = `Title contains "${condition.value}"`;
      break;
    }

    case 'title_starts_with': {
      actualValue = note?.title || '';
      const prefix = String(condition.value || '').toLowerCase().trim();
      passed = actualValue.toLowerCase().startsWith(prefix);
      description = `Title starts with "${condition.value}"`;
      break;
    }

    case 'is_daily_note': {
      actualValue = note ? isDailyNote(note, DEFAULT_DAILY_NOTES_SETTINGS) : false;
      const expected = condition.value !== false;
      passed = actualValue === expected;
      description = `Note is daily note == ${expected}`;
      break;
    }

    case 'is_template': {
      actualValue = note ? Boolean(note.tags?.includes('template') || note.title.toLowerCase().includes('template')) : false;
      passed = actualValue === Boolean(condition.value !== false);
      description = `Note is template == ${condition.value !== false}`;
      break;
    }

    case 'has_attachments': {
      const imgCount = note?.images?.length || 0;
      const audioCount = note?.audios?.length || 0;
      actualValue = imgCount + audioCount > 0;
      passed = actualValue === Boolean(condition.value !== false);
      description = `Note has attachments == ${condition.value !== false}`;
      break;
    }

    case 'has_open_tasks': {
      if (!note) {
        passed = false;
        actualValue = false;
      } else {
        const tasks = extractTasksFromNote(note);
        const openCount = tasks.filter((t) => !t.completed).length;
        actualValue = openCount > 0;
        passed = actualValue === Boolean(condition.value !== false);
      }
      description = `Note has open tasks == ${condition.value !== false}`;
      break;
    }

    case 'is_archived': {
      actualValue = Boolean(note?.archived);
      passed = actualValue === Boolean(condition.value !== false);
      description = `Note is archived == ${condition.value !== false}`;
      break;
    }

    case 'is_pinned': {
      actualValue = Boolean(note?.pinned);
      passed = actualValue === Boolean(condition.value !== false);
      description = `Note is pinned == ${condition.value !== false}`;
      break;
    }

    case 'is_trashed': {
      actualValue = Boolean(note?.trashed);
      passed = actualValue === Boolean(condition.value !== false);
      description = `Note is trashed == ${condition.value !== false}`;
      break;
    }

    case 'has_tag': {
      const tagToFind = String(condition.value || '').toLowerCase().replace(/^#/, '');
      const noteTags = (note?.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
      actualValue = noteTags;
      passed = noteTags.includes(tagToFind);
      description = `Has tag "#${tagToFind}"`;
      break;
    }

    case 'does_not_have_tag': {
      const tagToFind = String(condition.value || '').toLowerCase().replace(/^#/, '');
      const noteTags = (note?.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
      actualValue = noteTags;
      passed = !noteTags.includes(tagToFind);
      description = `Does not have tag "#${tagToFind}"`;
      break;
    }

    case 'property_exists': {
      const propKey = condition.field || '';
      if (!note || !propKey) {
        passed = false;
        actualValue = undefined;
      } else {
        const { ast } = parseFrontmatterAST(note.content || '');
        actualValue = ast.properties[propKey];
        passed = actualValue !== undefined && actualValue !== null && actualValue !== '';
      }
      description = `Property "${propKey}" exists`;
      break;
    }

    case 'property_equals':
    case 'property_not_equals':
    case 'property_numeric_cmp':
    case 'property_date_cmp': {
      const propKey = condition.field || '';
      if (!note || !propKey) {
        passed = false;
        actualValue = undefined;
      } else {
        const { ast } = parseFrontmatterAST(note.content || '');
        actualValue = ast.properties[propKey];
        const op = condition.operator || (condition.type === 'property_not_equals' ? '!=' : '==');
        passed = evaluatePropertyComparison(actualValue, op, condition.value);
      }
      description = `Property "${propKey}" ${condition.operator || '=='} "${condition.value}"`;
      break;
    }

    case 'all_tasks_completed': {
      if (!note) {
        passed = false;
        actualValue = false;
      } else {
        const tasks = extractTasksFromNote(note);
        if (tasks.length === 0) {
          passed = false;
          actualValue = 'No tasks in note';
        } else {
          const openTasks = tasks.filter((t) => !t.completed);
          actualValue = openTasks.length === 0;
          passed = openTasks.length === 0;
        }
      }
      description = `All tasks completed in note`;
      break;
    }

    case 'open_task_count': {
      if (!note) {
        passed = false;
        actualValue = 0;
      } else {
        const tasks = extractTasksFromNote(note);
        const openTasks = tasks.filter((t) => !t.completed);
        actualValue = openTasks.length;
        const op = condition.operator || '==';
        passed = evaluatePropertyComparison(actualValue, op, Number(condition.value));
      }
      description = `Open task count ${condition.operator || '=='} ${condition.value}`;
      break;
    }

    case 'has_pdf': {
      const ref = context.referenceData;
      actualValue = Boolean(ref?.hasPdf);
      passed = actualValue === Boolean(condition.value !== false);
      description = `Reference has PDF attachment == ${condition.value !== false}`;
      break;
    }

    case 'reference_type_equals': {
      const ref = context.referenceData;
      actualValue = ref?.type || '';
      const exp = String(condition.value || '').toLowerCase().trim();
      passed = String(actualValue).toLowerCase().trim() === exp;
      description = `Reference type equals "${condition.value}"`;
      break;
    }

    case 'source_host_contains': {
      const host = event?.captureData?.sourceHost || '';
      actualValue = host;
      const query = String(condition.value || '').toLowerCase().trim();
      passed = host.toLowerCase().includes(query);
      description = `Capture host contains "${condition.value}"`;
      break;
    }

    case 'source_url_contains': {
      const url = event?.captureData?.sourceUrl || '';
      actualValue = url;
      const query = String(condition.value || '').toLowerCase().trim();
      passed = url.toLowerCase().includes(query);
      description = `Capture URL contains "${condition.value}"`;
      break;
    }

    case 'capture_type_equals': {
      actualValue = event?.captureData?.captureType || '';
      passed = String(actualValue).toLowerCase() === String(condition.value || '').toLowerCase();
      description = `Capture type equals "${condition.value}"`;
      break;
    }

    case 'origin_equals': {
      actualValue = event?.origin || 'user';
      passed = actualValue === condition.value;
      description = `Event origin equals "${condition.value}"`;
      break;
    }

    case 'origin_in': {
      actualValue = event?.origin || 'user';
      const arr = Array.isArray(condition.value) ? condition.value : [condition.value];
      passed = arr.includes(actualValue);
      description = `Event origin in [${arr.join(', ')}]`;
      break;
    }

    default:
      passed = true;
      description = `Unknown condition ${condition.type}`;
  }

  // Handle negation if specified
  if (condition.negate) {
    passed = !passed;
    description = `NOT (${description})`;
  }

  return {
    conditionId: condition.id,
    conditionType: condition.type,
    passed,
    actualValue,
    expectedValue: condition.value,
    description,
  };
}

/**
 * Evaluates a list of conditions with 'ALL' or 'ANY' group operator
 */
export function evaluateConditionGroup(
  conditions: AutomationCondition[],
  groupOp: 'ALL' | 'ANY',
  context: ConditionEvaluationContext
): { passed: boolean; traces: ConditionTrace[] } {
  if (!conditions || conditions.length === 0) {
    return { passed: true, traces: [] };
  }

  const traces: ConditionTrace[] = conditions.map((c) => evaluateSingleCondition(c, context));

  const passed =
    groupOp === 'ANY'
      ? traces.some((t) => t.passed)
      : traces.every((t) => t.passed);

  return { passed, traces };
}
