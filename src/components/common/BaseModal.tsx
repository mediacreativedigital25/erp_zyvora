import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BaseModalProps {
  isOpen?: boolean;
  open?: boolean; // alias for isOpen
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  zIndex?: string; // default: 'z-50'
  headerExtra?: React.ReactNode;
  bodyClassName?: string;
  maxWidth?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[760px]',
  xl: 'max-w-[960px]'
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  open,
  onClose,
  title,
  description,
  icon,
  size = 'md',
  maxWidth,
  children,
  footer,
  closeOnBackdropClick = false,
  closeOnEscape = true,
  showCloseButton = true,
  zIndex = 'z-50',
  headerExtra,
  bodyClassName = 'p-4 sm:p-6',
  initialFocusRef,
  ariaLabel
}) => {
  const isModalOpen = Boolean(isOpen ?? open);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!isModalOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isModalOpen]);

  // Handle Escape key and focus trap
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscapeRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      // Basic focus trap within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Initial focus ONLY once when modal opens (transition to open)
  useEffect(() => {
    if (!isModalOpen) return;

    const timer = setTimeout(() => {
      // If the user is already focused on an element inside the modal, do not steal focus!
      if (modalRef.current && modalRef.current.contains(document.activeElement)) {
        return;
      }

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      if (modalRef.current) {
        // Priority 1: Focus first editable form field inside modal body (not the header close button)
        const firstField = modalRef.current.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstField && typeof firstField.focus === 'function') {
          firstField.focus();
          return;
        }

        // Priority 2: Primary action or submit button in footer (excluding the header close button)
        const actionButton = modalRef.current.querySelector<HTMLElement>(
          'button:not([data-modal-close]):not([disabled])'
        );
        if (actionButton && typeof actionButton.focus === 'function') {
          actionButton.focus();
          return;
        }

        // Priority 3: Fallback to any focusable element
        const fallback = modalRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (fallback && typeof fallback.focus === 'function') {
          fallback.focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isModalOpen, initialFocusRef]);

  if (!isModalOpen) return null;

  const sizeClass = maxWidth || SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const titleText = typeof title === 'string' ? title : ariaLabel || 'Dialog';

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150`}
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-lg border border-[#DCE5EC] shadow-2xl w-full ${sizeClass} max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-md bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight truncate">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-[#475569] mt-0.5 leading-normal">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            {showCloseButton && (
              <button
                type="button"
                data-modal-close="true"
                onClick={() => onCloseRef.current()}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer"
                title="Tutup dialog (Esc)"
                aria-label="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* BODY (Scrollable) */}
        <div className={`flex-1 overflow-y-auto ${bodyClassName} text-xs text-[#0F172A]`}>
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const AppModal = BaseModal;
