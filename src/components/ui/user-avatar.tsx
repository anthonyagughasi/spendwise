import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils/format';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function UserAvatar({ src, name, size = 'sm', className }: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  const cleanSrc = src?.trim() || null;
  const showImage = Boolean(cleanSrc && failedSrc !== cleanSrc);

  if (showImage && cleanSrc) {
    return (
      <img
        src={cleanSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(cleanSrc)}
        className={cn(
          'rounded-full object-cover border border-[var(--border-subtle)] shrink-0 bg-[var(--bg-elevated)]',
          SIZE_CLASSES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'rounded-full bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30 flex items-center justify-center font-semibold shrink-0 select-none',
        SIZE_CLASSES[size],
        className
      )}
    >
      {getUserInitials(name)}
    </div>
  );
}
