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
