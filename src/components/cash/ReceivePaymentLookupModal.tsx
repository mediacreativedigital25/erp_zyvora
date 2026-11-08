import React, { useState, useMemo } from 'react';
import { Search, X, Check, FileCheck2, CreditCard } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { ReceivePayment } from '../../types/erp';
import { BaseModal } from '../common/BaseModal';

interface ReceivePaymentLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPayment: (payment: ReceivePayment) => void;
  filterCustomerCode?: string;
  zIndex?: string;
}

export const ReceivePaymentLookupModal: React.FC<ReceivePaymentLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectPayment,
  filterCustomerCode,
  zIndex = 'z-50'
}) => {
  const { receivePayments } = useErp();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter available Receive Payment records:
  // 1. Status must be approved
  // 2. Must not already be deposited into Cash/Bank
  // 3. Optional customer code filter if customer was pre-selected
  const availablePayments = useMemo(() => {
    return receivePayments.filter((p) => {
      // Must not already be deposited
      if (p.isDeposited) {
        return false;
      }
      // Must be approved
      if (p.status !== 'approved') {
        return false;
      }
      // Optional customer filter
      if (filterCustomerCode && p.customerCode !== filterCustomerCode && p.customerId !== filterCustomerCode) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = p.paymentNumber?.toLowerCase().includes(q);
        const matchCust = p.customerName?.toLowerCase().includes(q) || p.customerCode?.toLowerCase().includes(q);
        const matchCol = p.collectorName?.toLowerCase().includes(q) || p.collectorCode?.toLowerCase().includes(q);
        const matchDoc = p.documentNumber?.toLowerCase().includes(q);
        return matchNum || matchCust || matchCol || matchDoc;
      }

      return true;
    });
  }, [receivePayments, filterCustomerCode, searchQuery]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih Dokumen Receive Payment (AR Penagihan)"
      description="Menampilkan bukti pelunasan faktur yang sudah dicatat di modul AR dan siap disetorkan ke Buku Kas / Rekening Bank."
      size="xl"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        {/* Search Filter */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor pembayaran RP..., nama pelanggan, atau kolektor..."
            className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pl-9 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Table of Available Payments */}
        <div className="border border-[#CBD5E1] rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1] sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">No. Payment (RP)</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Kolektor</th>
                <th className="py-2.5 px-3">Metode Bayar</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {availablePayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center">
                      <CreditCard className="w-7 h-7 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">Tidak ada dokumen pembayaran yang siap disetor</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                        {filterCustomerCode
                          ? 'Tidak ada bukti Receive Payment untuk pelanggan ini yang belum masuk kas.'
                          : 'Seluruh pembayaran dari AR sudah disetorkan ke Buku Kas / Rekening Bank, atau belum ada Receive Payment yang disetujui.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                availablePayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-[#086288]">
                      {payment.paymentNumber}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                      {payment.paymentDate}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-[#0F172A]">{payment.customerName}</div>
                      <span className="text-[10px] font-mono text-[#086288] bg-[#EFF7FA] px-1 py-0.5 rounded">
                        {payment.customerCode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {payment.collectorName || payment.collectorCode || '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      {payment.paymentMethods?.map((pm) => pm.paymentDescription || pm.paymentMethod).join(', ') || 'Transfer'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                      {payment.totalPaymentAmount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPayment(payment);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#086288] hover:bg-[#064B6A] text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>Pilih</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#CBD5E1] text-xs text-[#64748B]">
          <span>
            Menampilkan <strong>{availablePayments.length}</strong> dokumen Receive Payment yang siap dibukukan.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
