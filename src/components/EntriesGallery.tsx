import React, { useState, useMemo } from 'react';
import {
  Search,
  Tag,
  Star,
  MapPin,
  Calendar,
  SlidersHorizontal,
  Grid,
  List,
  Camera,
  Navigation,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { GeoPhotoEntry, FilterSortOptions } from '../types';
import { formatCoordinates, calculateDistanceKm, formatDistance } from '../services/gpsUtils';

interface EntriesGalleryProps {
  entries: GeoPhotoEntry[];
  currentGps: { lat: number | null; lng: number | null };
  onSelectEntry: (entry: GeoPhotoEntry) => void;
  onToggleStar: (entry: GeoPhotoEntry) => void;
  onDeleteEntry: (id: string) => void;
  onOpenCapture: () => void;
}

export const EntriesGallery: React.FC<EntriesGalleryProps> = ({
  entries,
  currentGps,
  onSelectEntry,
  onToggleStar,
  onDeleteEntry,
  onOpenCapture,
}) => {
  const [filters, setFilters] = useState<FilterSortOptions>({
    search: '',
    tag: 'all',
    sortBy: 'newest',
    onlyStarred: false,
  });

  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Extract unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [entries]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        if (filters.onlyStarred && !entry.starred) return false;
        if (filters.tag !== 'all' && !entry.tags?.includes(filters.tag)) return false;
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const matchNotes = entry.notes?.toLowerCase().includes(q);
          const matchLocation = entry.locationName?.toLowerCase().includes(q);
          const matchCoords = `${entry.latitude},${entry.longitude}`.includes(q);
          const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchNotes && !matchLocation && !matchCoords && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'newest') return b.timestamp - a.timestamp;
        if (filters.sortBy === 'oldest') return a.timestamp - b.timestamp;
        if (filters.sortBy === 'nearMe') {
          if (currentGps.lat === null || currentGps.lng === null) return b.timestamp - a.timestamp;
          const distA = calculateDistanceKm(currentGps.lat, currentGps.lng, a.latitude, a.longitude);
          const distB = calculateDistanceKm(currentGps.lat, currentGps.lng, b.latitude, b.longitude);
          return distA - distB;
        }
        return 0;
      });
  }, [entries, filters, currentGps]);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4">
      {/* Controls & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl">
        {/* Search & Layout Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search notes, coordinates, tags, location..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'grid'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'list'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters & Sorting row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          {/* Tag filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs no-scrollbar">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, tag: 'all' }))}
              className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition ${
                filters.tag === 'all'
                  ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
              }`}
            >
              All ({entries.length})
            </button>

            <button
              onClick={() => setFilters((prev) => ({ ...prev, onlyStarred: !prev.onlyStarred }))}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 whitespace-nowrap transition ${
                filters.onlyStarred
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Starred</span>
            </button>

            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilters((prev) => ({ ...prev, tag }))}
                className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition ${
                  filters.tag === tag
                    ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 ml-auto text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as FilterSortOptions['sortBy'],
                }))
              }
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="nearMe">Nearest to GPS Location</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entries List / Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              {entries.length === 0 ? 'No Geotagged Photos Yet' : 'No Matching Photos Found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {entries.length === 0
                ? 'Capture photos with precise GPS coordinates, timestamps, and field notes. All saved securely to your offline database.'
                : 'Try adjusting your search query or tag filters.'}
            </p>
          </div>
          {entries.length === 0 && (
            <button
              onClick={onOpenCapture}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 transition"
            >
              <Camera className="w-4 h-4" />
              Open Camera & Capture First Entry
            </button>
          )}
        </div>
      ) : viewLayout === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredEntries.map((entry) => {
            const distance =
              currentGps.lat !== null && currentGps.lng !== null
                ? calculateDistanceKm(currentGps.lat, currentGps.lng, entry.latitude, entry.longitude)
                : null;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="group bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-sky-500/50 hover:shadow-sky-500/10 transition-all cursor-pointer flex flex-col"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-4/3 bg-slate-950 overflow-hidden">
                  <img
                    src={entry.photoThumbnail || entry.photoDataUrl}
                    alt="Geotagged thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />

                  {/* Star Badge */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(entry);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition ${
                      entry.starred
                        ? 'bg-amber-500/80 text-slate-950'
                        : 'bg-slate-950/60 text-white hover:bg-slate-900'
                    }`}
                    title={entry.starred ? 'Starred' : 'Star'}
                  >
                    <Star className={`w-3.5 h-3.5 ${entry.starred ? 'fill-current' : ''}`} />
                  </button>

                  {/* Coordinate Overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2 pt-5 flex items-center justify-between text-[10px] font-mono text-slate-200">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{formatCoordinates(entry.latitude, entry.longitude, 3)}</span>
                    </span>
                    {distance !== null && (
                      <span className="text-emerald-400 font-semibold shrink-0">
                        {formatDistance(distance)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 flex flex-col flex-1 justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {entry.createdAtFormatted}
                      </span>
                      <span>±{entry.accuracy}m</span>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {entry.notes || (
                        <span className="text-slate-500 italic">No notes added</span>
                      )}
                    </p>
                  </div>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-sky-400 border border-slate-800 truncate"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-[10px] text-slate-500">
                          +{entry.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Layout */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden shadow-lg">
          {filteredEntries.map((entry) => {
            const distance =
              currentGps.lat !== null && currentGps.lng !== null
                ? calculateDistanceKm(currentGps.lat, currentGps.lng, entry.latitude, entry.longitude)
                : null;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="p-3 sm:p-4 hover:bg-slate-850/60 transition flex items-center gap-3 sm:gap-4 cursor-pointer group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                  <img
                    src={entry.photoThumbnail || entry.photoDataUrl}
                    alt="thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                        {formatCoordinates(entry.latitude, entry.longitude, 4)}
                      </span>
                      {distance !== null && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                          {formatDistance(distance)} away
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {entry.createdAtFormatted}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-1 mb-1.5">
                    {entry.notes || <span className="text-slate-500 italic">No notes recorded</span>}
                  </p>

                  <div className="flex items-center gap-2">
                    {entry.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-sky-400 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Star Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(entry);
                  }}
                  className={`p-2 rounded-xl transition ${
                    entry.starred
                      ? 'text-amber-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Star className={`w-4 h-4 ${entry.starred ? 'fill-current' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
