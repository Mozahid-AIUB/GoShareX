# GoShareX — Brand Assets

This folder holds the **source SVGs** for the app icon and adaptive icon.
The actual PNGs that Expo consumes live in `../images/`. You only need to
regenerate them when you change the SVG.

## Required PNG outputs

| File | Size | Background | Notes |
|---|---|---|---|
| `../images/icon.png` | 1024×1024 | Indigo gradient (in SVG) | iOS + base icon |
| `../images/adaptive-icon.png` | 1024×1024 | **Transparent** | Android foreground (system masks corners) |

## Source SVGs

- `icon.svg` — Full icon with indigo gradient background, white "G", small rickshaw accent
- `adaptive-icon-foreground.svg` — Just the G + rickshaw, transparent background

## How to regenerate PNGs

### Option 1 — Online (easiest, no install)

1. Open https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Set output size: 1024 × 1024
4. Download → rename to `icon.png` → drop into `../images/`
5. Repeat for `adaptive-icon-foreground.svg` → `adaptive-icon.png`

### Option 2 — Local CLI (Inkscape)

```powershell
inkscape icon.svg --export-type=png --export-filename=../images/icon.png --export-width=1024 --export-height=1024
inkscape adaptive-icon-foreground.svg --export-type=png --export-filename=../images/adaptive-icon.png --export-width=1024 --export-height=1024
```

### Option 3 — Node script (sharp)

```bash
npm install --save-dev sharp
node scripts/build-icons.js
```

## Background color (Android adaptive icon)

Configured in `app.config.js` under `expo.android.adaptiveIcon.backgroundColor`.
Currently set to `#6366F1` (indigo). The SVG foreground assumes this color.

## Splash screen

The splash uses `../images/gosharex-matrix-splash.png` directly — already
designed, no regeneration needed. Config lives in `app.config.js` under
the `expo-splash-screen` plugin entry.
