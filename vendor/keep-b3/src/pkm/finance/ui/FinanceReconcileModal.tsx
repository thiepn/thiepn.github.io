import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, Scale, CheckSquare, Square, DollarSign } from 'lucide-react';
import { FinanceAccount, FinanceTransaction } from '../financeTypes';
import {
  Money,
  createMoney,
  parseMoneyInput,
  moneyToDecimalString,
  formatMoney,
  DEFAULT_CURRENCY,
  subtractMoney,
} from '../money';
import { financeService } from '../financeService';

interface FinanceReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinanceAccount;
  onCompleted: () => void;
}

export const FinanceReconcileModal: React.FC<FinanceReconcileModalProps> = ({
  isOpen,
  onClose,
  account,
  onCompleted,
}) => {
  if (!isOpen) return null;

  const currency = account.currency || DEFAULT_CURRENCY;
  const isLiability = ['credit', 'loan', 'liability'].includes(account.type);

  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statementBalanceInput, setStatementBalanceInput] = useState<string>('0.00');
  const [notes, setNotes] = useState<string>('');

  // Fetch all transactions up to statement date for this account that are not already reconciled in another session
  const candidateTransactions = useMemo(() => {
    return financeService
      .getTransactionsForAccount(account.id)
      .filter((t) => t.date <= statementDate && t.status !== 'reconciled')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [account.id, statementDate]);

  // Selected transactions set
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(() => {
    // By default, select all already cleared transactions
    const initial = new Set<string>();
    candidateTransactions.forEach((t) => {
      if (t.status === 'cleared') initial.add(t.id);
    });
    return initial;
  });

  const statementBalance = useMemo(() => {
    return parseMoneyInput(statementBalanceInput, currency);
  }, [statementBalanceInput, currency]);

  // Calculate Cleared Balance based on opening balance and checked items
  const calculatedClearedBalance = useMemo(() => {
    let minor = account.openingBalance ? account.openingBalance.amountMinor : 0;

    candidateTransactions.forEach((tx) => {
      if (!selectedTxIds.has(tx.id)) return;

      const txMinor = tx.amount.amountMinor;
      if (!isLiability) {
        if (tx.type === 'income' || tx.type === 'refund' || (tx.type === 'transfer' && tx.description?.includes('Transfer from'))) {
          minor += txMinor;
        } else {
          minor -= txMinor;
        }
      } else {
        if (tx.type === 'expense' || tx.type === 'fee') {
          minor += txMinor;
        } else {
          minor -= txMinor;
        }
      }
    });

    return createMoney(minor, currency);
  }, [account.openingBalance, candidateTransactions, selectedTxIds, isLiability, currency]);

  const difference = useMemo(() => {
    return subtractMoney(statementBalance, calculatedClearedBalance);
  }, [statementBalance, calculatedClearedBalance]);

  const isBalanced = difference.amountMinor === 0;

  const toggleTx = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTxIds(next);
  };

  const handleSelectAll = () => {
    if (selectedTxIds.size === candidateTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(candidateTransactions.map((t) => t.id)));
    }
  };

  const handleFinish = () => {
    const recon = financeService.createReconciliation({
      accountId: account.id,
      statementDate,
      statementBalance,
      calculatedBalance: calculatedClearedBalance,
      difference,
      reconciledTransactionIds: Array.from(selectedTxIds),
      status: isBalanced ? 'completed' : 'discrepancy',
      notes: notes.trim() || undefined,
    });

    financeService.finalizeReconciliation(recon.id, Array.from(selectedTxIds));
    onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Reconcile Account: {account.name}
              </h3>
              <p className="text-xs text-stone-500">
                Verify cleared items against your official bank statement
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

        {/* Statement Inputs Banner */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Statement Ending Date
            </label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Statement Ending Balance
            </label>
            <input
              type="text"
              value={statementBalanceInput}
              onChange={(e) => setStatementBalanceInput(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono font-bold text-right"
            />
          </div>

          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-center ${
              isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Balanced (0.00 Difference)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Difference: {formatMoney(difference)}
                </>
              )}
            </div>
            <div className="text-xs font-mono mt-0.5">
              Cleared: {formatMoney(calculatedClearedBalance)} / Statement: {formatMoney(statementBalance)}
            </div>
          </div>
        </div>

        {/* Transaction Checklist Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Unreconciled Transactions ({candidateTransactions.length})
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              {selectedTxIds.size === candidateTransactions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {candidateTransactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No transactions found on or before {statementDate}.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {candidateTransactions.map((tx) => {
                const isSelected = selectedTxIds.has(tx.id);
                return (
                  <div
                    key={tx.id}
                    onClick={() => toggleTx(tx.id)}
                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-amber-600 dark:text-amber-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                          {tx.payee || tx.description || tx.rawDescription || 'Unnamed Transaction'}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2">
                          <span>{tx.date}</span>
                          <span className="capitalize text-[10px] px-1.5 py-0.2 bg-stone-100 dark:bg-stone-800 rounded">
                            {tx.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-right text-stone-900 dark:text-stone-100">
                      {formatMoney(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            {selectedTxIds.size} transactions marked as cleared
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                isBalanced
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-stone-950'
              }`}
            >
              {isBalanced ? 'Finish Reconciliation' : 'Save Discrepancy Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
