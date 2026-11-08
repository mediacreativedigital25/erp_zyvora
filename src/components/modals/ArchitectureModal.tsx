import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  Calendar,
  Lock,
  GitBranch
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';

export const ArchitectureModal: React.FC = () => {
  const { isArchitectureModalOpen, setIsArchitectureModalOpen } = useErp();
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'schema' | 'rls' | 'roadmap'>('hierarchy');

  return (
    <BaseModal
      isOpen={isArchitectureModalOpen}
      onClose={() => setIsArchitectureModalOpen(false)}
      title="Zyvora 1.0.0 Master Plan — Arsitektur & Fondasi Sistem"
      description="Hierarki Multi-Tenant, Enterprise Security Isolation, Business Invariants & Roadmap"
      icon={<Database className="w-4 h-4 text-[#086288]" />}
      size="xl"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#475569]">
            Dokumen Arsitektur Master Plan Zyvora ERP 1.0.0
          </span>
          <button
            onClick={() => setIsArchitectureModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer"
          >
            Tutup Blueprint
          </button>
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="px-6 border-b border-[#DCE5EC] flex gap-4 text-xs font-medium shrink-0 bg-white sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'border-[#086288] text-[#086288] font-semibold'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Hierarki Multi-Tenant
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'border-[#086288] text-[#086288] font-semibold'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Skema Relasional Pusat
          </button>
          <button
            onClick={() => setActiveTab('rls')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'rls'
                ? 'border-[#086288] text-[#086288] font-semibold'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Keamanan & RLS Server
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'roadmap'
                ? 'border-[#086288] text-[#086288] font-semibold'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Roadmap & Status Fase
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm custom-scrollbar">
          {activeTab === 'hierarchy' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg">
                <h3 className="text-sm font-semibold text-[#086288] mb-1">
                  Hierarki Entitas Terdistribusi
                </h3>
                <p className="text-xs text-[#475569]">
                  Zyvora menerapkan pemisahan data 5 level terisolasi secara kriptografis dan terindeks di basis data:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg text-center">
                  <div className="text-[10px] font-mono text-[#94A3B8]">LEVEL 1</div>
                  <div className="font-bold text-xs text-[#0F172A] mt-1">Platform</div>
                  <div className="text-[11px] text-[#475569] mt-1">Ekosistem Zyvora Cloud Host</div>
                </div>
                <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg text-center">
                  <div className="text-[10px] font-mono text-[#94A3B8]">LEVEL 2</div>
                  <div className="font-bold text-xs text-[#0F172A] mt-1">Tenant (Org)</div>
                  <div className="text-[11px] text-[#475569] mt-1">Perusahaan Induk / Holding</div>
                </div>
                <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg text-center">
                  <div className="text-[10px] font-mono text-[#94A3B8]">LEVEL 3</div>
                  <div className="font-bold text-xs text-[#0F172A] mt-1">Business Unit</div>
                  <div className="text-[11px] text-[#475569] mt-1">PT / Anak Perusahaan</div>
                </div>
                <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg text-center">
                  <div className="text-[10px] font-mono text-[#94A3B8]">LEVEL 4</div>
                  <div className="font-bold text-xs text-[#0F172A] mt-1">Branch</div>
                  <div className="text-[11px] text-[#475569] mt-1">Kantor Cabang Regional</div>
                </div>
                <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg text-center">
                  <div className="text-[10px] font-mono text-[#94A3B8]">LEVEL 5</div>
                  <div className="font-bold text-xs text-[#0F172A] mt-1">Warehouse</div>
                  <div className="text-[11px] text-[#475569] mt-1">Gudang & Lokasi Stok</div>
                </div>
              </div>

              <div className="border border-[#DCE5EC] rounded-lg p-4 bg-white space-y-2">
                <h4 className="font-semibold text-xs text-[#0F172A]">Prinsip Isolasi Data</h4>
                <ul className="list-disc list-inside text-xs text-[#475569] space-y-1.5 leading-relaxed">
                  <li><strong>Zero Cross-Tenant Leakage:</strong> Validasi ketat isolasi akses data antar-perusahaan menggunakan enkripsi token terverifikasi server.</li>
                  <li><strong>Granular Branch Access:</strong> Staf cabang hanya memiliki izin melihat data stok dan order cabang setempat, kecuali peran Kantor Pusat/Tenant Admin.</li>
                  <li><strong>Immutable Customer Code:</strong> Kode pelanggan 5 karakter alfanumerik uppercase berlaku unik di seluruh tenant.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg">
                <span className="text-xs font-semibold text-[#0F172A]">Relasi Tabel Utama Master Plan:</span>
                <p className="text-xs text-[#475569] mt-0.5">
                  Dirancang untuk arsitektur database relasional berkinerja tinggi:
                </p>
              </div>

              <div className="bg-[#0F172A] text-[#F8FAFC] p-4 rounded-lg font-mono text-xs overflow-x-auto space-y-2">
                <p className="text-[#94A3B8]">-- 1. Inti Multi-Tenant & RBAC</p>
                <p>CREATE TABLE tenants (id UUID PRIMARY KEY, name TEXT, code TEXT UNIQUE, plan TEXT, status TEXT);</p>
                <p>CREATE TABLE business_units (id UUID PRIMARY KEY, tenant_id UUID REFERENCES tenants(id), code TEXT, name TEXT);</p>
                <p>CREATE TABLE branches (id UUID PRIMARY KEY, business_unit_id UUID REFERENCES business_units(id), code TEXT, name TEXT);</p>
                <p>CREATE TABLE warehouses (id UUID PRIMARY KEY, branch_id UUID REFERENCES branches(id), code TEXT, name TEXT);</p>
                <p>CREATE TABLE tenant_memberships (id UUID PRIMARY KEY, user_id UUID, tenant_id UUID, role TEXT);</p>
                <br />
                <p className="text-[#94A3B8]">-- 2. Transaksi Terintegrasi & Jejak Audit</p>
                <p>CREATE TABLE customers (id UUID PRIMARY KEY, tenant_id UUID, customer_code CHAR(5) UNIQUE, name TEXT);</p>
                <p>CREATE TABLE sales_orders (id UUID PRIMARY KEY, tenant_id UUID, branch_id UUID, order_number TEXT UNIQUE, total_amount NUMERIC);</p>
                <p>CREATE TABLE stock_movements (id UUID PRIMARY KEY, tenant_id UUID, movement_number TEXT UNIQUE, qty NUMERIC);</p>
                <p>CREATE TABLE audit_logs (id UUID PRIMARY KEY, tenant_id UUID, actor_name TEXT, action TEXT, entity TEXT);</p>
              </div>
            </div>
          )}

          {activeTab === 'rls' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] text-xs">
                <Lock className="w-4 h-4 shrink-0 text-[#D97706]" />
                <span>
                  <strong>Tenant isolation ditegakkan di database:</strong> Jangan pernah mempercayai tenant_id yang dikirim bebas dari client tanpa verifikasi membership di server!
                </span>
              </div>

              <div className="border border-[#DCE5EC] rounded-lg p-4 bg-white space-y-3">
                <h4 className="font-semibold text-xs text-[#0F172A]">Kebijakan Isolasi Keamanan Tingkat Baris (Row-Level Security)</h4>
                <div className="bg-[#0F172A] text-[#86EFAC] p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                  <p className="text-[#94A3B8]">ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;</p>
                  <p>CREATE POLICY &quot;tenant_isolation_sales_orders&quot; ON sales_orders</p>
                  <p>&nbsp;&nbsp;FOR ALL USING (</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;tenant_id IN (</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SELECT tenant_id FROM tenant_memberships</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WHERE user_id = auth.uid()</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;)</p>
                  <p>&nbsp;&nbsp;);</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="space-y-3">
              <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-[#086288]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>FASE A & B — SELESAI (Fondasi, Accordion Sidebar & Global Color System)</span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Penerapan global color tokens (#086288 primary, #F8FAFC neutral), 9 modul utama dengan 36 submenu accordion terstruktur, &ldquo;Satu Fitur = Satu Workspace&rdquo;, informative technical placeholders untuk fitur fase 2, dan sinkronisasi route instan.
                </p>
              </div>

              <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7]">
                  <GitBranch className="w-4 h-4" />
                  <span>FASE C & D — DALAM PENGEMBANGAN (Sinkronisasi Data Real-Time)</span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Evaluasi skema pusat tanpa migrasi destruktif. Validasi token akses berbasis arsitektur ERP.
                </p>
              </div>

              <div className="p-3 bg-white border border-[#DCE5EC] rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-[#475569]">
                  <Calendar className="w-4 h-4" />
                  <span>FASE E — BACKLOG MENDATANG (Modul Transaksi & Berkas Lampiran Cloud)</span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Penyimpanan dokumen faktur PDF & lampiran barang terdistribusi cepat, double-entry auto ledger posting, dan approval engine bertingkat.
                </p>
              </div>
            </div>
          )}
        </div>

    </BaseModal>
  );
};
