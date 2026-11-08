import React, { useState } from 'react';
import { ShieldAlert, LogOut, RefreshCw, Mail } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export const UnassignedAccessScreen: React.FC = () => {
  const { authError, logout, checkAuthSession } = useErp();
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      await checkAuthSession();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 antialiased select-none">
      <div className="w-full max-w-md bg-white border border-[#DCE5EC] rounded-xl shadow-md p-6 sm:p-8 text-center space-y-5">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto border border-[#FDE68A]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
            Akses Tenant Belum Ditetapkan
          </h2>
          <p className="text-xs text-[#475569] mt-2 leading-relaxed">
            Identitas akun Anda telah berhasil terotentikasi ke sistem. Namun, akun ini <strong>belum memiliki penugasan Unit Bisnis aktif atau Role kerja</strong> pada sistem Zyvora ERP.
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md text-left text-xs text-[#DC2626]">
            {authError}
          </div>
        )}

        {/* Guidance Box */}
        <div className="p-4 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg text-left text-xs text-[#086288] space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="w-4 h-4 text-[#086288]" />
            <span>Instruksi Penugasan Hak Akses:</span>
          </div>
          <p className="leading-relaxed text-[11px] text-[#064B6A]">
            Silakan hubungi <strong>Platform Super Admin</strong> atau Administrator Tenant perusahaan Anda untuk menambahkan akun Anda ke dalam unit bisnis dan menetapkan Role resmi (Owner, Admin, Sales, atau Customer).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isChecking}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-[#086288] bg-[#EEF4F8] hover:bg-[#DCEEF5] border border-[#B7DDEA] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa...' : 'Periksa Akses Ulang'}</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-[#DC2626] bg-white hover:bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
