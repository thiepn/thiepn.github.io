import React, { useState } from 'react';
import { Asset, AssetWarranty } from '../assetTypes';
import {
  getWarranties,
  getAssets,
  isWarrantyActive,
  getDaysUntilWarrantyExpiry,
  deleteWarranty,
} from '../assetService';
import { Shield, Clock, AlertTriangle, CheckCircle, Trash2, ExternalLink } from 'lucide-react';

interface WarrantiesTabProps {
  onSelectAsset: (asset: Asset) => void;
  onRefresh?: () => void;
}

export const WarrantiesTab: React.FC<WarrantiesTabProps> = ({
  onSelectAsset,
  onRefresh,
}) => {
  const warranties = getWarranties();
  const assets = getAssets();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const activeWarranties = warranties.filter(isWarrantyActive);
  const expiredWarranties = warranties.filter((w) => !isWarrantyActive(w));

  const expiringSoon = activeWarranties.filter((w) => {
    const days = getDaysUntilWarrantyExpiry(w);
    return days !== null && days <= 60;
  });

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            Active Warranties
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 mt-1">
            {activeWarranties.length}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/50 p-4 rounded-xl">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Expiring Within 60 Days
          </div>
          <div className="text-2xl font-extrabold text-amber-200 mt-1">
            {expiringSoon.length}
          </div>
        </div>

        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-neutral-500" />
            Expired Warranties
          </div>
          <div className="text-2xl font-extrabold text-neutral-400 mt-1">
            {expiredWarranties.length}
          </div>
        </div>
      </div>

      {/* EXPIRING SOON WARNINGS */}
      {expiringSoon.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Attention: Warranties Expiring Soon
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiringSoon.map((w) => {
              const asset = assetMap.get(w.assetId);
              const days = getDaysUntilWarrantyExpiry(w);
              return (
                <div
                  key={w.id}
                  className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-amber-200 text-xs">
                      {asset ? asset.name : 'Unknown Asset'}
                    </div>
                    <div className="text-[11px] text-amber-300/80 mt-0.5">
                      {w.provider} ({w.type}) • Ends {w.endDate}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-900/60 px-2 py-1 rounded">
                    {days} days left
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ALL WARRANTIES LIST */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Warranty Register ({warranties.length})
        </h3>

        {warranties.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No warranties recorded yet. Link a warranty when editing or creating an asset.
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Policy Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {warranties.map((w) => {
                  const asset = assetMap.get(w.assetId);
                  const active = isWarrantyActive(w);
                  const days = getDaysUntilWarrantyExpiry(w);

                  return (
                    <tr key={w.id} className="hover:bg-neutral-800/40 transition">
                      <td className="p-3 font-semibold text-neutral-100">
                        {asset ? (
                          <button
                            type="button"
                            onClick={() => onSelectAsset(asset)}
                            className="text-indigo-400 hover:underline text-left"
                          >
                            {asset.name}
                          </button>
                        ) : (
                          'Unknown Asset'
                        )}
                      </td>
                      <td className="p-3 font-medium text-neutral-200">{w.provider}</td>
                      <td className="p-3 capitalize text-neutral-400">{w.type}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                            active
                              ? 'bg-emerald-950/80 text-emerald-300'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400">{w.startDate || '—'}</td>
                      <td className="p-3 font-semibold text-neutral-200">
                        {w.endDate || 'Lifetime'}
                      </td>
                      <td className="p-3 font-mono text-neutral-400">{w.policyNumber || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
