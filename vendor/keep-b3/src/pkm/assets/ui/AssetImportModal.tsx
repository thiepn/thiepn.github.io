import React, { useState } from 'react';
import { AssetImportPreviewItem, parseAssetCSV, createAsset } from '../assetService';
import { X, Upload, FileSpreadsheet, AlertTriangle, Check, Shield } from 'lucide-react';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted?: (count: number) => void;
}

export const AssetImportModal: React.FC<AssetImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [previewItems, setPreviewItems] = useState<AssetImportPreviewItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      const parsed = parseAssetCSV(text);
      setPreviewItems(parsed);
      setHasParsed(true);
    };
    reader.readAsText(file);
  };

  const handleParseManual = () => {
    const parsed = parseAssetCSV(csvContent);
    setPreviewItems(parsed);
    setHasParsed(true);
  };

  const handleExecuteImport = () => {
    let count = 0;
    for (const item of previewItems) {
      if (item.hasDuplicateSerial && skipDuplicates) {
        continue;
      }
      createAsset(item.asset);
      count++;
    }

    if (onImportCompleted) {
      onImportCompleted(count);
    }
    onClose();
  };

  const duplicateCount = previewItems.filter((i) => i.hasDuplicateSerial).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">Import Assets & Inventory (CSV)</h2>
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {!hasParsed ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-neutral-700 rounded-xl p-6 text-center hover:border-indigo-500 transition bg-neutral-950/30">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <div className="text-sm font-medium text-neutral-200">
                  Select a CSV file to import
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Expected columns: Name, Type, Status, Manufacturer, Model, Serial Number, Acquired Date
                </div>
                <label className="mt-4 inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg cursor-pointer border border-neutral-600 transition">
                  Browse File
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Or Paste Raw CSV Data
                </label>
                <textarea
                  rows={6}
                  placeholder={`Name,Type,Status,Manufacturer,Model,SerialNumber,AcquiredDate\n"MacBook Pro","computer","active","Apple","M1 Max","C02G45XPQ6L4","2022-04-15"`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleParseManual}
                    disabled={!csvContent.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                  >
                    Parse & Preview
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary info */}
              <div className="flex items-center justify-between bg-neutral-800/40 p-3 rounded-lg border border-neutral-700 text-xs">
                <div>
                  Found <strong>{previewItems.length}</strong> items to import.
                </div>
                {duplicateCount > 0 && (
                  <div className="text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {duplicateCount} potential duplicate serial(s)
                  </div>
                )}
              </div>

              {duplicateCount > 0 && (
                <label className="flex items-center gap-2 text-xs text-neutral-300 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded text-indigo-600 bg-neutral-900 border-neutral-700"
                  />
                  <span>Skip importing items with conflicting serial numbers</span>
                </label>
              )}

              {/* Table preview */}
              <div className="max-h-64 overflow-y-auto border border-neutral-800 rounded-lg">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-800/80 text-neutral-400 sticky top-0 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Manufacturer</th>
                      <th className="p-2.5">Serial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {previewItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className={
                          item.hasDuplicateSerial
                            ? 'bg-amber-950/20 text-amber-200'
                            : 'hover:bg-neutral-800/30'
                        }
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          {item.hasDuplicateSerial ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Ready
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium">{item.asset.name}</td>
                        <td className="p-2.5 uppercase text-[10px] text-neutral-400">
                          {item.asset.type}
                        </td>
                        <td className="p-2.5">{item.asset.manufacturer || '—'}</td>
                        <td className="p-2.5 font-mono text-[11px] text-neutral-400">
                          {item.asset.serialNumber || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/80">
          <button
            type="button"
            onClick={() => {
              if (hasParsed) {
                setHasParsed(false);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition"
          >
            {hasParsed ? 'Back to Upload' : 'Cancel'}
          </button>

          {hasParsed && (
            <button
              type="button"
              onClick={handleExecuteImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Complete Import ({previewItems.length - (skipDuplicates ? duplicateCount : 0)} items)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
