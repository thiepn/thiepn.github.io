import React, { useState } from 'react';
import {
  Reference,
  DuplicateCandidate,
} from '../referenceTypes';
import { parseBibTeX } from '../bibtexParser';
import { findDuplicateCandidate, mergeReferenceRecords } from '../duplicateDetector';
import { generateCitationKey } from '../citationKeys';
import { formatAuthorsList } from '../personName';
import {
  FileCode,
  Upload,
  AlertCircle,
  Check,
  X,
  Copy,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface BibTeXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingReferences: Reference[];
  onImportComplete: (imported: Reference[]) => void;
  isVaultEncrypted?: boolean;
}

export const BibTeXImportModal: React.FC<BibTeXImportModalProps> = ({
  isOpen,
  onClose,
  existingReferences,
  onImportComplete,
  isVaultEncrypted = false,
}) => {
  const [bibtexText, setBibtexText] = useState('');
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [parsedReferences, setParsedReferences] = useState<Reference[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [invalidEntries, setInvalidEntries] = useState<Array<{ raw: string; error: string }>>([]);

  // User conflict resolutions: Map<duplicateCandidateId, 'keep_existing' | 'use_new' | 'merge' | 'keep_both'>
  const [resolutions, setResolutions] = useState<
    Record<string, 'keep_existing' | 'use_new' | 'merge' | 'keep_both'>
  >({});

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBibtexText(content || '');
    };
    reader.readAsText(file);
  };

  const handleAnalyze = () => {
    if (!bibtexText.trim()) return;

    const { references, errors } = parseBibTeX(bibtexText);
    setInvalidEntries(errors);

    // Run duplicate detection
    const foundDuplicates: DuplicateCandidate[] = [];
    const nonDuplicates: Reference[] = [];
    const initialResolutions: Record<string, 'keep_existing' | 'use_new' | 'merge' | 'keep_both'> = {};

    for (const ref of references) {
      const dup = findDuplicateCandidate(ref, existingReferences);
      if (dup) {
        foundDuplicates.push(dup);
        initialResolutions[dup.id] = 'merge'; // Default to smart merge
      } else {
        nonDuplicates.push(ref);
      }
    }

    setParsedReferences(nonDuplicates);
    setDuplicates(foundDuplicates);
    setResolutions(initialResolutions);
    setStep('review');
  };

  const handleFinalizeImport = () => {
    const toSave: Reference[] = [...parsedReferences];
    const existingKeys = new Set<string>(existingReferences.map((r) => r.citationKey.toLowerCase()));

    for (const dup of duplicates) {
      const choice = resolutions[dup.id] || 'merge';

      if (choice === 'keep_existing') {
        // Do not import new, leave existing as is
        continue;
      } else if (choice === 'use_new') {
        // Replace existing with incoming (keep existing ID)
        toSave.push({
          ...dup.incoming,
          id: dup.existing.id,
          createdAt: dup.existing.createdAt,
          updatedAt: new Date().toISOString(),
        });
      } else if (choice === 'merge') {
        // Merge missing fields
        const merged = mergeReferenceRecords(dup.existing, dup.incoming);
        toSave.push(merged);
      } else if (choice === 'keep_both') {
        // Create new with unique key
        const newKey = generateCitationKey(dup.incoming, existingKeys);
        existingKeys.add(newKey.toLowerCase());
        toSave.push({
          ...dup.incoming,
          citationKey: newKey,
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }
    }

    onImportComplete(toSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-2xl shadow-2xl border border-stone-700/80 overflow-hidden flex flex-col text-xs max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-stone-100 text-sm">Import BibTeX (.bib)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'input' ? (
            <div className="space-y-4">
              {/* File upload drop zone */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-700 hover:border-amber-500/80 rounded-2xl bg-stone-950/60 cursor-pointer transition-colors text-center">
                <Upload className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
                <span className="font-bold text-stone-200 text-xs">Upload BibTeX File</span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  Drag & drop or select a <code className="font-mono text-amber-400">.bib</code> file
                </span>
                <input
                  type="file"
                  accept=".bib,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Raw BibTeX textarea */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wide">
                  Or Paste BibTeX Code:
                </label>
                <textarea
                  value={bibtexText}
                  onChange={(e) => setBibtexText(e.target.value)}
                  placeholder={`@article{vaswani2017attention,\n  title={Attention is all you need},\n  author={Vaswani, Ashish and others},\n  journal={NeurIPS},\n  year={2017}\n}`}
                  rows={8}
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-mono text-[11px] placeholder:text-stone-600 focus:outline-hidden focus:border-amber-500 leading-relaxed resize-y"
                />
              </div>

              {isVaultEncrypted && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Vault encryption is active. All imported references will be securely encrypted locally in your vault.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <div className="text-base font-bold text-emerald-400">{parsedReferences.length}</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wide">New References</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <div className="text-base font-bold text-amber-400">{duplicates.length}</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wide">Duplicate Candidates</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <div className="text-base font-bold text-stone-400">{invalidEntries.length}</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wide">Invalid / Skipped</div>
                </div>
              </div>

              {/* Conflict resolution list */}
              {duplicates.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wide">
                    Resolve Duplicates & Conflicts ({duplicates.length})
                  </h4>

                  <div className="space-y-3">
                    {duplicates.map((dup) => {
                      const currentChoice = resolutions[dup.id] || 'merge';

                      return (
                        <div
                          key={dup.id}
                          className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-amber-400">
                              [@{dup.incoming.citationKey}]
                            </span>
                            <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                              {dup.reason}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
                            <div>
                              <div className="text-[10px] text-stone-400 font-bold uppercase mb-1">
                                Existing in Vault:
                              </div>
                              <div className="font-medium text-stone-200 line-clamp-1">
                                {dup.existing.title}
                              </div>
                              <div className="text-[10.5px] text-stone-400 mt-0.5">
                                {formatAuthorsList(dup.existing.authors || [], { format: 'family-only' })} (
                                {dup.existing.year || 'n.d.'})
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">
                                Incoming in BibTeX:
                              </div>
                              <div className="font-medium text-stone-200 line-clamp-1">
                                {dup.incoming.title}
                              </div>
                              <div className="text-[10.5px] text-stone-400 mt-0.5">
                                {formatAuthorsList(dup.incoming.authors || [], { format: 'family-only' })} (
                                {dup.incoming.year || 'n.d.'})
                              </div>
                            </div>
                          </div>

                          {/* Resolution action buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({ ...prev, [dup.id]: 'merge' }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-colors ${
                                currentChoice === 'merge'
                                  ? 'bg-amber-500 text-white font-bold'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              Merge (Fill Missing)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({ ...prev, [dup.id]: 'keep_existing' }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-colors ${
                                currentChoice === 'keep_existing'
                                  ? 'bg-amber-500 text-white font-bold'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              Keep Existing
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({ ...prev, [dup.id]: 'use_new' }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-colors ${
                                currentChoice === 'use_new'
                                  ? 'bg-amber-500 text-white font-bold'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              Replace with New
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({ ...prev, [dup.id]: 'keep_both' }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-colors ${
                                currentChoice === 'keep_both'
                                  ? 'bg-amber-500 text-white font-bold'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              Keep Both (New Key)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          {step === 'review' ? (
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Cancel
            </button>

            {step === 'input' ? (
              <button
                type="button"
                disabled={!bibtexText.trim()}
                onClick={handleAnalyze}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Analyze BibTeX</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeImport}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Import {parsedReferences.length + duplicates.length} References</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
