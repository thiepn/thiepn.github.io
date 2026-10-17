import React, { useState } from 'react';
import {
  Clock,
  GitCommit,
  FileText,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { ResourceRef } from '../core/resource/resourceCore';
import { globalResourceHistoryEngine, UnifiedResourceHistoryReport } from '../history';

interface ResourceHistoryTabProps {
  resourceRef: ResourceRef;
  onRestoreRevision?: (revisionId: string) => void;
}

export const ResourceHistoryTab: React.FC<ResourceHistoryTabProps> = ({
  resourceRef,
  onRestoreRevision,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'revisions' | 'domain'>('activity');

  const historyReport: UnifiedResourceHistoryReport = globalResourceHistoryEngine.getUnifiedHistory(
    resourceRef
  );

  return (
    <div className="space-y-4 text-xs">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('activity')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            activeSubTab === 'activity'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Activity ({historyReport.activityEvents.length})
        </button>
        <button
          onClick={() => setActiveSubTab('revisions')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            activeSubTab === 'revisions'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Content Revisions ({historyReport.revisions.length})
        </button>
        {historyReport.domainHistory.length > 0 && (
          <button
            onClick={() => setActiveSubTab('domain')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeSubTab === 'domain'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Domain History ({historyReport.domainHistory.length})
          </button>
        )}
      </div>

      {/* Activity Stream */}
      {activeSubTab === 'activity' && (
        <div className="space-y-2">
          {historyReport.activityEvents.length === 0 ? (
            <p className="text-zinc-500 py-4 text-center">No recorded activity for this resource.</p>
          ) : (
            historyReport.activityEvents.map(ev => (
              <div
                key={ev.id}
                className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1"
              >
                <div className="flex items-center justify-between text-zinc-300 font-medium">
                  <span>{ev.summary.primaryTitle}</span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(ev.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {ev.summary.deltaSummary && (
                  <p className="text-[11px] text-zinc-400">{ev.summary.deltaSummary}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-0.5">
                  <span>By {ev.actor}</span>
                  {ev.editCount && ev.editCount > 1 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400/80">{ev.editCount} edit batch</span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Revisions */}
      {activeSubTab === 'revisions' && (
        <div className="space-y-2">
          {historyReport.revisions.length === 0 ? (
            <p className="text-zinc-500 py-4 text-center">No point-in-time revisions recorded.</p>
          ) : (
            historyReport.revisions.map(rev => (
              <div
                key={rev.revisionId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80"
              >
                <div>
                  <div className="text-zinc-200 font-medium">{rev.description || 'Snapshot'}</div>
                  <div className="text-[11px] text-zinc-500">
                    {new Date(rev.timestamp).toLocaleString()}
                  </div>
                </div>
                {onRestoreRevision && (
                  <button
                    onClick={() => onRestoreRevision(rev.revisionId)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Domain History */}
      {activeSubTab === 'domain' && (
        <div className="space-y-2">
          {historyReport.domainHistory.map(dh => (
            <div
              key={dh.id}
              className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-0.5"
            >
              <div className="text-zinc-200 font-medium">{dh.title}</div>
              {dh.details && <p className="text-[11px] text-zinc-400">{dh.details}</p>}
              <span className="text-[10px] text-zinc-500">{new Date(dh.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
