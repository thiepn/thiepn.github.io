import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, X, ShieldAlert, Check } from 'lucide-react';
import { Note } from '../../types';
import { hashPasscode, verifyPasscode, unlockNoteInSession, lockNoteInSession } from '../../utils/crypto';

interface LockNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onUpdateLockState: (isLocked: boolean, lockHash?: string) => void;
  onNoteUnlocked?: () => void;
}

export const LockNoteModal: React.FC<LockNoteModalProps> = ({
  isOpen,
  onClose,
  note,
  onUpdateLockState,
  onNoteUnlocked,
}) => {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const isCurrentlyLocked = Boolean(note.isLocked && note.lockHash);

  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter a passcode or PIN');
      return;
    }
    if (passcode !== confirmPasscode) {
      setErrorMsg('Passcodes do not match');
      return;
    }

    try {
      setIsVerifying(true);
      const hash = await hashPasscode(passcode);
      unlockNoteInSession(note.id);
      onUpdateLockState(true, hash);
      onClose();
    } catch {
      setErrorMsg('Failed to lock note securely');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlockNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter the passcode');
      return;
    }

    try {
      setIsVerifying(true);
      const isValid = await verifyPasscode(passcode, note.lockHash || '');
      if (isValid) {
        unlockNoteInSession(note.id);
        if (onNoteUnlocked) onNoteUnlocked();
        onClose();
      } else {
        setErrorMsg('Incorrect passcode. Please try again.');
      }
    } catch {
      setErrorMsg('Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveLock = async () => {
    if (!passcode.trim()) {
      setErrorMsg('Enter the current passcode to remove protection');
      return;
    }

    try {
      setIsVerifying(true);
      const isValid = await verifyPasscode(passcode, note.lockHash || '');
      if (isValid) {
        lockNoteInSession(note.id);
        onUpdateLockState(false, undefined);
        onClose();
      } else {
        setErrorMsg('Incorrect passcode');
      }
    } catch {
      setErrorMsg('Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#18181b] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-700/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs">
              {isCurrentlyLocked ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isCurrentlyLocked ? 'Locked Note' : 'Lock Note with Passcode'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isCurrentlyLocked
                  ? 'Enter passcode to view or manage note protection'
                  : 'Protect sensitive contents with client-side SHA-256'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Unlock Form or Set Lock Form */}
        {isCurrentlyLocked ? (
          <form onSubmit={handleUnlockNote} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Enter Passcode / PIN:
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white focus:outline-hidden focus:border-amber-400 text-sm tracking-widest text-center"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Note</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveLock}
                disabled={isVerifying}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Remove Lock
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetLock} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Create Passcode or PIN:
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                placeholder="Enter passcode..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white focus:outline-hidden focus:border-amber-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Confirm Passcode:
              </label>
              <input
                type="password"
                value={confirmPasscode}
                onChange={(e) => {
                  setConfirmPasscode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Confirm passcode..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white focus:outline-hidden focus:border-amber-400 text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Lock This Note</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
