import React from 'react';
import { cn } from '@/src/lib/utils/format';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#8B7CFF] text-[#0B0D12] font-semibold hover:bg-[#9D91FF] active:bg-[#7A6AF5] shadow-xs',
      secondary:
        'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[#8B7CFF]/50',
      outline:
        'bg-transparent text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
      danger:
        'bg-[#F06464]/15 text-[#F06464] border border-[#F06464]/30 hover:bg-[#F06464] hover:text-white',
    };

    const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs rounded-lg',
      md: 'h-10 px-4 text-sm rounded-lg',
      lg: 'h-11 px-5 text-sm rounded-lg',
      icon: 'h-9 w-9 p-0 rounded-lg',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
