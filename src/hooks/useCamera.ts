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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = cameraState.facingMode) => {
    stopStream();
    setCameraState((prev) => ({ ...prev, status: 'starting', errorMessage: null }));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Camera API not supported in this browser. Please use the file upload option.',
      }));
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
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
      let errorMsg = 'Could not access camera.';
      let status: CameraState['status'] = 'error';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Camera permission was denied. You can still upload photos from storage.';
          status = 'denied';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is already in use by another app or system process.';
        }
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
