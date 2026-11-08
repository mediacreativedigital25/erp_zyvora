import React, { useEffect } from 'react';
import { X, BellOff } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationOpen, setIsNotificationOpen } = useErp();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!isNotificationOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isNotificationOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isNotificationOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationOpen, setIsNotificationOpen]);

  if (!isNotificationOpen) return null;

  // Real verified notifications array (currently empty, demo notifications purged per Phase 4B)
  const realNotifications: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'info' | 'warning' | 'success' | 'error';
  }> = [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsNotificationOpen(false);
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#DCE5EC] animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Panel Notifikasi"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DCE5EC] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Notifikasi
            </h2>
          </div>
          <button
            onClick={() => setIsNotificationOpen(false)}
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#EEF4F8] rounded-md transition-colors cursor-pointer"
            aria-label="Tutup panel notifikasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification List / Empty State */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
          {realNotifications.length === 0 ? (
            <div className="flex flex-col items-center max-w-xs">
              <div className="w-12 h-12 rounded-full bg-[#EEF4F8] border border-[#DCE5EC] flex items-center justify-center text-[#94A3B8] mb-3.5">
                <BellOff className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1">
                Tidak Ada Notifikasi
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Seluruh aktivitas dan notifikasi operasional telah dibersihkan dari konten demo. Pemberitahuan nyata akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="w-full divide-y divide-[#EEF4F8]">
              {/* Future real notifications will render here */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#475569]">
          <span className="text-[11px] text-[#94A3B8]">Sistem Notifikasi Terverifikasi</span>
          <button
            onClick={() => setIsNotificationOpen(false)}
            className="text-xs font-medium text-[#086288] hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
