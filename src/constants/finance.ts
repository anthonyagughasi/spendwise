import type { CurrencyCode, DateFormatOption, PaymentMethod, ThemeOption, TransactionType } from '@/src/types/finance';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  { code: 'USD', name: 'United States Dollar', symbol: '$', locale: 'en-US' },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', locale: 'en-GB' },
];

export const CURRENCY_CODES: CurrencyCode[] = ['NGN', 'USD', 'GBP'];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Bank transfer',
  'Debit card',
  'Credit card',
  'Mobile payment',
  'Other',
];

export const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string }[] = [
  { value: 'MMM dd, yyyy', label: 'Nov 24, 2026 (MMM dd, yyyy)' },
  { value: 'dd/MM/yyyy', label: '24/11/2026 (dd/MM/yyyy)' },
  { value: 'yyyy-MM-dd', label: '2026-11-24 (yyyy-MM-dd)' },
];

export const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export interface DefaultCategorySeed {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategorySeed[] = [
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#F59E0B' },
  { name: 'Transportation', type: 'expense', icon: 'Car', color: '#38BDF8' },
  { name: 'Housing', type: 'expense', icon: 'Home', color: '#8B7CFF' },
  { name: 'Utilities', type: 'expense', icon: 'Zap', color: '#FACC15' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#EC4899' },
  { name: 'Health', type: 'expense', icon: 'HeartPulse', color: '#F06464' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#60A5FA' },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#A78BFA' },
  { name: 'Subscriptions', type: 'expense', icon: 'Repeat', color: '#2DD4BF' },
  { name: 'Travel', type: 'expense', icon: 'Plane', color: '#FB923C' },
  { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#F472B6' },
  { name: 'Other', type: 'expense', icon: 'CircleDot', color: '#94A3B8' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategorySeed[] = [
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#27C98A' },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#34D399' },
  { name: 'Business', type: 'income', icon: 'Building2', color: '#10B981' },
  { name: 'Investments', type: 'income', icon: 'TrendingUp', color: '#8B7CFF' },
  { name: 'Gifts', type: 'income', icon: 'Gift', color: '#F472B6' },
  { name: 'Other', type: 'income', icon: 'CircleDollarSign', color: '#94A3B8' },
];

export const CATEGORY_ICON_OPTIONS = [
  'Utensils',
  'Car',
  'Home',
  'Zap',
  'ShoppingBag',
  'HeartPulse',
  'GraduationCap',
  'Film',
  'Repeat',
  'Plane',
  'Sparkles',
  'Briefcase',
  'Laptop',
  'Building2',
  'TrendingUp',
  'Gift',
  'CircleDollarSign',
  'Wallet',
  'CreditCard',
  'Receipt',
  'Shield',
  'Coffee',
  'CircleDot',
] as const;

export const CATEGORY_COLOR_SWATCHES = [
  '#8B7CFF',
  '#27C98A',
  '#F06464',
  '#F59E0B',
  '#38BDF8',
  '#EC4899',
  '#2DD4BF',
  '#A78BFA',
  '#FB923C',
  '#60A5FA',
  '#34D399',
  '#94A3B8',
] as const;

export const AVATAR_PRESETS = [
  { label: 'Emerald Ledger', url: 'https://api.dicebear.com/9.x/initials/svg?seed=SW&backgroundColor=27C98A&textColor=0B0D12' },
  { label: 'Violet Slate', url: 'https://api.dicebear.com/9.x/initials/svg?seed=FN&backgroundColor=8B7CFF&textColor=F4F5F8' },
];
