import React from 'react';
import { useErp } from '../../context/ErpContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { LoginPage } from './LoginPage';
import { UnassignedAccessScreen } from './UnassignedAccessScreen';
import { AppLayout } from '../layout/AppLayout';
import { AlertTriangle, LogOut } from 'lucide-react';

export const AuthGuard: React.FC = () => {
  const { authStatus, isDevSandboxMode, logout } = useErp();

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'unauthenticated') {
    return <LoginPage />;
  }

  if (authStatus === 'unassigned') {
    return <UnassignedAccessScreen />;
  }

  if (authStatus === 'authenticated') {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Isolated Developer Sandbox Notice Banner (Only shown if dev simulation was explicitly clicked) */}
        {isDevSandboxMode && (
          <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-1.5 text-xs text-[#92400E] flex items-center justify-between z-50">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>
                <strong>MODE SIMULASI DEV / SANDBOX AKTIF:</strong> Sesi ini menggunakan identitas simulasi lokal untuk pengujian pra-migrasi. Tidak aktif di produksi.
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-[11px] font-bold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer ml-3 shrink-0"
            >
              <LogOut className="w-3 h-3" />
              <span>Akhiri Simulasi</span>
            </button>
          </div>
        )}

        {/* Protected Workspace Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          <AppLayout />
        </div>
      </div>
    );
  }

  // Fallback to LoginPage
  return <LoginPage />;
};
