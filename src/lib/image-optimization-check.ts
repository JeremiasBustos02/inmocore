import {
  getImageProcessingConcurrency,
  LOGO_IMAGE_PRESET,
  optimizeImage,
  optimizeImageBatch,
  PROPERTY_IMAGE_PRESET,
  validateImageInput,
  type ImagePreset,
} from "@/lib/image-optimization";

const TEST_PRESET: ImagePreset = {
  maxDimension: 1600,
  minimumDimension: 400,
  initialQuality: 0.8,
  hardLimitBytes: 400 * 1024,
  dimensionScales: [1, 0.75, 0.5],
};

export async function runImageOptimizationCheck() {
  const orientationFixture = await createJpegFixture({ orientation: 6, gps: true });
  const sourceMetadata = await readJpegMetadata(orientationFixture);
  assert(sourceMetadata.orientation === 6, "La fixture JPEG no contiene orientación EXIF 6.");
  assert([1, 2, 3, 4].every((tag) => sourceMetadata.gpsTags.includes(tag)), "La fixture JPEG no contiene tags GPS completos.");

  const orientationResult = await optimizeImage(orientationFixture, PROPERTY_IMAGE_PRESET);
  assert(orientationResult.file.type === "image/webp", "La salida de orientación no tiene MIME image/webp.");
  assert(orientationResult.outputWidth === 300 && orientationResult.outputHeight === 600, "La imagen pequeña se amplió o perdió la orientación.");
  const orientationBitmap = await decodeWebp(orientationResult.file);
  assert(orientationBitmap.width === 300 && orientationBitmap.height === 600, "No se aplicó visualmente la orientación EXIF 6.");
  assert(orientationResult.attempts <= 9, "La compresión excedió el máximo de intentos.");
  const orientedPixels = readPixels(orientationBitmap, 150, 150, 150, 450);
  orientationBitmap.close();
  assert(orientedPixels.top[0] > orientedPixels.top[2], "La parte superior no corresponde al lado izquierdo original.");
  assert(orientedPixels.bottom[2] > orientedPixels.bottom[0], "La parte inferior no corresponde al lado derecho original.");
  const orientationChunks = await readWebpChunks(orientationResult.file);
  assert(!orientationChunks.includes("EXIF") && !orientationChunks.includes("XMP "), "La salida conserva chunks EXIF o XMP.");
  assert(!(await readJpegMetadata(orientationResult.file)).gpsTags.length, "La salida todavía contiene GPS EXIF.");

  const transparentPng = await createTransparentPngFixture();
  const logoResult = await optimizeImage(transparentPng, LOGO_IMAGE_PRESET);
  assert(logoResult.file.type === "image/webp", "La salida del logo no es WebP.");
  assert(logoResult.outputWidth === 160 && logoResult.outputHeight === 100, "El preset del logo hizo upscale.");
  const logoBitmap = await decodeWebp(logoResult.file);
  const alphaPixels = readAlphaPixels(logoBitmap, 2, 2, 80, 50);
  logoBitmap.close();
  assert(alphaPixels.transparent === 0, "El logo perdió transparencia en las esquinas.");
  assert(alphaPixels.opaque > 240, "El logo no conservó los píxeles opacos.");

  const smallPng = await createSolidPngFixture(160, 90);
  const smallResult = await optimizeImage(smallPng, PROPERTY_IMAGE_PRESET);
  assert(smallResult.outputWidth === 160 && smallResult.outputHeight === 90, "La imagen pequeña fue ampliada.");
  assert(smallResult.file.type === "image/webp" && smallResult.outputBytes > 0, "La imagen pequeña no fue re-encodeada a WebP.");

  const corruptFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 20, 0, 20, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0])], "fake.jpg", { type: "image/jpeg" });
  let corruptRejected = false;
  try {
    await optimizeImage(corruptFile, PROPERTY_IMAGE_PRESET);
  } catch {
    corruptRejected = true;
  }
  assert(corruptRejected, "El JPEG corrupto fue aceptado.");

  const heic = new File([new Uint8Array([0, 1, 2])], "iphone.heic", { type: "image/heic" });
  assert(validateImageInput(heic)?.includes("exportándola como JPEG") === true, "HEIC no fue rechazado con el mensaje previsto.");

  const noisyJpeg = await createNoiseJpegFixture(1600, 1000);
  const adaptiveResult = await optimizeImage(noisyJpeg, TEST_PRESET);
  assert(adaptiveResult.attempts > 1 && adaptiveResult.attempts <= 9, "La fixture de compresión no recorrió una secuencia adaptativa finita.");
  assert(adaptiveResult.outputBytes <= TEST_PRESET.hardLimitBytes, "El resultado adaptativo excede el límite de prueba.");

  let impossibleHardCapRejected = false;
  try {
    await optimizeImage(noisyJpeg, { ...TEST_PRESET, hardLimitBytes: 1 });
  } catch {
    impossibleHardCapRejected = true;
  }
  assert(impossibleHardCapRejected, "Una imagen que excede todos los límites fue aceptada.");

  const batch = await optimizeImageBatch([smallPng, corruptFile, transparentPng], PROPERTY_IMAGE_PRESET);
  assert(batch.length === 3 && batch[0].ok && !batch[1].ok && batch[2].ok, "Un archivo fallido interrumpió o desordenó el lote.");
  assert(getImageProcessingConcurrency("Windows Chrome") === 2, "La concurrencia desktop no es 2.");
  assert(getImageProcessingConcurrency("iPhone Safari") === 1, "La concurrencia móvil no es 1.");
  assert(getImageProcessingConcurrency("Macintosh", true) === 1, "La concurrencia iPad en modo escritorio no es 1.");

  const webpChunks = await readWebpChunks(orientationResult.file);
  return {
    orientationExifGps: {
      originalBytes: orientationFixture.size,
      originalDimensions: "600x300; Orientation=6; GPS IFD tags 1-4 present",
      finalBytes: orientationResult.outputBytes,
      finalDimensions: `${orientationResult.outputWidth}x${orientationResult.outputHeight}`,
      format: orientationResult.file.type,
      riffWebpChunks: webpChunks,
      exifRemoved: !webpChunks.includes("EXIF"),
      xmpRemoved: !webpChunks.includes("XMP "),
      gpsRemoved: !(await readJpegMetadata(orientationResult.file)).gpsTags.length,
      orientationApplied: true,
    },
    transparentLogo: {
      originalFormat: transparentPng.type,
      finalFormat: logoResult.file.type,
      dimensions: `${logoResult.outputWidth}x${logoResult.outputHeight}`,
      transparentPixelAlpha: alphaPixels.transparent,
      opaquePixelAlpha: alphaPixels.opaque,
    },
    smallImage: {
      originalDimensions: "160x90",
      finalDimensions: `${smallResult.outputWidth}x${smallResult.outputHeight}`,
      reencodedWebp: smallResult.file.type === "image/webp",
    },
    corruptImageRejected: corruptRejected,
    heicRejected: true,
    adaptiveCompression: {
      attempts: adaptiveResult.attempts,
      hardLimitBytes: TEST_PRESET.hardLimitBytes,
      outputBytes: adaptiveResult.outputBytes,
      quality: adaptiveResult.quality,
      dimensions: `${adaptiveResult.outputWidth}x${adaptiveResult.outputHeight}`,
      impossibleHardCapRejected,
    },
    batch: { statuses: batch.map((result) => result.ok ? "PASS" : "FAIL"), desktopConcurrency: 2, mobileConcurrency: 1, iPadDesktopModeConcurrency: 1 },
  };
}

