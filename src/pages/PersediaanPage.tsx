import React from 'react';
import {
  Boxes,
  Warehouse,
  ArrowLeftRight,
  SlidersHorizontal,
  ClipboardCheck,
  Truck,
  FileText
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';
import { ProductsServicesView } from '../components/master/ProductsServicesView';
import { CategoriesUomView } from '../components/master/CategoriesUomView';
import { WarehousesLocationsView } from '../components/master/WarehousesLocationsView';

export const PersediaanPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  // 1. Warehouses & Facilities
  if (activeFeatureId === 'inv_warehouse') {
    return (
      <PageShell breadcrumbs={[{ label: 'Inventory' }, { label: 'Warehouses & Facilities' }]}>
        <WarehousesLocationsView />
      </PageShell>
    );
  }

  // 2. Categories & Units of Measure (UoM)
  if (activeFeatureId === 'inv_category') {
    return (
      <PageShell breadcrumbs={[{ label: 'Inventory' }, { label: 'Categories & UoM' }]}>
        <CategoriesUomView />
      </PageShell>
    );
  }

  // 3. Stock Overview / Saldo Stok
  if (activeFeatureId === 'inv_stock_overview' || activeFeatureId === 'warehouse_stock') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Stock Overview' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Warehouse className="w-5 h-5 text-[#086288]" />}
            title="Workspace Stock Overview Siap"
            description="Monitoring saldo stok fisik per gudang akan terhubung langsung ke mutasi persediaan."
          />
        </div>
      </PageShell>
    );
  }

  // 4. Stock Movement / Mutasi Stok
  if (activeFeatureId === 'inv_stock_movement' || activeFeatureId === 'movements') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Stock Movement' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<ArrowLeftRight className="w-5 h-5 text-[#086288]" />}
            title="Workspace Mutasi Stok Siap"
            description="Belum ada riwayat mutasi stok yang tercatat dalam periode ini."
          />
        </div>
      </PageShell>
    );
  }

  // 5. Stock Adjustment / Penyesuaian Stok
  if (activeFeatureId === 'inv_stock_adjustment' || activeFeatureId === 'adjustments') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Stock Adjustment' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<SlidersHorizontal className="w-5 h-5 text-[#086288]" />}
            title="Workspace Stock Adjustment Siap"
            description="Belum ada penyesuaian kuantitas atau nilai persediaan yang dicatat."
          />
        </div>
      </PageShell>
    );
  }

  // 6. Stock Opname
  if (activeFeatureId === 'inv_stock_opname') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Stock Opname' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<ClipboardCheck className="w-5 h-5 text-[#086288]" />}
            title="Workspace Stock Opname Siap"
            description="Tidak ada sesi stock opname aktif saat ini. Anda dapat memulai penghitungan fisik baru kapan saja."
          />
        </div>
      </PageShell>
    );
  }

  // 7. Stock Transfer
  if (activeFeatureId === 'inv_stock_transfer') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Stock Transfer' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Truck className="w-5 h-5 text-[#086288]" />}
            title="Workspace Stock Transfer Siap"
            description="Belum ada transaksi pemindahan barang antargudang yang aktif."
          />
        </div>
      </PageShell>
    );
  }

  // 8. Laporan Persediaan
  if (activeFeatureId === 'inv_report') {
    return (
      <PageShell breadcrumbs={[{ label: 'Persediaan' }, { label: 'Laporan Persediaan' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<FileText className="w-5 h-5 text-[#086288]" />}
            title="Laporan Persediaan Siap"
            description="Laporan analitik persediaan akan tersaji otomatis berdasarkan transaksi operasional."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Products & Services Catalog (inv_list_product or products)
  return (
    <PageShell breadcrumbs={[{ label: 'Inventory' }, { label: 'Products & Services' }]}>
      <ProductsServicesView defaultTab="physical" />
    </PageShell>
  );
};
