import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { navigateToFeature } = useErp();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-[#475569]">
      <button
        onClick={() => navigateToFeature('dashboard')}
        className="flex items-center gap-1 hover:text-[#086288] transition-colors font-medium cursor-pointer"
        title="Kembali ke Dashboard"
      >
        <Home className="w-3.5 h-3.5 text-[#94A3B8]" />
        <span>Zyvora</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 mx-1.5 text-[#CBD5E1] shrink-0" aria-hidden="true" />
            {isLast || !item.onClick ? (
              <span className={`font-semibold ${isLast ? 'text-[#0F172A]' : 'text-[#475569]'}`}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-[#086288] hover:underline transition-colors font-medium cursor-pointer"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
