import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Tags, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FieldError, Input, Label, Select } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { CategoryIcon } from '@/src/components/ui/category-icon';
import { CATEGORY_COLOR_SWATCHES, CATEGORY_ICON_OPTIONS } from '@/src/constants/finance';
import { categorySchema, type CategoryFormValues } from '@/src/lib/validations/schemas';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import type { Category, TransactionType } from '@/src/types/finance';

export function CategoriesPage() {
  const { userId } = useWorkspaceAuth();
  const {
    categories,
    transactions,
    budgets,
    loading,
    addCategory,
    editCategory,
    removeCategory,
  } = useFinanceData();

  const [typeTab, setTypeTab] = useState<'all' | TransactionType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [replacementId, setReplacementId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
      icon: 'CircleDot',
      color: '#8B7CFF',
    },
  });

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');
  const selectedType = watch('type');

  useEffect(() => {
    if (!modalOpen) return;
    if (editingCat) {
      reset({
        name: editingCat.name,
        type: editingCat.type,
        icon: editingCat.icon,
        color: editingCat.color,
      });
    } else {
      reset({
        name: '',
        type: typeTab === 'income' ? 'income' : 'expense',
        icon: 'CircleDot',
        color: '#8B7CFF',
      });
    }
  }, [modalOpen, editingCat, typeTab, reset]);

  const usageStats = useMemo(() => {
    const txCounts = new Map<string, number>();
    const budgetCounts = new Map<string, number>();
    for (const tx of transactions) {
      txCounts.set(tx.categoryId, (txCounts.get(tx.categoryId) ?? 0) + 1);
    }
    for (const b of budgets) {
      budgetCounts.set(b.categoryId, (budgetCounts.get(b.categoryId) ?? 0) + 1);
    }
    return { txCounts, budgetCounts };
  }, [transactions, budgets]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) => (typeTab === 'all' ? true : c.type === typeTab)),
    [categories, typeTab]
  );

  const replacementOptions = useMemo(() => {
    if (!deleteTarget) return [];
    return categories.filter(
      (c) => c.type === deleteTarget.type && c.id !== deleteTarget.id
    );
  }, [categories, deleteTarget]);

  const openDeleteModal = (cat: Category) => {
    const alts = categories.filter((c) => c.type === cat.type && c.id !== cat.id);
    setReplacementId(alts[0]?.id ?? '');
    setDeleteTarget(cat);
  };

  const onSubmit = async (values: CategoryFormValues) => {
    if (!userId) return;
    const duplicate = categories.find(
      (c) =>
        c.id !== editingCat?.id &&
        c.type === values.type &&
        c.name.toLowerCase() === values.name.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error(`A ${values.type} category named "${values.name.trim()}" already exists.`);
      return;
    }

    try {
      if (editingCat) {
        await editCategory(editingCat.id, {
          name: values.name,
          icon: values.icon,
          color: values.color,
        });
        toast.success('Category updated.');
      } else {
        await addCategory(values);
        toast.success('Category created.');
      }
      setModalOpen(false);
      setEditingCat(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed saving category.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const affectedTxs = transactions.filter((t) => t.categoryId === deleteTarget.id);
    const affectedBudgets = budgets.filter((b) => b.categoryId === deleteTarget.id);
    const needsReassignment = affectedTxs.length > 0 || affectedBudgets.length > 0;
    const replacement =
      replacementOptions.find((c) => c.id === replacementId) ?? null;

    if (needsReassignment && !replacement) {
      toast.error('Please select a replacement category to preserve existing records.');
      return;
    }

    setIsDeleting(true);
    try {
      await removeCategory(
        deleteTarget,
        replacement,
        affectedTxs,
        affectedBudgets
      );
      toast.success(
        needsReassignment && replacement
          ? `Category deleted and records reassigned to ${replacement.name}.`
          : 'Category deleted.'
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed deleting category.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const affectedTxCount = deleteTarget
    ? usageStats.txCounts.get(deleteTarget.id) ?? 0
    : 0;
  const affectedBudgetCount = deleteTarget
    ? usageStats.budgetCounts.get(deleteTarget.id) ?? 0
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] self-start">
          {(['all', 'expense', 'income'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                typeTab === tab
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'all' ? `All (${categories.length})` : tab}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingCat(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New Category
        </Button>
      </div>

      {filteredCategories.length === 0 ? (
        <EmptyState
          icon={<Tags className="w-5 h-5" />}
          title="No categories found"
          description="Create custom income or expense categories to organize your transactions."
          actionLabel="Create Category"
          onAction={() => {
            setEditingCat(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const txCount = usageStats.txCounts.get(cat.id) ?? 0;
            const budgetCount = usageStats.budgetCounts.get(cat.id) ?? 0;
            return (
              <Card key={cat.id}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg border border-[var(--border-subtle)] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}18` }}
                    >
                      <CategoryIcon name={cat.icon} color={cat.color} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {cat.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        <span
                          className={
                            cat.type === 'income' ? 'text-[#27C98A]' : 'text-[#F06464]'
                          }
                        >
                          {cat.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                        {' · '}
                        <span className="font-mono-num">{txCount}</span> txns
                        {budgetCount > 0 ? ` · ${budgetCount} budgets` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${cat.name}`}
                      onClick={() => {
                        setEditingCat(cat);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${cat.name}`}
                      onClick={() => openDeleteModal(cat)}
                      className="hover:text-[#F06464]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Category Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCat(null);
        }}
        title={editingCat ? 'Edit Category' : 'Create Category'}
        description={
          editingCat
            ? 'Update category display name, icon, and accent color.'
            : 'Add a custom category for organizing income or expenses.'
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editingCat && (
            <div>
              <Label>Category Type</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue('type', t)}
                    className={`h-9 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      selectedType === t
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="cat-name">Category Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Cloud Hosting"
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Select color ${hex}`}
                  onClick={() => setValue('color', hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedColor === hex
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] max-h-40 overflow-y-auto">
              {CATEGORY_ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  aria-label={`Select icon ${iconName}`}
                  onClick={() => setValue('icon', iconName)}
                  className={`h-9 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                    selectedIcon === iconName
                      ? 'bg-[var(--bg-elevated)] border-[#8B7CFF]'
                      : 'border-transparent hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <CategoryIcon name={iconName} color={selectedColor} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingCat(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCat ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Safe Deletion & Reassignment Modal */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name ?? ''}"`}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          {affectedTxCount > 0 || affectedBudgetCount > 0 ? (
            <>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#E5A93B]/10 border border-[#E5A93B]/35 text-xs text-[var(--text-primary)]">
                <AlertTriangle className="w-4 h-4 text-[#E5A93B] shrink-0 mt-0.5" />
                <span>
                  This category is linked to{' '}
                  <strong className="font-mono-num">{affectedTxCount}</strong> transaction
                  {affectedTxCount === 1 ? '' : 's'} and{' '}
                  <strong className="font-mono-num">{affectedBudgetCount}</strong> budget
                  {affectedBudgetCount === 1 ? '' : 's'}. Reassign them before deleting.
                </span>
              </div>

              {replacementOptions.length === 0 ? (
                <p className="text-xs text-[#F06464]">
                  You must create another {deleteTarget?.type} category first so existing records can be reassigned safely.
                </p>
              ) : (
                <div>
                  <Label htmlFor="reassign-cat">Reassign Existing Records To</Label>
                  <Select
                    id="reassign-cat"
                    value={replacementId}
                    onChange={(e) => setReplacementId(e.target.value)}
                  >
                    {replacementOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No transactions or budgets are linked to this category. Are you sure you want to delete it?
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={
                isDeleting ||
                ((affectedTxCount > 0 || affectedBudgetCount > 0) && replacementOptions.length === 0)
              }
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
