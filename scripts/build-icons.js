/**
 * build-icons.js — Convert brand SVGs to PNGs at the sizes Expo expects.
 *
 * Run: node scripts/build-icons.js
 * Requires: npm install --save-dev sharp
 *
 * Outputs:
 *   assets/images/icon.png            (1024x1024, with indigo bg)
 *   assets/images/adaptive-icon.png   (1024x1024, transparent bg)
 *
 * The splash PNG is hand-designed and not regenerated here.
 */

const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('\nMissing dependency: sharp');
  console.error('Install with: npm install --save-dev sharp\n');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'brand');
const OUT = path.join(ROOT, 'assets', 'images');

const targets = [
  { svg: 'icon.svg',                       png: 'icon.png',          size: 1024, bg: null },
  { svg: 'adaptive-icon-foreground.svg',   png: 'adaptive-icon.png', size: 1024, bg: null },
];

(async () => {
  for (const t of targets) {
    const svgPath = path.join(SRC, t.svg);
    const outPath = path.join(OUT, t.png);
    if (!fs.existsSync(svgPath)) {
      console.warn(`skip: ${t.svg} not found`);
      continue;
    }
    try {
      let pipeline = sharp(svgPath, { density: 300 }).resize(t.size, t.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (t.bg) {
        pipeline = pipeline.flatten({ background: t.bg });
      }
      await pipeline.png({ quality: 95 }).toFile(outPath);
      console.log(`✓ wrote ${path.relative(ROOT, outPath)} (${t.size}x${t.size})`);
    } catch (err) {
      console.error(`✗ failed to write ${t.png}:`, err.message);
    }
  }
  console.log('\nDone. Rebuild the app with: npx expo prebuild --clean && npx expo run:android');
})();
