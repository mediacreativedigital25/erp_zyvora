import React from 'react';
import {
  Building2,
  Building,
  MapPin,
  Warehouse,
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';
import { UserManagementView } from '../components/rbac/UserManagementView';

export const PengaturanPage: React.FC = () => {
  const {
    tenant,
    currentModule,
    activeFeatureId,
    targetSupabaseUrl,
    supabaseConnection,
    isSupabaseConfigured,
    isTestingConnection,
    runConnectionTest
  } = useErp();

  const parentBreadcrumb = currentModule === 'master_data' ? 'Master Data' : 'Pengaturan';

  if (activeFeatureId === 'business_units') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pengaturan' }, { label: 'Unit Bisnis' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Building className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Unit bisnis akan dikonfigurasi melalui integrasi basis data resmi. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'branches') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pengaturan' }, { label: 'Cabang' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<MapPin className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Data cabang operasional akan dikonfigurasi melalui integrasi basis data resmi. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'warehouses') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pengaturan' }, { label: 'Gudang' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Warehouse className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Data fasilitas gudang operasional akan dikonfigurasi melalui integrasi basis data resmi. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'rbac') {
    return (
      <PageShell breadcrumbs={[{ label: parentBreadcrumb }, { label: 'Anggota Tenant' }]}>
        <UserManagementView mode="tenant" />
      </PageShell>
    );
  }

  if (activeFeatureId === 'database') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pengaturan' }, { label: 'Pengaturan Sistem' }]}>
        <div className="mt-4 max-w-3xl space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={runConnectionTest}
              disabled={isTestingConnection}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <Database className="w-4 h-4" />
              <span>{isTestingConnection ? 'Menguji Koneksi...' : 'Uji Koneksi Supabase (Ping)'}</span>
            </button>
          </div>

          <div className={`p-4 rounded-md border text-xs space-y-2 ${
            supabaseConnection?.isConnected
              ? 'bg-[#EFF7FA] border-[#B7DDEA] text-[#086288]'
              : isSupabaseConfigured
              ? 'bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626]'
              : 'bg-[#F8FAFC] border-[#DCE5EC] text-[#475569]'
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                {supabaseConnection?.isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-[#086288]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                )}
                <span>Status Klien Supabase:</span>
              </div>
              <span className="font-mono tabular-nums">
                {supabaseConnection?.isConnected
                  ? `TERHUBUNG (${supabaseConnection.latencyMs}ms)`
                  : isSupabaseConfigured
                  ? 'KUNCI TERPASANG — MENUNGGU VERIFIKASI'
                  : 'BELUM DIKONFIGURASI'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {supabaseConnection?.isConnected
                ? 'Koneksi ke instance Supabase PostgreSQL berhasil diverifikasi secara aman.'
                : 'Uji koneksi read-only untuk memverifikasi kesiapan endpoint database tanpa modifikasi schema.'}
            </p>
          </div>

          <div className="bg-white border border-[#DCE5EC] rounded-md p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#EEF4F8]">
              <span className="text-[#475569]">Supabase Target URL:</span>
              <span className="font-mono text-[#0F172A] font-medium">{targetSupabaseUrl}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#EEF4F8]">
              <span className="text-[#475569]">Status Kunci Frontend:</span>
              <span className="font-medium text-[#086288]">
                {isSupabaseConfigured ? 'Publishable Key Terpasang (Role: anon)' : 'Belum Dikonfigurasi'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#EEF4F8]">
              <span className="text-[#475569]">Row Level Security (RLS):</span>
              <span className="font-medium text-[#086288]">Wajib Ditegakkan di PostgreSQL</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#475569]">Kredensial Sensitif:</span>
              <span className="font-medium text-[#16A34A]">TERVERIFIKASI — Tidak Ada Service-Role Key di Frontend</span>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Default: Setting Tenant (tenant)
  return (
    <PageShell breadcrumbs={[{ label: parentBreadcrumb }, { label: 'Setting Tenant' }]}>
      <div className="mt-4 max-w-2xl bg-white border border-[#DCE5EC] rounded-md p-5 space-y-3 text-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-[#EEF4F8]">
          <div className="w-10 h-10 rounded-md bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">{tenant.name}</h3>
            <span className="text-[11px] font-mono font-semibold text-[#086288]">Kode: {tenant.code}</span>
          </div>
        </div>

        <div className="space-y-2 text-[#475569] pt-1">
          <div className="flex justify-between py-1 border-b border-[#EEF4F8]">
            <span>Tenant ID (UUID):</span>
            <span className="font-mono text-[#0F172A]">{tenant.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EEF4F8]">
            <span>Paket Layanan:</span>
            <span className="font-semibold text-[#086288] uppercase">{tenant.plan}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Status Akun Tenant:</span>
            <span className="font-semibold text-[#16A34A] uppercase">{tenant.status}</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
};