async function createJpegFixture({ orientation, gps }: { orientation: number; gps: boolean }) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para la fixture JPEG.");
  context.fillStyle = "#dd2211";
  context.fillRect(0, 0, 300, 300);
  context.fillStyle = "#1166dd";
  context.fillRect(300, 0, 300, 300);
  const jpeg = await canvasBlob(canvas, "image/jpeg", 0.9);
  const original = new Uint8Array(await jpeg.arrayBuffer());
  const tiff = createExifTiff({ orientation, gps });
  const payload = new Uint8Array(6 + tiff.length);
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0]);
  payload.set(tiff, 6);
  const segmentLength = payload.length + 2;
  const result = new Uint8Array(original.length + payload.length + 4);
  result.set(original.subarray(0, 2), 0);
  result.set([0xff, 0xe1, segmentLength >> 8, segmentLength & 0xff], 2);
  result.set(payload, 6);
  result.set(original.subarray(2), 6 + payload.length);
  return new File([result], "synthetic-gps-orientation-fixture.jpg", { type: "image/jpeg" });
}

function createExifTiff({ orientation, gps }: { orientation: number; gps: boolean }) {
  const gpsTags = gps ? [[1, 2, 2, 92], [2, 5, 3, 94], [3, 2, 2, 118], [4, 5, 3, 120]] as const : [];
  const tiff = new Uint8Array(gps ? 144 : 26);
  const view = new DataView(tiff.buffer);
  tiff.set([0x49, 0x49]);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, gps ? 2 : 1, true);
  view.setUint16(10, 0x0112, true);
  view.setUint16(12, 3, true);
  view.setUint32(14, 1, true);
  view.setUint16(18, orientation, true);
  if (!gps) return tiff;

  view.setUint16(22, 0x8825, true);
  view.setUint16(24, 4, true);
  view.setUint32(26, 1, true);
  view.setUint32(30, 38, true);
  view.setUint32(34, 0, true);
  view.setUint16(38, gpsTags.length, true);
  gpsTags.forEach(([tag, type, count, value], index) => {
    const offset = 40 + index * 12;
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, count, true);
    view.setUint32(offset + 8, value, true);
  });
  view.setUint32(88, 0, true);
  tiff.set([0x4e, 0], 92);
  tiff.set([0x57, 0], 118);
  // Null Island is intentionally synthetic and contains no private location data.
  const coordinates = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  coordinates.forEach((value, index) => view.setUint32((index < 6 ? 94 : 120) + (index % 6) * 4, value, true));
  return tiff;
}

