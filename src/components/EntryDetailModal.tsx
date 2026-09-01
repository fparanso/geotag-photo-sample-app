import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Compass,
  Copy,
  Check,
  ExternalLink,
  Download,
  Trash2,
  Edit3,
  Save,
  Star,
  Tag,
  Share2,
} from 'lucide-react';
import { GeoPhotoEntry } from '../types';
import { formatCoordinates, toDMS, getMapLinks } from '../services/gpsUtils';

interface EntryDetailModalProps {
  entry: GeoPhotoEntry;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<GeoPhotoEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>(entry.notes);
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const mapLinks = getMapLinks(entry.latitude, entry.longitude);

  const handleCopyCoords = () => {
    const text = `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    await onUpdate(entry.id, { notes: notes.trim(), tags });
    setIsEditingNotes(false);
  };

  const handleToggleStar = async () => {
    await onUpdate(entry.id, { starred: !entry.starred });
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().startsWith('#')
      ? newTagInput.trim().toLowerCase()
      : `#${newTagInput.trim().toLowerCase()}`;
    if (cleanTag.length > 1 && !tags.includes(cleanTag)) {
      const updated = [...tags, cleanTag];
      setTags(updated);
      onUpdate(entry.id, { tags: updated });
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    onUpdate(entry.id, { tags: updated });
  };

  const handleDownloadPhoto = () => {
    const link = document.createElement('a');
    link.href = entry.photoDataUrl;
    const dateSlug = new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-');
    link.download = `geophoto_${entry.latitude.toFixed(4)}_${entry.longitude.toFixed(4)}_${dateSlug}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(entry.id);
      onClose();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStar}
              className={`p-1.5 rounded-lg border transition ${
                entry.starred
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={entry.starred ? 'Starred entry' : 'Star this entry'}
            >
              <Star className={`w-4 h-4 ${entry.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                {entry.locationName || 'Geotagged Photo Entry'}
              </h3>
              <p className="text-[11px] text-slate-400">{entry.createdAtFormatted}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPhoto}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Download full photo"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Main Photo View */}
          <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 max-h-96 flex items-center justify-center">
            <img
              src={entry.photoDataUrl}
              alt="Geotagged"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* GPS Coordinates & Technical Telemetry */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">GPS Coordinates</span>
              </div>

              {/* Copy coordinates */}
              <button
                onClick={handleCopyCoords}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Decimal'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">Decimal Degrees</span>
                <span className="text-slate-100 font-semibold">
                  {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                </span>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">DMS (Degrees Min Sec)</span>
                <span className="text-slate-100">
                  {toDMS(entry.latitude, true)}, {toDMS(entry.longitude, false)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[10px]">ACCURACY</span>±{entry.accuracy} m
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ALTITUDE</span>
                {entry.altitude !== null ? `${entry.altitude} m` : 'N/A'}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SPEED</span>
                {entry.speed !== null ? `${(entry.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
              </div>
            </div>

            {/* Navigation links */}
            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-2">
              <a
                href={mapLinks.google}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 rounded-lg border border-slate-800 transition"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={mapLinks.osm}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-lg border border-slate-800 transition"
              >
                <span>OpenStreetMap</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={mapLinks.apple}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
              >
                <span>Apple Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Notes & Observations</span>
              {!isEditingNotes ? (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Notes</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Notes</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {entry.notes || <span className="text-slate-600 italic">No notes recorded for this photo.</span>}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              <span>Tags</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-lg bg-sky-950/60 text-sky-300 border border-sky-800/60 flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-sky-500 hover:text-sky-200 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTagInput.trim()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-rose-950/30 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Entry</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400">Confirm deletion?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
