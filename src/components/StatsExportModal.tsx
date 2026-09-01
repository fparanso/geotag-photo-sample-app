import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  FileJson,
  FileSpreadsheet,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { GeoPhotoEntry } from '../types';
import {
  getStorageStats,
  exportToJSON,
  exportToGeoJSON,
  exportToCSV,
  importFromJSON,
  clearAllEntries,
} from '../db/indexedDB';

interface StatsExportModalProps {
  entries: GeoPhotoEntry[];
  onClose: () => void;
  onRefreshData: () => Promise<void>;
}

export const StatsExportModal: React.FC<StatsExportModalProps> = ({
  entries,
  onClose,
  onRefreshData,
}) => {
  const [stats, setStats] = useState<{ count: number; estimatedSizeMB: number; quotaMB?: number }>({
    count: entries.length,
    estimatedSizeMB: 0,
  });
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStorageStats().then(setStats);
  }, [entries]);

  const handleExportJSON = () => {
    exportToJSON(entries);
  };

  const handleExportGeoJSON = () => {
    exportToGeoJSON(entries);
  };

  const handleExportCSV = () => {
    exportToCSV(entries);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Importing entries to local database...');

    try {
      const count = await importFromJSON(file);
      await onRefreshData();
      setImportStatus(`Successfully restored ${count} entries!`);
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: unknown) {
      console.error('Import failed:', err);
      setImportStatus('Error importing file. Please verify JSON format.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleClearDatabase = async () => {
    await clearAllEntries();
    await onRefreshData();
    setShowConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Local Database & Storage</h3>
              <p className="text-[11px] text-slate-400">Offline IndexedDB storage and backups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Storage Overview Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                Stored Entries
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-slate-100">{stats.count}</span>
                <span className="text-xs text-slate-400">photos</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                IndexedDB Usage
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-sky-400">
                  {stats.estimatedSizeMB}
                </span>
                <span className="text-xs text-slate-400">MB</span>
              </div>
              {stats.quotaMB && (
                <span className="text-[10px] text-slate-500 block">
                  Quota: ~{stats.quotaMB.toLocaleString()} MB
                </span>
              )}
            </div>
          </div>

          {/* Offline Persistence Status Card */}
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-300">Offline-First IndexedDB Engine</h4>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed mt-0.5">
                All photos, coordinates, and notes are stored 100% locally on your device. Works completely without an active internet connection.
              </p>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Export & Backup</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleExportJSON}
                disabled={entries.length === 0}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center transition"
              >
                <FileJson className="w-5 h-5 text-sky-400 mb-1" />
                <span className="text-xs font-semibold text-slate-200">Full JSON</span>
                <span className="text-[10px] text-slate-500">Backup & Restore</span>
              </button>

              <button
                onClick={handleExportGeoJSON}
                disabled={entries.length === 0}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center transition"
              >
                <MapPin className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-semibold text-slate-200">GeoJSON</span>
                <span className="text-[10px] text-slate-500">GIS & QGIS / Earth</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={entries.length === 0}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center transition"
              >
                <FileSpreadsheet className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-xs font-semibold text-slate-200">CSV Sheet</span>
                <span className="text-[10px] text-slate-500">Excel / Numbers</span>
              </button>
            </div>
          </div>

          {/* Import JSON Backup */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Restore / Import</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-200 transition"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>{isImporting ? 'Importing JSON...' : 'Import JSON Backup File'}</span>
            </button>
            {importStatus && (
              <p className="text-[11px] text-sky-400 text-center">{importStatus}</p>
            )}
          </div>

          {/* Danger Zone: Clear Local Database */}
          <div className="pt-2 border-t border-slate-800/80">
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={entries.length === 0}
                className="w-full py-2 px-3 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 disabled:opacity-30 border border-rose-900/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Offline Database</span>
              </button>
            ) : (
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-center space-y-2">
                <p className="text-xs text-rose-300 font-semibold">
                  Are you sure? This will delete all {entries.length} stored photos locally.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleClearDatabase}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Yes, Wipe All Data
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
