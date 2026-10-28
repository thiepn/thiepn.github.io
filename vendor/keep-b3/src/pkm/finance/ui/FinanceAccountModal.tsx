import React, { useState } from 'react';
import { X, Building2, Wallet, CreditCard, PiggyBank, Landmark, ShieldCheck } from 'lucide-react';
import { FinanceAccount, AccountType, AccountStatus } from '../financeTypes';
import {
  Money,
  createMoney,
  parseMoneyInput,
  moneyToDecimalString,
  CURRENCY_REGISTRY,
  DEFAULT_CURRENCY,
} from '../money';
import { financeService } from '../financeService';

interface FinanceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccount?: FinanceAccount | null;
  onSave: (account: FinanceAccount) => void;
}

export const FinanceAccountModal: React.FC<FinanceAccountModalProps> = ({
  isOpen,
  onClose,
  initialAccount,
  onSave,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialAccount?.name || '');
  const [type, setType] = useState<AccountType>(initialAccount?.type || 'checking');
  const [currency, setCurrency] = useState<string>(initialAccount?.currency || DEFAULT_CURRENCY);
  const [institution, setInstitution] = useState<string>(initialAccount?.institution || '');
  const [accountNumberMasked, setAccountNumberMasked] = useState<string>(
    initialAccount?.accountNumberMasked || ''
  );
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>(
    initialAccount?.openingBalance ? moneyToDecimalString(initialAccount.openingBalance) : '0.00'
  );
  const [openingDate, setOpeningDate] = useState<string>(
    initialAccount?.openingDate || new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<AccountStatus>(initialAccount?.status || 'active');
  const [excludeFromNetWorth, setExcludeFromNetWorth] = useState<boolean>(
    Boolean(initialAccount?.excludeFromNetWorth)
  );
  const [notes, setNotes] = useState<string>(initialAccount?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter an account name.');
      return;
    }

    const openingBalance = parseMoneyInput(openingBalanceInput, currency);

    if (initialAccount) {
      const updated = financeService.updateAccount(initialAccount.id, {
        name: name.trim(),
        type,
        currency,
        institution: institution.trim() || undefined,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        openingBalance,
        openingDate,
        status,
        excludeFromNetWorth,
        notes: notes.trim() || undefined,
      });
      if (updated) {
        onSave(updated);
        onClose();
      }
    } else {
      const created = financeService.createAccount({
        name: name.trim(),
        type,
        currency,
        institution: institution.trim() || undefined,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        openingBalance,
        openingDate,
        status,
        excludeFromNetWorth,
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
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialAccount ? 'Edit Financial Account' : 'New Financial Account'}
              </h3>
              <p className="text-xs text-stone-500">
                Private offline-first ledger entity
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

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Account Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Main Checking, Savings, Chase Sapphire"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <optgroup label="Cash & Assets">
                  <option value="checking">Checking / Current</option>
                  <option value="savings">Savings</option>
                  <option value="cash">Cash / Physical Wallet</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="investment">Investment / Brokerage</option>
                  <option value="asset">Other Asset</option>
                </optgroup>
                <optgroup label="Liabilities & Debts">
                  <option value="credit">Credit Card</option>
                  <option value="loan">Loan / Mortgage</option>
                  <option value="liability">Other Liability</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="other">Other</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {Object.values(CURRENCY_REGISTRY).map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} ({cur.symbol.trim()} - {cur.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Financial Institution (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Chase, Vanguard, Sparkasse"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Masked Number (optional)
              </label>
              <input
                type="text"
                placeholder="•••• 4589"
                value={accountNumberMasked}
                onChange={(e) => setAccountNumberMasked(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Opening Balance
              </label>
              <input
                type="text"
                value={openingBalanceInput}
                onChange={(e) => setOpeningBalanceInput(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Opening Date
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="excludeNetWorth"
              checked={excludeFromNetWorth}
              onChange={(e) => setExcludeFromNetWorth(e.target.checked)}
              className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="excludeNetWorth" className="text-xs text-stone-600 dark:text-stone-400">
              Exclude this account from Net Worth calculations
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Notes & Metadata
            </label>
            <textarea
              rows={2}
              placeholder="Interest rate, branch address, contact details"
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
            {initialAccount ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
