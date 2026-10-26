import React, { useState, useMemo } from 'react';
import { Reference, DuplicateCandidate, FieldDifference } from '../referenceTypes';
import { findDuplicateCandidate, mergeReferenceRecords } from '../duplicateDetector';
import { formatAuthorsList } from '../personName';
import {
  Layers,
  Sparkles,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: Reference[];
  onMergeReferences: (survivingId: string, mergedReference: Reference, discardedId: string) => void;
}

export const DuplicateReviewModal: React.FC<DuplicateReviewModalProps> = ({
  isOpen,
  onClose,
  references,
  onMergeReferences,
}) => {
  // Find all internal duplicate pairs within current references
  const duplicatePairs = useMemo(() => {
    const pairs: DuplicateCandidate[] = [];
    const checked = new Set<string>();

    for (let i = 0; i < references.length; i++) {
      const refA = references[i];
      for (let j = i + 1; j < references.length; j++) {
        const refB = references[j];
        const pairKey = [refA.id, refB.id].sort().join('::');
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const dup = findDuplicateCandidate(refB, [refA]);
        if (dup) {
          pairs.push(dup);
        }
      }
    }
    return pairs;
  }, [references]);

  const [activePairIndex, setActivePairIndex] = useState(0);
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'existing' | 'incoming'>>({});

  if (!isOpen) return null;

  const currentPair = duplicatePairs[activePairIndex];

  const handleMergeCurrent = () => {
    if (!currentPair) return;

    const merged = mergeReferenceRecords(
      currentPair.existing,
      currentPair.incoming,
      fieldSelections
    );

    onMergeReferences(currentPair.existing.id, merged, currentPair.incoming.id);

    if (activePairIndex >= duplicatePairs.length - 1) {
      onClose();
    } else {
      setFieldSelections({});
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-2xl shadow-2xl border border-stone-700/80 overflow-hidden flex flex-col text-xs max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-stone-100 text-sm">
              Duplicate Review & Merge ({duplicatePairs.length} found)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {duplicatePairs.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <h4 className="font-bold text-stone-200 text-sm">No Duplicate References Found</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                All records in your Reference Library have distinct identifiers, titles, and citation keys.
              </p>
            </div>
          ) : !currentPair ? (
            <div className="p-8 text-center text-stone-400">All duplicate pairs resolved.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
                <div>
                  <span className="text-amber-400 font-bold mr-2">
                    Pair {activePairIndex + 1} of {duplicatePairs.length}:
                  </span>
                  <span className="text-stone-300 font-medium">{currentPair.reason}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={activePairIndex === 0}
                    onClick={() => {
                      setActivePairIndex((p) => Math.max(0, p - 1));
                      setFieldSelections({});
                    }}
                    className="px-2 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={activePairIndex >= duplicatePairs.length - 1}
                    onClick={() => {
                      setActivePairIndex((p) => Math.min(duplicatePairs.length - 1, p + 1));
                      setFieldSelections({});
                    }}
                    className="px-2 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Side by side comparison table */}
              <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950">
                <div className="grid grid-cols-12 bg-stone-900 border-b border-stone-800 text-[11px] font-bold text-stone-400 p-2.5">
                  <div className="col-span-3">Field</div>
                  <div className="col-span-4 text-stone-200">
                    Primary Reference ([@{currentPair.existing.citationKey}])
                  </div>
                  <div className="col-span-1 text-center">Merge</div>
                  <div className="col-span-4 text-amber-400">
                    Duplicate ([@{currentPair.incoming.citationKey}])
                  </div>
                </div>

                <div className="divide-y divide-stone-800/60 p-2">
                  {currentPair.differences.map((diff) => {
                    const selected = fieldSelections[diff.fieldName] || 'existing';
                    const isDiff = diff.status !== 'identical';

                    return (
                      <div
                        key={diff.fieldName}
                        className={`grid grid-cols-12 gap-2 py-2 items-center text-xs ${
                          isDiff ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <div className="col-span-3 font-semibold text-stone-400">
                          {diff.fieldLabel}
                        </div>

                        <div
                          className={`col-span-4 p-1.5 rounded cursor-pointer transition-colors ${
                            selected === 'existing'
                              ? 'bg-stone-800 text-stone-100 font-medium border border-stone-600'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                          onClick={() =>
                            setFieldSelections((prev) => ({ ...prev, [diff.fieldName]: 'existing' }))
                          }
                        >
                          {String(diff.existingValue ?? '—')}
                        </div>

                        <div className="col-span-1 text-center text-stone-600">
                          {isDiff && <ArrowRight className="w-3.5 h-3.5 mx-auto text-amber-500" />}
                        </div>

                        <div
                          className={`col-span-4 p-1.5 rounded cursor-pointer transition-colors ${
                            selected === 'incoming'
                              ? 'bg-amber-500/20 text-amber-200 font-medium border border-amber-500/50'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                          onClick={() =>
                            setFieldSelections((prev) => ({ ...prev, [diff.fieldName]: 'incoming' }))
                          }
                        >
                          {String(diff.incomingValue ?? '—')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
          >
            Close
          </button>

          {currentPair && (
            <button
              type="button"
              onClick={handleMergeCurrent}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Merge This Pair</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
