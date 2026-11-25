import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  ArrowUpDown,
  FilterX,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input, Select } from '@/src/components/ui/input';
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Pagination } from '@/src/components/ui/pagination';
import { Skeleton } from '@/src/components/ui/skeleton';
import { CategoryIcon } from '@/src/components/ui/category-icon';
import { TransactionModal } from '@/src/components/transactions/TransactionModal';
import { CURRENCY_CODES, PAYMENT_METHODS } from '@/src/constants/finance';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';
import { exportTransactionsToCsv } from '@/src/lib/services/csvService';
import { formatCurrency, formatUserDate } from '@/src/lib/utils/format';
import type { Transaction } from '@/src/types/finance';

type SortField = 'date' | 'amount' | 'title';
type SortDirection = 'asc' | 'desc';

export function TransactionsPage() {
  const { profile } = useWorkspaceAuth();
  const { transactions, categories, loading, removeTransaction } = useFinanceData();

  const dateFormat = profile?.preferences?.dateFormat ?? 'MMM dd, yyyy';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      typeFilter !== 'all' ||
      categoryFilter !== 'all' ||
      currencyFilter !== 'all' ||
      methodFilter !== 'all' ||
      startDate ||
      endDate
  );

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setCurrencyFilter('all');
    setMethodFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false;
      if (methodFilter !== 'all' && tx.paymentMethod !== methodFilter) return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (q) {
        const hay = `${tx.title} ${tx.description} ${tx.categoryName} ${tx.notes ?? ''} ${tx.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else {
        cmp = a.title.localeCompare(b.title);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    transactions,
    search,
    typeFilter,
    categoryFilter,
    currencyFilter,
    methodFilter,
    startDate,
    endDate,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'title' ? 'asc' : 'desc');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setIsDeleting(true);
    try {
      await removeTransaction(deletingTx.id);
      toast.success('Transaction deleted.');
      setDeletingTx(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed deleting transaction.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast.info('No transactions match your current filters to export.');
      return;
    }
    const count = exportTransactionsToCsv(
      filteredTransactions,
      hasActiveFilters ? 'spendwise-filtered-transactions' : 'spendwise-transactions'
    );
    toast.success(`Exported ${count} transaction${count === 1 ? '' : 's'} to CSV.`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="font-mono-num text-[var(--text-primary)] font-medium">
              {filteredTransactions.length}
            </span>{' '}
            of{' '}
            <span className="font-mono-num text-[var(--text-primary)] font-medium">
              {transactions.length}
            </span>{' '}
            transactions shown
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                aria-label="Search transactions"
                placeholder="Search title, category, description, or notes..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              aria-label="Filter by transaction type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | 'income' | 'expense');
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </Select>

            <Select
              aria-label="Filter by currency"
              value={currencyFilter}
              onChange={(e) => {
                setCurrencyFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All currencies</option>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            <Select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by payment method"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All payment methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>

            <Input
              type="date"
              aria-label="Filter start date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />

            <Input
              type="date"
              aria-label="Filter end date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="justify-center"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List / Table */}
      <Card>
        <CardContent className="pt-4">
          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-5 h-5" />}
              title={
                transactions.length === 0
                  ? 'No transactions recorded yet'
                  : 'No matching transactions'
              }
              description={
                transactions.length === 0
                  ? 'Start logging your income and expenses to build your ledger.'
                  : 'Try adjusting or clearing your search and filter criteria.'
              }
              actionLabel={transactions.length === 0 ? 'Add Transaction' : 'Clear Filters'}
              onAction={
                transactions.length === 0
                  ? () => {
                      setEditingTx(null);
                      setModalOpen(true);
                    }
                  : clearFilters
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      <th className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort('title')}
                          className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Transaction <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium">Category</th>
                      <th className="py-3 px-3 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort('date')}
                          className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Date <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium">Payment method</th>
                      <th className="py-3 px-3 font-medium text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('amount')}
                          className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Amount <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium">Type</th>
                      <th className="py-3 pl-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                    {paginatedTransactions.map((tx) => {
                      const cat = categoryMap.get(tx.categoryId);
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-[var(--bg-elevated)]/40 transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                                <CategoryIcon
                                  name={cat?.icon ?? 'CircleDot'}
                                  color={cat?.color}
                                  size={15}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--text-primary)] truncate max-w-[240px]">
                                  {tx.title}
                                </p>
                                {tx.description && (
                                  <p className="text-xs text-[var(--text-secondary)] truncate max-w-[240px]">
                                    {tx.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-[var(--text-primary)] whitespace-nowrap">
                            {tx.categoryName}
                          </td>
                          <td className="py-3 px-3 text-xs font-mono-num text-[var(--text-secondary)] whitespace-nowrap">
                            {formatUserDate(tx.date, dateFormat)}
                          </td>
                          <td className="py-3 px-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {tx.paymentMethod}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono-num font-semibold whitespace-nowrap ${
                              tx.type === 'income' ? 'text-[#27C98A]' : 'text-[#F06464]'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="py-3 px-3 text-xs whitespace-nowrap">
                            <span
                              className={
                                tx.type === 'income'
                                  ? 'text-[#27C98A] font-medium'
                                  : 'text-[#F06464] font-medium'
                              }
                            >
                              {tx.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${tx.title}`}
                                onClick={() => {
                                  setEditingTx(tx);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${tx.title}`}
                                onClick={() => setDeletingTx(tx)}
                                className="hover:text-[#F06464]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Transaction List */}
              <div className="md:hidden divide-y divide-[var(--border-subtle)]">
                {paginatedTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  return (
                    <div key={tx.id} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                            <CategoryIcon
                              name={cat?.icon ?? 'CircleDot'}
                              color={cat?.color}
                              size={15}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {tx.title}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {tx.categoryName} · {formatUserDate(tx.date, dateFormat)}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-mono-num font-semibold shrink-0 ${
                            tx.type === 'income' ? 'text-[#27C98A]' : 'text-[#F06464]'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>
                          {tx.type === 'income' ? 'Income' : 'Expense'} · {tx.paymentMethod}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTx(tx);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingTx(tx)}
                            className="text-[#F06464]"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                page={safePage}
                pageSize={pageSize}
                totalItems={filteredTransactions.length}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        editingTransaction={editingTx}
      />

      <ConfirmDialog
        open={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        description={
          deletingTx
            ? `Permanently delete "${deletingTx.title}" (${formatCurrency(
                deletingTx.amount,
                deletingTx.currency
              )})? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Transaction"
        loading={isDeleting}
      />
    </div>
  );
}
