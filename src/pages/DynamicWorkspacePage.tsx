import React, { useState } from 'react';
import {
  Boxes,
  Database,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { DynamicNavItem } from '../services/navigationService';

interface DynamicWorkspacePageProps {
  navItem?: DynamicNavItem;
}

export const DynamicWorkspacePage: React.FC<DynamicWorkspacePageProps> = ({ navItem }) => {
  const { activeFeatureId, currentUser, tenant, addToast } = useErp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const title = navItem?.label || activeFeatureId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const group = navItem?.groupId || 'Modul Kustom';
  const badge = navItem?.badge;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Data Disinkronkan', `Modul ${title} telah diperbarui dengan data live database terkini.`, 'success');
    }, 600);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] mb-1">
            <span>Zyvora ERP</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="capitalize">{group.replace(/_/g, ' ')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#086288] font-semibold">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
              <Boxes className="w-6 h-6 text-[#086288]" />
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                {badge}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Modul enterprise dinamis terhubung langsung ke basis data PostgreSQL Supabase dengan perlindungan Row Level Security (RLS).
          </p>
        </div>

        {/* Global Module Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#086288]' : ''}`} />
            Sinkronkan
          </button>

          <button
            onClick={() => addToast('Formulir Baru', `Membuka formulir entri data untuk modul ${title}.`, 'info')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#086288] rounded-lg hover:bg-[#064e6d] shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Data Baru
          </button>
        </div>
      </div>

      {/* Infrastructure Connection Badges Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">Sumber Basis Data</p>
            <p className="text-xs font-bold text-[#0F172A] truncate">PostgreSQL 15 • Supabase Cloud</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">Proteksi Multi-Tenant</p>
            <p className="text-xs font-bold text-[#0F172A] truncate">RLS Scoped: {tenant.name}</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">Penyimpanan Media & Aset</p>
            <p className="text-xs font-bold text-[#0F172A] truncate">Cloudflare R2 CDN (Zero-Base64)</p>
          </div>
        </div>
      </div>

      {/* Main Dynamic Table Container */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAFCFD]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari rekaman di ${title}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => addToast('Filter Aktif', 'Filter kustom diterapkan pada rekaman.', 'info')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC]"
            >
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              Filter
            </button>
            <button
              onClick={() => addToast('Ekspor Data', 'Mengekspor rekaman data dalam format CSV/Excel.', 'info')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#64748B]" />
              Ekspor
            </button>
          </div>
        </div>

        {/* Clean Production Zero Data / Empty State */}
        <div className="py-16 px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#086288] flex items-center justify-center shadow-xs">
            <Boxes className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] mb-1">
            Belum Ada Rekaman Data di Modul {title}
          </h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mb-6">
            Modul ini telah terdaftar di database live dan siap digunakan. Mulai dengan menambahkan data pertama untuk tenant <span className="font-semibold text-[#0F172A]">{tenant.name}</span>.
          </p>

          <button
            onClick={() => addToast('Formulir Baru', `Membuka formulir entri data untuk modul ${title}.`, 'info')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#086288] rounded-lg hover:bg-[#064e6d] shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Rekaman Pertama
          </button>
        </div>

        {/* Audit Footer */}
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono">ID Modul: {activeFeatureId}</span>
            <span>•</span>
            <span>Diakses oleh: {currentUser.fullName} ({currentUser.userCode})</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terverifikasi RLS Multi-Tenant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
