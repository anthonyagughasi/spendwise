import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { CategoryIcon } from '@/src/components/ui/category-icon';
import { SUPPORTED_CURRENCIES } from '@/src/constants/finance';
import { formatCompactCurrency, formatCurrency } from '@/src/lib/utils/format';
import type { CurrencyCode } from '@/src/types/finance';

function formatPreviewKpi(amount: number, currency: CurrencyCode): string {
  const cfg = SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];
  const isWhole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${isWhole ? amount.toLocaleString() : amount.toFixed(2)}`;
  }
}

interface SampleCurrencyDataset {
  balance: number;
  income: number;
  expenses: number;
  incomeDelta: string;
  expenseDelta: string;
  savingsRate: number;
  series: Array<{ label: string; income: number; expenses: number }>;
  budgets: Array<{
    name: string;
    spent: number;
    limit: number;
    percentage: number;
    color: string;
  }>;
}

const SAMPLE_DATASETS: Record<CurrencyCode, SampleCurrencyDataset> = {
  USD: {
    balance: 24860.5,
    income: 6850.0,
    expenses: 3420.75,
    incomeDelta: '12.4%',
    expenseDelta: '4.8%',
    savingsRate: 50.1,
    series: [
      { label: 'Jun', income: 5900, expenses: 3650 },
      { label: 'Jul', income: 6150, expenses: 3820 },
      { label: 'Aug', income: 6100, expenses: 3490 },
      { label: 'Sep', income: 6450, expenses: 3710 },
      { label: 'Oct', income: 6090, expenses: 3590 },
      { label: 'Nov', income: 6850, expenses: 3421 },
    ],
    budgets: [
      { name: 'Housing & Utilities', spent: 1650, limit: 2200, percentage: 75, color: '#27C98A' },
      { name: 'Food & Dining', spent: 672, limit: 800, percentage: 84, color: '#E5A93B' },
      { name: 'Transport & Travel', spent: 290, limit: 650, percentage: 45, color: '#27C98A' },
    ],
  },
  NGN: {
    balance: 2450000,
    income: 850000,
    expenses: 425000,
    incomeDelta: '12.4%',
    expenseDelta: '4.8%',
    savingsRate: 50,
    series: [
      { label: 'Jun', income: 720000, expenses: 465000 },
      { label: 'Jul', income: 760000, expenses: 480000 },
      { label: 'Aug', income: 745000, expenses: 440000 },
      { label: 'Sep', income: 790000, expenses: 455000 },
      { label: 'Oct', income: 755000, expenses: 446000 },
      { label: 'Nov', income: 850000, expenses: 425000 },
    ],
    budgets: [
      { name: 'Housing & Utilities', spent: 225000, limit: 300000, percentage: 75, color: '#27C98A' },
      { name: 'Food & Dining', spent: 126000, limit: 150000, percentage: 84, color: '#E5A93B' },
      { name: 'Transport & Travel', spent: 74000, limit: 165000, percentage: 45, color: '#27C98A' },
    ],
  },
  GBP: {
    balance: 19640.0,
    income: 5410.0,
    expenses: 2702.4,
    incomeDelta: '12.4%',
    expenseDelta: '4.8%',
    savingsRate: 50.1,
    series: [
      { label: 'Jun', income: 4660, expenses: 2880 },
      { label: 'Jul', income: 4860, expenses: 3020 },
      { label: 'Aug', income: 4820, expenses: 2760 },
      { label: 'Sep', income: 5095, expenses: 2930 },
      { label: 'Oct', income: 4810, expenses: 2835 },
      { label: 'Nov', income: 5410, expenses: 2702 },
    ],
    budgets: [
      { name: 'Housing & Utilities', spent: 1300, limit: 1740, percentage: 75, color: '#27C98A' },
      { name: 'Food & Dining', spent: 530, limit: 630, percentage: 84, color: '#E5A93B' },
      { name: 'Transport & Travel', spent: 230, limit: 510, percentage: 45, color: '#27C98A' },
    ],
  },
};

const SAMPLE_TRANSACTIONS: Array<{
  id: string;
  title: string;
  category: string;
  date: string;
  method: string;
  type: 'income' | 'expense';
  amount: number;
  currency: CurrencyCode;
  icon: string;
  color: string;
}> = [
  {
    id: 'sample-1',
    title: 'Product Advisory Retainer',
    category: 'Freelance',
    date: 'Nov 22',
    method: 'Bank transfer',
    type: 'income',
    amount: 4200,
    currency: 'USD',
    icon: 'Briefcase',
    color: '#27C98A',
  },
  {
    id: 'sample-2',
    title: 'Fresh Market Groceries',
    category: 'Food & Dining',
    date: 'Nov 21',
    method: 'Debit card',
    type: 'expense',
    amount: 148500,
    currency: 'NGN',
    icon: 'Utensils',
    color: '#8B7CFF',
  },
  {
    id: 'sample-3',
    title: 'National Rail Commuter Pass',
    category: 'Transportation',
    date: 'Nov 19',
    method: 'Mobile payment',
    type: 'expense',
    amount: 164.5,
    currency: 'GBP',
    icon: 'Car',
    color: '#38BDF8',
  },
];

const CURRENCY_OPTIONS: CurrencyCode[] = ['NGN', 'USD', 'GBP'];

export function DashboardPreview() {
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const dataset = useMemo(() => SAMPLE_DATASETS[currency], [currency]);

  return (
    <div
      aria-label="SpendWise interactive dashboard preview"
      className="rounded-2xl bg-[#151923] border border-[#282E3B] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)] overflow-hidden"
    >
      {/* App Preview Top Toolbar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#10131A] border-b border-[#282E3B] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#F4F5F8] truncate">Financial Overview</p>
          <p className="text-[11px] text-[#9299A8] truncate">
            Sample data · Fictional multi-currency preview
          </p>
        </div>

        <div
          role="group"
          aria-label="Preview reporting currency"
          className="inline-flex items-center p-0.5 rounded-lg bg-[#1B202B] border border-[#282E3B] shrink-0"
        >
          {CURRENCY_OPTIONS.map((code) => {
            const active = currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono-num font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#8B7CFF] text-[#0B0D12]'
                    : 'text-[#9299A8] hover:text-[#F4F5F8]'
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#9299A8]">Total Balance</span>
              <Wallet className="w-3.5 h-3.5 text-[#8B7CFF]" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-lg sm:text-xl font-bold font-mono-num text-[#F4F5F8] tracking-tight truncate">
              {formatPreviewKpi(dataset.balance, currency)}
            </p>
            <p className="mt-1 text-[11px] text-[#9299A8] font-mono-num">
              {dataset.savingsRate}% net savings rate
            </p>
          </div>

          <div className="rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#9299A8]">Monthly Income</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#27C98A]" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-lg sm:text-xl font-bold font-mono-num text-[#27C98A] tracking-tight truncate">
              {formatPreviewKpi(dataset.income, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-mono-num text-[#27C98A]">
              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              {dataset.incomeDelta} vs last month
            </p>
          </div>

          <div className="rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#9299A8]">Monthly Expenses</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#F06464]" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-lg sm:text-xl font-bold font-mono-num text-[#F06464] tracking-tight truncate">
              {formatPreviewKpi(dataset.expenses, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-mono-num text-[#27C98A]">
              <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
              {dataset.expenseDelta} lower spend
            </p>
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-semibold text-[#F4F5F8]">Income vs Expenses Analytics</p>
              <p className="text-[11px] text-[#9299A8]">6-month cash flow in {currency}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#9299A8] shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#27C98A]" aria-hidden="true" />
                Income
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#F06464]" aria-hidden="true" />
                Expenses
              </span>
            </div>
          </div>

          <div className="h-40 sm:h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataset.series} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="previewIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27C98A" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#27C98A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previewExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F06464" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#F06464" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#282E3B" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#9299A8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9299A8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151923',
                    borderColor: '#282E3B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F4F5F8',
                  }}
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#27C98A"
                  strokeWidth={2}
                  fill="url(#previewIncomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#F06464"
                  strokeWidth={2}
                  fill="url(#previewExpenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Split: Budgets + Multi-Currency Recent Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#F4F5F8]">Budget Progress</p>
              <span className="text-[11px] font-mono-num text-[#9299A8]">{currency}</span>
            </div>
            <div className="space-y-2.5">
              {dataset.budgets.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#F4F5F8] truncate pr-2">{item.name}</span>
                    <span className="font-mono-num text-[#9299A8] shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#10131A] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 rounded-xl bg-[#1B202B] border border-[#282E3B] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#F4F5F8]">Recent Transactions</p>
              <span className="text-[11px] text-[#9299A8]">Native currencies</span>
            </div>
            <div className="divide-y divide-[#282E3B]">
              {SAMPLE_TRANSACTIONS.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2 first:pt-1 last:pb-0 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#151923] border border-[#282E3B] flex items-center justify-center shrink-0">
                      <CategoryIcon name={tx.icon} color={tx.color} size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F4F5F8] truncate">{tx.title}</p>
                      <p className="text-[11px] text-[#9299A8] truncate">
                        {tx.category} · {tx.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-semibold font-mono-num ${
                        tx.type === 'income' ? 'text-[#27C98A]' : 'text-[#F06464]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <p className="text-[10px] font-mono-num text-[#9299A8]">{tx.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