async function readJpegMetadata(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return { orientation: null, gpsTags: [] as number[] };
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const size = view.getUint16(offset);
    if (size < 2 || offset + size > view.byteLength) break;
    const dataOffset = offset + 2;
    if (marker === 0xe1 && matchesAscii(bytes, dataOffset, "Exif\0\0")) {
      const tiffOffset = dataOffset + 6;
      const littleEndian = view.getUint8(tiffOffset) === 0x49 && view.getUint8(tiffOffset + 1) === 0x49;
      if (!littleEndian && !(view.getUint8(tiffOffset) === 0x4d && view.getUint8(tiffOffset + 1) === 0x4d)) break;
      const read16 = (at: number) => view.getUint16(at, littleEndian);
      const read32 = (at: number) => view.getUint32(at, littleEndian);
      if (read16(tiffOffset + 2) !== 42) break;
      const ifd0 = tiffOffset + read32(tiffOffset + 4);
      if (ifd0 + 2 > view.byteLength) break;
      const count = read16(ifd0);
      let orientation: number | null = null;
      let gpsIfd = 0;
      for (let index = 0; index < count; index += 1) {
        const entry = ifd0 + 2 + index * 12;
        if (entry + 12 > view.byteLength) break;
        if (read16(entry) === 0x0112) orientation = read16(entry + 8);
        if (read16(entry) === 0x8825) gpsIfd = tiffOffset + read32(entry + 8);
      }
      const gpsTags: number[] = [];
      if (gpsIfd && gpsIfd + 2 <= view.byteLength) {
        const gpsCount = read16(gpsIfd);
        for (let index = 0; index < gpsCount; index += 1) {
          const entry = gpsIfd + 2 + index * 12;
          if (entry + 2 > view.byteLength) break;
          gpsTags.push(read16(entry));
        }
      }
      return { orientation, gpsTags };
    }
    offset += size;
  }
  return { orientation: null, gpsTags: [] as number[] };
}

async function readWebpChunks(blob: Blob) {
  const bytes = new DataView(await blob.arrayBuffer());
  assert(bytes.byteLength >= 12, "WebP demasiado corto.");
  assert(ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP", "No tiene contenedor RIFF/WEBP.");
  const chunks: string[] = [];
  for (let offset = 12; offset + 8 <= bytes.byteLength;) {
    const type = ascii(bytes, offset, 4);
    const size = bytes.getUint32(offset + 4, true);
    assert(offset + 8 + size <= bytes.byteLength, `Chunk ${type} fuera del archivo.`);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  return chunks;
}

async function decodeWebp(blob: Blob) {
  const chunks = await readWebpChunks(blob);
  assert(!chunks.includes("EXIF") && !chunks.includes("XMP "), "WebP contiene metadata EXIF/XMP.");
  const bitmap = await createImageBitmap(blob);
  assert(bitmap.width > 0 && bitmap.height > 0, "El WebP no se pudo decodificar.");
  return bitmap;
}

function readPixels(bitmap: ImageBitmap, topX: number, topY: number, bottomX: number, bottomY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para verificar orientación.");
  context.drawImage(bitmap, 0, 0);
  const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data];
  return { top: pixel(topX, topY), bottom: pixel(bottomX, bottomY) };
}

function readAlphaPixels(bitmap: ImageBitmap, transparentX: number, transparentY: number, opaqueX: number, opaqueY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D no disponible para verificar alpha.");
  context.drawImage(bitmap, 0, 0);
  return {
    transparent: context.getImageData(transparentX, transparentY, 1, 1).data[3],
    opaque: context.getImageData(opaqueX, opaqueY, 1, 1).data[3],
  };
}

async function createTransparentPngFixture() {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 100;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para PNG alpha.");
  context.fillStyle = "#008877";
  context.beginPath();
  context.arc(80, 50, 35, 0, Math.PI * 2);
  context.fill();
  return new File([await canvasBlob(canvas, "image/png")], "transparent-logo.png", { type: "image/png" });
}

async function createSolidPngFixture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para PNG pequeño.");
  context.fillStyle = "#abcdef";
  context.fillRect(0, 0, width, height);
  return new File([await canvasBlob(canvas, "image/png")], "small.png", { type: "image/png" });
}

async function createNoiseJpegFixture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D no disponible para fixture adaptativa.");
  const image = context.createImageData(width, height);
  let seed = 0x12345678;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    image.data[index] = seed & 0xff;
    image.data[index + 1] = (seed >>> 8) & 0xff;
    image.data[index + 2] = (seed >>> 16) & 0xff;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return new File([await canvasBlob(canvas, "image/jpeg", 0.95)], "synthetic-noise.jpg", { type: "image/jpeg" });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`No se pudo crear fixture ${type}.`)), type, quality);
  });
}

function matchesAscii(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

function ascii(view: DataView, offset: number, length: number) {
  return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, length));
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
