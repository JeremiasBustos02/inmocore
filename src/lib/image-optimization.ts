export const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const IMAGE_PROCESSING_CONCURRENCY = 2;
// UUID object paths are immutable; callers use a one-year Storage cache lifetime.
export const IMAGE_CACHE_CONTROL = "31536000";

export type ImagePreset = {
  maxDimension: number;
  minimumDimension: number;
  initialQuality: number;
  hardLimitBytes: number;
  dimensionScales: readonly number[];
  fallbackFormat: "image/jpeg" | "image/png";
};

export const PROPERTY_IMAGE_PRESET: ImagePreset = {
  maxDimension: 1920,
  minimumDimension: 1200,
  initialQuality: 0.82,
  hardLimitBytes: 2 * 1024 * 1024,
  dimensionScales: [1, 0.85, 0.7],
  fallbackFormat: "image/jpeg",
};

export const HERO_IMAGE_PRESET: ImagePreset = {
  maxDimension: 2200,
  minimumDimension: 1200,
  initialQuality: 0.82,
  hardLimitBytes: 2 * 1024 * 1024,
  dimensionScales: [1, 0.85, 0.7],
  fallbackFormat: "image/jpeg",
};

export const LOGO_IMAGE_PRESET: ImagePreset = {
  maxDimension: 800,
  minimumDimension: 240,
  initialQuality: 0.82,
  hardLimitBytes: 1024 * 1024,
  dimensionScales: [1, 0.8, 0.6],
  fallbackFormat: "image/png",
};

const INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITY_STEPS = [1, 0.94, 0.88] as const;
let webpEncodingSupport: Promise<boolean> | undefined;

export type ImageOptimizationResult = {
  file: File;
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalBytes: number;
  outputBytes: number;
  quality: number;
  attempts: number;
};

type OptimizationOptions = {
  webpEncodingSupported?: boolean;
};

export type ImageBatchResult =
  | { ok: true; index: number; result: ImageOptimizationResult }
  | { ok: false; index: number; error: string };

export function validateImageInput(file: File) {
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  ) {
    return "No pudimos procesar esta foto HEIC. Probá seleccionándola nuevamente o exportándola como JPEG.";
  }
  if (!INPUT_TYPES.has(file.type)) {
    return "Sólo se permiten imágenes JPEG, PNG o WebP.";
  }
  if (file.size > MAX_IMAGE_INPUT_SIZE) {
    return "Cada imagen original debe pesar 10 MB o menos.";
  }
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  return null;
}

