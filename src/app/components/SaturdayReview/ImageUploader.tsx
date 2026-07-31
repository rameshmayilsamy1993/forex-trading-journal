import { useRef, useState } from 'react';
import { Upload, X, Replace, Maximize2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { uploadImage, deleteImage } from '../../../services/uploadService';
import { compressImage } from '../../utils/imageCompression';
import ImageViewer from '../ImageViewer';
import { MAX_IMAGES_PER_EVENT } from './saturdayReviewConstants';
import type { ImageItem } from './saturdayReviewTypes';
import { cn } from '../ui/utils';

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let idCounter = 0;
const genId = () => `sat-img-${++idCounter}`;

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState<number | null>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: Only PNG, JPEG, or WEBP`;
    if (file.size > MAX_FILE_SIZE) return `${file.name}: Max 10MB`;
    return null;
  };

  const uploadAndTrack = async (item: ImageItem) => {
    try {
      const compressed = await compressImage(item.file!);
      const result = await uploadImage(compressed, (pct) => {
        onChange(prev => prev.map(i => i.id === item.id ? { ...i, uploadState: 'uploading' as const, uploadProgress: pct } : i));
      });
      onChange(prev => prev.map(i => i.id === item.id ? {
        ...i, url: result.url, publicId: result.publicId, file: undefined, preview: undefined,
        isExisting: true, uploadState: 'done' as const, uploadProgress: 100,
      } : i));
    } catch (err) {
      console.error('Image upload failed:', err);
      onChange(prev => prev.map(i => i.id === item.id ? { ...i, uploadState: 'error' as const } : i));
      alert('Failed to upload an image. Please try again.');
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES_PER_EVENT - images.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_EVENT} images per section`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const errors: string[] = [];
    selected.forEach(f => {
      const e = validate(f);
      if (e) errors.push(e);
    });
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    selected.forEach(file => {
      const item: ImageItem = {
        id: genId(), file, preview: URL.createObjectURL(file), caption: '',
        uploadState: 'pending', uploadProgress: 0,
      };
      onChange(prev => [...prev, item]);
      uploadAndTrack(item);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplace = (files: FileList | null) => {
    const file = files?.[0];
    const idx = replaceIndexRef.current;
    if (!file || idx === null) return;
    const error = validate(file);
    if (error) {
      alert(error);
      return;
    }
    const target = images[idx];
    const item: ImageItem = {
      ...target,
      file,
      preview: URL.createObjectURL(file),
      url: undefined,
      publicId: undefined,
      isExisting: false,
      uploadState: 'pending' as const,
      uploadProgress: 0,
    };
    onChange(prev => prev.map((i, index) => (index === idx ? item : i)));
    if (target?.publicId) {
      deleteImage(target.publicId).catch(() => {});
    }
    uploadAndTrack(item);
    replaceIndexRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const target = images[index];
    onChange(prev => prev.filter((_, i) => i !== index));
    if (target?.publicId) {
      deleteImage(target.publicId).catch(() => {});
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    onChange(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    onChange(prev => prev.map((img, i) => (i === index ? { ...img, caption } : img)));
  };

  const remainingSlots = MAX_IMAGES_PER_EVENT - images.length;
  const uploaded = images.filter(i => i.url);

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  moveImage(dragIndex, index);
                  setDragIndex(index);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'group relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]',
                dragIndex === index && 'opacity-50 ring-2 ring-[#2563EB]',
              )}
            >
              <div className="aspect-[4/3] relative bg-[#F8FAFC]">
                <img
                  src={img.preview || img.url}
                  alt={img.caption || `Image ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setFullscreen(index)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#475569] shadow-sm"
                    title="Preview"
                  >
                    <Maximize2 className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { replaceIndexRef.current = index; replaceInputRef.current?.click(); }}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#475569] shadow-sm"
                    title="Replace"
                  >
                    <Replace className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-sm"
                    title="Delete"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/80 text-[10px] font-medium text-[#64748B] shadow-sm cursor-grab">
                    <GripVertical className="size-3" /> Drag
                  </span>
                </div>
                {img.uploadState === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="size-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-[11px] font-medium text-white">{img.uploadProgress}%</span>
                    </div>
                  </div>
                )}
                {img.uploadState === 'error' && (
                  <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white">Upload failed</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-2.5 py-2">
                <input
                  value={img.caption || ''}
                  onChange={e => updateCaption(index, e.target.value)}
                  placeholder="Caption..."
                  className="flex-1 text-[12px] text-[#64748B] bg-transparent border-0 outline-none placeholder:text-[#94A3B8]"
                />
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0} className="p-1 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <ArrowUp className="size-3" />
                  </button>
                  <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1} className="p-1 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && (
        <label className="flex flex-col items-center justify-center h-[110px] border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group">
          <div className="flex flex-col items-center gap-1.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="size-4 text-[#2563EB]" />
            </div>
            <span className="text-[13px] font-medium text-[#64748B] group-hover:text-[#2563EB]">Upload images</span>
            <span className="text-[11px] text-[#94A3B8]">PNG, JPEG, WEBP · Max 10MB · {remainingSlots} left</span>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => addFiles(e.target.files)} />
        </label>
      )}

      <input ref={replaceInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => handleReplace(e.target.files)} />

      {fullscreen !== null && images[fullscreen]?.url && (
        <ImageViewer
          images={uploaded.map(i => ({ url: i.url!, label: i.caption || 'Screenshot' }))}
          initialIndex={Math.max(0, uploaded.findIndex(i => i.id === images[fullscreen].id))}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}
