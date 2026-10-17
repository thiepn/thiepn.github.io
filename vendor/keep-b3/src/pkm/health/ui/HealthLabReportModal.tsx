import React, { useState } from 'react';
import { X, FlaskConical, Plus, Trash2, FileText, Info } from 'lucide-react';
import { LabReport, LabResultValue, LabSourceFlag } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthLabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReport?: LabReport | null;
  onSaved: () => void;
}

const COMMON_LAB_TESTS = [
  { name: 'Total Cholesterol', canonical: 'cholesterol_total', unit: 'mg/dL', low: 125, high: 200 },
  { name: 'HDL Cholesterol', canonical: 'cholesterol_hdl', unit: 'mg/dL', low: 40, high: 60 },
  { name: 'LDL Cholesterol', canonical: 'cholesterol_ldl', unit: 'mg/dL', low: 0, high: 100 },
  { name: 'Triglycerides', canonical: 'triglycerides', unit: 'mg/dL', low: 0, high: 150 },
  { name: 'Fasting Glucose', canonical: 'glucose_fasting', unit: 'mg/dL', low: 70, high: 99 },
  { name: 'Hemoglobin A1c', canonical: 'hba1c', unit: '%', low: 4.0, high: 5.6 },
  { name: 'Vitamin D (25-OH)', canonical: 'vitamin_d', unit: 'ng/mL', low: 30, high: 100 },
  { name: 'Ferritin', canonical: 'ferritin', unit: 'ng/mL', low: 30, high: 400 },
  { name: 'TSH (Thyroid)', canonical: 'tsh', unit: 'mIU/L', low: 0.4, high: 4.0 },
  { name: 'White Blood Cell (WBC)', canonical: 'wbc', unit: 'K/uL', low: 4.0, high: 11.0 },
  { name: 'Hemoglobin', canonical: 'hemoglobin', unit: 'g/dL', low: 13.5, high: 17.5 },
];

