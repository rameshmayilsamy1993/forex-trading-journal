interface MiniSparklineProps {
  data: { balance: number }[];
  color?: string;
  width?: number;
  height?: number;
}

export default function MiniSparkline({ data, color = '#7C3AED', width = 80, height = 24 }: MiniSparklineProps) {
  if (data.length < 2) return null;
  const values = data.map(d => d.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const id = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={width} height={height} className="overflow-visible" aria-label="Equity sparkline">
      <defs>
        <linearGradient id={`spark-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${points} L${width},${height} L0,${height} Z`} fill={`url(#spark-fill-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
