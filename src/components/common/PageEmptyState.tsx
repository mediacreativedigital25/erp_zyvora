import React from 'react';
import { Inbox } from 'lucide-react';

interface PageEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const PageEmptyState: React.FC<PageEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center bg-white border border-[#DCE5EC] rounded-lg shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-[#EEF4F8] border border-[#DCE5EC] flex items-center justify-center text-[#94A3B8] mb-3.5">
        {icon || <Inbox className="w-5 h-5 text-[#086288]" />}
      </div>

      <h3 className="text-base font-semibold text-[#0F172A] tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[#475569] max-w-md leading-relaxed mb-5">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors shadow-2xs cursor-pointer"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
