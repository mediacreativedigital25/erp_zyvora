import React from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 select-none">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#086288] text-white flex items-center justify-center shadow-md mb-5">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A] mb-1">
          ZYVORA ERP 1.0.0
        </h1>
        <p className="text-xs text-[#475569] mb-6">
          Memverifikasi status sesi dan otentikasi pengguna...
        </p>

        {/* Spinner */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-full border border-[#DCE5EC] shadow-2xs text-xs text-[#086288] font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-[#086288]" />
          <span>Memeriksa kredensial sesi...</span>
        </div>
      </div>
    </div>
  );
};
