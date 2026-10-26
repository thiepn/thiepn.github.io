import React, { useState } from 'react';
import { Asset } from '../assetTypes';
import { getAssets, moveAssetLocation } from '../assetService';
import { getPlaces } from '../../travel/travelService';
import { MapPin, ArrowRightLeft, Package, Plus } from 'lucide-react';

interface RoomsInventoryTabProps {
  onSelectAsset: (asset: Asset) => void;
  onNewAssetForPlace?: (placeId: string) => void;
  onRefresh?: () => void;
}

export const RoomsInventoryTab: React.FC<RoomsInventoryTabProps> = ({
  onSelectAsset,
  onNewAssetForPlace,
  onRefresh,
}) => {
  const assets = getAssets();
  const places = getPlaces();

  const [movingAsset, setMovingAsset] = useState<Asset | null>(null);
  const [targetPlaceId, setTargetPlaceId] = useState('');

  // Group assets by placeId
  const placeGroups = new Map<string, Asset[]>();
  const unassignedAssets: Asset[] = [];

  for (const a of assets) {
    if (a.placeId) {
      if (!placeGroups.has(a.placeId)) {
        placeGroups.set(a.placeId, []);
      }
      placeGroups.get(a.placeId)!.push(a);
    } else {
      unassignedAssets.push(a);
    }
  }

  const handleExecuteMove = () => {
    if (!movingAsset) return;
    moveAssetLocation(movingAsset.id, targetPlaceId || undefined);
    setMovingAsset(null);
    setTargetPlaceId('');
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-100 text-base">Rooms & Spatial Inventory</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Physical assets categorized by location and room.
          </p>
        </div>
      </div>

      {places.length === 0 && assets.length === 0 ? (
        <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No places or assets recorded. Create places in Places / Travel or assign locations to assets.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Places with assigned items */}
          {places.map((place) => {
            const placeAssets = placeGroups.get(place.id) || [];
            const totalValue = placeAssets.reduce(
              (sum, a) => sum + (a.purchasePrice?.amount || 0),
              0
            );

            return (
              <div
                key={place.id}
                className="bg-neutral-900/60 rounded-xl border border-neutral-800 overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-neutral-800/60 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-neutral-100 text-sm">{place.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-0.5 bg-neutral-700/60 rounded">
                      {place.type}
                    </span>
                    <span className="text-xs text-neutral-400">
                      ({placeAssets.length} asset{placeAssets.length === 1 ? '' : 's'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {totalValue > 0 && (
                      <span className="text-xs font-semibold text-neutral-300">
                        Total: ${totalValue.toLocaleString()}
                      </span>
                    )}
                    {onNewAssetForPlace && (
                      <button
                        type="button"
                        onClick={() => onNewAssetForPlace(place.id)}
                        className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Asset Here
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {placeAssets.length === 0 ? (
                    <div className="text-xs text-neutral-500 italic py-2">
                      No assets currently assigned to this room.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {placeAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="bg-neutral-800/40 hover:bg-neutral-800/80 p-3 rounded-lg border border-neutral-700/50 flex items-center justify-between gap-2 transition"
                        >
                          <div
                            onClick={() => onSelectAsset(asset)}
                            className="cursor-pointer truncate flex-1"
                          >
                            <div className="font-semibold text-neutral-200 text-xs truncate">
                              {asset.name}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                              {asset.type} • {asset.status}
                            </div>
                          </div>

                          <button
                            type="button"
                            title="Move to another room"
                            onClick={() => {
                              setMovingAsset(asset);
                              setTargetPlaceId(asset.placeId || '');
                            }}
                            className="p-1.5 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-700/60 rounded transition shrink-0"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned Assets */}
          {unassignedAssets.length > 0 && (
            <div className="bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Package className="w-4 h-4 text-neutral-500" />
                Unassigned Location ({unassignedAssets.length})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassignedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-neutral-800/30 p-3 rounded-lg border border-neutral-700/40 flex items-center justify-between gap-2"
                  >
                    <div
                      onClick={() => onSelectAsset(asset)}
                      className="cursor-pointer truncate flex-1"
                    >
                      <div className="font-semibold text-neutral-200 text-xs truncate">
                        {asset.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 uppercase">
                        {asset.type}
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Assign room"
                      onClick={() => {
                        setMovingAsset(asset);
                        setTargetPlaceId('');
                      }}
                      className="p-1.5 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-700 rounded transition shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Move Location Modal */}
      {movingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h4 className="font-bold text-sm text-neutral-100">
              Move Asset: {movingAsset.name}
            </h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">
                Select Destination Room / Place
              </label>
              <select
                value={targetPlaceId}
                onChange={(e) => setTargetPlaceId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">(Unassigned / No Location)</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingAsset(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMove}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
