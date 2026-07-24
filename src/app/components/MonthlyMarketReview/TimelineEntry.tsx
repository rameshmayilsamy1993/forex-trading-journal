import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';

interface TimelineEntryProps {
  entry: {
    entryTitle: string;
    comment?: string;
    images?: { url: string; caption?: string }[];
    createdAt: string;
    displayOrder?: number;
  };
  onEdit: (entry: any) => void;
  onDelete: (entry: any) => void;
  onViewImage?: (images: { url: string; label: string }[], index: number) => void;
}

export default function TimelineEntry({ entry, onEdit, onDelete, onViewImage }: TimelineEntryProps) {
  const day = format(new Date(entry.createdAt), 'dd');
  const monthAbbr = format(new Date(entry.createdAt), 'MMM');
  const year = format(new Date(entry.createdAt), 'yyyy');
  const time = format(new Date(entry.createdAt), 'HH:mm');

  const hasImages = entry.images && entry.images.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="relative flex gap-5 group"
    >
      <div className="flex flex-col items-center w-[72px] flex-shrink-0">
        <div className="flex flex-col items-center bg-gradient-to-b from-[#7C3AED] to-[#6D28D9] rounded-xl px-2.5 py-2 shadow-lg shadow-purple-500/20">
          <span className="text-lg font-bold leading-tight text-white">{day}</span>
          <span className="text-[10px] font-medium text-purple-200 uppercase tracking-wider">
            {monthAbbr}
          </span>
        </div>
        <div className="w-px flex-1 min-h-8 relative">
          <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-purple-300 via-purple-200 to-transparent" />
        </div>
      </div>

      <motion.div
        className="flex-1 pb-8"
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="relative bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <div className="absolute -left-[5px] top-8 size-2.5 bg-white border-l border-t border-[#E5EAF2] rotate-45" />

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-heading font-semibold text-[#0F172A] truncate">
                {entry.entryTitle}
              </h3>
              <span className="text-[11px] font-medium text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md shrink-0">
                {time}
              </span>
            </div>
            <div className="flex gap-0.5 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-[#F1F5F9]"
                onClick={() => onEdit(entry)}
              >
                <Edit2 className="size-3.5 text-[#64748B]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-red-50"
                onClick={() => onDelete(entry)}
              >
                <Trash2 className="size-3.5 text-red-400 hover:text-red-500" />
              </Button>
            </div>
          </div>

          {entry.comment && (
            <div className="relative pl-4 border-l-2 border-gradient-to-b from-[#7C3AED] to-[#4F46E5]">
              <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#7C3AED] to-[#4F46E5]" />
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: entry.comment }}
              />
            </div>
          )}

          {hasImages && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {entry.images!.map((img, idx) => (
                <div
                  key={img.url || `entry-img-${idx}`}
                  className="group/img relative overflow-hidden rounded-xl cursor-pointer"
                  onClick={() => onViewImage?.(
                    entry.images!.map((im: any) => ({ url: im.url, label: im.caption || 'Screenshot' })),
                    idx,
                  )}
                >
                  <img
                    src={img.url}
                    alt={img.caption || ''}
                    className="w-full h-[110px] object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all duration-300 rounded-xl" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-xl opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                      <span className="text-[10px] text-white truncate block">
                        {img.caption}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
