import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FieldError, Input, Label, Select } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { CategoryIcon } from '@/src/components/ui/category-icon';
import { CURRENCY_CODES } from '@/src/constants/finance';
import { budgetSchema, type BudgetFormValues } from '@/src/lib/validations/schemas';
import { computeBudgetsProgress } from '@/src/lib/calculations/finance';
import { formatCurrency, getMonthLabel } from '@/src/lib/utils/format';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import type { Budget, BudgetStatus } from '@/src/types/finance';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function StatusIndicator({ status }: { status: BudgetStatus }) {
  switch (status) {
    case 'exceeded':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F06464]">
          <ShieldAlert className="w-3.5 h-3.5" /> Exceeded
        </span>
      );
    case 'near_limit':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F59E0B]">
          <AlertTriangle className="w-3.5 h-3.5" /> Near limit
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#E5A93B]">
          <AlertTriangle className="w-3.5 h-3.5" /> Warning
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#27C98A]">
          <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
        </span>
      );
  }
}

export function BudgetsPage() {
  const { userId, profile } = useWorkspaceAuth();
  const {
    budgets,
    categories,
    transactions,
    loading,
    addBudget,
    editBudget,
    removeBudget,
  } = useFinanceData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filteredBudgets = useMemo(
    () =>
      budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear),
    [budgets, selectedMonth, selectedYear]
  );

  const budgetProgress = useMemo(
    () => computeBudgetsProgress(filteredBudgets, transactions),
    [filteredBudgets, transactions]
  );

  const alertsCount = budgetProgress.filter((b) => b.status !== 'healthy').length;

  const defaultCurrency = profile?.defaultCurrency ?? 'NGN';
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      amount: undefined as unknown as number,
      currency: defaultCurrency,
      month: selectedMonth,
      year: selectedYear,
    },
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingBudget) {
      reset({
        name: editingBudget.name,
        categoryId: editingBudget.categoryId,
        amount: editingBudget.amount,
        currency: editingBudget.currency,
        month: editingBudget.month,
        year: editingBudget.year,
      });
    } else {
      reset({
        name: '',
        categoryId: expenseCategories[0]?.id ?? '',
        amount: undefined as unknown as number,
        currency: defaultCurrency,
        month: selectedMonth,
        year: selectedYear,
      });
    }
  }, [modalOpen, editingBudget, expenseCategories, defaultCurrency, selectedMonth, selectedYear, reset]);

  const onSubmit = async (values: BudgetFormValues) => {
    if (!userId) return;
    const category = expenseCategories.find((c) => c.id === values.categoryId);
    if (!category) {
      toast.error('Please select a valid expense category.');
      return;
    }

    const duplicate = budgets.find(
      (b) =>
        b.id !== editingBudget?.id &&
        b.categoryId === values.categoryId &&
        b.month === values.month &&
        b.year === values.year &&
        b.currency === values.currency
    );

    if (duplicate) {
      toast.error(
        `A ${values.currency} budget for ${category.name} in ${getMonthLabel(
          values.month,
          values.year
        )} already exists.`
      );
      return;
    }

    try {
      if (editingBudget) {
        await editBudget(editingBudget.id, values, category);
        toast.success('Budget updated.');
      } else {
        await addBudget(values, category);
        toast.success('Monthly budget created.');
      }
      setModalOpen(false);
      setEditingBudget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed saving budget.');
    }
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    setIsDeleting(true);
    try {
      await removeBudget(deletingBudget.id);
      toast.success('Budget deleted.');
      setDeletingBudget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed deleting budget.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Select
            aria-label="Select budget month"
            value={String(selectedMonth)}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-40 h-9 text-xs"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Select budget year"
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 h-9 text-xs font-mono-num"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingBudget(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New Budget
        </Button>
      </div>

      {/* Warning banner */}
      {alertsCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#F06464]/35 bg-[#F06464]/10 text-xs text-[var(--text-primary)]">
          <AlertTriangle className="w-4 h-4 text-[#F06464] shrink-0" />
          <span>
            {alertsCount} budget{alertsCount === 1 ? ' is' : 's are'} at 70% or higher of the monthly limit for{' '}
            {getMonthLabel(selectedMonth, selectedYear)}.
          </span>
        </div>
      )}

      {/* Budgets Grid */}
      {budgetProgress.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="w-5 h-5" />}
          title={`No budgets for ${getMonthLabel(selectedMonth, selectedYear)}`}
          description="Create monthly category limits to track actual spending against your targets."
          actionLabel="Create Budget"
          onAction={() => {
            setEditingBudget(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgetProgress.map(({ budget, spent, remaining, percentage, status }) => {
            const cat = categoryMap.get(budget.categoryId);
            const barColor =
              status === 'exceeded'
                ? '#F06464'
                : status === 'near_limit'
                ? '#F59E0B'
                : status === 'warning'
                ? '#E5A93B'
                : '#27C98A';

            return (
              <Card key={budget.id}>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        <CategoryIcon
                          name={cat?.icon ?? 'CircleDot'}
                          color={cat?.color}
                          size={16}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {budget.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {budget.categoryName} · {budget.currency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${budget.name}`}
                        onClick={() => {
                          setEditingBudget(budget);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${budget.name}`}
                        onClick={() => setDeletingBudget(budget)}
                        className="hover:text-[#F06464]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <StatusIndicator status={status} />
                      <span className="text-xs font-mono-num font-semibold text-[var(--text-primary)]">
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                    <div>
                      <p className="text-[11px] text-[var(--text-secondary)]">Limit</p>
                      <p className="mt-0.5 font-mono-num font-medium text-[var(--text-primary)]">
                        {formatCurrency(budget.amount, budget.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-secondary)]">Spent</p>
                      <p className="mt-0.5 font-mono-num font-medium text-[var(--text-primary)]">
                        {formatCurrency(spent, budget.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[var(--text-secondary)]">Remaining</p>
                      <p
                        className={`mt-0.5 font-mono-num font-semibold ${
                          remaining < 0 ? 'text-[#F06464]' : 'text-[#27C98A]'
                        }`}
                      >
                        {formatCurrency(remaining, budget.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBudget(null);
        }}
        title={editingBudget ? 'Edit Monthly Budget' : 'Create Monthly Budget'}
        description="Track actual expenses matching the selected category, currency, and month."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="budget-name">Budget Name</Label>
            <Input
              id="budget-name"
              placeholder="e.g. Monthly Groceries Cap"
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-cat">Expense Category</Label>
              <Select id="budget-cat" {...register('categoryId')}>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.categoryId?.message} />
            </div>

            <div>
              <Label htmlFor="budget-currency">Currency</Label>
              <Select id="budget-currency" {...register('currency')}>
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.currency?.message} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="budget-amount">Monthly Spending Limit</Label>
              <Input
                id="budget-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="font-mono-num"
                {...register('amount', { valueAsNumber: true })}
              />
              <FieldError message={errors.amount?.message} />
            </div>

            <div>
              <Label htmlFor="budget-month">Month</Label>
              <Select id="budget-month" {...register('month', { valueAsNumber: true })}>
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="budget-year">Year</Label>
              <Select id="budget-year" {...register('year', { valueAsNumber: true })}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingBudget(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingBudget ? 'Save Budget' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingBudget)}
        onClose={() => setDeletingBudget(null)}
        onConfirm={handleDelete}
        title="Delete Budget"
        description={
          deletingBudget
            ? `Delete the "${deletingBudget.name}" budget? Your recorded transactions will remain untouched.`
            : ''
        }
        confirmLabel="Delete Budget"
        loading={isDeleting}
      />
    </div>
  );
}
