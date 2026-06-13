import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';

export type ColorTheme = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'red' | 'indigo' | 'yellow' | 'slate';

const colorThemes: Record<ColorTheme, { gradient: string; text: string; bg: string; ring: string; iconBg: string; iconText: string }> = {
  blue: { gradient: 'from-blue-600 to-indigo-600', text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-500/10', iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', iconText: 'text-white' },
  green: { gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-500/10', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600', iconText: 'text-white' },
  orange: { gradient: 'from-amber-500 to-orange-500', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-500/10', iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', iconText: 'text-white' },
  purple: { gradient: 'from-violet-600 to-indigo-500', text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-500/10', iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', iconText: 'text-white' },
  teal: { gradient: 'from-cyan-500 to-sky-500', text: 'text-cyan-700', bg: 'bg-cyan-50', ring: 'ring-cyan-500/10', iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600', iconText: 'text-white' },
  pink: { gradient: 'from-rose-500 to-fuchsia-500', text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-500/10', iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600', iconText: 'text-white' },
  red: { gradient: 'from-rose-600 to-red-500', text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-500/10', iconBg: 'bg-gradient-to-br from-red-500 to-rose-600', iconText: 'text-white' },
  indigo: { gradient: 'from-indigo-600 to-blue-500', text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-500/10', iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600', iconText: 'text-white' },
  yellow: { gradient: 'from-yellow-500 to-amber-400', text: 'text-amber-700', bg: 'bg-yellow-50', ring: 'ring-amber-500/10', iconBg: 'bg-gradient-to-br from-yellow-500 to-amber-600', iconText: 'text-white' },
  slate: { gradient: 'from-slate-800 to-slate-600', text: 'text-slate-700', bg: 'bg-slate-100', ring: 'ring-slate-500/10', iconBg: 'bg-gradient-to-br from-slate-600 to-slate-700', iconText: 'text-white' },
};

const defaultTheme = colorThemes.blue;

interface IconBadgeProps {
  icon: LucideIcon;
  color?: ColorTheme;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBadge({ icon: Icon, color, size = 'md', className }: IconBadgeProps) {
  const theme = color ? (colorThemes[color] || defaultTheme) : defaultTheme;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center shadow-lg shadow-slate-950/10',
        theme.iconBg,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={cn(iconSizes[size], 'text-white')} />
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  color?: ColorTheme;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, color = 'blue', action, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && <IconBadge icon={Icon} color={color} />}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A]">{title}</h1>
          {subtitle && <p className="text-sm text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="shadow-lg shadow-[#2563EB]/25"
          variant={color === 'red' ? 'destructive' : 'default'}
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: ColorTheme;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, color = 'blue', trend, className }: StatCardProps) {
  const theme = color ? (colorThemes[color] || defaultTheme) : defaultTheme;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E5EAF2] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)] shadow-[0_4px_16px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.12em] text-[#64748B] font-semibold">{label}</p>
          <p className={cn('text-2xl font-bold mt-1.5 tracking-tight', theme.text)}>
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                trend.positive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              )}
            >
              {trend.positive !== false ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl shadow-sm', theme.iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const CardContainer = React.forwardRef<HTMLDivElement, CardContainerProps>(
  ({ children, className, hover = true }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)]',
          hover && 'hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all duration-200',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

CardContainer.displayName = 'CardContainer';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  color?: ColorTheme;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function SectionCard({ title, subtitle, icon: Icon, color = 'blue', children, className, action }: SectionCardProps) {
  const theme = color ? (colorThemes[color] || defaultTheme) : defaultTheme;

  return (
    <div className={cn('bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.06)]', className)}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#E5EAF2] bg-gradient-to-r from-white to-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className={cn('p-2 rounded-lg', theme.iconBg)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                {title && <h3 className="font-semibold text-[#0F172A]">{title}</h3>}
                {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {action}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface TableCardProps {
  children: React.ReactNode;
  className?: string;
}

export function TableCard({ children, className }: TableCardProps) {
  return <div className={cn('bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.06)]', className)}>{children}</div>;
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-3 bg-[#F8FAFC] border-b border-[#E5EAF2]', className)}>{children}</div>;
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-b border-[#E5EAF2]/60 last:border-0',
        'hover:bg-[#F8FAFC] transition-colors duration-150',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export { colorThemes };
