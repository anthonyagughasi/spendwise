import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { FieldError, Input, Label, Select, Textarea } from '@/src/components/ui/input';
import { CURRENCY_CODES, PAYMENT_METHODS, SUPPORTED_CURRENCIES } from '@/src/constants/finance';
import { transactionSchema, type TransactionFormValues } from '@/src/lib/validations/schemas';
import { getTodayIso } from '@/src/lib/utils/format';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import type { Transaction } from '@/src/types/finance';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

export function TransactionModal({
  open,
  onClose,
  editingTransaction,
}: TransactionModalProps) {
  const { userId, profile } = useWorkspaceAuth();
  const { categories, addTransaction, editTransaction } = useFinanceData();

  const defaultCurrency = profile?.defaultCurrency ?? 'NGN';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      title: '',
      type: 'expense',
      amount: undefined as unknown as number,
      currency: defaultCurrency,
      categoryId: '',
      date: getTodayIso(),
      paymentMethod: 'Bank transfer',
      description: '',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const filteredCategories = categories.filter((c) => c.type === selectedType);

  useEffect(() => {
    if (!open) return;
    if (editingTransaction) {
      reset({
        title: editingTransaction.title,
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        currency: editingTransaction.currency,
        categoryId: editingTransaction.categoryId,
        date: editingTransaction.date,
        paymentMethod: editingTransaction.paymentMethod,
        description: editingTransaction.description ?? '',
        notes: editingTransaction.notes ?? '',
      });
    } else {
      const initialExpenseCat = categories.find((c) => c.type === 'expense');
      reset({
        title: '',
        type: 'expense',
        amount: undefined as unknown as number,
        currency: defaultCurrency,
        categoryId: initialExpenseCat?.id ?? '',
        date: getTodayIso(),
        paymentMethod: 'Bank transfer',
        description: '',
        notes: '',
      });
    }
  }, [open, editingTransaction, categories, defaultCurrency, reset]);

  // Keep category synchronized when switching income <-> expense
  useEffect(() => {
    const currentCatId = watch('categoryId');
    const stillValid = filteredCategories.some((c) => c.id === currentCatId);
    if (!stillValid) {
      setValue('categoryId', filteredCategories[0]?.id ?? '');
    }
  }, [selectedType, filteredCategories, setValue, watch]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (!userId) return;
    const category = categories.find((c) => c.id === values.categoryId && c.type === values.type);
    if (!category) {
      toast.error('Please select a valid category matching the transaction type.');
      return;
    }

    try {
      if (editingTransaction) {
        await editTransaction(editingTransaction.id, values, category);
        toast.success('Transaction updated.');
      } else {
        await addTransaction(values, category);
        toast.success('Transaction recorded.');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save transaction.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
      description="Amounts are preserved in their original transaction currency."
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Segmented Type Selector */}
        <div>
          <Label>Transaction Type</Label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={`h-9 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedType === 'expense'
                  ? 'bg-[#F06464]/15 text-[#F06464] border border-[#F06464]/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'income')}
              className={`h-9 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedType === 'income'
                  ? 'bg-[#27C98A]/15 text-[#27C98A] border border-[#27C98A]/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Income
            </button>
          </div>
          <FieldError message={errors.type?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="tx-title">Title</Label>
            <Input
              id="tx-title"
              placeholder={selectedType === 'income' ? 'e.g. Monthly Salary' : 'e.g. Grocery Store Run'}
              {...register('title')}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <Label htmlFor="tx-amount">Amount</Label>
            <Input
              id="tx-amount"
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
            <Label htmlFor="tx-currency">Currency</Label>
            <Select id="tx-currency" {...register('currency')}>
              {CURRENCY_CODES.map((code) => {
                const cfg = SUPPORTED_CURRENCIES.find((c) => c.code === code);
                return (
                  <option key={code} value={code}>
                    {code} ({cfg?.symbol}) — {cfg?.name}
                  </option>
                );
              })}
            </Select>
            <FieldError message={errors.currency?.message} />
          </div>

          <div>
            <Label htmlFor="tx-category">Category</Label>
            <Select id="tx-category" {...register('categoryId')}>
              {filteredCategories.length === 0 && (
                <option value="">No {selectedType} categories found</option>
              )}
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.categoryId?.message} />
          </div>

          <div>
            <Label htmlFor="tx-date">Transaction Date</Label>
            <Input id="tx-date" type="date" {...register('date')} />
            <FieldError message={errors.date?.message} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="tx-method">Payment Method</Label>
            <Select id="tx-method" {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
            <FieldError message={errors.paymentMethod?.message} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              placeholder="Short summary of this transaction"
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="tx-notes">Notes (Optional)</Label>
            <Textarea
              id="tx-notes"
              placeholder="Invoice reference, merchant details, or personal notes"
              {...register('notes')}
            />
            <FieldError message={errors.notes?.message} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || filteredCategories.length === 0}>
            {isSubmitting
              ? 'Saving...'
              : editingTransaction
              ? 'Save Changes'
              : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
