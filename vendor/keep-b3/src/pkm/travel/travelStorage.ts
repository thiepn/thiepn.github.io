/**
 * Phase P55: Travel & Places Local Storage Layer
 * Manages local persistence for trips, places, reservations, itineraries, packing, and documents.
 */

import {
  Trip,
  Place,
  TripPlace,
  ItineraryEntry,
  Reservation,
  PackingTemplate,
  TripPackingItem,
  TravelDocumentLink,
  OfflineTripPacket,
} from './travelTypes';

const STORAGE_KEYS = {
  TRIPS: 'pkm_travel_trips',
  PLACES: 'pkm_travel_places',
  TRIP_PLACES: 'pkm_travel_trip_places',
  ITINERARY: 'pkm_travel_itinerary',
  RESERVATIONS: 'pkm_travel_reservations',
  PACKING_TEMPLATES: 'pkm_travel_packing_templates',
  TRIP_PACKING: 'pkm_travel_trip_packing',
  DOCUMENTS: 'pkm_travel_documents',
  OFFLINE_PACKETS: 'pkm_travel_offline_packets',
  ACTIVE_TRIP_ID: 'pkm_travel_active_trip_id',
};

// Default starter packing templates
export const DEFAULT_PACKING_TEMPLATES: PackingTemplate[] = [
  {
    id: 'tmpl-weekend',
    name: 'Weekend Getaway',
    description: 'Lightweight essentials for a 2-3 day trip',
    items: [
      { id: 'wi-1', name: 'T-Shirts (2-3)', category: 'Clothes', defaultQuantity: 3, defaultIncluded: true },
      { id: 'wi-2', name: 'Pants / Jeans', category: 'Clothes', defaultQuantity: 1, defaultIncluded: true },
      { id: 'wi-3', name: 'Underwear & Socks', category: 'Clothes', defaultQuantity: 3, defaultIncluded: true },
      { id: 'wi-4', name: 'Toothbrush & Toothpaste', category: 'Toiletries', defaultQuantity: 1, defaultIncluded: true },
      { id: 'wi-5', name: 'Phone Charger', category: 'Electronics', defaultQuantity: 1, defaultIncluded: true },
      { id: 'wi-6', name: 'Power Bank', category: 'Electronics', defaultQuantity: 1, defaultIncluded: true },
      { id: 'wi-7', name: 'Wallet & ID', category: 'Documents', defaultQuantity: 1, defaultIncluded: true },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-international',
    name: 'International Travel',
    description: 'Comprehensive checklist for overseas flights and multi-week stays',
    items: [
      { id: 'ii-1', name: 'Passport & Visa Documents', category: 'Documents', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-2', name: 'Universal Travel Power Adapter', category: 'Electronics', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-3', name: 'Noise-Cancelling Headphones', category: 'Electronics', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-4', name: 'Printed Travel Insurance / Tickets', category: 'Documents', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-5', name: 'Personal Medication / First Aid', category: 'Medication', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-6', name: 'T-Shirts & Tops (5-7)', category: 'Clothes', defaultQuantity: 7, defaultIncluded: true },
      { id: 'ii-7', name: 'Pants / Shorts / Skirts', category: 'Clothes', defaultQuantity: 3, defaultIncluded: true },
      { id: 'ii-8', name: 'Light Jacket / Sweater', category: 'Clothes', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-9', name: 'TSA-Compliant Liquids Pouch', category: 'Toiletries', defaultQuantity: 1, defaultIncluded: true },
      { id: 'ii-10', name: 'Sleep Mask & Earplugs', category: 'Other', defaultQuantity: 1, defaultIncluded: true },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-business',
    name: 'Business Trip',
    description: 'Professional attire, laptop accessories, and meeting essentials',
    items: [
      { id: 'bi-1', name: 'Laptop & Charger', category: 'Electronics', defaultQuantity: 1, defaultIncluded: true },
      { id: 'bi-2', name: 'Dress Shirts / Blouses', category: 'Clothes', defaultQuantity: 3, defaultIncluded: true },
      { id: 'bi-3', name: 'Suit / Blazer / Trousers', category: 'Clothes', defaultQuantity: 1, defaultIncluded: true },
      { id: 'bi-4', name: 'Dress Shoes', category: 'Clothes', defaultQuantity: 1, defaultIncluded: true },
      { id: 'bi-5', name: 'Business Cards', category: 'Documents', defaultQuantity: 1, defaultIncluded: true },
      { id: 'bi-6', name: 'Notebook & Pen', category: 'Documents', defaultQuantity: 1, defaultIncluded: true },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

class TravelStorage {
  // Trips
  getTrips(): Trip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveTrips(trips: Trip[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    } catch (e) {
      console.error('Failed to save trips to local storage', e);
    }
  }

  // Places
  getPlaces(): Place[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLACES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  savePlaces(places: Place[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLACES, JSON.stringify(places));
    } catch (e) {
      console.error('Failed to save places to local storage', e);
    }
  }

  // Trip-Place relations
  getTripPlaces(): TripPlace[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIP_PLACES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveTripPlaces(relations: TripPlace[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIP_PLACES, JSON.stringify(relations));
    } catch (e) {
      console.error('Failed to save trip places to local storage', e);
    }
  }

  // Itinerary Entries
  getItineraryEntries(): ItineraryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ITINERARY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveItineraryEntries(entries: ItineraryEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ITINERARY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save itinerary entries to local storage', e);
    }
  }

  // Reservations
  getReservations(): Reservation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveReservations(reservations: Reservation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    } catch (e) {
      console.error('Failed to save reservations to local storage', e);
    }
  }

  // Packing Templates
  getPackingTemplates(): PackingTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PACKING_TEMPLATES);
      return raw ? JSON.parse(raw) : DEFAULT_PACKING_TEMPLATES;
    } catch {
      return DEFAULT_PACKING_TEMPLATES;
    }
  }

  savePackingTemplates(templates: PackingTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PACKING_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save packing templates to local storage', e);
    }
  }

  // Trip Packing Items
  getTripPackingItems(): TripPackingItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIP_PACKING);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveTripPackingItems(items: TripPackingItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIP_PACKING, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save trip packing items to local storage', e);
    }
  }

  // Travel Documents
  getTravelDocuments(): TravelDocumentLink[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveTravelDocuments(docs: TravelDocumentLink[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    } catch (e) {
      console.error('Failed to save travel documents to local storage', e);
    }
  }

  // Offline Packets
  getOfflinePackets(): Record<string, OfflineTripPacket> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_PACKETS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveOfflinePackets(packets: Record<string, OfflineTripPacket>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_PACKETS, JSON.stringify(packets));
    } catch (e) {
      console.error('Failed to save offline packets to local storage', e);
    }
  }

  // Active Trip ID
  getActiveTripId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  }

  setActiveTripId(tripId: string | null): void {
    if (tripId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, tripId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
    }
  }

  // Vault Lock: Clear sensitive cached state
  clearTransientDataOnLock(): void {
    // In strict lock mode, clear active trip selection
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  }
}

export const travelStorage = new TravelStorage();
