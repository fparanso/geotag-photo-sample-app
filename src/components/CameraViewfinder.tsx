import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Grid,
  Upload,
  Navigation,
  Compass,
  AlertCircle,
  Settings2,
  Crosshair,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { GpsLocationState } from '../types';
import { formatCoordinates } from '../services/gpsUtils';
import { fileToDataUrl } from '../services/imageUtils';

interface CameraViewfinderProps {
  gps: GpsLocationState & {
    refreshLocation: () => void;
    setManualCoordinates: (lat: number, lng: number, accuracy?: number) => void;
  };
  onPhotoCaptured: (photoDataUrl: string, capturedGps: {
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
  }) => void;
  entriesCount: number;
  onOpenEntries: () => void;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  gps,
  onPhotoCaptured,
  entriesCount,
  onOpenEntries,
}) => {
  const {
    videoRef,
    status: cameraStatus,
    facingMode,
    torch,
    torchSupported,
    errorMessage: cameraError,
    startCamera,
    switchCamera,
    toggleTorch,
    captureFrame,
  } = useCamera();

  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCoordOverride, setShowCoordOverride] = useState<boolean>(false);
  const [manualLat, setManualLat] = useState<string>(
    gps.latitude ? gps.latitude.toString() : '37.7749'
  );
  const [manualLng, setManualLng] = useState<string>(
    gps.longitude ? gps.longitude.toString() : '-122.4194'
  );
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start camera on mount
  useEffect(() => {
    startCamera('environment');
  }, [startCamera]);

  // Update default manual lat/lng when real GPS arrives
  useEffect(() => {
    if (gps.latitude !== null && gps.longitude !== null) {
      setManualLat(gps.latitude.toFixed(6));
      setManualLng(gps.longitude.toFixed(6));
    }
  }, [gps.latitude, gps.longitude]);

  // Shutter action
  const handleShutter = () => {
    if (isCapturing) return;

    // Haptic vibration feedback if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }

    setIsCapturing(true);

    const frame = captureFrame();

    // Fallback coordinates if GPS is unavailable or still acquiring
    const lat = gps.latitude ?? 37.774929;
    const lng = gps.longitude ?? -122.419416;
    const accuracy = gps.accuracy ?? 15;

    setTimeout(() => {
      setIsCapturing(false);
      if (frame) {
        onPhotoCaptured(frame, {
          lat,
          lng,
          accuracy,
          altitude: gps.altitude,
          heading: gps.heading,
          speed: gps.speed,
        });
      } else {
        // Fallback to triggering file input if stream capture failed
        fileInputRef.current?.click();
      }
    }, 150);
  };

  // Handle fallback file upload / native capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const dataUrl = await fileToDataUrl(file);
      const lat = gps.latitude ?? parseFloat(manualLat) ?? 37.774929;
      const lng = gps.longitude ?? parseFloat(manualLng) ?? -122.419416;
      const accuracy = gps.accuracy ?? 15;

      onPhotoCaptured(dataUrl, {
        lat,
        lng,
        accuracy,
        altitude: gps.altitude,
        heading: gps.heading,
        speed: gps.speed,
      });
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyManualCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      gps.setManualCoordinates(lat, lng, 5);
      setShowCoordOverride(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-105px)] max-h-[900px] flex flex-col bg-black overflow-hidden select-none">
      {/* Hidden file input for camera/gallery fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Viewport Container */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Live Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Shutter flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-20 pointer-events-none animate-ping opacity-80" />
        )}

        {/* Camera fallback / error / initializing state */}
        {cameraStatus !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/90 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-sky-400">
              {cameraStatus === 'starting' ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-base font-semibold text-slate-100 mb-1">
              {cameraStatus === 'starting'
                ? 'Initializing Field Camera...'
                : 'Camera Stream Restricted / Inactive'}
            </h3>

            <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
              {cameraError ||
                'If camera permission is restricted in this preview, you can use the file picker or native device camera button below.'}
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => startCamera()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg shadow-sky-600/30 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera Stream
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700 transition"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                Use Device Camera / Gallery
              </button>
            </div>
          </div>
        )}

        {/* Rule of Thirds Grid Overlay */}
        {showGrid && cameraStatus === 'active' && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div className="" />
          </div>
        )}

        {/* Center Target Reticle */}
        {cameraStatus === 'active' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-40">
            <div className="w-12 h-12 border border-sky-400/60 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
            </div>
          </div>
        )}

        {/* Top HUD: Live GPS telemetry & controls */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-20 pointer-events-auto">
          {/* Live GPS Telemetry Badge */}
          <div className="bg-slate-950/80 backdrop-blur-md rounded-xl p-2 px-3 border border-slate-800/90 text-slate-200 shadow-xl max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  gps.status === 'locked'
                    ? 'bg-emerald-400 animate-pulse'
                    : gps.status === 'acquiring'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {gps.status === 'locked'
                  ? 'GPS Locked'
                  : gps.status === 'acquiring'
                  ? 'Acquiring GPS...'
                  : 'GPS Fallback'}
              </span>
              <button
                onClick={() => setShowCoordOverride(!showCoordOverride)}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline ml-auto pl-1"
                title="Adjust or simulate coordinates"
              >
                Edit
              </button>
            </div>

            <div className="font-mono text-xs font-semibold text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
              <Navigation className="w-3 h-3 text-sky-400 shrink-0" />
              <span>
                {gps.latitude !== null && gps.longitude !== null
                  ? formatCoordinates(gps.latitude, gps.longitude, 4)
                  : `${manualLat}, ${manualLng}`}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono">
              {gps.accuracy !== null && (
                <span>Acc: ±{Math.round(gps.accuracy)}m</span>
              )}
              {gps.altitude !== null && (
                <span>Alt: {Math.round(gps.altitude)}m</span>
              )}
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          {/* Quick HUD Tool Buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
                showGrid
                  ? 'bg-sky-600/80 text-white border-sky-400/50 shadow-lg shadow-sky-600/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-900'
              }`}
              title="Toggle Rule of Thirds Grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
                  torch
                    ? 'bg-amber-500/90 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
                title="Toggle Torch / Flash"
              >
                {torch ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={switchCamera}
              className="p-2.5 rounded-xl bg-slate-950/70 text-slate-300 border border-slate-800 backdrop-blur-md hover:bg-slate-900 hover:text-white transition"
              title="Switch Front/Rear Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manual Coordinates Override Modal Popover */}
        {showCoordOverride && (
          <div className="absolute top-20 left-3 right-3 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl z-30 text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-xs text-slate-100">
                  Custom Location Override
                </span>
              </div>
              <button
                onClick={() => setShowCoordOverride(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Set custom coordinates if GPS is restricted in sandbox, indoor, or for testing.
            </p>

            <form onSubmit={handleApplyManualCoordinates} className="space-y-2.5">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Latitude (-90 to 90)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Longitude (-180 to 180)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Set Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gps.refreshLocation();
                    setShowCoordOverride(false);
                  }}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Use Real GPS
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Controls Dock */}
      <div className="h-24 bg-slate-950/95 border-t border-slate-900 px-6 flex items-center justify-between z-20">
        {/* Left Action: Gallery & Logbook Shortcut */}
        <button
          onClick={onOpenEntries}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition group relative"
          title="Open Logbook"
        >
          <div className="relative">
            <Camera className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
            {entriesCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-sky-500 text-slate-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {entriesCount > 99 ? '99+' : entriesCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 text-slate-400">Log</span>
        </button>

        {/* Center Action: Big Shutter Button */}
        <button
          onClick={handleShutter}
          disabled={isCapturing}
          className="w-18 h-18 rounded-full bg-slate-900 border-4 border-slate-700 p-1 flex items-center justify-center shadow-2xl hover:border-sky-400 transition-all active:scale-95 group focus:outline-none"
          title="Take Geotagged Photo"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-sky-500 to-emerald-400 group-hover:from-sky-400 group-hover:to-emerald-300 flex items-center justify-center shadow-lg shadow-sky-500/30 transition">
            <div className="w-6 h-6 rounded-full bg-white/20 group-hover:bg-white/40 transition" />
          </div>
        </button>

        {/* Right Action: File Upload / Native Camera Trigger */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Select from gallery or native device camera"
        >
          <Upload className="w-5 h-5 text-emerald-400" />
          <span className="text-[9px] mt-0.5 text-slate-400">Import</span>
        </button>
      </div>
    </div>
  );
};
