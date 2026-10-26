import React, { useState } from 'react';
import { Asset, AssetType, AssetStatus } from '../assetTypes';
import { getAssets, searchAssets } from '../assetService';
import { getPlaces } from '../../travel/travelService';
import {
  Search,
  Plus,
  Filter,
  Grid,
  List,
  Wrench,
  Shield,
  MapPin,
  Tag,
  DollarSign,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';

interface AssetsOverviewTabProps {
  onSelectAsset: (asset: Asset) => void;
  onNewAsset: () => void;
  onImportAssets: () => void;
}

export const AssetsOverviewTab: React.FC<AssetsOverviewTabProps> = ({
  onSelectAsset,
  onNewAsset,
  onImportAssets,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const places = getPlaces();
  const rawAssets = getAssets();
  const searchResults = searchAssets(searchQuery, true);

  const filteredAssets = searchResults.filter((asset) => {
    if (selectedType !== 'all' && asset.type !== selectedType) return false;
    if (selectedStatus !== 'all' && asset.status !== selectedStatus) return false;
    if (selectedPlaceId !== 'all' && asset.placeId !== selectedPlaceId) return false;
    return true;
  });

  // Aggregate stats
  const totalCount = rawAssets.length;
  const activeCount = rawAssets.filter((a) => a.status === 'active').length;
  const loanedCount = rawAssets.filter((a) => a.status === 'loaned').length;
  const repairCount = rawAssets.filter((a) => a.status === 'repair').length;

  return (
    <div className="space-y-6">
      {/* Top metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-700/60">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Total Assets
          </div>
          <div className="text-2xl font-extrabold text-neutral-100 mt-1">{totalCount}</div>
        </div>

        <div className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-700/60">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Active in Use
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{activeCount}</div>
        </div>

        <div className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-700/60">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Loaned Out
          </div>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">{loanedCount}</div>
        </div>

        <div className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-700/60">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            In Repair
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{repairCount}</div>
        </div>
      </div>

      {/* Controls: Search, Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search assets by name, manufacturer, model, serial, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="device">Device</option>
            <option value="computer">Computer</option>
            <option value="phone">Phone</option>
            <option value="tablet">Tablet</option>
            <option value="appliance">Appliance</option>
            <option value="tool">Tool</option>
            <option value="instrument">Instrument</option>
            <option value="vehicle">Vehicle</option>
            <option value="bicycle">Bicycle</option>
            <option value="furniture">Furniture</option>
            <option value="equipment">Equipment</option>
            <option value="document">Document</option>
            <option value="other">Other</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="stored">Stored</option>
            <option value="loaned">Loaned</option>
            <option value="repair">In Repair</option>
            <option value="sold">Sold</option>
            <option value="disposed">Disposed</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={selectedPlaceId}
            onChange={(e) => setSelectedPlaceId(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 max-w-[150px] truncate"
          >
            <option value="all">All Places</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex bg-neutral-900 border border-neutral-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-neutral-800 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-neutral-800 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onImportAssets}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition"
          >
            Import CSV
          </button>

          <button
            type="button"
            onClick={onNewAsset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Assets Display */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-neutral-800 text-neutral-500">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-base font-semibold text-neutral-300">No assets found</div>
          <div className="text-xs text-neutral-500 mt-1">
            {totalCount === 0
              ? 'Start tracking equipment, devices, tools, vehicles, and valuables by adding your first asset.'
              : 'Try adjusting your search query or filters.'}
          </div>
          {totalCount === 0 && (
            <button
              type="button"
              onClick={onNewAsset}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Add First Asset
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const place = places.find((p) => p.id === asset.placeId);
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="bg-neutral-900/70 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl cursor-pointer transition shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-neutral-100 text-sm leading-snug line-clamp-1">
                      {asset.name}
                    </h3>
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        asset.status === 'active'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : asset.status === 'loaned'
                          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                          : asset.status === 'repair'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 mt-1">
                    {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || (
                      <span className="uppercase text-[10px] tracking-wider text-neutral-500">
                        {asset.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="truncate">{place ? place.name : 'Unassigned'}</span>
                  </div>

                  {asset.purchasePrice && (
                    <div className="font-semibold text-neutral-300 shrink-0">
                      {asset.purchasePrice.currency || '$'}
                      {asset.purchasePrice.amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Manufacturer / Model</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredAssets.map((asset) => {
                const place = places.find((p) => p.id === asset.placeId);
                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset(asset)}
                    className="hover:bg-neutral-800/50 cursor-pointer transition"
                  >
                    <td className="p-3 font-semibold text-neutral-100">{asset.name}</td>
                    <td className="p-3 uppercase text-[10px] text-neutral-400">{asset.type}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                          asset.status === 'active'
                            ? 'bg-emerald-950/80 text-emerald-300'
                            : asset.status === 'loaned'
                            ? 'bg-indigo-950/80 text-indigo-300'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-3">{[asset.manufacturer, asset.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="p-3 text-neutral-400">{place ? place.name : 'Unassigned'}</td>
                    <td className="p-3 text-right font-medium text-neutral-200">
                      {asset.purchasePrice
                        ? `${asset.purchasePrice.currency || '$'}${asset.purchasePrice.amount.toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
