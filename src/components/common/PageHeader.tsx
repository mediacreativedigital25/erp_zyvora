import React from 'react';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: ActionButton;
  secondaryActions?: ActionButton[];
  badge?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  primaryAction,
  secondaryActions = [],
  badge
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DCE5EC]">
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            {title}
          </h1>

          {badge && (
            <span className="text-xs font-semibold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2.5 py-0.5 rounded-md">
              {badge}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-[#475569] max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {secondaryActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] hover:border-[#CBD5E1] transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}

        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {actionIcon(primaryAction.icon)}
            <span>{primaryAction.label}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const actionIcon = (icon?: React.ReactNode) => {
  return icon ? <span className="shrink-0">{icon}</span> : null;
};
