import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../services/apiService';
import { uploadImage } from '../../../services/uploadService';

interface AddUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  reviewId: string;
}

const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;

export default function AddUpdateDialog({ open, onOpenChange, onSaved, reviewId }: AddUpdateDialogProps) {
  const [bias, setBias] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<{ file?: File; preview?: string; url?: string; publicId?: string; caption: string; }[]>([]);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { file, preview: reader.result as string, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const uploadResults = await Promise.all(
        images.filter(img => img.file).map(img => uploadImage(img.file!))
      );
      let uploadIdx = 0;
      const uploadedImages = [];
      for (const img of images) {
        if (img.file) {
          const result = uploadResults[uploadIdx++];
          uploadedImages.push({ url: result.url, publicId: result.publicId, caption: img.caption });
        } else if (img.url) {
          uploadedImages.push({ url: img.url, publicId: img.publicId, caption: img.caption });
        }
      }

      await apiService.dailyReviews.createEntry(reviewId, {
        entryTitle: 'Intraday Update',
        comment: notes,
        images: uploadedImages,
        bias: bias || undefined,
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save update:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#0F172A]">Add Market Update</h2>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg hover:bg-[#F1F5F9]">
                <X className="size-5 text-[#64748B]" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#334155]">Current Bias</label>
                <div className="flex gap-2 mt-1.5">
                  {BIAS_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBias(bias === option ? '' : option)}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        bias === option
                          ? option === 'Bullish'
                            ? 'bg-[#16A34A] text-white'
                            : option === 'Bearish'
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-[#64748B] text-white'
                          : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#334155]">Screenshots</label>
                <div className="mt-1.5">
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {images.map((img, i) => (
                        <div key={i} className="relative aspect-video bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden">
                          <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-0.5 bg-red-500/90 text-white rounded"
                          >
                            <X className="size-3" />
                          </button>
                          <input
                            value={img.caption}
                            onChange={e => setImages(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                            placeholder="Caption"
                            className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-xs bg-black/50 text-white placeholder:text-white/50 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center h-24 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all">
                    <Upload className="size-5 text-[#94A3B8]" />
                    <span className="text-sm text-[#64748B] ml-2">Upload screenshots</span>
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => handleImageUpload(e.target.files)} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#334155]">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What's happening in the market?"
                  rows={4}
                  className="w-full mt-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
