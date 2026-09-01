import React, { useEffect, useState } from 'react';
import {
  Camera,
  MapPin,
  ListFilter,
  Map as MapIcon,
  Wifi,
  WifiOff,
  Database,
  DownloadCloud,
  Navigation,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ViewTab, GpsStatus } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  entriesCount: number;
  gpsStatus: GpsStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  onRefreshGps: () => void;
  onOpenStats: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  entriesCount,
  gpsStatus,
  latitude,
  longitude,
  accuracy,
  onRefreshGps,
  onOpenStats,
  canInstallPwa,
  onInstallPwa,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Logo & Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Camera className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-100 truncate">
                GeoPhoto Log
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 shrink-0">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              Offline GPS Camera & Logbook
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Online / Offline status badge */}
          <div
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
              isOnline
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/70 text-amber-300 border-amber-800/60 animate-pulse'
            }`}
            title={isOnline ? 'Online - Features full sync' : 'Offline Mode - Storing 100% locally'}
          >
            {isOnline ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
            <span className="text-[11px] font-medium hidden md:inline">
              {isOnline ? 'Online' : 'Offline DB Ready'}
            </span>
          </div>

          {/* Live GPS badge */}
          <button
            onClick={onRefreshGps}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${
              gpsStatus === 'locked'
                ? 'bg-sky-950/70 text-sky-300 border-sky-800/60 hover:bg-sky-900/60'
                : gpsStatus === 'acquiring'
                ? 'bg-amber-950/70 text-amber-300 border-amber-800/60 animate-pulse'
                : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
            }`}
            title="Click to refresh GPS coordinates"
          >
            <Navigation
              className={`w-3 h-3 ${
                gpsStatus === 'acquiring' ? 'animate-spin text-amber-400' : 'text-sky-400'
              }`}
            />
            <span className="text-[11px] font-mono font-medium">
              {gpsStatus === 'locked' && latitude !== null && longitude !== null
                ? `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`
                : gpsStatus === 'acquiring'
                ? 'Acquiring GPS...'
                : 'No GPS'}
            </span>
            {gpsStatus === 'locked' && accuracy !== null && (
              <span className="text-[10px] text-sky-400/80 hidden lg:inline">
                (±{Math.round(accuracy)}m)
              </span>
            )}
            <RefreshCw className="w-2.5 h-2.5 text-slate-400 hover:text-slate-200 ml-0.5" />
          </button>

          {/* Database / Stats Button */}
          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Manage offline database, backup and exports"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-[11px]">{entriesCount}</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">entries</span>
          </button>

          {/* PWA Install Button (if browser supports install prompt) */}
          {canInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-medium shadow-md shadow-sky-600/20 transition"
              title="Install GeoPhoto Log to your Home Screen"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Install PWA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Tabs (Desktop / Tablet) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 hidden sm:flex border-t border-slate-800/80">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'camera'
              ? 'border-sky-400 text-sky-400 bg-sky-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Capture</span>
        </button>

        <button
          onClick={() => setActiveTab('entries')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'entries'
              ? 'border-sky-400 text-sky-400 bg-sky-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Logbook</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
            {entriesCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'map'
              ? 'border-sky-400 text-sky-400 bg-sky-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Map View</span>
        </button>
      </div>
    </header>
  );
};
