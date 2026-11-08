import React from 'react';
import { SearchInput } from './SearchInput';
import { FilterBar, FilterGroup } from './FilterBar';
import { Download, RefreshCw } from 'lucide-react';

interface PageToolbarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  filterGroups?: FilterGroup[];
  onResetFilters?: () => void;
  onExportCsv?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  extraActions?: React.ReactNode;
}

export const PageToolbar: React.FC<PageToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  filterGroups = [],
  onResetFilters,
  onExportCsv,
  onRefresh,
  isRefreshing = false,
  extraActions
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white border border-[#DCE5EC] rounded-lg shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full sm:w-64"
        />

        {filterGroups.length > 0 && (
          <FilterBar
            groups={filterGroups}
            onReset={onResetFilters}
            showReset={Boolean(onResetFilters)}
          />
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {extraActions}

        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer shadow-2xs"
            title="Ekspor data ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#475569]" />
            <span>Ekspor CSV</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-[#475569] hover:text-[#0F172A] border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#086288]' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
