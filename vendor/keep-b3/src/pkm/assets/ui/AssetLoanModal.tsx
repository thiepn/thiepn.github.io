import React, { useState } from 'react';
import { Asset, AssetLoan } from '../assetTypes';
import { lendOrBorrowAsset, returnLoanedAsset } from '../assetService';
import { getPeople } from '../../people/peopleService';
import {
  X,
  Share2,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface AssetLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  activeLoan?: AssetLoan;
  onSaved?: () => void;
}

export const AssetLoanModal: React.FC<AssetLoanModalProps> = ({
  isOpen,
  onClose,
  asset,
  activeLoan,
  onSaved,
}) => {
  const [direction, setDirection] = useState<'lent' | 'borrowed'>(activeLoan?.direction || 'lent');
  const [personId, setPersonId] = useState(activeLoan?.personId || '');
  const [borrowerName, setBorrowerName] = useState(activeLoan?.borrowerName || '');
  const [startedAt, setStartedAt] = useState(activeLoan?.startedAt || new Date().toISOString().slice(0, 10));
  const [dueAt, setDueAt] = useState(activeLoan?.dueAt || '');
  const [notes, setNotes] = useState(activeLoan?.notes || '');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const people = getPeople();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startedAt) return;

    const result = lendOrBorrowAsset({
      id: activeLoan?.id,
      assetId: asset.id,
      personId: personId || undefined,
      borrowerName: borrowerName.trim() || undefined,
      direction,
      startedAt,
      dueAt: dueAt || undefined,
      notes: notes.trim() || undefined,
    });

    if (result.conflict) {
      setConflictWarning(result.conflict);
    }

    if (onSaved) onSaved();
    onClose();
  };

  const handleReturn = () => {
    if (!activeLoan) return;
    returnLoanedAsset(activeLoan.id);
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">
              {activeLoan ? `Manage Loan: ${asset.name}` : `Lend / Borrow Item`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {activeLoan && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center justify-between">
              <div>
                Item currently {activeLoan.direction} since {activeLoan.startedAt}.
              </div>
              <button
                type="button"
                onClick={handleReturn}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition text-xs flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark Returned
              </button>
            </div>
          )}

          {conflictWarning && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>{conflictWarning}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Loan Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('lent')}
                className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition ${
                  direction === 'lent'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Lent to someone
              </button>
              <button
                type="button"
                onClick={() => setDirection('borrowed')}
                className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition ${
                  direction === 'borrowed'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Borrowed from someone
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Linked Contact / Person (CRM)
            </label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">(Select from Contacts, or enter custom name below)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.noteTitle} {p.role ? `(${p.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {!personId && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Borrower / Lender Name
              </label>
              <input
                type="text"
                placeholder="e.g. Neighbor Dave, Alex"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Date Handed Over *
              </label>
              <input
                type="date"
                required
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Notes / Condition on Handover
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Lent with 2 batteries and charger..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
            >
              Save Loan Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
