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
  CheckCircle2,
  Truck
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';
import { SalesOrder, ServiceBookingOrder } from '../../types/erp';

export interface UnifiedPickingItem {
  id: string;
  sourceType: 'goods' | 'service';
  orderType: string;
  orderNumber: string;
  receiveNumber?: string;
  deliveryOrderNumber?: string;
  pickingDate?: string;
  customerId?: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  branchId?: string;
  branchCode: string;
  branchName?: string;
  warehouseId?: string;
  warehouseName?: string;
  date: string;
  targetDate?: string;
  destinationOrVenue: string;
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  rawGoodsOrder?: SalesOrder;
  rawServiceBooking?: ServiceBookingOrder;
  items: Array<{
    id: string;
    sku?: string;
    name: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount?: number;
    total: number;
    businessLineId?: string;
    isBonus?: boolean;
    batchNumber?: string;
    expiredDate?: string;
  }>;
}

interface SalesOrderPickingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnifiedPickingItem[];
}

export const SalesOrderPickingPrintModal: React.FC<SalesOrderPickingPrintModalProps> = ({
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

  // Helper to render a single A4 Delivery Order Sheet
  const renderDeliveryOrderSheet = (item: UnifiedPickingItem, pageNum: number, totalPages: number) => {
    const doNum = item.deliveryOrderNumber || `DO${item.branchCode || '01'}20261100001`;
    const pickDate = item.pickingDate || new Date().toISOString().slice(0, 10);

    return (
      <div
        key={item.id}
        className="do-print-sheet w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-10 shadow-xl border border-slate-300 rounded-xs font-sans flex flex-col justify-between text-[#0F172A] mx-auto"
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
                SURAT JALAN & PENGIRIMAN (DELIVERY ORDER)
              </div>
              <div className="text-base font-extrabold text-[#0F172A] font-mono pt-0.5">
                {doNum}
              </div>
              <div className="text-[10px] text-[#64748B] font-mono space-y-0.5">
                <div>Ref. Reserve: <span className="font-semibold text-[#086288]">{item.receiveNumber || 'RSV-N/A'}</span></div>
                <div>Ref. SO: <span className="font-semibold text-[#0F172A]">{item.orderNumber}</span></div>
                <div>Status: <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">VERIFIED & PICKED</span></div>
              </div>
            </div>
          </div>

          {/* 2. Informasi Metadata 2 Kolom (Customer & Delivery) */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            {/* Kolom Kiri: Tujuan Pengiriman & Pelanggan */}
            <div className="space-y-1 border-r border-[#E2E8F0] pr-3">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Tujuan Pengiriman / Penerima
              </div>
              <div className="font-bold text-[#0F172A] text-sm flex items-center gap-1.5">
                <span>{item.customerName}</span>
                <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                  {item.customerCode}
                </span>
              </div>
              <div className="text-[11px] text-[#475569] leading-relaxed pt-0.5">
                <span className="font-medium text-[#0F172A]">Alamat / Lokasi:</span>{' '}
                {item.destinationOrVenue || item.customerAddress || 'Alamat Penerima Sesuai Sales Order'}
              </div>
              {item.customerPhone && (
                <div className="text-[11px] text-[#475569]">
                  <span className="font-medium text-[#0F172A]">Kontak / HP:</span> {item.customerPhone}
                </div>
              )}
            </div>

            {/* Kolom Kanan: Pengirim, Tanggal & Logistik */}
            <div className="space-y-1 pl-1">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Rincian Logistik & Operasional
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <span className="text-[#64748B]">Tanggal Picking:</span>
                <span className="col-span-2 font-mono font-bold text-[#0F172A]">{pickDate}</span>

                <span className="text-[#64748B]">Jadwal Kirim / Event:</span>
                <span className="col-span-2 font-mono font-medium text-[#0F172A]">
                  {item.targetDate || item.date}
                </span>

                <span className="text-[#64748B]">Gudang / Asal:</span>
                <span className="col-span-2 text-[#0F172A] font-medium">
                  {item.warehouseName || 'Gudang Utama Cakung'} ({item.branchCode})
                </span>

                <span className="text-[#64748B]">Tipe Pesanan:</span>
                <span className="col-span-2 text-[#086288] font-bold">
                  {item.orderType}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tabel Detail Barang & Layanan (dengan Batch Number & Expired Date) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">
                Daftar Barang & Layanan yang Diserahkan
              </span>
              <span className="text-[10px] font-semibold text-slate-500 italic">
                *Batch Number & Expired Date tercatat resmi pada Surat Jalan ini
              </span>
            </div>

            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#086288] text-white font-semibold">
                  <th className="py-2 px-2.5 w-8 text-center rounded-tl">No</th>
                  <th className="py-2 px-2.5 w-24">SKU / Kode</th>
                  <th className="py-2 px-2.5">Deskripsi Produk & Layanan</th>
                  <th className="py-2 px-2.5 w-28">No. Batch</th>
                  <th className="py-2 px-2.5 w-24">Kedaluwarsa</th>
                  <th className="py-2 px-2.5 w-16 text-center">Qty</th>
                  <th className="py-2 px-2.5 w-16 text-center rounded-tr">Satuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] border border-[#CBD5E1]">
                {item.items.map((it, idx) => {
                  const isBonus = it.isBonus;
                  const isService =
                    item.sourceType === 'service' ||
                    it.businessLineId === 'QUEINVITE' ||
                    it.businessLineId === 'HIZAKI' ||
                    it.businessLineId === 'AURUM' ||
                    it.businessLineId === 'KIMIKO';

                  const batchDisplay = it.batchNumber || (isService ? 'Non-Stock / Service' : `BATCH-202611-${String(idx + 1).padStart(2, '0')}`);
                  const expiryDisplay = it.expiredDate || (isService ? 'N/A' : '2028-11-01');

                  return (
                    <tr
                      key={it.id || idx}
                      className={`hover:bg-[#F8FAFC] ${
                        isBonus ? 'bg-amber-50/50' : idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center text-[#64748B] font-mono">{idx + 1}</td>
                      <td className="py-2 px-2.5 font-mono text-[10.5px] font-semibold text-[#086288]">
                        {it.sku || `SKU-${1000 + idx}`}
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                          <span>{it.name}</span>
                          {isBonus && (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              <Gift className="w-2.5 h-2.5" /> Bonus Item
                            </span>
                          )}
                          {isService && (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                              <Sparkles className="w-2.5 h-2.5" /> Service
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[10.5px] text-slate-700 font-medium">
                        {batchDisplay}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[10.5px] text-slate-600">
                        {expiryDisplay}
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold text-[#0F172A]">
                        {it.quantity}
                      </td>
                      <td className="py-2 px-2.5 text-center text-[#64748B] font-medium">
                        {it.uom || 'Unit'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. Delivery Remarks & Instruction Note */}
          <div className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[10.5px] text-[#475569] space-y-0.5">
            <p className="font-bold text-[#0F172A]">Ketentuan & Catatan Pengiriman:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Penerima wajib memeriksa kesesuaian jumlah, kondisi fisik barang, segel kemasan, serta nomor batch saat barang diserahterimakan.</li>
              <li>Klaim atau komplain atas kerusakan/kekurangan barang maksimal diajukan 1x24 jam sejak dokumen ini ditandatangani.</li>
              <li>Surat Jalan resmi ini menjadi dasar penerbitan dan penagihan <strong>Faktur Penjualan (Commercial Invoice)</strong>.</li>
            </ol>
          </div>
        </div>

        {/* BOTTOM SECTION: 4 KOLOM TANDA TANGAN RESMI */}
        <div className="pt-4 mt-6 border-t border-[#CBD5E1] space-y-4">
          <div className="grid grid-cols-4 gap-3 text-center text-[10.5px]">
            {/* Kolom 1: Penerima / Customer */}
            <div className="flex flex-col justify-between h-28 p-2 border border-dashed border-[#CBD5E1] rounded bg-white">
              <div>
                <span className="font-semibold text-[#64748B] block">Diterima Oleh</span>
                <span className="text-[9.5px] text-slate-400">Customer / Penerima</span>
              </div>
              <div className="pt-8 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#0F172A] block underline">( ........................................ )</span>
                <span className="text-[9px] text-[#64748B]">Tgl: _____/_____/2026</span>
              </div>
            </div>

            {/* Kolom 2: Driver / Ekspedisi */}
            <div className="flex flex-col justify-between h-28 p-2 border border-dashed border-[#CBD5E1] rounded bg-white">
              <div>
                <span className="font-semibold text-[#64748B] block">Diserahkan Oleh</span>
                <span className="text-[9.5px] text-slate-400">Driver / Dispatcher</span>
              </div>
              <div className="pt-8 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#0F172A] block underline">( ........................................ )</span>
                <span className="text-[9px] text-[#64748B]">No. Pol: _______________</span>
              </div>
            </div>

            {/* Kolom 3: Picker / Warehouse */}
            <div className="flex flex-col justify-between h-28 p-2 border border-dashed border-[#CBD5E1] rounded bg-white">
              <div>
                <span className="font-semibold text-[#64748B] block">Disiapkan & Diperiksa</span>
                <span className="text-[9.5px] text-slate-400">Warehouse Staff / Picker</span>
              </div>
              <div className="pt-8 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#0F172A] block underline">( Staff Gudang )</span>
                <span className="text-[9px] text-teal-700 font-semibold">Telah Diverifikasi</span>
              </div>
            </div>

            {/* Kolom 4: Branch Manager */}
            <div className="flex flex-col justify-between h-28 p-2 border border-dashed border-[#CBD5E1] rounded bg-white">
              <div>
                <span className="font-semibold text-[#64748B] block">Disetujui Oleh</span>
                <span className="text-[9.5px] text-slate-400">Supervisor / Branch Mgr</span>
              </div>
              <div className="pt-8 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#0F172A] block underline">( Branch Manager )</span>
                <span className="text-[9px] text-slate-500">{item.branchCode}</span>
              </div>
            </div>
          </div>

          {/* Footer watermark & pagination info */}
          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
            <span>Dicetak melalui Zyvora Enterprise ERP System pada {new Date().toLocaleString('id-ID')}</span>
            <span>Dokumen {pageNum} dari {totalPages}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Media Print Global Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #do-print-container,
          #do-print-container * {
            visibility: visible;
          }
          #do-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .do-print-sheet {
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            break-after: page;
            min-height: 287mm;
            padding: 15mm 15mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Print Delivery Order (Surat Jalan)"
        description={`Menampilkan pratinjau ${items.length} dokumen Surat Jalan resmi A4 siap cetak.`}
        size="xl"
        maxWidth="max-w-[850px]"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
            {/* Pagination Controls for Batch Print Preview */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Dokumen Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-[#0F172A] px-1">
                Dokumen {activePageIndex + 1} dari {items.length}
              </span>
              <button
                type="button"
                onClick={() => setActivePageIndex((prev) => Math.min(items.length - 1, prev + 1))}
                disabled={activePageIndex >= items.length - 1}
                className="p-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Dokumen Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-500 font-mono ml-2 hidden sm:inline">
                ({currentItem.deliveryOrderNumber || currentItem.orderNumber})
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Semua ({items.length} DO)</span>
              </button>
            </div>
          </div>
        }
      >
        {/* Print Content Container */}
        <div id="do-print-container" className="py-2 overflow-y-auto max-h-[70vh] bg-slate-100 p-3 rounded-lg">
          {/* For screen preview: only active page is shown to keep UX crisp */}
          <div className="block sm:hidden text-center text-xs text-amber-700 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
            Disarankan menggunakan layar desktop atau cetak langsung ke format A4 untuk hasil optimal.
          </div>

          {/* Render Active Document Preview */}
          {renderDeliveryOrderSheet(currentItem, activePageIndex + 1, items.length)}

          {/* Invisible hidden batch pages rendered only during window.print() */}
          <div className="hidden print:block">
            {items.map((it, idx) => {
              if (idx === activePageIndex) return null; // already rendered above
              return renderDeliveryOrderSheet(it, idx + 1, items.length);
            })}
          </div>
        </div>
      </BaseModal>
    </>
  );
};
