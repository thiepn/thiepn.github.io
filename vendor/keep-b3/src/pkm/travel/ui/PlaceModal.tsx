/**
 * Phase P55: Place Modal
 * Create or edit places with spatial coordinates, type, hierarchy, and metadata.
 */

import React, { useState, useEffect } from 'react';
import { Place, PlaceType, PlaceCoordinates } from '../travelTypes';
import { travelService } from '../travelService';
import { isValidCoordinate } from '../travelCalculations';
import { X, MapPin, Navigation, Tag, Globe, Star, Layers, AlignLeft } from 'lucide-react';

interface PlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: Place) => void;
  initialPlace?: Place | null;
  existingPlaces?: Place[];
}

export const PlaceModal: React.FC<PlaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlace,
  existingPlaces = [],
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PlaceType>('attraction');
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [parentPlaceId, setParentPlaceId] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlace) {
      setName(initialPlace.name);
      setType(initialPlace.type);
      setLatInput(initialPlace.coordinates ? String(initialPlace.coordinates.lat) : '');
      setLonInput(initialPlace.coordinates ? String(initialPlace.coordinates.lon) : '');
      setAddress(initialPlace.address || '');
      setTimezone(initialPlace.timezone || '');
      setParentPlaceId(initialPlace.parentPlaceId || '');
      setSourceUrl(initialPlace.sourceUrl || '');
      setRating(initialPlace.rating);
      setTagsInput(initialPlace.tags.join(', '));
      setNotes(initialPlace.notes || '');
    } else {
      setName('');
      setType('attraction');
      setLatInput('');
      setLonInput('');
      setAddress('');
      setTimezone('');
      setParentPlaceId('');
      setSourceUrl('');
      setRating(undefined);
      setTagsInput('');
      setNotes('');
    }
    setError(null);
  }, [initialPlace, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Place name is required.');
      return;
    }

    let coordinates: PlaceCoordinates | undefined = undefined;
    if (latInput.trim() || lonInput.trim()) {
      const lat = parseFloat(latInput);
      const lon = parseFloat(lonInput);
      if (isNaN(lat) || isNaN(lon) || !isValidCoordinate({ lat, lon })) {
        setError('Latitude must be between -90 and 90, and longitude between -180 and 180.');
        return;
      }
      coordinates = { lat, lon };
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (initialPlace) {
        const updated = travelService.updatePlace(initialPlace.id, {
          name: name.trim(),
          type,
          coordinates,
          address: address.trim() || undefined,
          timezone: timezone.trim() || undefined,
          parentPlaceId: parentPlaceId || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          rating,
          tags,
          notes: notes.trim() || undefined,
        });
        if (updated) onSave(updated);
      } else {
        const created = travelService.createPlace({
          name: name.trim(),
          type,
          coordinates,
          address: address.trim() || undefined,
          timezone: timezone.trim() || undefined,
          parentPlaceId: parentPlaceId || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          rating,
          tags,
          notes: notes.trim() || undefined,
        });
        onSave(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save place');
    }
  };

  // Filter possible parents (cannot select self)
  const validParents = existingPlaces.filter((p) => p.id !== initialPlace?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {initialPlace ? 'Edit Place' : 'Add Place'}
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

          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Place Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fushimi Inari Shrine"
                className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlaceType)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="city">City / Town</option>
                <option value="country">Country</option>
                <option value="region">Region / Area</option>
                <option value="landmark">Landmark</option>
                <option value="attraction">Attraction / Museum</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe / Bar</option>
                <option value="accommodation">Hotel / Lodging</option>
                <option value="transit">Airport / Train Station</option>
                <option value="nature">Nature / Park / Trail</option>
                <option value="cultural">Cultural / Religious</option>
                <option value="shop">Market / Shop</option>
                <option value="other">Other Place</option>
              </select>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Latitude (-90 to 90)
              </label>
              <div className="relative">
                <Navigation className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="any"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="34.9671"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Longitude (-180 to 180)
              </label>
              <div className="relative">
                <Navigation className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="any"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  placeholder="135.7727"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Address & Parent hierarchy */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Physical Address / Location
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto"
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Parent Area / City (Hierarchy)
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <select
                  value={parentPlaceId}
                  onChange={(e) => setParentPlaceId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">None (Top-Level Place)</option>
                  {validParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Personal Rating (1-5 Stars)
              </label>
              <div className="flex items-center gap-1.5 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? undefined : star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        rating && rating >= star
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300 dark:text-stone-700'
                      }`}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="text-xs font-medium text-stone-500 ml-2">
                    {rating} / 5
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Source URL & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Reference / Map URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Tags (comma separated)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="shrine, photography, hiking"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Field Notes / Tips
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Best visiting time early morning before 7am to avoid crowds. Take Keihan main line."
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
              {initialPlace ? 'Save Changes' : 'Save Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
