import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { ColorTheme } from './DesignSystem';
import { PageHeader, CardContainer } from './DesignSystem';
import { LoadingSpinner, EmptyState } from './Loading';
import { ErrorBoundary } from './ErrorBoundary';

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
        <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />
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

export default PageLayout;
