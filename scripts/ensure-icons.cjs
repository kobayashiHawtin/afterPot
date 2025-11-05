'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

async function createIcon(size, filename) {
  const filePath = path.join(iconsDir, filename);
  if (fs.existsSync(filePath)) {
    console.log('[ensure-icons] skip existing', filename);
    return;
  }

  // Create a simple gradient icon with RGBA
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Simple purple gradient
      canvas[i] = Math.floor(102 + (x / size) * 16);     // R
      canvas[i + 1] = Math.floor(126 + (y / size) * 16); // G
      canvas[i + 2] = Math.floor(234 - (x / size) * 50); // B
      canvas[i + 3] = 255;                                // A (fully opaque)
    }
  }

  await sharp(canvas, {
    raw: {
      width: size,
      height: size,
      channels: 4
    }
  })
  .png()
  .toFile(filePath);

  console.log('[ensure-icons] created', filename);
}

async function createICO() {
  const filePath = path.join(iconsDir, 'icon.ico');
  if (fs.existsSync(filePath)) {
    console.log('[ensure-icons] skip existing icon.ico');
    return;
  }

  // Create a 32x32 RGBA buffer for ICO
  const size = 32;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      canvas[i] = Math.floor(102 + (x / size) * 16);
      canvas[i + 1] = Math.floor(126 + (y / size) * 16);
      canvas[i + 2] = Math.floor(234 - (x / size) * 50);
      canvas[i + 3] = 255;
    }
  }

  // Convert to PNG first, then save as ICO (Windows accepts PNG in ICO container)
  const pngBuffer = await sharp(canvas, {
    raw: {
      width: size,
      height: size,
      channels: 4
    }
  })
  .png()
  .toBuffer();

  // Simple ICO header + PNG data
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);        // Reserved
  icoHeader.writeUInt16LE(1, 2);        // Type: ICO
  icoHeader.writeUInt16LE(1, 4);        // Image count
  icoHeader.writeUInt8(size, 6);        // Width
  icoHeader.writeUInt8(size, 7);        // Height
  icoHeader.writeUInt8(0, 8);           // Color palette
  icoHeader.writeUInt8(0, 9);           // Reserved
  icoHeader.writeUInt16LE(1, 10);       // Color planes
  icoHeader.writeUInt16LE(32, 12);      // Bits per pixel
  icoHeader.writeUInt32LE(pngBuffer.length, 14); // Image size
  icoHeader.writeUInt32LE(22, 18);      // Image offset

  const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);
  fs.writeFileSync(filePath, icoBuffer);
  console.log('[ensure-icons] created icon.ico');
}

async function main() {
  await createIcon(32, '32x32.png');
  await createIcon(128, '128x128.png');
  await createIcon(256, '128x128@2x.png');
  await createIcon(128, 'icon.png');
  await createICO();
  console.log('[ensure-icons] done');
}

main().catch(err => {
  console.error('[ensure-icons] error:', err);
  process.exit(1);
});
