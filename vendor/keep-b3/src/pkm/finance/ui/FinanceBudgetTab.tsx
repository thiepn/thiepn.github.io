import React, { useMemo } from 'react';
import {
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import {
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
  BudgetPeriodProgress,
} from '../financeTypes';
import { formatMoney, sumMoney, DEFAULT_CURRENCY } from '../money';
import { financeService } from '../financeService';

interface FinanceBudgetTabProps {
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
  currentPeriodKey: string;
  onChangePeriod: (periodKey: string) => void;
  onOpenEditBudget: () => void;
  onDrillDownCategory?: (categoryId: string) => void;
}

export const FinanceBudgetTab: React.FC<FinanceBudgetTabProps> = ({
  categories,
  transactions,
  budgets,
  currentPeriodKey,
  onChangePeriod,
  onOpenEditBudget,
  onDrillDownCategory,
}) => {
  const budgetProgress = useMemo(() => {
    return financeService.calculateBudgetProgress(currentPeriodKey);
  }, [transactions, budgets, currentPeriodKey]);

  const [yearStr, monthStr] = currentPeriodKey.split('-');
  const monthDate = new Date(`${yearStr}-${monthStr}-01T00:00:00`);
  const monthName = monthDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    onChangePeriod(`${y}-${m.toString().padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    onChangePeriod(`${y}-${m.toString().padStart(2, '0')}`);
  };

  const totalBudgeted = useMemo(() => {
    return sumMoney(budgetProgress.map((b) => b.targetAmount));
  }, [budgetProgress]);

  const totalSpent = useMemo(() => {
    return sumMoney(budgetProgress.map((b) => b.actualSpent));
  }, [budgetProgress]);

  const totalVariance = useMemo(() => {
    return sumMoney(budgetProgress.map((b) => b.variance));
  }, [budgetProgress]);

  return (
    <div className="space-y-6">
      {/* Period Navigation Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-base font-bold text-stone-900 dark:text-stone-100 min-w-[140px] text-center">
            {monthName}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenEditBudget}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Configure {monthName} Budget
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Total Planned Budget</div>
          <div className="text-xl font-black font-mono text-stone-900 dark:text-stone-100">
            {formatMoney(totalBudgeted)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Total Actual Spending</div>
          <div className="text-xl font-black font-mono text-stone-900 dark:text-stone-100">
            {formatMoney(totalSpent)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Overall Remaining / Variance</div>
          <div
            className={`text-xl font-black font-mono ${
              totalVariance.amountMinor >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(totalVariance, undefined, { forceSign: true })}
          </div>
        </div>
      </div>

      {/* Budget Progress Category Breakdown */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Category Budget vs. Actual Spending
          </h3>
          <span className="text-xs text-stone-500">
            {budgetProgress.length} Categories with targets or activity
          </span>
        </div>

        {budgetProgress.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No budget targets or expenses recorded for {monthName}. Click{' '}
            <strong>Configure Budget</strong> to set category limits.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {budgetProgress.map((item) => {
              const isOver = item.isOverBudget;
              const pct = item.percentUsed;
              const barColor = isOver
                ? 'bg-rose-500'
                : pct > 85
                ? 'bg-amber-500'
                : 'bg-emerald-500';

              return (
                <div key={item.category.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.category.color || '#94a3b8' }}
                      />
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {item.category.name}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {item.transactionIds.length} transaction{item.transactionIds.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatMoney(item.actualSpent)} / {formatMoney(item.targetAmount)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isOver ? 'text-rose-600 dark:text-rose-400' : 'text-stone-500'
                        }`}
                      >
                        {isOver
                          ? `${formatMoney(item.actualSpent.amountMinor - item.targetAmount.amountMinor, item.targetAmount.currency)} Over budget (${pct}%)`
                          : `${formatMoney(item.variance)} remaining (${pct}% used)`}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
