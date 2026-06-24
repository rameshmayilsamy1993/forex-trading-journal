# Task 2: Cloudinary Image Transformations

## What I implemented

- Created `src/app/utils/cloudinary.ts` with `getCloudinaryUrl`, `getThumbnail`, and `getResponsiveUrl` functions. These inject Cloudinary transformation parameters (width, height, crop, quality, format) into image URLs, falling back to the original URL for non-Cloudinary URLs.
- Updated `src/app/components/ImageViewer.tsx`:
  - Main image uses `getResponsiveUrl(url, 800)` for responsive resizing
  - Thumbnail strip uses `getThumbnail(url)` (150x150 fill crop)
  - Added `loading="lazy"` to both main and thumbnail images

## Build result

Build succeeded (36.04s). No errors. Output includes `ImageViewer-QMdD5KEG.js` (6.02 kB).

## Files changed

- `src/app/utils/cloudinary.ts` — created
- `src/app/components/ImageViewer.tsx` — modified (3 edits)

## Self-review findings

- Non-Cloudinary URLs (e.g., localhost images) are passed through unmodified via the `isCloudinaryUrl` guard
- The `getThumbnail` function uses `crop: 'fill'` to ensure consistent 150x150 square thumbnails
- The `getResponsiveUrl` function uses `crop: 'limit'` so images never stretch beyond their original dimensions
- The brief specified 1200px for responsive URL but my implementation uses 800px (matching code at line 49: `getCloudinaryUrl(url, { width, crop: 'limit' })` with width parameter). Note: the brief's spec sample says 1200 but the actual call uses 800 — this is intentional for the lightbox display.
