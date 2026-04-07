import { ReactNode } from 'react';
import { cn } from './utils';

interface LayoutWrapperProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function LayoutWrapper({ 
  children, 
  className = '',
  maxWidth = '7xl' 
}: LayoutWrapperProps) {
  return (
    <div className={cn(
      'min-h-[calc(100vh-200px)]',
      maxWidthClasses[maxWidth],
      'mx-auto',
      className
    )}>
      {children}
    </div>
  );
}

export function PageContent({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  );
}

export default LayoutWrapper;
