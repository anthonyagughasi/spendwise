import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Select } from './input';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Showing {start}–{end} of {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <Select
            aria-label="Rows per page"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 w-20 text-xs"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </Button>
        <span className="px-2 font-mono-num text-[var(--text-primary)]">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