export async function optimizeImage(
  file: File,
  preset: ImagePreset,
  options: OptimizationOptions = {},
): Promise<ImageOptimizationResult> {
  const validationError = validateImageInput(file);
  if (validationError) throw new Error(validationError);

  const headerDimensions = await readImageDimensions(file);
  if (!headerDimensions) {
    throw new Error("No pudimos leer las dimensiones. El archivo puede estar dañado.");
  }
  if (headerDimensions.width * headerDimensions.height > MAX_IMAGE_PIXELS) {
    throw new Error("La imagen supera el máximo de 24 megapíxeles.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No pudimos decodificar esta imagen. Probá con otro archivo.");
  }

  try {
    const inputWidth = bitmap.width;
    const inputHeight = bitmap.height;
    if (!inputWidth || !inputHeight || inputWidth * inputHeight > MAX_IMAGE_PIXELS) {
      throw new Error("La imagen supera el máximo de 24 megapíxeles o tiene dimensiones inválidas.");
    }

    const ratio = Math.min(1, preset.maxDimension / Math.max(inputWidth, inputHeight));
    const baseWidth = Math.max(1, Math.round(inputWidth * ratio));
    const baseHeight = Math.max(1, Math.round(inputHeight * ratio));
    const dimensions = getDimensionAttempts(baseWidth, baseHeight, preset);
    const supportsWebp = options.webpEncodingSupported ?? await canEncodeWebp();
    const formats = supportsWebp
      ? ["image/webp", preset.fallbackFormat] as const
      : [preset.fallbackFormat] as const;
    let attempts = 0;

    for (const format of formats) {
      for (const dimension of dimensions) {
        const qualitySteps = format === "image/png" ? [1] : QUALITY_STEPS;
        for (const qualityScale of qualitySteps) {
          attempts += 1;
          const quality = Number((preset.initialQuality * qualityScale).toFixed(3));
          let blob: Blob;
          try {
            blob = await rasterize(bitmap, dimension.width, dimension.height, format, quality);
          } catch {
            // A browser can pass the capability probe yet fail a real encode; try the fallback.
            break;
          }
          if (blob.size > preset.hardLimitBytes) continue;
          if (!(await isValidOutput(blob, format, dimension.width, dimension.height))) break;

          const extension = extensionForMimeType(format);
          const optimizedFile = new File([blob], `optimized.${extension}`, {
            type: format,
            lastModified: Date.now(),
          });
          const result = {
            file: optimizedFile,
            inputWidth,
            inputHeight,
            outputWidth: dimension.width,
            outputHeight: dimension.height,
            originalBytes: file.size,
            outputBytes: blob.size,
            quality,
            attempts,
          } satisfies ImageOptimizationResult;

          if (process.env.NODE_ENV === "development") {
            const reduction = Math.max(0, (1 - blob.size / file.size) * 100);
            console.info("[image-optimization]", {
              input: `${file.size} bytes, ${inputWidth}x${inputHeight}, ${file.type}`,
              output: `${blob.size} bytes, ${dimension.width}x${dimension.height}, ${format}`,
              reduction: `${reduction.toFixed(1)}%`,
              quality,
            });
          }

          return result;
        }
      }
    }

    throw new Error("No pudimos optimizar esta imagen dentro del límite permitido.");
  } finally {
    bitmap.close();
  }
}

export function getImageProcessingConcurrency(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
  isIPadDesktopMode = typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1,
) {
  return /iPhone|iPad|iPod|Android/i.test(userAgent) || isIPadDesktopMode
    ? 1
    : IMAGE_PROCESSING_CONCURRENCY;
}

export async function optimizeImageBatch(
  files: File[],
  preset: ImagePreset,
  onProgress?: (completed: number, total: number) => void,
): Promise<ImageBatchResult[]> {
  const results = new Array<ImageBatchResult>(files.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const index = nextIndex++;
      try {
        results[index] = { ok: true, index, result: await optimizeImage(files[index], preset) };
      } catch (error) {
        results[index] = {
          ok: false,
          index,
          error: error instanceof Error ? error.message : "No pudimos procesar esta imagen.",
        };
      } finally {
        completed += 1;
        onProgress?.(completed, files.length);
      }
    }
  }

  const processingConcurrency = getImageProcessingConcurrency();
  await Promise.all(
    Array.from(
      { length: Math.min(processingConcurrency, files.length) },
      () => worker(),
    ),
  );
  return results;
}

function getDimensionAttempts(width: number, height: number, preset: ImagePreset) {
  const longSide = Math.max(width, height);
  const attempts = preset.dimensionScales.map((scale) => {
    const scaledLongSide = Math.round(longSide * scale);
    if (scale < 1 && scaledLongSide < preset.minimumDimension) return null;
    const ratio = scaledLongSide / longSide;
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    };
  });
  return attempts.filter((attempt): attempt is { width: number; height: number } => attempt !== null);
}

export function getOptimizedImageExtension(mimeType: string) {
  return mimeType === "image/webp" ? "webp" : mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : null;
}

export async function canEncodeWebp() {
  webpEncodingSupport ??= detectWebpEncodingSupport();
  return webpEncodingSupport;
}

async function detectWebpEncodingSupport() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const blob = await canvasBlob(canvas, "image/webp", 0.8);
    return await isValidOutput(blob, "image/webp");
  } catch {
    return false;
  }
}

