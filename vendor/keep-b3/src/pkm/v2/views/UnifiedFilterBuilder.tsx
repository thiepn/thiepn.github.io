import React, { useState } from 'react';
import {
  Filter,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  X,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  FilterGroup,
  FilterCriterion,
  UnifiedQueryFilterOperator,
  RelativeDateExpression,
} from '../core/query/queryTypes';
import {
  CANONICAL_FIELD_REGISTRY,
  getFieldMetadata,
  getOperatorsForFieldType,
  getOperatorLabel,
  FieldMetadata,
} from '../core/query/fieldRegistry';
import { ResourceType } from '../core/resource/resourceCore';

export interface UnifiedFilterBuilderProps {
  filterGroup?: FilterGroup;
  resourceType?: ResourceType;
  onChange: (group: FilterGroup) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export const UnifiedFilterBuilder: React.FC<UnifiedFilterBuilderProps> = ({
  filterGroup = { conjunction: 'AND', criteria: [] },
  resourceType,
  onChange,
  onClose,
  isMobile,
}) => {
  const availableFields = CANONICAL_FIELD_REGISTRY.filter((f) => {
    if (f.isInternal) return false;
    if (!resourceType || f.applicability === 'all') return true;
    return f.applicability.includes(resourceType);
  });

  const handleAddCriterion = (fieldId?: string) => {
    const field = fieldId || availableFields[0]?.id || 'title';
    const meta = getFieldMetadata(field);
    const validOps = meta ? getOperatorsForFieldType(meta.dataType) : ['equals'];

    const newCriterion: FilterCriterion = {
      field,
      operator: validOps[0] as UnifiedQueryFilterOperator,
      value: '',
    };

    onChange({
      ...filterGroup,
      criteria: [...filterGroup.criteria, newCriterion],
    });
  };

  const handleAddGroup = () => {
    const newGroup: FilterGroup = {
      conjunction: 'OR',
      criteria: [
        {
          field: availableFields[0]?.id || 'title',
          operator: 'equals',
          value: '',
        },
      ],
    };

    onChange({
      ...filterGroup,
      criteria: [...filterGroup.criteria, newGroup],
    });
  };

  const handleUpdateCriterion = (index: number, updated: FilterCriterion) => {
    const nextCriteria = [...filterGroup.criteria];
    nextCriteria[index] = updated;
    onChange({
      ...filterGroup,
      criteria: nextCriteria,
    });
  };

  const handleRemoveCriterion = (index: number) => {
    const nextCriteria = filterGroup.criteria.filter((_, i) => i !== index);
    onChange({
      ...filterGroup,
      criteria: nextCriteria,
    });
  };

  const handleToggleConjunction = () => {
    onChange({
      ...filterGroup,
      conjunction: filterGroup.conjunction === 'AND' ? 'OR' : 'AND',
    });
  };

  const handleClearAll = () => {
    onChange({
      conjunction: 'AND',
      criteria: [],
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 shadow-xl text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Filter Rules</h3>
          {filterGroup.criteria.length > 0 && (
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700 font-mono">
              {filterGroup.criteria.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {filterGroup.criteria.length > 1 && (
            <button
              onClick={handleToggleConjunction}
              className="text-xs font-mono font-semibold px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded border border-neutral-700 transition-colors"
              title="Toggle conjunction for top-level criteria"
            >
              Match: {filterGroup.conjunction}
            </button>
          )}

          {filterGroup.criteria.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-neutral-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
            >
              Clear All
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Criteria Rows */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {filterGroup.criteria.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500 italic">
            No active filters. Matching all resources in scope.
          </div>
        ) : (
          filterGroup.criteria.map((item, idx) => {
            if ('conjunction' in item) {
              // Nested Filter Group
              return (
                <div key={idx} className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-amber-400/90 font-semibold flex items-center gap-1">
                      <Layers size={12} />
                      Group ({item.conjunction})
                    </span>
                    <button
                      onClick={() => handleRemoveCriterion(idx)}
                      className="text-neutral-500 hover:text-red-400 p-0.5 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <UnifiedFilterBuilder
                    filterGroup={item}
                    resourceType={resourceType}
                    onChange={(updatedGroup) => {
                      const next = [...filterGroup.criteria];
                      next[idx] = updatedGroup;
                      onChange({ ...filterGroup, criteria: next });
                    }}
                  />
                </div>
              );
            }

            // Single Criterion
            return (
              <CriterionRow
                key={idx}
                criterion={item}
                availableFields={availableFields}
                onUpdate={(updated) => handleUpdateCriterion(idx, updated)}
                onRemove={() => handleRemoveCriterion(idx)}
              />
            );
          })
        )}
      </div>

      {/* Add Controls */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddCriterion()}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} className="text-amber-400" />
            <span>Add Filter</span>
          </button>

          <button
            onClick={handleAddGroup}
            className="px-3 py-1.5 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers size={13} />
            <span>Add Group</span>
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Apply Filters
          </button>
        )}
      </div>
    </div>
  );
};

interface CriterionRowProps {
  criterion: FilterCriterion;
  availableFields: FieldMetadata[];
  onUpdate: (criterion: FilterCriterion) => void;
  onRemove: () => void;
}

const CriterionRow: React.FC<CriterionRowProps> = ({
  criterion,
  availableFields,
  onUpdate,
  onRemove,
}) => {
  const currentMeta = getFieldMetadata(criterion.field);
  const dataType = currentMeta ? currentMeta.dataType : 'text';
  const validOperators = getOperatorsForFieldType(dataType);

  const handleFieldChange = (fieldId: string) => {
    const meta = getFieldMetadata(fieldId);
    const ops = meta ? getOperatorsForFieldType(meta.dataType) : ['equals'];
    onUpdate({
      field: fieldId,
      operator: ops[0] as UnifiedQueryFilterOperator,
      value: '',
    });
  };

  const handleOperatorChange = (op: UnifiedQueryFilterOperator) => {
    onUpdate({
      ...criterion,
      operator: op,
    });
  };

  const handleValueChange = (val: any) => {
    onUpdate({
      ...criterion,
      value: val,
    });
  };

  const isDateOp =
    criterion.operator === 'is_today' ||
    criterion.operator === 'is_this_week' ||
    criterion.operator === 'is_this_month' ||
    criterion.operator === 'before' ||
    criterion.operator === 'after' ||
    criterion.operator === 'is_on_or_before' ||
    criterion.operator === 'is_on_or_after';

  const isRelativeDatePreset =
    criterion.operator === 'before' ||
    criterion.operator === 'after' ||
    criterion.operator === 'is_on_or_before' ||
    criterion.operator === 'is_on_or_after';

  const isNoValueOp =
    criterion.operator === 'is_empty' ||
    criterion.operator === 'is_not_empty' ||
    criterion.operator === 'is_today' ||
    criterion.operator === 'is_this_week' ||
    criterion.operator === 'is_this_month' ||
    criterion.operator === 'is_true' ||
    criterion.operator === 'is_false' ||
    criterion.operator === 'has_relation' ||
    criterion.operator === 'has_no_relation';

  return (
    <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 text-xs flex-wrap md:flex-nowrap">
      {/* Field Selector */}
      <div className="w-full md:w-36 shrink-0">
        <select
          value={criterion.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-medium focus:outline-none focus:border-amber-500"
        >
          {availableFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator Selector */}
      <div className="w-full md:w-36 shrink-0">
        <select
          value={criterion.operator}
          onChange={(e) => handleOperatorChange(e.target.value as UnifiedQueryFilterOperator)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-amber-300 font-medium focus:outline-none focus:border-amber-500"
        >
          {validOperators.map((op) => (
            <option key={op} value={op}>
              {getOperatorLabel(op)}
            </option>
          ))}
        </select>
      </div>

      {/* Value Input */}
      {!isNoValueOp && (
        <div className="grow w-full md:w-auto">
          {currentMeta?.options ? (
            <select
              value={criterion.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-200 capitalize focus:outline-none focus:border-amber-500"
            >
              <option value="">(Select value)</option>
              {currentMeta.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace('_', ' ')}
                </option>
              ))}
            </select>
          ) : isRelativeDatePreset ? (
            <div className="flex gap-1.5 items-center">
              <select
                value={criterion.relativeDate || 'today'}
                onChange={(e) =>
                  onUpdate({
                    ...criterion,
                    relativeDate: e.target.value as RelativeDateExpression,
                  })
                }
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="next_week">Next Week</option>
                <option value="this_month">This Month</option>
                <option value="past_7_days">Past 7 Days</option>
                <option value="next_30_days">Next 30 Days</option>
              </select>
            </div>
          ) : dataType === 'date' || dataType === 'datetime' ? (
            <input
              type="date"
              value={criterion.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
            />
          ) : dataType === 'number' ? (
            <input
              type="number"
              value={criterion.value ?? ''}
              placeholder="0"
              onChange={(e) => handleValueChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          ) : (
            <input
              type="text"
              value={criterion.value || ''}
              placeholder="Filter value..."
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
            />
          )}
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="text-neutral-500 hover:text-red-400 p-1.5 rounded hover:bg-neutral-800 transition-colors ml-auto md:ml-0"
        title="Remove filter rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};
