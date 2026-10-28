import React, { useState } from 'react';
import {
  Asset,
  AssetWarranty,
  MaintenanceDefinition,
  MaintenanceRecord,
  AssetLoan,
  AssetPart,
  AssetTimelineEvent,
} from '../assetTypes';
import {
  getWarrantyForAsset,
  getMaintenanceDefsForAsset,
  getMaintenanceRecordsForAsset,
  getLoansForAsset,
  getPartsForAsset,
  getAssetTimeline,
  deleteAsset,
  deleteMaintenanceRecord,
  isWarrantyActive,
  getDaysUntilWarrantyExpiry,
} from '../assetService';
import { getPlaces } from '../../travel/travelService';
import { getPeople } from '../../people/peopleService';
import { MaintenanceModal } from './MaintenanceModal';
import { AssetLoanModal } from './AssetLoanModal';
import { AssetPartModal } from './AssetPartModal';
import { AssetQRModal } from './AssetQRModal';
import { AssetModal } from './AssetModal';
import {
  X,
  Edit2,
  Trash2,
  QrCode,
  Shield,
  Wrench,
  Clock,
  Share2,
  Layers,
  FileText,
  MapPin,
  Tag,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onAssetUpdated?: () => void;
  onAssetDeleted?: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
  onAssetUpdated,
  onAssetDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'maintenance' | 'warranty' | 'loans' | 'parts' | 'timeline'
  >('overview');

  // Sub-modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLogMaintenanceOpen, setIsLogMaintenanceOpen] = useState(false);
  const [isCreateMaintDefOpen, setIsCreateMaintDefOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);

  const places = getPlaces();
  const people = getPeople();

  const warranty = getWarrantyForAsset(asset.id);
  const maintenanceDefs = getMaintenanceDefsForAsset(asset.id);
  const maintenanceRecords = getMaintenanceRecordsForAsset(asset.id);
  const loans = getLoansForAsset(asset.id);
  const activeLoan = loans.find((l) => !l.returnedAt);
  const parts = getPartsForAsset(asset.id);
  const timeline = getAssetTimeline(asset.id);

  const linkedPlace = places.find((p) => p.id === asset.placeId);

  if (!isOpen) return null;

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete asset "${asset.name}"? This action cannot be undone.`)) {
      deleteAsset(asset.id);
      if (onAssetDeleted) onAssetDeleted();
      onClose();
    }
  };

  const daysUntilExpiry = getDaysUntilWarrantyExpiry(warranty);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-950/60 border border-indigo-700/60 rounded-lg text-indigo-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white leading-tight">
                  {asset.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                  <span className="uppercase tracking-wider font-semibold text-indigo-400">
                    {asset.type}
                  </span>
                  <span>•</span>
                  <span>Status: {asset.status}</span>
                  {asset.manufacturer && (
                    <>
                      <span>•</span>
                      <span>{asset.manufacturer}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                title="View QR Code & Printable Tag"
                className="p-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit Asset"
                className="p-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                title="Delete Asset"
                className="p-2 text-red-400 hover:text-red-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-100 p-2 rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-neutral-800 px-6 bg-neutral-950/40 overflow-x-auto text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Overview & Specs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'maintenance'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Maintenance ({maintenanceRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('warranty')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'warranty'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Warranty {warranty && (isWarrantyActive(warranty) ? '🟢' : '⚪')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'loans'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Loans {activeLoan && '🔴'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parts')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'parts'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Parts & Consumables ({parts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Highlights grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/60">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Location
                    </div>
                    <div className="font-medium text-neutral-200 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{linkedPlace ? linkedPlace.name : 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/60">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Purchase Price
                    </div>
                    <div className="font-medium text-neutral-200 mt-1">
                      {asset.purchasePrice
                        ? `${asset.purchasePrice.currency || '$'}${asset.purchasePrice.amount.toLocaleString()}`
                        : '—'}
                    </div>
                  </div>

                  <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/60">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Acquired
                    </div>
                    <div className="font-medium text-neutral-200 mt-1">
                      {asset.acquiredAt || '—'}
                    </div>
                  </div>

                  <div className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/60">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Ownership
                    </div>
                    <div className="font-medium text-neutral-200 mt-1 capitalize">
                      {asset.ownership}
                    </div>
                  </div>
                </div>

                {/* Model & Hardware Serials */}
                <div className="bg-neutral-800/40 rounded-xl p-4 border border-neutral-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      Hardware Identifiers & Model
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-400">Manufacturer: </span>
                      <span className="text-neutral-200 font-medium">
                        {asset.manufacturer || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Model: </span>
                      <span className="text-neutral-200 font-medium">{asset.model || '—'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Serial Number: </span>
                      <span className="text-neutral-200 font-mono font-medium">
                        {asset.serialNumber || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Part / SKU: </span>
                      <span className="text-neutral-200 font-mono">
                        {asset.partNumber || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle specifics */}
                {asset.vehicleDetails && (
                  <div className="bg-neutral-800/40 rounded-xl p-4 border border-neutral-700/60 space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Vehicle & Powertrain Specs
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400">Year: </span>
                        <span className="text-neutral-200 font-medium">{asset.vehicleDetails.year || '—'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">VIN: </span>
                        <span className="text-neutral-200 font-mono font-medium">{asset.vehicleDetails.vin || '—'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">License Plate: </span>
                        <span className="text-neutral-200 font-mono font-medium">{asset.vehicleDetails.registrationPlate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Odometer: </span>
                        <span className="text-neutral-200 font-medium">
                          {asset.vehicleDetails.currentOdometer !== undefined
                            ? `${asset.vehicleDetails.currentOdometer.toLocaleString()} ${asset.vehicleDetails.odometerUnit || 'km'}`
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Fuel Type: </span>
                        <span className="text-neutral-200 capitalize">{asset.vehicleDetails.fuelType || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual & Links */}
                {asset.manualUrl && (
                  <div className="flex items-center justify-between p-3 bg-neutral-800/40 rounded-lg border border-neutral-700/60">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>User Manual & Documentation</span>
                    </div>
                    <a
                      href={asset.manualUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Tags & Notes */}
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded-md text-xs font-medium border border-neutral-700"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {asset.notes && (
                  <div className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 whitespace-pre-wrap">
                    {asset.notes}
                  </div>
                )}
              </div>
            )}

            {/* MAINTENANCE TAB */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-200 text-sm">
                    Maintenance History & Service Log
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateMaintDefOpen(true)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogMaintenanceOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Log Service Record
                    </button>
                  </div>
                </div>

                {/* Maintenance Schedules List */}
                {maintenanceDefs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Recurring Schedules ({maintenanceDefs.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {maintenanceDefs.map((def) => (
                        <div
                          key={def.id}
                          className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/60 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-neutral-200 text-xs">{def.title}</div>
                            <div className="text-[11px] text-neutral-400">
                              Every {def.recurrence?.interval} {def.recurrence?.frequency}
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-neutral-700 text-neutral-300">
                            {def.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performed Records List */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Completed Service Records ({maintenanceRecords.length})
                  </div>

                  {maintenanceRecords.length === 0 ? (
                    <div className="text-center py-8 bg-neutral-950/30 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
                      No maintenance records logged yet. Click "Log Service Record" to record maintenance.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {maintenanceRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-3.5 bg-neutral-800/40 rounded-xl border border-neutral-700/60 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-200">{rec.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 uppercase">
                                {rec.serviceType}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400 flex items-center gap-3">
                              <span>Date: {rec.performedAt}</span>
                              {rec.performedBy && <span>By: {rec.performedBy}</span>}
                              {rec.costAmount && (
                                <span className="text-neutral-300 font-medium">
                                  Cost: {rec.costAmount.currency || '$'}
                                  {rec.costAmount.amount.toFixed(2)}
                                </span>
                              )}
                              {rec.odometerAtService !== undefined && (
                                <span>Odo: {rec.odometerAtService.toLocaleString()}</span>
                              )}
                            </div>
                            {rec.notes && (
                              <div className="text-xs text-neutral-300 pt-1">{rec.notes}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this maintenance record?')) {
                                deleteMaintenanceRecord(rec.id);
                                if (onAssetUpdated) onAssetUpdated();
                              }
                            }}
                            className="text-neutral-500 hover:text-red-400 p-1 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WARRANTY TAB */}
            {activeTab === 'warranty' && (
              <div className="space-y-4">
                {warranty ? (
                  <div className="bg-neutral-800/50 p-5 rounded-xl border border-neutral-700/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <h4 className="font-bold text-neutral-100">{warranty.provider} Warranty</h4>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          isWarrantyActive(warranty)
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {isWarrantyActive(warranty) ? 'Active Warranty' : 'Expired'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400">Coverage Type: </span>
                        <span className="text-neutral-200 capitalize">{warranty.type}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Policy Number: </span>
                        <span className="text-neutral-200 font-mono">
                          {warranty.policyNumber || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Start Date: </span>
                        <span className="text-neutral-200">{warranty.startDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">End Date: </span>
                        <span className="text-neutral-200 font-semibold">{warranty.endDate || '—'}</span>
                      </div>
                    </div>

                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <div className="text-xs text-indigo-300 bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-800/40 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Expires in <strong>{daysUntilExpiry}</strong> days</span>
                      </div>
                    )}

                    {warranty.notes && (
                      <div className="text-xs text-neutral-300 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
                        {warranty.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-neutral-950/30 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
                    No warranty record linked to this asset.
                  </div>
                )}
              </div>
            )}

            {/* LOANS TAB */}
            {activeTab === 'loans' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-200 text-xs uppercase tracking-wider">
                    Loans & Borrowing History
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsLoanModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {activeLoan ? 'Manage Active Loan' : 'Lend / Borrow Item'}
                  </button>
                </div>

                {loans.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-950/30 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
                    No loan history recorded for this item.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {loans.map((l) => {
                      const borrowerPerson = people.find((p) => p.id === l.personId);
                      const targetName = borrowerPerson?.displayName || borrowerPerson?.noteTitle || l.borrowerName || 'Unknown Party';
                      const isLent = l.direction === 'lent';

                      return (
                        <div
                          key={l.id}
                          className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-neutral-200">
                              {isLent ? `Lent to ${targetName}` : `Borrowed from ${targetName}`}
                            </div>
                            <div className="text-neutral-400 text-[11px] mt-0.5">
                              Started: {l.startedAt} {l.dueAt && `• Due: ${l.dueAt}`}
                            </div>
                            {l.notes && <div className="text-neutral-300 text-[11px] mt-1">{l.notes}</div>}
                          </div>

                          <div>
                            {l.returnedAt ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-700 text-neutral-300 font-medium">
                                Returned ({l.returnedAt})
                              </span>
                            ) : (
                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700 font-semibold">
                                Actively On Loan
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PARTS TAB */}
            {activeTab === 'parts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-200 text-xs uppercase tracking-wider">
                    Compatible Consumables & Spare Parts
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsPartModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Part
                  </button>
                </div>

                {parts.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-950/30 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
                    No compatible parts or consumables linked to this equipment.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-neutral-200">{p.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">
                            {p.modelNumber || p.manufacturer || 'Part'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-neutral-100 text-sm">{p.stockQuantity} in stock</div>
                          {p.minStockThreshold !== undefined && p.stockQuantity <= p.minStockThreshold && (
                            <div className="text-[10px] text-amber-400 font-medium">Low stock</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-neutral-200 text-xs uppercase tracking-wider mb-2">
                  Asset Lifecycle Timeline
                </h4>
                {timeline.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-950/30 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
                    No history events recorded.
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-neutral-800 space-y-4">
                    {timeline.map((evt) => (
                      <div key={evt.id} className="relative">
                        <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-neutral-900" />
                        <div className="text-[11px] font-mono text-neutral-400">{evt.date}</div>
                        <div className="font-medium text-neutral-200 text-xs mt-0.5">{evt.title}</div>
                        {evt.description && (
                          <div className="text-[11px] text-neutral-400 mt-0.5">{evt.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {isEditModalOpen && (
        <AssetModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          assetToEdit={asset}
          onSaved={() => {
            if (onAssetUpdated) onAssetUpdated();
          }}
        />
      )}

      {isQRModalOpen && (
        <AssetQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          asset={asset}
        />
      )}

      {isLogMaintenanceOpen && (
        <MaintenanceModal
          isOpen={isLogMaintenanceOpen}
          onClose={() => setIsLogMaintenanceOpen(false)}
          asset={asset}
          mode="log_record"
          onSaved={() => {
            if (onAssetUpdated) onAssetUpdated();
          }}
        />
      )}

      {isCreateMaintDefOpen && (
        <MaintenanceModal
          isOpen={isCreateMaintDefOpen}
          onClose={() => setIsCreateMaintDefOpen(false)}
          asset={asset}
          mode="create_definition"
          onSaved={() => {
            if (onAssetUpdated) onAssetUpdated();
          }}
        />
      )}

      {isLoanModalOpen && (
        <AssetLoanModal
          isOpen={isLoanModalOpen}
          onClose={() => setIsLoanModalOpen(false)}
          asset={asset}
          activeLoan={activeLoan}
          onSaved={() => {
            if (onAssetUpdated) onAssetUpdated();
          }}
        />
      )}

      {isPartModalOpen && (
        <AssetPartModal
          isOpen={isPartModalOpen}
          onClose={() => setIsPartModalOpen(false)}
          initialAssetId={asset.id}
          onSaved={() => {
            if (onAssetUpdated) onAssetUpdated();
          }}
        />
      )}
    </>
  );
};
