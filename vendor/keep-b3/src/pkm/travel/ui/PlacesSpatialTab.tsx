/**
 * Phase P55: Places & Spatial Tab
 * Places directory, geographic clustering, hierarchy explorer, and straight-line distance calculator.
 */

import React, { useState } from 'react';
import { Place, PlaceType } from '../travelTypes';
import { travelService } from '../travelService';
import {
  calculateHaversineDistanceKm,
  calculateHaversineDistanceMiles,
  isValidCoordinate,
  clusterPlacesByProximity,
} from '../travelCalculations';
import {
  MapPin,
  Plus,
  Search,
  Navigation,
  ExternalLink,
  Star,
  Edit2,
  Trash2,
  Layers,
  Compass,
  ArrowRightLeft,
} from 'lucide-react';

interface PlacesSpatialTabProps {
  places: Place[];
  onOpenPlaceModal: (place?: Place) => void;
  onRefresh: () => void;
  onOpenNote?: (noteId: string) => void;
}

export const PlacesSpatialTab: React.FC<PlacesSpatialTabProps> = ({
  places,
  onOpenPlaceModal,
  onRefresh,
  onOpenNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'clusters' | 'distance'>('list');

  // Distance calculator states
  const [distancePlaceA, setDistancePlaceA] = useState<string>('');
  const [distancePlaceB, setDistancePlaceB] = useState<string>('');

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));

  const filteredPlaces = places.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchAddress = p.address?.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchAddress && !matchNotes && !matchTags) return false;
    }
    return true;
  });

  // Calculate distance between selected places
  const placeAObj = distancePlaceA ? placeMap.get(distancePlaceA) : null;
  const placeBObj = distancePlaceB ? placeMap.get(distancePlaceB) : null;
  const distanceKm =
    placeAObj?.coordinates && placeBObj?.coordinates
      ? calculateHaversineDistanceKm(placeAObj.coordinates, placeBObj.coordinates)
      : null;
  const distanceMiles =
    placeAObj?.coordinates && placeBObj?.coordinates
      ? calculateHaversineDistanceMiles(placeAObj.coordinates, placeBObj.coordinates)
      : null;

  const proximityClusters = clusterPlacesByProximity(filteredPlaces, 3.5);

  const getTypeBadge = (type: PlaceType) => {
    const map: Record<PlaceType, { label: string; bg: string; text: string }> = {
      city: { label: 'City', bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
      country: { label: 'Country', bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300' },
      region: { label: 'Region', bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300' },
      neighborhood: { label: 'Neighborhood', bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-700 dark:text-violet-300' },
      landmark: { label: 'Landmark', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
      attraction: { label: 'Attraction', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
      restaurant: { label: 'Restaurant', bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300' },
      cafe: { label: 'Cafe', bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300' },
      accommodation: { label: 'Hotel', bg: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-300' },
      airport: { label: 'Airport', bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-700 dark:text-sky-300' },
      station: { label: 'Station', bg: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-300' },
      church: { label: 'Religious', bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300' },
      museum: { label: 'Museum', bg: 'bg-fuchsia-100 dark:bg-fuchsia-950', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
      park: { label: 'Park', bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' },
      shop: { label: 'Shop', bg: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300' },
      other: { label: 'Other', bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-400' },
    };
    const c = map[type] || map.other;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* View Mode Switches */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            All Places ({filteredPlaces.length})
          </button>
          <button
            onClick={() => setViewMode('clusters')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'clusters'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Spatial Clusters
          </button>
          <button
            onClick={() => setViewMode('distance')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'distance'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Distance Calc
          </button>
        </div>

        {/* Search & Add */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={() => onOpenPlaceModal()}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Place</span>
          </button>
        </div>
      </div>

      {/* Place Type Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Types' },
          { id: 'landmark', label: 'Landmarks' },
          { id: 'attraction', label: 'Attractions' },
          { id: 'restaurant', label: 'Dining' },
          { id: 'accommodation', label: 'Lodging' },
          { id: 'transit', label: 'Transit' },
          { id: 'nature', label: 'Nature' },
          { id: 'city', label: 'Cities' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              typeFilter === t.id
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Distance Calculator View */}
      {viewMode === 'distance' && (
        <div className="p-5 bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Straight-Line Spatial Distance (Haversine Formula)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Calculates exact great-circle distance between two geographic coordinates stored in your local PKM.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Origin Place
              </label>
              <select
                value={distancePlaceA}
                onChange={(e) => setDistancePlaceA(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              >
                <option value="">Select origin...</option>
                {places
                  .filter((p) => isValidCoordinate(p.coordinates))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.coordinates?.lat.toFixed(4)}, {p.coordinates?.lon.toFixed(4)})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Destination Place
              </label>
              <select
                value={distancePlaceB}
                onChange={(e) => setDistancePlaceB(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              >
                <option value="">Select destination...</option>
                {places
                  .filter((p) => isValidCoordinate(p.coordinates))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.coordinates?.lat.toFixed(4)}, {p.coordinates?.lon.toFixed(4)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {distanceKm !== null && distanceMiles !== null ? (
            <div className="p-4 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-around text-center">
              <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider block">Kilometers</span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {distanceKm} km
                </span>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-stone-400" />
              <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider block">Miles</span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {distanceMiles} mi
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-stone-400">
              Select two places with valid latitude/longitude coordinates to calculate straight-line distance.
            </div>
          )}
        </div>
      )}

      {/* Spatial Proximity Clusters View */}
      {viewMode === 'clusters' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-500">
            Grouping places located within ~3.5km of each other to optimize daily itinerary routing:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proximityClusters.map((cluster, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Cluster {idx + 1} ({cluster.places.length} places)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    Centroid: {cluster.center.lat.toFixed(3)}, {cluster.center.lon.toFixed(3)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {cluster.places.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getTypeBadge(p.type)}
                        <button
                          onClick={() => onOpenPlaceModal(p)}
                          className="p-1 text-stone-400 hover:text-stone-600 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard List View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map((place) => {
            const parent = place.parentPlaceId ? placeMap.get(place.parentPlaceId) : null;

            return (
              <div
                key={place.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                      {place.name}
                    </h4>
                    {getTypeBadge(place.type)}
                  </div>

                  {parent && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-500 mb-2">
                      <Layers className="w-3 h-3 text-stone-400" />
                      <span>In {parent.name}</span>
                    </div>
                  )}

                  {place.address && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-1 mb-2">
                      {place.address}
                    </p>
                  )}

                  {place.coordinates && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500 mb-2">
                      <Navigation className="w-3 h-3 text-amber-500" />
                      <span>
                        {place.coordinates.lat.toFixed(4)}, {place.coordinates.lon.toFixed(4)}
                      </span>
                    </div>
                  )}

                  {place.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            place.rating! >= s
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-200 dark:text-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {place.notes && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mb-3 bg-stone-50 dark:bg-stone-800/40 p-2 rounded-xl">
                      {place.notes}
                    </p>
                  )}

                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {place.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                  {place.sourceUrl ? (
                    <a
                      href={place.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Map Link</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-stone-400">Local Record</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenPlaceModal(place)}
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete place "${place.name}"?`)) {
                          travelService.deletePlace(place.id);
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

          {filteredPlaces.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
              <MapPin className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                No places recorded
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                Record destinations, landmarks, dining spots, hotels, and attractions with spatial coordinates.
              </p>
              <button
                onClick={() => onOpenPlaceModal()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Add Place
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
