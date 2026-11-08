import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  RotateCcw,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { ExpenseClaim, ExpenseClaimStatus } from '../../types/erp';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { getTodayDateString } from '../../utils/dateUtils';

interface ClaimExpenseListViewProps {
  onAddNew: () => void;
  onEdit: (claim: ExpenseClaim) => void;
}

export const ClaimExpenseListView: React.FC<ClaimExpenseListViewProps> = ({
  onAddNew,
  onEdit
}) => {
  const { branches, addToast, tenant } = useErp();
  const { confirm } = useConfirm();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Top Filter Box State (Zyvora 2-Column Standard)
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterRequestBy, setFilterRequestBy] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>(getTodayDateString());
  const [filterDateTo, setFilterDateTo] = useState<string>(getTodayDateString());

  // Table Controls (Pagination & Search)
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const data = await ExpenseClaimService.getClaims(tenant.id);
      setClaims(data);
    } catch (err) {
      console.warn('Failed to load claims:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleResetFilter = () => {
    setFilterBranchId('all');
    setFilterRequestBy('');
    setFilterStatus('all');
    setFilterDateFrom(getTodayDateString());
    setFilterDateTo(getTodayDateString());
    setSearchTableQuery('');
    setCurrentPage(1);
  };

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Filter by Branch
      if (filterBranchId !== 'all') {
        const itemWithBranch = claim.items?.some((i) => i.costCenterCode === filterBranchId);
        const matchesBranch =
          (claim as any).branchId === filterBranchId ||
          (claim as any).branchCode === filterBranchId ||
          itemWithBranch;
        if ((claim as any).branchId && !matchesBranch) return false;
      }

      // Filter by Request By
      if (filterRequestBy.trim()) {
        const query = filterRequestBy.toLowerCase().trim();
        const matchesName = (claim.requestByName || '').toLowerCase().includes(query);
        const matchesUser = (claim.requestByUserId || '').toLowerCase().includes(query);
        if (!matchesName && !matchesUser) return false;
      }

      // Filter by Status
      if (filterStatus !== 'all' && claim.status !== filterStatus) {
        return false;
      }

      // Filter by Date Range
      if (filterDateFrom && claim.claimDate < filterDateFrom) return false;
      if (filterDateTo && claim.claimDate > filterDateTo) return false;

      // Table quick search
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase().trim();
        const matchesNum = (claim.claimNumber || '').toLowerCase().includes(q);
        const matchesNotes = (claim.notes || '').toLowerCase().includes(q);
        const matchesUser = (claim.requestByName || '').toLowerCase().includes(q);
        const matchesCostCenter = claim.items?.some((i) =>
          (i.costCenterCode || '').toLowerCase().includes(q)
        );
        if (!matchesNum && !matchesNotes && !matchesUser && !matchesCostCenter) return false;
      }

      return true;
    });
  }, [claims, filterBranchId, filterRequestBy, filterStatus, filterDateFrom, filterDateTo, searchTableQuery]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / entriesPerPage));
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredClaims.slice(start, start + entriesPerPage);
  }, [filteredClaims, currentPage, entriesPerPage]);

  const handleStatusChange = async (claimId: string, newStatus: ExpenseClaimStatus) => {
    if (newStatus === 'rejected') {
      const isConfirmed = await confirm({
        title: 'Tolak Voucher Klaim Biaya?',
        message: 'Klaim biaya ini akan ditandai sebagai ditolak dan dikembalikan kepada pemohon.',
        variant: 'warning',
        confirmLabel: 'Ya, Tolak Klaim',
        cancelLabel: 'Batal'
      });
      if (!isConfirmed) return;
    }

    try {
      const updated = await ExpenseClaimService.updateStatus(claimId, newStatus, {
        actorName: 'Finance Authority'
      });
      if (updated) {
        addToast(
          'Status Diperbarui',
          `Klaim biaya berhasil diperbarui dengan status: ${newStatus}`,
          'success'
        );
        loadClaims();
      }
    } catch (err: any) {
      addToast('Error', err.message || 'Gagal mengubah status klaim.', 'error');
    }
  };

  const handleDelete = async (claimId: string, claimNumber: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Voucher Klaim Biaya?',
      message: `Apakah Anda yakin ingin menghapus voucher klaim biaya "${claimNumber}"? Data yang sudah dihapus tidak dapat dipulihkan.`,
      entityCode: claimNumber,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Voucher',
      cancelLabel: 'Batal',
      consequences: [
        'Voucher klaim biaya dihapus permanen dari sistem.',
        'Seluruh item rincian pengeluaran dan riwayat approval akan terhapus.'
      ]
    });

    if (!isConfirmed) return;

    await ExpenseClaimService.deleteClaim(claimId, tenant.id);
    addToast('Deleted', `Klaim ${claimNumber} telah berhasil dihapus.`, 'info');
    loadClaims();
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Submitted
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Approved
          </span>
        );
      case 'paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paid
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (ZYVORA ERP STANDARD)                  */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* SISI KIRI */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranchId}
                  onChange={(e) => {
                    setFilterBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">-- Semua Cabang --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Request Date</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Filter & Reset Action Buttons (Placed on Left Column under inputs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    loadClaims();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* SISI KANAN */}
          <div className="space-y-3">
            {/* Request By */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Request By</label>
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  value={filterRequestBy}
                  onChange={(e) => {
                    setFilterRequestBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search applicant / employee name..."
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
                {filterRequestBy && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRequestBy('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

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
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">-- All Status --</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted (Menunggu Approval)</option>
                  <option value="approved">Approved (Siap Dicairkan)</option>
                  <option value="paid">Paid (Lunas Dicairkan)</option>
                  <option value="rejected">Rejected (Ditolak)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS (ZYVORA ERP STANDARD)          */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Left: Action Buttons (Zyvora Solid Deep Teal + Neutral Outline Print) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print</span>
          </button>
        </div>

        {/* Right: Entries & Quick Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTableQuery}
              onChange={(e) => {
                setSearchTableQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter in table..."
              className="w-44 sm:w-56 text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[#0F172A] pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. TABLE CONTAINER & PAGINATION                                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1] select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-28">Action</th>
                <th className="py-2.5 px-3 w-40">CE Number</th>
                <th className="py-2.5 px-3 w-28">CE Date</th>
                <th className="py-2.5 px-3">Request By</th>
                <th className="py-2.5 px-3">Items / Cost Center</th>
                <th className="py-2.5 px-3 text-right w-36">Total Amount</th>
                <th className="py-2.5 px-3 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD5E1]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Loading data...
                  </td>
                </tr>
              ) : paginatedClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim) => {
                  const firstCostCenter = claim.items?.[0]?.costCenterCode || 'CC-QUEINVITE';

                  return (
                    <tr key={claim.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Action buttons */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(claim)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EFF7FA] text-[#086288] hover:bg-[#DCEEF5] border border-[#B7DDEA] transition-colors cursor-pointer"
                          >
                            {claim.status === 'draft' ? 'Edit' : 'View'}
                          </button>
                          {claim.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(claim.id, 'submitted')}
                              className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                              title="Ajukan ke Antrean Persetujuan"
                            >
                              Submit
                            </button>
                          )}
                          {(claim.status === 'draft' || claim.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(claim.id, claim.claimNumber)}
                              className="px-2 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>

                      {/* CE Number */}
                      <td className="py-2 px-3 font-mono font-bold text-[#086288]">
                        {claim.claimNumber}
                      </td>

                      {/* CE Date */}
                      <td className="py-2 px-3 text-[#475569] whitespace-nowrap">
                        {claim.claimDate}
                      </td>

                      {/* Request By */}
                      <td className="py-2 px-3 font-semibold text-[#0F172A]">
                        {claim.requestByName}
                      </td>

                      {/* Items / Cost Center */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#475569]">
                            {claim.items?.length || 0} item{claim.items?.length > 1 ? 's' : ''}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#086288] bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA]">
                            {firstCostCenter}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                        Rp {(claim.totalAmount || 0).toLocaleString('id-ID')}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {getStatusBadge(claim.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <span className="font-bold text-[#0F172A]">
              {filteredClaims.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredClaims.length)}
            </span>{' '}
            of <span className="font-bold text-[#0F172A]">{filteredClaims.length}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                      currentPage === p
                        ? 'bg-[#086288] text-white shadow-2xs'
                        : 'bg-white border border-[#CBD5E1] text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              }
              return null;
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
