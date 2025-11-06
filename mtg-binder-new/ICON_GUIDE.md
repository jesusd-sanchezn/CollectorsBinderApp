# App Icon Guide for Google Play Store

## Icon Requirements

For Google Play Store, you need an **adaptive icon** with the following specifications:

### Adaptive Icon (Android)
- **Foreground Image**: 1024x1024px PNG
  - Transparent background
  - Important content should be in the center 66% (safe zone)
  - The outer 33% may be cropped on some devices
- **Background Color**: Solid color (currently set to `#1A1A1A` in app.json)

### Standard Icon
- **Icon**: 1024x1024px PNG (for general use)
- Used for notifications and other app contexts

## How to Generate Icons

### Option 1: Using Online Tools (Easiest)

1. **Convert SVG to PNG**:
   - Go to https://cloudconvert.com/svg-to-png or https://convertio.co/svg-png/
   - Upload `assets/icon-source.svg`
   - Set output size to 1024x1024px
   - Download the PNG

2. **Save the files**:
   - Save as `assets/icon.png` (1024x1024px)
   - Save as `assets/adaptive-icon.png` (1024x1024px) - same file for Android adaptive icon

### Option 2: Using Image Editing Software

1. **Open the SVG** in:
   - Adobe Illustrator
   - Inkscape (free)
   - Figma (free)
   - GIMP (free)

2. **Export as PNG**:
   - Set canvas size to 1024x1024px
   - Export with transparent background
   - Save as `icon.png` and `adaptive-icon.png`

### Option 3: Using the Provided Script (Recommended)

1. **Install sharp** (image processing library):
   ```bash
   cd mtg-binder-new
   npm install --save-dev sharp
   ```

2. **Run the generation script**:
   ```bash
   node scripts/generate-icons.js
   ```

   Or add to package.json scripts and run:
   ```bash
   npm run generate-icons
   ```

   This will automatically create both `icon.png` and `adaptive-icon.png` at 1024x1024px.

### Option 4: Using Command Line (if you have ImageMagick)

```bash
cd mtg-binder-new/assets
magick icon-source.svg -resize 1024x1024 icon.png
magick icon-source.svg -resize 1024x1024 adaptive-icon.png
```

## Icon Design Notes

The provided SVG icon (`icon-source.svg`) features:
- A card binder with rings
- MTG card representation
- Orange accent color (#FF8610) matching your app theme
- Dark background (#1A1A1A) matching your app theme
- Simple, recognizable design that works at small sizes

## Customizing the Icon

If you want to customize the icon:

1. Edit `assets/icon-source.svg` in any text editor or vector graphics software
2. Adjust colors, shapes, or add your own design
3. Follow the conversion steps above to generate PNG files

## Alternative: Use a Design Service

If you prefer a professional icon:
- **Fiverr**: Search for "app icon design" ($5-$50)
- **99designs**: Professional icon design contests
- **Canva**: Free icon templates (search "app icon")

## Verification

After creating your icons:

1. Place `icon.png` and `adaptive-icon.png` in the `mtg-binder-new/assets/` folder
2. Verify they are 1024x1024px
3. Test your build with: `eas build --platform android`

The icons should appear correctly in your app and on the Play Store listing.

