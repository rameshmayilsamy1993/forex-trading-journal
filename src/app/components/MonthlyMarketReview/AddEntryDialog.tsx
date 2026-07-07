import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Upload, X, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import apiService from '../../services/apiService';
import { cn } from '../ui/utils';

interface ImageItem {
  file?: File;
  preview?: string;
  url?: string;
  publicId?: string;
  caption?: string;
  isExisting?: boolean;
}

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  reviewId: string;
  editEntry?: any;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function AddEntryDialog({ open, onOpenChange, onSaved, reviewId, editEntry }: AddEntryDialogProps) {
  const [entryTitle, setEntryTitle] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-4 py-3',
      },
    },
  });

  useEffect(() => {
    if (open) {
      setEntryTitle(editEntry?.entryTitle || '');
      if (editEntry?.images) {
        setImages(editEntry.images.map((img: any) => ({
          url: img.url,
          publicId: img.publicId,
          caption: img.caption || '',
          isExisting: true,
        })));
      } else {
        setImages([]);
      }
      if (editor) {
        editor.commands.setContent(editEntry?.comment || '');
      }
    }
  }, [open, editEntry, editor]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: Only PNG, JPEG, and WEBP files are accepted`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 10MB`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - images.length;

    if (files.length > remaining) {
      alert(`You can only upload ${remaining} more file(s)`);
      files.splice(remaining);
    }

    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }));

    setImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));
  };

  const handleSubmit = async () => {
    if (!entryTitle.trim()) {
      alert('Please enter an entry title');
      return;
    }

    setSaving(true);
    try {
      let entryImages = images.filter(img => img.isExisting).map(img => ({
        url: img.url!,
        publicId: img.publicId!,
        caption: img.caption || '',
      }));

      const newFiles = images.filter(img => img.file && !img.isExisting);
      if (newFiles.length > 0) {
        setUploading(true);
        const uploaded = await apiService.upload.multiple(newFiles.map(img => img.file!));
        const uploadedWithCaptions = uploaded.map((result, i) => ({
          url: result.url,
          publicId: result.publicId,
          caption: newFiles[i].caption || '',
        }));
        entryImages = [...entryImages, ...uploadedWithCaptions];
        setUploading(false);
      }

      const payload = {
        entryTitle: entryTitle.trim(),
        comment: editor?.getHTML() || '',
        images: entryImages,
      };

      if (editEntry?._id) {
        await apiService.monthlyReviews.updateEntry(reviewId, editEntry._id, payload);
      } else {
        await apiService.monthlyReviews.createEntry(reviewId, payload);
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const remainingSlots = MAX_FILES - images.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="entryTitle">Entry Title</Label>
            <Input
              id="entryTitle"
              value={entryTitle}
              onChange={e => setEntryTitle(e.target.value)}
              placeholder="What happened this week?"
            />
          </div>

          <div className="space-y-2">
            <Label>Comment</Label>
            <div className="border border-[#E5EAF2] rounded-xl overflow-hidden">
              <div className="flex flex-wrap gap-1 p-2 border-b border-[#E5EAF2] bg-[#F8FAFC]">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors',
                    editor?.isActive('bold') ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors italic',
                    editor?.isActive('italic') ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors underline',
                    editor?.isActive('underline') ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  U
                </button>
                <span className="w-px bg-[#E5EAF2] mx-1" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors',
                    editor?.isActive('heading', { level: 3 }) ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors',
                    editor?.isActive('bulletList') ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={cn(
                    'px-2.5 py-1 text-sm rounded-lg transition-colors',
                    editor?.isActive('orderedList') ? 'bg-[#E2E8F0] text-[#0F172A]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  )}
                >
                  1. List
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Images</Label>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group rounded-xl border border-[#E5EAF2] overflow-hidden bg-[#F8FAFC]">
                    <div className="aspect-video relative">
                      <img
                        src={img.preview || img.url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X className="size-3.5" />
                      </button>
                      {!img.url && !img.preview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#F1F5F9]">
                          <Image className="size-8 text-[#94A3B8]" />
                        </div>
                      )}
                    </div>
                    <Input
                      value={img.caption || ''}
                      onChange={e => updateCaption(index, e.target.value)}
                      placeholder="Add caption..."
                      className="border-0 rounded-none border-t border-[#E5EAF2] h-9 px-3 text-body-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {remainingSlots > 0 && (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#E5EAF2] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
                <Upload className="size-5 text-[#64748B]" />
                <span className="text-body-sm text-[#64748B]">
                  Upload Images ({remainingSlots} of {MAX_FILES} slots remaining)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving || uploading ? 'Saving...' : editEntry ? 'Update Entry' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
