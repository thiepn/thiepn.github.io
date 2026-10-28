import React, { useState } from 'react';
import { AssetInventoryReportOptions } from '../assetTypes';
import { generateInventoryReport, getAssets } from '../assetService';
import {
  FileText,
  Copy,
  Download,
  Printer,
  Shield,
  Check,
  Filter,
  Eye,
} from 'lucide-react';

export const AssetReportsTab: React.FC = () => {
  const assets = getAssets();
  const [format, setFormat] = useState<'markdown' | 'csv' | 'json'>('markdown');
  const [includeSerials, setIncludeSerials] = useState(false);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeLocations, setIncludeLocations] = useState(true);
  const [copied, setCopied] = useState(false);

  const reportOptions: AssetInventoryReportOptions = {
    format,
    includeSensitiveSerialNumbers: includeSerials,
    includePurchasePrices: includePrices,
    includeExactLocations: includeLocations,
    includeReceiptsNotes: true,
  };

  const reportContent = generateInventoryReport(reportOptions);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : format;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pkm-asset-inventory-report.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-neutral-100 text-base">
          Asset Inventory & Insurance Reports
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Generate structured inventory reports for home inventory, insurance claims, or offline backup.
        </p>
      </div>

      {/* Options Panel */}
      <div className="bg-neutral-900/80 rounded-xl p-5 border border-neutral-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Format selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Output Format:
            </span>
            <div className="flex bg-neutral-800 rounded-lg p-1 border border-neutral-700">
              <button
                type="button"
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  format === 'markdown' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-300'
                }`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  format === 'csv' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-300'
                }`}
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  format === 'json' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-300'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Privacy Toggles */}
        <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSerials}
              onChange={(e) => setIncludeSerials(e.target.checked)}
              className="rounded text-indigo-600 bg-neutral-900 border-neutral-700"
            />
            <span>Include Serial Numbers & VIN</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includePrices}
              onChange={(e) => setIncludePrices(e.target.checked)}
              className="rounded text-indigo-600 bg-neutral-900 border-neutral-700"
            />
            <span>Include Purchase & Valuation Prices</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLocations}
              onChange={(e) => setIncludeLocations(e.target.checked)}
              className="rounded text-indigo-600 bg-neutral-900 border-neutral-700"
            />
            <span>Include Storage / Room Locations</span>
          </label>
        </div>

        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          Keep sensitive serial numbers unchecked when sharing this report externally.
        </div>
      </div>

      {/* Report Preview */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Live Report Preview ({assets.length} Assets)
        </div>

        <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto max-h-96 whitespace-pre-wrap">
          {reportContent}
        </pre>
      </div>
    </div>
  );
};
