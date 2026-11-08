import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Printer,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard
} from 'lucide-react';
import { CashTransaction, FinancialAccount } from '../../types/erp';
import { CashTransactionService } from '../../services/cashTransactionService';
import { useErp } from '../../context/ErpContext';
import { getTodayDateString } from '../../utils/dateUtils';

interface CashTransactionListViewProps {
  onAddNew: () => void;
}

export const CashTransactionListView: React.FC<CashTransactionListViewProps> = ({
  onAddNew
}) => {
  const { tenant, branches, accounts } = useErp();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Top Filter Box States (Exact Match to MEDIST 4.0 Image 2)
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterCashBookId, setFilterCashBookId] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>(getTodayDateString());
  const [filterDateTo, setFilterDateTo] = useState<string>(getTodayDateString());

  // Quick Table Search & Pagination
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedTx, setSelectedTx] = useState<CashTransaction | null>(null);

  // Filter available cash & bank accounts (Kas Kecil, Kas Toko, Rekening Bank BCA/Mandiri)
  const cashAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.category === 'Kas & Bank' ||
        a.name.toLowerCase().includes('kas') ||
        a.name.toLowerCase().includes('bank')
    );
  }, [accounts]);

  // Selected cash account for dynamic live balance display
  const selectedCashAccount = useMemo(() => {
    return cashAccounts.find((a) => a.id === filterCashBookId || a.code === filterCashBookId);
  }, [cashAccounts, filterCashBookId]);

  // Display balance dynamically based on selected cash account
  const cashBookBalance = useMemo(() => {
    if (!selectedCashAccount || filterCashBookId === 'all') return 0;
    return selectedCashAccount.balance ?? 0;
  }, [selectedCashAccount, filterCashBookId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await CashTransactionService.getCashTransactions(tenant.id);
      setTransactions(data);
    } catch (err) {
      console.warn('Failed to load cash transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [tenant.id]);

  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterCashBookId('all');
    setFilterDateFrom(getTodayDateString());
    setFilterDateTo(getTodayDateString());
    setSearchTableQuery('');
    setCurrentPage(1);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterBranchId !== 'all' && tx.branchId && tx.branchId !== filterBranchId && tx.branchName !== filterBranchId) {
        return false;
      }
      if (filterCashBookId !== 'all' && tx.accountId !== filterCashBookId) {
        return false;
      }
      if (filterDateFrom && tx.transactionDate < filterDateFrom) {
        return false;
      }
      if (filterDateTo && tx.transactionDate > filterDateTo) {
        return false;
      }
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchNum = tx.transactionNumber?.toLowerCase().includes(q);
        const matchAcc = tx.accountName?.toLowerCase().includes(q);
        const matchPayer = tx.recipientOrPayer?.toLowerCase().includes(q);
        const matchRef = tx.referenceNumber?.toLowerCase().includes(q) || tx.notes?.toLowerCase().includes(q);
        if (!matchNum && !matchAcc && !matchPayer && !matchRef) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filterBranchId, filterCashBookId, filterDateFrom, filterDateTo, searchTableQuery]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / entriesPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredTransactions.slice(start, start + entriesPerPage);
  }, [filteredTransactions, currentPage, entriesPerPage]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (EXACT MATCH TO MEDIST 4.0 IMAGE 2)    */}
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
                  onChange={(e) => setFilterBranchId(e.target.value)}
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

            {/* Cash Book */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Cash Book</label>
              <div className="sm:col-span-2">
                <select
                  value={filterCashBookId}
                  onChange={(e) => setFilterCashBookId(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">--- Select ---</option>
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter & Reset Action Buttons (Zyvora ERP Standard: Left Column) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    loadTransactions();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
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
            {/* Balance (Read-only dynamic balance display) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#64748B]">Balance</label>
              <div className="sm:col-span-2">
                <div className="w-full text-xs font-mono font-bold bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] flex items-center justify-between">
                  <span>{cashBookBalance.toLocaleString('id-ID')}</span>
                  {filterCashBookId !== 'all' && (
                    <span className="text-[10px] font-normal text-[#086288] bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA]">
                      Saldo Live
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cash Entry Date (Two side-by-side inputs without 's/d' text) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Cash Entry Date</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
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
          {/* Add Cash Transaction Button */}
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cash Transaction</span>
          </button>

          {/* Print Button */}
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
              placeholder="Search..."
              className="w-44 sm:w-56 text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[#0F172A] pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. 6-COLUMN TABLE (EXACT MATCH TO MEDIST 4.0 IMAGE 2)                 */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1]">
                <th className="py-2.5 px-3 w-28 text-center">Action</th>
                <th className="py-2.5 px-3">Cash Book</th>
                <th className="py-2.5 px-3 w-28 text-center">Currency</th>
                <th className="py-2.5 px-3 w-36 text-center">Transaction Date</th>
                <th className="py-2.5 px-3 w-36 text-center">Transaction Type</th>
                <th className="py-2.5 px-3 w-36 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    Memuat data transaksi kas...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EFF7FA] hover:bg-[#DCEEF5] text-[#086288] border border-[#B7DDEA] rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>

                    {/* Cash Book */}
                    <td className="py-2 px-3 font-semibold text-[#0F172A]">
                      {tx.accountName}
                    </td>

                    {/* Currency */}
                    <td className="py-2 px-3 text-center font-mono text-[#64748B]">
                      {tx.currency || 'IDR'}
                    </td>

                    {/* Transaction Date */}
                    <td className="py-2 px-3 text-center font-mono text-[#475569]">
                      {tx.transactionDate}
                    </td>

                    {/* Transaction Type */}
                    <td className="py-2 px-3 text-center">
                      {tx.type === 'receipt' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A]">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Cash Receipt</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#DC2626]">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Cash Issue</span>
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                      {tx.amount.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <span className="font-bold text-[#0F172A]">
              {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredTransactions.length)}
            </span>{' '}
            of <span className="font-bold text-[#0F172A]">{filteredTransactions.length}</span> entries
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
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Voucher Transaksi Kas / Bank
                </span>
                <div className="text-sm font-bold text-[#086288] font-mono mt-0.5">
                  {selectedTx.transactionNumber}
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-slate-400">Tipe Transaksi</div>
                  <div className="font-semibold text-slate-800 capitalize mt-0.5">
                    {selectedTx.type === 'receipt' ? 'Cash Receipt (Kas Masuk)' : 'Cash Issue (Kas Keluar)'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Tanggal Transaksi</div>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">
                    {selectedTx.transactionDate}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Akun Buku Kas/Bank</div>
                  <div className="font-semibold text-[#086288] mt-0.5">
                    {selectedTx.accountName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-slate-400">Pihak Terkait (Recipient/Payer)</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedTx.recipientOrPayer}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Nominal Transaksi</div>
                  <div className="font-mono font-bold text-base text-[#086288] mt-0.5">
                    Rp {selectedTx.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {selectedTx.notes && (
                <div>
                  <div className="text-slate-400 mb-1">Catatan Keterangan</div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                    {selectedTx.notes}
                  </div>
                </div>
              )}

              {selectedTx.items && selectedTx.items.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-1 font-semibold">Rincian Baris Transaksi ({selectedTx.items.length})</div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Tipe</th>
                          <th className="py-2 px-3">Pihak Terkait</th>
                          <th className="py-2 px-3">No. Dokumen</th>
                          <th className="py-2 px-3 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTx.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-3">{it.transactionType}</td>
                            <td className="py-1.5 px-3 font-medium">{it.recipientOrPayer}</td>
                            <td className="py-1.5 px-3 font-mono text-[#086288]">{it.correspondingDoc || '-'}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">{it.amount.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
