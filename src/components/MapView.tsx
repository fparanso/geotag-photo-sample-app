import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Crosshair,
  Layers,
  ExternalLink,
  Star,
  Search,
  Calendar,
  Compass,
  Maximize2,
  Tag,
  ChevronRight,
  Info,
  Layers2,
  Eye,
  Route,
} from 'lucide-react';
import { GeoPhotoEntry } from '../types';
import {
  formatCoordinates,
  calculateDistanceKm,
  formatDistance,
  getMapLinks,
} from '../services/gpsUtils';

interface MapViewProps {
  entries: GeoPhotoEntry[];
  currentGps: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
  };
  onSelectEntry: (entry: GeoPhotoEntry) => void;
  onOpenCapture: () => void;
}

type MapTileStyle = 'osm' | 'osm_hot' | 'satellite' | 'dark' | 'topo';

interface TileProvider {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const TILE_PROVIDERS: Record<MapTileStyle, TileProvider> = {
  osm: {
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  osm_hot: {
    name: 'OpenStreetMap (Humanitarian)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/" target="_blank" rel="noopener noreferrer">HOT</a>',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Aerial (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  dark: {
    name: 'Dark Canvas (CartoDB)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  topo: {
    name: 'Topographic (OpenTopoMap)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 17,
  },
};

export const MapView: React.FC<MapViewProps> = ({
  entries,
  currentGps,
  onSelectEntry,
  onOpenCapture,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  const [selectedEntry, setSelectedEntry] = useState<GeoPhotoEntry | null>(null);
  const [activeTileStyle, setActiveTileStyle] = useState<MapTileStyle>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPhotoListDrawer, setShowPhotoListDrawer] = useState<boolean>(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [entries]);

  // Filter entries based on search and tag
  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedTag !== 'all' && !entry.tags?.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNotes = entry.notes?.toLowerCase().includes(q);
        const matchLoc = entry.locationName?.toLowerCase().includes(q);
        const matchCoords = `${entry.latitude},${entry.longitude}`.includes(q);
        const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchNotes && !matchLoc && !matchCoords && !matchTags) return false;
      }
      return true;
    });
  }, [entries, selectedTag, searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: current GPS, first entry, or fallback SF
    const initialLat = currentGps.lat ?? (entries[0]?.latitude ?? 37.7749);
    const initialLng = currentGps.lng ?? (entries[0]?.longitude ?? -122.4194);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: entries.length > 0 ? 14 : 12,
      zoomControl: false,
    });

    const initialProvider = TILE_PROVIDERS[activeTileStyle];
    const tileLayer = L.tileLayer(initialProvider.url, {
      attribution: initialProvider.attribution,
      maxZoom: initialProvider.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Close preview on clicking anywhere on the empty map
    map.on('click', (e) => {
      // @ts-expect-error leaflet event target check
      if (e.originalEvent?.target?.classList?.contains('leaflet-container')) {
        setSelectedEntry(null);
      }
    });

    // Resize map appropriately after mounting
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when user switches style
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[activeTileStyle];
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeTileStyle]);

  // Plot and Update Photo Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    markersMapRef.current.clear();

    if (visibleEntries.length === 0) return;

    const bounds = L.latLngBounds([]);

    visibleEntries.forEach((entry) => {
      bounds.extend([entry.latitude, entry.longitude]);

      const isSelected = selectedEntry?.id === entry.id;

      // Custom DivIcon marker with thumbnail and high-contrast pin border
      const customIcon = L.divIcon({
        className: 'custom-photo-pin',
        html: `
          <div class="relative group cursor-pointer transition-transform duration-200 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'
          }">
            <div style="
              width: ${isSelected ? '52px' : '44px'};
              height: ${isSelected ? '52px' : '44px'};
              border-radius: 14px;
              overflow: hidden;
              border: ${isSelected ? '3.5px solid #38bdf8' : '2.5px solid #ffffff'};
              box-shadow: ${
                isSelected
                  ? '0 0 20px rgba(56, 189, 248, 0.8), 0 8px 16px rgba(0,0,0,0.8)'
                  : '0 4px 12px rgba(0,0,0,0.6)'
              };
              background: #0f172a;
              position: relative;
            ">
              <img
                src="${entry.photoThumbnail || entry.photoDataUrl}"
                alt="Entry"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
              ${
                entry.starred
                  ? `<div style="
                      position: absolute;
                      top: 2px;
                      right: 2px;
                      background: rgba(245, 158, 11, 0.95);
                      border-radius: 9999px;
                      width: 14px;
                      height: 14px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 9px;
                      color: #fff;
                    ">★</div>`
                  : ''
              }
              <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: ${isSelected ? '#38bdf8' : '#0284c7'};
              "></div>
            </div>
            <!-- Pin Pointer Arrow -->
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid ${isSelected ? '#38bdf8' : '#ffffff'};
              margin: 0 auto;
              filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
            "></div>
          </div>
        `,
        iconSize: [isSelected ? 52 : 44, isSelected ? 59 : 51],
        iconAnchor: [isSelected ? 26 : 22, isSelected ? 59 : 51],
      });

      const marker = L.marker([entry.latitude, entry.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.on('click', () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }
        setSelectedEntry(entry);
        // Pan map smoothly to tapped marker
        map.panTo([entry.latitude, entry.longitude], { animate: true, duration: 0.5 });
      });

      markersLayer.addLayer(marker);
      markersMapRef.current.set(entry.id, marker);
    });
  }, [visibleEntries, selectedEntry]);

  // Update Live Current User GPS Indicator
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentGps.lat !== null && currentGps.lng !== null) {
      const latlng: L.LatLngExpression = [currentGps.lat, currentGps.lng];

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#0ea5e9',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 2.5,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(latlng);
      }

      if (currentGps.accuracy) {
        if (!userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current = L.circle(latlng, {
            radius: currentGps.accuracy,
            color: '#0ea5e9',
            fillColor: '#38bdf8',
            fillOpacity: 0.15,
            weight: 1,
          }).addTo(map);
        } else {
          userAccuracyCircleRef.current.setLatLng(latlng);
          userAccuracyCircleRef.current.setRadius(currentGps.accuracy);
        }
      }
    }
  }, [currentGps.lat, currentGps.lng, currentGps.accuracy]);

  // Center on Current GPS location
  const handleCenterUser = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    if (mapInstanceRef.current && currentGps.lat !== null && currentGps.lng !== null) {
      mapInstanceRef.current.setView([currentGps.lat, currentGps.lng], 16, { animate: true });
    }
  };

  // Fit all visible photos in view
  const handleFitAll = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    if (!mapInstanceRef.current || visibleEntries.length === 0) return;
    const bounds = L.latLngBounds(visibleEntries.map((e) => [e.latitude, e.longitude]));
    if (currentGps.lat !== null && currentGps.lng !== null) {
      bounds.extend([currentGps.lat, currentGps.lng]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  };

  // Select entry from bottom carousel
  const handleSelectFromCarousel = (entry: GeoPhotoEntry) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    setSelectedEntry(entry);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([entry.latitude, entry.longitude], 16, { animate: true });
    }
  };

  // Calculate distance from user to selected entry
  const distanceToSelected = useMemo(() => {
    if (!selectedEntry || currentGps.lat === null || currentGps.lng === null) return null;
    const distKm = calculateDistanceKm(
      currentGps.lat,
      currentGps.lng,
      selectedEntry.latitude,
      selectedEntry.longitude
    );
    return formatDistance(distKm);
  }, [selectedEntry, currentGps]);

  const selectedMapLinks = useMemo(() => {
    if (!selectedEntry) return null;
    return getMapLinks(selectedEntry.latitude, selectedEntry.longitude);
  }, [selectedEntry]);

  return (
    <div
      id="map-view-container"
      className="relative w-full h-[calc(100dvh-105px)] sm:h-[calc(100vh-105px)] bg-slate-950 overflow-hidden flex flex-col"
    >
      {/* Search & Tag Filter Bar on Map */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-4 sm:w-80 z-20 space-y-2 pointer-events-auto">
        <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search map markers..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowPhotoListDrawer((prev) => !prev)}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition ${
              showPhotoListDrawer
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle photo list drawer"
          >
            <Layers2 className="w-4 h-4" />
            <span className="font-semibold text-[11px] hidden sm:inline">
              {visibleEntries.length}
            </span>
          </button>
        </div>

        {/* Tag Pills Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            <button
              onClick={() => setSelectedTag('all')}
              className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium border backdrop-blur-md shadow transition ${
                selectedTag === 'all'
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              All Pins ({entries.length})
            </button>
            {allTags.map((tag) => {
              const count = entries.filter((e) => e.tags?.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                  className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium border backdrop-blur-md shadow transition ${
                    selectedTag === tag
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Controls on Top Right */}
      <div className="absolute top-3 right-3 sm:right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            id="map-layer-switcher-button"
            onClick={() => setShowLayerMenu((prev) => !prev)}
            className={`p-2.5 rounded-xl border backdrop-blur-xl shadow-2xl transition active:scale-95 touch-manipulation ${
              showLayerMenu
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
            title="Map Layer Styles"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Layer Style Menu Popup */}
          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-44 bg-slate-900/95 border border-slate-700 backdrop-blur-2xl rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Map Layer Style
              </div>
              {(Object.keys(TILE_PROVIDERS) as MapTileStyle[]).map((styleKey) => (
                <button
                  key={styleKey}
                  onClick={() => {
                    setActiveTileStyle(styleKey);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                    activeTileStyle === styleKey
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{TILE_PROVIDERS[styleKey].name}</span>
                  {activeTileStyle === styleKey && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center on My GPS Button */}
        <button
          id="map-center-gps-button"
          onClick={handleCenterUser}
          disabled={currentGps.lat === null}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700 backdrop-blur-xl shadow-2xl transition active:scale-95 touch-manipulation disabled:opacity-40"
          title="Center on My GPS Location"
        >
          <Navigation className="w-5 h-5" />
        </button>

        {/* Fit All Photos Button */}
        <button
          id="map-fit-all-button"
          onClick={handleFitAll}
          disabled={visibleEntries.length === 0}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-xl shadow-2xl transition active:scale-95 touch-manipulation disabled:opacity-40"
          title="Fit All Photos in View"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div
        ref={mapContainerRef}
        id="leaflet-map-element"
        className="w-full h-full z-10 select-none"
      />

      {/* Interactive Photo Markers Drawer (Side list / Bottom list) */}
      {showPhotoListDrawer && (
        <div className="absolute top-16 right-3 bottom-24 sm:bottom-4 w-72 sm:w-80 bg-slate-900/95 border border-slate-700 backdrop-blur-2xl rounded-2xl p-3 z-30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              Plotted Photos ({visibleEntries.length})
            </span>
            <button
              onClick={() => setShowPhotoListDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-200 p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {visibleEntries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No matching photos found</p>
            ) : (
              visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleSelectFromCarousel(entry)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                    selectedEntry?.id === entry.id
                      ? 'bg-sky-950/60 border-sky-500 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                    <img
                      src={entry.photoThumbnail || entry.photoDataUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-semibold text-slate-200 truncate">
                        {formatCoordinates(entry.latitude, entry.longitude, 4)}
                      </span>
                      {entry.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {entry.notes || entry.createdAtFormatted}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MARKER PREVIEW BOTTOM SHEET / CARD (Shown when user taps any marker) */}
      {selectedEntry && (
        <div
          id="map-marker-preview-card"
          className="absolute bottom-2 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-[420px] z-30 bg-slate-900/95 border border-slate-700 backdrop-blur-2xl rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto"
        >
          <div className="flex gap-3.5">
            {/* Photo Thumbnail with full inspect badge */}
            <div
              onClick={() => onSelectEntry(selectedEntry)}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-black shrink-0 border-2 border-sky-500/60 relative group cursor-pointer shadow-lg"
            >
              <img
                src={selectedEntry.photoThumbnail || selectedEntry.photoDataUrl}
                alt="Selected Marker Geotag"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-5 h-5 text-white" />
              </div>
              {selectedEntry.starred && (
                <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-500 text-slate-950 shadow">
                  <Star className="w-3 h-3 fill-slate-950" />
                </div>
              )}
            </div>

            {/* Content & Metadata */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                {/* Header with Coordinates & Close */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-100 truncate">
                      {formatCoordinates(selectedEntry.latitude, selectedEntry.longitude, 4)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="text-xs text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
                    title="Close preview"
                  >
                    ✕
                  </button>
                </div>

                {/* Distance Badge & Timestamp */}
                <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400">
                  <span>{selectedEntry.createdAtFormatted}</span>
                  {distanceToSelected && (
                    <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-mono text-[10px] font-semibold border border-sky-800/60">
                      {distanceToSelected} away
                    </span>
                  )}
                </div>

                {/* Notes Preview */}
                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed mb-2 font-normal">
                  {selectedEntry.notes || (
                    <span className="text-slate-500 italic text-[11px]">No field notes recorded</span>
                  )}
                </p>

                {/* Tag Pills */}
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedEntry.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-medium border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {selectedEntry.tags.length > 3 && (
                      <span className="text-[9px] text-slate-500 font-medium">
                        +{selectedEntry.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  id="preview-view-details-button"
                  onClick={() => onSelectEntry(selectedEntry)}
                  className="flex-1 py-1.5 px-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-sky-600/30 touch-manipulation"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {selectedMapLinks && (
                  <a
                    href={selectedMapLinks.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-700 transition flex items-center justify-center"
                    title="Open in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Banner if no photos exist */}
      {entries.length === 0 && (
        <div className="absolute top-16 left-4 right-4 sm:right-auto sm:max-w-sm z-20 bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-slate-300 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-100 mb-1">No Geotagged Photos Yet</p>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Photos you capture with GPS enabled will automatically appear as pins on this interactive map.
              </p>
              <button
                id="empty-state-capture-button"
                onClick={onOpenCapture}
                className="w-full py-2 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-sky-600/25 touch-manipulation"
              >
                Take Your First Geotagged Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Photo Carousel when NO marker is actively opened */}
      {!selectedEntry && visibleEntries.length > 0 && !showPhotoListDrawer && (
        <div className="absolute bottom-2 inset-x-3 sm:inset-x-6 z-20 pointer-events-auto">
          <div className="bg-slate-900/85 border border-slate-800/90 backdrop-blur-xl rounded-2xl p-2 shadow-2xl flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="px-2 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Browse
              </span>
              <span className="text-[11px] font-mono text-sky-400 font-bold">
                {visibleEntries.length} pins
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 shrink-0" />

            <div className="flex items-center gap-2">
              {visibleEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleSelectFromCarousel(entry)}
                  className="flex items-center gap-2 p-1 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-left shrink-0 transition active:scale-95 touch-manipulation group"
                  title="Click to view marker on map"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-700">
                    <img
                      src={entry.photoThumbnail || entry.photoDataUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="pr-2 max-w-[110px]">
                    <div className="text-[10px] font-mono font-semibold text-slate-200 truncate">
                      {formatCoordinates(entry.latitude, entry.longitude, 2)}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {entry.notes || entry.createdAtFormatted}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
