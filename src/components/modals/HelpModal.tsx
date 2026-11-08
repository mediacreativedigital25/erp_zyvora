import React from 'react';
import { BookOpen, KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';

export const HelpModal: React.FC = () => {
  const { isHelpOpen, setIsHelpOpen, setIsArchitectureModalOpen } = useErp();

  return (
    <BaseModal
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
      title="Panduan Operasional & Aturan Bisnis Zyvora ERP"
      description="Pedoman Master Plan v1.0.0 untuk Pengelolaan Transaksi & Multi-Tenant"
      icon={<BookOpen className="w-4 h-4 text-[#086288]" />}
      size="lg"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              setIsHelpOpen(false);
              setIsArchitectureModalOpen(true);
            }}
            className="text-xs font-semibold text-[#086288] hover:text-[#064B6A] hover:underline cursor-pointer"
          >
            Buka Skema Database & RLS Master Plan →
          </button>
          <button
            type="button"
            onClick={() => setIsHelpOpen(false)}
            className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs sm:text-sm text-[#475569]">
        {/* Rule 1 */}
        <div className="border border-[#DCE5EC] rounded-lg p-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-[#086288] font-bold text-xs uppercase tracking-wider mb-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Aturan 1: Kode Pelanggan (Customer Code)</span>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            Customer Code harus <strong>tepat 5 karakter alfanumerik uppercase</strong> (contoh: <code className="bg-white border border-[#DCE5EC] px-1 rounded font-mono text-[#086288]">K9X2B</code>, <code className="bg-white border border-[#DCE5EC] px-1 rounded font-mono text-[#086288]">W4M1T</code>), unik dalam tenant, otomatis dibuat oleh sistem, dan bersifat <em>immutable</em> (tidak dapat diubah setelah dibuat). Kode ini adalah pengenal entitas dan bukan status keanggotaan.
          </p>
        </div>

        {/* Rule 2 */}
        <div className="border border-[#DCE5EC] rounded-lg p-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-[#086288] font-bold text-xs uppercase tracking-wider mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Aturan 2: Penomoran Dokumen Transaksi</span>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            Seluruh transaksi operasional wajib mengikuti format baku:
            <br />
            <code className="text-[#086288] font-semibold font-mono">[PREFIX]-[YYYYMM]-[6 DIGIT SEQUENCE]</code>
            <br />
            Contoh: <code className="text-[#086288] font-mono">SO-202610-000104</code> (Sales Order), <code className="text-[#086288] font-mono">PO-202610-000041</code> (Purchase Order), <code className="text-[#086288] font-mono">MUT-202610-000088</code> (Stock Movement), <code className="text-[#086288] font-mono">JV-202610-000215</code> (Journal Voucher).
          </p>
        </div>

        {/* Rule 3 */}
        <div className="border border-[#DCE5EC] rounded-lg p-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-[#086288] font-bold text-xs uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Aturan 3: Multi-Tenancy & Isolasi Keamanan Data</span>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            Setiap akses data divalidasi oleh sistem isolasi keamanan multi-tenant tingkat enterprise. Pengguna hanya dapat mengakses cabang dan gudang yang terdaftar dalam izin kerja masing-masing.
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="border border-[#DCE5EC] rounded-lg p-4 bg-[#F8FAFC]">
          <h4 className="font-semibold text-xs text-[#0F172A] mb-2">Pintasan Keyboard ERP</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-white border border-[#DCE5EC] rounded">
              <span>Pencarian Global</span>
              <kbd className="px-1.5 py-0.5 bg-[#EEF4F8] border border-[#DCE5EC] rounded font-mono text-[10px] text-[#086288]">⌘K / Ctrl+K</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white border border-[#DCE5EC] rounded">
              <span>Tutup Dialog / Modal</span>
              <kbd className="px-1.5 py-0.5 bg-[#EEF4F8] border border-[#DCE5EC] rounded font-mono text-[10px] text-[#086288]">ESC</kbd>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
