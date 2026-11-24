import React from 'react';
import { Button } from './button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]/50">
      <div className="w-11 h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
