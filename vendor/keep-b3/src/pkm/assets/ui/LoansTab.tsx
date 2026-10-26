import React from 'react';
import { Asset, AssetLoan } from '../assetTypes';
import { getLoans, getAssets, returnLoanedAsset } from '../assetService';
import { getPeople } from '../../people/peopleService';
import { Share2, CheckCircle, Clock, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';

interface LoansTabProps {
  onSelectAsset: (asset: Asset) => void;
  onRefresh?: () => void;
}

export const LoansTab: React.FC<LoansTabProps> = ({ onSelectAsset, onRefresh }) => {
  const loans = getLoans();
  const assets = getAssets();
  const people = getPeople();

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const personMap = new Map(people.map((p) => [p.id, p]));

  const activeLoans = loans.filter((l) => !l.returnedAt);
  const returnedLoans = loans.filter((l) => !!l.returnedAt);

  const lentOut = activeLoans.filter((l) => l.direction === 'lent');
  const borrowed = activeLoans.filter((l) => l.direction === 'borrowed');

  const handleReturn = (loanId: string) => {
    returnLoanedAsset(loanId);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
            Lent to Others
          </div>
          <div className="text-2xl font-extrabold text-indigo-300 mt-1">{lentOut.length}</div>
        </div>

        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-amber-400" />
            Borrowed from Others
          </div>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">{borrowed.length}</div>
        </div>

        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Returned History
          </div>
          <div className="text-2xl font-extrabold text-neutral-300 mt-1">
            {returnedLoans.length}
          </div>
        </div>
      </div>

      {/* ACTIVE LOANS */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Currently Active Loans ({activeLoans.length})
        </h3>

        {activeLoans.length === 0 ? (
          <div className="text-center py-10 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
            <Share2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No assets are currently lent or borrowed.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeLoans.map((loan) => {
              const asset = assetMap.get(loan.assetId);
              const person = loan.personId ? personMap.get(loan.personId) : undefined;
              const contactName = person?.displayName || person?.noteTitle || loan.borrowerName || 'Unnamed Contact';
              const isLent = loan.direction === 'lent';

              return (
                <div
                  key={loan.id}
                  className="p-4 bg-neutral-900/70 rounded-xl border border-neutral-800 hover:border-neutral-700 transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isLent
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isLent ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" /> Lent Out
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3" /> Borrowed
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Since {loan.startedAt}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div
                        onClick={() => asset && onSelectAsset(asset)}
                        className="font-bold text-neutral-100 text-sm hover:text-indigo-400 cursor-pointer"
                      >
                        {asset ? asset.name : 'Unknown Asset'}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {isLent ? 'Lent to:' : 'Borrowed from:'}{' '}
                        <strong className="text-neutral-200">{contactName}</strong>
                      </div>
                    </div>

                    {loan.dueAt && (
                      <div className="text-xs text-amber-400 flex items-center gap-1 pt-1">
                        <Clock className="w-3.5 h-3.5" /> Due back: {loan.dueAt}
                      </div>
                    )}

                    {loan.notes && (
                      <div className="text-xs text-neutral-400 bg-neutral-950/40 p-2 rounded border border-neutral-800/60 mt-2">
                        {loan.notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleReturn(loan.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Returned
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LOAN HISTORY */}
      {returnedLoans.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Past Loan History ({returnedLoans.length})
          </h3>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Party</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {returnedLoans.map((l) => {
                  const asset = assetMap.get(l.assetId);
                  const person = l.personId ? personMap.get(l.personId) : undefined;
                  const contactName = person?.displayName || person?.noteTitle || l.borrowerName || '—';

                  return (
                    <tr key={l.id} className="hover:bg-neutral-800/40 transition">
                      <td className="p-3 font-medium text-neutral-200">{asset ? asset.name : '—'}</td>
                      <td className="p-3 capitalize text-neutral-400">{l.direction}</td>
                      <td className="p-3">{contactName}</td>
                      <td className="p-3 text-neutral-400">{l.startedAt}</td>
                      <td className="p-3 font-semibold text-emerald-400">{l.returnedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
