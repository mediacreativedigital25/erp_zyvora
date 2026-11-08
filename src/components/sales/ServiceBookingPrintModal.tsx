import React from 'react';
import {
  Printer,
  X,
  Building2,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
  Download,
  CreditCard,
  Layers
} from 'lucide-react';
import { ServiceBookingOrder } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';
import { angkaTerbilang } from '../../utils/terbilang';

interface ServiceBookingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ServiceBookingOrder | null;
  mode: 'order' | 'receipt';
  printWithPrice: boolean;
}

export const ServiceBookingPrintModal: React.FC<ServiceBookingPrintModalProps> = ({
  isOpen,
  onClose,
  booking,
  mode,
  printWithPrice
}) => {
  const { companyProfile, bankAccounts } = useErp();

  if (!booking) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const isReceipt = mode === 'receipt';
  const documentTitle = isReceipt
    ? 'BUKTI KONFIRMASI PESANAN (ORDER RECEIPT)'
    : 'FAKTUR PESANAN LAYANAN (SALES ORDER SERVICE)';

  // Primary Bank Account for settlements
  const primaryBank =
    bankAccounts && bankAccounts.length > 0
      ? bankAccounts.find((b) => b.isActive) || bankAccounts[0]
      : {
          bankName: 'PT Bank Central Asia Tbk (BCA)',
          accountNumber: '802-991-3401',
          accountHolderName: companyProfile?.legalName || 'PT Zyvora Global Pratama'
        };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pratinjau Dokumen A4 — ${booking.bookingNumber}`}
      description="Format dokumen standar A4 resmi siap cetak dan PDF. Logo terhubung otomatis dari Pengaturan."
      size="xl"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#64748B]">
            Format Kertas A4 (210mm x 297mm) · Harga {printWithPrice ? 'Ditampilkan' : 'Disembunyikan'}
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
              <Printer className="w-4 h-4" /> Cetak Dokumen (A4 / PDF)
            </button>
          </div>
        </div>
      }
    >
      {/* Print Stylesheet for Pure A4 Paper Output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-a4-service-booking, #printable-a4-service-booking * {
            visibility: visible;
          }
          #printable-a4-service-booking {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 14mm 18mm 14mm 18mm;
          }
        }
      `}</style>

      {/* Canvas Wrapper Backdrop */}
      <div className="bg-slate-200/80 p-2 sm:p-6 rounded-xl overflow-y-auto max-h-[75vh] flex justify-center">
        {/* Authentic A4 Document Sheet */}
        <div
          id="printable-a4-service-booking"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-10 shadow-xl border border-slate-300 rounded-xs font-sans flex flex-col justify-between text-[#0F172A]"
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
                    Cabang: {booking.branchName || booking.branchCode || 'BR-01 - Jakarta Pusat (Kantor Pusat)'}
                    <br />
                    NPWP: <span className="font-mono">{companyProfile?.npwp || '01.345.678.9-012.000'}</span>
                    {' '}• Telp: {companyProfile?.phone || '+62 21 5289 0000'}
                  </p>
                </div>
              </div>

              {/* Right: Document Identity & Meta */}
              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block px-2.5 py-0.5 bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded font-mono text-xs font-extrabold uppercase tracking-wider">
                  {documentTitle}
                </div>
                <div className="text-base font-extrabold text-[#0F172A] font-mono pt-0.5">
                  {booking.bookingNumber}
                </div>
                <div className="text-xs text-[#64748B]">
                  Tanggal Order: <strong className="font-mono text-[#0F172A]">{booking.bookingDate}</strong>
                </div>
                <div className="text-xs text-[#64748B]">
                  Status Order:{' '}
                  <span className="font-bold uppercase text-[#086288]">
                    {booking.status}
                  </span>
                </div>
                {booking.projectNumber && (
                  <div className="text-[11px] text-[#64748B]">
                    Proyek: <span className="font-mono">{booking.projectNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Customer & Event Logistics Metadata (Two-Column Paper.id Strip) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
              {/* Left: Customer Information */}
              <div className="space-y-0.5">
                <span className="font-bold text-[#475569] uppercase text-[10px] tracking-wider block border-b border-[#CBD5E1] pb-1">
                  Pelanggan & Acara (Client & Event)
                </span>
                <div className="font-extrabold text-sm text-[#0F172A]">
                  {booking.customerName}
                </div>
                <div className="text-[#475569]">
                  Kode Pelanggan:{' '}
                  <span className="font-mono font-bold text-[#086288]">
                    {booking.customerCode}
                  </span>
                </div>
                <div className="text-[#475569]">Telepon / WhatsApp: {booking.customerPhone}</div>
                {booking.customerEmail && (
                  <div className="text-[#475569]">Email: {booking.customerEmail}</div>
                )}
                <div className="pt-0.5 text-[#086288] font-bold">
                  Judul Acara: {booking.eventTitle}
                </div>
              </div>

              {/* Right: Operational & Logistic Specs */}
              <div className="space-y-0.5 sm:pl-3 sm:border-l sm:border-[#CBD5E1]">
                <span className="font-bold text-[#475569] uppercase text-[10px] tracking-wider block border-b border-[#CBD5E1] pb-1">
                  Lokasi & Jadwal Pelaksanaan
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-[#64748B]">Tanggal Acara:</span>
                  <span className="col-span-2 font-bold text-[#0F172A]">
                    {booking.eventDate} ({booking.eventSession?.toUpperCase() || 'EVENING'})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-[#64748B]">Lokasi / Venue:</span>
                  <span className="col-span-2 text-[#0F172A] font-semibold">
                    {booking.venueName} ({booking.venueCity || 'Jakarta'})
                    {typeof booking.distanceFromHqKm === 'number' && (
                      <span className="ml-1 text-[10px] text-[#086288]">
                        (±{booking.distanceFromHqKm} km dari Kantor)
                      </span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-[#64748B]">Salesman / PIC:</span>
                  <span className="col-span-2 text-[#0F172A]">
                    {booking.salesPicName || 'Dimas Wicaksono'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-[#64748B]">Syarat Pembayaran:</span>
                  <span className="col-span-2 text-[#086288] font-bold">
                    {booking.paymentTermText || 'DP 20% + Net 30 Hari'}
                  </span>
                </div>
                {booking.estimatedGuestCount && (
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-[#64748B]">Estimasi Tamu:</span>
                    <span className="col-span-2 text-[#0F172A] font-semibold">
                      {booking.estimatedGuestCount} Orang (Pax)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Detail Order Services Table */}
            <div className="space-y-1">
              <span className="font-bold text-[#475569] uppercase text-[10px] tracking-wider block">
                Rincian Barang / Jasa yang Dipesan
              </span>
              <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#EFF7FA] text-[#086288] font-bold border-b border-[#CBD5E1]">
                    <tr>
                      <th className="py-2 px-2.5 w-[6%] text-center">No</th>
                      <th className="py-2 px-2.5 w-[44%]">Nama Barang / Jasa</th>
                      <th className="py-2 px-2.5 w-[8%] text-center">QTY</th>
                      <th className="py-2 px-2.5 w-[10%] text-center">Satuan</th>
                      {printWithPrice && (
                        <>
                          <th className="py-2 px-2.5 w-[16%] text-right">Harga Satuan</th>
                          <th className="py-2 px-2.5 w-[16%] text-right">Jumlah (Rp)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {booking.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-2.5 text-center font-mono text-[#64748B]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-semibold text-[#0F172A]">{item.serviceName}</div>
                          {item.description && (
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-[#0F172A]">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2.5 text-center text-[#64748B]">{item.uom}</td>
                        {printWithPrice && (
                          <>
                            <td className="py-2 px-2.5 text-right font-mono text-[#0F172A]">
                              Rp {item.unitPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-[#086288]">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Terbilang & Perhitungan Finansial */}
            {printWithPrice && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-0.5">
                {/* Left: Terbilang & Bank Account */}
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#EFF7FA]/60 rounded-lg border border-[#B7DDEA]">
                    <span className="text-[9.5px] font-bold uppercase text-[#086288] tracking-wider block mb-0.5">
                      Terbilang (Amount in Words):
                    </span>
                    <p className="italic font-semibold text-[#0F172A] text-xs">
                      "{angkaTerbilang(booking.totalAmount)}"
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] space-y-0.5">
                    <span className="font-bold text-[#086288] text-[9.5px] uppercase tracking-wider block flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Rekening Pembayaran Resmi:
                    </span>
                    <div className="font-bold text-xs text-[#0F172A]">
                      {primaryBank.bankName}
                    </div>
                    <div className="text-xs">
                      No. Rekening:{' '}
                      <strong className="font-mono text-sm text-[#086288]">
                        {primaryBank.accountNumber}
                      </strong>
                    </div>
                    <div className="text-[10.5px] text-[#475569]">
                      Atas Nama: <strong>{primaryBank.accountHolderName}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Subtotal, Line Disc & Grand Total */}
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] space-y-1.5 self-start">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Subtotal Tagihan:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      Rp {booking.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {booking.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Total Diskon:</span>
                      <span className="font-mono">
                        - Rp {booking.discountTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#64748B]">
                    <span>Pajak (PPN 11% Termasuk):</span>
                    <span className="font-mono text-[#0F172A]">
                      Rp {(booking.taxAmount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center font-extrabold text-sm text-[#086288] border-t-2 border-[#086288] pt-1.5 mt-0.5">
                    <span className="uppercase tracking-wide">Total Nilai Kontrak:</span>
                    <span className="font-mono text-base font-extrabold">
                      Rp {booking.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Agreed Payment Milestones Schedule */}
            {booking.milestones && booking.milestones.length > 0 && (
              <div className="bg-[#EFF7FA]/40 border border-[#B7DDEA] p-2.5 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-[#086288] uppercase text-[10px] tracking-wider block">
                  Jadwal Termin Pembayaran (Payment Milestones Schedule)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {booking.milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="bg-white p-2 rounded border border-[#CBD5E1] space-y-0.5"
                    >
                      <div className="font-bold text-[11px] text-[#0F172A]">
                        {ms.milestoneName} ({ms.percentage}%)
                      </div>
                      {printWithPrice && (
                        <div className="font-mono font-bold text-xs text-[#086288]">
                          Rp {ms.amount.toLocaleString('id-ID')}
                        </div>
                      )}
                      <div className="text-[10px] text-[#64748B]">
                        Jatuh Tempo: {ms.dueDate || 'Sesuai Tahapan Acara'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Remarks / Special Notes */}
            {booking.notes && (
              <div className="text-[10.5px] text-[#475569] bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                <strong className="text-[#0F172A]">Catatan Khusus:</strong> {booking.notes}
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: TANDA TANGAN OTORISASI RESMI */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div className="space-y-8">
                <span className="text-[#64748B] text-[10px] uppercase font-semibold">
                  Disiapkan Oleh (Sales PIC)
                </span>
                <div className="border-b border-[#0F172A] w-36 mx-auto"></div>
                <p className="font-semibold text-[#0F172A]">
                  ( {booking.salesPicName || 'Dimas Wicaksono'} )
                </p>
              </div>

              <div className="space-y-8">
                <span className="text-[#64748B] text-[10px] uppercase font-semibold">
                  Disetujui Oleh (Pimpinan)
                </span>
                <div className="border-b border-[#0F172A] w-36 mx-auto relative">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#086288]/40 border border-[#086288]/30 px-2 py-0.5 rounded uppercase tracking-widest">
                    [ STEMPEL RESMI ]
                  </span>
                </div>
                <p className="font-semibold text-[#0F172A]">
                  ( {companyProfile?.legalName || 'PT Zyvora Global Pratama'} )
                </p>
              </div>

              <div className="space-y-8">
                <span className="text-[#64748B] text-[10px] uppercase font-semibold">
                  Persetujuan Pelanggan
                </span>
                <div className="border-b border-[#0F172A] w-36 mx-auto"></div>
                <p className="font-semibold text-[#0F172A]">
                  ( {booking.customerName} )
                </p>
              </div>
            </div>

            {/* Footer Print Info */}
            <div className="text-[9px] text-[#94A3B8] text-center pt-1 border-t border-slate-200">
              Dokumen Pesanan Layanan resmi dicetak melalui Zyvora Enterprise ERP · Ukuran Kertas Standar A4 (210mm x 297mm).
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
