import api from './api';

interface UploadResult {
  url: string;
  publicId: string;
  originalName: string;
}

interface UploadProgressCallback {
  (progress: number): void;
}

export async function uploadImage(file: File, onProgress?: UploadProgressCallback): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(pct);
          }
        }
      : undefined,
  });

  return data;
}

export async function uploadMultiple(files: File[], onProgress?: UploadProgressCallback): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const { data } = await api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(pct);
          }
        }
      : undefined,
  });

  return data;
}

export async function deleteImage(publicId: string): Promise<void> {
  await api.delete(`/upload/${encodeURIComponent(publicId)}`);
}

export { uploadImage as single, uploadMultiple as multiple };
