import React, { useState } from 'react';
import { Asset } from '../assetTypes';
import { generateAssetQRPayload } from '../assetService';
import { X, QrCode, Printer, Copy, Check, Shield } from 'lucide-react';

interface AssetQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

export const AssetQRModal: React.FC<AssetQRModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  const [copied, setCopied] = useState(false);
  const [includeSerial, setIncludeSerial] = useState(true);

  if (!isOpen) return null;

  const payload = generateAssetQRPayload(asset.id);
  // Using an SVG QR code placeholder or visual matrix representation for offline rendering
  // The QR code contains the canonical local pkm:// URI

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">
              Asset QR & Label
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
        <div className="p-6 space-y-5">
          {/* Printable Label Card Preview */}
          <div className="bg-white text-black p-5 rounded-lg border-2 border-dashed border-neutral-400 shadow-md flex flex-col items-center text-center space-y-3 print:border-solid print:m-0">
            <div className="w-36 h-36 bg-neutral-100 border border-neutral-300 rounded flex flex-col items-center justify-center p-2 relative overflow-hidden">
              <QrCode className="w-28 h-28 text-black" />
              <div className="text-[8px] font-mono text-neutral-600 truncate max-w-full">
                {asset.id}
              </div>
            </div>

            <div>
              <div className="text-base font-bold leading-tight">{asset.name}</div>
              <div className="text-xs text-neutral-600 uppercase tracking-wider mt-0.5">
                {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.type}
              </div>
              {includeSerial && asset.serialNumber && (
                <div className="text-[11px] font-mono text-neutral-800 mt-1 font-semibold">
                  S/N: {asset.serialNumber}
                </div>
              )}
            </div>

            <div className="text-[9px] text-neutral-400 font-mono">
              KeepNotes PKM Asset Tag • Local Encrypted ID
            </div>
          </div>

          {/* Privacy & Label Options */}
          <div className="space-y-2 text-xs bg-neutral-800/50 p-3 rounded-lg border border-neutral-700">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
              <input
                type="checkbox"
                checked={includeSerial}
                onChange={(e) => setIncludeSerial(e.target.checked)}
                className="rounded text-indigo-600 bg-neutral-900 border-neutral-700"
              />
              <span>Print Serial Number on Label</span>
            </label>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-1">
              <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              QR payload contains opaque identifier: <code className="text-indigo-300">{payload}</code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyPayload}
              className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 flex items-center justify-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied URI' : 'Copy PKM URI'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
