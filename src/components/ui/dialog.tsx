import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils/format';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-lg',
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden',
          maxWidthClass
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 id="dialog-title" className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
