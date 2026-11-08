import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PageEmptyState } from './PageEmptyState';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface PageTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRowClick?: (row: T) => void;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

export function PageTable<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  isLoading = false,
  emptyTitle = 'Tidak ada data ditemukan',
  emptyDescription = 'Coba ubah kata kunci pencarian atau sesuaikan filter yang aktif.',
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  selectedIds,
  onSelectRow,
  onSelectAll
}: PageTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#DCE5EC] rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-[#EEF4F8] animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <PageEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  const allSelected =
    Boolean(selectedIds && data.length > 0) &&
    data.every((item) => selectedIds?.includes(keyExtractor(item)));

  return (
    <div className="bg-white border border-[#DCE5EC] rounded-lg overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#DCE5EC] text-[#475569]">
              {onSelectAll && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="rounded border-[#CBD5E1] text-[#086288] focus:ring-[#086288] cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const alignmentClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-4 py-3 font-semibold text-xs tracking-wide text-[#334155] ${alignmentClass} select-none`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        onClick={() => onSort(col.key)}
                        className={`inline-flex items-center gap-1.5 hover:text-[#0F172A] cursor-pointer ${
                          col.align === 'right' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#086288]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#086288]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EEF4F8]">
            {data.map((row, idx) => {
              const rowId = keyExtractor(row);
              const isSelected = selectedIds?.includes(rowId);

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors group ${
                    isSelected
                      ? 'bg-[#EFF7FA]'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-[#F8FAFC]'
                      : 'bg-[#FAFBFD] hover:bg-[#F8FAFC]'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {onSelectRow && (
                    <td
                      className="w-10 px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(rowId)}
                        className="rounded border-[#CBD5E1] text-[#086288] focus:ring-[#086288] cursor-pointer"
                      />
                    </td>
                  )}

                  {columns.map((col) => {
                    const alignmentClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const content = col.render
                      ? col.render(row, idx)
                      : (row as Record<string, unknown>)[col.key] != null
                      ? String((row as Record<string, unknown>)[col.key])
                      : '-';

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-[#0F172A] ${alignmentClass} ${
                          col.align === 'right' ? 'font-mono tabular-nums' : ''
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
