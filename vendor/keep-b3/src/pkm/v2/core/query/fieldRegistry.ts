import { ResourceType } from '../resource/resourceCore';
import { UnifiedQueryFilterOperator } from './queryTypes';

export type FieldDataType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'tags';

export interface FieldMetadata {
  id: string;
  label: string;
  dataType: FieldDataType;
  applicability: ResourceType[] | 'all';
  sortable: boolean;
  groupable: boolean;
  filterable: boolean;
  sensitive?: boolean;
  options?: string[]; // Allowed select options
  description?: string;
  isInternal?: boolean; // Hidden from end-user UI
}

export const CANONICAL_FIELD_REGISTRY: FieldMetadata[] = [
  // Core Common Fields
  {
    id: 'title',
    label: 'Title',
    dataType: 'text',
    applicability: 'all',
    sortable: true,
    groupable: false,
    filterable: true,
  },
  {
    id: 'type',
    label: 'Resource Type',
    dataType: 'select',
    applicability: 'all',
    sortable: true,
    groupable: true,
    filterable: true,
    options: [
      'note',
      'task',
      'project',
      'person',
      'organization',
      'course',
      'book',
      'transaction',
      'asset',
      'decision',
      'habit',
      'itinerary',
      'health_metric',
    ],
  },
  {
    id: 'createdAt',
    label: 'Created Date',
    dataType: 'datetime',
    applicability: 'all',
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'updatedAt',
    label: 'Last Modified',
    dataType: 'datetime',
    applicability: 'all',
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'tags',
    label: 'Tags',
    dataType: 'tags',
    applicability: 'all',
    sortable: false,
    groupable: true,
    filterable: true,
  },
  {
    id: 'pinned',
    label: 'Pinned / Favorite',
    dataType: 'boolean',
    applicability: 'all',
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'archived',
    label: 'Archived',
    dataType: 'boolean',
    applicability: 'all',
    sortable: true,
    groupable: true,
    filterable: true,
  },

  // Task & Project Fields
  {
    id: 'status',
    label: 'Status',
    dataType: 'select',
    applicability: ['task', 'project', 'decision', 'book', 'course', 'asset'],
    sortable: true,
    groupable: true,
    filterable: true,
    options: ['todo', 'in_progress', 'done', 'cancelled', 'active', 'completed', 'reading', 'queue', 'open', 'review_due'],
  },
  {
    id: 'priority',
    label: 'Priority',
    dataType: 'select',
    applicability: ['task', 'project', 'decision', 'note'],
    sortable: true,
    groupable: true,
    filterable: true,
    options: ['low', 'medium', 'high', 'urgent'],
  },
  {
    id: 'dueDate',
    label: 'Due Date',
    dataType: 'date',
    applicability: ['task', 'project', 'decision', 'asset'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'project',
    label: 'Project',
    dataType: 'relation',
    applicability: ['task', 'note', 'decision'],
    sortable: false,
    groupable: true,
    filterable: true,
  },

  // People & Organization
  {
    id: 'organization',
    label: 'Organization',
    dataType: 'relation',
    applicability: ['person', 'transaction'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'followUpDate',
    label: 'Next Follow-up',
    dataType: 'date',
    applicability: ['person'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'email',
    label: 'Email',
    dataType: 'text',
    applicability: ['person'],
    sortable: true,
    groupable: false,
    filterable: true,
  },

  // Library / Reading
  {
    id: 'author',
    label: 'Author / Creator',
    dataType: 'text',
    applicability: ['book', 'course'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'rating',
    label: 'Rating (1-5)',
    dataType: 'number',
    applicability: ['book', 'course'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'progress',
    label: 'Progress (%)',
    dataType: 'number',
    applicability: ['book', 'course', 'project'],
    sortable: true,
    groupable: false,
    filterable: true,
  },

  // Finance Fields
  {
    id: 'amount',
    label: 'Amount',
    dataType: 'number',
    applicability: ['transaction'],
    sortable: true,
    groupable: false,
    filterable: true,
    sensitive: true,
  },
  {
    id: 'category',
    label: 'Category',
    dataType: 'select',
    applicability: ['transaction', 'asset'],
    sortable: true,
    groupable: true,
    filterable: true,
    options: ['Housing', 'Food', 'Transport', 'Utilities', 'Personal', 'Income', 'Electronics', 'Appliances'],
  },
  {
    id: 'account',
    label: 'Account',
    dataType: 'text',
    applicability: ['transaction'],
    sortable: true,
    groupable: true,
    filterable: true,
    sensitive: true,
  },

  // Assets
  {
    id: 'maintenanceDueDate',
    label: 'Maintenance Due',
    dataType: 'date',
    applicability: ['asset'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'assetValue',
    label: 'Estimated Value',
    dataType: 'number',
    applicability: ['asset'],
    sortable: true,
    groupable: false,
    filterable: true,
  },

  // Decisions
  {
    id: 'reviewDate',
    label: 'Review Date',
    dataType: 'date',
    applicability: ['decision'],
    sortable: true,
    groupable: true,
    filterable: true,
  },
  {
    id: 'outcome',
    label: 'Outcome',
    dataType: 'select',
    applicability: ['decision'],
    sortable: true,
    groupable: true,
    filterable: true,
    options: ['successful', 'mixed', 'unsuccessful', 'pending'],
  },

  // Internal technical fields (HIDDEN from user UI)
  {
    id: '_id',
    label: 'Internal Storage ID',
    dataType: 'text',
    applicability: 'all',
    sortable: false,
    groupable: false,
    filterable: false,
    isInternal: true,
  },
  {
    id: '_version',
    label: 'Sync Revision',
    dataType: 'number',
    applicability: 'all',
    sortable: false,
    groupable: false,
    filterable: false,
    isInternal: true,
  },
];

export function getFieldMetadata(fieldId: string): FieldMetadata | undefined {
  return CANONICAL_FIELD_REGISTRY.find((f) => f.id === fieldId);
}

export function getFieldsForResourceType(type?: ResourceType): FieldMetadata[] {
  return CANONICAL_FIELD_REGISTRY.filter((f) => {
    if (f.isInternal) return false;
    if (!type || f.applicability === 'all') return true;
    return f.applicability.includes(type);
  });
}

export function getOperatorsForFieldType(dataType: FieldDataType): UnifiedQueryFilterOperator[] {
  switch (dataType) {
    case 'text':
      return [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'is_empty',
        'is_not_empty',
      ];
    case 'number':
      return [
        'equals',
        'not_equals',
        'greater_than',
        'greater_than_or_equal',
        'less_than',
        'less_than_or_equal',
        'between',
        'is_empty',
        'is_not_empty',
      ];
    case 'boolean':
      return ['is_true', 'is_false'];
    case 'date':
    case 'datetime':
      return [
        'is_today',
        'is_this_week',
        'is_this_month',
        'is_on',
        'before',
        'after',
        'is_on_or_before',
        'is_on_or_after',
        'is_between',
        'in_next_days',
        'in_past_days',
        'is_empty',
        'is_not_empty',
      ];
    case 'select':
      return ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'];
    case 'multiselect':
    case 'tags':
      return ['contains', 'contains_any', 'contains_all', 'contains_none', 'has_tag', 'is_empty', 'is_not_empty'];
    case 'relation':
      return ['is_related_to', 'is_not_related_to', 'has_relation', 'has_no_relation'];
    default:
      return ['equals', 'not_equals'];
  }
}

export function getOperatorLabel(op: UnifiedQueryFilterOperator): string {
  switch (op) {
    case 'equals': return 'is';
    case 'not_equals': return 'is not';
    case 'contains': return 'contains';
    case 'not_contains': return 'does not contain';
    case 'starts_with': return 'starts with';
    case 'ends_with': return 'ends with';
    case 'is_empty': return 'is empty';
    case 'is_not_empty': return 'is not empty';
    case 'greater_than': return '>';
    case 'greater_than_or_equal': return '≥';
    case 'less_than': return '<';
    case 'less_than_or_equal': return '≤';
    case 'between': return 'between';
    case 'is_true': return 'is true';
    case 'is_false': return 'is false';
    case 'is_today': return 'is today';
    case 'is_this_week': return 'is this week';
    case 'is_this_month': return 'is this month';
    case 'is_on': return 'is on';
    case 'before': return 'is before';
    case 'after': return 'is after';
    case 'is_on_or_before': return 'is on or before';
    case 'is_on_or_after': return 'is on or after';
    case 'is_between': return 'is between';
    case 'in_next_days': return 'in next (days)';
    case 'in_past_days': return 'in past (days)';
    case 'in': return 'is any of';
    case 'not_in': return 'is none of';
    case 'contains_any': return 'contains any of';
    case 'contains_all': return 'contains all of';
    case 'contains_none': return 'contains none of';
    case 'has_tag': return 'has tag';
    case 'is_related_to': return 'is related to';
    case 'is_not_related_to': return 'is not related to';
    case 'has_relation': return 'has relation';
    case 'has_no_relation': return 'has no relation';
    case 'links_to': return 'links to';
    case 'linked_from': return 'linked from';
    default: return String(op).replace(/_/g, ' ');
  }
}
