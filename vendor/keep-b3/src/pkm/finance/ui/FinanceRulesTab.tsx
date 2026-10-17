import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Play,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  FinanceRule,
  FinanceCategory,
  RuleCondition,
  RuleAction,
} from '../financeTypes';
import { financeService } from '../financeService';

interface FinanceRulesTabProps {
  rules: FinanceRule[];
  categories: FinanceCategory[];
  onRulesUpdated: () => void;
}

export const FinanceRulesTab: React.FC<FinanceRulesTabProps> = ({
  rules,
  categories,
  onRulesUpdated,
}) => {
  const [editingRule, setEditingRule] = useState<FinanceRule | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const catMap = useMemo(
    () => new Map<string, FinanceCategory>(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Form State
  const [name, setName] = useState<string>('');
  const [matchField, setMatchField] = useState<'payee' | 'description' | 'rawDescription'>('payee');
  const [matchOperator, setMatchOperator] = useState<'contains' | 'equals' | 'startsWith'>('contains');
  const [matchValue, setMatchValue] = useState<string>('');
  const [actionCategory, setActionCategory] = useState<string>(categories[0]?.id || '');
  const [actionTags, setActionTags] = useState<string>('');

  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const handleOpenCreate = () => {
    setName('');
    setMatchField('payee');
    setMatchOperator('contains');
    setMatchValue('');
    setActionCategory(categories[0]?.id || '');
    setActionTags('');
    setEditingRule(null);
    setIsCreating(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchValue.trim()) return;

    const conditions: RuleCondition[] = [
      {
        field: matchField,
        operator: matchOperator,
        value: matchValue.trim(),
      },
    ];

    const actions: RuleAction[] = [];
    if (actionCategory) {
      actions.push({ type: 'setCategory', value: actionCategory });
    }
    if (actionTags.trim()) {
      actions.push({
        type: 'addTags',
        value: actionTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    }

    if (editingRule) {
      financeService.updateRule(editingRule.id, {
        name: name.trim() || `Rule for ${matchValue}`,
        conditions,
        actions,
      });
    } else {
      financeService.createRule({
        name: name.trim() || `Rule for ${matchValue}`,
        enabled: true,
        priority: rules.length + 1,
        matchAllConditions: true,
        conditions,
        actions,
      });
    }

    setIsCreating(false);
    setEditingRule(null);
    onRulesUpdated();
  };

  const handleToggleRule = (rule: FinanceRule) => {
    financeService.updateRule(rule.id, { enabled: !rule.enabled });
    onRulesUpdated();
  };

  const handleDeleteRule = (ruleId: string) => {
    financeService.deleteRule(ruleId);
    onRulesUpdated();
  };

  const handleRunAllRules = () => {
    const res = financeService.applyRulesToAllTransactions();
    setAppliedCount(res.modifiedCount);
    setTimeout(() => setAppliedCount(null), 4000);
    onRulesUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Run All Button */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Automatic Categorization Rules
          </h3>
          <p className="text-xs text-stone-500 mt-0.5 max-w-xl">
            Deterministic matching rules automatically assign categories, payees, and tags to imported transactions without sending bank records to third-party models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAllRules}
            className="px-3 py-2 text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Rules on All Transactions
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      {appliedCount !== null && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Successfully executed rules! {appliedCount} transaction(s) updated.</span>
        </div>
      )}

      {/* Create / Edit Rule Form */}
      {isCreating && (
        <form
          onSubmit={handleSaveRule}
          className="bg-white dark:bg-stone-900 border border-amber-500/40 rounded-2xl shadow-md p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              {editingRule ? 'Edit Rule' : 'Create Categorization Rule'}
            </h4>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Rule Name (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Categorize Grocery Stores"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-xs"
            />
          </div>

          {/* Condition Builder */}
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              IF Transaction Field
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={matchField}
                onChange={(e) => setMatchField(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              >
                <option value="payee">Payee / Merchant</option>
                <option value="description">Memo / Notes</option>
                <option value="rawDescription">Raw Bank Import Text</option>
              </select>

              <select
                value={matchOperator}
                onChange={(e) => setMatchOperator(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals Exactly</option>
                <option value="startsWith">Starts With</option>
              </select>

              <input
                type="text"
                required
                placeholder="Search text (e.g. Netflix)"
                value={matchValue}
                onChange={(e) => setMatchValue(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Action Builder */}
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              THEN Apply Action
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Set Category</label>
                <select
                  value={actionCategory}
                  onChange={(e) => setActionCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                >
                  <option value="">(No Category change)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Add Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="subscription, software"
                  value={actionTags}
                  onChange={(e) => setActionTags(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs"
            >
              Save Rule
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Configured Rules</h3>
          <span className="text-xs text-stone-500">{rules.length} Rules</span>
        </div>

        {rules.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No rules created yet. Click <strong>New Rule</strong> to automate categorization for your transactions.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {rules.map((rule) => {
              const catAction = rule.actions.find((a) => a.type === 'setCategory');
              const cat = catAction && typeof catAction.value === 'string' ? catMap.get(catAction.value) : undefined;
              const cond = rule.conditions[0];

              return (
                <div key={rule.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{rule.name}</span>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule)}
                        className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                        title="Enable/Disable Rule"
                      />
                    </div>

                    <div className="text-[11px] text-stone-500 flex items-center gap-2">
                      <span>
                        IF <strong>{cond?.field}</strong> {cond?.operator} &ldquo;{cond?.value}&rdquo;
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-400" />
                      {cat && (
                        <span
                          className="px-1.5 py-0.2 rounded font-medium"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
