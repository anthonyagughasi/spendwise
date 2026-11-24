import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  isValid,
} from 'date-fns';
import { SUPPORTED_CURRENCIES } from '@/src/constants/finance';
import type { CurrencyCode, DashboardDatePreset, DateFormatOption } from '@/src/types/finance';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const cfg = SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${amount.toFixed(2)}`;
  }
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode): string {
  const cfg = SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      notation: Math.abs(amount) >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: Math.abs(amount) >= 1_000_000 ? 1 : 0,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${amount.toFixed(0)}`;
  }
}

export function formatUserDate(isoDate: string, dateFormat: DateFormatOption = 'MMM dd, yyyy'): string {
  if (!isoDate) return '—';
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return isoDate;
  return format(parsed, dateFormat);
}

export function getTodayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
}

export interface DateRangeResult {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  label: string;
}

export function getDateRangeForPreset(
  preset: DashboardDatePreset,
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const now = new Date();
  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let label: string;

  switch (preset) {
    case 'last_month': {
      const target = subMonths(now, 1);
      start = startOfMonth(target);
      end = endOfMonth(target);
      const prev = subMonths(target, 1);
      prevStart = startOfMonth(prev);
      prevEnd = endOfMonth(prev);
      label = format(target, 'MMMM yyyy');
      break;
    }
    case 'last_3_months': {
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 5));
      prevEnd = endOfMonth(subMonths(now, 3));
      label = 'Last 3 months';
      break;
    }
    case 'last_6_months': {
      start = startOfMonth(subMonths(now, 5));
      end = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 11));
      prevEnd = endOfMonth(subMonths(now, 6));
      label = 'Last 6 months';
      break;
    }
    case 'this_year': {
      start = startOfYear(now);
      end = endOfYear(now);
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      prevStart = startOfYear(lastYear);
      prevEnd = endOfYear(lastYear);
      label = `Year ${now.getFullYear()}`;
      break;
    }
    case 'custom': {
      const parsedStart = customStart ? parseISO(customStart) : startOfMonth(now);
      const parsedEnd = customEnd ? parseISO(customEnd) : endOfMonth(now);
      start = isValid(parsedStart) ? parsedStart : startOfMonth(now);
      end = isValid(parsedEnd) ? parsedEnd : endOfMonth(now);
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      prevStart = new Date(prevEnd.getTime() - (spanDays - 1) * 24 * 60 * 60 * 1000);
      label = `${format(start, 'MMM dd, yyyy')} – ${format(end, 'MMM dd, yyyy')}`;
      break;
    }
    case 'this_month':
    default: {
      start = startOfMonth(now);
      end = endOfMonth(now);
      const prev = subMonths(now, 1);
      prevStart = startOfMonth(prev);
      prevEnd = endOfMonth(prev);
      label = format(now, 'MMMM yyyy');
      break;
    }
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    previousStartDate: format(prevStart, 'yyyy-MM-dd'),
    previousEndDate: format(prevEnd, 'yyyy-MM-dd'),
    label,
  };
}
