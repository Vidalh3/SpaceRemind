// Rasterizes assets/icon.svg into the PNG icon set the PWA manifest needs.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "assets/icon.svg"));
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

// Maskable icon: same art on a full-bleed brand background with safe padding.
async function maskable() {
  const size = 512;
  const pad = Math.round(size * 0.1);
  const art = await sharp(svg).resize(size - pad * 2, size - pad * 2).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#4f46e5" },
  })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toFile(resolve(outDir, "maskable-512.png"));
}

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(resolve(outDir, file));
}
await maskable();
console.log("Generated icons in public/icons");
