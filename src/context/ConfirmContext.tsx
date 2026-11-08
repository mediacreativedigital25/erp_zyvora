import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  X,
  RefreshCw,
  Info
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  entityCode?: string;
  entityName?: string;
  badgeText?: string;
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      // Safety auto-focus Cancel button after modal opens
      setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 50);
    });
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  const variant = options?.variant || 'danger';

  // Variant Visual Theme Config
  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-100 text-rose-600 border border-rose-200',
      icon: <AlertOctagon className="w-5 h-5" />,
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-2xs',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      defaultConfirmText: 'Ya, Hapus Permanen'
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-700 border border-amber-200',
      icon: <AlertTriangle className="w-5 h-5" />,
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-2xs',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      defaultConfirmText: 'Ya, Lanjutkan'
    },
    info: {
      iconBg: 'bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]',
      icon: <ShieldAlert className="w-5 h-5" />,
      btnConfirm: 'bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white shadow-2xs',
      badgeBg: 'bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]',
      defaultConfirmText: 'Ya, Konfirmasi'
    }
  }[variant];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[480px] bg-white rounded-xl shadow-2xl border border-[#DCE5EC] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-start gap-3.5 border-b border-[#EEF4F8]">
              <div className={`p-2.5 rounded-xl shrink-0 ${variantStyles.iconBg}`}>
                {variantStyles.icon}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] leading-tight">
                  {options.title}
                </h3>
                {options.badgeText && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${variantStyles.badgeBg}`}>
                    {options.badgeText}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs text-[#475569]">
              {/* Main Message */}
              <div className="leading-relaxed text-[#334155] text-xs sm:text-[13px]">
                {options.message}
              </div>

              {/* Entity Highlight Card (if provided) */}
              {(options.entityCode || options.entityName) && (
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-1">
                  <div className="flex items-center gap-2">
                    {options.entityCode && (
                      <span className="font-mono font-bold text-[11px] bg-white border border-[#CBD5E1] px-2 py-0.5 rounded text-[#086288]">
                        {options.entityCode}
                      </span>
                    )}
                    {options.entityName && (
                      <span className="font-bold text-xs text-[#0F172A] truncate">
                        {options.entityName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Consequences Bullet Points */}
              {options.consequences && options.consequences.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Konsekuensi Tindakan:
                  </span>
                  <ul className="space-y-1 text-[11px] text-[#475569]">
                    {options.consequences.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#DC2626] font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#EEF4F8] flex items-center justify-end gap-2.5">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {options.cancelLabel || 'Batal'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${variantStyles.btnConfirm}`}
              >
                <span>{options.confirmLabel || variantStyles.defaultConfirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
