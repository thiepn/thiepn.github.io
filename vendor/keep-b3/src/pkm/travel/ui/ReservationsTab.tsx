/**
 * Phase P55: Reservations & Transport Tab
 * Displays flight, hotel, train, and car bookings with dual timezones and masked confirmation codes.
 */

import React, { useState } from 'react';
import { Trip, Reservation, ReservationType, Place } from '../travelTypes';
import { travelService } from '../travelService';
import { formatDualTimeDisplay } from '../travelCalculations';
import {
  Plane,
  Building2,
  Train,
  Car,
  Ticket,
  Utensils,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
} from 'lucide-react';

interface ReservationsTabProps {
  trips: Trip[];
  places: Place[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  onOpenReservationModal: (tripId: string, res?: Reservation) => void;
  onRefresh: () => void;
}

export const ReservationsTab: React.FC<ReservationsTabProps> = ({
  trips,
  places,
  selectedTripId,
  onSelectTrip,
  onOpenReservationModal,
  onRefresh,
}) => {
  const currentTripId = selectedTripId || trips[0]?.id || '';
  const currentTrip = trips.find((t) => t.id === currentTripId);

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));

  if (!currentTrip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Ticket className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          No Trip Selected
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Select a trip to view and manage flight tickets, hotels, and transport bookings.
        </p>
      </div>
    );
  }

  const allReservations = travelService.getReservations(currentTrip.id);
  const filtered = allReservations.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  const toggleReveal = (id: string) => {
    setRevealedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type: ReservationType) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4 text-blue-500" />;
      case 'accommodation':
        return <Building2 className="w-4 h-4 text-teal-500" />;
      case 'train':
      case 'bus':
        return <Train className="w-4 h-4 text-indigo-500" />;
      case 'rental_vehicle':
        return <Car className="w-4 h-4 text-amber-500" />;
      case 'restaurant':
        return <Utensils className="w-4 h-4 text-orange-500" />;
      default:
        return <Ticket className="w-4 h-4 text-purple-500" />;
    }
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
            onChange={(e) => onSelectTrip(e.target.value)}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Add Reservation */}
        <button
          onClick={() => onOpenReservationModal(currentTrip.id)}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Reservation</span>
        </button>
      </div>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Bookings' },
          { id: 'flight', label: 'Flights' },
          { id: 'accommodation', label: 'Lodging' },
          { id: 'train', label: 'Trains & Rail' },
          { id: 'rental_car', label: 'Cars' },
          { id: 'activity', label: 'Tours & Activities' },
          { id: 'restaurant', label: 'Dining' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTypeFilter(item.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              typeFilter === item.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Reservations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((res) => {
          const isRevealed = revealedCodes[res.id];
          const dualTimes = formatDualTimeDisplay(res.departureTime, res.arrivalTime);
          const linkedPlace = res.placeId ? placeMap.get(res.placeId) : null;

          return (
            <div
              key={res.id}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-sm transition-all space-y-4"
            >
              <div>
                {/* Header: Icon, Provider, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800">
                      {getTypeIcon(res.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {res.provider || 'Unspecified Provider'}
                      </h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        {res.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      res.status === 'booked'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : res.status === 'cancelled'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>

                {/* Sensitive Confirmation Code Bar */}
                {res.confirmationNumber && (
                  <div className="mt-3 p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-stone-500">Ref / PNR:</span>
                      <span className="text-xs font-mono font-bold tracking-wider text-stone-900 dark:text-stone-100">
                        {isRevealed ? res.confirmationNumber : '••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleReveal(res.id)}
                        title={isRevealed ? 'Mask Code' : 'Reveal Code'}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyCode(res.confirmationNumber!, res.id)}
                        title="Copy confirmation code"
                        className="p-1 text-stone-400 hover:text-stone-600 rounded"
                      >
                        {copiedId === res.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Timings (Dual Timezone) */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {res.departureTime && (
                    <div className="p-2 bg-stone-50/50 dark:bg-stone-800/30 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                        {res.type === 'accommodation' ? 'Check-In' : 'Departure'}
                      </span>
                      <span className="font-mono text-stone-800 dark:text-stone-200">
                        {dualTimes.depFormatted}
                      </span>
                    </div>
                  )}

                  {res.arrivalTime && (
                    <div className="p-2 bg-stone-50/50 dark:bg-stone-800/30 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                        {res.type === 'accommodation' ? 'Check-Out' : 'Arrival'}
                      </span>
                      <span className="font-mono text-stone-800 dark:text-stone-200">
                        {dualTimes.arrFormatted}
                      </span>
                    </div>
                  )}
                </div>

                {/* Specifics: Flight seat / Hotel address */}
                {res.flightDetails && (
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-stone-600 dark:text-stone-400">
                    {res.flightDetails.flightNumber && <span>Flight: <strong>{res.flightDetails.flightNumber}</strong></span>}
                    {res.flightDetails.seat && <span>Seat: <strong>{res.flightDetails.seat}</strong></span>}
                    {res.flightDetails.terminalDeparture && <span>Term: <strong>{res.flightDetails.terminalDeparture}</strong></span>}
                  </div>
                )}

                {res.lodgingDetails && (
                  <div className="mt-2 text-xs text-stone-600 dark:text-stone-400 space-y-0.5">
                    {res.lodgingDetails.roomType && <div>Room: {res.lodgingDetails.roomType}</div>}
                    {res.lodgingDetails.checkInTime && <div>Check-in: {res.lodgingDetails.checkInTime}</div>}
                    {res.lodgingDetails.wifiPassword && <div>Wi-Fi: {res.lodgingDetails.wifiPassword}</div>}
                  </div>
                )}

                {linkedPlace && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{linkedPlace.name}{linkedPlace.address ? ` (${linkedPlace.address})` : ''}</span>
                  </div>
                )}

                {res.note && (
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-2 rounded-xl">
                    {res.note}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div>
                  {res.amount?.amount !== undefined && (
                    <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">
                      ${res.amount.amount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {res.bookingUrl && (
                    <a
                      href={res.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-stone-400 hover:text-amber-500 rounded"
                      title="Open booking webpage"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onOpenReservationModal(currentTrip.id, res)}
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this reservation?')) {
                        travelService.deleteReservation(res.id);
                        onRefresh();
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
            <Ticket className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              No reservations logged
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Add flights, trains, hotel check-ins, rental cars, and tour tickets.
            </p>
            <button
              onClick={() => onOpenReservationModal(currentTrip.id)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Add Reservation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
