import React, { useState } from 'react';
import { AssetPart } from '../assetTypes';
import { savePart, getAssets } from '../assetService';
import { X, Layers, Plus, Check } from 'lucide-react';

interface AssetPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  partToEdit?: AssetPart;
  initialAssetId?: string;
  onSaved?: () => void;
}

export const AssetPartModal: React.FC<AssetPartModalProps> = ({
  isOpen,
  onClose,
  partToEdit,
  initialAssetId,
  onSaved,
}) => {
  const isEditing = !!partToEdit;
  const [name, setName] = useState(partToEdit?.name || '');
  const [manufacturer, setManufacturer] = useState(partToEdit?.manufacturer || '');
  const [modelNumber, setModelNumber] = useState(partToEdit?.modelNumber || '');
  const [stockQuantity, setStockQuantity] = useState(
    partToEdit?.stockQuantity !== undefined ? String(partToEdit.stockQuantity) : '1'
  );
  const [minStockThreshold, setMinStockThreshold] = useState(
    partToEdit?.minStockThreshold !== undefined ? String(partToEdit.minStockThreshold) : '1'
  );
  const [reorderUrl, setReorderUrl] = useState(partToEdit?.reorderUrl || '');
  const [compatibleAssetIds, setCompatibleAssetIds] = useState<string[]>(
    partToEdit?.compatibleAssetIds || (initialAssetId ? [initialAssetId] : [])
  );
  const [note, setNote] = useState(partToEdit?.note || '');

  const allAssets = getAssets();

  if (!isOpen) return null;

  const toggleCompatibleAsset = (assetId: string) => {
    setCompatibleAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    savePart({
      id: partToEdit?.id,
      name: name.trim(),
      manufacturer: manufacturer.trim() || undefined,
      modelNumber: modelNumber.trim() || undefined,
      stockQuantity: Math.max(0, Number(stockQuantity) || 0),
      minStockThreshold: minStockThreshold ? Number(minStockThreshold) : undefined,
      reorderUrl: reorderUrl.trim() || undefined,
      compatibleAssetIds,
      note: note.trim() || undefined,
    });

    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">
              {isEditing ? `Edit Part: ${partToEdit.name}` : 'Add Consumable or Spare Part'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Part / Consumable Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dyson V11 Filter, 5W-30 Synthetic Motor Oil, CR2032 Battery"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Manufacturer / Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Bosch, Mobil 1, Panasonic"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Part / Model Number
              </label>
              <input
                type="text"
                placeholder="e.g. 970013-02"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                In-Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500 text-center font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Low Stock Threshold Warning
              </label>
              <input
                type="number"
                min="0"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500 text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Reorder Link / Product URL
            </label>
            <input
              type="url"
              placeholder="https://amazon.com/dp/..."
              value={reorderUrl}
              onChange={(e) => setReorderUrl(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Compatible Assets Multi-select */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Compatible Assets & Equipment
            </label>
            <div className="max-h-36 overflow-y-auto bg-neutral-950/50 border border-neutral-700 rounded-lg p-2 space-y-1">
              {allAssets.length === 0 ? (
                <div className="text-xs text-neutral-500 p-2 text-center">No assets found</div>
              ) : (
                allAssets.map((asset) => {
                  const isChecked = compatibleAssetIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => toggleCompatibleAsset(asset.id)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition ${
                        isChecked
                          ? 'bg-indigo-950/60 border border-indigo-700 text-indigo-200'
                          : 'hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                    >
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase">{asset.type}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Storage Note / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Top shelf in garage, toolbox drawer #2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isEditing ? 'Save Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
