import React, { useState } from 'react';
import { AssetPart, Asset } from '../assetTypes';
import { getParts, getAssets, updatePartStock, deletePart } from '../assetService';
import { AssetPartModal } from './AssetPartModal';
import {
  Layers,
  Plus,
  Minus,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface PartsTabProps {
  onSelectAsset?: (asset: Asset) => void;
  onRefresh?: () => void;
}

export const PartsTab: React.FC<PartsTabProps> = ({ onSelectAsset, onRefresh }) => {
  const parts = getParts();
  const assets = getAssets();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<AssetPart | undefined>();

  const handleStockChange = (partId: string, delta: number) => {
    updatePartStock(partId, delta);
    if (onRefresh) onRefresh();
  };

  const handleEdit = (part: AssetPart) => {
    setPartToEdit(part);
    setIsModalOpen(true);
  };

  const handleDelete = (partId: string) => {
    if (confirm('Delete this part record?')) {
      deletePart(partId);
      if (onRefresh) onRefresh();
    }
  };

  const lowStockParts = parts.filter(
    (p) => p.minStockThreshold !== undefined && p.stockQuantity <= p.minStockThreshold
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-100 text-base">Consumables & Spare Parts</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Track replacement parts, filters, lubricants, batteries, and hardware consumables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPartToEdit(undefined);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Consumable / Part
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockParts.length > 0 && (
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{lowStockParts.length}</strong> part(s) are at or below minimum threshold:
              {' '}{lowStockParts.map((p) => p.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Parts Grid */}
      {parts.length === 0 ? (
        <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No consumables or spare parts added yet. Click "Add Consumable / Part" to start tracking inventory.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part) => {
            const isLowStock =
              part.minStockThreshold !== undefined &&
              part.stockQuantity <= part.minStockThreshold;

            return (
              <div
                key={part.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                  isLowStock
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : 'bg-neutral-900/70 border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-neutral-100 text-sm leading-tight">
                      {part.name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(part)}
                        className="p-1 text-neutral-400 hover:text-white transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(part.id)}
                        className="p-1 text-neutral-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-400 mt-1 font-mono">
                    {[part.manufacturer, part.modelNumber].filter(Boolean).join(' • ') || 'Part'}
                  </div>

                  {/* Compatible assets list */}
                  {part.compatibleAssetIds.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                        Compatible Devices:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {part.compatibleAssetIds.map((aId) => {
                          const asset = assetMap.get(aId);
                          return (
                            <span
                              key={aId}
                              onClick={() => asset && onSelectAsset && onSelectAsset(asset)}
                              className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700 cursor-pointer hover:border-indigo-500 truncate max-w-[140px]"
                            >
                              {asset ? asset.name : 'Asset'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {part.reorderUrl && (
                    <div className="mt-2">
                      <a
                        href={part.reorderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
                      >
                        Reorder Link <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Stock Controls */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStockChange(part.id, -1)}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-neutral-100 text-sm">
                      {part.stockQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStockChange(part.id, 1)}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isLowStock && (
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      Low Stock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Part Modal */}
      {isModalOpen && (
        <AssetPartModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          partToEdit={partToEdit}
          onSaved={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
