import { useState, useEffect, useCallback, useRef } from 'react';
import { GpsLocationState } from '../types';

export function useGps() {
  const [gpsState, setGpsState] = useState<GpsLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    status: 'acquiring',
    errorMessage: null,
    lastUpdated: null,
  });

  const watchIdRef = useRef<number | null>(null);

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setGpsState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      status: 'locked',
      errorMessage: null,
      lastUpdated: position.timestamp || Date.now(),
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let msg = 'Unable to retrieve location';
    let status: GpsLocationState['status'] = 'error';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission denied by user';
        status = 'denied';
        break;
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS signal unavailable';
        break;
      case error.TIMEOUT:
        msg = 'GPS location request timed out';
        break;
    }

    setGpsState((prev) => ({
      ...prev,
      status,
      errorMessage: msg,
    }));
  }, []);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by this browser',
      }));
      return;
    }

    setGpsState((prev) => ({ ...prev, status: 'acquiring', errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => updatePosition(pos),
      (err) => handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  }, [updatePosition, handleError]);

  // Set manual coordinates (for testing, indoor fallback, or if GPS is blocked)
  const setManualCoordinates = useCallback((lat: number, lng: number, accuracy = 10) => {
    setGpsState({
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      heading: null,
      speed: null,
      status: 'locked',
      errorMessage: null,
      lastUpdated: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by your device/browser',
      }));
      return;
    }

    refreshLocation();

    // Start watching position
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => updatePosition(pos),
        (err) => handleError(err),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 3000,
        }
      );
    } catch (e) {
      console.warn('watchPosition failed:', e);
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [refreshLocation, updatePosition, handleError]);

  return {
    ...gpsState,
    refreshLocation,
    setManualCoordinates,
  };
}
