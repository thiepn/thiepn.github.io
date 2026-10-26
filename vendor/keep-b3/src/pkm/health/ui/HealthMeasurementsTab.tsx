import React, { useState } from 'react';
import {
  Scale,
  Heart,
  Plus,
  Filter,
  EyeOff,
  AlertTriangle,
  Edit2,
  Trash2,
  TrendingUp,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  MeasurementTypeDefinition,
  HealthMeasurement,
  HealthProfile,
} from '../healthTypes';
import { formatHealthValue, formatBloodPressure, convertHealthUnit } from '../healthUnits';
import { calculateRollingAverage } from '../healthCalculations';
import { healthService } from '../healthService';

interface HealthMeasurementsTabProps {
  measurementTypes: MeasurementTypeDefinition[];
  measurements: HealthMeasurement[];
  profile: HealthProfile;
  onOpenModal: (typeId?: string, initialMeasurement?: HealthMeasurement) => void;
  onRefresh: () => void;
}

export const HealthMeasurementsTab: React.FC<HealthMeasurementsTabProps> = ({
  measurementTypes,
  measurements,
  profile,
  onOpenModal,
  onRefresh,
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('body-weight');
  const [showExcluded, setShowExcluded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentType = measurementTypes.find((t) => t.id === selectedTypeId) || measurementTypes[0];

  // Filter measurements
  let filtered = measurements.filter((m) => m.typeId === selectedTypeId);
  if (!showExcluded) {
    filtered = filtered.filter((m) => !m.isExcluded);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((m) => (m.note || '').toLowerCase().includes(q) || m.observedAt.includes(q));
  }

  // Calculate 7-day rolling average
  const rollingPoints = calculateRollingAverage(
    filtered,
    7,
    profile.preferredUnits.weight && selectedTypeId === 'body-weight' ? profile.preferredUnits.weight : undefined
  );

  const handleDelete = (id: string) => {
    if (confirm('Delete this measurement entry?')) {
      healthService.deleteMeasurement(id);
      onRefresh();
    }
  };

  const handleToggleExclude = (id: string) => {
    healthService.toggleExcludeMeasurement(id);
    onRefresh();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Body & Clinical Measurements
          </h2>
          <p className="text-xs text-stone-500">
            Unit-aware logs, paired vitals, and rolling average calculations
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(selectedTypeId)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log {currentType?.name || 'Measurement'}
        </button>
      </div>

      {/* Measurement Type Pills */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
        {measurementTypes.map((t) => {
          const count = measurements.filter((m) => m.typeId === t.id && !m.isExcluded).length;
          const isSelected = t.id === selectedTypeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTypeId(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <span>{t.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-emerald-800/60 text-emerald-100' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rolling Average Stats Card */}
      {rollingPoints.length > 0 && !currentType.isPairedVitals && (
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                7-Day Rolling Average
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                {rollingPoints[rollingPoints.length - 1].rollingAvg}{' '}
                <span className="text-xs font-normal text-stone-500">
                  {rollingPoints[rollingPoints.length - 1].unit}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-600 dark:text-stone-400">
            Based on {rollingPoints.length} valid chronological observation points
          </div>
        </div>
      )}

      {/* Log List Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
        {/* Table Controls */}
        <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <input
            type="text"
            placeholder="Search notes or dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-1.5 px-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs w-64"
          />

          <label className="flex items-center gap-2 cursor-pointer text-stone-600 dark:text-stone-400 font-medium">
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={(e) => setShowExcluded(e.target.checked)}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            Show Outliers / Excluded ({measurements.filter((m) => m.typeId === selectedTypeId && m.isExcluded).length})
          </label>
        </div>

        {/* Entries Table */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            No measurement records found for {currentType.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-500">
                <tr>
                  <th className="p-3 pl-4">Date & Time</th>
                  <th className="p-3">Observed Value</th>
                  <th className="p-3">Source & Original</th>
                  <th className="p-3">Note / Context</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filtered.map((m) => {
                  const isBP = m.structuredValue !== undefined;
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                        m.isExcluded ? 'opacity-50 bg-stone-50/50 dark:bg-stone-900/30' : ''
                      }`}
                    >
                      <td className="p-3 pl-4 font-mono text-stone-700 dark:text-stone-300">
                        {m.observedAt.replace('T', ' ').slice(0, 16)}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          {isBP ? (
                            <span>{formatBloodPressure(m.structuredValue!.systolic, m.structuredValue!.diastolic, m.structuredValue!.pulse)}</span>
                          ) : (
                            <span>{formatHealthValue(m.value, m.unit)}</span>
                          )}

                          {m.isExcluded && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Outlier: {m.exclusionReason || 'Excluded'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-stone-500">
                        <span className="capitalize">{m.source}</span>
                        {m.originalValue !== undefined && m.originalUnit && m.originalUnit !== m.unit && (
                          <span className="text-[10px] text-stone-400 block font-mono">
                            Orig: {m.originalValue} {m.originalUnit}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-stone-600 dark:text-stone-300 max-w-xs truncate">
                        {m.note || '—'}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleExclude(m.id)}
                            title={m.isExcluded ? 'Include in charts' : 'Exclude / Mark as outlier'}
                            className="p-1.5 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenModal(m.typeId, m)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
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
