export type CurrencyCode = 'NGN' | 'USD' | 'GBP';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod =
  | 'Cash'
  | 'Bank transfer'
  | 'Debit card'
  | 'Credit card'
  | 'Mobile payment'
  | 'Other';

export type DateFormatOption = 'MMM dd, yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';

export type ThemeOption = 'dark' | 'light' | 'system';

export interface UserPreferences {
  reportingCurrency: CurrencyCode;
  dateFormat: DateFormatOption;
  theme: ThemeOption;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  defaultCurrency: CurrencyCode;
  preferences: UserPreferences;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  title: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  currency: CurrencyCode;
  period: 'monthly';
  month: number; // 1..12
  year: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExchangeRateRecord {
  id: string;
  userId: string;
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  effectiveDate: string; // YYYY-MM-DD
  source: 'api' | 'manual';
  updatedAt?: unknown;
}

export interface ExchangeRateEntry {
  rate: number;
  source: 'api' | 'manual';
  effectiveDate: string;
}

export type ExchangeRateMap = Record<string, ExchangeRateEntry>;

export type DashboardDatePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export type ReportPeriodPreset = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type BudgetStatus = 'healthy' | 'warning' | 'near_limit' | 'exceeded';

export interface BudgetComputation {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}
