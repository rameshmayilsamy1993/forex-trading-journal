import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline, List, ListOrdered,
  Quote, Code, Heading1, Heading2, Upload, X, Maximize2,
  Image, Replace, GripVertical, ArrowUp, ArrowDown, Clock,
  BookOpen, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import { uploadImage } from '../../../services/uploadService';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';

interface ImageItem {
  id: string;
  file?: File;
  preview?: string;
  url?: string;
  publicId?: string;
  caption?: string;
  isExisting?: boolean;
  uploadProgress?: number;
  uploadState?: 'pending' | 'uploading' | 'done' | 'error';
}

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  reviewId: string;
  editEntry?: any;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const TIME_OPTIONS = ['Early Morning', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Late Night'];
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'];
const MOOD_OPTIONS = ['Confident', 'Cautious', 'Uncertain', 'Optimistic', 'Pessimistic', 'Neutral'];
const IMPORTANCE_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const SESSION_OPTIONS = ['Asian', 'London', 'New York', 'London/New York', 'Sydney', 'Frankfurt'];
const SUGGESTED_TAGS = ['Technical', 'Fundamental', 'Sentiment', 'Macro', 'News', 'Earnings', 'Geopolitical', 'Economic Data'];

let idCounter = 0;
const genId = () => `img-${++idCounter}`;

function stripHtml(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function estimateReadingTime(words: number) {
  return Math.max(1, Math.ceil(words / 200));
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), label: 'Underline' },
    { type: 'divider' },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'Heading' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'Subheading' },
    { type: 'divider' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered List' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), label: 'Quote' },
    { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), label: 'Code' },
    { type: 'divider' },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), label: 'Align Left' },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), label: 'Align Center' },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), label: 'Align Right' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-white border-b border-[#E5EAF2]">
      {tools.map((tool, i) => {
        if ('type' in tool && tool.type === 'divider') {
          return <div key={i} className="w-px h-5 bg-[#E5EAF2] mx-1" />;
        }
        const t = tool as any;
        return (
          <button
            key={i}
            type="button"
            onClick={t.action}
            title={t.label}
            className={cn(
              'p-2 rounded-lg transition-all duration-150',
              t.active
                ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-500/20'
                : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:scale-105',
            )}
          >
            <t.icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export default function AddEntryDialog({ open, onOpenChange, onSaved, reviewId, editEntry }: AddEntryDialogProps) {
  const [entryTitle, setEntryTitle] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalUploading, setTotalUploading] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [entryTime, setEntryTime] = useState('');
  const [bias, setBias] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mood, setMood] = useState('');
  const [importance, setImportance] = useState('');
  const [session, setSession] = useState('');

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false,
      }),
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[320px] max-h-[500px] px-5 py-4 text-[15px]',
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    setEntryTitle(editEntry?.entryTitle || '');
    setEntryTime(editEntry?.entryTime || '');
    setBias(editEntry?.bias || '');
    setTags(editEntry?.tags || []);
    setMood(editEntry?.mood || '');
    setImportance(editEntry?.importance || '');
    setSession(editEntry?.session || '');
    setTagInput('');
    setUploadProgress(0);
    setTotalUploading(0);
    if (editEntry?.images) {
      setImages(editEntry.images.map((img: any) => ({
        id: genId(),
        url: img.url,
        publicId: img.publicId,
        caption: img.caption || '',
        isExisting: true,
        uploadState: 'done' as const,
      })));
    } else {
      setImages([]);
    }
    if (editor) {
      setTimeout(() => editor.commands.setContent(editEntry?.comment || ''), 0);
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, editEntry, editor]);

  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: Only PNG, JPEG, and WEBP files are accepted`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 10MB`;
    }
    return null;
  };

  const addFile = useCallback((file: File) => {
    const newImage: ImageItem = {
      id: genId(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      uploadState: 'pending',
      uploadProgress: 0,
    };
    setImages(prev => [...prev, newImage]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - images.length;
    if (files.length > remaining) {
      alert(`You can only upload ${remaining} more file(s)`);
      files.splice(remaining);
    }
    const errors: string[] = [];
    files.forEach(file => {
      const error = validateFile(file);
      if (error) errors.push(error);
    });
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    files.forEach(addFile);
    e.target.value = '';
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = replaceIndexRef.current;
    if (!file || idx === null) return;
    const error = validateFile(file);
    if (error) {
      alert(error);
      e.target.value = '';
      return;
    }
    setImages(prev => prev.map((img, i) =>
      i === idx
        ? { ...img, file, preview: URL.createObjectURL(file), uploadState: 'pending' as const, url: undefined, publicId: undefined }
        : img
    ));
    replaceIndexRef.current = null;
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveImage(dragIndex, index);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const wordCount = editor ? countWords(stripHtml(editor.getHTML())) : 0;
  const readingTime = estimateReadingTime(wordCount);
  const totalImages = images.length;

  const handleSubmit = async (shouldClose = true) => {
    if (!entryTitle.trim()) {
      alert('Please enter an entry title');
      return;
    }

    setSaving(true);
    try {
      let entryImages: { url: string; publicId?: string; caption: string }[] = [];
      const pendingUploads = images.filter(img => img.file && !img.isExisting);
      const existingImages = images.filter(img => img.isExisting && img.url);
      entryImages = existingImages.map(img => ({
        url: img.url!,
        publicId: img.publicId,
        caption: img.caption || '',
      }));

      if (pendingUploads.length > 0) {
        setUploading(true);
        setTotalUploading(pendingUploads.length);
        setUploadProgress(0);

        for (let i = 0; i < pendingUploads.length; i++) {
          const img = pendingUploads[i];
          const index = images.indexOf(img);
          setImages(prev => prev.map((p, idx) =>
            idx === index ? { ...p, uploadState: 'uploading' as const, uploadProgress: 0 } : p
          ));

          const result = await uploadImage(img.file!, (pct) => {
            setImages(prev => prev.map((p, idx) =>
              idx === index ? { ...p, uploadProgress: pct } : p
            ));
          });

          setImages(prev => prev.map((p, idx) =>
            idx === index ? { ...p, url: result.url, publicId: result.publicId, uploadState: 'done' as const, uploadProgress: 100 } : p
          ));
          entryImages.push({
            url: result.url,
            publicId: result.publicId,
            caption: img.caption || '',
          });
          setUploadProgress(i + 1);
        }
        setUploading(false);
      }

      const payload: any = {
        entryTitle: entryTitle.trim(),
        comment: editor?.getHTML() || '',
        images: entryImages,
        entryTime,
        bias,
        tags,
        mood,
        importance,
        session,
      };

      if (editEntry?.id) {
        await apiService.monthlyReviews.updateEntry(reviewId, editEntry.id, payload);
      } else {
        await apiService.monthlyReviews.createEntry(reviewId, payload);
      }

      onSaved();
      if (shouldClose) close();
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
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-[1100px] max-w-[90vw] h-[90vh] max-h-[90vh] bg-white rounded-[28px] shadow-2xl shadow-black/10 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-shrink-0 h-[90px] flex items-center justify-between px-10 border-b border-[#E5EAF2] bg-white">
                <div>
                  <h2 className="text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
                    Add Timeline Entry
                  </h2>
                  <p className="text-[15px] text-[#64748B] mt-0.5">
                    Document your monthly analysis
                  </p>
                </div>
                <button
                  onClick={close}
                  className="size-11 rounded-full border border-[#E5EAF2] flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all duration-200"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-10 py-8 space-y-8 scrollbar-thin"
              >
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Entry Title
                  </label>
                  <input
                    value={entryTitle}
                    onChange={e => setEntryTitle(e.target.value)}
                    placeholder="Describe this market update..."
                    className="w-full h-14 px-5 rounded-2xl border border-[#E5EAF2] bg-white text-[16px] font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#7C3AED] focus:ring-[3px] focus:ring-purple-500/10 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Analysis Notes
                  </label>
                  <div className="border border-[#E5EAF2] rounded-[18px] overflow-hidden bg-[#F8FAFC] shadow-sm">
                    <div className="sticky top-0 z-10">
                      <EditorToolbar editor={editor} />
                    </div>
                    <div className="bg-[#F8FAFC] min-h-[320px] max-h-[500px] overflow-y-auto">
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Images
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {images.map((img, index) => (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={e => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'group relative rounded-2xl border border-[#E5EAF2] overflow-hidden bg-white shadow-sm transition-all duration-200',
                            dragIndex === index && 'opacity-50 scale-95 ring-2 ring-[#7C3AED]',
                            'hover:shadow-lg hover:-translate-y-0.5',
                          )}
                        >
                          <div className="aspect-[4/3] relative bg-[#F8FAFC]">
                            <img
                              src={img.preview || img.url}
                              alt={img.caption || `Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 rounded-2xl" />

                            <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                type="button"
                                onClick={() => setFullscreenImage(img.preview || img.url!)}
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748B] hover:text-[#0F172A] shadow-sm transition-all"
                              >
                                <Maximize2 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => { replaceIndexRef.current = index; replaceInputRef.current?.click(); }}
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748B] hover:text-[#0F172A] shadow-sm transition-all"
                              >
                                <Replace className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-sm transition-all"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-[10px] font-medium text-[#64748B] shadow-sm cursor-grab">
                                <GripVertical className="size-3" />
                                Drag
                              </span>
                            </div>

                            {img.uploadState === 'uploading' && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="size-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                  <span className="text-[11px] font-medium text-white">
                                    {img.uploadProgress}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {!img.isExisting && img.uploadState === 'pending' && (
                              <div className="absolute bottom-2 left-2">
                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/80 text-[9px] font-medium text-white">
                                  Pending
                                </span>
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
                              <button
                                type="button"
                                onClick={() => moveImage(index, index - 1)}
                                disabled={index === 0}
                                className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 transition-all"
                              >
                                <ArrowUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(index, index + 1)}
                                disabled={index === images.length - 1}
                                className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 transition-all"
                              >
                                <ArrowDown className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploading && totalUploading > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-purple-50 border border-purple-200 mb-3">
                      <div className="size-5 rounded-full border-2 border-purple-300 border-t-[#7C3AED] animate-spin" />
                      <span className="text-[13px] font-medium text-[#7C3AED]">
                        Uploading {uploadProgress} of {totalUploading} images...
                      </span>
                    </div>
                  )}

                  {remainingSlots > 0 && (
                    <>
                      <label className="flex flex-col items-center justify-center h-[180px] border-2 border-dashed border-[#E5EAF2] rounded-2xl cursor-pointer hover:border-[#7C3AED] hover:bg-purple-50/30 transition-all duration-200 group">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-12 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Upload className="size-5 text-[#7C3AED]" />
                          </div>
                          <span className="text-[15px] font-medium text-[#64748B] group-hover:text-[#7C3AED] transition-colors">
                            Upload Images
                          </span>
                          <span className="text-[12px] text-[#94A3B8]">
                            PNG, JPEG, WEBP · Max 10MB each · {remainingSlots} slots left
                          </span>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>

                      <input
                        ref={replaceInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={handleReplaceFile}
                      />
                    </>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E5EAF2] p-6 shadow-sm">
                  <h3 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-5">
                    Market Metadata
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#0F172A]">Time</label>
                      <Select value={entryTime} onValueChange={setEntryTime}>
                        <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#0F172A]">Bias</label>
                      <Select value={bias} onValueChange={setBias}>
                        <SelectTrigger><SelectValue placeholder="Select bias" /></SelectTrigger>
                        <SelectContent>
                          {BIAS_OPTIONS.map(b => (
                            <SelectItem key={b} value={b}>
                              <span className={cn(
                                'flex items-center gap-2',
                                b === 'Bullish' && 'text-emerald-600 font-medium',
                                b === 'Bearish' && 'text-red-600 font-medium',
                                b === 'Neutral' && 'text-gray-600',
                              )}>
                                {b}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[13px] font-medium text-[#0F172A]">Tags</label>
                      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-[#E5EAF2] bg-white min-h-[48px] focus-within:border-[#7C3AED] focus-within:ring-[3px] focus-within:ring-purple-500/10 transition-all duration-200">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F1F5F9] text-[13px] font-medium text-[#64748B]"
                          >
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="text-[#94A3B8] hover:text-red-500 transition-colors">
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTag(tagInput.replace(/,/g, ''));
                            }
                            if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                              removeTag(tags[tags.length - 1]);
                            }
                          }}
                          placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
                          className="flex-1 min-w-[120px] text-[14px] text-[#0F172A] bg-transparent border-0 outline-none placeholder:text-[#94A3B8]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#94A3B8] bg-[#F8FAFC] border border-[#E5EAF2] hover:text-[#7C3AED] hover:border-[#7C3AED] hover:bg-purple-50 transition-all duration-200"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#0F172A]">Mood</label>
                      <Select value={mood} onValueChange={setMood}>
                        <SelectTrigger><SelectValue placeholder="Select mood" /></SelectTrigger>
                        <SelectContent>
                          {MOOD_OPTIONS.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#0F172A]">Importance</label>
                      <Select value={importance} onValueChange={setImportance}>
                        <SelectTrigger><SelectValue placeholder="Select importance" /></SelectTrigger>
                        <SelectContent>
                          {IMPORTANCE_OPTIONS.map(imp => (
                            <SelectItem key={imp} value={imp}>
                              <span className={cn(
                                'flex items-center gap-2',
                                imp === 'Critical' && 'text-red-600 font-semibold',
                                imp === 'High' && 'text-orange-600',
                                imp === 'Medium' && 'text-blue-600',
                                imp === 'Low' && 'text-gray-600',
                              )}>
                                {imp}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[13px] font-medium text-[#0F172A]">Session</label>
                      <Select value={session} onValueChange={setSession}>
                        <SelectTrigger><SelectValue placeholder="Select trading session" /></SelectTrigger>
                        <SelectContent>
                          {SESSION_OPTIONS.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: 'Word Count', value: wordCount, icon: BookOpen, color: 'from-blue-500 to-blue-600' },
                    { label: 'Images', value: totalImages, icon: Image, color: 'from-purple-500 to-purple-600' },
                    { label: 'Reading Time', value: `${readingTime} min`, icon: Clock, color: 'from-emerald-500 to-emerald-600' },
                    { label: 'Tags', value: tags.length, icon: List, color: 'from-orange-500 to-orange-600' },
                    { label: 'Metadata', value: [bias, mood, session].filter(Boolean).length, icon: AlignLeft, color: 'from-pink-500 to-pink-600' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-2xl border border-[#E5EAF2] p-4 shadow-sm"
                      >
                        <div className={`size-8 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg flex items-center justify-center mb-2.5`}>
                          <Icon className="size-3.5 text-white" />
                        </div>
                        <p className="text-[22px] font-bold text-[#0F172A] leading-tight">{stat.value}</p>
                        <p className="text-[11px] font-medium text-[#94A3B8] mt-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 h-16 flex items-center justify-between px-10 border-t border-[#E5EAF2] bg-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={close}
                    disabled={saving}
                    className="h-12 px-6 rounded-2xl border border-[#E5EAF2] text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  {editEntry && (
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this entry?')) return;
                        try {
                          await apiService.monthlyReviews.deleteEntry(reviewId, editEntry.id);
                          onSaved();
                          close();
                        } catch (err) {
                          console.error('Failed to delete:', err);
                        }
                      }}
                      disabled={saving}
                      className="h-12 px-6 rounded-2xl border border-red-200 text-[14px] font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={saving || uploading}
                    className="h-12 px-6 rounded-2xl border border-[#E5EAF2] text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all duration-200"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={saving || uploading}
                    className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-[14px] font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {saving || uploading ? (
                      <span className="flex items-center gap-2">
                        <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Publishing...
                      </span>
                    ) : (
                      'Publish'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            >
              <X className="size-6" />
            </button>
            <motion.img
              key={fullscreenImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={fullscreenImage}
              alt="Fullscreen preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94A3B8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}