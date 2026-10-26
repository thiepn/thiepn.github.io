/**
 * Phase P55: Offline Trip Packet & Pre-travel Audit Tab
 * Assembles a self-contained, offline-ready packet of all trip logistics, reservations, and emergency notes.
 */

import React, { useState } from 'react';
import { Trip, OfflineTripPacket } from '../travelTypes';
import { travelService } from '../travelService';
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Calendar,
  Lock,
  Building2,
  Plane,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface OfflineTripPacketTabProps {
  trips: Trip[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  onRefresh: () => void;
}

export const OfflineTripPacketTab: React.FC<OfflineTripPacketTabProps> = ({
  trips,
  selectedTripId,
  onSelectTrip,
  onRefresh,
}) => {
  const currentTripId = selectedTripId || trips[0]?.id || '';
  const currentTrip = trips.find((t) => t.id === currentTripId);

  const [copied, setCopied] = useState(false);
  const [packet, setPacket] = useState<OfflineTripPacket | null>(() =>
    currentTrip ? travelService.getOfflinePacket(currentTrip.id) : null
  );

  if (!currentTrip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <ShieldCheck className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          No Trip Selected
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Select a trip to generate its offline readiness cache and audit issues.
        </p>
      </div>
    );
  }

  const auditIssues = packet?.auditIssues || [];

  const handleGeneratePacket = () => {
    const generated = travelService.buildOfflineTripPacket(currentTrip.id);
    setPacket(generated);
    onRefresh();
  };

  const handleCopyJson = () => {
    if (!packet) return;
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!packet) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(packet, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `offline-trip-packet-${currentTrip.title.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Trip Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 shrink-0">
            Trip:
          </label>
          <select
            value={currentTrip.id}
            onChange={(e) => {
              onSelectTrip(e.target.value);
              setPacket(travelService.getOfflinePacket(e.target.value));
            }}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Generate / Refresh Packet */}
        <button
          onClick={handleGeneratePacket}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{packet ? 'Update Offline Packet' : 'Generate Offline Packet'}</span>
        </button>
      </div>

      {/* Pre-travel Audit Section */}
      <div className="p-4 md:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Pre-Travel Readiness Audit
            </h3>
          </div>
          {auditIssues.length === 0 ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" />
              All Clear
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {auditIssues.length} Items To Check
            </span>
          )}
        </div>

        {auditIssues.length > 0 ? (
          <div className="space-y-2">
            {auditIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Flight/hotel booking codes present, essential items packed, and schedule verified.
          </p>
        )}
      </div>

      {/* Packet Summary & Actions */}
      {packet ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Cached Offline Packet</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-normal">
                  Generated {new Date(packet.generatedAt).toLocaleTimeString()}
                </span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Saved locally on this device. Accessible anytime without internet.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Snapshot Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Reservations</span>
              <span className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
                {packet.reservations.length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Itinerary Stops</span>
              <span className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
                {packet.itinerary.length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Places / Coords</span>
              <span className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
                {packet.places.length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Packed Items</span>
              <span className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
                {packet.packingItems.filter((i) => i.packed).length}/{packet.packingItems.length}
              </span>
            </div>
          </div>

          {/* Quick Critical Reference Preview */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Critical Reference Snapshot
            </h5>

            <div className="space-y-2">
              {packet.reservations.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {r.type === 'flight' ? (
                      <Plane className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Building2 className="w-4 h-4 text-teal-500" />
                    )}
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {r.provider}
                      </span>
                      {r.departureTime && (
                        <span className="text-stone-500 ml-2">
                          ({r.departureTime.dateTime.replace('T', ' ')})
                        </span>
                      )}
                    </div>
                  </div>

                  {r.confirmationNumber && (
                    <span className="font-mono font-bold bg-white dark:bg-stone-900 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-amber-600 dark:text-amber-400">
                      {r.confirmationNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
          <ShieldCheck className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            Offline Packet Not Yet Generated
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Click the button above to compile your trips, booking codes, places, and packing list into a single local cache.
          </p>
          <button
            onClick={handleGeneratePacket}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            Generate Packet Now
          </button>
        </div>
      )}
    </div>
  );
};
