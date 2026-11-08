import React from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { BaseModal, ModalSize } from './BaseModal';

export interface PageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  isDestructive?: boolean;
  size?: ModalSize;
  width?: string; // backwards compatibility
  children: React.ReactNode;
}

export const PageFormModal: React.FC<PageFormModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon,
  onSubmit,
  submitLabel = 'Simpan Data',
  cancelLabel = 'Batal',
  isLoading = false,
  isSubmitting = false,
  isDestructive = false,
  size = 'lg',
  children
}) => {
  const loading = isLoading || isSubmitting;
  const desc = description || subtitle;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={desc}
      icon={icon}
      size={size}
      closeOnBackdropClick={false}
      closeOnEscape={!loading}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569] hidden sm:block">
            <span className="text-[#DC2626] font-bold">*</span> Field wajib diisi
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              form="page-modal-form"
              disabled={loading}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                isDestructive
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  : 'bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="page-modal-form" onSubmit={onSubmit} className="space-y-4">
        {children}
      </form>
    </BaseModal>
  );
};

// Re-export PageFormDrawer as PageFormModal so that all previous drawer references
// automatically adhere to the centered modal design system without breaking imports
export const PageFormDrawer = PageFormModal;
