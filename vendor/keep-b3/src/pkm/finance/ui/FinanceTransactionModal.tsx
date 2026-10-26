import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Calendar, DollarSign, ArrowRightLeft, FileText, CheckCircle2, Paperclip } from 'lucide-react';
import {
  FinanceTransaction,
  FinanceAccount,
  FinanceCategory,
  TransactionType,
  TransactionStatus,
  TransactionSplit,
} from '../financeTypes';
import {
  Money,
  createMoney,
  formatMoney,
  moneyToDecimalString,
  parseMoneyInput,
  sumMoney,
  DEFAULT_CURRENCY,
} from '../money';
import { financeService } from '../financeService';

interface FinanceTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  initialTransaction?: FinanceTransaction | null;
  defaultAccountId?: string;
  defaultType?: TransactionType;
  onSave: (tx: FinanceTransaction) => void;
}

export const FinanceTransactionModal: React.FC<FinanceTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  initialTransaction,
  defaultAccountId,
  defaultType = 'expense',
  onSave,
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<TransactionType>(initialTransaction?.type || defaultType);
  const [accountId, setAccountId] = useState<string>(
    initialTransaction?.accountId || defaultAccountId || (accounts[0]?.id || '')
  );
  const [transferAccountId, setTransferAccountId] = useState<string>(
    initialTransaction?.transferAccountId || (accounts.find((a) => a.id !== accountId)?.id || '')
  );
  const [date, setDate] = useState<string>(
    initialTransaction?.date || new Date().toISOString().split('T')[0]
  );
  const [amountInput, setAmountInput] = useState<string>(
    initialTransaction ? moneyToDecimalString(initialTransaction.amount) : ''
  );
  const [payee, setPayee] = useState<string>(initialTransaction?.payee || '');
  const [categoryId, setCategoryId] = useState<string>(initialTransaction?.categoryId || '');
  const [description, setDescription] = useState<string>(initialTransaction?.description || '');
  const [status, setStatus] = useState<TransactionStatus>(initialTransaction?.status || 'cleared');
  const [tagsInput, setTagsInput] = useState<string>(
    initialTransaction?.tags ? initialTransaction.tags.join(', ') : ''
  );

  // Split transactions
  const [isSplit, setIsSplit] = useState<boolean>(
    Boolean(initialTransaction?.splits && initialTransaction.splits.length > 0)
  );
  const [splits, setSplits] = useState<TransactionSplit[]>(
    initialTransaction?.splits || [
      { id: 'sp-1', amount: createMoney(0), categoryId: categories[0]?.id },
      { id: 'sp-2', amount: createMoney(0), categoryId: categories[1]?.id },
    ]
  );

  const [error, setError] = useState<string | null>(null);

  const currentAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const currency = currentAccount?.currency || DEFAULT_CURRENCY;

  const handleAddSplit = () => {
    setSplits([
      ...splits,
      {
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        amount: createMoney(0, currency),
        categoryId: categories[0]?.id,
      },
    ]);
  };

  const handleUpdateSplit = (index: number, field: keyof TransactionSplit, val: any) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], [field]: val };
    setSplits(updated);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedMoney = parseMoneyInput(amountInput, currency);
    if (parsedMoney.amountMinor <= 0 && type !== 'adjustment') {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    if (type === 'transfer') {
      if (!transferAccountId || transferAccountId === accountId) {
        setError('Please select a different destination account for the transfer.');
        return;
      }

      try {
        if (initialTransaction && initialTransaction.transferId) {
          // Update existing transfer
          financeService.updateTransaction(initialTransaction.id, {
            date,
            amount: parsedMoney,
            payee,
            description,
            status,
          });
          onClose();
        } else {
          // Create new transfer pair
          const res = financeService.createTransfer({
            fromAccountId: accountId,
            toAccountId: transferAccountId,
            date,
            amount: parsedMoney,
            description,
            payee,
            tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
          });
          onSave(res.fromTransaction);
          onClose();
        }
        return;
      } catch (err: any) {
        setError(err?.message || 'Failed to execute transfer.');
        return;
      }
    }

    // Process Splits if enabled
    let finalSplits: TransactionSplit[] | undefined = undefined;
    if (isSplit) {
      const splitTotal = sumMoney(splits.map((s) => s.amount), currency);
      if (splitTotal.amountMinor !== parsedMoney.amountMinor) {
        setError(
          `Split amounts total (${formatMoney(splitTotal)}) does not match the transaction total (${formatMoney(parsedMoney)}). Difference: ${formatMoney(
            Math.abs(splitTotal.amountMinor - parsedMoney.amountMinor),
            currency
          )}`
        );
        return;
      }
      finalSplits = splits;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (initialTransaction) {
      const updated = financeService.updateTransaction(initialTransaction.id, {
        accountId,
        date,
        type,
        amount: parsedMoney,
        payee: payee.trim() || undefined,
        categoryId: isSplit ? undefined : categoryId || undefined,
        splits: finalSplits,
        description: description.trim() || undefined,
        status,
        tags,
      });
      if (updated) {
        onSave(updated);
        onClose();
      }
    } else {
      const created = financeService.createTransaction({
        accountId,
        date,
        type,
        amount: parsedMoney,
        payee: payee.trim() || undefined,
        categoryId: isSplit ? undefined : categoryId || undefined,
        splits: finalSplits,
        description: description.trim() || undefined,
        status,
        tags,
      });
      onSave(created);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <p className="text-xs text-stone-500">
                Deterministic local-first financial record
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

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : t === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Amount ({currency})
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Account Selection */}
          {type !== 'transfer' ? (
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type} • {acc.currency})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  From Account (Source)
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  To Account (Destination)
                </label>
                <select
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Payee / Merchant */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Payee / Merchant / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Whole Foods, Employer, Landlord"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category & Split Toggle (for non-transfers) */}
          {type !== 'transfer' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsSplit(!isSplit)}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {isSplit ? 'Single Category' : '+ Split Transaction'}
                </button>
              </div>

              {!isSplit ? (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">(Uncategorized)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Splits
                  </div>
                  {splits.map((split, index) => (
                    <div key={split.id} className="flex items-center gap-2">
                      <select
                        value={split.categoryId || ''}
                        onChange={(e) => handleUpdateSplit(index, 'categoryId', e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Amount"
                        value={moneyToDecimalString(split.amount)}
                        onChange={(e) =>
                          handleUpdateSplit(index, 'amount', parseMoneyInput(e.target.value, currency))
                        }
                        className="w-24 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono text-right"
                      />
                      {splits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(index)}
                          className="p-1 text-stone-400 hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Split Line
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes / Memo */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Notes & Memo
            </label>
            <input
              type="text"
              placeholder="Optional details or context"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Tags & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="vacation, tax-deductible"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>
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
            {initialTransaction ? 'Save Changes' : 'Record Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};
