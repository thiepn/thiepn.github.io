import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBill,
  FinanceBudget,
} from '../financeTypes';
import {
  formatMoney,
  createMoney,
  DEFAULT_CURRENCY,
} from '../money';
import { financeService } from '../financeService';

interface FinanceOverviewTabProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  bills: FinanceBill[];
  budgets: FinanceBudget[];
  currentPeriodKey: string;
  onNavigateTab: (tab: string) => void;
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer') => void;
  onOpenNewAccount: () => void;
  onOpenNewBill: () => void;
  onEditTransaction: (tx: FinanceTransaction) => void;
}

export const FinanceOverviewTab: React.FC<FinanceOverviewTabProps> = ({
  accounts,
  transactions,
  categories,
  bills,
  budgets,
  currentPeriodKey,
  onNavigateTab,
  onOpenNewTransaction,
  onOpenNewAccount,
  onOpenNewBill,
  onEditTransaction,
}) => {
  const netWorth = useMemo(() => {
    return financeService.calculateTrackedNetWorth();
  }, [accounts, transactions]);

  const cashFlow = useMemo(() => {
    return financeService.calculateCashFlow(currentPeriodKey);
  }, [transactions, currentPeriodKey]);

  const budgetProgress = useMemo(() => {
    return financeService.calculateBudgetProgress(currentPeriodKey);
  }, [transactions, budgets, currentPeriodKey]);

  const upcomingBills = useMemo(() => {
    return financeService.getUpcomingBillOccurrences(30);
  }, [bills, transactions]);

  const recurringSuggestions = useMemo(() => {
    return financeService.detectRecurringPatterns();
  }, [transactions, bills]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 7);
  }, [transactions]);

  const catMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const accMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  const [yearStr, monthStr] = currentPeriodKey.split('-');
  const monthName = new Date(`${yearStr}-${monthStr}-01T00:00:00`).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Recurring Pattern Notification */}
      {recurringSuggestions.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {recurringSuggestions.length} Recurring Pattern{recurringSuggestions.length > 1 ? 's' : ''} Detected
              </span>
              <span className="text-stone-500 ml-1.5">
                (e.g., {recurringSuggestions[0].payee} • {formatMoney(recurringSuggestions[0].estimatedAmount)})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('bills')}
            className="px-3 py-1 font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
          >
            Review in Bills & Subscriptions
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Worth Card */}
        <div
          onClick={() => onNavigateTab('accounts')}
          className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs cursor-pointer hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Tracked Net Worth
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono">
            {formatMoney(netWorth.netWorth)}
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-stone-400">Assets: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoney(netWorth.totalAssets)}
              </span>
            </div>
            <div>
              <span className="text-stone-400">Debts: </span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {formatMoney(netWorth.totalLiabilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Flow Card */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs cursor-pointer hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Cash Flow ({monthName})
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              cashFlow.netCashFlow.amountMinor >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(cashFlow.netCashFlow, undefined, { forceSign: true })}
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs font-mono">
            <div className="text-emerald-600 dark:text-emerald-400">
              +{formatMoney(cashFlow.totalIncome)}
            </div>
            <div className="text-rose-600 dark:text-rose-400">
              -{formatMoney(cashFlow.totalExpenses)}
            </div>
            <div className="text-stone-500 font-sans text-[11px]">
              {cashFlow.savingsRatePercent}% saved
            </div>
          </div>
        </div>

        {/* Monthly Budget Health Card */}
        <div
          onClick={() => onNavigateTab('budget')}
          className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs cursor-pointer hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Monthly Budget Progress
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          {budgetProgress.length > 0 ? (
            <div>
              <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono">
                {budgetProgress.filter((b) => !b.isOverBudget).length} / {budgetProgress.length}
              </div>
              <div className="text-xs text-stone-500 mt-1">Categories within budget targets</div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (budgetProgress.filter((b) => !b.isOverBudget).length / budgetProgress.length) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                No budget targets set for {monthName}
              </div>
              <div className="text-xs text-stone-400 mt-1">Click to configure budget targets</div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Recent Transactions & Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Recent Transactions
              </h3>
              <span className="text-xs text-stone-400 font-mono">({transactions.length} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('transactions')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                View Ledger
              </button>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-500">
              No transactions recorded yet. Click <strong>+ Expense</strong> or <strong>+ Income</strong> to start your private ledger.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {recentTransactions.map((tx) => {
                const acc = accMap.get(tx.accountId);
                const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                const isPositive = tx.type === 'income' || tx.type === 'refund';

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="p-3.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isPositive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {tx.payee || tx.description || tx.rawDescription || 'Unnamed Transaction'}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{acc?.name || 'Account'}</span>
                          {cat && (
                            <>
                              <span>•</span>
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${cat.color}20`,
                                  color: cat.color,
                                }}
                              >
                                {cat.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs font-mono font-bold ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatMoney(tx.amount)}
                      </div>
                      <div className="text-[10px] text-stone-400 capitalize">{tx.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Upcoming Bills & Subscriptions */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              Upcoming (30 Days)
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('bills')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              All Bills
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {upcomingBills.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-500">
                No upcoming bills or renewals scheduled.
              </div>
            ) : (
              upcomingBills.slice(0, 5).map((occ, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">{occ.bill.name}</div>
                    <div className="text-[11px] text-stone-500">Due: {occ.dueDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {occ.amount ? formatMoney(occ.amount) : 'Variable'}
                    </div>
                    {occ.isPaid ? (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">Pending</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
