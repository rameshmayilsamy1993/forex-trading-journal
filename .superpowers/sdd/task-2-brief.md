### Task 2: Cloudinary Image Transformations

**Files:**
- Create: `src/app/utils/cloudinary.ts`
- Modify: `src/app/components/ImageViewer.tsx`

**Interfaces:**
- Produces: `getCloudinaryUrl(url, options)`, `getThumbnail(url)`, `getResponsiveUrl(url, width)`
- Consumes: Cloudinary URL format (already in use)

- [ ] **Step 1: Create cloudinary utility**

Write `src/app/utils/cloudinary.ts`:

```typescript
interface CloudinaryOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:best';
  format?: 'auto' | 'webp' | 'jpg';
}

const CLOUDINARY_REGEX = /\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

function isCloudinaryUrl(url: string): boolean {
  return CLOUDINARY_REGEX.test(url);
}

function injectTransform(url: string, transform: string): string {
  return url.replace(/\/image\/upload\//, `/image/upload/${transform}/`);
}

export function getCloudinaryUrl(url: string, options: CloudinaryOptions = {}): string {
  if (!isCloudinaryUrl(url)) return url;
  const parts: string[] = [];
  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.crop) parts.push(`c_${options.crop}`);
  parts.push(options.quality ? `q_${options.quality}` : 'q_auto:good');
  parts.push(options.format ? `f_${options.format}` : 'f_auto');
  return injectTransform(url, parts.join(','));
}

export function getThumbnail(url: string): string {
  return getCloudinaryUrl(url, { width: 150, height: 150, crop: 'fill' });
}

export function getResponsiveUrl(url: string, width: number): string {
  return getCloudinaryUrl(url, { width, crop: 'limit' });
}
```

- [ ] **Step 2: Update ImageViewer to use thumbnails and responsive images**

Read current `src/app/components/ImageViewer.tsx`, then:
- Import `{ getThumbnail, getResponsiveUrl }`
- Use `getThumbnail(url)` for thumbnail strip src
- Use `getResponsiveUrl(url, 800)` for main display src
- Add `loading="lazy"` to all `<img>` tags

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/utils/cloudinary.ts src/app/components/ImageViewer.tsx
git commit -m "feat: add Cloudinary thumbnail and responsive image transformations"
```

---

