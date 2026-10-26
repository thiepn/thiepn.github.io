/**
 * Phase P55: Mobile / On-The-Go Travel Mode
 * Streamlined, high-contrast, distraction-free interface for active travel days.
 * Features dual timezone clocks, immediate lodging address access, next reservation, and today's timeline.
 */

import React, { useState, useEffect } from 'react';
import { Trip, Reservation, Place, ItineraryEntry } from '../travelTypes';
import { travelService } from '../travelService';
import {
  Navigation,
  Clock,
  Building2,
  Plane,
  Train,
  MapPin,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  Lock,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

interface MobileTravelModeTabProps {
  trip: Trip;
  places: Place[];
  onBackToOverview: () => void;
  onRefresh: () => void;
}

export const MobileTravelModeTab: React.FC<MobileTravelModeTabProps> = ({
  trip,
  places,
  onBackToOverview,
  onRefresh,
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));
  const reservations = travelService.getReservations(trip.id);
  const itinerary = travelService.getItinerary(trip.id);

  // Today's Date String YYYY-MM-DD in trip timezone or local
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItinerary = itinerary.filter((i) => i.date === todayStr || i.date === trip.startDate);

  // Find active accommodation
  const currentLodging = reservations.find((r) => r.type === 'accommodation' && r.status === 'booked');

  // Find next upcoming reservation
  const nextReservation = reservations.find((r) => r.status === 'booked' && r.type !== 'accommodation');

  // Timezone strings
  const homeTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tripTz = trip.timezone || homeTz;

  const getTzTime = (tz: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(nowTime);
    } catch {
      return nowTime.toLocaleTimeString();
    }
  };

  const handleCopyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleActivity = (item: ItineraryEntry) => {
    travelService.updateItineraryEntry(item.id, { isCompleted: !item.isCompleted });
    onRefresh();
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    const updatedNotes = trip.summaryNotes
      ? `${trip.summaryNotes}\n[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${quickNote.trim()}`
      : `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${quickNote.trim()}`;

    travelService.updateTrip(trip.id, { summaryNotes: updatedNotes });
    setQuickNote('');
    onRefresh();
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToOverview}
          className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit Travel Mode</span>
        </button>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          Travel Mode Active
        </span>
      </div>

      {/* Trip Title */}
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          {trip.title}
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Dual Clocks */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-stone-900 text-white dark:bg-stone-950 rounded-2xl shadow-lg border border-stone-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Trip Time ({tripTz.split('/').pop()?.replace('_', ' ')})
          </span>
          <div className="text-2xl font-black font-mono mt-1 text-white tracking-wider">
            {getTzTime(tripTz)}
          </div>
        </div>

        <div className="border-l border-stone-800 pl-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Home Time ({homeTz.split('/').pop()?.replace('_', ' ')})
          </span>
          <div className="text-2xl font-black font-mono mt-1 text-stone-300 tracking-wider">
            {getTzTime(homeTz)}
          </div>
        </div>
      </div>

      {/* Hotel / Lodging Quick Card (Essential for taxi / check-in) */}
      {currentLodging && (
        <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Current Accommodation</span>
            </div>
            {currentLodging.confirmationNumber && (
              <span className="font-mono text-xs font-bold bg-white dark:bg-stone-900 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                {currentLodging.confirmationNumber}
              </span>
            )}
          </div>

          <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {currentLodging.provider || placeMap.get(currentLodging.placeId || '')?.name}
          </div>

          {placeMap.get(currentLodging.placeId || '')?.address && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-teal-200 dark:border-teal-800/80">
              <div className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
                <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{placeMap.get(currentLodging.placeId || '')?.address}</span>
              </div>
              <button
                onClick={() => handleCopyAddress(placeMap.get(currentLodging.placeId || '')!.address!)}
                className="px-2.5 py-1 bg-teal-500 text-white rounded-lg text-xs font-semibold shrink-0 hover:bg-teal-600 transition-colors flex items-center gap-1"
              >
                {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {currentLodging.lodgingDetails?.wifiPassword && (
            <div className="text-xs text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <span className="font-medium">Wi-Fi Password:</span>
              <code className="font-mono bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 font-bold">
                {currentLodging.lodgingDetails.wifiPassword}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Next Upcoming Transit / Booking */}
      {nextReservation && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              {nextReservation.type === 'flight' ? (
                <Plane className="w-4 h-4" />
              ) : (
                <Train className="w-4 h-4" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">Next Departure</span>
            </div>
            {nextReservation.confirmationNumber && (
              <button
                onClick={() => handleCopyCode(nextReservation.confirmationNumber!)}
                className="flex items-center gap-1 text-xs font-mono font-bold bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"
              >
                <Lock className="w-3 h-3" />
                <span>{nextReservation.confirmationNumber}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-stone-400" />}
              </button>
            )}
          </div>

          <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {nextReservation.provider}
          </div>

          {nextReservation.flightDetails && (
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-stone-700 dark:text-stone-300">
              {nextReservation.flightDetails.flightNumber && (
                <div>Flight: <strong>{nextReservation.flightDetails.flightNumber}</strong></div>
              )}
              {nextReservation.flightDetails.seat && (
                <div>Seat: <strong>{nextReservation.flightDetails.seat}</strong></div>
              )}
              {nextReservation.flightDetails.gate && (
                <div>Gate: <strong>{nextReservation.flightDetails.gate}</strong></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Today's Schedule Timeline */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Today's Stops & Activities
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            {todayItinerary.filter((i) => i.isCompleted).length}/{todayItinerary.length} completed
          </span>
        </div>

        <div className="space-y-2">
          {todayItinerary.map((item) => {
            const place = item.placeId ? placeMap.get(item.placeId) : null;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleActivity(item)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  item.isCompleted
                    ? 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800/60 opacity-60'
                    : 'bg-stone-50/70 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-stone-400 shrink-0" />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      {item.startTime && (
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.startTime}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold ${
                          item.isCompleted ? 'line-through text-stone-500' : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    {place && (
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {place.name} {place.address ? `• ${place.address}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {todayItinerary.length === 0 && (
            <div className="text-center py-6 text-xs text-stone-400">
              No specific activities scheduled for today. Enjoy your day!
            </div>
          )}
        </div>
      </div>

      {/* Quick Field Memo / Log Entry */}
      <form
        onSubmit={handleSaveQuickNote}
        className="p-3 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center gap-2"
      >
        <input
          type="text"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Log quick on-the-go travel note..."
          className="flex-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400"
        />
        <button
          type="submit"
          className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
