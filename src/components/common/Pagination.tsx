import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50]
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-[#DCE5EC] text-xs text-[#475569]">
      <div className="flex items-center gap-3">
        <span>
          Menampilkan <strong className="text-[#0F172A] font-mono tabular-nums">{startItem}</strong> -{' '}
          <strong className="text-[#0F172A] font-mono tabular-nums">{endItem}</strong> dari{' '}
          <strong className="text-[#0F172A] font-mono tabular-nums">{totalItems}</strong> baris
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-[#DCE5EC] pl-3">
            <span>Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-[#DCE5EC] text-[#0F172A] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-[#086288]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <span className="mr-2 text-xs">
          Hal <strong className="text-[#0F172A] font-mono tabular-nums">{currentPage}</strong> dari{' '}
          <strong className="text-[#0F172A] font-mono tabular-nums">{totalPages}</strong>
        </span>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded border border-[#DCE5EC] text-[#0F172A] hover:bg-[#EEF4F8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 rounded border border-[#DCE5EC] text-[#0F172A] hover:bg-[#EEF4F8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
