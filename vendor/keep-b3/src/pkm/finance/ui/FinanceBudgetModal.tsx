import React, { useState } from 'react';
import { X, Plus, Trash2, PieChart, Sparkles } from 'lucide-react';
import { FinanceBudget, FinanceCategory, BudgetCategoryTarget } from '../financeTypes';
import {
  Money,
  createMoney,
  parseMoneyInput,
  moneyToDecimalString,
  DEFAULT_CURRENCY,
  formatMoney,
} from '../money';
import { financeService } from '../financeService';

interface FinanceBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodKey: string; // e.g. '2026-09'
  categories: FinanceCategory[];
  currentBudget?: FinanceBudget | null;
  onSave: (budget: FinanceBudget) => void;
}

export const FinanceBudgetModal: React.FC<FinanceBudgetModalProps> = ({
  isOpen,
  onClose,
  periodKey,
  categories,
  currentBudget,
  onSave,
}) => {
  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const currency = currentBudget?.currency || DEFAULT_CURRENCY;

  // Initialize targets mapping
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (currentBudget) {
      currentBudget.targets.forEach((t) => {
        map[t.categoryId] = moneyToDecimalString(t.targetAmount);
      });
    }
    return map;
  });

  const [notes, setNotes] = useState<string>(currentBudget?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleTargetChange = (catId: string, value: string) => {
    setTargets((prev) => ({ ...prev, [catId]: value }));
  };

  const calculateTotalBudgetMinor = (): number => {
    let total = 0;
    (Object.values(targets) as string[]).forEach((val) => {
      const m = parseMoneyInput(val, currency);
      if (m.amountMinor > 0) {
        total += m.amountMinor;
      }
    });
    return total;
  };

  const handleCopyPrevious = () => {
    const [yearStr, monthStr] = periodKey.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const prevKey = `${y}-${m.toString().padStart(2, '0')}`;
    const prevBudget = financeService.getBudgetForPeriod(prevKey);

    if (prevBudget) {
      const map: Record<string, string> = {};
      prevBudget.targets.forEach((t) => {
        map[t.categoryId] = moneyToDecimalString(t.targetAmount);
      });
      setTargets(map);
    } else {
      setError(`No existing budget found for ${prevKey}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const budgetTargets: BudgetCategoryTarget[] = [];

    (Object.entries(targets) as [string, string][]).forEach(([catId, val]) => {
      const m = parseMoneyInput(val, currency);
      if (m.amountMinor > 0) {
        budgetTargets.push({
          categoryId: catId,
          targetAmount: m,
        });
      }
    });

    const saved = financeService.saveBudget({
      id: currentBudget?.id,
      name: `Budget ${periodKey}`,
      period: 'month',
      periodKey,
      currency,
      targets: budgetTargets,
      notes: notes.trim() || undefined,
    });

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Monthly Budget Targets: {periodKey}
              </h3>
              <p className="text-xs text-stone-500">
                Explicit monthly budget without retroactive alterations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
            <div>
              <div className="text-xs text-stone-600 dark:text-stone-400">Total Planned Budget</div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {formatMoney(calculateTotalBudgetMinor(), currency)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyPrevious}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Copy Previous Month
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Category Targets
            </label>
            <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {expenseCategories.map((cat) => (
                <div key={cat.id} className="p-3 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/40">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#94a3b8' }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {cat.name}
                      </div>
                      {cat.description && (
                        <div className="text-[11px] text-stone-500 line-clamp-1">
                          {cat.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-stone-400">{currency}</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={targets[cat.id] || ''}
                      onChange={(e) => handleTargetChange(cat.id, e.target.value)}
                      className="w-28 px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono text-right focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Budget Notes & Strategy
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Planning higher travel spending this month"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl shadow-xs transition-colors"
          >
            Save Budget Targets
          </button>
        </div>
      </div>
    </div>
  );
};
