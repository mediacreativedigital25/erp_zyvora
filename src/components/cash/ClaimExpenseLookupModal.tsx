import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Receipt,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { ExpenseClaim } from '../../types/erp';
import { CashTransactionService } from '../../services/cashTransactionService';
import { useErp } from '../../context/ErpContext';

interface ClaimExpenseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClaim: (claim: ExpenseClaim) => void;
  selectedClaimId?: string;
}

export const ClaimExpenseLookupModal: React.FC<ClaimExpenseLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectClaim,
  selectedClaimId
}) => {
  const { tenant } = useErp();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      CashTransactionService.getApprovedClaimsForDisbursement(tenant.id)
        .then((data) => {
          setClaims(data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, tenant.id]);

  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return claims;
    const q = searchQuery.toLowerCase().trim();
    return claims.filter((c) => {
      const numMatch = (c.claimNumber || '').toLowerCase().includes(q);
      const nameMatch = (c.requestByName || '').toLowerCase().includes(q);
      const notesMatch = (c.notes || '').toLowerCase().includes(q);
      return numMatch || nameMatch || notesMatch;
    });
  }, [claims, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-[#086288]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pilih Dokumen Claim Expense (Status: Approved)
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan seluruh voucher klaim biaya yang telah disetujui dan siap untuk dicairkan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor klaim, nama pemohon, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#086288] bg-slate-50/50"
              autoFocus
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">No. Dokumen Klaim</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Pemohon</th>
                <th className="py-2.5 px-3">Item Pengeluaran</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                <th className="py-2.5 px-3 text-center w-24">Pilih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat daftar voucher klaim yang disetujui...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Receipt className="w-8 h-8 stroke-[1.5] text-slate-300 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">
                        Tidak ada voucher klaim yang siap dicairkan
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Pastikan pengajuan klaim telah disetujui (Approved) pada modul Approval terlebih dahulu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim, idx) => {
                  const isSelected = claim.id === selectedClaimId;
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => {
                        onSelectClaim(claim);
                        onClose();
                      }}
                      className={`hover:bg-sky-50/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#086288]">
                        {claim.claimNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {claim.claimDate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {claim.requestByName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {claim.items?.length || 0} item (
                        {claim.items[0]?.orderByTargetName || claim.items[0]?.category || 'Operasional'})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        Rp {(claim.totalAmount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClaim(claim);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#086288] hover:bg-[#075273] text-white transition-colors"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
          <span>Ditemukan: {filteredClaims.length} voucher klaim disetujui</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md border border-[#DCE5EC] bg-white text-[#475569] hover:bg-[#F8FAFC] font-semibold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};