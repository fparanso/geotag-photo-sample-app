export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function processAndCompressImage(
  source: string | Blob | HTMLVideoElement,
  options: CompressOptions = {}
): Promise<{ fullDataUrl: string; thumbnailDataUrl: string }> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = options;

  let img: HTMLImageElement;
  if (typeof source === 'string') {
    img = await loadImage(source);
  } else if (source instanceof Blob) {
    const objectUrl = URL.createObjectURL(source);
    img = await loadImage(objectUrl);
    URL.revokeObjectURL(objectUrl);
  } else if (source instanceof HTMLVideoElement) {
    return processVideoFrame(source, options);
  } else {
    throw new Error('Unsupported image source');
  }

  // Calculate scaled dimensions
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Full image canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.drawImage(img, 0, 0, width, height);
  const fullDataUrl = canvas.toDataURL('image/jpeg', quality);

  // Thumbnail canvas (square 240x240 center crop)
  const thumbCanvas = document.createElement('canvas');
  const thumbSize = 240;
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (!thumbCtx) throw new Error('Could not get thumbnail canvas context');

  const minDim = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sx = ((img.naturalWidth || img.width) - minDim) / 2;
  const sy = ((img.naturalHeight || img.height) - minDim) / 2;

  thumbCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, thumbSize, thumbSize);
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

  return { fullDataUrl, thumbnailDataUrl };
}

function processVideoFrame(
  video: HTMLVideoElement,
  options: CompressOptions
): { fullDataUrl: string; thumbnailDataUrl: string } {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = options;

  let width = video.videoWidth || 1280;
  let height = video.videoHeight || 720;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.drawImage(video, 0, 0, width, height);
  const fullDataUrl = canvas.toDataURL('image/jpeg', quality);

  // Thumbnail
  const thumbCanvas = document.createElement('canvas');
  const thumbSize = 240;
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (!thumbCtx) throw new Error('Could not get thumbnail canvas context');

  const minDim = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - minDim) / 2;
  const sy = (video.videoHeight - minDim) / 2;

  thumbCtx.drawImage(video, sx, sy, minDim, minDim, 0, 0, thumbSize, thumbSize);
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

  return { fullDataUrl, thumbnailDataUrl };
}

export function stampGpsWatermark(
  dataUrl: string,
  info: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestampStr: string;
    notes?: string;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Watermark bar at bottom
      const fontSize = Math.max(16, Math.round(canvas.width / 45));
      const barPadding = fontSize * 0.8;
      const lineHeight = fontSize * 1.35;
      
      const lines = [
        `📍 LAT: ${info.lat.toFixed(6)}° | LNG: ${info.lng.toFixed(6)}° (±${Math.round(info.accuracy || 0)}m)`,
        `⏱ ${info.timestampStr}`,
      ];
      if (info.notes && info.notes.trim().length > 0) {
        lines.push(`📝 ${info.notes.trim().slice(0, 60)}${info.notes.length > 60 ? '...' : ''}`);
      }

      const barHeight = lines.length * lineHeight + barPadding * 2;

      // Dark translucent background band
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

      // Subtle top border on band
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - barHeight);
      ctx.lineTo(canvas.width, canvas.height - barHeight);
      ctx.stroke();

      // Text setup
      ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;

      lines.forEach((line, idx) => {
        const y = canvas.height - barHeight + barPadding + (idx + 0.8) * lineHeight;
        ctx.fillText(line, barPadding, y);
      });

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
