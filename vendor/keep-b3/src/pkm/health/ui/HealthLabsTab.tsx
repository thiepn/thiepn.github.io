import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { LabReport, LabResultValue } from '../healthTypes';
import { healthService } from '../healthService';

interface HealthLabsTabProps {
  labReports: LabReport[];
  onOpenModal: (initialReport?: LabReport) => void;
  onRefresh: () => void;
}

export const HealthLabsTab: React.FC<HealthLabsTabProps> = ({
  labReports,
  onOpenModal,
  onRefresh,
}) => {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(
    labReports[0]?.id || null
  );
  const [selectedMarkerForHistory, setSelectedMarkerForHistory] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Delete this laboratory report?')) {
      healthService.deleteLabReport(id);
      onRefresh();
    }
  };

  // Extract all distinct markers across all reports for longitudinal comparison
  const allMarkersMap = new Map<string, { testName: string; values: { date: string; value?: number; unit?: string; flag?: string }[] }>();
  labReports.forEach((r) => {
    r.values.forEach((v) => {
      const key = v.canonicalTestKey || v.testName.toLowerCase().trim();
      if (!allMarkersMap.has(key)) {
        allMarkersMap.set(key, { testName: v.testName, values: [] });
      }
      allMarkersMap.get(key)!.values.push({
        date: r.date,
        value: v.value,
        unit: v.unit,
        flag: v.sourceFlag,
      });
    });
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-500" />
            Laboratory Tests & Blood Panels
          </h2>
          <p className="text-xs text-stone-500">
            Clinical results, reference ranges, and source-preserved laboratory flags
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Record Lab Report
        </button>
      </div>

      {/* Longitudinal Marker Quick Trends */}
      {allMarkersMap.size > 0 && (
        <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
              Longitudinal Marker Comparison
            </h3>
            <span className="text-[11px] text-stone-400">
              Select marker to inspect chronological trajectory
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Array.from(allMarkersMap.entries()).map(([key, data]) => {
              const isSelected = selectedMarkerForHistory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMarkerForHistory(isSelected ? null : key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-cyan-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  {data.testName} ({data.values.length})
                </button>
              );
            })}
          </div>

          {selectedMarkerForHistory && allMarkersMap.has(selectedMarkerForHistory) && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                History for {allMarkersMap.get(selectedMarkerForHistory)!.testName}:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allMarkersMap
                  .get(selectedMarkerForHistory)!
                  .values.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/30"
                    >
                      <span className="font-mono text-[10px] text-stone-500 block">{v.date}</span>
                      <span className="text-sm font-black text-stone-900 dark:text-stone-100">
                        {v.value ?? '—'} <span className="text-[10px] font-normal text-stone-500">{v.unit}</span>
                      </span>
                      {v.flag && v.flag !== 'normal' && (
                        <span className="ml-1 text-[10px] font-bold text-amber-600 uppercase">
                          ({v.flag})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports List */}
      {labReports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400 space-y-3">
          <FlaskConical className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
          <p>No laboratory reports recorded. Add blood panel results or clinical tests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {labReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const flaggedCount = report.values.filter((v) => v.sourceFlag && v.sourceFlag !== 'normal').length;

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-stone-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {report.title}
                        </h3>
                        {flaggedCount > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {flaggedCount} Flagged
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{report.date}</span>
                        {report.provider && <span>• {report.provider}</span>}
                        <span>• {report.values.length} markers</span>
                        {report.attachmentId && (
                          <span className="flex items-center gap-1 text-cyan-600 font-semibold">
                            <FileText className="w-3 h-3" /> Linked Doc
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenModal(report)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 space-y-3">
                    {report.notes && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 italic bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                        "{report.notes}"
                      </p>
                    )}

                    <div className="overflow-x-auto bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-500">
                          <tr>
                            <th className="p-3 pl-4">Test Marker</th>
                            <th className="p-3">Result Value</th>
                            <th className="p-3">Unit</th>
                            <th className="p-3">Reference Range</th>
                            <th className="p-3 text-right pr-4">Lab Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                          {report.values.map((v, i) => (
                            <tr key={v.id || i} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40">
                              <td className="p-3 pl-4 font-bold text-stone-900 dark:text-stone-100">
                                {v.testName}
                              </td>

                              <td className="p-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                                {v.value !== undefined ? v.value : v.textValue || '—'}
                              </td>

                              <td className="p-3 text-stone-500">{v.unit || '—'}</td>

                              <td className="p-3 text-stone-500 text-[11px]">
                                {v.referenceRangeLow !== undefined && v.referenceRangeHigh !== undefined
                                  ? `${v.referenceRangeLow} - ${v.referenceRangeHigh}`
                                  : v.referenceRangeText || '—'}
                              </td>

                              <td className="p-3 pr-4 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    v.sourceFlag === 'H' || v.sourceFlag === 'L' || v.sourceFlag === 'abnormal'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : v.sourceFlag === 'critical'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                  }`}
                                >
                                  {v.sourceFlag || 'Normal'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
