/**
 * Phase P55: Reservation Modal
 * Create or edit transport, lodging, and activity reservations with dual timezones and details.
 */

import React, { useState, useEffect } from 'react';
import { Reservation, ReservationType, ReservationStatus, Place } from '../travelTypes';
import { travelService } from '../travelService';
import { X, Plane, Building2, Train, Car, Ticket, Utensils, Calendar, Clock, Lock, DollarSign, Globe, MapPin } from 'lucide-react';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reservation: Reservation) => void;
  tripId: string;
  initialReservation?: Reservation | null;
  places?: Place[];
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tripId,
  initialReservation,
  places = [],
}) => {
  const [type, setType] = useState<ReservationType>('flight');
  const [provider, setProvider] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [status, setStatus] = useState<ReservationStatus>('booked');

  // Departure / Check-in
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [depTz, setDepTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Arrival / Check-out
  const [arrDate, setArrDate] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [arrTz, setArrTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Places
  const [originPlaceId, setOriginPlaceId] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState('');
  const [placeId, setPlaceId] = useState('');

  // Cost & URLs
  const [amount, setAmount] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [note, setNote] = useState('');

  // Specialized details
  const [flightNumber, setFlightNumber] = useState('');
  const [seat, setSeat] = useState('');
  const [terminal, setTerminal] = useState('');
  const [gate, setGate] = useState('');

  const [wifiPassword, setWifiPassword] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [roomType, setRoomType] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReservation) {
      setType(initialReservation.type);
      setProvider(initialReservation.provider || '');
      setConfirmationNumber(initialReservation.confirmationNumber || '');
      setStatus(initialReservation.status);

      if (initialReservation.departureTime) {
        const parts = initialReservation.departureTime.dateTime.split('T');
        setDepDate(parts[0] || '');
        setDepTime(parts[1] || '');
        setDepTz(initialReservation.departureTime.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      } else {
        setDepDate('');
        setDepTime('');
        setDepTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }

      if (initialReservation.arrivalTime) {
        const parts = initialReservation.arrivalTime.dateTime.split('T');
        setArrDate(parts[0] || '');
        setArrTime(parts[1] || '');
        setArrTz(initialReservation.arrivalTime.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      } else {
        setArrDate('');
        setArrTime('');
        setArrTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }

      setOriginPlaceId(initialReservation.originPlaceId || '');
      setDestinationPlaceId(initialReservation.destinationPlaceId || '');
      setPlaceId(initialReservation.placeId || '');
      setAmount(initialReservation.amount ? String(initialReservation.amount.amount) : '');
      setBookingUrl(initialReservation.bookingUrl || '');
      setNote(initialReservation.note || '');

      // Specifics
      setFlightNumber(initialReservation.flightDetails?.flightNumber || '');
      setSeat(initialReservation.flightDetails?.seat || '');
      setTerminal(initialReservation.flightDetails?.terminalDeparture || '');
      setGate(initialReservation.flightDetails?.gate || '');

      setWifiPassword(initialReservation.lodgingDetails?.wifiPassword || '');
      setCheckInTime(initialReservation.lodgingDetails?.checkInTime || '');
      setRoomType(initialReservation.lodgingDetails?.roomType || '');
    } else {
      setType('flight');
      setProvider('');
      setConfirmationNumber('');
      setStatus('booked');
      setDepDate('');
      setDepTime('');
      setDepTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setArrDate('');
      setArrTime('');
      setArrTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setOriginPlaceId('');
      setDestinationPlaceId('');
      setPlaceId('');
      setAmount('');
      setBookingUrl('');
      setNote('');
      setFlightNumber('');
      setSeat('');
      setTerminal('');
      setGate('');
      setWifiPassword('');
      setCheckInTime('');
      setRoomType('');
    }
    setError(null);
  }, [initialReservation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const departureTime =
      depDate && depTime
        ? { dateTime: `${depDate}T${depTime}`, timezone: depTz }
        : depDate
        ? { dateTime: depDate, timezone: depTz }
        : undefined;

    const arrivalTime =
      arrDate && arrTime
        ? { dateTime: `${arrDate}T${arrTime}`, timezone: arrTz }
        : arrDate
        ? { dateTime: arrDate, timezone: arrTz }
        : undefined;

    const amtNum = amount ? parseFloat(amount) : undefined;
    const amountPayload =
      amtNum !== undefined && !isNaN(amtNum) ? { amount: amtNum, currency: 'USD' } : undefined;

    const flightDetails =
      type === 'flight' && (flightNumber || seat || terminal || gate)
        ? {
            flightNumber: flightNumber.trim() || undefined,
            seat: seat.trim() || undefined,
            terminalDeparture: terminal.trim() || undefined,
            gate: gate.trim() || undefined,
          }
        : undefined;

    const lodgingDetails =
      type === 'accommodation' && (roomType || checkInTime || wifiPassword)
        ? {
            roomType: roomType.trim() || undefined,
            checkInTime: checkInTime.trim() || undefined,
            wifiPassword: wifiPassword.trim() || undefined,
          }
        : undefined;

    if (initialReservation) {
      const updated = travelService.updateReservation(initialReservation.id, {
        type,
        provider: provider.trim() || undefined,
        confirmationNumber: confirmationNumber.trim() || undefined,
        status,
        departureTime,
        arrivalTime,
        originPlaceId: originPlaceId || undefined,
        destinationPlaceId: destinationPlaceId || undefined,
        placeId: placeId || undefined,
        amount: amountPayload,
        bookingUrl: bookingUrl.trim() || undefined,
        note: note.trim() || undefined,
        flightDetails,
        lodgingDetails,
      });
      if (updated) onSave(updated);
    } else {
      const created = travelService.createReservation({
        tripId,
        type,
        provider: provider.trim() || undefined,
        confirmationNumber: confirmationNumber.trim() || undefined,
        status,
        departureTime,
        arrivalTime,
        originPlaceId: originPlaceId || undefined,
        destinationPlaceId: destinationPlaceId || undefined,
        placeId: placeId || undefined,
        amount: amountPayload,
        bookingUrl: bookingUrl.trim() || undefined,
        note: note.trim() || undefined,
        flightDetails,
        lodgingDetails,
      });
      onSave(created);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {initialReservation ? 'Edit Reservation' : 'Add Reservation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReservationType)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="flight">Flight</option>
                <option value="accommodation">Accommodation / Hotel</option>
                <option value="train">Train / Rail</option>
                <option value="bus">Bus / Coach</option>
                <option value="rental_car">Rental Car</option>
                <option value="ferry">Ferry / Boat</option>
                <option value="activity">Activity / Tour</option>
                <option value="restaurant">Dining / Restaurant</option>
                <option value="other">Other Booking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="booked">Booked (Confirmed)</option>
                <option value="waitlisted">Waitlisted / Pending</option>
                <option value="option">Draft Option</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Provider & Confirmation Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Provider / Company
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Japan Airlines / Hotel Granvia"
                className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Confirmation / PNR Code (Sensitive)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  placeholder="e.g. 7XQ9L2"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Departure / Check-in */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              {type === 'accommodation' ? 'Check-In' : 'Departure / Start'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="date"
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
              <input
                type="time"
                value={depTime}
                onChange={(e) => setDepTime(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
              <input
                type="text"
                value={depTz}
                onChange={(e) => setDepTz(e.target.value)}
                placeholder="Timezone (e.g. UTC)"
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Arrival / Check-out */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              {type === 'accommodation' ? 'Check-Out' : 'Arrival / End'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="date"
                value={arrDate}
                onChange={(e) => setArrDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
              <input
                type="time"
                value={arrTime}
                onChange={(e) => setArrTime(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
              <input
                type="text"
                value={arrTz}
                onChange={(e) => setArrTz(e.target.value)}
                placeholder="Timezone (e.g. Asia/Tokyo)"
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Specialized Type Details */}
          {type === 'flight' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Flight #</label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="JL 005"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Seat</label>
                <input
                  type="text"
                  value={seat}
                  onChange={(e) => setSeat(e.target.value)}
                  placeholder="24A"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Terminal</label>
                <input
                  type="text"
                  value={terminal}
                  onChange={(e) => setTerminal(e.target.value)}
                  placeholder="T3"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Gate</label>
                <input
                  type="text"
                  value={gate}
                  onChange={(e) => setGate(e.target.value)}
                  placeholder="112"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          {type === 'accommodation' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Room Type</label>
                <input
                  type="text"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  placeholder="Deluxe King / Twin"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Check-in Time</label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="15:00"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Wi-Fi Password</label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="hotel_guest_2026"
                  className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Linked Place */}
          {places.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Linked Place Record
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <select
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">None (Standalone)</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Amount & Direct URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Cost Amount
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 420.00"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Direct Booking URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Notes / Special Instructions
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Includes breakfast, baggage allowance 2x23kg, late check-in requested..."
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl shadow-sm transition-colors"
            >
              {initialReservation ? 'Save Changes' : 'Save Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
