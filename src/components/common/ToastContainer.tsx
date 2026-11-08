import React from 'react';
import { useErp, ToastMessage } from '../../context/ErpContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useErp();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#086288] shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border border-[#DCE5EC] rounded-lg shadow-lg p-3.5 flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 duration-150"
        >
          {getIcon(toast.type)}
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-[#0F172A]">{toast.title}</h4>
            <p className="text-xs text-[#475569] mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
