import { GeoPhotoEntry } from '../types';

const DB_NAME = 'geophoto_log_db';
const DB_VERSION = 1;
const STORE_NAME = 'photo_entries';

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('latitude', 'latitude', { unique: false });
        store.createIndex('longitude', 'longitude', { unique: false });
        store.createIndex('starred', 'starred', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getAllEntries(): Promise<GeoPhotoEntry[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Newest first

    const results: GeoPhotoEntry[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getEntryById(id: string): Promise<GeoPhotoEntry | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveEntry(entry: GeoPhotoEntry): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(entry);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateEntry(id: string, updates: Partial<GeoPhotoEntry>): Promise<GeoPhotoEntry> {
  const current = await getEntryById(id);
  if (!current) {
    throw new Error(`Entry with id ${id} not found`);
  }

  const updated: GeoPhotoEntry = {
    ...current,
    ...updates,
  };

  await saveEntry(updated);
  return updated;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearAllEntries(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getStorageStats(): Promise<{ count: number; estimatedSizeMB: number; quotaMB?: number }> {
  const entries = await getAllEntries();
  let totalChars = 0;
  for (const entry of entries) {
    totalChars += (entry.photoDataUrl?.length || 0);
    totalChars += (entry.photoThumbnail?.length || 0);
    totalChars += (entry.notes?.length || 0);
  }
  // Rough UTF-16 / base64 bytes approximation
  const estimatedBytes = totalChars * 2;
  const estimatedSizeMB = Number((estimatedBytes / (1024 * 1024)).toFixed(2));

  let quotaMB: number | undefined;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) {
        quotaMB = Math.round(estimate.quota / (1024 * 1024));
      }
    } catch {
      // ignore
    }
  }

  return {
    count: entries.length,
    estimatedSizeMB,
    quotaMB
  };
}

// Export helpers
export function exportToJSON(entries: GeoPhotoEntry[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `geophoto-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportToGeoJSON(entries: GeoPhotoEntry[]): void {
  const geojson = {
    type: 'FeatureCollection',
    features: entries.map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [e.longitude, e.latitude, e.altitude ?? 0],
      },
      properties: {
        id: e.id,
        timestamp: e.timestamp,
        formattedDate: e.createdAtFormatted,
        notes: e.notes,
        tags: e.tags.join(', '),
        accuracy: e.accuracy,
        locationName: e.locationName || '',
      },
    })),
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `geophoto-points-${new Date().toISOString().slice(0, 10)}.geojson`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportToCSV(entries: GeoPhotoEntry[]): void {
  const headers = ['ID', 'Timestamp', 'Date UTC', 'Latitude', 'Longitude', 'Accuracy (m)', 'Altitude (m)', 'Tags', 'Notes'];
  const rows = entries.map((e) => [
    `"${e.id}"`,
    e.timestamp,
    `"${e.createdAtFormatted}"`,
    e.latitude,
    e.longitude,
    e.accuracy,
    e.altitude ?? '',
    `"${e.tags.join(', ')}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `geophoto-export-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('Invalid JSON format: Expected an array of GeoPhoto entries');
        }

        let importedCount = 0;
        for (const item of data) {
          if (item.id && typeof item.latitude === 'number' && typeof item.longitude === 'number') {
            await saveEntry(item);
            importedCount++;
          }
        }
        resolve(importedCount);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
