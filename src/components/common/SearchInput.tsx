import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Cari data...',
  className = '',
  onClear
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-[#DCE5EC] rounded-md text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] transition-colors"
      />
      {value && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2.5 text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded cursor-pointer"
          title="Hapus pencarian"
          aria-label="Hapus pencarian"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
