import React, { useState } from 'react';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Package,
  Sparkles,
  Gift,
  Building2,
  Calendar,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { UnifiedReceiveItem } from './SalesOrderReceiveView';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';

interface SalesOrderReceivePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnifiedReceiveItem[];
}

export const SalesOrderReceivePrintModal: React.FC<SalesOrderReceivePrintModalProps> = ({
  isOpen,
  onClose,
  items
}) => {
  const { companyProfile } = useErp();
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[Math.min(activePageIndex, items.length - 1)] || items[0];

  const handleBrowserPrint = () => {
    window.print();
  };

  // Helper to render a single A4 Receive Sheet
  const renderReceiveSheet = (item: UnifiedReceiveItem, pageNum: number, totalPages: number) => {
    return (
      <div
        key={item.id}
        className="receive-print-sheet w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-10 shadow-xl border border-slate-300 rounded-xs font-sans flex flex-col justify-between text-[#0F172A] mx-auto"
      >
        {/* TOP SECTION: KOP PERUSAHAAN & HEADER */}
        <div className="space-y-3.5">
          {/* 1. Kop Surat Resmi Perusahaan */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-3 border-b-2 border-[#086288]">
            {/* Left: Logo & Legal Identity from Settings */}
            <div className="space-y-1 max-w-sm">
              {companyProfile?.logoUrl ? (
                <img
                  src={companyProfile.logoUrl}
                  alt={companyProfile.brandName || 'Logo Perusahaan'}
                  className="h-11 max-w-[170px] object-contain mb-1"
                />
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-[#086288] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    ZY
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#086288] tracking-tight">
                      {companyProfile?.brandName || 'ZYVORA GLOBAL'}
                    </div>
                    <div className="text-[9.5px] text-[#64748B] uppercase tracking-wider font-semibold">
                      {companyProfile?.legalName || 'PT Zyvora Global Pratama'}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-[10.5px] text-[#475569] leading-snug">
                <p className="font-semibold text-[#0F172A]">
                  {companyProfile?.legalName || 'PT Zyvora Global Pratama'}
                </p>
                <p>
                  {companyProfile?.address || 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55'}
                  , {companyProfile?.regencyName || 'Jakarta Selatan'}{' '}
                  {companyProfile?.postalCode || '12190'}
                </p>
                <p className="text-[9.5px] text-[#64748B] pt-0.5">
                  Cabang: {item.branchName || item.branchCode || 'BR-01 - Jakarta Pusat (Kantor Pusat)'}
                  <br />
                  NPWP: <span className="font-mono">{companyProfile?.npwp || '01.345.678.9-012.000'}</span>
                  {' '}• Telp: {companyProfile?.phone || '+62 21 5289 0000'}
                </p>
              </div>
            </div>

            {/* Right: Document Identity & Meta */}
            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block px-2.5 py-0.5 bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded font-mono text-xs font-extrabold uppercase tracking-wider">
                BUKTI PENERIMAAN PESANAN (SALES ORDER RECEIVE)
              </div>
              <div className="text-base font-extrabold text-[#0F172A] font-mono pt-0.5">
                {item.receiveNumber || 'RSV-DRAFT'}
              </div>
              <div className="text-xs text-[#64748B]">
                No. Ref SO: <strong className="font-mono text-[#086288]">{item.orderNumber}</strong>
              </div>
              <div className="text-xs text-[#64748B]">
                Tanggal Receive: <strong className="font-mono text-[#0F172A]">{item.receiveDate || item.date}</strong>
              </div>
              <div className="text-xs text-[#64748B]">
                Tanggal Order: <span className="font-mono">{item.date}</span>
              </div>
              <div className="text-xs text-[#64748B]">
                Status:{' '}
                <span className="font-bold uppercase text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  {item.status}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Customer & Operational Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
            {/* Left: Customer Information */}
            <div className="space-y-0.5">
              <span className="font-bold text-[#475569] uppercase text-[10px] tracking-wider block border-b border-[#CBD5E1] pb-1">
                Data Pelanggan (Customer Details)
              </span>
              <div className="font-extrabold text-sm text-[#0F172A] pt-0.5">
                {item.customerName}
              </div>
              <div className="text-[#475569]">
                Kode Pelanggan:{' '}
                <span className="font-mono font-bold text-[#086288]">
                  {item.customerCode}
                </span>
              </div>
              <div className="text-[#475569]">
                Telepon: <span className="font-mono">{item.customerPhone || '-'}</span>
              </div>
              <div className="text-[#475569] truncate">
                Tujuan / Alamat: {item.destinationOrVenue}
              </div>
            </div>

            {/* Right: Operational & Logistic Specs */}
            <div className="space-y-0.5 sm:pl-3 sm:border-l sm:border-[#CBD5E1]">
              <span className="font-bold text-[#475569] uppercase text-[10px] tracking-wider block border-b border-[#CBD5E1] pb-1">
                Lokasi & Spesifikasi Operasional
              </span>
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <span className="text-[#64748B]">Cabang Operasional:</span>
                <span className="col-span-2 font-bold text-[#0F172A]">
                  {item.branchDisplay}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-[#64748B]">Gudang Penerima:</span>
                <span className="col-span-2 text-[#0F172A] font-semibold">
                  {item.warehouseDisplay}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-[#64748B]">Tipe Pesanan:</span>
                <span className="col-span-2 font-semibold text-[#086288]">
                  {item.orderType}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-[#64748B]">Target Pengiriman:</span>
                <span className="col-span-2 text-[#0F172A] font-mono">
                  {item.targetDate || item.date}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Table Line Items */}
          <div className="pt-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFF7FA] text-[#0F172A] border-y border-[#B7DDEA]">
                  <th className="py-2 px-2.5 text-center w-8">No</th>
                  <th className="py-2 px-2.5 w-28">SKU</th>
                  <th className="py-2 px-2.5">Deskripsi Barang / Layanan</th>
                  <th className="py-2 px-2.5 text-center w-20">Tipe</th>
                  <th className="py-2 px-2.5 text-center w-16">Qty</th>
                  <th className="py-2 px-2.5 text-center w-16">UOM</th>
                  <th className="py-2 px-2.5 text-right w-24">Harga</th>
                  <th className="py-2 px-2.5 text-right w-28">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {item.items.map((line, idx) => (
                  <tr key={line.id || idx} className="hover:bg-slate-50/60">
                    <td className="py-2 px-2.5 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-700 font-semibold">
                      {line.sku || '-'}
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-[#0F172A]">{line.name}</div>
                      {line.isBonus && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5">
                          <Gift className="w-2.5 h-2.5" /> Item Bonus / Promosi
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {line.isBonus ? 'Bonus' : line.businessLineId === 'GOODS' ? 'Stock' : 'Service'}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-[#0F172A]">
                      {line.quantity}
                    </td>
                    <td className="py-2 px-2.5 text-center text-slate-600">
                      {line.uom}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                      {line.isBonus ? 'Rp 0' : `Rp ${line.unitPrice.toLocaleString('id-ID')}`}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-semibold text-[#0F172A]">
                      {line.isBonus ? 'Rp 0' : `Rp ${line.total.toLocaleString('id-ID')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Financial Summary & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Left: Notes & Operational Remarks */}
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs space-y-1">
              <span className="font-bold text-[#0F172A] block uppercase text-[10px] tracking-wider">
                Catatan Penerimaan / Validasi Operasional
              </span>
              <p className="text-[#475569] leading-relaxed text-[11px]">
                {item.rawGoodsOrder?.notes ||
                  item.rawServiceBooking?.notes ||
                  'Pesanan telah diverifikasi secara fisik/operasional (Gate 1 Passed). Siap untuk proses Sales Order Picking (Gate 2).'}
              </p>
            </div>

            {/* Right: Subtotal, Discount, Tax, Grand Total */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Subtotal Nilai Barang/Jasa:</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  Rp {item.subtotal.toLocaleString('id-ID')}
                </span>
              </div>
              {item.discountTotal > 0 && (
                <div className="flex justify-between py-0.5 text-rose-600">
                  <span>Potongan Diskon:</span>
                  <span className="font-mono font-semibold">
                    - Rp {item.discountTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              {item.taxAmount > 0 && (
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Pajak PPN (11%):</span>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    Rp {item.taxAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t-2 border-[#086288] text-sm font-extrabold text-[#086288]">
                <span>Total Netto Pesanan:</span>
                <span className="font-mono">
                  Rp {item.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: TANDA TANGAN OTORISASI */}
        <div className="pt-6">
          <div className="grid grid-cols-3 gap-6 text-center text-xs border-t border-slate-300 pt-3">
            <div className="space-y-12">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Diterima Oleh (Gudang)
              </span>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <span className="text-[11px] font-semibold text-slate-700">
                  Bagian Operasional / Gudang
                </span>
              </div>
            </div>

            <div className="space-y-12">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Diverifikasi Oleh
              </span>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <span className="text-[11px] font-semibold text-slate-700">
                  Admin Penjualan & Billing
                </span>
              </div>
            </div>

            <div className="space-y-12">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Mengetahui
              </span>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <span className="text-[11px] font-semibold text-slate-700">
                  Kepala Operasional / Branch Mgr
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 text-[9px] text-slate-400 border-t border-slate-100 mt-2">
            <span>Zyvora ERP — Dokumen Resmi Validasi Gate 1 (Sales Order Receive)</span>
            <span>
              Halaman {pageNum} dari {totalPages} · Dicetak pada {new Date().toLocaleDateString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pratinjau Dokumen Cetak (${items.length} Halaman Terpilih)`}
      description="Format bukti penerimaan pesanan resmi siap cetak dan ekspor PDF. Setiap dokumen dicetak pada lembar A4 masing-masing."
      size="xl"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#64748B]">
            Format Kertas A4 Portrait (210mm x 297mm) · {items.length} Dokumen Terpilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Dokumen ({items.length} Halaman / PDF)
            </button>
          </div>
        </div>
      }
    >
      {/* Print Stylesheet for Multi-Page Pure A4 Output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receive-sheets, #printable-receive-sheets * {
            visibility: visible;
          }
          #printable-receive-sheets {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .receive-print-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background-color: white !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm;
          }
        }
      `}</style>

      {/* Screen Multi-Page Navigator (if multiple items selected) */}
      {items.length > 1 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Pratinjau Halaman:</span>
            <span className="px-2.5 py-0.5 bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded text-xs font-bold font-mono">
              {activePageIndex + 1} / {items.length}
            </span>
            <span className="text-xs text-slate-600 font-medium">
              — {currentItem.receiveNumber} ({currentItem.customerName})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activePageIndex <= 0}
              onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <button
              type="button"
              disabled={activePageIndex >= items.length - 1}
              onClick={() => setActivePageIndex((p) => Math.min(items.length - 1, p + 1))}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Screen Interactive Single-Page Preview */}
      <div className="bg-slate-200/80 p-2 sm:p-6 rounded-xl overflow-y-auto max-h-[72vh] flex justify-center print:hidden">
        {renderReceiveSheet(currentItem, activePageIndex + 1, items.length)}
      </div>

      {/* Print Engine Hidden Container (Renders ALL pages for print dialog / PDF) */}
      <div id="printable-receive-sheets" className="hidden print:block">
        {items.map((it, idx) => renderReceiveSheet(it, idx + 1, items.length))}
      </div>
    </BaseModal>
  );
};
