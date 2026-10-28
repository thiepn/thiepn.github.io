import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  FinanceBill,
  FinanceCategory,
  FinanceAccount,
  FinanceTransaction,
  RecurringPatternSuggestion,
} from '../financeTypes';
import { formatMoney, createMoney, DEFAULT_CURRENCY } from '../money';
import { financeService } from '../financeService';

interface FinanceBillsTabProps {
  bills: FinanceBill[];
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  onOpenNewBill: () => void;
  onEditBill: (bill: FinanceBill) => void;
}

export const FinanceBillsTab: React.FC<FinanceBillsTabProps> = ({
  bills,
  categories,
  accounts,
  transactions,
  onOpenNewBill,
  onEditBill,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'subscription' | 'bill'>('all');

  const subscriptionCosts = useMemo(() => {
    return financeService.calculateSubscriptionCosts();
  }, [bills]);

  const recurringSuggestions = useMemo(() => {
    return financeService.detectRecurringPatterns();
  }, [transactions, bills]);

  const upcomingOccurrences = useMemo(() => {
    return financeService.getUpcomingBillOccurrences(45);
  }, [bills, transactions]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (filterType === 'subscription') return b.type === 'subscription';
      if (filterType === 'bill') return b.type === 'bill';
      return true;
    });
  }, [bills, filterType]);

  const handleConvertSuggestion = (sug: RecurringPatternSuggestion) => {
    const created = financeService.createBill({
      name: sug.payee,
      type: 'subscription',
      payee: sug.payee,
      amount: sug.estimatedAmount,
      currency: sug.estimatedAmount.currency,
      categoryId: sug.matchedCategoryId,
      accountId: sug.matchedAccountId,
      recurrence: {
        frequency: sug.frequency,
        startDate: sug.lastDate,
      },
      status: 'active',
      notes: `Auto-detected from transaction history pattern (${sug.sampleTransactionIds.length} occurrences)`,
    });
  };

  const handleDeleteBill = (bill: FinanceBill) => {
    if (confirm(`Remove recurring item "${bill.name}"?`)) {
      financeService.deleteBill(bill.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cost Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Active Subscriptions</div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            {subscriptionCosts.activeCount}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Monthly Equivalent Cost</div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatMoney(subscriptionCosts.totalMonthlyEquivalent)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Normalized monthly burn</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 mb-1">Annualized Equivalent Cost</div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            {formatMoney(subscriptionCosts.totalAnnualEquivalent)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Per-year commitment</div>
        </div>
      </div>

      {/* Auto-Detected Pattern Suggestions */}
      {recurringSuggestions.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Detected Recurring Expenses
            </h4>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            These repeating payments were found in your transaction history and can be tracked as formal subscriptions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {recurringSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-3 bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">{sug.payee}</div>
                  <div className="text-[11px] text-stone-500 capitalize">
                    {sug.frequency} • ~{formatMoney(sug.estimatedAmount)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleConvertSuggestion(sug)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg transition-colors"
                >
                  Track Subscription
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            All ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('subscription')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterType === 'subscription'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setFilterType('bill')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterType === 'bill'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Bills & Utilities
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenNewBill}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Recurring Item
        </button>
      </div>

      {/* Bills Cards Grid */}
      {filteredBills.length === 0 ? (
        <div className="p-12 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
          No recurring bills or subscriptions configured. Click <strong>Add Recurring Item</strong> to keep tabs on subscriptions and renewal schedules.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const cat = bill.categoryId ? catMap.get(bill.categoryId) : undefined;
            const acc = bill.accountId ? accMap.get(bill.accountId) : undefined;

            return (
              <div
                key={bill.id}
                className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {bill.name}
                      </h4>
                      <div className="text-[11px] text-stone-500 capitalize flex items-center gap-1.5 mt-0.5">
                        <span>{bill.type}</span>
                        <span>•</span>
                        <span>{bill.recurrence.frequency}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {bill.url && (
                        <a
                          href={bill.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-1 text-stone-400 hover:text-amber-500 rounded"
                          title="Open Cancellation / Billing Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditBill(bill)}
                        className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBill(bill)}
                        className="p-1 text-stone-400 hover:text-rose-500 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                        Amount
                      </div>
                      <div className="text-lg font-black font-mono text-stone-900 dark:text-stone-100">
                        {bill.amount ? formatMoney(bill.amount) : 'Variable'}
                      </div>
                    </div>
                    {cat && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {bill.priceHistory && bill.priceHistory.length > 0 && (
                    <div className="mt-3 p-2 bg-stone-50 dark:bg-stone-950/60 rounded-lg text-[11px] text-stone-500 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-amber-500" />
                      <span>{bill.priceHistory.length} price change(s) recorded</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Starts / Renews: {bill.recurrence.startDate}</span>
                  </div>
                  <span
                    className={`capitalize font-semibold ${
                      bill.status === 'active' ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
