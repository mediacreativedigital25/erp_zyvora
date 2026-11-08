import React from 'react';

export interface SummaryMetric {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
}

interface PageSummaryProps {
  metrics: SummaryMetric[];
}

export const PageSummary: React.FC<PageSummaryProps> = ({ metrics }) => {
  const displayMetrics = metrics.slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {displayMetrics.map((item, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#DCE5EC] rounded-lg p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-[#B7DDEA] shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
            <span className="font-medium truncate">{item.label}</span>
            {item.icon && <span className="text-[#94A3B8] shrink-0">{item.icon}</span>}
          </div>

          <div className="mt-2.5 mb-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] font-mono tabular-nums">
              {item.value}
            </span>
          </div>

          {(item.subtext || item.trend) && (
            <div className="mt-1 flex items-center gap-2 text-xs text-[#475569]">
              {item.trend && (
                <span
                  className={`font-semibold ${
                    item.trend.isPositive ? 'text-[#16A34A]' : 'text-[#D97706]'
                  }`}
                >
                  {item.trend.value}
                </span>
              )}
              {item.subtext && <span className="truncate">{item.subtext}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
