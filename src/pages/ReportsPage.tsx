import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Download, BarChart3, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input, Label, Select } from '@/src/components/ui/input';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Skeleton } from '@/src/components/ui/skeleton';
import { CURRENCY_CODES } from '@/src/constants/finance';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import {
  computeBudgetsProgress,
  computeCategoryBreakdown,
  computeConsolidatedTotals,
  computeMonthlySeries,
  computePercentageDelta,
  convertCurrencyAmount,
} from '@/src/lib/calculations/finance';
import { exportTransactionsToCsv } from '@/src/lib/services/csvService';
import { formatCompactCurrency, formatCurrency, getTodayIso } from '@/src/lib/utils/format';
import type { CurrencyCode, ReportPeriodPreset } from '@/src/types/finance';

export function ReportsPage() {
  const { profile } = useWorkspaceAuth();
  const { transactions, categories, budgets, rateMap, loading } = useFinanceData();

  const defaultReporting = profile?.preferences?.reportingCurrency ?? profile?.defaultCurrency ?? 'NGN';
  const [period, setPeriod] = useState<ReportPeriodPreset>('yearly');
  const [reportingCurrency, setReportingCurrency] = useState<CurrencyCode>(defaultReporting);

  useEffect(() => {
    setReportingCurrency(defaultReporting);
  }, [defaultReporting]);
  const [customStart, setCustomStart] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [customEnd, setCustomEnd] = useState(getTodayIso);

  // CSV Export Filters
  const [csvType, setCsvType] = useState<'all' | 'income' | 'expense'>('all');
  const [csvCurrency, setCsvCurrency] = useState<'all' | CurrencyCode>('all');
  const [csvScope, setCsvScope] = useState<'period' | 'all'>('period');

  const periodRange = useMemo(() => {
    const now = new Date();
    if (period === 'monthly') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const prev = subMonths(now, 1);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        prevStartDate: format(startOfMonth(prev), 'yyyy-MM-dd'),
        prevEndDate: format(endOfMonth(prev), 'yyyy-MM-dd'),
        label: format(now, 'MMMM yyyy'),
      };
    }
    if (period === 'quarterly') {
      const start = startOfQuarter(now);
      const end = endOfQuarter(now);
      const prev = subMonths(start, 3);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        prevStartDate: format(startOfQuarter(prev), 'yyyy-MM-dd'),
        prevEndDate: format(endOfQuarter(prev), 'yyyy-MM-dd'),
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
      };
    }
    if (period === 'yearly') {
      const start = startOfYear(now);
      const end = endOfYear(now);
      const prev = subYears(now, 1);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        prevStartDate: format(startOfYear(prev), 'yyyy-MM-dd'),
        prevEndDate: format(endOfYear(prev), 'yyyy-MM-dd'),
        label: `Year ${now.getFullYear()}`,
      };
    }
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    return {
      startDate: s,
      endDate: e,
      prevStartDate: '',
      prevEndDate: '',
      label: `${s} to ${e}`,
    };
  }, [period, customStart, customEnd]);

  const currentTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.date >= periodRange.startDate && tx.date <= periodRange.endDate
      ),
    [transactions, periodRange]
  );

  const previousTransactions = useMemo(() => {
    if (!periodRange.prevStartDate) return [];
    return transactions.filter(
      (tx) => tx.date >= periodRange.prevStartDate && tx.date <= periodRange.prevEndDate
    );
  }, [transactions, periodRange]);

  const currentTotals = useMemo(
    () => computeConsolidatedTotals(currentTransactions, reportingCurrency, rateMap),
    [currentTransactions, reportingCurrency, rateMap]
  );

  const previousTotals = useMemo(
    () => computeConsolidatedTotals(previousTransactions, reportingCurrency, rateMap),
    [previousTransactions, reportingCurrency, rateMap]
  );

  const monthlySeries = useMemo(
    () =>
      computeMonthlySeries(
        transactions,
        periodRange.startDate,
        periodRange.endDate,
        reportingCurrency,
        rateMap
      ),
    [transactions, periodRange, reportingCurrency, rateMap]
  );

  const expenseBreakdown = useMemo(
    () =>
      computeCategoryBreakdown(
        currentTransactions,
        categories,
        'expense',
        reportingCurrency,
        rateMap
      ),
    [currentTransactions, categories, reportingCurrency, rateMap]
  );

  const incomeBreakdown = useMemo(
    () =>
      computeCategoryBreakdown(
        currentTransactions,
        categories,
        'income',
        reportingCurrency,
        rateMap
      ),
    [currentTransactions, categories, reportingCurrency, rateMap]
  );

  const budgetChartData = useMemo(() => {
    const startMonth = periodRange.startDate.slice(0, 7);
    const endMonth = periodRange.endDate.slice(0, 7);
    const inPeriodBudgets = budgets.filter((b) => {
      const ym = `${b.year}-${String(b.month).padStart(2, '0')}`;
      return ym >= startMonth && ym <= endMonth;
    });
    const computed = computeBudgetsProgress(inPeriodBudgets, transactions);
    return computed
      .map((item) => {
        const limitConv = convertCurrencyAmount(
          item.budget.amount,
          item.budget.currency,
          reportingCurrency,
          rateMap
        );
        const spentConv = convertCurrencyAmount(
          item.spent,
          item.budget.currency,
          reportingCurrency,
          rateMap
        );
        if (limitConv.amount === null || spentConv.amount === null) return null;
        return {
          name: `${item.budget.name} (${String(item.budget.month).padStart(2, '0')}/${item.budget.year})`,
          budgeted: limitConv.amount,
          spent: spentConv.amount,
        };
      })
      .filter((x): x is { name: string; budgeted: number; spent: number } => x !== null);
  }, [budgets, transactions, periodRange, reportingCurrency, rateMap]);

  const handleExport = () => {
    const base = csvScope === 'all' ? transactions : currentTransactions;
    const filtered = base.filter((tx) => {
      if (csvType !== 'all' && tx.type !== csvType) return false;
      if (csvCurrency !== 'all' && tx.currency !== csvCurrency) return false;
      return true;
    });
    if (filtered.length === 0) {
      toast.info('No transactions match the selected export criteria.');
      return;
    }
    const count = exportTransactionsToCsv(filtered, 'spendwise-report');
    toast.success(`Downloaded CSV with ${count} transaction${count === 1 ? '' : 's'}.`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const incomeDelta = computePercentageDelta(currentTotals.totalIncome, previousTotals.totalIncome);
  const expenseDelta = computePercentageDelta(
    currentTotals.totalExpenses,
    previousTotals.totalExpenses
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="rep-period">Reporting Period</Label>
              <Select
                id="rep-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriodPreset)}
                className="w-40"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom range</option>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <Label htmlFor="rep-start">Start Date</Label>
                  <Input
                    id="rep-start"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label htmlFor="rep-end">End Date</Label>
                  <Input
                    id="rep-end"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="rep-curr">Reporting Currency</Label>
              <Select
                id="rep-curr"
                value={reportingCurrency}
                onChange={(e) => setReportingCurrency(e.target.value as CurrencyCode)}
                className="w-32"
              >
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border-subtle)]">
            <Select
              aria-label="Export scope"
              value={csvScope}
              onChange={(e) => setCsvScope(e.target.value as 'period' | 'all')}
              className="w-36 h-9 text-xs"
            >
              <option value="period">Period records</option>
              <option value="all">All records</option>
            </Select>
            <Select
              aria-label="Export transaction type"
              value={csvType}
              onChange={(e) => setCsvType(e.target.value as 'all' | 'income' | 'expense')}
              className="w-32 h-9 text-xs"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <Select
              aria-label="Export currency"
              value={csvCurrency}
              onChange={(e) => setCsvCurrency(e.target.value as 'all' | CurrencyCode)}
              className="w-32 h-9 text-xs"
            >
              <option value="all">All currencies</option>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentTotals.missingRatePairs.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#E5A93B]/40 bg-[#E5A93B]/10 text-xs">
          <AlertCircle className="w-4 h-4 text-[#E5A93B] shrink-0" />
          <span>
            Missing conversion rate(s) for {currentTotals.missingRatePairs.join(', ')}. Open the currency button in the top bar to sync or add manual rates.
          </span>
        </div>
      )}

      {/* Period Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--text-secondary)]">Period Income ({periodRange.label})</p>
            <p className="mt-2 text-xl font-bold font-mono-num text-[#27C98A]">
              {formatCurrency(currentTotals.totalIncome, reportingCurrency)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {incomeDelta === null ? 'No prior comparison' : `${incomeDelta >= 0 ? '+' : ''}${incomeDelta}% vs prior`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--text-secondary)]">Period Expenses</p>
            <p className="mt-2 text-xl font-bold font-mono-num text-[#F06464]">
              {formatCurrency(currentTotals.totalExpenses, reportingCurrency)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {expenseDelta === null ? 'No prior comparison' : `${expenseDelta >= 0 ? '+' : ''}${expenseDelta}% vs prior`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--text-secondary)]">Net Cash Flow</p>
            <p className="mt-2 text-xl font-bold font-mono-num text-[var(--text-primary)]">
              {formatCurrency(currentTotals.netCashFlow, reportingCurrency)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {currentTotals.convertedCount} converted · {currentTotals.skippedCount} skipped
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--text-secondary)]">Savings Rate</p>
            <p className="mt-2 text-xl font-bold font-mono-num text-[#8B7CFF]">
              {currentTotals.savingsRate !== null ? `${currentTotals.savingsRate}%` : '0%'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Net Cash Flow / Total Income</p>
          </CardContent>
        </Card>
      </div>

      {currentTransactions.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-5 h-5" />}
          title={`No transactions in ${periodRange.label}`}
          description="Charts will populate automatically from your real records once transactions exist in this period."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Income vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>1. Income vs Expenses ({reportingCurrency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickFormatter={(v: number) => formatCompactCurrency(v, reportingCurrency)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#27C98A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#F06464" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 2. Monthly Cash Flow */}
          <Card>
            <CardHeader>
              <CardTitle>2. Monthly Cash Flow ({reportingCurrency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickFormatter={(v: number) => formatCompactCurrency(v, reportingCurrency)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                    />
                    <Bar dataKey="netCashFlow" name="Net Cash Flow" fill="#8B7CFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 3. Expense Breakdown by Category */}
          <Card>
            <CardHeader>
              <CardTitle>3. Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-12 text-center">
                  No expenses recorded for this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={48}
                          outerRadius={78}
                        >
                          {expenseBreakdown.map((e) => (
                            <Cell key={e.categoryId} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {expenseBreakdown.map((item) => (
                      <div key={item.categoryId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate">{item.categoryName}</span>
                        </div>
                        <span className="font-mono-num text-[var(--text-secondary)] shrink-0">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Income Breakdown by Category */}
          <Card>
            <CardHeader>
              <CardTitle>4. Income Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeBreakdown.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-12 text-center">
                  No income recorded for this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={48}
                          outerRadius={78}
                        >
                          {incomeBreakdown.map((e) => (
                            <Cell key={e.categoryId} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {incomeBreakdown.map((item) => (
                      <div key={item.categoryId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate">{item.categoryName}</span>
                        </div>
                        <span className="font-mono-num text-[var(--text-secondary)] shrink-0">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Spending Trends */}
          <Card>
            <CardHeader>
              <CardTitle>5. Spending Trends ({reportingCurrency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickFormatter={(v: number) => formatCompactCurrency(v, reportingCurrency)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#F06464"
                      fill="#F06464"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 6. Savings Trends */}
          <Card>
            <CardHeader>
              <CardTitle>6. Savings Rate Trends (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => `${Number(val ?? 0)}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="savingsRate"
                      name="Savings Rate"
                      stroke="#27C98A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 7. Budget Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>7. Budget Performance ({reportingCurrency})</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetChartData.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-10 text-center">
                  No budgets configured for {periodRange.label}. Create monthly budgets to compare planned limits vs actual spending.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={11}
                        tickFormatter={(v: number) => formatCompactCurrency(v, reportingCurrency)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val) => formatCurrency(Number(val ?? 0), reportingCurrency)}
                      />
                      <Legend />
                      <Bar dataKey="budgeted" name="Budget Limit" fill="#8B7CFF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" name="Actual Spent" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
