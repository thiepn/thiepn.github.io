import React, { useState, useMemo } from 'react';
import {
  Landmark,
  CreditCard,
  Wallet,
  PiggyBank,
  Plus,
  ArrowRightLeft,
  Scale,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  History,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { FinanceAccount, FinanceTransaction } from '../financeTypes';
import { formatMoney, createMoney, DEFAULT_CURRENCY } from '../money';
import { financeService } from '../financeService';

interface FinanceAccountsTabProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedAccountId?: string | null;
  onSelectAccount: (accountId: string | null) => void;
  onOpenNewAccount: () => void;
  onEditAccount: (account: FinanceAccount) => void;
  onOpenReconciliation: (account: FinanceAccount) => void;
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer', defaultAccountId?: string) => void;
  onEditTransaction: (tx: FinanceTransaction) => void;
}

export const FinanceAccountsTab: React.FC<FinanceAccountsTabProps> = ({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onOpenNewAccount,
  onEditAccount,
  onOpenReconciliation,
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'assets' | 'liabilities'>('all');

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const selectedLedger = useMemo(() => {
    if (!selectedAccount) return [];
    return financeService.getAccountLedger(selectedAccount.id);
  }, [selectedAccount, transactions]);

  const accountBalances = useMemo(() => {
    const map = new Map<string, { current: ReturnType<typeof financeService.calculateAccountBalance>; cleared: ReturnType<typeof financeService.calculateAccountBalance> }>();
    accounts.forEach((acc) => {
      map.set(acc.id, {
        current: financeService.calculateAccountBalance(acc.id),
        cleared: financeService.calculateAccountBalance(acc.id, { clearedOnly: true }),
      });
    });
    return map;
  }, [accounts, transactions]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const isLiab = ['credit', 'loan', 'liability'].includes(acc.type);
      if (activeFilter === 'assets') return !isLiab;
      if (activeFilter === 'liabilities') return isLiab;
      return true;
    });
  }, [accounts, activeFilter]);

  const handleDeleteAccount = (acc: FinanceAccount) => {
    if (confirm(`Are you sure you want to delete account "${acc.name}"? Transactions associated will also be removed.`)) {
      financeService.deleteAccount(acc.id, true);
      if (selectedAccountId === acc.id) {
        onSelectAccount(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            All Accounts ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('assets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeFilter === 'assets'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Assets & Cash
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('liabilities')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeFilter === 'liabilities'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Credit & Liabilities
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenNewAccount}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Financial Account
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const balances = accountBalances.get(acc.id);
          const currentBal = balances?.current || createMoney(0);
          const isSelected = selectedAccountId === acc.id;
          const isLiability = ['credit', 'loan', 'liability'].includes(acc.type);

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(isSelected ? null : acc.id)}
              className={`p-4 bg-white dark:bg-stone-900 border rounded-2xl cursor-pointer transition-all shadow-xs relative ${
                isSelected
                  ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'border-stone-200 dark:border-stone-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isLiability
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {isLiability ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {acc.name}
                    </h4>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                      <span className="capitalize">{acc.type}</span>
                      {acc.institution && <span>• {acc.institution}</span>}
                      {acc.accountNumberMasked && <span>• {acc.accountNumberMasked}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAccount(acc);
                    }}
                    className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded"
                    title="Edit Account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(acc);
                    }}
                    className="p-1 text-stone-400 hover:text-rose-500 rounded"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                    {isLiability ? 'Current Balance (Debt)' : 'Current Balance'}
                  </div>
                  <div className="text-lg font-black font-mono text-stone-900 dark:text-stone-100">
                    {formatMoney(currentBal)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReconciliation(acc);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Scale className="w-3 h-3" /> Reconcile
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Running Ledger */}
      {selectedAccount && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Ledger Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {selectedAccount.name} — Running Account Ledger
                </h3>
                <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md font-mono">
                  {selectedAccount.currency}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Opening Balance: {formatMoney(selectedAccount.openingBalance)} on {selectedAccount.openingDate}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenNewTransaction('expense', selectedAccount.id)}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
              >
                + Expense
              </button>
              <button
                type="button"
                onClick={() => onOpenNewTransaction('income', selectedAccount.id)}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
              >
                + Income
              </button>
              <button
                type="button"
                onClick={() => onOpenReconciliation(selectedAccount)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Scale className="w-3.5 h-3.5" /> Reconcile
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          {selectedLedger.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              No transactions recorded in this account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 text-stone-500">
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Payee / Description</th>
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Running Balance</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                  {selectedLedger.map((item) => {
                    const tx = item.transaction;
                    const isPositive = item.signedAmount.amountMinor > 0;

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono text-stone-600 dark:text-stone-400">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {tx.payee || tx.description || tx.rawDescription || 'Unnamed'}
                          </div>
                          {tx.description && tx.payee && (
                            <div className="text-[11px] text-stone-500">{tx.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="capitalize px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] text-stone-600 dark:text-stone-400">
                            {tx.type}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatMoney(item.signedAmount)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                          {formatMoney(item.runningBalance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] capitalize font-medium ${
                              tx.status === 'reconciled'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : tx.status === 'cleared'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
