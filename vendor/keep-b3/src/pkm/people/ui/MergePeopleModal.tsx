/**
 * Safe Merge People Modal for Phase P48
 * 
 * Side-by-side comparison, conflict picker, alias retention, and atomic execution
 * with P29 Recovery Point snapshot protection and safe trashing.
 */

import React, { useState } from 'react';
import {
  X,
  GitMerge,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { PersonDuplicateCandidate, MergePlan, PersonRecord } from '../peopleTypes';
import { Note, Folder, SavedSearch, AppSettings } from '../../../types';
import { executeMergePeople } from '../peopleMergeEngine';

interface MergePeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: PersonDuplicateCandidate | null;
  notes: Note[];
  folders?: Folder[];
  savedSearches?: SavedSearch[];
  settings?: AppSettings;
  saveNote?: (updatedNote: Note) => Promise<void>;
  onSaveNote?: (updatedNote: Note) => Promise<void>;
  deleteNote?: (noteId: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onMergeComplete?: (survivorNoteId: string) => void;
}

export const MergePeopleModal: React.FC<MergePeopleModalProps> = ({
  isOpen,
  onClose,
  candidate: candidateProp,
  notes,
  folders = [],
  savedSearches = [],
  settings = {} as any,
  saveNote,
  onSaveNote,
  deleteNote,
  onDeleteNote,
  onMergeComplete,
}) => {
  const actualSave = onSaveNote || saveNote || (async () => {});
  const actualDelete = onDeleteNote || deleteNote || (async () => {});

  // If no candidate is passed, pick first from service
  const candidate = candidateProp || null;

  if (!isOpen || !candidate) return null;

  const { personA, personB, reasons, details } = candidate;

  // Survivor is either Person A or Person B
  const [survivorId, setSurvivorId] = useState<string>(personA.id);
  const survivor = survivorId === personA.id ? personA : personB;
  const duplicate = survivorId === personA.id ? personB : personA;

  // Field winners
  const [nameWinner, setNameWinner] = useState<'personA' | 'personB'>(
    survivorId === personA.id ? 'personA' : 'personB'
  );
  const [roleWinner, setRoleWinner] = useState<'personA' | 'personB'>(
    personA.role ? 'personA' : 'personB'
  );
  const [bdayWinner, setBdayWinner] = useState<'personA' | 'personB'>(
    personA.birthday ? 'personA' : 'personB'
  );

  const [preserveAlias, setPreserveAlias] = useState(true);
  const [mergeEmails, setMergeEmails] = useState(true);
  const [mergePhones, setMergePhones] = useState(true);
  const [bodyStrategy, setBodyStrategy] = useState<'append_duplicate_section' | 'keep_survivor_only'>(
    'append_duplicate_section'
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwapSurvivor = () => {
    const newSurvId = survivorId === personA.id ? personB.id : personA.id;
    setSurvivorId(newSurvId);
    setNameWinner(newSurvId === personA.id ? 'personA' : 'personB');
  };

  const handleExecuteMerge = async () => {
    setIsExecuting(true);
    setErrorMsg(null);

    const plan: MergePlan = {
      survivorId,
      duplicateId: duplicate.id,
      survivorName: survivor.displayName,
      duplicateName: duplicate.displayName,
      preserveDuplicateNameAsAlias: preserveAlias,
      fieldChoices: [
        { field: 'displayName', winner: nameWinner },
        { field: 'role', winner: roleWinner },
        { field: 'birthday', winner: bdayWinner },
      ],
      mergeEmails,
      mergePhones,
      mergeWebsites: true,
      mergeAddresses: true,
      mergeTags: true,
      bodyMergeStrategy: bodyStrategy,
    };

    try {
      const result = await executeMergePeople({
        plan,
        notes,
        folders,
        savedSearches,
        settings,
        saveNote: actualSave,
        deleteNote: actualDelete,
      });

      if (result.success) {
        onMergeComplete?.(result.survivorNote.id);
        onClose();
      } else {
        setErrorMsg(result.error || 'Merge failed to execute.');
      }
    } catch (err: any) {
      console.error('Merge execution error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during merge.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <GitMerge className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Review & Merge Contacts</h2>
              <p className="text-xs text-neutral-400">
                Consolidate duplicate records without losing notes, relations, or history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Match Reason Banner */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Matching Signals Detected:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-300/90">
              {details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card A */}
            <div
              className={`rounded-lg border p-3 transition-colors ${
                survivorId === personA.id
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-neutral-800 bg-neutral-800/40 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-400">Record A</span>
                {survivorId === personA.id && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                    <UserCheck className="h-3 w-3" />
                    Primary (Survivor)
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-neutral-100">{personA.displayName}</div>
              <div className="text-xs text-neutral-400">{personA.role || 'No role'}</div>
              <div className="mt-2 space-y-1 text-xs text-neutral-300 border-t border-neutral-800/60 pt-2">
                <div>
                  <span className="text-neutral-500">Emails: </span>
                  {personA.emails.map((e) => e.address).join(', ') || '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Phones: </span>
                  {personA.phones.map((p) => p.number).join(', ') || '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Birthday: </span>
                  {personA.birthday?.formattedDisplay || '—'}
                </div>
              </div>
            </div>

            {/* Card B */}
            <div
              className={`rounded-lg border p-3 transition-colors ${
                survivorId === personB.id
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-neutral-800 bg-neutral-800/40 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-400">Record B</span>
                {survivorId === personB.id && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                    <UserCheck className="h-3 w-3" />
                    Primary (Survivor)
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-neutral-100">{personB.displayName}</div>
              <div className="text-xs text-neutral-400">{personB.role || 'No role'}</div>
              <div className="mt-2 space-y-1 text-xs text-neutral-300 border-t border-neutral-800/60 pt-2">
                <div>
                  <span className="text-neutral-500">Emails: </span>
                  {personB.emails.map((e) => e.address).join(', ') || '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Phones: </span>
                  {personB.phones.map((p) => p.number).join(', ') || '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Birthday: </span>
                  {personB.birthday?.formattedDisplay || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Survivor Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwapSurvivor}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Swap Primary Note Target</span>
            </button>
          </div>

          {/* Merge Configurations */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-800/20 p-3.5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Conflict & Retention Settings
            </h4>

            {/* Display Name Selection */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300">Display Name:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNameWinner('personA')}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    nameWinner === 'personA'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-neutral-700 text-neutral-400'
                  }`}
                >
                  {personA.displayName}
                </button>
                <button
                  type="button"
                  onClick={() => setNameWinner('personB')}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    nameWinner === 'personB'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-neutral-700 text-neutral-400'
                  }`}
                >
                  {personB.displayName}
                </button>
              </div>
            </div>

            {/* Aliases */}
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveAlias}
                onChange={(e) => setPreserveAlias(e.target.checked)}
                className="rounded border-neutral-700 text-blue-500 focus:ring-0"
              />
              <span>
                Preserve duplicate title (<strong className="text-neutral-200">{duplicate.displayName}</strong>) as an alias on survivor
              </span>
            </label>

            {/* Email / Phone Merges */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800">
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeEmails}
                  onChange={(e) => setMergeEmails(e.target.checked)}
                  className="rounded border-neutral-700 text-blue-500 focus:ring-0"
                />
                <span>Union all emails ({personA.emails.length + personB.emails.length})</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergePhones}
                  onChange={(e) => setMergePhones(e.target.checked)}
                  className="rounded border-neutral-700 text-blue-500 focus:ring-0"
                />
                <span>Union all phones ({personA.phones.length + personB.phones.length})</span>
              </label>
            </div>

            {/* Body Merge Strategy */}
            <div className="pt-2 border-t border-neutral-800">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Note Content Strategy
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyStrategy"
                    value="append_duplicate_section"
                    checked={bodyStrategy === 'append_duplicate_section'}
                    onChange={() => setBodyStrategy('append_duplicate_section')}
                    className="border-neutral-700 text-blue-500 focus:ring-0"
                  />
                  <span>Append duplicate body under a "Notes from Merged Record" section</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyStrategy"
                    value="keep_survivor_only"
                    checked={bodyStrategy === 'keep_survivor_only'}
                    onChange={() => setBodyStrategy('keep_survivor_only')}
                    className="border-neutral-700 text-blue-500 focus:ring-0"
                  />
                  <span>Keep survivor body only (discard duplicate body)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Safety Guarantee Notice */}
          <div className="flex items-start gap-2 rounded-lg bg-neutral-800/60 p-3 text-[11px] text-neutral-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-300">Safety Guarantee:</strong> A P29 Recovery snapshot is taken before executing. All wikilinks and relations across your entire vault will be rewritten to point to the survivor. The duplicate note will be moved to Trash (never permanently destroyed).
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExecuting}
            onClick={handleExecuteMerge}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{isExecuting ? 'Merging...' : 'Execute Safe Merge'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
