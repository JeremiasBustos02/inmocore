export const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const IMAGE_PROCESSING_CONCURRENCY = 2;
// UUID object paths are immutable; callers use a one-year Storage cache lifetime.
export const IMAGE_CACHE_CONTROL = "31536000";
// Inspectable in development console to distinguish a current bundle from a cached one.
export const IMAGE_PIPELINE_VERSION = "ios-output-diagnostics-4";

type ImageErrorCode =
  | "IMG_DECODE_FAILED"
  | "IMG_CANVAS_FAILED"
  | "IMG_WEBP_FAILED"
  | "IMG_JPEG_FAILED"
  | "IMG_PNG_FAILED"
  | "IMG_OUTPUT_EMPTY"
  | "IMG_OUTPUT_MIME_MISMATCH"
  | "IMG_OUTPUT_SIGNATURE_INVALID"
  | "IMG_OUTPUT_DECODE_FAILED"
  | "IMG_OUTPUT_DIMENSIONS_INVALID"
  | "IMG_OUTPUT_METADATA_FOUND"
  | "IMG_SIZE_LIMIT";

class ImagePipelineError extends Error {
  constructor(readonly code: ImageErrorCode, cause?: unknown) {
    super(`No pudimos procesar esta imagen. Código: ${code}`, { cause });
  }
}

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
  // Fixture hook: replaces only WebP canvas encoding, leaving the real JPEG/PNG fallback intact.
  webpEncoder?: (canvas: HTMLCanvasElement, quality: number) => Promise<Blob | null>;
  htmlImageOnly?: boolean;
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
  if (validationError) {
    if (file.size > MAX_IMAGE_INPUT_SIZE) throw new ImagePipelineError("IMG_SIZE_LIMIT");
    throw new Error(validationError);
  }

  let headerDimensions: Awaited<ReturnType<typeof readImageDimensions>>;
  try {
    headerDimensions = await readImageDimensions(file);
  } catch (error) {
    throw new ImagePipelineError("IMG_DECODE_FAILED", error);
  }
  if (!headerDimensions) {
    throw new ImagePipelineError("IMG_DECODE_FAILED");
  }
  if (headerDimensions.width * headerDimensions.height > MAX_IMAGE_PIXELS) {
    throw new ImagePipelineError("IMG_SIZE_LIMIT");
  }

  const decoded = options.htmlImageOnly ? await decodeHtmlImage(file) : await decodeImage(file);

  try {
    const inputWidth = decoded.width;
    const inputHeight = decoded.height;
    if (!inputWidth || !inputHeight) throw new ImagePipelineError("IMG_DECODE_FAILED");
    if (inputWidth * inputHeight > MAX_IMAGE_PIXELS) {
      throw new ImagePipelineError("IMG_SIZE_LIMIT");
    }

    const ratio = Math.min(1, preset.maxDimension / Math.max(inputWidth, inputHeight));
    const baseWidth = Math.max(1, Math.round(inputWidth * ratio));
    const baseHeight = Math.max(1, Math.round(inputHeight * ratio));
    const dimensions = getDimensionAttempts(baseWidth, baseHeight, preset);
    const supportsWebp = options.webpEncodingSupported ?? await canEncodeWebp();
    const formats = supportsWebp
      ? ["image/webp", preset.fallbackFormat] as const
      : [preset.fallbackFormat] as const;
    const trace: {
      inputType: string;
      supportsWebP: boolean;
      webpAttempted: boolean;
      webpBlobType: string | null;
      webpValid: boolean;
      fallbackAttempted: boolean;
      fallbackType: string;
      finalType: string | null;
    } = {
      inputType: file.type,
      supportsWebP: supportsWebp,
      webpAttempted: false,
      webpBlobType: null,
      webpValid: false,
      fallbackAttempted: false,
      fallbackType: preset.fallbackFormat,
      finalType: null,
    };
    let attempts = 0;
    let sizeLimitReached = false;

    try {
      for (const format of formats) {
        if (format !== "image/webp") trace.fallbackAttempted = true;
        for (const dimension of dimensions) {
          const qualitySteps = format === "image/png" ? [1] : QUALITY_STEPS;
          for (const qualityScale of qualitySteps) {
            attempts += 1;
            const quality = Number((preset.initialQuality * qualityScale).toFixed(3));
            try {
              if (format === "image/webp") trace.webpAttempted = true;
              const blob = await rasterize(decoded.source, dimension.width, dimension.height, format, quality, options.webpEncoder);
              if (format === "image/webp") trace.webpBlobType = blob?.type ?? null;
              if (!blob) throw new ImagePipelineError(encodeErrorCode(format));
              if (blob.size > preset.hardLimitBytes) {
                sizeLimitReached = true;
                continue;
              }
              const validationError = await validateOptimizedOutput(blob, format, dimension.width, dimension.height);
              if (format === "image/webp") trace.webpValid = validationError === null;
              if (validationError) {
                if (format === "image/webp") break;
                throw new ImagePipelineError(validationError);
              }

              const optimizedFile = new File([blob], `optimized.${extensionForMimeType(format)}`, {
                type: format,
                lastModified: Date.now(),
              });
              trace.finalType = format;
              return {
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
            } catch (error) {
              // Capability can pass while a real iPhone image fails at encode, validation or file creation.
              if (format === "image/webp") break;
              if (error instanceof ImagePipelineError) throw error;
              throw new ImagePipelineError(encodeErrorCode(format), error);
            }
          }
        }
      }

      throw new ImagePipelineError(sizeLimitReached ? "IMG_SIZE_LIMIT" : "IMG_OUTPUT_SIGNATURE_INVALID");
    } finally {
      if (process.env.NODE_ENV === "development") {
        console.info("[image-optimization]", { version: IMAGE_PIPELINE_VERSION, decoder: decoded.method, ...trace });
      }
    }
  } catch (error) {
    // Some browsers decode a bitmap successfully but cannot draw it to Canvas.
    if (error instanceof ImagePipelineError && error.code === "IMG_CANVAS_FAILED" && decoded.method === "bitmap") {
      return await optimizeImage(file, preset, { ...options, htmlImageOnly: true });
    }
    throw error;
  } finally {
    decoded.release();
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

function encodeErrorCode(format: string): ImageErrorCode {
  return format === "image/webp" ? "IMG_WEBP_FAILED" : format === "image/png" ? "IMG_PNG_FAILED" : "IMG_JPEG_FAILED";
}

async function decodeImage(file: Blob) {
  try {
    // The browser applies EXIF orientation here. No manual rotation is performed later.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (!bitmap.width || !bitmap.height) {
      bitmap.close();
      throw new Error("Invalid bitmap dimensions");
    }
    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      method: "bitmap" as const,
      release: () => bitmap.close(),
    };
  } catch {
    // HTMLImageElement also applies the browser's EXIF orientation at decode/draw time.
    // Do not transform the canvas again or portrait JPEGs could be rotated twice.
    return decodeHtmlImage(file);
  }
}

