import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { ColorTheme } from './DesignSystem';
import { PageHeader, CardContainer } from './DesignSystem';
import { EmptyState } from './Loading';
import { Skeleton } from './skeleton';
import { ErrorBoundary } from './ErrorBoundary';

interface SkeletonConfig {
  type: 'table' | 'cards' | 'form' | 'stats' | 'text';
  rows?: number;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  color?: ColorTheme;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  skeleton?: SkeletonConfig;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

export function PageLayout({
  title,
  subtitle,
  icon,
  color = 'blue',
  action,
  children,
  isLoading = false,
  isEmpty = false,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  maxWidth = 'full',
  className = '',
  skeleton,
}: PageLayoutProps) {
  if (isLoading) {
    return (
      <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          color={color}
          action={action}
        />
        <SkeletonRenderer type={skeleton?.type ?? 'text'} rows={skeleton?.rows} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          color={color}
          action={action}
        />
        <CardContainer>
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        </CardContainer>
      </div>
    );
  }

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        color={color}
        action={action}
      />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}

export function SafeRenderer({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function SkeletonRenderer({ type, rows = 5 }: { type: SkeletonConfig['type']; rows?: number }) {
  switch (type) {
    case 'table':
      return (
        <div className="space-y-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );
    case 'form':
      return (
        <div className="space-y-4 max-w-lg">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      );
    case 'stats':
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      );
    case 'text':
    default:
      return (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i === rows - 1 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      );
  }
}

export default PageLayout;
