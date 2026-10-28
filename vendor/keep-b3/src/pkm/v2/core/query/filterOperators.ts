import { FilterCriterion, UnifiedQueryFilterOperator, RelativeDateExpression } from './queryTypes';
import { connectionIndexV2 } from '../connections/connectionIndex';

export function evaluateCriterion(
  item: any,
  criterion: FilterCriterion,
  contextResourceId?: string
): boolean {
  const { field, operator, value, relativeDate, dateRange } = criterion;

  // Handle Dynamic Placeholders (e.g. {{current_context}}, {{today}})
  let effectiveValue = value;
  if (typeof effectiveValue === 'string' && effectiveValue.startsWith('{{') && effectiveValue.endsWith('}}')) {
    const placeholder = effectiveValue.slice(2, -2).trim();
    if (placeholder === 'current_context' || placeholder === 'current_project') {
      effectiveValue = contextResourceId || '';
    }
  }

  // Relations and Graph Connections (via ConnectionIndexV2)
  if (
    operator === 'is_related_to' ||
    operator === 'is_not_related_to' ||
    operator === 'has_relation' ||
    operator === 'has_no_relation' ||
    operator === 'links_to' ||
    operator === 'linked_from'
  ) {
    return evaluateConnectionCriterion(item, operator, effectiveValue, field);
  }

  const fieldValue = getNestedFieldValue(item, field);

  switch (operator) {
    // Text Operators
    case 'equals':
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return fieldValue.toLowerCase().trim() === effectiveValue.toLowerCase().trim();
      }
      return fieldValue === effectiveValue;

    case 'not_equals':
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return fieldValue.toLowerCase().trim() !== effectiveValue.toLowerCase().trim();
      }
      return fieldValue !== effectiveValue;

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((v) =>
          typeof v === 'string' && typeof effectiveValue === 'string'
            ? v.toLowerCase().includes(effectiveValue.toLowerCase())
            : v === effectiveValue
        );
      }
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return fieldValue.toLowerCase().includes(effectiveValue.toLowerCase());
      }
      return false;

    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return !fieldValue.toLowerCase().includes(effectiveValue.toLowerCase());
      }
      return true;

    case 'starts_with':
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return fieldValue.toLowerCase().startsWith(effectiveValue.toLowerCase());
      }
      return false;

    case 'ends_with':
      if (typeof fieldValue === 'string' && typeof effectiveValue === 'string') {
        return fieldValue.toLowerCase().endsWith(effectiveValue.toLowerCase());
      }
      return false;

    // Number Operators
    case 'greater_than':
      return Number(fieldValue) > Number(effectiveValue);

    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(effectiveValue);

    case 'less_than':
      return Number(fieldValue) < Number(effectiveValue);

    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(effectiveValue);

    case 'between':
      if (dateRange && Array.isArray(dateRange)) {
        const num = Number(fieldValue);
        return num >= Number(dateRange[0]) && num <= Number(dateRange[1]);
      }
      if (Array.isArray(effectiveValue)) {
        const num = Number(fieldValue);
        return num >= Number(effectiveValue[0]) && num <= Number(effectiveValue[1]);
      }
      return false;

    // Boolean Operators
    case 'is_true':
      return Boolean(fieldValue) === true;

    case 'is_false':
      return Boolean(fieldValue) === false;

    // Date & Time Operators (DateOnly / DateTime aware)
    case 'is_today':
      return isDateMatchToday(fieldValue);

    case 'is_this_week':
      return isDateMatchThisWeek(fieldValue);

    case 'is_this_month':
      return isDateMatchThisMonth(fieldValue);

    case 'is_on':
      return isDateMatchExactDay(fieldValue, effectiveValue);

    case 'before':
      return compareDate(fieldValue, effectiveValue, relativeDate) < 0;

    case 'after':
      return compareDate(fieldValue, effectiveValue, relativeDate) > 0;

    case 'is_on_or_before':
      return compareDate(fieldValue, effectiveValue, relativeDate) <= 0;

    case 'is_on_or_after':
      return compareDate(fieldValue, effectiveValue, relativeDate) >= 0;

    case 'is_between': {
      const range = dateRange || effectiveValue;
      if (Array.isArray(range) && range.length === 2) {
        const t = toDateTimestamp(fieldValue);
        const start = toDateTimestamp(range[0]);
        const end = toDateTimestamp(range[1]);
        if (t === null || start === null || end === null) return false;
        return t >= start && t <= end;
      }
      return false;
    }

    case 'in_next_days': {
      const days = Number(effectiveValue) || 7;
      const t = toDateTimestamp(fieldValue);
      if (t === null) return false;
      const now = Date.now();
      const future = now + days * 86400000;
      return t >= now && t <= future;
    }

    case 'in_past_days': {
      const days = Number(effectiveValue) || 7;
      const t = toDateTimestamp(fieldValue);
      if (t === null) return false;
      const now = Date.now();
      const past = now - days * 86400000;
      return t <= now && t >= past;
    }

    // Select & Multi-select / Tag Operators
    case 'in':
      if (Array.isArray(effectiveValue)) {
        return effectiveValue.some((v) =>
          typeof v === 'string' && typeof fieldValue === 'string'
            ? v.toLowerCase() === fieldValue.toLowerCase()
            : v === fieldValue
        );
      }
      return false;

    case 'not_in':
      if (Array.isArray(effectiveValue)) {
        return !effectiveValue.some((v) =>
          typeof v === 'string' && typeof fieldValue === 'string'
            ? v.toLowerCase() === fieldValue.toLowerCase()
            : v === fieldValue
        );
      }
      return true;

    case 'contains_any': {
      const targetList = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      const matchValues = Array.isArray(effectiveValue) ? effectiveValue : [effectiveValue];
      return targetList.some((itemVal: any) =>
        matchValues.some((mv: any) =>
          typeof itemVal === 'string' && typeof mv === 'string'
            ? itemVal.toLowerCase() === mv.toLowerCase()
            : itemVal === mv
        )
      );
    }

    case 'contains_all': {
      const targetList = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      const matchValues = Array.isArray(effectiveValue) ? effectiveValue : [effectiveValue];
      return matchValues.every((mv: any) =>
        targetList.some((itemVal: any) =>
          typeof itemVal === 'string' && typeof mv === 'string'
            ? itemVal.toLowerCase() === mv.toLowerCase()
            : itemVal === mv
        )
      );
    }

    case 'contains_none': {
      const targetList = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      const matchValues = Array.isArray(effectiveValue) ? effectiveValue : [effectiveValue];
      return !matchValues.some((mv: any) =>
        targetList.some((itemVal: any) =>
          typeof itemVal === 'string' && typeof mv === 'string'
            ? itemVal.toLowerCase() === mv.toLowerCase()
            : itemVal === mv
        )
      );
    }

    case 'has_tag': {
      const tags = Array.isArray(fieldValue)
        ? fieldValue
        : item.tags || item.metadata?.tags || [];
      const targetTag = String(effectiveValue || '').replace(/^#/, '').toLowerCase();
      return tags.some((t: string) => t.replace(/^#/, '').toLowerCase() === targetTag);
    }

    case 'is_empty':
      if (fieldValue === null || fieldValue === undefined) return true;
      if (typeof fieldValue === 'string') return fieldValue.trim() === '';
      if (Array.isArray(fieldValue)) return fieldValue.length === 0;
      if (typeof fieldValue === 'object') return Object.keys(fieldValue).length === 0;
      return false;

    case 'is_not_empty':
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === 'string') return fieldValue.trim() !== '';
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      if (typeof fieldValue === 'object') return Object.keys(fieldValue).length > 0;
      return true;

    case 'matches_regex':
      try {
        const regex = new RegExp(String(effectiveValue), 'i');
        return regex.test(String(fieldValue || ''));
      } catch {
        return false;
      }

    default:
      return true;
  }
}

