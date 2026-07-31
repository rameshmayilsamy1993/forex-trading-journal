import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
} from 'lucide-react';
import { uploadImage } from '../../../services/uploadService';
import { compressImage } from '../../utils/imageCompression';
import { cn } from '../ui/utils';
import { STORY_PLACEHOLDER } from './saturdayReviewConstants';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

function EditorToolbar({
  editor,
  uploadingImage,
  onImageClick,
}: {
  editor: any;
  uploadingImage: boolean;
  onImageClick: () => void;
}) {
  if (!editor) return null;

  const tools: any[] = [
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
    { type: 'divider' },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), label: 'Align Left' },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), label: 'Align Center' },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), label: 'Align Right' },
    { type: 'divider' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E2E8F0] bg-white">
      {tools.map((tool, i) => {
        if (tool.type === 'divider') {
          return <div key={`div-${i}`} className="w-px h-5 bg-[#E2E8F0] mx-1" />;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={tool.action}
            title={tool.label}
            className={cn(
              'p-2 rounded-lg transition-all duration-150',
              tool.active ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-muted-foreground hover:bg-[#F1F5F9] hover:text-foreground',
            )}
          >
            <tool.icon className="size-4" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={onImageClick}
        disabled={uploadingImage}
        title={editor.isActive('image') ? 'Replace selected image' : 'Insert image'}
        className={cn(
          'p-2 rounded-lg transition-all duration-150 disabled:opacity-50',
          editor.isActive('image') ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-muted-foreground hover:bg-[#F1F5F9] hover:text-foreground',
        )}
      >
        {uploadingImage ? (
          <span className="size-4 rounded-full border-2 border-[#2563EB]/30 border-t-[#2563EB] animate-spin block" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, minHeight = 260 }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false }),
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: STORY_PLACEHOLDER }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-5 py-4 text-[15px]',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const handleImageFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !editor) return;
    try {
      setUploadingImage(true);
      const compressed = await compressImage(file);
      const result = await uploadImage(compressed);
      if (editor.isActive('image')) {
        editor.chain().focus().updateAttributes('image', { src: result.url }).run();
      } else {
        editor.chain().focus().setImage({ src: result.url }).run();
      }
    } catch (err) {
      console.error('Story image upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-[#E2E8F0] rounded-[18px] overflow-hidden bg-white">
      <div className="sticky top-0 z-10">
        <EditorToolbar editor={editor} uploadingImage={uploadingImage} onImageClick={() => fileInputRef.current?.click()} />
      </div>
      <div className="overflow-y-auto" style={{ minHeight, maxHeight: 520 }}>
        <EditorContent editor={editor} />
      </div>
      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => handleImageFile(e.target.files)} />
    </div>
  );
}
