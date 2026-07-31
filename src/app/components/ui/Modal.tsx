import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from './utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showX?: boolean;
  closeOnSave?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  children,
  footer,
  showX = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-3 sm:p-6 z-50"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-[#fdfcfc] w-full max-h-[92vh] overflow-hidden flex flex-col border border-[rgba(15,0,0,0.12)]',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showX) && (
          <div className="bg-[#201d1d] text-[#fdfcfc] flex-shrink-0">
            <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="p-1.5 bg-[#302c2c] rounded flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  {title && <h2 className="text-[16px] font-bold">{title}</h2>}
                  {subtitle && <p className="text-[14px] text-[#9a9898] mt-0.5">{subtitle}</p>}
                </div>
              </div>
              {showX && onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 bg-[#302c2c] hover:bg-[#424245] text-[#9a9898] hover:text-[#fdfcfc] rounded transition-colors flex-shrink-0"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-[rgba(15,0,0,0.12)] bg-[#fdfcfc] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
