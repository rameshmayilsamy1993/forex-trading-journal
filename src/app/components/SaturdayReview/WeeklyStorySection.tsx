import RichTextEditor from './RichTextEditor';

interface WeeklyStorySectionProps {
  value: string;
  onChange: (html: string) => void;
}

export default function WeeklyStorySection({ value, onChange }: WeeklyStorySectionProps) {
  return <RichTextEditor value={value} onChange={onChange} minHeight={320} />;
}
