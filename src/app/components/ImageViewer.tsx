import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ImageViewerProps {
  images: { url: string; label: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(i => i - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) setCurrentIndex(i => i + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setDragPos({ x: 0, y: 0 });
  }, [currentIndex]);

  const zoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));
  const reset = () => {
    setZoom(1);
    setRotation(0);
    setDragPos({ x: 0, y: 0 });
  };
  const rotate = () => setRotation(r => (r + 90) % 360);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const dx = e.clientX - dragPos.x;
      const dy = e.clientY - dragPos.y;
      setDragPos({ x: e.clientX, y: e.clientY });
      if (imgRef.current) {
        const currentTransform = imgRef.current.style.transform;
        const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);
        let tx = 0, ty = 0;
        if (translateMatch) {
          const parts = translateMatch[1].split(/,\s*/);
          tx = parseFloat(parts[0]) || 0;
          ty = parseFloat(parts[1]) || 0;
        }
        imgRef.current.style.transform = `scale(${zoom}) rotate(${rotation}deg) translate(${tx + dx}px, ${ty + dy}px)`;
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom === 1) zoomIn();
    else reset();
  };

  const downloadImage = () => {
    const a = document.createElement('a');
    a.href = images[currentIndex].url;
    a.download = `screenshot-${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/50" onClick={e => e.stopPropagation()}>
        <div className="text-white">
          <span className="font-medium">{images[currentIndex].label}</span>
          {images.length > 1 && <span className="ml-3 text-white/60">{currentIndex + 1}/{images.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadImage} className="p-2 hover:bg-white/20 rounded-lg transition">
            <Download className="w-5 h-5 text-white" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={e => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={images[currentIndex].url}
          alt={images[currentIndex].label}
          className="max-w-full max-h-full object-contain select-none"
          style={{ 
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          draggable={false}
          onClick={handleImageClick}
        />
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCurrentIndex(i => i - 1); }}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCurrentIndex(i => i + 1); }}
            disabled={currentIndex === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 py-4 bg-black/50" onClick={e => e.stopPropagation()}>
        <button onClick={zoomOut} className="p-3 hover:bg-white/20 rounded-xl transition">
          <ZoomOut className="w-6 h-6 text-white" />
        </button>
        <button onClick={reset} className="px-4 py-2 min-w-[80px] hover:bg-white/10 rounded-lg transition">
          <span className="text-white font-mono">{Math.round(zoom * 100)}%</span>
        </button>
        <button onClick={zoomIn} className="p-3 hover:bg-white/20 rounded-xl transition">
          <ZoomIn className="w-6 h-6 text-white" />
        </button>
        <div className="w-px h-8 bg-white/30 mx-2" />
        <button onClick={rotate} className="p-3 hover:bg-white/20 rounded-xl transition">
          <RotateCw className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                i === currentIndex ? 'border-blue-500' : 'border-white/30 hover:border-white/60'
              }`}
            >
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
