import React from 'react';
import { Filter } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  groups: FilterGroup[];
  onReset?: () => void;
  showReset?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ groups, onReset, showReset = false }) => {
  return (
    <div className="flex items-center gap-2.5 flex-wrap text-xs">
      <div className="flex items-center gap-1.5 text-[#475569] font-medium mr-1">
        <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
        <span>Filter:</span>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex items-center">
          <select
            value={group.selectedValue}
            onChange={(e) => group.onChange(e.target.value)}
            className="bg-white border border-[#DCE5EC] text-[#0F172A] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#086288] cursor-pointer hover:border-[#CBD5E1] transition-colors"
          >
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {group.label}: {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {showReset && onReset && (
        <button
          onClick={onReset}
          className="text-xs text-[#086288] hover:text-[#064B6A] underline ml-1 cursor-pointer"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
};
