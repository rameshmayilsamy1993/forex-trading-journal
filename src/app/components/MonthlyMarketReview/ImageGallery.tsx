import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface GalleryImage {
  url: string;
  caption?: string;
  createdAt?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const isOpen = selectedIndex !== null;
  const selectedImage = isOpen ? images[selectedIndex] : null;
  const zoomAreaRef = useRef<HTMLDivElement>(null);

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
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeLightbox, goToPrev, goToNext]);

  if (images.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-[#E5EAF2] bg-white/40"
      >
        <div className="size-20 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center mb-5">
          <ImageIcon className="size-9 text-[#7C3AED]/40" />
        </div>
        <p className="text-body font-medium text-[#64748B]">No images attached</p>
        <p className="text-caption text-[#94A3B8] mt-1">Screenshots will appear here</p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="columns-2 md:columns-3 lg:columns-4 gap-4"
      >
        {images.map((image, index) => (
          <motion.div
            key={image.url || `gallery-${index}`}
            variants={itemVariants}
            className="break-inside-avoid mb-4 group relative cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            <div className="relative overflow-hidden rounded-2xl bg-[#F8FAFC] border border-[#E5EAF2] shadow-sm transition-shadow duration-300 group-hover:shadow-xl">
              <img
                src={image.url}
                alt={image.caption || 'Gallery image'}
                loading="lazy"
                className="w-full h-auto rounded-2xl transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                    <ZoomIn className="size-3.5 text-white" />
                    <span className="text-[11px] font-medium text-white">View</span>
                  </div>
                  {image.caption && (
                    <span className="text-[11px] text-white/90 truncate max-w-[60%] px-2.5 py-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                      {image.caption}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {isOpen && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={e => { e.stopPropagation(); closeLightbox(); }}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors z-10"
            >
              <X className="size-5 text-white" />
            </motion.button>

            {images.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={e => { e.stopPropagation(); goToPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
                >
                  <ChevronLeft className="size-7 text-white" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={e => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
                >
                  <ChevronRight className="size-7 text-white" />
                </motion.button>
              </>
            )}

            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="flex flex-col items-center gap-4 max-w-4xl max-h-[90vh] px-4"
              onClick={e => e.stopPropagation()}
              ref={zoomAreaRef}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.caption || 'Gallery image'}
                className={cn(
                  'max-w-full max-h-[75vh] object-contain rounded-xl cursor-pointer transition-transform duration-300',
                  isZoomed && 'scale-[1.8] cursor-zoom-out',
                )}
                onClick={toggleZoom}
              />
              {selectedImage.caption && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/80 text-sm text-center max-w-lg"
                >
                  {selectedImage.caption}
                </motion.p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleZoom}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ZoomIn className="size-4" />
                  {isZoomed ? 'Reset' : 'Zoom'}
                </Button>
                <a href={selectedImage.url} download target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
