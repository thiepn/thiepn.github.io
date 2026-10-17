import React, { useMemo } from 'react';
import { Scale, Plus, CheckCircle2, AlertTriangle, Calendar, Landmark } from 'lucide-react';
import { FinanceAccount, FinanceReconciliation } from '../financeTypes';
import { formatMoney } from '../money';
import { financeService } from '../financeService';

interface FinanceReconciliationTabProps {
  accounts: FinanceAccount[];
  reconciliations: FinanceReconciliation[];
  onOpenReconcileModal: (account: FinanceAccount) => void;
}

export const FinanceReconciliationTab: React.FC<FinanceReconciliationTabProps> = ({
  accounts,
  reconciliations,
  onOpenReconcileModal,
}) => {
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Account Reconciliations
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Reconcile your local ledger with official bank or credit card statements to prove balance accuracy, find missing charges, and guarantee integrity.
          </p>
        </div>

        {accounts.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenReconcileModal(accounts[0])}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Start Reconciliation
          </button>
        )}
      </div>

      {/* Account Quick-Reconcile Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
          Accounts Ready for Reconciliation
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const lastRecon = reconciliations
              .filter((r) => r.accountId === acc.id)
              .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];

            return (
              <div
                key={acc.id}
                className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {acc.name}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded font-mono text-stone-600 dark:text-stone-400">
                      {acc.currency}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 mt-2">
                    {lastRecon ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled to {lastRecon.statementDate}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Never reconciled</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => onOpenReconcileModal(acc)}
                    className="w-full py-2 bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-500 dark:hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Reconcile {acc.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Reconciliation Sessions History Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Reconciliation History
          </h3>
          <span className="text-xs text-stone-500">{reconciliations.length} Sessions</span>
        </div>

        {reconciliations.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No completed reconciliation sessions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 text-stone-500">
                  <th className="py-2.5 px-4 font-semibold">Statement Date</th>
                  <th className="py-2.5 px-4 font-semibold">Account</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Statement Balance</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Cleared Balance</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Difference</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {reconciliations.map((recon) => {
                  const acc = accMap.get(recon.accountId);
                  const isBalanced = recon.difference.amountMinor === 0;

                  return (
                    <tr key={recon.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40">
                      <td className="py-2.5 px-4 font-mono text-stone-600 dark:text-stone-400">
                        {recon.statementDate}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                        {acc?.name || 'Account'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-stone-900 dark:text-stone-100">
                        {formatMoney(recon.statementBalance)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-stone-900 dark:text-stone-100">
                        {formatMoney(recon.calculatedBalance)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-bold ${
                          isBalanced
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatMoney(recon.difference, undefined, { forceSign: true })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            isBalanced
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {recon.status}
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
