import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  User,
  LogOut,
  RefreshCw,
  Menu
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { getSupabaseClient } from '../../services/supabaseClient';

export const Topbar: React.FC = () => {
  const {
    currentUser,
    logout,
    isDevSandboxMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsNotificationOpen,
    setIsMobileSidebarOpen,
    addToast
  } = useErp();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Logout using useErp official handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsProfileDropdownOpen(false);
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(false);
    addToast(
      'Halaman Profil',
      'Rute halaman profil pengguna belum ditetapkan oleh Product Owner (tercatat di dokumentasi fondasi).',
      'info'
    );
  };

  // User initials for clean avatar fallback
  const initials = currentUser.fullName
    ? currentUser.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // Auto-close mobile drawer when window resizes to desktop breakpoint (>= 1024px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsMobileSidebarOpen(false);
      }
    };
    if (mediaQuery.matches) {
      setIsMobileSidebarOpen(false);
    }
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [setIsMobileSidebarOpen]);

  const handleToggleSidebar = () => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setIsSidebarCollapsed((prev: boolean) => !prev);
      setIsMobileSidebarOpen(false);
    } else {
      setIsMobileSidebarOpen((prev: boolean) => !prev);
    }
  };

  return (
    <header className="w-full h-14 bg-white border-b border-[#DCE5EC] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 select-none shadow-2xs">
      {/* 1. SISI KIRI: Tombol Toggle Sidebar (Ikon Garis 3 / Menu) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="w-9 h-9 flex items-center justify-center text-[#475569] hover:text-[#086288] hover:bg-[#EEF4F8] rounded-md border border-[#DCE5EC] transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
          title={isSidebarCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
          aria-label={isSidebarCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        >
          <Menu className="w-5 h-5 text-[#086288]" />
        </button>
      </div>

      {/* 2 & 3. SISI KANAN: Notifikasi & Avatar Pengguna */}
      <div className="flex items-center gap-2">
        {/* 2. Ikon Lonceng Notifikasi (36-40px area, #086288 hover, opens drawer) */}
        <button
          onClick={() => setIsNotificationOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-[#475569] hover:text-[#086288] hover:bg-[#EEF4F8] rounded-md transition-colors cursor-pointer relative"
          title="Notifikasi Operasional"
          aria-label="Buka Notifikasi"
        >
          <Bell className="w-4.5 h-4.5" />
          {/* Badge hanya ditampilkan jika data notifikasi nyata terverifikasi (Phase 4B) */}
        </button>

        {/* 3. Ikon / Avatar Pengguna & Dropdown (Hanya Profil & Logout) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-[#086288] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs hover:bg-[#064B6A] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#086288] focus:ring-offset-1"
            title={currentUser.fullName}
            aria-label="Menu Pengguna"
            aria-expanded={isProfileDropdownOpen}
          >
            {initials}
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-[#DCE5EC] shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 border-b border-[#EEF4F8]">
                <div className="font-semibold text-xs text-[#0F172A] truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-[#64748B] truncate">
                  {currentUser.email || 'Akun Pengguna'}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EEF4F8] text-[#086288] border border-[#DCE5EC]">
                    {currentUser.roleTitle || currentUser.role}
                  </span>
                  {isDevSandboxMode && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                      Sandbox
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProfileClick}
                className="w-full px-3.5 py-2 text-left text-xs text-[#0F172A] hover:bg-[#EEF4F8] hover:text-[#086288] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#475569]" />
                <span className="font-medium">Profil</span>
              </button>

              <div className="my-1 border-t border-[#EEF4F8]" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-3.5 py-2 text-left text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                )}
                <span className="font-medium">{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
