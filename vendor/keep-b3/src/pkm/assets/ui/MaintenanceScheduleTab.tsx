import React, { useState } from 'react';
import { Asset, MaintenanceDefinition } from '../assetTypes';
import {
  calculateMaintenanceDueStatuses,
  getMaintenanceDefs,
  deleteMaintenanceDef,
} from '../assetService';
import { MaintenanceModal } from './MaintenanceModal';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  Trash2,
} from 'lucide-react';

interface MaintenanceScheduleTabProps {
  onSelectAsset: (asset: Asset) => void;
  onRefresh?: () => void;
}

export const MaintenanceScheduleTab: React.FC<MaintenanceScheduleTabProps> = ({
  onSelectAsset,
  onRefresh,
}) => {
  const [selectedDueDef, setSelectedDueDef] = useState<{
    asset: Asset;
    definition: MaintenanceDefinition;
  } | null>(null);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const dueStatuses = calculateMaintenanceDueStatuses();
  const allDefs = getMaintenanceDefs();

  const overdueItems = dueStatuses.filter((s) => s.isOverdue);
  const upcomingItems = dueStatuses.filter((s) => !s.isOverdue && s.isDue);
  const scheduledItems = dueStatuses.filter((s) => !s.isDue);

  const handleQuickLog = (asset: Asset, def: MaintenanceDefinition) => {
    setSelectedDueDef({ asset, definition: def });
    setIsLogModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-red-950/30 border border-red-800/50 p-4 rounded-xl">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Overdue Maintenance
          </div>
          <div className="text-2xl font-extrabold text-red-200 mt-1">
            {overdueItems.length}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/50 p-4 rounded-xl">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Due Soon (Next 14 Days)
          </div>
          <div className="text-2xl font-extrabold text-amber-200 mt-1">
            {upcomingItems.length}
          </div>
        </div>

        <div className="bg-neutral-800/40 border border-neutral-700/60 p-4 rounded-xl">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Total Active Schedules
          </div>
          <div className="text-2xl font-extrabold text-neutral-100 mt-1">
            {allDefs.filter((d) => d.status === 'active').length}
          </div>
        </div>
      </div>

      {/* OVERDUE & DUE SOON LIST */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Action Required
        </h3>

        {overdueItems.length === 0 && upcomingItems.length === 0 ? (
          <div className="p-6 bg-neutral-900/40 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
            All scheduled maintenance tasks are up to date!
          </div>
        ) : (
          <div className="space-y-2">
            {[...overdueItems, ...upcomingItems].map((item) => (
              <div
                key={item.definition.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                  item.isOverdue
                    ? 'bg-red-950/30 border-red-800/60'
                    : 'bg-amber-950/30 border-amber-800/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100 text-sm">
                      {item.definition.title}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        item.isOverdue
                          ? 'bg-red-900 text-red-200'
                          : 'bg-amber-900 text-amber-200'
                      }`}
                    >
                      {item.dueReason}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 flex items-center gap-2">
                    <span>
                      Asset:{' '}
                      <strong
                        onClick={() => onSelectAsset(item.asset)}
                        className="text-indigo-400 hover:underline cursor-pointer"
                      >
                        {item.asset.name}
                      </strong>
                    </span>
                    {item.lastPerformedDate && (
                      <span>• Last serviced: {item.lastPerformedDate}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickLog(item.asset, item.definition)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Done & Log
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALL SCHEDULED DEFINITIONS */}
      <div className="space-y-3 pt-4 border-t border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          All Active Maintenance Schedules ({allDefs.length})
        </h3>

        {allDefs.length === 0 ? (
          <div className="text-center py-8 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 text-xs">
            No recurring maintenance schedules configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allDefs.map((def) => {
              const dueInfo = dueStatuses.find((s) => s.definition.id === def.id);
              return (
                <div
                  key={def.id}
                  className="p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-neutral-200 text-xs">{def.title}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Recurrence: Every {def.recurrence?.interval} {def.recurrence?.frequency}
                      {def.intervalMetric && ` • Every ${def.intervalMetric.threshold} ${def.intervalMetric.unit}`}
                    </div>
                    {dueInfo?.nextDueDate && (
                      <div className="text-[11px] text-indigo-400 mt-1">
                        Next due: {dueInfo.nextDueDate} ({dueInfo.dueReason})
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this maintenance definition?')) {
                        deleteMaintenanceDef(def.id);
                        if (onRefresh) onRefresh();
                      }
                    }}
                    className="text-neutral-500 hover:text-red-400 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {isLogModalOpen && selectedDueDef && (
        <MaintenanceModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          asset={selectedDueDef.asset}
          mode="log_record"
          definitionToEdit={selectedDueDef.definition}
          onSaved={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
