import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PieChart,
  Scale,
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
} from '../financeTypes';
import { formatMoney, Money } from '../money';
import { financeService } from '../financeService';
import { financeExportService } from '../financeExport';

interface FinanceReportsTabProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  currentPeriodKey: string;
  onGenerateReviewNote: (markdown: string, title: string) => void;
}

export const FinanceReportsTab: React.FC<FinanceReportsTabProps> = ({
  accounts,
  transactions,
  categories,
  budgets,
  currentPeriodKey,
  onGenerateReviewNote,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriodKey);
  const [copiedReview, setCopiedReview] = useState(false);

  const cashFlow = useMemo(() => {
    return financeService.calculateCashFlow(selectedPeriod);
  }, [transactions, selectedPeriod]);

  const categorySpending = useMemo(() => {
    return financeService.calculateCategorySpending(selectedPeriod);
  }, [transactions, categories, selectedPeriod]);

  const netWorth = useMemo(() => {
    return financeService.calculateTrackedNetWorth();
  }, [accounts, transactions]);

  const [yearStr, monthStr] = selectedPeriod.split('-');
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
    setSelectedPeriod(`${y}-${m.toString().padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    setSelectedPeriod(`${y}-${m.toString().padStart(2, '0')}`);
  };

  const handleCreateNote = () => {
    const md = financeExportService.generateMonthlyReviewMarkdown(selectedPeriod);
    const title = `Financial Review ${monthName}`;
    onGenerateReviewNote(md, title);
    setCopiedReview(true);
    setTimeout(() => setCopiedReview(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation & Action Bar */}
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

        <button
          type="button"
          onClick={handleCreateNote}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          {copiedReview ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          {copiedReview ? 'Created in Notes!' : 'Generate Review Note'}
        </button>
      </div>

      {/* Cash Flow Metric Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Total Income</div>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(cashFlow.totalIncome)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">{cashFlow.incomeTransactionCount} inflows</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Total Outflows & Expenses</div>
          <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatMoney(cashFlow.totalExpenses)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">{cashFlow.expenseTransactionCount} outflows</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Net Cash Flow</div>
          <div
            className={`text-xl font-black font-mono ${
              cashFlow.netCashFlow.amountMinor >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(cashFlow.netCashFlow, undefined, { forceSign: true })}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Income minus expenses</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Savings Rate</div>
          <div className="text-xl font-black font-mono text-stone-900 dark:text-stone-100">
            {cashFlow.savingsRatePercent}%
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Of total earned income</div>
        </div>
      </div>

      {/* Category Spending Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Category Spending Breakdown ({monthName})
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            Total Spent: {formatMoney(cashFlow.totalExpenses)}
          </span>
        </div>

        {categorySpending.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No expenses recorded in {monthName}.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {categorySpending.map((item) => (
              <div key={item.category.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.category.color || '#94a3b8' }}
                  />
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {item.category.name}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">
                    {formatMoney(item.spent)}
                  </div>
                  <div className="w-12 text-right text-xs font-mono text-stone-500 font-semibold">
                    {item.percentageOfTotal}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Net Worth Breakdown by Account */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-500" />
            Net Worth Breakdown
          </h3>
          <span className="text-sm font-black font-mono text-stone-900 dark:text-stone-100">
            Net: {formatMoney(netWorth.netWorth)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 dark:divide-stone-800">
          {/* Assets Column */}
          <div className="p-4 space-y-3">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Assets & Cash</span>
              <span className="font-mono">{formatMoney(netWorth.totalAssets)}</span>
            </div>
            <div className="space-y-1.5">
              {netWorth.assetsByAccount.map((item) => (
                <div
                  key={item.account.id}
                  className="p-2.5 bg-stone-50 dark:bg-stone-950/50 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {item.account.name}
                  </span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {formatMoney(item.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Liabilities Column */}
          <div className="p-4 space-y-3">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Debts & Liabilities</span>
              <span className="font-mono">{formatMoney(netWorth.totalLiabilities)}</span>
            </div>
            <div className="space-y-1.5">
              {netWorth.liabilitiesByAccount.length === 0 ? (
                <div className="text-xs text-stone-400 py-3 italic">No debts or liabilities recorded.</div>
              ) : (
                netWorth.liabilitiesByAccount.map((item) => (
                  <div
                    key={item.account.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-950/50 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {item.account.name}
                    </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {formatMoney(item.balance)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
