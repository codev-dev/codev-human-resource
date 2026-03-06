import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Hook: useTablePagination
// ---------------------------------------------------------------------------

interface UseTablePaginationOptions {
  /** Default rows per page. Defaults to 10. */
  defaultPageSize?: number;
}

interface UseTablePaginationReturn<T> {
  /** Current page (0-indexed) */
  page: number;
  /** Rows per page */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** The slice of data for the current page */
  paginatedData: T[];
  /** Total row count */
  totalRows: number;
  /** Whether the table is showing all rows */
  isShowingAll: boolean;
  /** Go to a specific page */
  setPage: (page: number) => void;
  /** Toggle between paginated and show-all */
  toggleShowAll: () => void;
  /** Go to first page */
  goFirst: () => void;
  /** Go to last page */
  goLast: () => void;
  /** Go to next page */
  goNext: () => void;
  /** Go to previous page */
  goPrev: () => void;
}

export function useTablePagination<T>(
  data: T[],
  options?: UseTablePaginationOptions,
): UseTablePaginationReturn<T> {
  const pageSize = options?.defaultPageSize ?? 10;
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const totalRows = data.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Reset page if data shrinks
  const safePage = Math.min(page, totalPages - 1);

  const paginatedData = useMemo(() => {
    if (showAll) return data;
    const start = safePage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize, showAll]);

  return {
    page: safePage,
    pageSize,
    totalPages,
    paginatedData,
    totalRows,
    isShowingAll: showAll,
    setPage: (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1))),
    toggleShowAll: () => {
      setShowAll((v) => !v);
      setPage(0);
    },
    goFirst: () => setPage(0),
    goLast: () => setPage(totalPages - 1),
    goNext: () => setPage((p) => Math.min(p + 1, totalPages - 1)),
    goPrev: () => setPage((p) => Math.max(p - 1, 0)),
  };
}

// ---------------------------------------------------------------------------
// Component: TablePagination
// ---------------------------------------------------------------------------

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  isShowingAll: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onToggleShowAll: () => void;
}

export function TablePagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  isShowingAll,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onToggleShowAll,
}: TablePaginationProps) {
  if (totalRows <= pageSize && !isShowingAll) return null;

  const start = isShowingAll ? 1 : page * pageSize + 1;
  const end = isShowingAll ? totalRows : Math.min((page + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {totalRows} rows
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={onToggleShowAll}
        >
          {isShowingAll ? `Show ${pageSize} per page` : 'Show all'}
        </Button>
        {!isShowingAll && (
          <>
            <Button variant="outline" size="icon" className="size-7" onClick={onFirst} disabled={page === 0}>
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="size-7" onClick={onPrev} disabled={page === 0}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="size-7" onClick={onNext} disabled={page === totalPages - 1}>
              <ChevronRight className="size-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="size-7" onClick={onLast} disabled={page === totalPages - 1}>
              <ChevronsRight className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
