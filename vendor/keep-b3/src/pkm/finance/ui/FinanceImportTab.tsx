import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  FinanceAccount,
  FinanceCategory,
  FinanceImportBatch,
  StagedTransactionRow,
} from '../financeTypes';
import { formatMoney } from '../money';
import { financeImportService, CSVColumnMapping } from '../financeImportService';
import { financeStorage } from '../financeStorage';

interface FinanceImportTabProps {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  importBatches: FinanceImportBatch[];
  onImportCommitted: () => void;
}

export const FinanceImportTab: React.FC<FinanceImportTabProps> = ({
  accounts,
  categories,
  importBatches,
  onImportCommitted,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'ofx' | 'qfx' | 'qif'>('csv');

  const [csvMapping, setCsvMapping] = useState<CSVColumnMapping | null>(null);
  const [stagedRows, setStagedRows] = useState<StagedTransactionRow[]>([]);
  const [isStaging, setIsStaging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    let format: 'csv' | 'ofx' | 'qfx' | 'qif' = 'csv';
    if (ext === 'ofx') format = 'ofx';
    else if (ext === 'qfx') format = 'qfx';
    else if (ext === 'qif') format = 'qif';

    setFileFormat(format);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      try {
        if (format === 'csv') {
          const rawRows = financeImportService.parseCSVRaw(content);
          const detected = financeImportService.detectCSVMapping(rawRows);
          setCsvMapping(detected);

          const staged = financeImportService.stageCSV(
            content,
            selectedAccountId,
            detected,
            selectedAccount?.currency
          );
          setStagedRows(staged);
        } else if (format === 'ofx' || format === 'qfx') {
          const staged = financeImportService.stageOFX(content, selectedAccountId, selectedAccount?.currency);
          setStagedRows(staged);
        } else if (format === 'qif') {
          const staged = financeImportService.stageQIF(content, selectedAccountId, selectedAccount?.currency);
          setStagedRows(staged);
        }
        setIsStaging(true);
      } catch (err: any) {
        setError(`Failed to parse statement: ${err?.message || 'Unknown format error'}`);
      }
    };
    reader.readAsText(file);
  };

  const toggleRow = (id: string) => {
    setStagedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setStagedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleCommit = () => {
    if (!selectedAccountId || stagedRows.length === 0) return;

    financeImportService.commitImport({
      targetAccountId: selectedAccountId,
      filename: fileName,
      fileFormat,
      stagedRows,
    });

    setIsStaging(false);
    setFileContent(null);
    setStagedRows([]);
    onImportCommitted();
  };

  const handleRollbackBatch = (batchId: string) => {
    if (confirm('Rollback this import batch? All transactions added in this batch will be safely removed.')) {
      financeImportService.rollbackImport(batchId);
      onImportCommitted();
    }
  };

  const selectedCount = stagedRows.filter((r) => r.selected).length;
  const duplicateCount = stagedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="space-y-6">
      {/* File Upload & Staging Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-500" />
            Import Statements (CSV, OFX, QFX, QIF)
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Process bank and credit card exports directly in browser memory without sending data to any external server.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Destination Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={isStaging}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type} • {acc.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Select Statement File
            </label>
            <input
              type="file"
              accept=".csv,.ofx,.qfx,.qif,.txt"
              onChange={handleFileUpload}
              className="w-full px-2 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-600"
            />
          </div>
        </div>

        {/* Staging Review Area */}
        {isStaging && (
          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
            <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {stagedRows.length} Rows Parsed from {fileName}
                </span>
                <span className="text-emerald-600 font-semibold">{selectedCount} Selected to Import</span>
                {duplicateCount > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {duplicateCount} Duplicates Skipped
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaging(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={selectedCount === 0}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Commit {selectedCount} Transactions
                </button>
              </div>
            </div>

            {/* Staged Rows Table */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                  <tr>
                    <th className="py-2 px-3 w-8">
                      <button
                        type="button"
                        onClick={() => handleSelectAll(selectedCount !== stagedRows.length)}
                      >
                        {selectedCount === stagedRows.length ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Payee / Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Duplicate Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                  {stagedRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => toggleRow(row.id)}
                      className={`cursor-pointer transition-colors ${
                        row.selected
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : row.isDuplicate
                          ? 'bg-stone-50/60 dark:bg-stone-900/40 opacity-60'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        {row.selected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600 dark:text-stone-400">{row.date}</td>
                      <td className="py-2 px-3 capitalize">{row.type}</td>
                      <td className="py-2 px-3 font-medium text-stone-900 dark:text-stone-100">
                        {row.payee || row.rawDescription}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="py-2 px-3">
                        {row.isDuplicate ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            {row.duplicateReason || 'Potential duplicate'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Past Import Batches & Rollback Section */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Import History & Undo Batches
          </h3>
          <span className="text-xs text-stone-500">{importBatches.length} Batches</span>
        </div>

        {importBatches.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500">
            No previous import batches recorded.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {importBatches.map((batch) => {
              const acc = accounts.find((a) => a.id === batch.targetAccountId);

              return (
                <div key={batch.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{batch.filename}</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.2 bg-stone-100 dark:bg-stone-800 rounded text-stone-500">
                        {batch.fileFormat}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Imported {batch.importedCount} transactions into {acc?.name || 'Account'} on{' '}
                      {new Date(batch.importedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollbackBatch(batch.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Rollback Import
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