export const HealthLabReportModal: React.FC<HealthLabReportModalProps> = ({
  isOpen,
  onClose,
  initialReport,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState<string>(initialReport?.title || 'Comprehensive Metabolic Panel');
  const [date, setDate] = useState<string>(
    initialReport?.date || new Date().toISOString().slice(0, 10)
  );
  const [provider, setProvider] = useState<string>(initialReport?.provider || 'Quest / LabCorp');
  const [notes, setNotes] = useState<string>(initialReport?.notes || '');
  const [attachmentId, setAttachmentId] = useState<string>(initialReport?.attachmentId || '');
  const [values, setValues] = useState<LabResultValue[]>(
    initialReport?.values || [
      {
        id: `val-1`,
        testName: 'Fasting Glucose',
        canonicalTestKey: 'glucose_fasting',
        value: 88,
        unit: 'mg/dL',
        referenceRangeLow: 70,
        referenceRangeHigh: 99,
        sourceFlag: 'normal',
      },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddRow = (preset?: typeof COMMON_LAB_TESTS[0]) => {
    const newVal: LabResultValue = {
      id: `val-${Date.now()}-${values.length + 1}`,
      testName: preset?.name || 'New Lab Marker',
      canonicalTestKey: preset?.canonical || undefined,
      value: undefined,
      unit: preset?.unit || 'mg/dL',
      referenceRangeLow: preset?.low,
      referenceRangeHigh: preset?.high,
      sourceFlag: 'normal',
    };
    setValues([...values, newVal]);
  };

  const handleRemoveRow = (index: number) => {
    const next = [...values];
    next.splice(index, 1);
    setValues(next);
  };

  const handleUpdateRow = (index: number, updates: Partial<LabResultValue>) => {
    const next = [...values];
    next[index] = { ...next[index], ...updates };
    setValues(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Report title is required');
      return;
    }

    if (values.length === 0) {
      setError('Add at least one laboratory result value');
      return;
    }

    if (initialReport) {
      healthService.saveLabReport({
        id: initialReport.id,
        title: title.trim(),
        date,
        provider: provider.trim() || undefined,
        attachmentId: attachmentId.trim() || undefined,
        values,
        notes: notes.trim() || undefined,
      });
    } else {
      healthService.saveLabReport({
        title: title.trim(),
        date,
        provider: provider.trim() || undefined,
        attachmentId: attachmentId.trim() || undefined,
        values,
        notes: notes.trim() || undefined,
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialReport ? 'Edit Laboratory Report' : 'Record Laboratory Test Report'}
              </h2>
              <p className="text-xs text-stone-500">Source-preserved test values with reference ranges</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-600">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Report Title / Panel Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Blood Panel & Lipids"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Collection Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Laboratory / Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Quest Diagnostics, Hospital Lab"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Linked Document ID (PDF / Media)
              </label>
              <input
                type="text"
                value={attachmentId}
                onChange={(e) => setAttachmentId(e.target.value)}
                placeholder="Optional attachment ID or path"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Add Presets */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1.5">
              Quick Add Common Markers:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_LAB_TESTS.map((preset) => (
                <button
                  key={preset.canonical}
                  type="button"
                  onClick={() => handleAddRow(preset)}
                  className="px-2.5 py-1 text-[11px] bg-stone-100 dark:bg-stone-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-stone-700 dark:text-stone-300 hover:text-cyan-600 rounded-lg transition-colors border border-stone-200 dark:border-stone-700"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lab Values Table */}
          <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Test Markers & Results ({values.length})
              </label>
              <button
                type="button"
                onClick={() => handleAddRow()}
                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Marker
              </button>
            </div>

            <div className="space-y-2">
              {values.map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Test Name</label>
                      <input
                        type="text"
                        value={v.testName}
                        onChange={(e) => handleUpdateRow(idx, { testName: e.target.value })}
                        placeholder="e.g. Total Cholesterol"
                        className="w-full text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Value</label>
                      <input
                        type="number"
                        step="any"
                        value={v.value ?? ''}
                        onChange={(e) => handleUpdateRow(idx, { value: parseFloat(e.target.value) || undefined })}
                        placeholder="e.g. 185"
                        className="w-full text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Unit</label>
                      <input
                        type="text"
                        value={v.unit || ''}
                        onChange={(e) => handleUpdateRow(idx, { unit: e.target.value })}
                        placeholder="mg/dL"
                        className="w-full text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Source Flag</label>
                      <select
                        value={v.sourceFlag || 'normal'}
                        onChange={(e) => handleUpdateRow(idx, { sourceFlag: e.target.value as LabSourceFlag })}
                        className="w-full text-xs p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        <option value="normal">Normal</option>
                        <option value="H">High (H)</option>
                        <option value="L">Low (L)</option>
                        <option value="abnormal">Abnormal</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ref Ranges */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200 dark:border-stone-700/60">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-0.5">Ref Range Low</label>
                      <input
                        type="number"
                        step="any"
                        value={v.referenceRangeLow ?? ''}
                        onChange={(e) => handleUpdateRow(idx, { referenceRangeLow: parseFloat(e.target.value) || undefined })}
                        placeholder="e.g. 70"
                        className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-0.5">Ref Range High</label>
                      <input
                        type="number"
                        step="any"
                        value={v.referenceRangeHigh ?? ''}
                        onChange={(e) => handleUpdateRow(idx, { referenceRangeHigh: parseFloat(e.target.value) || undefined })}
                        placeholder="e.g. 99"
                        className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-0.5">Ref Range Text (or note)</label>
                      <input
                        type="text"
                        value={v.referenceRangeText || ''}
                        onChange={(e) => handleUpdateRow(idx, { referenceRangeText: e.target.value })}
                        placeholder="< 200 mg/dL (desirable)"
                        className="w-full text-xs p-1 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              General Clinical Notes or Provider Comments
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fasting 12 hours prior, collected at morning appointment..."
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors"
            >
              {initialReport ? 'Save Lab Report' : 'Save Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
