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
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-200',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showX) && (
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#22c55e,_transparent_32%),radial-gradient(circle_at_top_right,_#38bdf8,_transparent_30%)]" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="p-2 bg-white/10 rounded-xl flex-shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && <h2 className="text-xl font-bold">{title}</h2>}
                    {subtitle && <p className="text-sm text-blue-100 mt-0.5">{subtitle}</p>}
                  </div>
                </div>
                {showX && onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-colors flex-shrink-0"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
