import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
}

export default function TimelineEntry({ entry, onEdit, onDelete }: TimelineEntryProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const day = format(new Date(entry.createdAt), 'dd');
  const monthAbbr = format(new Date(entry.createdAt), 'MMM');
  const time = format(new Date(entry.createdAt), 'HH:mm');

  const hasImages = entry.images && entry.images.length > 0;

  return (
    <div
      className={cn(
        'relative flex gap-4 transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="flex flex-col items-center w-20 flex-shrink-0">
        <div className="flex flex-col items-center bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
          <span className="text-card-title font-bold text-xl leading-tight">{day}</span>
          <span className="text-caption text-muted-foreground text-xs">{monthAbbr}</span>
          <span className="text-micro text-muted-foreground text-[10px]">{time}</span>
        </div>
        <div className="w-px bg-gray-200 flex-1 min-h-8" />
      </div>

      <div className="flex-1 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-heading font-semibold text-gray-900">{entry.entryTitle}</h3>
            <div className="flex gap-1 shrink-0 ml-4">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onEdit(entry)}
              >
                <Edit2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete(entry)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {entry.comment && (
            <div
              className="prose prose-sm max-w-none text-gray-700 mb-4"
              dangerouslySetInnerHTML={{ __html: entry.comment }}
            />
          )}

          {hasImages && (
            <div className="grid grid-cols-4 gap-2">
              {entry.images!.map((img, idx) => (
                <div key={idx} className="group relative">
                  <img
                    src={img.url}
                    alt={img.caption || ''}
                    className="w-full h-[120px] object-cover rounded-lg border border-gray-100 cursor-pointer transition-transform duration-200 hover:scale-105"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-[10px] text-white truncate block">{img.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
