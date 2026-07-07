import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import apiService from '../../services/apiService';

interface GalleryImage {
  url: string;
  caption?: string;
  createdAt?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const isOpen = selectedIndex !== null;
  const selectedImage = isOpen ? images[selectedIndex] : null;

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsZoomed(false);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    setIsZoomed(false);
  }, []);

  const goToPrev = useCallback(() => {
    setSelectedIndex(prev => (prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null));
    setIsZoomed(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex(prev => (prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null));
    setIsZoomed(false);
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLightbox, goToPrev, goToNext]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ImageIcon className="size-16 mb-4 opacity-40" />
        <p className="text-lg font-medium">No images yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="break-inside-avoid mb-4 group relative cursor-pointer rounded-xl overflow-hidden"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image.url}
              alt={image.caption || 'Gallery image'}
              loading="lazy"
              className="w-full h-auto rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 rounded-xl flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 rounded-full bg-white/20 backdrop-blur-sm">
                <ZoomIn className="size-6 text-white" />
              </div>
            </div>
            {image.caption && (
              <p className="mt-2 text-sm text-muted-foreground px-1">{image.caption}</p>
            )}
          </div>
        ))}
      </div>

      {isOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="size-6 text-white" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="size-8 text-white" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="size-8 text-white" />
              </button>
            </>
          )}

          <div
            className="flex flex-col items-center gap-4 max-w-4xl max-h-[90vh] px-4"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || 'Gallery image'}
              className={cn(
                'max-w-full max-h-[75vh] object-contain rounded-lg cursor-pointer transition-transform duration-300',
                isZoomed && 'scale-125',
              )}
              onClick={toggleZoom}
            />
            {selectedImage.caption && (
              <p className="text-white/80 text-sm text-center">{selectedImage.caption}</p>
            )}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={toggleZoom}>
                <ZoomIn className="size-4" />
                Zoom
              </Button>
              <a
                href={selectedImage.url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <Download className="size-4" />
                  Download
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
