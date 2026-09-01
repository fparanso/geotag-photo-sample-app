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
  const isRetryingWithLowAccuracy = useRef<boolean>(false);

  const updatePosition = useCallback((position: GeolocationPosition) => {
    isRetryingWithLowAccuracy.current = false;
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

  // Fetch approximate IP location as a zero-friction fallback when hardware GPS is unavailable or blocked
  const fetchIpFallbackLocation = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setGpsState((prev) => {
            // Only use IP fallback if real GPS hasn't locked in yet
            if (prev.status === 'locked' && prev.latitude !== null) {
              return prev;
            }
            return {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: 2500, // Coarse IP accuracy estimate in meters
              altitude: null,
              heading: null,
              speed: null,
              status: 'locked',
              errorMessage: `Using approximate location (${data.cityName || 'IP Location'}). Tap Edit to refine coordinates.`,
              lastUpdated: Date.now(),
            };
          });
          return true;
        }
      }
    } catch {
      // IP fallback failed or offline
    }
    return false;
  }, []);

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      // If high accuracy timed out or failed, try low-accuracy / standard Wi-Fi mode once
      if (
        (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) &&
        !isRetryingWithLowAccuracy.current &&
        navigator.geolocation
      ) {
        isRetryingWithLowAccuracy.current = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => updatePosition(pos),
          () => {
            isRetryingWithLowAccuracy.current = false;
            // If even low-accuracy fails, attempt coarse IP location fallback
            fetchIpFallbackLocation().then((success) => {
              if (!success) {
                setGpsState((prev) => ({
                  ...prev,
                  status: 'error',
                  errorMessage: 'GPS signal unavailable. You can manually enter coordinates using the Edit button.',
                }));
              }
            });
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
        return;
      }

      let msg = 'Unable to retrieve GPS location';
      let status: GpsLocationState['status'] = 'error';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location permission denied. Tap "Edit" to set manual coordinates or enable Location in browser settings.';
          status = 'denied';
          // Try IP fallback when permission denied by user so the app remains functional
          fetchIpFallbackLocation();
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'GPS signal unavailable. You can enter coordinates manually.';
          fetchIpFallbackLocation();
          break;
        case error.TIMEOUT:
          msg = 'GPS acquisition timed out. Retrying in background...';
          fetchIpFallbackLocation();
          break;
      }

      setGpsState((prev) => ({
        ...prev,
        status,
        errorMessage: msg,
      }));
    },
    [updatePosition, fetchIpFallbackLocation]
  );

  const refreshLocation = useCallback(() => {
    isRetryingWithLowAccuracy.current = false;

    if (!navigator.geolocation) {
      setGpsState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by this browser environment',
      }));
      fetchIpFallbackLocation();
      return;
    }

    setGpsState((prev) => ({ ...prev, status: 'acquiring', errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => updatePosition(pos),
      (err) => handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 3000,
      }
    );
  }, [updatePosition, handleError, fetchIpFallbackLocation]);

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
      fetchIpFallbackLocation();
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
          timeout: 15000,
          maximumAge: 3000,
        }
      );
    } catch (e) {
      console.warn('watchPosition failed:', e);
    }

    // Listen to permission changes if Permissions API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              refreshLocation();
            }
          };
        })
        .catch(() => {
          // Permissions query not supported on all browsers
        });
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [refreshLocation, updatePosition, handleError, fetchIpFallbackLocation]);

  return {
    ...gpsState,
    refreshLocation,
    setManualCoordinates,
  };
}