async function decodeHtmlImage(file: Blob) {
  let url: string;
  try {
    url = URL.createObjectURL(file);
  } catch (error) {
    throw new ImagePipelineError("IMG_DECODE_FAILED", error);
  }
  let image: HTMLImageElement | null = null;
  try {
    image = new Image();
    const element = image;
    await new Promise<void>((resolve, reject) => {
      element.onload = () => resolve();
      element.onerror = () => reject(new Error("Image load failed"));
      element.src = url;
    });
    if (!element.naturalWidth || !element.naturalHeight) throw new Error("Invalid image dimensions");
    return {
      source: element as CanvasImageSource,
      width: element.naturalWidth,
      height: element.naturalHeight,
      method: "html-image" as const,
      release: () => {
        element.onload = null;
        element.onerror = null;
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    if (image) {
      image.onload = null;
      image.onerror = null;
    }
    URL.revokeObjectURL(url);
    throw new ImagePipelineError("IMG_DECODE_FAILED", error);
  }
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
    return blob.type === "image/webp" && await validateOptimizedOutput(blob, "image/webp") === null;
  } catch {
    return false;
  }
}

async function rasterize(
  source: CanvasImageSource,
  width: number,
  height: number,
  format: string,
  quality: number,
  webpEncoder?: (canvas: HTMLCanvasElement, quality: number) => Promise<Blob | null>,
) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new ImagePipelineError("IMG_CANVAS_FAILED");
  }
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch (error) {
    throw new ImagePipelineError("IMG_CANVAS_FAILED", error);
  }
  try {
    try {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Canvas context unavailable");
      context.drawImage(source, 0, 0, width, height);
    } catch (error) {
      throw new ImagePipelineError("IMG_CANVAS_FAILED", error);
    }
    try {
      return format === "image/webp" && webpEncoder
        ? await webpEncoder(canvas, quality)
        : await canvasBlob(canvas, format, format === "image/png" ? undefined : quality);
    } catch (error) {
      throw new ImagePipelineError(encodeErrorCode(format), error);
    }
  } finally {
    try {
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // Cleanup must not replace the error from the failed canvas/encoder stage.
    }
  }
}