function evaluateConnectionCriterion(
  item: any,
  operator: UnifiedQueryFilterOperator,
  targetValue: any,
  field: string
): boolean {
  const itemId = item.id;
  if (!itemId) return false;

  const edges = connectionIndexV2.getEdgesForResource(itemId);

  switch (operator) {
    case 'is_related_to': {
      const targetId = String(targetValue);
      // Check direct metadata property or graph edge
      const directRel = item[field] || item.metadata?.[field];
      if (directRel === targetId) return true;
      return edges.some((e) => (e.sourceId === itemId && e.targetId === targetId) || (e.targetId === itemId && e.sourceId === targetId));
    }

    case 'is_not_related_to': {
      const targetId = String(targetValue);
      const directRel = item[field] || item.metadata?.[field];
      if (directRel === targetId) return false;
      return !edges.some((e) => (e.sourceId === itemId && e.targetId === targetId) || (e.targetId === itemId && e.sourceId === targetId));
    }

    case 'has_relation': {
      const directRel = item[field] || item.metadata?.[field];
      if (directRel) return true;
      return edges.some((e) => e.edgeType === 'typed_relation' || e.edgeType === 'wikilink');
    }

    case 'has_no_relation': {
      const directRel = item[field] || item.metadata?.[field];
      if (directRel) return false;
      return !edges.some((e) => e.edgeType === 'typed_relation' || e.edgeType === 'wikilink');
    }

    case 'links_to': {
      const targetId = String(targetValue);
      return edges.some((e) => e.sourceId === itemId && e.targetId === targetId && (e.edgeType === 'wikilink' || e.edgeType === 'typed_relation'));
    }

    case 'linked_from': {
      const sourceId = String(targetValue);
      return edges.some((e) => e.targetId === itemId && e.sourceId === sourceId && (e.edgeType === 'wikilink' || e.edgeType === 'typed_relation'));
    }

    default:
      return true;
  }
}

