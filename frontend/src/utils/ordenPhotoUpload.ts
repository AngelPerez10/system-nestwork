import { apiUrl, getAuthHeaders } from '@/config/api';

/** Ref almacenada en backend (clave R2); data URLs y http(s) son legacy / preview. */
export function isOrdenPhotoStorageRef(ref: string): boolean {
  const s = (ref || '').trim();
  if (!s) return false;
  return !s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('data:');
}

export async function compressImageToJpegBlob(
  file: File,
  maxSizeKB = 80,
  maxWidth = 1400,
  maxHeight = 1400
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx?.drawImage(img, 0, 0, width, height);

        let minQuality = 0.1;
        let maxQuality = 0.95;
        let attempts = 0;
        const maxAttempts = 8;

        const binarySearchCompress = (low: number, high: number) => {
          if (attempts >= maxAttempts || high - low < 0.01) {
            const finalQuality = (low + high) / 2;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Error al comprimir la imagen'));
                  return;
                }
                resolve(blob);
              },
              'image/jpeg',
              finalQuality
            );
            return;
          }

          attempts++;
          const midQuality = (low + high) / 2;
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }
              const sizeKB = blob.size / 1024;
              if (Math.abs(sizeKB - maxSizeKB) < 5) {
                resolve(blob);
              } else if (sizeKB > maxSizeKB) {
                binarySearchCompress(low, midQuality);
              } else {
                binarySearchCompress(midQuality, high);
              }
            },
            'image/jpeg',
            midQuality
          );
        };

        binarySearchCompress(minQuality, maxQuality);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
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
