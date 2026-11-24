import Decimal from 'decimal.js';
import { format, parseISO, eachMonthOfInterval, isValid } from 'date-fns';
import { CURRENCY_CODES } from '@/src/constants/finance';
import type {
  Budget,
  BudgetComputation,
  BudgetStatus,
  Category,
  CurrencyCode,
  ExchangeRateMap,
  ExchangeRateRecord,
  Transaction,
} from '@/src/types/finance';

export function buildRateMap(records: ExchangeRateRecord[]): ExchangeRateMap {
  const map: ExchangeRateMap = {};
  for (const record of records) {
    const key = `${record.baseCurrency}_${record.targetCurrency}`;
    const existing = map[key];
    // Manual override or more recent effectiveDate takes precedence
    if (
      !existing ||
      record.source === 'manual' ||
      (existing.source !== 'manual' && record.effectiveDate >= existing.effectiveDate)
    ) {
      map[key] = {
        rate: record.rate,
        source: record.source,
        effectiveDate: record.effectiveDate,
      };
    }
  }
  return map;
}

export interface ConversionResult {
  amount: number | null;
  rateUsed: number | null;
  source: 'identity' | 'api' | 'manual' | 'missing';
  effectiveDate: string | null;
}

export function convertCurrencyAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rateMap: ExchangeRateMap
): ConversionResult {
  if (from === to) {
    return {
      amount: new Decimal(amount).toDecimalPlaces(2).toNumber(),
      rateUsed: 1,
      source: 'identity',
      effectiveDate: null,
    };
  }

  const directKey = `${from}_${to}`;
  const direct = rateMap[directKey];
  if (direct && direct.rate > 0) {
    return {
      amount: new Decimal(amount).times(direct.rate).toDecimalPlaces(2).toNumber(),
      rateUsed: direct.rate,
      source: direct.source,
      effectiveDate: direct.effectiveDate,
    };
  }

  const inverseKey = `${to}_${from}`;
  const inverse = rateMap[inverseKey];
  if (inverse && inverse.rate > 0) {
    const invertedRate = new Decimal(1).div(inverse.rate);
    return {
      amount: new Decimal(amount).times(invertedRate).toDecimalPlaces(2).toNumber(),
      rateUsed: invertedRate.toDecimalPlaces(6).toNumber(),
      source: inverse.source,
      effectiveDate: inverse.effectiveDate,
    };
  }

  return {
    amount: null,
    rateUsed: null,
    source: 'missing',
    effectiveDate: null,
  };
}

export interface NativeCurrencySummary {
  currency: CurrencyCode;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export function computeNativeCurrencySummaries(transactions: Transaction[]): NativeCurrencySummary[] {
  return CURRENCY_CODES.map((currency) => {
    let income = new Decimal(0);
    let expenses = new Decimal(0);
    let count = 0;

    for (const tx of transactions) {
      if (tx.currency !== currency) continue;
      count += 1;
      if (tx.type === 'income') {
        income = income.plus(tx.amount);
      } else {
        expenses = expenses.plus(tx.amount);
      }
    }

    return {
      currency,
      income: income.toDecimalPlaces(2).toNumber(),
      expenses: expenses.toDecimalPlaces(2).toNumber(),
      net: income.minus(expenses).toDecimalPlaces(2).toNumber(),
      transactionCount: count,
    };
  });
}

export interface ConsolidatedTotals {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number | null;
  missingRatePairs: string[];
  usedManualRates: boolean;
  oldestRateDate: string | null;
  convertedCount: number;
  skippedCount: number;
}

export function computeConsolidatedTotals(
  transactions: Transaction[],
  reportingCurrency: CurrencyCode,
  rateMap: ExchangeRateMap
): ConsolidatedTotals {
  let income = new Decimal(0);
  let expenses = new Decimal(0);
  const missingPairs = new Set<string>();
  let usedManualRates = false;
  let oldestRateDate: string | null = null;
  let convertedCount = 0;
  let skippedCount = 0;

  for (const tx of transactions) {
    const res = convertCurrencyAmount(tx.amount, tx.currency, reportingCurrency, rateMap);
    if (res.amount === null) {
      missingPairs.add(`${tx.currency}/${reportingCurrency}`);
      skippedCount += 1;
      continue;
    }

    convertedCount += 1;
    if (res.source === 'manual') {
      usedManualRates = true;
    }
    if (res.effectiveDate && (!oldestRateDate || res.effectiveDate < oldestRateDate)) {
      oldestRateDate = res.effectiveDate;
    }

    if (tx.type === 'income') {
      income = income.plus(res.amount);
    } else {
      expenses = expenses.plus(res.amount);
    }
  }

  const net = income.minus(expenses);
  const savingsRate = income.gt(0)
    ? net.div(income).times(100).toDecimalPlaces(1).toNumber()
    : null;

  return {
    totalIncome: income.toDecimalPlaces(2).toNumber(),
    totalExpenses: expenses.toDecimalPlaces(2).toNumber(),
    netCashFlow: net.toDecimalPlaces(2).toNumber(),
    savingsRate,
    missingRatePairs: Array.from(missingPairs),
    usedManualRates,
    oldestRateDate,
    convertedCount,
    skippedCount,
  };
}

export function computePercentageDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return new Decimal(current)
    .minus(previous)
    .div(Math.abs(previous))
    .times(100)
    .toDecimalPlaces(1)
    .toNumber();
}