export function getNestedFieldValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;

  // Direct check first
  if (obj[path] !== undefined) return obj[path];
  if (obj.metadata && obj.metadata[path] !== undefined) return obj.metadata[path];

  if (!path.includes('.')) return undefined;

  const parts = path.split('.');
  let curr: any = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part] !== undefined ? curr[part] : curr.metadata?.[part];
  }
  return curr;
}

// Date helpers respecting local timezone & DateOnly formatting (YYYY-MM-DD)
export function toDateTimestamp(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Check if it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0).getTime();
    }
    const parsed = Date.parse(val);
    return isNaN(parsed) ? null : parsed;
  }
  if (val instanceof Date) return val.getTime();
  return null;
}

function resolveRelativeDate(rel: RelativeDateExpression): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (rel) {
    case 'today':
      return todayStart;
    case 'tomorrow':
      return todayStart + 86400000;
    case 'yesterday':
      return todayStart - 86400000;
    case 'this_week':
      return todayStart;
    case 'next_week':
      return todayStart + 7 * 86400000;
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    case 'past_7_days':
      return todayStart - 7 * 86400000;
    case 'next_30_days':
      return todayStart + 30 * 86400000;
    default:
      return todayStart;
  }
}

function compareDate(
  fieldValue: any,
  compareValue: any,
  relativeDate?: RelativeDateExpression
): number {
  const tField = toDateTimestamp(fieldValue);
  if (tField === null) return 1; // missing dates sorted last

  let tCompare: number | null = null;
  if (relativeDate) {
    tCompare = resolveRelativeDate(relativeDate);
  } else {
    tCompare = toDateTimestamp(compareValue);
  }

  if (tCompare === null) return 0;
  return tField - tCompare;
}

function isDateMatchToday(val: any): boolean {
  const t = toDateTimestamp(val);
  if (t === null) return false;
  const d = new Date(t);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isDateMatchThisWeek(val: any): boolean {
  const t = toDateTimestamp(val);
  if (t === null) return false;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
  const endOfWeek = startOfWeek + 7 * 86400000;
  return t >= startOfWeek && t < endOfWeek;
}

function isDateMatchThisMonth(val: any): boolean {
  const t = toDateTimestamp(val);
  if (t === null) return false;
  const d = new Date(t);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isDateMatchExactDay(val: any, target: any): boolean {
  const t1 = toDateTimestamp(val);
  const t2 = toDateTimestamp(target);
  if (t1 === null || t2 === null) return false;
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
