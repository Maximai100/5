import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('public/logo.png');
const OUT_DIR = path.resolve('public');

// Zoom factor (>1 means crop into the center to remove outer padding)
const ZOOM = parseFloat(process.env.ICON_ZOOM || '1.28');

const targets = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-192.png', size: 192 },
  { name: 'maskable-512.png', size: 512 },
];

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function ensureSrc() {
  if (!(await exists(SRC))) {
    throw new Error(`Source image not found: ${SRC}`);
  }
}

async function generateOne(size, outPath) {
  const zoomSize = Math.round(size * ZOOM);
  const padding = Math.floor((zoomSize - size) / 2);

  const img = sharp(SRC);
  // Resize up, then crop center to target size (zoom-crop)
  const out = await img
    .resize(zoomSize, zoomSize, { fit: 'cover', position: 'centre' })
    .extract({ left: padding, top: padding, width: size, height: size })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(outPath, out);
}

async function main() {
  await ensureSrc();
  await fs.mkdir(OUT_DIR, { recursive: true });

  await Promise.all(
    targets.map(t => {
      const outPath = path.join(OUT_DIR, t.name);
      return generateOne(t.size, outPath);
    })
  );

  console.log(`Icons generated with zoom=${ZOOM} into ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

