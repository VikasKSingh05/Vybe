/**
 * Generates the PWA icon set in public/ from app/icon.png.
 * Run once (and whenever the source icon changes): node scripts/generate-icons.mjs
 *
 * Manifest install criteria want explicit 192px and 512px entries, plus a
 * maskable variant whose artwork sits inside an ~80% safe zone so Android's
 * circular masks never clip it.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "app", "icon.png");
const outDir = path.join(root, "public");

// Maskable safe zone: content scaled to 80% on the theme background.
const MASKABLE_SIZE = 512;
const SAFE_SCALE = 0.8;
const innerSize = Math.round(MASKABLE_SIZE * SAFE_SCALE);

await mkdir(outDir, { recursive: true });

await sharp(source)
  .resize(192, 192)
  .png()
  .toFile(path.join(outDir, "icon-192.png"));

await sharp(source)
  .resize(512, 512)
  .png()
  .toFile(path.join(outDir, "icon-512.png"));

const inner = await sharp(source).resize(innerSize, innerSize).png().toBuffer();

await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 4,
    background: "#0a0a0a",
  },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));

console.log("Wrote public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png");
