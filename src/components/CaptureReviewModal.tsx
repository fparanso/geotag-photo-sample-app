import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Save,
  RotateCcw,
  Tag,
  Mic,
  MicOff,
  Sparkles,
  Check,
  Compass,
  Layers,
  FileText,
} from 'lucide-react';
import { GeoPhotoEntry } from '../types';
import { formatCoordinates, reverseGeocodeOfflineSafe } from '../services/gpsUtils';
import { processAndCompressImage, stampGpsWatermark } from '../services/imageUtils';

interface CaptureReviewModalProps {
  photoDataUrl: string;
  capturedGps: {
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
  };
  onSave: (entry: GeoPhotoEntry) => Promise<void>;
  onCancel: () => void;
}

const PRESET_TAGS = [
  '#fieldwork',
  '#inspection',
  '#site-survey',
  '#sample',
  '#travel',
  '#nature',
  '#hazard',
  '#infrastructure',
];

export const CaptureReviewModal: React.FC<CaptureReviewModalProps> = ({
  photoDataUrl,
  capturedGps,
  onSave,
  onCancel,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#fieldwork']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [burnWatermark, setBurnWatermark] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>('');
  
  const timestamp = Date.now();
  const dateFormatted = new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  // Attempt reverse geocode if online
  useEffect(() => {
    let mounted = true;
    reverseGeocodeOfflineSafe(capturedGps.lat, capturedGps.lng).then((name) => {
      if (mounted && name) {
        setLocationName(name);
      }
    });
    return () => {
      mounted = false;
    };
  }, [capturedGps.lat, capturedGps.lng]);

  // Voice to text recognition for notes
  const toggleSpeechRecognition = () => {
    // @ts-expect-error webkitSpeechRecognition fallback
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: { results: { [x: string]: { [x: string]: { transcript: string } } } }) => {
        const transcript = event.results[0][0].transcript;
        setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const cleanTag = customTagInput.trim().startsWith('#')
      ? customTagInput.trim().toLowerCase()
      : `#${customTagInput.trim().toLowerCase()}`;

    if (cleanTag.length > 1 && !selectedTags.includes(cleanTag)) {
      setSelectedTags((prev) => [...prev, cleanTag]);
      setCustomTagInput('');
    }
  };

  const handleSaveEntry = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalPhotoUrl = photoDataUrl;

      // Stamp watermark if chosen
      if (burnWatermark) {
        finalPhotoUrl = await stampGpsWatermark(photoDataUrl, {
          lat: capturedGps.lat,
          lng: capturedGps.lng,
          accuracy: capturedGps.accuracy,
          timestampStr: dateFormatted,
          notes: notes.trim(),
        });
      }

      // Process and generate thumbnail
      const { fullDataUrl, thumbnailDataUrl } = await processAndCompressImage(finalPhotoUrl, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      });

      const newEntry: GeoPhotoEntry = {
        id: 'geo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp,
        createdAtFormatted: dateFormatted,
        latitude: capturedGps.lat,
        longitude: capturedGps.lng,
        accuracy: Math.round(capturedGps.accuracy),
        altitude: capturedGps.altitude ? Math.round(capturedGps.altitude) : null,
        heading: capturedGps.heading ? Math.round(capturedGps.heading) : null,
        speed: capturedGps.speed ? Math.round(capturedGps.speed) : null,
        photoDataUrl: fullDataUrl,
        photoThumbnail: thumbnailDataUrl,
        notes: notes.trim(),
        tags: selectedTags,
        locationName: locationName || undefined,
        watermarked: burnWatermark,
        starred: false,
      };

      await onSave(newEntry);
    } catch (err) {
      console.error('Failed to save geo entry:', err);
      alert('Could not save photo to offline database. Please check device storage.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Review & Save Entry</h3>
              <p className="text-[11px] text-slate-400">Add notes & confirm GPS coordinates</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Photo Preview Card */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video max-h-56 flex items-center justify-center group">
            <img
              src={photoDataUrl}
              alt="Captured"
              className="w-full h-full object-contain bg-black"
            />
            {burnWatermark && (
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs p-1.5 px-2.5 border-t border-sky-500/40 text-[10px] font-mono text-slate-200 flex justify-between items-center">
                <span>📍 {formatCoordinates(capturedGps.lat, capturedGps.lng, 4)}</span>
                <span>±{Math.round(capturedGps.accuracy)}m</span>
              </div>
            )}
          </div>

          {/* GPS Telemetry Grid */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                Coordinates
              </span>
              <span className="font-mono font-semibold text-slate-100">
                {formatCoordinates(capturedGps.lat, capturedGps.lng, 5)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800/60 text-slate-300">
              <div>
                <span className="text-slate-500">Accuracy: </span>±{Math.round(capturedGps.accuracy)}m
              </div>
              <div>
                <span className="text-slate-500">Altitude: </span>
                {capturedGps.altitude ? `${Math.round(capturedGps.altitude)}m` : 'N/A'}
              </div>
              <div className="col-span-2 text-slate-400 flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{dateFormatted}</span>
              </div>
            </div>

            {locationName && (
              <div className="pt-1.5 border-t border-slate-800/60 text-xs text-sky-300 flex items-center gap-1 truncate">
                <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>
            )}
          </div>

          {/* User Notes Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Custom Notes & Field Observations
              </label>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                  isListening
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Voice to text dictation"
              >
                {isListening ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3 text-sky-400" />}
                <span>{isListening ? 'Listening...' : 'Dictate'}</span>
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., North-facing slope inspection. Clear weather, no visible erosion. Soil sample #4 taken."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 leading-relaxed resize-none"
            />
          </div>

          {/* Quick Tags Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                      isSelected
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-medium'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Add custom tag (e.g. project-x)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Watermark Toggle */}
          <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Stamp GPS Telemetry on Photo
                </span>
                <span className="text-[10px] text-slate-500">
                  Embeds coordinate bar directly on bottom of image
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={burnWatermark}
              onChange={(e) => setBurnWatermark(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake
          </button>

          <button
            type="button"
            onClick={handleSaveEntry}
            disabled={isSaving}
            className="flex-2 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving to Offline DB...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Offline Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
