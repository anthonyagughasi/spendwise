import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input, Select } from '@/src/components/ui/input';
import { EmptyState } from '@/src/components/ui/empty-state';
import { DashboardSkeleton } from '@/src/components/ui/skeleton';
import { CategoryIcon } from '@/src/components/ui/category-icon';
import { TransactionModal } from '@/src/components/transactions/TransactionModal';
import { ExchangeRateModal } from '@/src/components/settings/ExchangeRateModal';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import {
  computeBudgetsProgress,
  computeCategoryBreakdown,
  computeConsolidatedTotals,
  computeMonthlySeries,
  computeNativeCurrencySummaries,
  computePercentageDelta,
} from '@/src/lib/calculations/finance';
import {
  formatCompactCurrency,
  formatCurrency,
  formatUserDate,
  getDateRangeForPreset,
  getTodayIso,
} from '@/src/lib/utils/format';
import type { DashboardDatePreset } from '@/src/types/finance';

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useWorkspaceAuth();
  const { transactions, categories, budgets, rateMap, loading } = useFinanceData();

  const [preset, setPreset] = useState<DashboardDatePreset>('this_month');
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEnd, setCustomEnd] = useState(getTodayIso);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  const reportingCurrency = profile?.preferences?.reportingCurrency ?? profile?.defaultCurrency ?? 'NGN';
  const dateFormat = profile?.preferences?.dateFormat ?? 'MMM dd, yyyy';

  const dateRange = useMemo(
    () => getDateRangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.date >= dateRange.startDate && tx.date <= dateRange.endDate
      ),
    [transactions, dateRange]
  );

  const previousTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.date >= dateRange.previousStartDate &&
          tx.date <= dateRange.previousEndDate
      ),
    [transactions, dateRange]
  );

  const allTimeConsolidated = useMemo(
    () => computeConsolidatedTotals(transactions, reportingCurrency, rateMap),
    [transactions, reportingCurrency, rateMap]
  );

  const periodConsolidated = useMemo(
    () => computeConsolidatedTotals(periodTransactions, reportingCurrency, rateMap),
    [periodTransactions, reportingCurrency, rateMap]
  );

  const previousConsolidated = useMemo(
    () => computeConsolidatedTotals(previousTransactions, reportingCurrency, rateMap),
    [previousTransactions, reportingCurrency, rateMap]
  );

  const nativeAllTime = useMemo(
    () => computeNativeCurrencySummaries(transactions),
    [transactions]
  );

  const incomeDelta = computePercentageDelta(
    periodConsolidated.totalIncome,
    previousConsolidated.totalIncome
  );
  const expenseDelta = computePercentageDelta(
    periodConsolidated.totalExpenses,
    previousConsolidated.totalExpenses
  );
  const savingsDelta = computePercentageDelta(
    periodConsolidated.netCashFlow,
    previousConsolidated.netCashFlow
  );

  // Trend chart uses at least last 6 months when viewing a single month so trends are readable
  const trendRange = useMemo(() => {
    if (preset === 'this_month' || preset === 'last_month') {
      return getDateRangeForPreset('last_6_months');
    }
    return dateRange;
  }, [preset, dateRange]);

  const monthlySeries = useMemo(
    () =>
      computeMonthlySeries(
        transactions,
        trendRange.startDate,
        trendRange.endDate,
        reportingCurrency,
        rateMap
      ),
    [transactions, trendRange, reportingCurrency, rateMap]
  );

  const expenseBreakdown = useMemo(
    () =>
      computeCategoryBreakdown(
        periodTransactions,
        categories,
        'expense',
        reportingCurrency,
        rateMap
      ),
    [periodTransactions, categories, reportingCurrency, rateMap]
  );

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentBudgets = useMemo(
    () =>
      computeBudgetsProgress(
        budgets.filter((b) => b.month === currentMonth && b.year === currentYear),
        transactions
      ),
    [budgets, transactions, currentMonth, currentYear]
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: Date Filter + Reporting Currency Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            Showing financial performance for{' '}
            <span className="text-[var(--text-primary)] font-medium">{dateRange.label}</span>
            {' · '}
            Consolidated in{' '}
            <span className="font-mono-num text-[var(--text-primary)] font-medium">
              {reportingCurrency}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            aria-label="Dashboard date range"
            value={preset}
            onChange={(e) => setPreset(e.target.value as DashboardDatePreset)}
            className="w-44 h-9 text-xs"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_3_months">Last 3 months</option>
            <option value="last_6_months">Last 6 months</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom date range</option>
          </Select>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Start date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-36 text-xs"
              />
              <span className="text-xs text-[var(--text-secondary)]">to</span>
              <Input
                type="date"
                aria-label="End date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-36 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Multi-currency rate transparency alert */}
      {(periodConsolidated.missingRatePairs.length > 0 || periodConsolidated.usedManualRates) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E5A93B]/40 bg-[#E5A93B]/10 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 text-[var(--text-primary)]">
            <AlertCircle className="w-4 h-4 text-[#E5A93B] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              {periodConsolidated.missingRatePairs.length > 0
                ? `Missing exchange rate(s) for ${periodConsolidated.missingRatePairs.join(', ')}. Unconverted transactions are excluded from ${reportingCurrency} totals rather than assuming 1:1.`
                : `Consolidated figures include manual fallback exchange rate(s)${
                    periodConsolidated.oldestRateDate
                      ? ` dated ${periodConsolidated.oldestRateDate}`
                      : ''
                  }.`}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setRatesModalOpen(true)}>
            Manage Rates
          </Button>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Total Balance</span>
              <Wallet className="w-4 h-4 text-[#8B7CFF]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 text-2xl font-bold font-mono-num text-[var(--text-primary)] tracking-tight">
              {formatCurrency(allTimeConsolidated.netCashFlow, reportingCurrency)}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Cumulative net across {transactions.length} record{transactions.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Total Income</span>
              <TrendingUp className="w-4 h-4 text-[#27C98A]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 text-2xl font-bold font-mono-num text-[#27C98A] tracking-tight">
              {formatCurrency(periodConsolidated.totalIncome, reportingCurrency)}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {incomeDelta === null ? (
                <span className="text-[var(--text-secondary)]">No prior period baseline</span>
              ) : (
                <>
                  <span
                    className={`inline-flex items-center font-mono-num font-medium ${
                      incomeDelta >= 0 ? 'text-[#27C98A]' : 'text-[#F06464]'
                    }`}
                  >
                    {incomeDelta >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(incomeDelta)}%
                  </span>
                  <span className="text-[var(--text-secondary)]">vs previous period</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Total Expenses</span>
              <TrendingDown className="w-4 h-4 text-[#F06464]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 text-2xl font-bold font-mono-num text-[#F06464] tracking-tight">
              {formatCurrency(periodConsolidated.totalExpenses, reportingCurrency)}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {expenseDelta === null ? (
                <span className="text-[var(--text-secondary)]">No prior period baseline</span>
              ) : (
                <>
                  <span
                    className={`inline-flex items-center font-mono-num font-medium ${
                      expenseDelta <= 0 ? 'text-[#27C98A]' : 'text-[#F06464]'
                    }`}
                  >
                    {expenseDelta >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(expenseDelta)}%
                  </span>
                  <span className="text-[var(--text-secondary)]">vs previous period</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Net Savings</span>
              <PiggyBank className="w-4 h-4 text-[#8B7CFF]" aria-hidden="true" />
            </div>
            <p
              className={`mt-2.5 text-2xl font-bold font-mono-num tracking-tight ${
                periodConsolidated.netCashFlow >= 0
                  ? 'text-[var(--text-primary)]'
                  : 'text-[#F06464]'
              }`}
            >
              {formatCurrency(periodConsolidated.netCashFlow, reportingCurrency)}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-mono-num text-[var(--text-primary)]">
                {periodConsolidated.savingsRate !== null
                  ? `${periodConsolidated.savingsRate}% rate`
                  : '0% rate'}
              </span>
              {savingsDelta !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">
                    {savingsDelta >= 0 ? '+' : ''}
                    {savingsDelta}% vs prior
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Native Currency Wallet Balances (Never blindly summed across currencies) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nativeAllTime.map((wallet) => (
          <Card key={wallet.currency}>
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {wallet.currency} Native Balance · {wallet.transactionCount} txns
                </p>
                <p className="mt-1 text-lg font-semibold font-mono-num text-[var(--text-primary)]">
                  {formatCurrency(wallet.net, wallet.currency)}
                </p>
              </div>
              <div className="text-right text-[11px] font-mono-num space-y-0.5">
                <p className="text-[#27C98A]">+{formatCompactCurrency(wallet.income, wallet.currency)}</p>
                <p className="text-[#F06464]">-{formatCompactCurrency(wallet.expenses, wallet.currency)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Income vs Expenses Trend</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Monthly cash flow in {reportingCurrency}
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs text-[#8B7CFF] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              Full reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-5 h-5" />}
                title="No financial trends yet"
                description="Record your first income or expense transaction to unlock live cash flow charts."
                actionLabel="Record Transaction"
                onAction={() => setTxModalOpen(true)}
              />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27C98A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#27C98A" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F06464" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F06464" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatCompactCurrency(v, reportingCurrency)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                      formatter={(value) => formatCurrency(Number(value ?? 0), reportingCurrency)}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#27C98A"
                      strokeWidth={2}
                      fill="url(#incomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#F06464"
                      strokeWidth={2}
                      fill="url(#expenseGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Spending Breakdown</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{dateRange.label}</p>
            </div>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <EmptyState
                icon={<PiggyBank className="w-5 h-5" />}
                title="No expenses in period"
                description="Expenses recorded during this period will appear here by category."
              />
            ) : (
              <div className="space-y-4">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="amount"
                        nameKey="categoryName"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                      >
                        {expenseBreakdown.map((item) => (
                          <Cell key={item.categoryId} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                        }}
                        formatter={(value) => formatCurrency(Number(value ?? 0), reportingCurrency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {expenseBreakdown.slice(0, 5).map((item) => (
                    <div key={item.categoryId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-[var(--text-primary)]">{item.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono-num shrink-0">
                        <span className="text-[var(--text-secondary)]">{item.percentage}%</span>
                        <span className="text-[var(--text-primary)] font-medium">
                          {formatCompactCurrency(item.amount, reportingCurrency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Budgets + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Monthly Budgets</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Current month progress</p>
            </div>
            <Link to="/budgets" className="text-xs text-[#8B7CFF] hover:underline whitespace-nowrap">
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {currentBudgets.length === 0 ? (
              <EmptyState
                icon={<PiggyBank className="w-5 h-5" />}
                title="No budgets this month"
                description="Set monthly spending limits per category to stay ahead of overspending."
                actionLabel="Create Budget"
                onAction={() => navigate('/budgets')}
              />
            ) : (
              <div className="space-y-4">
                {currentBudgets.slice(0, 4).map(({ budget, spent, percentage, status }) => {
                  const barColor =
                    status === 'exceeded'
                      ? '#F06464'
                      : status === 'near_limit'
                      ? '#F59E0B'
                      : status === 'warning'
                      ? '#E5A93B'
                      : '#27C98A';

                  return (
                    <div key={budget.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {budget.name}
                        </span>
                        <span className="font-mono-num text-[var(--text-secondary)]">
                          {percentage}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono-num">
                        <span>{formatCurrency(spent, budget.currency)} spent</span>
                        <span>of {formatCurrency(budget.amount, budget.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Latest recorded entries in original currency
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setTxModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Quick Add
              </Button>
              <Link
                to="/transactions"
                className="text-xs text-[#8B7CFF] hover:underline whitespace-nowrap"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-5 h-5" />}
                title="No transactions recorded"
                description="Add your first income or expense transaction to start tracking your cash flow."
                actionLabel="Add Transaction"
                onAction={() => setTxModalOpen(true)}
              />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  return (
                    <div
                      key={tx.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <CategoryIcon name={cat?.icon ?? 'CircleDot'} color={cat?.color} size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {tx.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {tx.categoryName} · {formatUserDate(tx.date, dateFormat)} · {tx.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold font-mono-num ${
                            tx.type === 'income' ? 'text-[#27C98A]' : 'text-[#F06464]'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionModal open={txModalOpen} onClose={() => setTxModalOpen(false)} />
      <ExchangeRateModal open={ratesModalOpen} onClose={() => setRatesModalOpen(false)} />
    </div>
  );
}