export function computeBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'near_limit';
  if (percentage >= 70) return 'warning';
  return 'healthy';
}

export function computeBudgetsProgress(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetComputation[] {
  return budgets.map((budget) => {
    const monthPrefix = `${budget.year}-${String(budget.month).padStart(2, '0')}`;
    let spentDec = new Decimal(0);

    for (const tx of transactions) {
      if (
        tx.type === 'expense' &&
        tx.categoryId === budget.categoryId &&
        tx.currency === budget.currency &&
        tx.date.startsWith(monthPrefix)
      ) {
        spentDec = spentDec.plus(tx.amount);
      }
    }

    const spent = spentDec.toDecimalPlaces(2).toNumber();
    const limitDec = new Decimal(budget.amount);
    const remaining = limitDec.minus(spentDec).toDecimalPlaces(2).toNumber();
    const percentage = limitDec.gt(0)
      ? spentDec.div(limitDec).times(100).toDecimalPlaces(1).toNumber()
      : 0;

    return {
      budget,
      spent,
      remaining,
      percentage,
      status: computeBudgetStatus(percentage),
    };
  });
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'income' | 'expense',
  reportingCurrency: CurrencyCode,
  rateMap: ExchangeRateMap
): CategoryBreakdownItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, { name: string; color: string; amount: Decimal; count: number }>();
  let grandTotal = new Decimal(0);

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const conv = convertCurrencyAmount(tx.amount, tx.currency, reportingCurrency, rateMap);
    if (conv.amount === null) continue;

    const cat = categoryMap.get(tx.categoryId);
    const entry = totals.get(tx.categoryId) ?? {
      name: cat?.name ?? tx.categoryName,
      color: cat?.color ?? '#8B7CFF',
      amount: new Decimal(0),
      count: 0,
    };

    entry.amount = entry.amount.plus(conv.amount);
    entry.count += 1;
    totals.set(tx.categoryId, entry);
    grandTotal = grandTotal.plus(conv.amount);
  }

  return Array.from(totals.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      color: data.color,
      amount: data.amount.toDecimalPlaces(2).toNumber(),
      percentage: grandTotal.gt(0)
        ? data.amount.div(grandTotal).times(100).toDecimalPlaces(1).toNumber()
        : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthlySeriesPoint {
  monthKey: string;
  label: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number;
}

export function computeMonthlySeries(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  reportingCurrency: CurrencyCode,
  rateMap: ExchangeRateMap
): MonthlySeriesPoint[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end) || start > end) return [];

  const months = eachMonthOfInterval({ start, end });
  const buckets = new Map<string, { label: string; income: Decimal; expenses: Decimal }>();

  for (const m of months) {
    const key = format(m, 'yyyy-MM');
    buckets.set(key, {
      label: format(m, 'MMM yy'),
      income: new Decimal(0),
      expenses: new Decimal(0),
    });
  }

  for (const tx of transactions) {
    if (tx.date < startDate || tx.date > endDate) continue;
    const key = tx.date.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const conv = convertCurrencyAmount(tx.amount, tx.currency, reportingCurrency, rateMap);
    if (conv.amount === null) continue;

    if (tx.type === 'income') {
      bucket.income = bucket.income.plus(conv.amount);
    } else {
      bucket.expenses = bucket.expenses.plus(conv.amount);
    }
  }

  return Array.from(buckets.entries()).map(([monthKey, b]) => {
    const net = b.income.minus(b.expenses);
    const savingsRate = b.income.gt(0)
      ? net.div(b.income).times(100).toDecimalPlaces(1).toNumber()
      : 0;
    return {
      monthKey,
      label: b.label,
      income: b.income.toDecimalPlaces(2).toNumber(),
      expenses: b.expenses.toDecimalPlaces(2).toNumber(),
      netCashFlow: net.toDecimalPlaces(2).toNumber(),
      savingsRate,
    };
  });
}
