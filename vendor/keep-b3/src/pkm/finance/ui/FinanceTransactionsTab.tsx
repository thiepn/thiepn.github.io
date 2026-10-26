import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Trash2,
  Tag,
  Download,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  Layers,
} from 'lucide-react';
import {
  FinanceTransaction,
  FinanceAccount,
  FinanceCategory,
  FinanceFilterState,
  DEFAULT_FINANCE_FILTER,
} from '../financeTypes';
import { formatMoney, Money } from '../money';
import { financeService } from '../financeService';
import { financeExportService } from '../financeExport';

interface FinanceTransactionsTabProps {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer') => void;
  onEditTransaction: (tx: FinanceTransaction) => void;
}

export const FinanceTransactionsTab: React.FC<FinanceTransactionsTabProps> = ({
  accounts,
  categories,
  transactions,
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const [filter, setFilter] = useState<FinanceFilterState>(DEFAULT_FINANCE_FILTER);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');

  const filteredTransactions = useMemo(() => {
    return financeService.filterTransactions(filter);
  }, [transactions, filter]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const toggleSelectTx = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTxIds(next);
  };

  const handleSelectAll = () => {
    if (selectedTxIds.size === filteredTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleBulkCategorize = () => {
    if (!bulkCategoryId || selectedTxIds.size === 0) return;
    financeService.bulkCategorize(Array.from(selectedTxIds), bulkCategoryId);
    setSelectedTxIds(new Set());
    setBulkCategoryId('');
  };

  const handleBulkDelete = () => {
    if (selectedTxIds.size === 0) return;
    if (confirm(`Delete ${selectedTxIds.size} selected transaction(s)?`)) {
      financeService.deleteTransactionsBatch(Array.from(selectedTxIds));
      setSelectedTxIds(new Set());
    }
  };

  const handleExportCSV = () => {
    const csvContent = financeExportService.exportTransactionsToCSV(filteredTransactions, accounts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search payee, notes, tags..."
            value={filter.searchQuery}
            onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`px-3 py-2 text-xs font-semibold border rounded-xl flex items-center gap-1.5 transition-colors ${
              showFiltersPanel
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-50 flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => onOpenNewTransaction('expense')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFiltersPanel && (
        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Filter Options
            </h4>
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FINANCE_FILTER)}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Account Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">Account</label>
              <select
                value={filter.accountIds[0] || ''}
                onChange={(e) =>
                  setFilter({ ...filter, accountIds: e.target.value ? [e.target.value] : [] })
                }
                className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">Category</label>
              <select
                value={filter.categoryIds[0] || ''}
                onChange={(e) =>
                  setFilter({ ...filter, categoryIds: e.target.value ? [e.target.value] : [] })
                }
                className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">From Date</label>
              <input
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">To Date</label>
              <input
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filter.isUncategorized)}
                onChange={(e) => setFilter({ ...filter, isUncategorized: e.target.checked })}
                className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
              />
              Uncategorized only
            </label>
          </div>
        </div>
      )}

      {/* Batch Operations Floating Bar */}
      {selectedTxIds.size > 0 && (
        <div className="p-3 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-xl flex items-center justify-between text-xs shadow-lg">
          <div className="flex items-center gap-2 font-bold">
            <span>{selectedTxIds.size} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                className="px-2 py-1 bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 rounded-lg text-xs"
              >
                <option value="">Choose category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkCategorize}
                disabled={!bulkCategoryId}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-lg"
              >
                Categorize
              </button>
            </div>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No transactions match the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 text-stone-500">
                  <th className="py-2.5 px-3 w-8">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="p-1 text-stone-400 hover:text-stone-600"
                    >
                      {selectedTxIds.size === filteredTransactions.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Account</th>
                  <th className="py-2.5 px-3 font-semibold">Payee / Description</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {filteredTransactions.map((tx) => {
                  const acc = accMap.get(tx.accountId);
                  const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                  const isSelected = selectedTxIds.has(tx.id);
                  const isPositive = tx.type === 'income' || tx.type === 'refund';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/20'
                          : 'hover:bg-stone-50/80 dark:hover:bg-stone-800/40'
                      }`}
                    >
                      <td
                        className="py-2.5 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectTx(tx.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300 font-medium whitespace-nowrap">
                        {acc?.name || 'Account'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>{tx.payee || tx.description || tx.rawDescription || 'Unnamed'}</span>
                          {tx.splits && tx.splits.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded text-[10px] flex items-center gap-0.5">
                              <Layers className="w-2.5 h-2.5" /> Split ({tx.splits.length})
                            </span>
                          )}
                        </div>
                        {tx.description && tx.payee && (
                          <div className="text-[11px] text-stone-500 line-clamp-1">{tx.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {cat ? (
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: `${cat.color}20`,
                              color: cat.color,
                            }}
                          >
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">(Uncategorized)</span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatMoney(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
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
    </div>
  );
};
