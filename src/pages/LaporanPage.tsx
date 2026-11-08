import React from 'react';
import { ShoppingBag, Truck, Boxes, DollarSign, Users, BarChart3 } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';
import { CostRatioReportView } from '../components/reporting/CostRatioReportView';

export const LaporanPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  // Route Cost Ratio Analytics (Pure Diagram-First Reporting)
  if (
    activeFeatureId === 'reporting_cost_ratio' ||
    activeFeatureId === 'reporting' ||
    activeFeatureId.startsWith('reporting_')
  ) {
    return (
      <PageShell breadcrumbs={[{ label: 'Reporting' }, { label: 'Cost Ratio' }]}>
        <CostRatioReportView />
      </PageShell>
    );
  }

  if (activeFeatureId === 'purchasing_report') {
    return (
      <PageShell breadcrumbs={[{ label: 'Laporan' }, { label: 'Laporan Pembelian' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Truck className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada data laporan pembelian untuk direkapitulasi. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'inventory_report') {
    return (
      <PageShell breadcrumbs={[{ label: 'Laporan' }, { label: 'Laporan Persediaan' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Boxes className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada data mutasi persediaan fisik untuk dianalisis. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'financial_report') {
    return (
      <PageShell breadcrumbs={[{ label: 'Laporan' }, { label: 'Laporan Keuangan' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<DollarSign className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Laporan keuangan akan dikompilasi setelah transaksi jurnal buku besar diposting."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'hr_report') {
    return (
      <PageShell breadcrumbs={[{ label: 'Laporan' }, { label: 'Laporan SDM' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Users className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada aktivitas audit trail tercatat. Seluruh log contoh telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Laporan Penjualan (sales_report)
  return (
    <PageShell breadcrumbs={[{ label: 'Laporan' }, { label: 'Laporan Penjualan' }]}>
      <div className="mt-4">
        <PageEmptyState
          icon={<ShoppingBag className="w-5 h-5 text-[#086288]" />}
          title="Workspace Siap"
          description="Belum ada data penjualan tercatat. Seluruh konten demo telah dibersihkan sesuai instruksi Product Owner."
        />
      </div>
    </PageShell>
  );
};
