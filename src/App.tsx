import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CameraViewfinder } from './components/CameraViewfinder';
import { CaptureReviewModal } from './components/CaptureReviewModal';
import { EntriesGallery } from './components/EntriesGallery';
import { EntryDetailModal } from './components/EntryDetailModal';
import { MapView } from './components/MapView';
import { StatsExportModal } from './components/StatsExportModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useGps } from './hooks/useGps';
import { GeoPhotoEntry, ViewTab } from './types';
import { getAllEntries, saveEntry, updateEntry, deleteEntry } from './db/indexedDB';

// Define BeforeInstallPromptEvent interface for PWA prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('camera');
  const [entries, setEntries] = useState<GeoPhotoEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEntry, setSelectedEntry] = useState<GeoPhotoEntry | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Review & Save state for newly captured photo
  const [reviewCapture, setReviewCapture] = useState<{
    photoDataUrl: string;
    capturedGps: {
      lat: number;
      lng: number;
      accuracy: number;
      altitude: number | null;
      heading: number | null;
      speed: number | null;
    };
  } | null>(null);

  // GPS tracking hook
  const gps = useGps();

  // Load all entries from IndexedDB on start
  const loadEntries = useCallback(async () => {
    try {
      const data = await getAllEntries();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Listen for PWA BeforeInstallPromptEvent
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Handle Photo Captured from Viewfinder
  const handlePhotoCaptured = (
    photoDataUrl: string,
    capturedGps: {
      lat: number;
      lng: number;
      accuracy: number;
      altitude: number | null;
      heading: number | null;
      speed: number | null;
    }
  ) => {
    setReviewCapture({ photoDataUrl, capturedGps });
  };

  // Save new entry to IndexedDB
  const handleSaveReview = async (entry: GeoPhotoEntry) => {
    await saveEntry(entry);
    await loadEntries();
    setReviewCapture(null);
    setActiveTab('entries'); // Switch to gallery to view newly saved photo
  };

  // Update existing entry
  const handleUpdateEntry = async (id: string, updates: Partial<GeoPhotoEntry>) => {
    const updated = await updateEntry(id, updates);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (selectedEntry && selectedEntry.id === id) {
      setSelectedEntry(updated);
    }
  };

  // Toggle Star
  const handleToggleStar = async (entry: GeoPhotoEntry) => {
    await handleUpdateEntry(entry.id, { starred: !entry.starred });
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
    await loadEntries();
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* PWA Install Banner */}
      {installPrompt && <PWAInstallBanner onInstall={handleInstallPwa} />}

      {/* Header with Navigation and Telemetry Badges */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        entriesCount={entries.length}
        gpsStatus={gps.status}
        latitude={gps.latitude}
        longitude={gps.longitude}
        accuracy={gps.accuracy}
        onRefreshGps={gps.refreshLocation}
        onOpenStats={() => setShowStatsModal(true)}
        canInstallPwa={Boolean(installPrompt)}
        onInstallPwa={handleInstallPwa}
      />

      {/* Main Tab Views */}
      <main className={`flex-1 relative flex flex-col ${activeTab === 'entries' ? 'pb-24 sm:pb-6' : activeTab === 'camera' ? 'pb-20 sm:pb-0' : 'pb-16 sm:pb-0'}`}>
        {activeTab === 'camera' && (
          <CameraViewfinder
            gps={gps}
            onPhotoCaptured={handlePhotoCaptured}
            entriesCount={entries.length}
            onOpenEntries={() => setActiveTab('entries')}
          />
        )}

        {activeTab === 'entries' && (
          <EntriesGallery
            entries={entries}
            currentGps={{ lat: gps.latitude, lng: gps.longitude }}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
            onToggleStar={handleToggleStar}
            onDeleteEntry={handleDeleteEntry}
            onOpenCapture={() => setActiveTab('camera')}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            entries={entries}
            currentGps={{
              lat: gps.latitude,
              lng: gps.longitude,
              accuracy: gps.accuracy,
            }}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
            onOpenCapture={() => setActiveTab('camera')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        entriesCount={entries.length}
      />

      {/* Capture Review & Notes Modal */}
      {reviewCapture && (
        <CaptureReviewModal
          photoDataUrl={reviewCapture.photoDataUrl}
          capturedGps={reviewCapture.capturedGps}
          onSave={handleSaveReview}
          onCancel={() => setReviewCapture(null)}
        />
      )}

      {/* Single Entry Detail Modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
        />
      )}

      {/* Database Management & Exports Modal */}
      {showStatsModal && (
        <StatsExportModal
          entries={entries}
          onClose={() => setShowStatsModal(false)}
          onRefreshData={loadEntries}
        />
      )}
    </div>
  );
}
