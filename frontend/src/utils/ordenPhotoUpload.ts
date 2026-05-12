import { apiUrl, getAuthHeaders } from '@/config/api';
import { MAX_FOTO_LONG_EDGE_PX, TARGET_FOTO_COMPRESS_KB } from '@/config/uploads';

/** Ref almacenada en backend (clave R2); data URLs y http(s) son legacy / preview. */
export function isOrdenPhotoStorageRef(ref: string): boolean {
  const s = (ref || '').trim();
  if (!s) return false;
  return !s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('data:');
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Error al comprimir la imagen'));
      },
      'image/jpeg',
      quality
    );
  });
}

function scaleToMaxLongEdge(nw: number, nh: number, maxLongEdge: number): { w: number; h: number } {
  const longEdge = Math.max(nw, nh);
  if (longEdge <= maxLongEdge) return { w: nw, h: nh };
  const s = maxLongEdge / longEdge;
  return {
    w: Math.max(1, Math.round(nw * s)),
    h: Math.max(1, Math.round(nh * s)),
  };
}

/**
 * Comprime a JPEG ~objetivo `maxSizeKB` con buena nitidez: reescalado suave
 * (`imageSmoothingQuality: 'high'`) y búsqueda de calidad JPEG maximizando
 * la calidad que aún cumple el tope de tamaño.
 */
export async function compressImageToJpegBlob(
  file: File,
  maxSizeKB = TARGET_FOTO_COMPRESS_KB,
  initialMaxLongEdge = MAX_FOTO_LONG_EDGE_PX
): Promise<Blob> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error('Imagen sin dimensiones válidas');

  const maxBytes = maxSizeKB * 1024;
  /** Aceptar ligero margen por variaciones del encoder. */
  const maxBytesLoose = Math.min(maxBytes * 1.04, maxBytes + 2048);

  const render = (w: number, h: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  };

  /** Mayor calidad JPEG tal que tamaño <= maxBytesLoose (calidad alta → archivo más grande). */
  const bestBlobUnderBudget = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    let lo = 0.42;
    let hi = 0.93;
    let best: Blob | null = null;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const blob = await canvasToJpegBlob(canvas, mid);
      if (blob.size <= maxBytesLoose) {
        best = blob;
        lo = mid;
      } else {
        hi = mid;
      }
      if (hi - lo < 0.01) break;
    }
    return best;
  };

  let maxLongEdge = initialMaxLongEdge;
  const minLongEdge = 560;

  for (let pass = 0; pass < 10 && maxLongEdge >= minLongEdge; pass++) {
    const { w, h } = scaleToMaxLongEdge(w0, h0, maxLongEdge);
    const canvas = render(w, h);
    const blob = await bestBlobUnderBudget(canvas);
    if (blob && blob.size <= maxBytesLoose) {
      return blob;
    }
    maxLongEdge = Math.floor(maxLongEdge * 0.86);
  }

  const { w, h } = scaleToMaxLongEdge(w0, h0, minLongEdge);
  const canvas = render(w, h);
  let q = 0.82;
  for (let i = 0; i < 10; i++) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (blob.size <= maxBytesLoose) return blob;
    q -= 0.06;
    if (q < 0.35) break;
  }
  return canvasToJpegBlob(canvas, 0.35);
}

export async function uploadOrdenPhotoMultipart(
  file: File,
  folder = 'ordenes/fotos'
): Promise<{ url: string; key: string } | null> {
  try {
    const blob = await compressImageToJpegBlob(file);
    const fd = new FormData();
    fd.append('image', blob, 'photo.jpg');
    fd.append('folder', folder);
    const resp = await fetch(apiUrl('/api/ordenes/upload-image/'), {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: fd,
      credentials: 'include',
    });
    if (!resp.ok) return null;
    const data = (await resp.json().catch(() => null)) as { url?: string; key?: string } | null;
    const url = data?.url ? String(data.url) : '';
    const keyRaw = data?.key ? String(data.key).trim() : '';
    if (!url) return null;
    /** Sin R2 el backend puede devolver solo URL; persistimos la URL como ref legacy. */
    const key = keyRaw || url;
    return { url, key };
  } catch {
    return null;
  }
}
