// IndexedDB thumbnail cache for images

type DBType = IDBDatabase | null;
let db: DBType = null;

const DB_NAME = 'photo-cache';
const STORE = 'thumbnails';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getThumbnail(key: string): Promise<string | undefined> {
  try {
    const d = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function setThumbnail(key: string, dataUrl: string): Promise<void> {
  try {
    const d = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(dataUrl, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

export async function clearThumbnails(): Promise<void> {
  try {
    const d = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

export async function createThumbnailFromUrl(url: string, size = 256, type: 'image/webp' | 'image/jpeg' = 'image/webp', quality = 0.7): Promise<string> {
  const img = await loadImage(url);
  const { canvas, ctx } = createCanvas(img, size);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const mime = supportsWebP() ? type : 'image/jpeg';
  return canvas.toDataURL(mime, quality);
}

export async function getOrCreateThumbnail(url: string): Promise<string | undefined> {
  const cached = await getThumbnail(url);
  if (cached) return cached;
  try {
    const dataUrl = await createThumbnailFromUrl(url);
    await setThumbnail(url, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function createCanvas(img: HTMLImageElement, maxSize: number) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  return { canvas, ctx };
}

function supportsWebP(): boolean {
  try {
    const c = document.createElement('canvas');
    return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}

