import React from 'react';
import { Truck, PackageCheck, FileText, Building2 } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';

export const PembelianPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  if (activeFeatureId === 'grn') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pembelian' }, { label: 'Penerimaan Barang' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<PackageCheck className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada penerimaan barang yang tercatat. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'purchase_invoices') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pembelian' }, { label: 'Faktur Pembelian' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<FileText className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada faktur pembelian yang tercatat. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'vendors') {
    return (
      <PageShell breadcrumbs={[{ label: 'Pembelian' }, { label: 'Master Pemasok' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Building2 className="w-5 h-5 text-[#086288]" />}
            title="Belum Ada Data Pemasok"
            description="Belum ada data pemasok yang terdaftar. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Pesanan Pembelian (po)
  return (
    <PageShell breadcrumbs={[{ label: 'Pembelian' }, { label: 'Pesanan Pembelian' }]}>
      <div className="mt-4">
        <PageEmptyState
          icon={<Truck className="w-5 h-5 text-[#086288]" />}
          title="Workspace Siap"
          description="Belum ada transaksi pesanan pembelian yang dibuat. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
        />
      </div>
    </PageShell>
  );
};
