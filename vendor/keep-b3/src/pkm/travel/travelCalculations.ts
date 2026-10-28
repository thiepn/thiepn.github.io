/**
 * Phase P55: Travel & Places Calculation Utilities
 * Mathematical, spatial (Haversine), timezone formatting, and validation helpers.
 */

import {
  PlaceCoordinates,
  Place,
  ItineraryEntry,
  Reservation,
  TripPackingItem,
} from './travelTypes';

/**
 * Computes exact Great-Circle distance between two coordinates using the Haversine formula.
 * Explicitly labeled as Straight-Line distance (not driving/walking route).
 */
export function calculateHaversineDistanceKm(
  coord1: PlaceCoordinates,
  coord2: PlaceCoordinates
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lon - coord1.lon);

  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

export function calculateHaversineDistanceMiles(
  coord1: PlaceCoordinates,
  coord2: PlaceCoordinates
): number {
  const km = calculateHaversineDistanceKm(coord1, coord2);
  return Math.round(km * 0.621371 * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Validates coordinate boundaries (-90 <= lat <= 90, -180 <= lon <= 180)
 */
export function isValidCoordinate(coord?: PlaceCoordinates | null): boolean {
  if (!coord) return false;
  return (
    typeof coord.lat === 'number' &&
    !isNaN(coord.lat) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    typeof coord.lon === 'number' &&
    !isNaN(coord.lon) &&
    coord.lon >= -180 &&
    coord.lon <= 180
  );
}

/**
 * Groups places by spatial proximity into clusters within a given radius (e.g. 5km)
 */
export function clusterPlacesByProximity(
  places: Place[],
  radiusKm: number = 3.0
): Array<{ center: PlaceCoordinates; places: Place[] }> {
  const validPlaces = places.filter((p) => isValidCoordinate(p.coordinates));
  const visited = new Set<string>();
  const clusters: Array<{ center: PlaceCoordinates; places: Place[] }> = [];

  for (const place of validPlaces) {
    if (visited.has(place.id) || !place.coordinates) continue;

    const group: Place[] = [place];
    visited.add(place.id);

    for (const other of validPlaces) {
      if (visited.has(other.id) || !other.coordinates) continue;
      const dist = calculateHaversineDistanceKm(place.coordinates, other.coordinates);
      if (dist <= radiusKm) {
        group.push(other);
        visited.add(other.id);
      }
    }

    // Compute centroid
    const avgLat = group.reduce((acc, p) => acc + p.coordinates!.lat, 0) / group.length;
    const avgLon = group.reduce((acc, p) => acc + p.coordinates!.lon, 0) / group.length;

    clusters.push({
      center: { lat: avgLat, lon: avgLon },
      places: group,
    });
  }

  return clusters;
}

/**
 * Format dual timezones safely (e.g. Departure Berlin -> Arrival Seoul)
 */
export function formatDualTimeDisplay(
  departure?: { dateTime: string; timezone?: string },
  arrival?: { dateTime: string; timezone?: string }
): { depFormatted: string; arrFormatted: string; crossTimezone: boolean } {
  const depTime = departure?.dateTime ? departure.dateTime.replace('T', ' ') : 'TBD';
  const arrTime = arrival?.dateTime ? arrival.dateTime.replace('T', ' ') : 'TBD';

  const depTz = departure?.timezone ? ` (${departure.timezone.split('/').pop()?.replace(/_/g, ' ')})` : '';
  const arrTz = arrival?.timezone ? ` (${arrival.timezone.split('/').pop()?.replace(/_/g, ' ')})` : '';

  const crossTimezone = Boolean(
    departure?.timezone && arrival?.timezone && departure.timezone !== arrival.timezone
  );

  return {
    depFormatted: `${depTime}${depTz}`,
    arrFormatted: `${arrTime}${arrTz}`,
    crossTimezone,
  };
}

/**
 * Sorts Itinerary Entries by date, time, and manual order index
 */
export function sortItineraryEntries(entries: ItineraryEntry[]): ItineraryEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Date comparison
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // 2. Timed entries before untimed
    if (a.startTime && !b.startTime) return -1;
    if (!a.startTime && b.startTime) return 1;
    if (a.startTime && b.startTime && a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    // 3. Manual order index
    return a.order - b.order;
  });
}

/**
 * Groups sorted itinerary entries by date string
 */
export function groupItineraryByDate(
  entries: ItineraryEntry[]
): Record<string, ItineraryEntry[]> {
  const sorted = sortItineraryEntries(entries);
  const groups: Record<string, ItineraryEntry[]> = {};

  for (const entry of sorted) {
    if (!groups[entry.date]) {
      groups[entry.date] = [];
    }
    groups[entry.date].push(entry);
  }

  return groups;
}

/**
 * Generates an array of all dates (YYYY-MM-DD) between startDate and endDate
 */
export function generateDateRange(startDate?: string, endDate?: string): string[] {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return startDate ? [startDate] : [];
  }

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Checks for overlapping itinerary time intervals on the same date (informational warning)
 */
export function detectItineraryConflicts(entries: ItineraryEntry[]): Array<{
  entryA: ItineraryEntry;
  entryB: ItineraryEntry;
  date: string;
}> {
  const conflicts: Array<{ entryA: ItineraryEntry; entryB: ItineraryEntry; date: string }> = [];
  const byDate = groupItineraryByDate(entries);

  for (const date in byDate) {
    const dayEntries = byDate[date].filter((e) => e.startTime && e.endTime);
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        const a = dayEntries[i];
        const b = dayEntries[j];
        if (a.startTime! < b.endTime! && b.startTime! < a.endTime!) {
          conflicts.push({ entryA: a, entryB: b, date });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Calculate packing progress metrics
 */
export function calculatePackingMetrics(items: TripPackingItem[]): {
  total: number;
  packed: number;
  unpacked: number;
  percentage: number;
  unpackedEssentials: TripPackingItem[];
  byCategory: Record<string, { total: number; packed: number }>;
} {
  const total = items.length;
  const packed = items.filter((i) => i.isPacked).length;
  const unpacked = total - packed;
  const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
  const unpackedEssentials = items.filter((i) => !i.isPacked && i.isEssential);

  const byCategory: Record<string, { total: number; packed: number }> = {};
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, packed: 0 };
    }
    byCategory[cat].total++;
    if (item.isPacked) {
      byCategory[cat].packed++;
    }
  }

  return {
    total,
    packed,
    unpacked,
    percentage,
    unpackedEssentials,
    byCategory,
  };
}

/**
 * Check for cyclic parent hierarchy in places
 */
export function detectPlaceHierarchyCycle(places: Place[], startPlaceId: string, parentId?: string): boolean {
  if (!parentId) return false;
  if (startPlaceId === parentId) return true;

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));
  let currentId: string | undefined = parentId;
  const visited = new Set<string>([startPlaceId]);

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    const parent = placeMap.get(currentId);
    currentId = parent?.parentPlaceId;
  }

  return false;
}
