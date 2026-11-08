import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Check,
  X,
  FileText,
  Receipt,
  Car,
  AlertCircle,
  Building2,
  Calendar,
  User,
  ArrowRight,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ExpenseClaim, ExpenseClaimStatus } from '../../types/erp';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { useErp } from '../../context/ErpContext';

export const ApprovalListView: React.FC = () => {
  const { tenant, currentUser, addToast } = useErp();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterDocType, setFilterDocType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('submitted'); // Default to pending approvals
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Selected claim for detail review modal
  const [reviewClaim, setReviewClaim] = useState<ExpenseClaim | null>(null);

  // Reject reason dialog
  const [rejectingClaim, setRejectingClaim] = useState<ExpenseClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const data = await ExpenseClaimService.getClaims(tenant.id);
      setClaims(data);
    } catch (err) {
      console.warn('Failed to load approval queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [tenant.id]);

  const handleResetFilters = () => {
    setFilterDocType('all');
    setFilterStatus('submitted');
    setSearchQuery('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Status filter
      if (filterStatus !== 'all' && claim.status !== filterStatus) {
        return false;
      }
      // Date filters
      if (filterDateFrom && claim.claimDate < filterDateFrom) {
        return false;
      }
      if (filterDateTo && claim.claimDate > filterDateTo) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = (claim.claimNumber || '').toLowerCase().includes(q);
        const matchesName = (claim.requestByName || '').toLowerCase().includes(q);
        const matchesNotes = (claim.notes || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesName && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [claims, filterStatus, filterDateFrom, filterDateTo, searchQuery]);

  // Pagination & Entry Controls
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.ceil(filteredClaims.length / entriesPerPage) || 1;
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredClaims.slice(start, start + entriesPerPage);
  }, [filteredClaims, currentPage, entriesPerPage]);

  // Approve action
  const handleApprove = async (claim: ExpenseClaim) => {
    setIsSubmittingAction(true);
    try {
      const approverName = currentUser.fullName || 'Operational Manager';
      const updated = await ExpenseClaimService.updateStatus(
        claim.id,
        'approved',
        { actorName: approverName },
        tenant.id
      );

      if (updated) {
        addToast(
          'Voucher Disetujui',
          `Voucher ${updated.claimNumber} telah disetujui dan siap untuk dicairkan di menu Cash Transaction.`,
          'success'
        );
        setReviewClaim(null);
        loadClaims();
      }
    } catch {
      addToast('Gagal Menyetujui', 'Terjadi kendala saat memproses persetujuan.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Reject action
  const handleConfirmReject = async () => {
    if (!rejectingClaim) return;
    if (!rejectionReason.trim()) {
      addToast('Alasan Wajib Diisi', 'Silakan masukkan alasan penolakan dokumen.', 'warning');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const approverName = currentUser.fullName || 'Operational Manager';
      const updated = await ExpenseClaimService.updateStatus(
        rejectingClaim.id,
        'rejected',
        {
          actorName: approverName,
          rejectionReason: rejectionReason.trim()
        },
        tenant.id
      );

      if (updated) {
        addToast(
          'Voucher Ditolak',
          `Voucher ${updated.claimNumber} telah ditolak dengan catatan yang diberikan.`,
          'info'
        );
        setRejectingClaim(null);
        setRejectionReason('');
        setReviewClaim(null);
        loadClaims();
      }
    } catch {
      addToast('Gagal Menolak', 'Terjadi kendala saat menolak dokumen.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Menunggu Persetujuan
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Disetujui (Siap Dicairkan)
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-[#086288] border border-sky-200">
            <Check className="w-3 h-3 text-[#086288]" />
            Telah Dicairkan
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Ditolak
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (STANDARD BLUEPRINT)                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* LEFT COLUMN FILTERS */}
          <div className="space-y-3">
            {/* Document Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Document Type</label>
              <div className="sm:col-span-2">
                <select
                  value={filterDocType}
                  onChange={(e) => {
                    setFilterDocType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Document Types ---</option>
                  <option value="claim_expense">Claim Expense</option>
                </select>
              </div>
            </div>

            {/* Submission Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Date Range</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Tanggal Mulai"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Tanggal Akhir"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetFilters();
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN FILTERS */}
          <div className="space-y-3">
            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="submitted">Menunggu Persetujuan (Submitted)</option>
                  <option value="approved">Disetujui (Approved)</option>
                  <option value="paid">Telah Dicairkan (Paid)</option>
                  <option value="rejected">Ditolak (Rejected)</option>
                  <option value="all">--- Semua Status Dokumen ---</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print List</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative">
            <span className="text-xs text-[#64748B] mr-1.5">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter in table..."
              className="h-8 w-44 sm:w-56 px-2.5 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. DATA TABLE (DIRECT CONTENT)                                        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F8FAFC] text-[#0F172A] font-bold border-b border-[#CBD5E1] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3">Tipe Dokumen</th>
                <th className="py-3 px-3">No. Dokumen</th>
                <th className="py-3 px-3">Tanggal Pengajuan</th>
                <th className="py-3 px-3">Pemohon</th>
                <th className="py-3 px-3">Item Pengeluaran</th>
                <th className="py-3 px-3 text-right">Total Nilai (Rp)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-36">Aksi Persetujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat antrean persetujuan...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">
                        {filterStatus === 'submitted'
                          ? 'Tidak ada antrean dokumen menunggu persetujuan'
                          : 'Tidak ada dokumen yang sesuai dengan filter'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Semua pengajuan telah diproses atau belum ada dokumen baru yang diajukan oleh staf.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim, idx) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setReviewClaim(claim)}
                  >
                    <td className="py-3 px-3 text-center text-slate-400">
                      {(currentPage - 1) * entriesPerPage + idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-[#086288] border border-sky-100">
                        <Receipt className="w-3 h-3 text-[#086288]" />
                        Claim Expense
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#086288] font-mono text-[11px]">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{claim.claimDate}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {claim.requestByName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {claim.items?.length || 0}
                      </span>{' '}
                      item ({claim.items[0]?.orderByTargetName || claim.items[0]?.category || 'Operasional'})
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-xs text-slate-800">
                      Rp {(claim.totalAmount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-center">{getStatusBadge(claim.status)}</td>
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setReviewClaim(claim)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#086288] hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Review Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {claim.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleApprove(claim)}
                              disabled={isSubmittingAction}
                              className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="Setujui Dokumen"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Setujui</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingClaim(claim);
                                setRejectionReason('');
                              }}
                              disabled={isSubmittingAction}
                              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="Tolak Dokumen"
                            >
                              <X className="w-3 h-3 stroke-[2.5]" />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================================== */}
        {/* 4. PAGINATION FOOTER                                                  */}
        {/* ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#E2E8F0] gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#0F172A]">{filteredClaims.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
            <strong className="text-[#0F172A]">{Math.min(currentPage * entriesPerPage, filteredClaims.length)}</strong> of{' '}
            <strong className="text-[#0F172A]">{filteredClaims.length}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-7 h-7 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#086288] border-[#086288] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Review Detail Modal */}
      {reviewClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#086288] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Review Dokumen Pengajuan
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono">
                    {reviewClaim.claimNumber}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(reviewClaim.status)}
                <button
                  onClick={() => setReviewClaim(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-slate-400">Pemohon (Request By)</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {reviewClaim.requestByName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Tanggal Pengajuan</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {reviewClaim.claimDate}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Metode Diminta</div>
                  <div className="font-semibold text-slate-800 mt-0.5 capitalize">
                    {reviewClaim.disbursementMethod === 'petty_cash'
                      ? 'Kas Kecil (Petty Cash)'
                      : 'Transfer Bank'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Total Pengajuan</div>
                  <div className="text-base font-bold text-[#086288] font-mono mt-0.5">
                    Rp {(reviewClaim.totalAmount || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {reviewClaim.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-slate-700">
                  <span className="font-semibold text-amber-900 block mb-0.5">
                    Catatan Pengajuan:
                  </span>
                  {reviewClaim.notes}
                </div>
              )}

              {/* Items Breakdown Table */}
              <div>
                <div className="font-semibold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Rincian Pengeluaran ({reviewClaim.items?.length || 0} item)</span>
                  <span className="text-slate-400 font-normal">
                    Format Standar Audit Keuangan
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Kategori & Aktivitas</th>
                        <th className="py-2.5 px-3">Pembebanan Biaya</th>
                        <th className="py-2.5 px-3">Log Armada / Odometer</th>
                        <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reviewClaim.items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 capitalize">
                              {item.category.replace(/_/g, ' ')}
                            </div>
                            <div className="text-slate-500 text-[11px]">{item.activity}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-700">
                              {item.orderByTargetName}
                            </div>
                            <span className="font-mono text-[10px] text-[#086288] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              {item.costCenterCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.isVehicleActivity ? (
                              <div className="text-[11px] text-slate-600 space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Car className="w-3 h-3 text-[#086288]" />
                                  <span>{item.licensePlate || 'Armada'}</span>
                                </div>
                                <div>Odometer: {item.odometerKm?.toLocaleString()} KM</div>
                                {item.fuelLiters && <div>BBM: {item.fuelLiters} Liter</div>}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            Rp {(item.nominal || 0).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                          Total Akumulasi:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#086288]">
                          Rp {(reviewClaim.totalAmount || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Approval status notes if approved or paid */}
              {reviewClaim.approvedBy && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Disetujui oleh: <strong>{reviewClaim.approvedBy}</strong> pada{' '}
                      {reviewClaim.approvedAt ? new Date(reviewClaim.approvedAt).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  {reviewClaim.disbursedCashTransactionNumber && (
                    <span className="font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">
                      Disbursed: {reviewClaim.disbursedCashTransactionNumber}
                    </span>
                  )}
                </div>
              )}

              {reviewClaim.status === 'rejected' && reviewClaim.rejectionReason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                  <span className="font-semibold block mb-0.5">Alasan Penolakan:</span>
                  {reviewClaim.rejectionReason}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setReviewClaim(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Tutup
              </button>

              {reviewClaim.status === 'submitted' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRejectingClaim(reviewClaim);
                      setRejectionReason('');
                    }}
                    disabled={isSubmittingAction}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Tolak Pengajuan</span>
                  </button>

                  <button
                    onClick={() => handleApprove(reviewClaim)}
                    disabled={isSubmittingAction}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Setujui (Approve)</span>
                  </button>
                </div>
              )}

              {reviewClaim.status === 'approved' && !reviewClaim.disbursedCashTransactionNumber && (
                <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Voucher ini telah disetujui. Pencairan dilakukan di menu{' '}
                    <strong>Cash Transaction</strong> (Add &gt; Issue).
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectingClaim && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Konfirmasi Penolakan</h3>
                <p className="text-[11px] text-rose-700">Voucher {rejectingClaim.claimNumber}</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Silakan tuliskan alasan penolakan agar staf pemohon dapat merevisi atau memahami kendala dokumen ini:
              </p>
              <div>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bukti nota BBM belum dilampirkan atau odometer tidak sesuai..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-slate-50/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setRejectingClaim(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingAction || !rejectionReason.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};