export async function validateOptimizedOutput(
  blob: Blob,
  requestedFormat: string,
  expectedWidth?: number,
  expectedHeight?: number,
): Promise<ImageErrorCode | null> {
  let bytes = new Uint8Array();
  let actualWidth: number | null = null;
  let actualHeight: number | null = null;
  const report = (code: ImageErrorCode | null) => {
    // Headers and dimensions only; never log the filename, image payload or source metadata.
    if (code || process.env.NODE_ENV === "development") {
      console.info("[image-output]", {
        requestedFormat,
        blobType: blob.type,
        blobSize: blob.size,
        first16Hex: Array.from(bytes.subarray(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join(" "),
        detectedFormat: detectImageFormat(bytes),
        expectedWidth,
        expectedHeight,
        actualWidth,
        actualHeight,
        code,
      });
    }
    return code;
  };

  if (blob.size === 0) return report("IMG_OUTPUT_EMPTY");
  try {
    bytes = new Uint8Array(await blob.arrayBuffer());
  } catch {
    return report("IMG_OUTPUT_DECODE_FAILED");
  }
  const detectedFormat = detectImageFormat(bytes);
  if (blob.type !== requestedFormat && !(blob.type === "" && requestedFormat === "image/jpeg" && detectedFormat === "image/jpeg")) {
    return report("IMG_OUTPUT_MIME_MISMATCH");
  }
  if (detectedFormat !== requestedFormat) return report("IMG_OUTPUT_SIGNATURE_INVALID");
  const containerError = requestedFormat === "image/webp"
    ? inspectWebp(bytes)
    : requestedFormat === "image/jpeg"
      ? inspectJpeg(bytes)
      : requestedFormat === "image/png"
        ? inspectPng(bytes)
        : "IMG_OUTPUT_SIGNATURE_INVALID";
  if (containerError) return report(containerError);

  try {
    // Same decoder as input: ImageBitmap first, HTMLImageElement fallback.
    const decoded = await decodeImage(blob);
    actualWidth = decoded.width;
    actualHeight = decoded.height;
    decoded.release();
  } catch {
    return report("IMG_OUTPUT_DECODE_FAILED");
  }
  // Freshly rasterized output has no EXIF: compare against the canvas dimensions,
  // not the original file's pre-orientation dimensions.
  if (!actualWidth || !actualHeight ||
    (expectedWidth !== undefined && actualWidth !== expectedWidth) ||
    (expectedHeight !== undefined && actualHeight !== expectedHeight)) {
    return report("IMG_OUTPUT_DIMENSIONS_INVALID");
  }
  return report(null);
}

function detectImageFormat(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  return null;
}

function inspectWebp(bytes: Uint8Array): ImageErrorCode | null {
  if (bytes.length < 20) return "IMG_OUTPUT_SIGNATURE_INVALID";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) return "IMG_OUTPUT_SIGNATURE_INVALID";
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    if (type === "EXIF" || type === "XMP ") return "IMG_OUTPUT_METADATA_FOUND";
    const size = view.getUint32(offset + 4, true);
    offset += 8 + size + (size % 2);
    if (offset > bytes.length) return "IMG_OUTPUT_SIGNATURE_INVALID";
  }
  return offset === bytes.length ? null : "IMG_OUTPUT_SIGNATURE_INVALID";
}

function inspectJpeg(bytes: Uint8Array): ImageErrorCode | null {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return "IMG_OUTPUT_SIGNATURE_INVALID";
    const marker = bytes[offset + 1];
    if (marker === 0xda) return offset + 2 < bytes.length ? null : "IMG_OUTPUT_SIGNATURE_INVALID";
    if (marker === 0xd9) return null;
    offset += 2;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length) return "IMG_OUTPUT_SIGNATURE_INVALID";
    const size = (bytes[offset] << 8) | bytes[offset + 1];
    if (size < 2 || offset + size > bytes.length) return "IMG_OUTPUT_SIGNATURE_INVALID";
    if (marker === 0xe1) {
      const payload = offset + 2;
      if (ascii(bytes, payload, 6) === "Exif\0\0" ||
        ascii(bytes, payload, 28) === "http://ns.adobe.com/xap/1.0/" ||
        ascii(bytes, payload, 34) === "http://ns.adobe.com/xmp/extension/") {
        return "IMG_OUTPUT_METADATA_FOUND";
      }
    }
    offset += size;
  }
  return "IMG_OUTPUT_SIGNATURE_INVALID";
}

function inspectPng(bytes: Uint8Array): ImageErrorCode | null {
  if (bytes.length < 20) return "IMG_OUTPUT_SIGNATURE_INVALID";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let hasImageData = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    if (["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) return "IMG_OUTPUT_METADATA_FOUND";
    if (type === "IDAT") hasImageData = true;
    offset += 12 + size;
    if (offset > bytes.length) return "IMG_OUTPUT_SIGNATURE_INVALID";
    if (type === "IEND") return hasImageData && offset === bytes.length ? null : "IMG_OUTPUT_SIGNATURE_INVALID";
  }
  return "IMG_OUTPUT_SIGNATURE_INVALID";
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
