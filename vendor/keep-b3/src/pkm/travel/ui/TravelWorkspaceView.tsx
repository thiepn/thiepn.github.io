/**
 * Phase P55: Travel Workspace View
 * Primary travel and place-management interface integrating Trips, Places, Itineraries,
 * Reservations, Packing Checklists, Offline Readiness Packets, and Live Travel Mode.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Place, Reservation, ItineraryEntry } from '../travelTypes';
import { travelService } from '../travelService';
import { TripsOverviewTab } from './TripsOverviewTab';
import { PlacesSpatialTab } from './PlacesSpatialTab';
import { ItineraryPlannerTab } from './ItineraryPlannerTab';
import { ReservationsTab } from './ReservationsTab';
import { PackingChecklistTab } from './PackingChecklistTab';
import { OfflineTripPacketTab } from './OfflineTripPacketTab';
import { MobileTravelModeTab } from './MobileTravelModeTab';

import { TripModal } from './TripModal';
import { PlaceModal } from './PlaceModal';
import { ReservationModal } from './ReservationModal';
import { ItineraryModal } from './ItineraryModal';
import { PackingTemplateModal } from './PackingTemplateModal';
import { AITripPlannerModal } from './AITripPlannerModal';

import {
  Globe,
  MapPin,
  Calendar,
  Ticket,
  CheckSquare,
  ShieldCheck,
  Navigation,
  Plus,
} from 'lucide-react';

export type TravelSubTab =
  | 'trips'
  | 'places'
  | 'itinerary'
  | 'reservations'
  | 'packing'
  | 'offline'
  | 'travel_mode';

interface TravelWorkspaceViewProps {
  initialTripId?: string;
  initialTab?: TravelSubTab;
  onOpenNote?: (noteId: string) => void;
}

export const TravelWorkspaceView: React.FC<TravelWorkspaceViewProps> = ({
  initialTripId,
  initialTab = 'trips',
  onOpenNote,
}) => {
  const [activeTab, setActiveTab] = useState<TravelSubTab>(initialTab);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialTripId || null);

  // Core entities state
  const [trips, setTrips] = useState<Trip[]>(() => travelService.getTrips());
  const [places, setPlaces] = useState<Place[]>(() => travelService.getPlaces());
  const [version, setVersion] = useState(0);

  const refreshData = useCallback(() => {
    setTrips(travelService.getTrips());
    setPlaces(travelService.getPlaces());
    setVersion((v) => v + 1);
  }, []);

  // Ensure an active trip is selected if none chosen
  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      const active = trips.find((t) => t.status === 'in_progress') || trips[0];
      setSelectedTripId(active.id);
    }
  }, [trips, selectedTripId]);

  // Modal States
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const [isItineraryModalOpen, setIsItineraryModalOpen] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<{ date?: string; entry?: ItineraryEntry } | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);

  // Active Trip Object
  const currentTrip = trips.find((t) => t.id === selectedTripId) || trips[0] || null;

  // Modal handlers
  const handleOpenTripModal = (trip?: Trip) => {
    setEditingTrip(trip || null);
    setIsTripModalOpen(true);
  };

  const handleOpenPlaceModal = (place?: Place) => {
    setEditingPlace(place || null);
    setIsPlaceModalOpen(true);
  };

  const handleOpenReservationModal = (tripId: string, res?: Reservation) => {
    setSelectedTripId(tripId);
    setEditingReservation(res || null);
    setIsReservationModalOpen(true);
  };

  const handleOpenItineraryModal = (tripId: string, date?: string, entry?: ItineraryEntry) => {
    setSelectedTripId(tripId);
    setEditingItinerary({ date, entry });
    setIsItineraryModalOpen(true);
  };

  const handleOpenTravelMode = (tripId: string) => {
    setSelectedTripId(tripId);
    setActiveTab('travel_mode');
  };

  // Export handlers
  const handleExportMarkdown = (tripId: string) => {
    const md = travelService.exportTripMarkdown(tripId);
    if (!md) return;
    const targetTrip = trips.find((t) => t.id === tripId);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetTrip?.title.toLowerCase().replace(/\s+/g, '-') || 'trip'}-itinerary.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportICS = (tripId: string) => {
    const ics = travelService.exportTripICS(tripId);
    if (!ics) return;
    const targetTrip = trips.find((t) => t.id === tripId);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetTrip?.title.toLowerCase().replace(/\s+/g, '-') || 'trip'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAdoptAIProposals = (
    entries: Array<{ date: string; title: string; type: ItineraryEntry['type']; placeId?: string; notes: string }>
  ) => {
    if (!currentTrip) return;
    entries.forEach((entry) => {
      travelService.createItineraryEntry({
        tripId: currentTrip.id,
        date: entry.date,
        title: entry.title,
        type: entry.type,
        placeId: entry.placeId,
        notes: entry.notes,
      });
    });
    refreshData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50 dark:bg-stone-950 overflow-hidden select-none">
      {/* Workspace Header / Subtab Bar */}
      <header className="px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-2 pr-2 border-r border-stone-200 dark:border-stone-800">
            <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 hidden sm:inline">
              Travel & Places
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {[
              { id: 'trips', label: 'Trips', icon: Globe },
              { id: 'places', label: 'Places & Coords', icon: MapPin },
              { id: 'itinerary', label: 'Itinerary', icon: Calendar },
              { id: 'reservations', label: 'Bookings', icon: Ticket },
              { id: 'packing', label: 'Packing', icon: CheckSquare },
              { id: 'offline', label: 'Offline Packet', icon: ShieldCheck },
              { id: 'travel_mode', label: 'Travel Mode', icon: Navigation },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TravelSubTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenTripModal()}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Trip</span>
          </button>
        </div>
      </header>

      {/* Main Subtab Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'trips' && (
          <TripsOverviewTab
            trips={trips}
            places={places}
            activeTripId={selectedTripId}
            onSelectTrip={(id) => {
              setSelectedTripId(id);
              setActiveTab('itinerary');
            }}
            onOpenTripModal={handleOpenTripModal}
            onOpenTravelMode={handleOpenTravelMode}
            onRefresh={refreshData}
            onExportMarkdown={handleExportMarkdown}
            onExportICS={handleExportICS}
          />
        )}

        {activeTab === 'places' && (
          <PlacesSpatialTab
            places={places}
            onOpenPlaceModal={handleOpenPlaceModal}
            onRefresh={refreshData}
            onOpenNote={onOpenNote}
          />
        )}

        {activeTab === 'itinerary' && (
          <ItineraryPlannerTab
            trips={trips}
            places={places}
            selectedTripId={selectedTripId || undefined}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onOpenItineraryModal={handleOpenItineraryModal}
            onOpenAIPlanner={(trip) => {
              setSelectedTripId(trip.id);
              setIsAIPlannerOpen(true);
            }}
            onExportMarkdown={handleExportMarkdown}
            onExportICS={handleExportICS}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'reservations' && (
          <ReservationsTab
            trips={trips}
            places={places}
            selectedTripId={selectedTripId || undefined}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onOpenReservationModal={handleOpenReservationModal}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'packing' && (
          <PackingChecklistTab
            trips={trips}
            selectedTripId={selectedTripId || undefined}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onOpenTemplateModal={(id) => {
              setSelectedTripId(id);
              setIsTemplateModalOpen(true);
            }}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'offline' && (
          <OfflineTripPacketTab
            trips={trips}
            selectedTripId={selectedTripId || undefined}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'travel_mode' && currentTrip && (
          <MobileTravelModeTab
            trip={currentTrip}
            places={places}
            onBackToOverview={() => setActiveTab('trips')}
            onRefresh={refreshData}
          />
        )}
      </main>

      {/* Modals */}
      <TripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSave={() => refreshData()}
        initialTrip={editingTrip}
        places={places}
      />

      <PlaceModal
        isOpen={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        onSave={() => refreshData()}
        initialPlace={editingPlace}
        existingPlaces={places}
      />

      {currentTrip && (
        <ReservationModal
          isOpen={isReservationModalOpen}
          onClose={() => setIsReservationModalOpen(false)}
          onSave={() => refreshData()}
          tripId={currentTrip.id}
          initialReservation={editingReservation}
          places={places}
        />
      )}

      {currentTrip && (
        <ItineraryModal
          isOpen={isItineraryModalOpen}
          onClose={() => setIsItineraryModalOpen(false)}
          onSave={() => refreshData()}
          tripId={currentTrip.id}
          defaultDate={editingItinerary?.date}
          initialEntry={editingItinerary?.entry}
          places={places}
        />
      )}

      <PackingTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        tripId={currentTrip?.id}
        onApplied={() => refreshData()}
      />

      {currentTrip && (
        <AITripPlannerModal
          isOpen={isAIPlannerOpen}
          onClose={() => setIsAIPlannerOpen(false)}
          trip={currentTrip}
          places={places}
          onApplyProposals={handleAdoptAIProposals}
        />
      )}
    </div>
  );
};
