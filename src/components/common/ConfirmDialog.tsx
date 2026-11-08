import React from 'react';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { BaseModal } from './BaseModal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      zIndex="z-[60]"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      icon={
        isDestructive ? (
          <AlertCircle className="w-4 h-4 text-[#DC2626]" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#086288]" />
        )
      }
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#086288] hover:bg-[#064B6A]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      }
    >
      <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
        {message}
      </p>
    </BaseModal>
  );
};
