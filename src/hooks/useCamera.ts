import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraState } from '../types';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>({
    status: 'idle',
    facingMode: 'environment',
    torch: false,
    torchSupported: false,
    errorMessage: null,
  });

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const getMediaDevicesStream = async (constraintsList: MediaStreamConstraints[]): Promise<MediaStream> => {
    // Standard modern API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      for (const constraints of constraintsList) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err: unknown) {
          // If this is the last constraint attempt, rethrow to be caught by outer handler
          if (constraints === constraintsList[constraintsList.length - 1]) {
            throw err;
          }
          console.warn('Retrying camera with relaxed constraints due to:', err);
        }
      }
    }

    // Legacy getUserMedia fallback for older browsers / webviews
    const legacyGetUserMedia =
      (navigator as unknown as { getUserMedia?: (c: MediaStreamConstraints, success: (s: MediaStream) => void, error: (e: unknown) => void) => void }).getUserMedia ||
      (navigator as unknown as { webkitGetUserMedia?: (c: MediaStreamConstraints, success: (s: MediaStream) => void, error: (e: unknown) => void) => void }).webkitGetUserMedia ||
      (navigator as unknown as { mozGetUserMedia?: (c: MediaStreamConstraints, success: (s: MediaStream) => void, error: (e: unknown) => void) => void }).mozGetUserMedia ||
      (navigator as unknown as { msGetUserMedia?: (c: MediaStreamConstraints, success: (s: MediaStream) => void, error: (e: unknown) => void) => void }).msGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise<MediaStream>((resolve, reject) => {
        legacyGetUserMedia.call(navigator, { video: true, audio: false }, resolve, reject);
      });
    }

    throw new Error('MEDIA_DEVICES_UNSUPPORTED');
  };

  const startCamera = useCallback(async (facing: 'environment' | 'user' = cameraState.facingMode) => {
    stopStream();
    setCameraState((prev) => ({ ...prev, status: 'starting', errorMessage: null }));

    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]');

    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost);

    if (!isSecure && !navigator.mediaDevices?.getUserMedia) {
      setCameraState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage:
          'Camera access requires a Secure Context (HTTPS or localhost). If testing on a mobile device via LAN IP, please run with HTTPS or use the Device Camera / Gallery button.',
      }));
      return;
    }

    try {
      const constraintsList: MediaStreamConstraints[] = [
        // Preferred high-quality constraint with ideal facing mode
        {
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        // Fallback with exact or simple facing mode
        {
          audio: false,
          video: {
            facingMode: facing,
          },
        },
        // Basic fallback with any video input
        {
          audio: false,
          video: true,
        },
      ];

      const stream = await getMediaDevicesStream(constraintsList);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers require user interaction; muted video usually autoplays
        }
      }

      // Check if torch/flash is supported on the active video track
      const videoTrack = stream.getVideoTracks()[0];
      let torchSupported = false;
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as Record<string, unknown>;
        torchSupported = Boolean(capabilities.torch);
      }

      setCameraState({
        status: 'active',
        facingMode: facing,
        torch: false,
        torchSupported,
        errorMessage: null,
      });
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      let errorMsg = 'Could not access camera device.';
      let status: CameraState['status'] = 'error';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings or use the File/Native Camera upload option.';
          status = 'denied';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is in use by another application or OS process.';
        } else if (err.name === 'OverconstrainedError') {
          errorMsg = 'Camera constraints could not be satisfied by available hardware.';
        }
      } else if (err instanceof Error && err.message === 'MEDIA_DEVICES_UNSUPPORTED') {
        errorMsg = 'Camera API is not supported in this browser environment. Please use the Device Camera / Gallery upload option.';
      }

      setCameraState((prev) => ({
        ...prev,
        status,
        errorMessage: errorMsg,
      }));
    }
  }, [cameraState.facingMode, stopStream]);

  const switchCamera = useCallback(() => {
    const nextFacing = cameraState.facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  }, [cameraState.facingMode, startCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !cameraState.torch;
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setCameraState((prev) => ({ ...prev, torch: nextTorch }));
    } catch (err) {
      console.warn('Toggle torch failed:', err);
    }
  }, [cameraState.torch]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || cameraState.status !== 'active') return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If front camera, mirror image for natural selfie feel
    if (cameraState.facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [cameraState.status, cameraState.facingMode]);

  // Listen to permission changes if Permissions API is supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted' && cameraState.status !== 'active') {
              startCamera();
            }
          };
        })
        .catch(() => {
          // Camera permission query not supported on some browsers (e.g. Safari)
        });
    }
  }, [cameraState.status, startCamera]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    ...cameraState,
    startCamera,
    stopCamera: stopStream,
    switchCamera,
    toggleTorch,
    captureFrame,
  };
}

