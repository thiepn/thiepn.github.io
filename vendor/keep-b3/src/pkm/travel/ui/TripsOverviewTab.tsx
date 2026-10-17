/**
 * Phase P55: Trips Overview Tab
 * Displays all trips, active trip banner, status filters, and trip management actions.
 */

import React, { useState } from 'react';
import { Trip, TripStatus, Place } from '../travelTypes';
import { travelService } from '../travelService';
import { calculatePackingMetrics } from '../travelCalculations';
import {
  Globe,
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Edit2,
  FileDown,
  Navigation,
  Sparkles,
  Share2,
} from 'lucide-react';

interface TripsOverviewTabProps {
  trips: Trip[];
  places: Place[];
  activeTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onOpenTripModal: (trip?: Trip) => void;
  onOpenTravelMode: (tripId: string) => void;
  onRefresh: () => void;
  onExportMarkdown: (tripId: string) => void;
  onExportICS: (tripId: string) => void;
}

export const TripsOverviewTab: React.FC<TripsOverviewTabProps> = ({
  trips,
  places,
  activeTripId,
  onSelectTrip,
  onOpenTripModal,
  onOpenTravelMode,
  onRefresh,
  onExportMarkdown,
  onExportICS,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));

  const filteredTrips = trips.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchTags) return false;
    }
    return true;
  });

  const activeTrip = trips.find((t) => t.id === activeTripId);

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'booked':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Booked
          </span>
        );
      case 'planning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Planning
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Active Trip Banner */}
      {activeTrip && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm mt-0.5">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Active Travel Focus
                </span>
                {getStatusBadge(activeTrip.status)}
              </div>
              <h3 className="text-base md:text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {activeTrip.title}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {activeTrip.startDate || 'TBD'} → {activeTrip.endDate || 'TBD'} • {activeTrip.timezone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenTravelMode(activeTrip.id)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span>Launch Travel Mode</span>
            </button>
            <button
              onClick={() => onSelectTrip(activeTrip.id)}
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Trips' },
            { id: 'active', label: 'Active' },
            { id: 'planning', label: 'Planning' },
            { id: 'booked', label: 'Booked' },
            { id: 'completed', label: 'Past' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === item.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search & Add Trip */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trips or tags..."
            className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            onClick={() => onOpenTripModal()}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </button>
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrips.map((trip) => {
          const packingItems = travelService.getTripPackingItems(trip.id);
          const packingMetrics = calculatePackingMetrics(packingItems);
          const destinationPlaces = trip.destinationPlaceIds
            .map((id) => placeMap.get(id))
            .filter(Boolean) as Place[];

          return (
            <div
              key={trip.id}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all group"
            >
              <div>
                {/* Header: Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    onClick={() => onSelectTrip(trip.id)}
                    className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 cursor-pointer line-clamp-1"
                  >
                    {trip.title}
                  </h4>
                  {getStatusBadge(trip.status)}
                </div>

                {/* Dates & Timezone */}
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {trip.startDate || 'TBD'} → {trip.endDate || 'TBD'}
                  </span>
                </div>

                {/* Destinations Chips */}
                {destinationPlaces.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {destinationPlaces.slice(0, 3).map((place) => (
                      <span
                        key={place.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                      >
                        <MapPin className="w-3 h-3 text-amber-500" />
                        {place.name}
                      </span>
                    ))}
                    {destinationPlaces.length > 3 && (
                      <span className="text-[10px] text-stone-400 self-center">
                        +{destinationPlaces.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Summary / Notes Snippet */}
                {trip.summaryNotes && (
                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mb-3 bg-stone-50 dark:bg-stone-800/50 p-2 rounded-xl border border-stone-100 dark:border-stone-800">
                    {trip.summaryNotes}
                  </p>
                )}

                {/* Packing Progress & Budget */}
                <div className="space-y-1.5 mb-4">
                  {packingMetrics.total > 0 && (
                    <div>
                      <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                        <span>Packing Progress</span>
                        <span className="font-mono">{packingMetrics.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${packingMetrics.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {trip.budgetPlanned !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-500">
                      <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                      <span>Target Budget: </span>
                      <span className="font-semibold text-stone-700 dark:text-stone-300 font-mono">
                        ${trip.budgetPlanned.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectTrip(trip.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                  >
                    Open Hub
                  </button>
                  <button
                    onClick={() => onOpenTravelMode(trip.id)}
                    title="Open on-the-go travel mode"
                    className="p-1 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onExportMarkdown(trip.id)}
                    title="Export Markdown Note"
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onExportICS(trip.id)}
                    title="Export iCalendar (.ics)"
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenTripModal(trip)}
                    title="Edit Trip"
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete trip "${trip.title}" and its itinerary?`)) {
                        travelService.deleteTrip(trip.id);
                        onRefresh();
                      }
                    }}
                    title="Delete Trip"
                    className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTrips.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
            <Globe className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              No trips found
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Create your first offline trip to organize destinations, day-by-day itineraries, reservations, and packing lists.
            </p>
            <button
              onClick={() => onOpenTripModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Create Trip
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
