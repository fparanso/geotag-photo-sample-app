export interface GeoPhotoEntry {
  id: string;
  timestamp: number; // Unix epoch ms
  createdAtFormatted: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  photoDataUrl: string; // Base64 data URL
  photoThumbnail: string; // Smaller compressed base64
  notes: string;
  tags: string[];
  locationName?: string;
  watermarked?: boolean;
  starred?: boolean;
}

export type GpsStatus = 'idle' | 'acquiring' | 'locked' | 'error' | 'denied';

export interface GpsLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  status: GpsStatus;
  errorMessage: string | null;
  lastUpdated: number | null;
}

export type CameraStatus = 'idle' | 'starting' | 'active' | 'error' | 'denied';

export interface CameraState {
  status: CameraStatus;
  facingMode: 'environment' | 'user';
  torch: boolean;
  torchSupported: boolean;
  errorMessage: string | null;
}

export type ViewTab = 'camera' | 'entries' | 'map';

export interface FilterSortOptions {
  search: string;
  tag: string;
  sortBy: 'newest' | 'oldest' | 'nearMe';
  onlyStarred: boolean;
}
