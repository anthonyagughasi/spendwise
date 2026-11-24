import { z } from 'zod';

const currencyEnum = z.enum(['NGN', 'USD', 'GBP']);
const paymentMethodEnum = z.enum([
  'Cash',
  'Bank transfer',
  'Debit card',
  'Credit card',
  'Mobile payment',
  'Other',
]);
const txTypeEnum = z.enum(['income', 'expense']);

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().trim().email('Enter a valid email address').max(254),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254),
});

export const transactionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
  type: txTypeEnum,
  amount: z
    .number({ error: 'Enter a valid numeric amount' })
    .positive('Amount must be greater than zero')
    .max(1_000_000_000_000, 'Amount exceeds maximum allowed limit'),
  currency: currencyEnum,
  categoryId: z.string().trim().min(1, 'Category is required').max(128),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD)')
    .refine((val) => {
      const parsed = new Date(`${val}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === val;
    }, 'Invalid calendar date'),
  paymentMethod: paymentMethodEnum,
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export const budgetSchema = z.object({
  name: z.string().trim().min(1, 'Budget name is required').max(100, 'Budget name cannot exceed 100 characters'),
  categoryId: z.string().trim().min(1, 'Expense category is required').max(128),
  amount: z
    .number({ error: 'Enter a valid budget limit' })
    .positive('Budget limit must be greater than zero')
    .max(1_000_000_000_000, 'Budget limit exceeds maximum allowed limit'),
  currency: currencyEnum,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(60, 'Category name cannot exceed 60 characters'),
  type: txTypeEnum,
  icon: z.string().trim().min(1, 'Select an icon').max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Select a valid hex color'),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
});

export const preferencesSchema = z.object({
  defaultCurrency: currencyEnum,
  reportingCurrency: currencyEnum,
  dateFormat: z.enum(['MMM dd, yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']),
  theme: z.enum(['dark', 'light', 'system']),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const manualRateSchema = z.object({
  baseCurrency: currencyEnum,
  targetCurrency: currencyEnum,
  rate: z
    .number({ error: 'Enter a valid positive rate' })
    .positive('Exchange rate must be greater than zero')
    .max(1_000_000_000, 'Exchange rate too large'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type BudgetFormValues = z.infer<typeof budgetSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PreferencesFormValues = z.infer<typeof preferencesSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ManualRateFormValues = z.infer<typeof manualRateSchema>;
