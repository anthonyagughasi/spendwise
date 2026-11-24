import React from 'react';
import { cn } from '@/src/lib/utils/format';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-10 px-3.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 transition-colors focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] disabled:opacity-50 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[84px] px-3.5 py-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 transition-colors focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-xs font-medium text-[var(--text-secondary)] mb-1.5', className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#F06464]">{message}</p>;
}
