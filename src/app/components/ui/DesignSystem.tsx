import { LucideIcon } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';

export type ColorTheme = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'red' | 'indigo' | 'yellow';

const colorThemes: Record<ColorTheme, { gradient: string; text: string; bg: string }> = {
  blue: { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
  green: { gradient: 'from-green-500 to-emerald-600', text: 'text-green-600', bg: 'bg-green-50' },
  orange: { gradient: 'from-orange-500 to-red-500', text: 'text-orange-600', bg: 'bg-orange-50' },
  purple: { gradient: 'from-purple-500 to-pink-500', text: 'text-purple-600', bg: 'bg-purple-50' },
  teal: { gradient: 'from-teal-500 to-cyan-600', text: 'text-teal-600', bg: 'bg-teal-50' },
  pink: { gradient: 'from-pink-500 to-rose-500', text: 'text-pink-600', bg: 'bg-pink-50' },
  red: { gradient: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-50' },
  indigo: { gradient: 'from-indigo-500 to-purple-600', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  yellow: { gradient: 'from-yellow-500 to-amber-500', text: 'text-yellow-600', bg: 'bg-yellow-50' },
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
        'rounded-xl flex items-center justify-center text-white shadow-sm',
        `bg-gradient-to-br ${theme.gradient}`,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
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
  const theme = color ? (colorThemes[color] || defaultTheme) : defaultTheme;
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && <IconBadge icon={Icon} color={color} />}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {children}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className={cn(
            'shadow-sm',
            theme.gradient,
            'hover:opacity-90 text-white'
          )}
        >
          {action.icon && <action.icon className="w-4 h-4 mr-2" />}
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
        'bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200',
        'border border-gray-100',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={cn('text-2xl font-bold mt-1', theme.text)}>
            {value}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
              {trend.positive !== false ? '+' : ''}{trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-lg', theme.bg)}>
            <Icon className={cn('w-5 h-5', theme.text)} />
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

export function CardContainer({ children, className, hover = true }: CardContainerProps) {
  return (
    <div
      className={cn(
        'bg-white p-5 rounded-xl shadow-sm',
        'border border-gray-100',
        hover && 'hover:shadow-md transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

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
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}>
      {(title || action) && (
        <div className={cn('px-5 py-4 border-b border-gray-100 bg-gradient-to-r', theme.bg, '/30')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className={cn('w-5 h-5', theme.text)} />}
              <div>
                {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            </div>
            {action}
          </div>
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

interface TableCardProps {
  children: React.ReactNode;
  className?: string;
}

export function TableCard({ children, className }: TableCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-3 bg-gray-50 border-b border-gray-100', className)}>
      {children}
    </div>
  );
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function TableRow({ 
  children, 
  className, 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-b border-gray-50 last:border-0',
        'hover:bg-gray-50/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export { colorThemes };
