import React, { useState, useEffect } from 'react';
import { Asset } from '../assetTypes';
import { subscribeToAssetChanges } from '../assetStorage';
import { getAssetById, calculateMaintenanceDueStatuses, getLoans, getWarranties } from '../assetService';
import { AssetsOverviewTab } from './AssetsOverviewTab';
import { MaintenanceScheduleTab } from './MaintenanceScheduleTab';
import { WarrantiesTab } from './WarrantiesTab';
import { LoansTab } from './LoansTab';
import { RoomsInventoryTab } from './RoomsInventoryTab';
import { PartsTab } from './PartsTab';
import { AssetReportsTab } from './AssetReportsTab';
import { AssetModal } from './AssetModal';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetImportModal } from './AssetImportModal';
import {
  Package,
  Wrench,
  Shield,
  Share2,
  MapPin,
  Layers,
  FileText,
  Plus,
  AlertTriangle,
} from 'lucide-react';

interface AssetsWorkspaceViewProps {
  initialAssetId?: string;
}

export const AssetsWorkspaceView: React.FC<AssetsWorkspaceViewProps> = ({
  initialAssetId,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'maintenance' | 'warranties' | 'loans' | 'rooms' | 'parts' | 'reports'
  >('all');

  const [tick, setTick] = useState(0);

  // Modals
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [targetPlaceIdForNewAsset, setTargetPlaceIdForNewAsset] = useState<string | undefined>();

  // Subscribe to storage changes
  useEffect(() => {
    const unsub = subscribeToAssetChanges(() => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  // Handle initial asset if passed
  useEffect(() => {
    if (initialAssetId) {
      const found = getAssetById(initialAssetId);
      if (found) {
        setSelectedAsset(found);
      }
    }
  }, [initialAssetId]);

  // Keep selected asset fresh on updates
  useEffect(() => {
    if (selectedAsset) {
      const fresh = getAssetById(selectedAsset.id);
      if (fresh) {
        setSelectedAsset(fresh);
      }
    }
  }, [tick]);

  const dueMaintenance = calculateMaintenanceDueStatuses().filter((s) => s.isDue);
  const activeLoans = getLoans().filter((l) => !l.returnedAt);

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Workspace Header */}
      <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-950/70 border border-indigo-700/60 rounded-xl text-indigo-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Home, Assets & Inventory
            </h1>
            <p className="text-xs text-neutral-400">
              Offline-first tracking for equipment, tools, electronics, vehicles, warranties & maintenance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetPlaceIdForNewAsset(undefined);
              setIsNewAssetModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Asset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 px-6 bg-neutral-950/80 overflow-x-auto text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Package className="w-4 h-4" />
          All Assets
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'maintenance'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance Schedule
          {dueMaintenance.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
              {dueMaintenance.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warranties')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'warranties'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Warranties
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'loans'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Loans & Borrowed
          {activeLoans.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
              {activeLoans.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rooms'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Rooms & Spatial
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parts')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'parts'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Consumables & Parts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Inventory Reports
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'all' && (
            <AssetsOverviewTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onNewAsset={() => {
                setTargetPlaceIdForNewAsset(undefined);
                setIsNewAssetModalOpen(true);
              }}
              onImportAssets={() => setIsImportModalOpen(true)}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceScheduleTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onRefresh={() => setTick((t) => t + 1)}
            />
          )}

          {activeTab === 'warranties' && (
            <WarrantiesTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onRefresh={() => setTick((t) => t + 1)}
            />
          )}

          {activeTab === 'loans' && (
            <LoansTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onRefresh={() => setTick((t) => t + 1)}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomsInventoryTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onNewAssetForPlace={(placeId) => {
                setTargetPlaceIdForNewAsset(placeId);
                setIsNewAssetModalOpen(true);
              }}
              onRefresh={() => setTick((t) => t + 1)}
            />
          )}

          {activeTab === 'parts' && (
            <PartsTab
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onRefresh={() => setTick((t) => t + 1)}
            />
          )}

          {activeTab === 'reports' && <AssetReportsTab />}
        </div>
      </div>

      {/* MODALS */}
      {selectedAsset && (
        <AssetDetailModal
          isOpen={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
          asset={selectedAsset}
          onAssetUpdated={() => setTick((t) => t + 1)}
          onAssetDeleted={() => {
            setSelectedAsset(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {isNewAssetModalOpen && (
        <AssetModal
          isOpen={isNewAssetModalOpen}
          onClose={() => setIsNewAssetModalOpen(false)}
          initialPlaceId={targetPlaceIdForNewAsset}
          onSaved={(newAsset) => {
            setSelectedAsset(newAsset);
            setTick((t) => t + 1);
          }}
        />
      )}

      {isImportModalOpen && (
        <AssetImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={(count) => {
            setTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
};
