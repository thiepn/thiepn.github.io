import React, { useState } from 'react';
import { X, Calendar, Clock, RefreshCw, AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  FinanceBill,
  FinanceCategory,
  FinanceAccount,
  RecurrenceFrequency,
  PriceHistoryEntry,
} from '../financeTypes';
import {
  Money,
  createMoney,
  parseMoneyInput,
  moneyToDecimalString,
  DEFAULT_CURRENCY,
  formatMoney,
} from '../money';
import { financeService } from '../financeService';

interface FinanceBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  initialBill?: FinanceBill | null;
  onSave: (bill: FinanceBill) => void;
}

export const FinanceBillModal: React.FC<FinanceBillModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  initialBill,
  onSave,
}) => {
  if (!isOpen) return null;

  const currency = initialBill?.currency || accounts[0]?.currency || DEFAULT_CURRENCY;

  const [name, setName] = useState<string>(initialBill?.name || '');
  const [type, setType] = useState<'bill' | 'subscription'>(initialBill?.type || 'subscription');
  const [payee, setPayee] = useState<string>(initialBill?.payee || '');
  const [amountInput, setAmountInput] = useState<string>(
    initialBill?.amount ? moneyToDecimalString(initialBill.amount) : ''
  );
  const [isVariableAmount, setIsVariableAmount] = useState<boolean>(
    Boolean(initialBill?.isVariableAmount)
  );
  const [categoryId, setCategoryId] = useState<string>(initialBill?.categoryId || '');
  const [accountId, setAccountId] = useState<string>(initialBill?.accountId || '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initialBill?.recurrence.frequency || 'monthly'
  );
  const [startDate, setStartDate] = useState<string>(
    initialBill?.recurrence.startDate || new Date().toISOString().split('T')[0]
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(
    initialBill?.reminderDaysBefore ?? 3
  );
  const [status, setStatus] = useState<'active' | 'paused' | 'cancelled' | 'archived'>(
    initialBill?.status || 'active'
  );
  const [url, setUrl] = useState<string>(initialBill?.url || '');
  const [notes, setNotes] = useState<string>(initialBill?.notes || '');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(
    initialBill?.priceHistory || []
  );

  const [newHikeAmount, setNewHikeAmount] = useState<string>('');
  const [newHikeDate, setNewHikeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newHikeReason, setNewHikeReason] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  const handleAddPriceHike = () => {
    const parsed = parseMoneyInput(newHikeAmount, currency);
    if (parsed.amountMinor <= 0) return;

    setPriceHistory([
      ...priceHistory,
      {
        effectiveDate: newHikeDate,
        amount: parsed,
        reason: newHikeReason.trim() || undefined,
      },
    ]);
    setNewHikeAmount('');
    setNewHikeReason('');
  };

  const handleRemovePriceHike = (index: number) => {
    setPriceHistory(priceHistory.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a name for this bill or subscription.');
      return;
    }

    const amount = amountInput ? parseMoneyInput(amountInput, currency) : undefined;

    if (initialBill) {
      const updated = financeService.updateBill(initialBill.id, {
        name: name.trim(),
        type,
        payee: payee.trim() || undefined,
        amount,
        isVariableAmount,
        currency,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        recurrence: {
          frequency,
          startDate,
        },
        priceHistory,
        status,
        reminderDaysBefore,
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (updated) {
        onSave(updated);
        onClose();
      }
    } else {
      const created = financeService.createBill({
        name: name.trim(),
        type,
        payee: payee.trim() || undefined,
        amount,
        isVariableAmount,
        currency,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        recurrence: {
          frequency,
          startDate,
        },
        priceHistory,
        status,
        reminderDaysBefore,
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
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
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialBill ? 'Edit Bill / Subscription' : 'New Recurring Bill or Subscription'}
              </h3>
              <p className="text-xs text-stone-500">
                Track renewal schedules, price hikes, and cash flow impacts
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
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl">
            <button
              type="button"
              onClick={() => setType('subscription')}
              className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                type === 'subscription'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Subscription (Software, Media)
            </button>
            <button
              type="button"
              onClick={() => setType('bill')}
              className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                type === 'bill'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Bill (Utility, Rent, Insurance)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Service / Bill Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GitHub Copilot, Netflix, Electric Utility"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Amount ({currency})
              </label>
              <input
                type="text"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannual">Bi-Annual (6 Months)</option>
                <option value="annual">Annual / Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Next Renewal / Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Reminder Notice
              </label>
              <select
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value={0}>On the day of</option>
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>7 days before</option>
                <option value={14}>14 days before</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Default Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="">(Select Category)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Linked Payment Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="">(Select Account)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price History & Price Hikes */}
          <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl">
            <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span>Price Hike & Rate Change History</span>
              <span className="text-[11px] text-stone-500 font-normal">Tracked rate adjustments</span>
            </div>

            {priceHistory.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {priceHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800"
                  >
                    <div>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatMoney(item.amount)}
                      </span>
                      <span className="text-stone-500 ml-2">from {item.effectiveDate}</span>
                      {item.reason && <span className="text-stone-400 ml-2 italic">({item.reason})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePriceHike(idx)}
                      className="text-stone-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-stone-400 py-1 italic">No historical price changes recorded.</div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="New Price"
                value={newHikeAmount}
                onChange={(e) => setNewHikeAmount(e.target.value)}
                className="w-24 px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono"
              />
              <input
                type="date"
                value={newHikeDate}
                onChange={(e) => setNewHikeDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Reason"
                value={newHikeReason}
                onChange={(e) => setNewHikeReason(e.target.value)}
                className="flex-1 px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddPriceHike}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Management Portal URL (Direct Link to Cancel/Manage)
            </label>
            <input
              type="url"
              placeholder="https://service.com/account/billing"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
            {initialBill ? 'Save Changes' : 'Save Recurring Item'}
          </button>
        </div>
      </div>
    </div>
  );
};
