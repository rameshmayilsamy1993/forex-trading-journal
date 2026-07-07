"use client";

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2,
  Upload, X
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import apiService from '../../services/apiService';
import { cn } from '../ui/utils';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];

const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;

interface CreateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editReview?: any;
}

export default function CreateReviewDialog({
  open,
  onOpenChange,
  onSaved,
  editReview
}: CreateReviewDialogProps) {
  const isEditMode = !!editReview;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [bias, setBias] = useState('');
  const [theme, setTheme] = useState('');
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: editReview?.summary || '',
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-4 py-3' },
    },
  });

  useEffect(() => {
    if (editReview) {
      setPair(editReview.pair || '');
      setMonth(editReview.month?.toString() || '');
      setYear(editReview.year?.toString() || '');
      setBias(editReview.bias || '');
      setTheme(editReview.title || '');
      setChartPreview(editReview.imagePath || '');
      setImageCaption(editReview.imageCaption || '');
      if (editor && editReview.summary) {
        editor.commands.setContent(editReview.summary);
      }
    }
  }, [editReview, editor]);

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  const resetForm = useCallback(() => {
    setPair('');
    setMonth('');
    setYear(new Date().getFullYear().toString());
    setBias('');
    setTheme('');
    setChartFile(null);
    setChartPreview('');
    setImageCaption('');
    if (editor) {
      editor.commands.setContent('');
    }
  }, [editor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setChartFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setChartPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!pair || !month || !year) {
      alert('Please fill in all required fields: Pair, Month, and Year.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imagePath = editReview?.imagePath || '';
      let imagePublicId = editReview?.imagePublicId || '';

      if (chartFile) {
        if (editReview?.imagePublicId) {
          await apiService.upload.delete(editReview.imagePublicId).catch(() => {});
        }
        const uploadResult = await apiService.upload.single(chartFile);
        imagePath = uploadResult.url;
        imagePublicId = uploadResult.publicId;
      }

      const payload: any = {
        pair,
        month: parseInt(month),
        year: parseInt(year),
        bias: bias || undefined,
        title: theme || undefined,
        summary: editor?.getHTML() || '',
        imagePath: imagePath || undefined,
        imageCaption: imageCaption || undefined,
      };

      if (imagePublicId) {
        payload.imagePublicId = imagePublicId;
      }

      if (isEditMode) {
        await apiService.monthlyReviews.update(editReview._id, payload);
      } else {
        await apiService.monthlyReviews.create(payload);
      }

      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save review:', error);
      alert('Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-[#2563EB] text-white'
          : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
      )}
    >
      {children}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Review' : 'Create Review'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the monthly market review details.'
              : 'Create a new monthly market review entry.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pair">Pair *</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger id="pair">
                <SelectValue placeholder="Select pair" />
              </SelectTrigger>
              <SelectContent>
                {pairs.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Initial Bias</Label>
            <div className="flex gap-2">
              {BIAS_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={bias === option ? 'default' : 'outline'}
                  className={cn(
                    bias === option && '!bg-purple-600 !border-purple-600'
                  )}
                  onClick={() => setBias(bias === option ? '' : option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="theme">Monthly Theme</Label>
            <Input
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Breakout month after consolidation"
            />
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <div className="border border-[#E5EAF2] rounded-xl overflow-hidden bg-white">
              <div className="flex flex-wrap gap-1 p-2 border-b border-[#E5EAF2] bg-[#F8FAFC]">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editor?.isActive('bold')}
                  title="Bold"
                >
                  <Bold className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editor?.isActive('italic')}
                  title="Italic"
                >
                  <Italic className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editor?.isActive('underline')}
                  title="Underline"
                >
                  <UnderlineIcon className="size-4" />
                </ToolbarButton>
                <div className="w-px bg-[#E5EAF2] mx-1" />
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  <List className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editor?.isActive('orderedList')}
                  title="Ordered List"
                >
                  <ListOrdered className="size-4" />
                </ToolbarButton>
                <div className="w-px bg-[#E5EAF2] mx-1" />
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  isActive={editor?.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  <Heading1 className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  isActive={editor?.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  <Heading2 className="size-4" />
                </ToolbarButton>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Monthly Chart Image</Label>
            <div className="relative rounded-2xl border border-dashed border-[#E5EAF2] bg-white/70 p-6 text-center transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50">
              {chartPreview ? (
                <div className="relative inline-block">
                  <img
                    src={chartPreview}
                    alt="Chart preview"
                    className="max-h-48 rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setChartFile(null);
                      if (!editReview?.imagePath) {
                        setChartPreview('');
                      } else {
                        setChartPreview(editReview.imagePath);
                        setChartFile(null);
                      }
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="size-8 text-[#64748B]" />
                  <span className="text-body-sm text-[#64748B]">
                    Click to upload chart image
                  </span>
                  <span className="text-caption text-[#94A3B8]">
                    PNG, JPG or GIF (max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {chartPreview && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="imageCaption">Image Caption</Label>
                <Input
                  id="imageCaption"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Add a caption for this chart image"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Review' : 'Create Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
