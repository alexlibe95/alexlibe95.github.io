# PWA Setup for Mobile Installation

I've added Progressive Web App (PWA) support to fix the white background issue when installing the site on mobile.

## Files Created:
- ✅ `manifest.json` - PWA configuration with black background
- ✅ `android-icon.svg` - Template for Android icons
- ✅ HTML meta tags for PWA support

## What's Fixed:
- **Black background** instead of white during loading
- **Black status bar** on mobile
- **Proper app theming** for installed PWA

## Icons Still Needed:

### Option 1: Convert SVG to PNG (Recommended)
Use an online converter or ImageMagick to create:
```bash
# Convert android-icon.svg to required sizes
convert android-icon.svg -resize 192x192 android-chrome-192x192.png
convert android-icon.svg -resize 512x512 android-chrome-512x512.png
```

### Option 2: Online PWA Icon Generator
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload your `favicon.svg` or `android-icon.svg`
3. Set background color to `#000000` (black)
4. Download all generated icons

### Required Files:
- `android-chrome-192x192.png` (192x192)
- `android-chrome-512x512.png` (512x512)
- `favicon-32x32.png` (32x32)
- `apple-touch-icon.png` (180x180)

## Current Status:
✅ PWA manifest configured
✅ Theme colors set to black (#000000)
✅ Apple mobile web app meta tags
✅ Microsoft tile colors
✅ Black status bar and loading screen
⚠️ Icons need to be generated and uploaded

## Test Installation:
1. Open site on mobile browser
2. Add to Home Screen
3. Loading screen should now be black
4. App should open without browser UI

The black theme will ensure the loading screen matches your matrix aesthetic!