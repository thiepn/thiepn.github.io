import React, { useState } from 'react';
import {
  Asset,
  MaintenanceDefinition,
  MaintenanceRecord,
} from '../assetTypes';
import {
  saveMaintenanceDef,
  createMaintenanceRecord,
} from '../assetService';
import {
  X,
  Wrench,
  Calendar,
  CheckCircle,
  FileText,
  DollarSign,
  Clock,
} from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  mode: 'log_record' | 'create_definition' | 'edit_definition';
  definitionToEdit?: MaintenanceDefinition;
  onSaved?: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  asset,
  mode,
  definitionToEdit,
  onSaved,
}) => {
  // Definition State
  const [title, setTitle] = useState(definitionToEdit?.title || '');
  const [description, setDescription] = useState(definitionToEdit?.description || '');
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days'>(
    definitionToEdit?.recurrence?.frequency || 'monthly'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    definitionToEdit?.recurrence?.interval ? String(definitionToEdit.recurrence.interval) : '6'
  );
  const [manualReference, setManualReference] = useState(definitionToEdit?.manualReference || '');
  const [defStatus, setDefStatus] = useState<'active' | 'paused' | 'archived'>(
    definitionToEdit?.status || 'active'
  );

  // Metric-based recurrence (e.g. for vehicles)
  const [hasMetricInterval, setHasMetricInterval] = useState(!!definitionToEdit?.intervalMetric);
  const [metricThreshold, setMetricThreshold] = useState(
    definitionToEdit?.intervalMetric?.threshold ? String(definitionToEdit.intervalMetric.threshold) : '15000'
  );
  const [metricUnit, setMetricUnit] = useState(definitionToEdit?.intervalMetric?.unit || 'km');

  // Record Logging State
  const [recordTitle, setRecordTitle] = useState(
    definitionToEdit ? `${definitionToEdit.title} (Completed)` : 'Routine Maintenance'
  );
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState<
    'routine' | 'inspection' | 'cleaning' | 'repair' | 'replacement' | 'upgrade' | 'other'
  >('routine');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('$');
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [odometerAtService, setOdometerAtService] = useState(
    asset.vehicleDetails?.currentOdometer !== undefined ? String(asset.vehicleDetails.currentOdometer) : ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'log_record') {
      if (!recordTitle.trim() || !performedAt) return;

      const cost = costAmount.trim() && !isNaN(Number(costAmount))
        ? { amount: Number(costAmount), currency: costCurrency }
        : undefined;

      createMaintenanceRecord({
        assetId: asset.id,
        definitionId: definitionToEdit?.id,
        title: recordTitle.trim(),
        performedAt,
        serviceType,
        costAmount: cost,
        performedBy: performedBy.trim() || undefined,
        notes: notes.trim() || undefined,
        odometerAtService: odometerAtService ? Number(odometerAtService) : undefined,
      });
    } else {
      // Create or update definition
      if (!title.trim()) return;

      saveMaintenanceDef({
        id: definitionToEdit?.id,
        assetId: asset.id,
        title: title.trim(),
        description: description.trim() || undefined,
        recurrence: {
          frequency: recurrenceFreq,
          interval: Number(recurrenceInterval) || 1,
        },
        intervalMetric: hasMetricInterval
          ? {
              type: 'distance',
              threshold: Number(metricThreshold) || 10000,
              unit: metricUnit,
            }
          : undefined,
        status: defStatus,
        manualReference: manualReference.trim() || undefined,
      });
    }

    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            {mode === 'log_record' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Clock className="w-5 h-5 text-indigo-400" />
            )}
            <h2 className="text-lg font-semibold tracking-tight">
              {mode === 'log_record'
                ? `Log Completed Maintenance (${asset.name})`
                : mode === 'edit_definition'
                ? `Edit Schedule: ${definitionToEdit?.title}`
                : `Add Maintenance Schedule (${asset.name})`}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {mode === 'log_record' ? (
            /* LOG RECORD FORM */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Service / Task Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replaced HEPA filter, Oil change & brake check"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Date Performed *
                  </label>
                  <input
                    type="date"
                    required
                    value={performedAt}
                    onChange={(e) => setPerformedAt(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="routine">Routine Service</option>
                    <option value="inspection">Inspection / Checkup</option>
                    <option value="cleaning">Cleaning / Deep Clean</option>
                    <option value="replacement">Consumable Replacement</option>
                    <option value="repair">Repair</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Performed By / Provider
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Self, Authorized Service, Local Mechanic"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Cost Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={costAmount}
                      onChange={(e) => setCostAmount(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-16">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Cur.
                    </label>
                    <input
                      type="text"
                      value={costCurrency}
                      onChange={(e) => setCostCurrency(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2.5 text-neutral-100 text-center font-semibold"
                    />
                  </div>
                </div>
              </div>

              {['vehicle', 'bicycle'].includes(asset.type) && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Odometer at Service ({asset.vehicleDetails?.odometerUnit || 'km'})
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={odometerAtService}
                    onChange={(e) => setOdometerAtService(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Notes / Work Performed
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of parts used, findings, checklist items..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            /* CREATE / EDIT DEFINITION FORM */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replace air filter, Annual vehicle service, Descale kettle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Time Recurrence Interval
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Every</span>
                    <input
                      type="number"
                      min="1"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value)}
                      className="w-20 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={recurrenceFreq}
                    onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="monthly">Month(s)</option>
                    <option value="yearly">Year(s)</option>
                    <option value="weekly">Week(s)</option>
                    <option value="daily">Day(s)</option>
                    <option value="custom_days">Days (Exact)</option>
                  </select>
                </div>
              </div>

              {['vehicle', 'bicycle'].includes(asset.type) && (
                <div className="p-3 bg-neutral-800/40 rounded-lg border border-neutral-700/60 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMetricInterval}
                      onChange={(e) => setHasMetricInterval(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                    />
                    <span>Also trigger by distance/odometer threshold</span>
                  </label>

                  {hasMetricInterval && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-neutral-400">Every</span>
                      <input
                        type="number"
                        value={metricThreshold}
                        onChange={(e) => setMetricThreshold(e.target.value)}
                        className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 font-mono"
                      />
                      <span className="text-xs text-neutral-300">{metricUnit}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Manual Source / Page Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. User Manual section 4.2 (p. 35)"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Schedule Status
                </label>
                <select
                  value={defStatus}
                  onChange={(e) => setDefStatus(e.target.value as any)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active (Calculates Due Dates)</option>
                  <option value="paused">Paused (Temporarily Suspended)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          )}

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
              className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition flex items-center gap-2 ${
                mode === 'log_record'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {mode === 'log_record' ? 'Save Service Record' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
