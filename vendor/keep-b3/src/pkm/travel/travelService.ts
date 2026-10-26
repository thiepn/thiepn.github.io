/**
 * Phase P55: Travel & Places Service Layer
 * Orchestrates trips, places, itineraries, reservations, packing, documents, and offline packets.
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
  TravelDiagnosticIssue,
} from './travelTypes';
import { travelStorage, DEFAULT_PACKING_TEMPLATES } from './travelStorage';
import {
  calculateHaversineDistanceKm,
  isValidCoordinate,
  sortItineraryEntries,
  detectItineraryConflicts,
  detectPlaceHierarchyCycle,
  generateDateRange,
  formatDualTimeDisplay,
} from './travelCalculations';

export class TravelService {
  // ==========================================
  // TRIPS
  // ==========================================
  getTrips(filter?: { status?: string; tag?: string; includeArchived?: boolean }): Trip[] {
    let trips = travelStorage.getTrips();
    if (!filter?.includeArchived) {
      trips = trips.filter((t) => !t.isArchived);
    }
    if (filter?.status) {
      trips = trips.filter((t) => t.status === filter.status);
    }
    if (filter?.tag) {
      trips = trips.filter((t) => t.tags.includes(filter.tag!));
    }
    return trips.sort((a, b) => {
      // Sort by start date ascending (upcoming first), then updated at descending
      if (a.startDate && b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      return b.updatedAt - a.updatedAt;
    });
  }

  getTrip(id: string): Trip | null {
    const trips = travelStorage.getTrips();
    return trips.find((t) => t.id === id) || null;
  }

  createTrip(draft: Partial<Trip>): Trip {
    const trips = travelStorage.getTrips();
    const now = Date.now();
    const newTrip: Trip = {
      id: draft.id || `trip-${now}-${Math.random().toString(36).substring(2, 6)}`,
      title: draft.title?.trim() || 'New Trip',
      status: draft.status || 'planning',
      startDate: draft.startDate,
      endDate: draft.endDate,
      timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      homeTimezone: draft.homeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      destinationPlaceIds: draft.destinationPlaceIds || [],
      participantPersonIds: draft.participantPersonIds || [],
      noteId: draft.noteId,
      projectId: draft.projectId,
      financeScopeId: draft.financeScopeId,
      budgetPlanned: draft.budgetPlanned,
      coverImage: draft.coverImage,
      tags: draft.tags || [],
      summaryNotes: draft.summaryNotes,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    travelStorage.saveTrips([newTrip, ...trips]);
    return newTrip;
  }

  updateTrip(id: string, updates: Partial<Trip>): Trip | null {
    const trips = travelStorage.getTrips();
    const idx = trips.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const updated: Trip = {
      ...trips[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    trips[idx] = updated;
    travelStorage.saveTrips(trips);

    // Invalidate offline packet on trip update
    this.markOfflinePacketStale(id);
    return updated;
  }

  deleteTrip(id: string): boolean {
    const trips = travelStorage.getTrips();
    const filtered = trips.filter((t) => t.id !== id);
    if (filtered.length === trips.length) return false;

    travelStorage.saveTrips(filtered);

    // Clean up dependent child relations without cascading to global Places or People
    const itins = travelStorage.getItineraryEntries().filter((e) => e.tripId !== id);
    travelStorage.saveItineraryEntries(itins);

    const res = travelStorage.getReservations().filter((r) => r.tripId !== id);
    travelStorage.saveReservations(res);

    const packing = travelStorage.getTripPackingItems().filter((p) => p.tripId !== id);
    travelStorage.saveTripPackingItems(packing);

    const docs = travelStorage.getTravelDocuments().filter((d) => d.tripId !== id);
    travelStorage.saveTravelDocuments(docs);

    const tplaces = travelStorage.getTripPlaces().filter((tp) => tp.tripId !== id);
    travelStorage.saveTripPlaces(tplaces);

    if (travelStorage.getActiveTripId() === id) {
      travelStorage.setActiveTripId(null);
    }

    return true;
  }

  // ==========================================
  // PLACES
  // ==========================================
  getPlaces(filter?: { type?: string; query?: string; parentId?: string }): Place[] {
    let places = travelStorage.getPlaces().filter((p) => !p.isArchived);

    if (filter?.type) {
      places = places.filter((p) => p.type === filter.type);
    }
    if (filter?.parentId) {
      places = places.filter((p) => p.parentPlaceId === filter.parentId);
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      places = places.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return places.sort((a, b) => a.name.localeCompare(b.name));
  }

  getPlace(id: string): Place | null {
    const places = travelStorage.getPlaces();
    return places.find((p) => p.id === id) || null;
  }

  createPlace(draft: Partial<Place>): Place {
    const places = travelStorage.getPlaces();
    const now = Date.now();

    // Check hierarchy cycle if parentId provided
    if (draft.parentPlaceId && draft.id && detectPlaceHierarchyCycle(places, draft.id, draft.parentPlaceId)) {
      throw new Error('Cyclic place hierarchy detected. A place cannot be its own ancestor.');
    }

    const newPlace: Place = {
      id: draft.id || `place-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: draft.name?.trim() || 'Untitled Place',
      type: draft.type || 'attraction',
      coordinates: isValidCoordinate(draft.coordinates) ? draft.coordinates : undefined,
      address: draft.address?.trim() || undefined,
      timezone: draft.timezone,
      sourceUrl: draft.sourceUrl?.trim() || undefined,
      noteId: draft.noteId,
      parentPlaceId: draft.parentPlaceId || undefined,
      tags: draft.tags || [],
      rating: draft.rating,
      notes: draft.notes,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    travelStorage.savePlaces([...places, newPlace]);
    return newPlace;
  }

  updatePlace(id: string, updates: Partial<Place>): Place | null {
    const places = travelStorage.getPlaces();
    const idx = places.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    if (updates.parentPlaceId && detectPlaceHierarchyCycle(places, id, updates.parentPlaceId)) {
      throw new Error('Cyclic place hierarchy detected. A place cannot be its own ancestor.');
    }

    const updated: Place = {
      ...places[idx],
      ...updates,
      coordinates: isValidCoordinate(updates.coordinates) ? updates.coordinates : places[idx].coordinates,
      updatedAt: Date.now(),
    };

    places[idx] = updated;
    travelStorage.savePlaces(places);
    return updated;
  }

  deletePlace(id: string): boolean {
    const places = travelStorage.getPlaces();
    const filtered = places.filter((p) => p.id !== id);
    if (filtered.length === places.length) return false;
    travelStorage.savePlaces(filtered);

    // Update parent pointers for child places
    const updated = filtered.map((p) => (p.parentPlaceId === id ? { ...p, parentPlaceId: undefined } : p));
    travelStorage.savePlaces(updated);
    return true;
  }

  // ==========================================
  // TRIP PLACES (Relationship & Priority)
  // ==========================================
  getTripPlaces(tripId: string): Array<TripPlace & { place: Place }> {
    const relations = travelStorage.getTripPlaces().filter((tp) => tp.tripId === tripId);
    const places = travelStorage.getPlaces();
    const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));

    const result: Array<TripPlace & { place: Place }> = [];
    for (const rel of relations) {
      const place = placeMap.get(rel.placeId);
      if (place) {
        result.push({ ...rel, place });
      }
    }
    return result;
  }

  addPlaceToTrip(
    tripId: string,
    placeId: string,
    role: TripPlace['role'] = 'visit',
    priority: TripPlace['priority'] = 'want'
  ): void {
    const all = travelStorage.getTripPlaces();
    const existingIdx = all.findIndex((tp) => tp.tripId === tripId && tp.placeId === placeId);
    if (existingIdx >= 0) {
      all[existingIdx] = { ...all[existingIdx], role, priority };
    } else {
      all.push({
        tripId,
        placeId,
        role,
        priority,
        visited: false,
      });
    }
    travelStorage.saveTripPlaces(all);
    this.markOfflinePacketStale(tripId);
  }

  removePlaceFromTrip(tripId: string, placeId: string): void {
    const all = travelStorage.getTripPlaces().filter((tp) => !(tp.tripId === tripId && tp.placeId === placeId));
    travelStorage.saveTripPlaces(all);
    this.markOfflinePacketStale(tripId);
  }

  toggleTripPlaceVisited(tripId: string, placeId: string, visited?: boolean): void {
    const all = travelStorage.getTripPlaces();
    const item = all.find((tp) => tp.tripId === tripId && tp.placeId === placeId);
    if (item) {
      item.visited = typeof visited === 'boolean' ? visited : !item.visited;
      travelStorage.saveTripPlaces(all);
    }
  }

  // ==========================================
  // ITINERARY ENTRIES
  // ==========================================
  getItinerary(tripId: string): ItineraryEntry[] {
    const entries = travelStorage.getItineraryEntries().filter((e) => e.tripId === tripId);
    return sortItineraryEntries(entries);
  }

  createItineraryEntry(draft: Partial<ItineraryEntry>): ItineraryEntry {
    const all = travelStorage.getItineraryEntries();
    const now = Date.now();
    const tripEntries = all.filter((e) => e.tripId === draft.tripId && e.date === draft.date);
    const maxOrder = tripEntries.reduce((max, e) => Math.max(max, e.order), -1);

    const newEntry: ItineraryEntry = {
      id: draft.id || `itin-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: draft.tripId || '',
      date: draft.date || new Date().toISOString().slice(0, 10),
      startTime: draft.startTime,
      endTime: draft.endTime,
      timezone: draft.timezone,
      type: draft.type || 'place',
      placeId: draft.placeId,
      reservationId: draft.reservationId,
      title: draft.title?.trim() || 'Activity',
      notes: draft.notes,
      cost: draft.cost,
      order: draft.order ?? maxOrder + 1,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    travelStorage.saveItineraryEntries([...all, newEntry]);
    this.markOfflinePacketStale(newEntry.tripId);
    return newEntry;
  }

  updateItineraryEntry(id: string, updates: Partial<ItineraryEntry>): ItineraryEntry | null {
    const all = travelStorage.getItineraryEntries();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const updated: ItineraryEntry = {
      ...all[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    all[idx] = updated;
    travelStorage.saveItineraryEntries(all);
    this.markOfflinePacketStale(updated.tripId);
    return updated;
  }

  deleteItineraryEntry(id: string): boolean {
    const all = travelStorage.getItineraryEntries();
    const entry = all.find((e) => e.id === id);
    if (!entry) return false;

    const filtered = all.filter((e) => e.id !== id);
    travelStorage.saveItineraryEntries(filtered);
    this.markOfflinePacketStale(entry.tripId);
    return true;
  }

  reorderItineraryDay(tripId: string, date: string, orderedEntryIds: string[]): void {
    const all = travelStorage.getItineraryEntries();
    const idSet = new Set(orderedEntryIds);

    const updated = all.map((entry) => {
      if (entry.tripId === tripId && entry.date === date && idSet.has(entry.id)) {
        const newOrder = orderedEntryIds.indexOf(entry.id);
        return { ...entry, order: newOrder, updatedAt: Date.now() };
      }
      return entry;
    });

    travelStorage.saveItineraryEntries(updated);
  }

  // ==========================================
  // RESERVATIONS & TRANSPORT
  // ==========================================
  getReservations(tripId?: string): Reservation[] {
    let all = travelStorage.getReservations();
    if (tripId) {
      all = all.filter((r) => r.tripId === tripId);
    }
    return all.sort((a, b) => {
      const depA = a.departureTime?.dateTime || '';
      const depB = b.departureTime?.dateTime || '';
      if (depA && depB) return depA.localeCompare(depB);
      return b.updatedAt - a.updatedAt;
    });
  }

  getReservation(id: string): Reservation | null {
    const all = travelStorage.getReservations();
    return all.find((r) => r.id === id) || null;
  }

  createReservation(draft: Partial<Reservation>): Reservation {
    const all = travelStorage.getReservations();
    const now = Date.now();
    const newRes: Reservation = {
      id: draft.id || `res-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: draft.tripId || '',
      type: draft.type || 'flight',
      provider: draft.provider?.trim(),
      confirmationNumber: draft.confirmationNumber?.trim(),
      status: draft.status || 'booked',
      departureTime: draft.departureTime,
      arrivalTime: draft.arrivalTime,
      originPlaceId: draft.originPlaceId,
      destinationPlaceId: draft.destinationPlaceId,
      placeId: draft.placeId,
      amount: draft.amount,
      transactionId: draft.transactionId,
      attachmentIds: draft.attachmentIds || [],
      note: draft.note,
      bookingUrl: draft.bookingUrl?.trim(),
      flightDetails: draft.flightDetails,
      lodgingDetails: draft.lodgingDetails,
      trainBusDetails: draft.trainBusDetails,
      rentalDetails: draft.rentalDetails,
      createdAt: now,
      updatedAt: now,
    };

    travelStorage.saveReservations([newRes, ...all]);
    this.markOfflinePacketStale(newRes.tripId);
    return newRes;
  }

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const all = travelStorage.getReservations();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated: Reservation = {
      ...all[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    all[idx] = updated;
    travelStorage.saveReservations(all);
    this.markOfflinePacketStale(updated.tripId);
    return updated;
  }

  deleteReservation(id: string): boolean {
    const all = travelStorage.getReservations();
    const res = all.find((r) => r.id === id);
    if (!res) return false;

    const filtered = all.filter((r) => r.id !== id);
    travelStorage.saveReservations(filtered);
    this.markOfflinePacketStale(res.tripId);
    return true;
  }

  // ==========================================
  // PACKING TEMPLATES & TRIP PACKING LIST
  // ==========================================
  getPackingTemplates(): PackingTemplate[] {
    return travelStorage.getPackingTemplates();
  }

  createPackingTemplate(draft: Partial<PackingTemplate>): PackingTemplate {
    const all = travelStorage.getPackingTemplates();
    const now = Date.now();
    const newTmpl: PackingTemplate = {
      id: draft.id || `ptmpl-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: draft.name?.trim() || 'Custom Packing Template',
      description: draft.description,
      items: draft.items || [],
      createdAt: now,
      updatedAt: now,
    };
    travelStorage.savePackingTemplates([...all, newTmpl]);
    return newTmpl;
  }

  updatePackingTemplate(id: string, updates: Partial<PackingTemplate>): PackingTemplate | null {
    const all = travelStorage.getPackingTemplates();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated = { ...all[idx], ...updates, updatedAt: Date.now() };
    all[idx] = updated;
    travelStorage.savePackingTemplates(all);
    return updated;
  }

  deletePackingTemplate(id: string): boolean {
    const all = travelStorage.getPackingTemplates();
    const filtered = all.filter((t) => t.id !== id);
    if (filtered.length === all.length) return false;
    travelStorage.savePackingTemplates(filtered);
    return true;
  }

  getTripPackingItems(tripId: string): TripPackingItem[] {
    return travelStorage.getTripPackingItems().filter((p) => p.tripId === tripId);
  }

  instantiatePackingTemplate(tripId: string, templateId: string): number {
    const templates = travelStorage.getPackingTemplates();
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return 0;

    const currentItems = travelStorage.getTripPackingItems();
    const existingNames = new Set(
      currentItems.filter((i) => i.tripId === tripId).map((i) => i.name.toLowerCase())
    );

    let addedCount = 0;
    const newItems: TripPackingItem[] = [];

    for (const item of tmpl.items) {
      if (item.defaultIncluded && !existingNames.has(item.name.toLowerCase())) {
        newItems.push({
          id: `pitem-${Date.now()}-${addedCount}-${Math.random().toString(36).substring(2, 5)}`,
          tripId,
          name: item.name,
          category: item.category,
          quantity: item.defaultQuantity || 1,
          isPacked: false,
          isEssential: item.category === 'Documents' || item.category === 'Medication',
          notes: item.notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        addedCount++;
      }
    }

    travelStorage.saveTripPackingItems([...currentItems, ...newItems]);
    this.markOfflinePacketStale(tripId);
    return addedCount;
  }

  addTripPackingItem(item: Partial<TripPackingItem>): TripPackingItem {
    const all = travelStorage.getTripPackingItems();
    const now = Date.now();
    const newItem: TripPackingItem = {
      id: item.id || `pitem-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: item.tripId || '',
      name: item.name?.trim() || 'Packing Item',
      category: item.category || 'Other',
      quantity: item.quantity || 1,
      isPacked: item.isPacked || false,
      isEssential: item.isEssential || false,
      linkedTaskId: item.linkedTaskId,
      notes: item.notes,
      createdAt: now,
      updatedAt: now,
    };
    travelStorage.saveTripPackingItems([...all, newItem]);
    this.markOfflinePacketStale(newItem.tripId);
    return newItem;
  }

  updateTripPackingItem(id: string, updates: Partial<TripPackingItem>): TripPackingItem | null {
    const all = travelStorage.getTripPackingItems();
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = { ...all[idx], ...updates, updatedAt: Date.now() };
    all[idx] = updated;
    travelStorage.saveTripPackingItems(all);
    this.markOfflinePacketStale(updated.tripId);
    return updated;
  }

  deleteTripPackingItem(id: string): boolean {
    const all = travelStorage.getTripPackingItems();
    const item = all.find((i) => i.id === id);
    if (!item) return false;
    const filtered = all.filter((i) => i.id !== id);
    travelStorage.saveTripPackingItems(filtered);
    this.markOfflinePacketStale(item.tripId);
    return true;
  }

  // ==========================================
  // TRAVEL DOCUMENTS
  // ==========================================
  getTravelDocuments(tripId?: string): TravelDocumentLink[] {
    let all = travelStorage.getTravelDocuments();
    if (tripId) {
      all = all.filter((d) => d.tripId === tripId);
    }
    return all.sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));
  }

  createTravelDocument(draft: Partial<TravelDocumentLink>): TravelDocumentLink {
    const all = travelStorage.getTravelDocuments();
    const now = Date.now();
    const newDoc: TravelDocumentLink = {
      id: draft.id || `tdoc-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: draft.tripId || '',
      type: draft.type || 'ticket',
      title: draft.title?.trim() || 'Document',
      attachmentId: draft.attachmentId,
      noteId: draft.noteId,
      required: draft.required || false,
      offlineRequired: draft.offlineRequired ?? true,
      notes: draft.notes,
      createdAt: now,
      updatedAt: now,
    };
    travelStorage.saveTravelDocuments([...all, newDoc]);
    this.markOfflinePacketStale(newDoc.tripId);
    return newDoc;
  }

  deleteTravelDocument(id: string): boolean {
    const all = travelStorage.getTravelDocuments();
    const doc = all.find((d) => d.id === id);
    if (!doc) return false;
    const filtered = all.filter((d) => d.id !== id);
    travelStorage.saveTravelDocuments(filtered);
    this.markOfflinePacketStale(doc.tripId);
    return true;
  }

  // ==========================================
  // OFFLINE TRIP PACKET & AUDIT
  // ==========================================
  getOfflinePacket(tripId: string): OfflineTripPacket | null {
    const packets = travelStorage.getOfflinePackets();
    return packets[tripId] || null;
  }

  buildOfflineTripPacket(tripId: string): OfflineTripPacket {
    const trip = this.getTrip(tripId);
    if (!trip) throw new Error('Trip not found');

    const places = this.getTripPlaces(tripId);
    const itinerary = this.getItinerary(tripId);
    const reservations = this.getReservations(tripId);
    const packing = this.getTripPackingItems(tripId);
    const documents = this.getTravelDocuments(tripId);

    const placeMap = new Map<string, Place>(places.map((tp) => [tp.placeId, tp.place]));
    const auditIssues: string[] = [];

    // Audit 1: Missing required offline documents
    for (const doc of documents) {
      if (doc.offlineRequired && !doc.attachmentId && !doc.noteId) {
        auditIssues.push(`Document "${doc.title}" marked offline-required has no attached file or note link.`);
      }
    }

    // Audit 2: Unpacked essential items
    const unpackedEssentials = packing.filter((p) => p.isEssential && !p.isPacked);
    if (unpackedEssentials.length > 0) {
      auditIssues.push(`${unpackedEssentials.length} essential packing items are currently unpacked.`);
    }

    // Audit 3: Flight reservations without confirmation numbers
    for (const res of reservations) {
      if (res.type === 'flight' && res.status === 'booked' && !res.confirmationNumber) {
        auditIssues.push(`Flight reservation with ${res.provider || 'airline'} is missing confirmation reference.`);
      }
    }

    const packet: OfflineTripPacket = {
      tripId,
      tripTitle: trip.title,
      generatedAt: Date.now(),
      isStale: false,
      dates: {
        startDate: trip.startDate,
        endDate: trip.endDate,
        timezone: trip.timezone,
      },
      destinations: places.map((tp) => ({
        name: tp.place.name,
        type: tp.place.type,
        address: tp.place.address,
        coordinates: tp.place.coordinates,
      })),
      itinerary: itinerary.map((item) => ({
        date: item.date,
        time: item.startTime ? `${item.startTime}${item.endTime ? ' - ' + item.endTime : ''}` : undefined,
        title: item.title,
        type: item.type,
        placeName: item.placeId ? placeMap.get(item.placeId)?.name : undefined,
        notes: item.notes,
      })),
      reservations: reservations.map((res) => ({
        type: res.type,
        provider: res.provider,
        confirmationNumber: res.confirmationNumber,
        departure: res.departureTime ? `${res.departureTime.dateTime} (${res.departureTime.timezone || ''})` : undefined,
        arrival: res.arrivalTime ? `${res.arrivalTime.dateTime} (${res.arrivalTime.timezone || ''})` : undefined,
        notes: res.note,
        hasOfflineDocument: res.attachmentIds.length > 0,
      })),
      packingSummary: {
        totalItems: packing.length,
        packedItems: packing.filter((p) => p.isPacked).length,
        unpackedEssential: unpackedEssentials.map((i) => i.name),
      },
      emergencyNotes: trip.summaryNotes,
      auditIssues,
    };

    const packets = travelStorage.getOfflinePackets();
    packets[tripId] = packet;
    travelStorage.saveOfflinePackets(packets);

    return packet;
  }

  private markOfflinePacketStale(tripId: string): void {
    const packets = travelStorage.getOfflinePackets();
    if (packets[tripId]) {
      packets[tripId].isStale = true;
      travelStorage.saveOfflinePackets(packets);
    }
  }

  // ==========================================
  // ACTIVE TRIP & TRAVEL MODE
  // ==========================================
  getActiveTripId(): string | null {
    const active = travelStorage.getActiveTripId();
    if (active && this.getTrip(active)) return active;

    // Derived: If today falls within a trip's start & end date, suggest it
    const today = new Date().toISOString().slice(0, 10);
    const trips = this.getTrips();
    const currentTrip = trips.find(
      (t) => t.startDate && t.endDate && t.startDate <= today && today <= t.endDate
    );
    return currentTrip ? currentTrip.id : null;
  }

  setActiveTripId(tripId: string | null): void {
    travelStorage.setActiveTripId(tripId);
  }

  getTravelModeTodayAgenda(tripId: string, dateStr?: string): {
    date: string;
    trip: Trip;
    todayItinerary: ItineraryEntry[];
    todayReservations: Reservation[];
    activeLodging?: { place: Place; reservation?: Reservation };
    openTasksCount: number;
    unpackedEssentialCount: number;
  } | null {
    const trip = this.getTrip(tripId);
    if (!trip) return null;

    const date = dateStr || new Date().toISOString().slice(0, 10);
    const allItin = this.getItinerary(tripId);
    const todayItinerary = allItin.filter((i) => i.date === date);

    const allRes = this.getReservations(tripId);
    const todayReservations = allRes.filter((r) => {
      const dep = r.departureTime?.dateTime.slice(0, 10);
      const arr = r.arrivalTime?.dateTime.slice(0, 10);
      return dep === date || arr === date;
    });

    // Active lodging for today
    let activeLodging: { place: Place; reservation?: Reservation } | undefined;
    const hotelRes = allRes.find((r) => {
      if (r.type !== 'accommodation') return false;
      const start = r.departureTime?.dateTime.slice(0, 10);
      const end = r.arrivalTime?.dateTime.slice(0, 10);
      return start && end && start <= date && date <= end;
    });

    if (hotelRes && hotelRes.placeId) {
      const p = this.getPlace(hotelRes.placeId);
      if (p) {
        activeLodging = { place: p, reservation: hotelRes };
      }
    }

    const packing = this.getTripPackingItems(tripId);
    const unpackedEssentialCount = packing.filter((p) => p.isEssential && !p.isPacked).length;

    return {
      date,
      trip,
      todayItinerary,
      todayReservations,
      activeLodging,
      openTasksCount: 0,
      unpackedEssentialCount,
    };
  }

  // ==========================================
  // AI ITINERARY PROPOSALS (PROPOSAL ONLY)
  // ==========================================
  generateAIItineraryProposal(params: {
    tripId: string;
    places: Place[];
    startDate: string;
    endDate: string;
    pace: 'relaxed' | 'moderate' | 'intensive';
    focus?: string;
  }): Array<{ date: string; title: string; type: ItineraryEntry['type']; placeId?: string; notes: string }> {
    const dates = generateDateRange(params.startDate, params.endDate);
    if (dates.length === 0 || params.places.length === 0) return [];

    const proposals: Array<{
      date: string;
      title: string;
      type: ItineraryEntry['type'];
      placeId?: string;
      notes: string;
    }> = [];

    // Group places by proximity
    const clusters = this.getPlacesProximityClusters(params.places);
    let placeIdx = 0;

    for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
      const date = dates[dayIdx];
      const cluster = clusters[dayIdx % clusters.length];
      const dayPlaces = cluster ? cluster.places : [params.places[placeIdx % params.places.length]];

      proposals.push({
        date,
        title: `Morning Exploration: ${dayPlaces[0]?.name || 'City Walk'}`,
        type: 'place',
        placeId: dayPlaces[0]?.id,
        notes: `Proposal: Visit morning highlight in ${dayPlaces[0]?.name || 'central area'}. Estimated 2-3 hours.`,
      });

      proposals.push({
        date,
        title: 'Local Lunch & Refreshment',
        type: 'meal',
        notes: 'Proposal: Relaxed local dining near morning sights.',
      });

      if (dayPlaces.length > 1 && params.pace !== 'relaxed') {
        proposals.push({
          date,
          title: `Afternoon Sights: ${dayPlaces[1]?.name || 'Landmark'}`,
          type: 'place',
          placeId: dayPlaces[1]?.id,
          notes: 'Proposal: Walkable afternoon landmark in same geographic sector.',
        });
      }

      proposals.push({
        date,
        title: 'Evening Dinner & Stroll',
        type: 'meal',
        notes: 'Proposal: Evening dining and scenic night views.',
      });

      placeIdx += 2;
    }

    return proposals;
  }

  getPlacesProximityClusters(places: Place[]) {
    const valid = places.filter((p) => isValidCoordinate(p.coordinates));
    if (valid.length === 0) return [];

    const clusters: Array<{ center: { lat: number; lon: number }; places: Place[] }> = [];
    const used = new Set<string>();

    for (const p of valid) {
      if (used.has(p.id) || !p.coordinates) continue;
      const group = [p];
      used.add(p.id);

      for (const other of valid) {
        if (used.has(other.id) || !other.coordinates) continue;
        const dist = calculateHaversineDistanceKm(p.coordinates, other.coordinates);
        if (dist <= 4.0) {
          group.push(other);
          used.add(other.id);
        }
      }

      clusters.push({
        center: p.coordinates,
        places: group,
      });
    }

    return clusters;
  }

  // ==========================================
  // EXPORTS & IMPORTS
  // ==========================================
  exportTripMarkdown(tripId: string, options?: { includeSensitiveConfirmations?: boolean }): string {
    const trip = this.getTrip(tripId);
    if (!trip) return '';

    const itinerary = this.getItinerary(tripId);
    const reservations = this.getReservations(tripId);
    const packing = this.getTripPackingItems(tripId);
    const places = this.getTripPlaces(tripId);

    const lines: string[] = [
      `# ${trip.title}`,
      `**Dates:** ${trip.startDate || 'TBD'} → ${trip.endDate || 'TBD'}  `,
      `**Timezone:** ${trip.timezone || 'Local'}  `,
      `**Status:** ${trip.status.toUpperCase()}  `,
      '',
    ];

    if (trip.summaryNotes) {
      lines.push(`## Trip Overview`, trip.summaryNotes, '');
    }

    lines.push('## Itinerary');
    const byDate: Record<string, ItineraryEntry[]> = {};
    for (const item of itinerary) {
      if (!byDate[item.date]) byDate[item.date] = [];
      byDate[item.date].push(item);
    }

    for (const d of Object.keys(byDate).sort()) {
      lines.push(`### ${d}`);
      for (const item of byDate[d]) {
        const timeStr = item.startTime ? `\`${item.startTime}\` ` : '';
        lines.push(`- ${timeStr}**${item.title}**${item.notes ? ` — *${item.notes}*` : ''}`);
      }
      lines.push('');
    }

    lines.push('## Reservations & Transport');
    for (const res of reservations) {
      const conf = options?.includeSensitiveConfirmations
        ? ` (Ref: \`${res.confirmationNumber || 'None'}\`)`
        : '';
      lines.push(`- **[${res.type.toUpperCase()}]** ${res.provider || 'Provider'}${conf}`);
      if (res.departureTime?.dateTime) {
        lines.push(`  - Departure: ${res.departureTime.dateTime} (${res.departureTime.timezone || ''})`);
      }
      if (res.arrivalTime?.dateTime) {
        lines.push(`  - Arrival: ${res.arrivalTime.dateTime} (${res.arrivalTime.timezone || ''})`);
      }
    }
    lines.push('');

    lines.push('## Packing List');
    for (const item of packing) {
      lines.push(`- [${item.isPacked ? 'x' : ' '}] ${item.name} (${item.category}, Qty: ${item.quantity})`);
    }
    lines.push('');

    return lines.join('\n');
  }

  exportTripICS(tripId: string): string {
    const trip = this.getTrip(tripId);
    if (!trip) return '';

    const itinerary = this.getItinerary(tripId);
    const reservations = this.getReservations(tripId);

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KeepNotes PKM//P55 Travel//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${trip.title}`,
      `X-WR-TIMEZONE:${trip.timezone || 'UTC'}`,
    ];

    // Export itinerary items
    for (const item of itinerary) {
      const dateClean = item.date.replace(/-/g, '');
      const uid = `itin-${item.id}@keepnotes.pkm`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);

      if (item.startTime) {
        const timeClean = item.startTime.replace(/:/g, '') + '00';
        lines.push(`DTSTART;TZID=${item.timezone || trip.timezone || 'UTC'}:${dateClean}T${timeClean}`);
        if (item.endTime) {
          const endTimeClean = item.endTime.replace(/:/g, '') + '00';
          lines.push(`DTEND;TZID=${item.timezone || trip.timezone || 'UTC'}:${dateClean}T${endTimeClean}`);
        }
      } else {
        lines.push(`DTSTART;VALUE=DATE:${dateClean}`);
      }

      lines.push(`SUMMARY:${item.title}`);
      if (item.notes) {
        lines.push(`DESCRIPTION:${item.notes.replace(/\n/g, '\\n')}`);
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  exportFullTravelDataJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 'P55-1.0',
        trips: travelStorage.getTrips(),
        places: travelStorage.getPlaces(),
        tripPlaces: travelStorage.getTripPlaces(),
        itineraries: travelStorage.getItineraryEntries(),
        reservations: travelStorage.getReservations(),
        packingTemplates: travelStorage.getPackingTemplates(),
        packingItems: travelStorage.getTripPackingItems(),
        documents: travelStorage.getTravelDocuments(),
      },
      null,
      2
    );
  }

  // ==========================================
  // VAULT DOCTOR & DIAGNOSTICS
  // ==========================================
  runTravelDiagnostics(): TravelDiagnosticIssue[] {
    const issues: TravelDiagnosticIssue[] = [];
    const trips = travelStorage.getTrips();
    const places = travelStorage.getPlaces();
    const placeIds = new Set(places.map((p) => p.id));
    const reservations = travelStorage.getReservations();
    const itineraries = travelStorage.getItineraryEntries();

    // Check 1: Trip dates validity
    for (const trip of trips) {
      if (trip.startDate && trip.endDate && trip.startDate > trip.endDate) {
        issues.push({
          id: `diag-trip-date-${trip.id}`,
          severity: 'error',
          type: 'invalid_date_range',
          message: `Trip "${trip.title}" has end date (${trip.endDate}) before start date (${trip.startDate}).`,
          tripId: trip.id,
        });
      }
    }

    // Check 2: Missing places linked in reservations or itinerary
    for (const res of reservations) {
      if (res.placeId && !placeIds.has(res.placeId)) {
        issues.push({
          id: `diag-missing-place-res-${res.id}`,
          severity: 'warning',
          type: 'missing_place',
          message: `Reservation references missing place ID "${res.placeId}".`,
          tripId: res.tripId,
          resourceId: res.id,
        });
      }
    }

    // Check 3: Invalid coordinate boundaries
    for (const p of places) {
      if (p.coordinates && !isValidCoordinate(p.coordinates)) {
        issues.push({
          id: `diag-coord-bound-${p.id}`,
          severity: 'error',
          type: 'coordinate_out_of_range',
          message: `Place "${p.name}" has coordinates (${p.coordinates.lat}, ${p.coordinates.lon}) outside valid bounds.`,
          resourceId: p.id,
          autoFixable: true,
        });
      }
    }

    return issues;
  }
}

export const travelService = new TravelService();
export const getPlaces = (filter?: Parameters<TravelService['getPlaces']>[0]): Place[] => travelService.getPlaces(filter);
export const getPlace = (id: string): Place | null => travelService.getPlace(id);
