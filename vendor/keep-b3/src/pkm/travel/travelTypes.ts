/**
 * Phase P55: Travel, Places & Trip Planning Data Types
 * Private, local-first travel management layer connecting trips, itineraries,
 * places, reservations, documents, people, budgets, and offline trip packets.
 */

export type TripStatus =
  | 'idea'
  | 'planning'
  | 'booked'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'archived';

export interface Trip {
  id: string;
  title: string;
  status: TripStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timezone?: string; // Primary destination IANA timezone, e.g. "Asia/Seoul", "Europe/Paris"
  homeTimezone?: string; // User's origin timezone, e.g. "Europe/Berlin"
  destinationPlaceIds: string[]; // Linked Place IDs
  participantPersonIds: string[]; // Linked P48 People IDs
  noteId?: string; // Canonical Markdown note ID
  projectId?: string; // Linked P49 Project ID
  financeScopeId?: string; // Linked P53 Finance Scope / Tag
  budgetPlanned?: {
    amount: number;
    currency: string;
  };
  coverImage?: string; // Data URL or P26 attachment
  tags: string[];
  summaryNotes?: string;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type PlaceType =
  | 'country'
  | 'region'
  | 'city'
  | 'neighborhood'
  | 'accommodation'
  | 'restaurant'
  | 'cafe'
  | 'airport'
  | 'station'
  | 'attraction'
  | 'church'
  | 'museum'
  | 'shop'
  | 'park'
  | 'landmark'
  | 'other';

export interface PlaceCoordinates {
  lat: number; // -90 to 90
  lon: number; // -180 to 180
}

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  coordinates?: PlaceCoordinates;
  address?: string;
  timezone?: string;
  sourceUrl?: string;
  noteId?: string; // Canonical Place Markdown Note ID
  parentPlaceId?: string; // Hierarchy: Gyeongbokgung -> Seoul -> South Korea
  tags: string[];
  rating?: number; // 1-5 user rating
  notes?: string;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TripPlaceRole = 'destination' | 'stay' | 'visit' | 'food' | 'transport' | 'other';
export type TripPlacePriority = 'must' | 'want' | 'optional';

export interface TripPlace {
  tripId: string;
  placeId: string;
  role?: TripPlaceRole;
  priority?: TripPlacePriority;
  visited: boolean;
  note?: string;
}

export type ItineraryEntryType =
  | 'place'
  | 'transport'
  | 'reservation'
  | 'activity'
  | 'meal'
  | 'note'
  | 'free-time'
  | 'other';

export interface ItineraryEntry {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  timezone?: string; // Specific entry timezone if cross-border
  type: ItineraryEntryType;
  placeId?: string; // Linked Place
  reservationId?: string; // Linked Reservation
  title: string;
  notes?: string;
  cost?: {
    amount: number;
    currency: string;
  };
  order: number; // Order index within the day
  isCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ReservationType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'accommodation'
  | 'restaurant'
  | 'activity'
  | 'rental_vehicle'
  | 'ticket'
  | 'other';

export type ReservationStatus = 'planned' | 'booked' | 'cancelled' | 'completed';

export interface FlightDetails {
  carrier?: string;
  flightNumber?: string;
  departureAirportCode?: string;
  arrivalAirportCode?: string;
  terminalDeparture?: string;
  terminalArrival?: string;
  gate?: string;
  seat?: string;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface LodgingDetails {
  roomType?: string;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationDeadline?: string;
  wifiPassword?: string;
  breakfastIncluded?: boolean;
}

export interface TrainBusDetails {
  operator?: string;
  lineOrNumber?: string;
  coach?: string;
  seat?: string;
  platform?: string;
}

export interface RentalVehicleDetails {
  company?: string;
  carModel?: string;
  pickupLocation?: string;
  returnLocation?: string;
}

export interface Reservation {
  id: string;
  tripId: string;
  type: ReservationType;
  provider?: string;
  confirmationNumber?: string; // Sensitive identifier (can be masked)
  status: ReservationStatus;
  
  // Cross-timezone timestamps
  departureTime?: {
    dateTime: string; // ISO 8601 or YYYY-MM-DDTHH:mm
    timezone?: string; // IANA e.g. "Europe/Berlin"
  };
  arrivalTime?: {
    dateTime: string; // ISO 8601 or YYYY-MM-DDTHH:mm
    timezone?: string; // IANA e.g. "Asia/Seoul"
  };

  originPlaceId?: string;
  destinationPlaceId?: string;
  placeId?: string; // For accommodation, restaurant, activity

  amount?: {
    amount: number;
    currency: string;
  };
  transactionId?: string; // Linked P53 transaction ID
  attachmentIds: string[]; // Linked P26 PDF ticket / confirmation document IDs
  note?: string;
  bookingUrl?: string;

  // Type-specific details
  flightDetails?: FlightDetails;
  lodgingDetails?: LodgingDetails;
  trainBusDetails?: TrainBusDetails;
  rentalDetails?: RentalVehicleDetails;

  createdAt: number;
  updatedAt: number;
}

export interface PackingTemplateItem {
  id: string;
  name: string;
  category: string; // e.g. "Clothes", "Toiletries", "Electronics", "Documents", "Medication"
  defaultQuantity?: number;
  defaultIncluded: boolean;
  notes?: string;
}

export interface PackingTemplate {
  id: string;
  name: string;
  description?: string;
  items: PackingTemplateItem[];
  createdAt: number;
  updatedAt: number;
}

export interface TripPackingItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  quantity: number;
  isPacked: boolean;
  isEssential: boolean;
  linkedTaskId?: string; // Linked P25 task ID if actionable purchase needed
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type TravelDocumentType =
  | 'ticket'
  | 'reservation'
  | 'insurance'
  | 'visa'
  | 'identity'
  | 'voucher'
  | 'guide'
  | 'other';

export interface TravelDocumentLink {
  id: string;
  tripId: string;
  type: TravelDocumentType;
  title: string;
  attachmentId?: string; // P26 Attachment PDF/Image
  noteId?: string; // Canonical Note ID
  required: boolean;
  offlineRequired: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineTripPacket {
  tripId: string;
  tripTitle: string;
  generatedAt: number;
  isStale: boolean;
  dates: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
  destinations: Array<{
    name: string;
    type: string;
    address?: string;
    coordinates?: PlaceCoordinates;
  }>;
  itinerary: Array<{
    date: string;
    time?: string;
    title: string;
    type: string;
    placeName?: string;
    notes?: string;
  }>;
  reservations: Array<{
    type: string;
    provider?: string;
    confirmationNumber?: string;
    departure?: string;
    arrival?: string;
    notes?: string;
    hasOfflineDocument: boolean;
  }>;
  packingSummary: {
    totalItems: number;
    packedItems: number;
    unpackedEssential: string[];
  };
  emergencyNotes?: string;
  auditIssues: string[]; // Missing offline resources, unconfirmed items, etc.
}

export interface TravelDiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  type:
    | 'invalid_date_range'
    | 'missing_place'
    | 'orphan_reservation'
    | 'malformed_timezone'
    | 'reservation_end_before_start'
    | 'duplicate_confirmation'
    | 'missing_document'
    | 'offline_required_missing'
    | 'coordinate_out_of_range'
    | 'place_cycle'
    | 'itinerary_outside_trip'
    | 'broken_packing_template';
  message: string;
  tripId?: string;
  resourceId?: string;
  autoFixable?: boolean;
}