function rasterize(bitmap: ImageBitmap, width: number, height: number, format: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      reject(new Error("Este navegador no permite procesar imágenes."));
      return;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (!blob || blob.type !== format) {
          reject(new Error("No se pudo codificar la imagen procesada."));
          return;
        }
        resolve(blob);
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

async function isValidOutput(blob: Blob, format: string, expectedWidth?: number, expectedHeight?: number) {
  if (blob.type !== format || blob.size < 16) return false;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const validContainer = format === "image/webp"
    ? isValidWebpContainer(bytes)
    : format === "image/jpeg"
      ? isValidJpegWithoutMetadata(bytes)
      : format === "image/png"
        ? isValidPngWithoutMetadata(bytes)
        : false;
  if (!validContainer) return false;
  try {
    const decoded = await createImageBitmap(blob);
    const valid = decoded.width > 0 && decoded.height > 0 &&
      (expectedWidth === undefined || decoded.width === expectedWidth) &&
      (expectedHeight === undefined || decoded.height === expectedHeight);
    decoded.close();
    return valid;
  } catch {
    return false;
  }
}

function isValidWebpContainer(bytes: Uint8Array) {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) return false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    if (type === "EXIF" || type === "XMP ") return false;
    const size = view.getUint32(offset + 4, true);
    offset += 8 + size + (size % 2);
    if (offset > bytes.length) return false;
  }
  return offset === bytes.length;
}

function isValidJpegWithoutMetadata(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return false;
    const marker = bytes[offset + 1];
    if (marker === 0xda) return offset + 2 < bytes.length;
    if (marker === 0xd9) return true;
    offset += 2;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length) return false;
    const size = (bytes[offset] << 8) | bytes[offset + 1];
    if (size < 2 || offset + size > bytes.length) return false;
    // EXIF and XMP are carried in APP1 segments.
    if (marker === 0xe1) return false;
    offset += size;
  }
  return false;
}

function isValidPngWithoutMetadata(bytes: Uint8Array) {
  if (bytes.length < 20 || ascii(bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let hasImageData = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    if (["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) return false;
    if (type === "IDAT") hasImageData = true;
    offset += 12 + size;
    if (offset > bytes.length) return false;
    if (type === "IEND") return hasImageData && offset === bytes.length;
  }
  return false;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function extensionForMimeType(mimeType: string) {
  const extension = getOptimizedImageExtension(mimeType);
  if (!extension) throw new Error("Formato de salida no permitido.");
  return extension;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo codificar la imagen.")), type, quality);
  });
}

async function readImageDimensions(file: File) {
  const bytes = new DataView(await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer());

  if (file.type === "image/png") {
    if (bytes.byteLength < 24 || bytes.getUint32(0) !== 0x89504e47) return null;
    return { width: bytes.getUint32(16), height: bytes.getUint32(20) };
  }

  if (file.type === "image/jpeg") return readJpegDimensions(bytes);
  if (file.type === "image/webp") return readWebpDimensions(bytes);
  return null;
}

function readJpegDimensions(bytes: DataView) {
  if (bytes.byteLength < 4 || bytes.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.byteLength) {
    if (bytes.getUint8(offset) !== 0xff) return null;
    const marker = bytes.getUint8(offset + 1);
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    const segmentLength = bytes.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: bytes.getUint16(offset + 3),
        width: bytes.getUint16(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(bytes: DataView) {
  if (bytes.byteLength < 20 || bytes.getUint32(0) !== 0x52494646 || bytes.getUint32(8) !== 0x57454250) return null;
  const chunk = String.fromCharCode(bytes.getUint8(12), bytes.getUint8(13), bytes.getUint8(14), bytes.getUint8(15));
  if (chunk === "VP8X") {
    if (bytes.byteLength < 30) return null;
    return {
      width: 1 + bytes.getUint8(24) + (bytes.getUint8(25) << 8) + (bytes.getUint8(26) << 16),
      height: 1 + bytes.getUint8(27) + (bytes.getUint8(28) << 8) + (bytes.getUint8(29) << 16),
    };
  }
  if (chunk === "VP8 " && bytes.byteLength >= 30) {
    return {
      width: bytes.getUint16(26, true) & 0x3fff,
      height: bytes.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.byteLength >= 25 && bytes.getUint8(20) === 0x2f) {
    const b1 = bytes.getUint8(21);
    const b2 = bytes.getUint8(22);
    const b3 = bytes.getUint8(23);
    const b4 = bytes.getUint8(24);
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }
  return null;
}
