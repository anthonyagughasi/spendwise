import { auth } from '@/src/lib/firebase/client';
import { clearUserPhotoUrl, updateUserPhotoUrl } from '@/src/lib/services/authService';

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB input file limit
export const MAX_STORED_DATA_URL_LENGTH = 200_000; // Safely below Firestore 250,000-char rule & 1 MiB doc limit
export const ALLOWED_PROFILE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const EXTENSION_TO_MIME: Record<string, (typeof ALLOWED_PROFILE_IMAGE_MIME_TYPES)[number]> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function resolveProfileImageMimeType(
  file: File
): (typeof ALLOWED_PROFILE_IMAGE_MIME_TYPES)[number] | null {
  const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  const hasDot = file.name.includes('.');
  const ext = hasDot ? (file.name.split('.').pop()?.toLowerCase() ?? '') : '';

  if (hasDot && !ALLOWED_EXTENSIONS.has(ext)) {
    return null;
  }

  if (
    ALLOWED_PROFILE_IMAGE_MIME_TYPES.includes(
      normalizedType as (typeof ALLOWED_PROFILE_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return normalizedType as (typeof ALLOWED_PROFILE_IMAGE_MIME_TYPES)[number];
  }

  // Some mobile pickers omit file.type; fall back to validated extension
  if (!normalizedType && ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }

  return null;
}

export function validateProfileImageFile(file: File): string | null {
  if (!resolveProfileImageMimeType(file)) {
    return 'Unsupported file type. Please select a JPG, JPEG, PNG, or WebP image.';
  }

  if (file.size <= 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return 'Image exceeds the 5 MB maximum upload size.';
  }

  return null;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Image upload was cancelled.');
  }
}

async function decodeImageSource(
  file: File,
  signal?: AbortSignal
): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void;
  cleanup: () => void;
}> {
  throwIfAborted(signal);

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      cleanup: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Could not decode the selected image. Please choose a valid JPG, PNG, or WebP file.'));
      image.src = objectUrl;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function encodeCanvasImage(canvas: HTMLCanvasElement, quality: number): string {
  // Prefer WebP for compact lossless/lossy avatar storage; fall back to JPEG if browser lacks WebP encode support
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp;base64,')) {
    return webp;
  }
  const jpeg = canvas.toDataURL('image/jpeg', quality);
  if (jpeg.startsWith('data:image/jpeg;base64,')) {
    return jpeg;
  }
  return canvas.toDataURL('image/png');
}

export async function compressProfileImageToDataUrl(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const validationError = validateProfileImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  throwIfAborted(signal);
  onProgress?.(15);

  const decoded = await decodeImageSource(file, signal);
  try {
    throwIfAborted(signal);
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error('Selected image has invalid dimensions.');
    }

    onProgress?.(35);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Your browser could not prepare the image for upload.');
    }

    const dimensionCaps = [320, 240, 180];
    const qualitySteps = [0.84, 0.72, 0.58, 0.44];

    for (const maxEdge of dimensionCaps) {
      throwIfAborted(signal);
      const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
      const targetWidth = Math.max(1, Math.round(decoded.width * scale));
      const targetHeight = Math.max(1, Math.round(decoded.height * scale));

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      decoded.draw(ctx, targetWidth, targetHeight);

      for (const quality of qualitySteps) {
        throwIfAborted(signal);
        const dataUrl = encodeCanvasImage(canvas, quality);
        if (
          dataUrl.length <= MAX_STORED_DATA_URL_LENGTH &&
          /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)
        ) {
          onProgress?.(60);
          return dataUrl;
        }
      }
    }

    throw new Error(
      'Unable to optimize this image within the profile storage limit. Please try a simpler or smaller image.'
    );
  } finally {
    decoded.cleanup();
  }
}

export async function uploadProfilePicture(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const validationError = validateProfileImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Please sign in again before uploading a profile picture.');
  }

  throwIfAborted(signal);

  const dataUrl = await compressProfileImageToDataUrl(file, onProgress, signal);
  throwIfAborted(signal);

  onProgress?.(80);
  await updateUserPhotoUrl(userId, dataUrl);
  onProgress?.(100);

  return dataUrl;
}

export async function removeProfilePicture(userId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Please sign in again before modifying your profile picture.');
  }
  await clearUserPhotoUrl(userId);
}
