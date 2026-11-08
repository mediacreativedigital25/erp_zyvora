import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface PageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`border-b border-[#DCE5EC] overflow-x-auto scrollbar-none ${className}`}>
      <div className="flex items-center gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`group flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-[#086288] text-[#086288] font-semibold'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1]'
              }`}
            >
              {tab.icon && (
                <span className={isActive ? 'text-[#086288]' : 'text-[#94A3B8] group-hover:text-[#475569]'}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#DCEEF5] text-[#086288] font-semibold'
                      : 'bg-[#EEF4F8] text-[#475569] group-hover:bg-[#E2E8F0]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
