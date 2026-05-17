import { FileTooLargeError, UnsupportedImageError } from '@/shared/errors/avatarUpload';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export interface ResizeImageOptions {
  width: number;
  height: number;
  quality?: number;
  mimeType?: string;
}

export interface CenterCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Pure helper: compute center-anchored crop rectangle so the source's
// largest centered square (or matching aspect rect) maps onto dst.
export function computeCenterCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): CenterCrop {
  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;
  let sw: number;
  let sh: number;
  if (srcAspect > dstAspect) {
    sh = srcH;
    sw = Math.round(sh * dstAspect);
  } else {
    sw = srcW;
    sh = Math.round(sw / dstAspect);
  }
  const sx = Math.round((srcW - sw) / 2);
  const sy = Math.round((srcH - sh) / 2);
  return { sx, sy, sw, sh };
}

export async function resizeImageBlob(
  file: File,
  opts: ResizeImageOptions,
): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new FileTooLargeError();
  }

  const mimeType = opts.mimeType ?? 'image/jpeg';
  const quality = opts.quality ?? 0.85;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnsupportedImageError();
  }

  try {
    const crop = computeCenterCrop(bitmap.width, bitmap.height, opts.width, opts.height);
    return await drawAndExport(bitmap, crop, opts.width, opts.height, mimeType, quality);
  } finally {
    bitmap.close?.();
  }
}

async function drawAndExport(
  bitmap: ImageBitmap,
  crop: CenterCrop,
  dstW: number,
  dstH: number,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(dstW, dstH);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new UnsupportedImageError('OffscreenCanvas 2D context unavailable');
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, dstW, dstH);
    return canvas.convertToBlob({ type: mimeType, quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UnsupportedImageError('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, dstW, dstH);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new UnsupportedImageError('Canvas toBlob returned null'));
      },
      mimeType,
      quality,
    );
  });
}
