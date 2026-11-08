import React from 'react';
import { LayoutDashboard, CheckCircle2 } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';

export const DashboardPage: React.FC = () => {
  const { tenant, companyProfile } = useErp();

  const tenantDisplayName = companyProfile?.brandName || companyProfile?.legalName || tenant.name;

  return (
    <PageShell breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="mt-2">
        <div className="p-8 sm:p-12 bg-white border border-[#DCE5EC] rounded-xl shadow-2xs text-center flex flex-col items-center justify-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] flex items-center justify-center mb-4">
            <LayoutDashboard className="w-7 h-7" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight mb-2">
            Halaman Dashboard Siap Dikonfigurasi
          </h3>

          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed max-w-md mb-6">
            Tampilan dashboard saat ini berada dalam posisi bersih (clean state). Modul, widget analitik, dan metrik operasional akan ditampilkan sesuai instruksi Anda.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#DCE5EC] text-xs text-[#64748B]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Workspace aktif: <strong className="text-[#0F172A] font-semibold">{tenantDisplayName}</strong> ({tenant.code})</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
};
