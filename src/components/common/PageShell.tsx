import React from 'react';
import { Breadcrumb } from './Breadcrumb';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageShellProps {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  breadcrumbs,
  children,
  className = ''
}) => {
  return (
    <div className={`w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 ${className}`}>
      <div className="pb-1 border-b border-[#DCE5EC]/70">
        <Breadcrumb items={breadcrumbs} />
      </div>
      {children}
    </div>
  );
};
