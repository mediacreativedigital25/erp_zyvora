import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  FileCheck2,
  X,
  Search,
  Check
} from 'lucide-react';
import {
  CashTransaction,
  CashTransactionLineItem,
  CashTransactionType,
  FinancialAccount
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { CashTransactionService } from '../../services/cashTransactionService';
import { DocumentNumberingService } from '../../services/documentNumberingService';
import { AddCashTransactionItemModal } from './AddCashTransactionItemModal';

interface CashTransactionCreatePageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const CashTransactionCreatePage: React.FC<CashTransactionCreatePageProps> = ({
  onBack,
  onSuccess
}) => {
  const {
    tenant,
    branches,
    accounts,
    setAccounts,
    bankAccounts,
    setBankAccounts,
    receivePayments,
    setReceivePayments,
    currentUser,
    addToast
  } = useErp();

  // Header State (Exact Match to MEDIST 4.0 Image 3)
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');
  const [transactionDate, setTransactionDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [documentType, setDocumentType] = useState<CashTransactionType>('receipt');
  const [cashBookId, setCashBookId] = useState<string>('');

  // Multi-line Items Grid State
  const [items, setItems] = useState<CashTransactionLineItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Table Search & Pagination State
  const [tableSearch, setTableSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter available cash & bank accounts
  const cashAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.category === 'Kas & Bank' ||
        a.name.toLowerCase().includes('kas') ||
        a.name.toLowerCase().includes('bank')
    );
  }, [accounts]);

  // Selected cash account for real-time balance
  const selectedCashAccount: FinancialAccount | undefined = useMemo(() => {
    return cashAccounts.find((a) => a.id === cashBookId || a.code === cashBookId);
  }, [cashAccounts, cashBookId]);

  // Dynamic balance from selected account
  const cashBookBalance = useMemo(() => {
    if (!selectedCashAccount || !cashBookId) return 0;
    return selectedCashAccount.balance ?? 0;
  }, [selectedCashAccount, cashBookId]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!tableSearch.trim()) return items;
    const q = tableSearch.toLowerCase();
    return items.filter(
      (it) =>
        it.transactionType?.toLowerCase().includes(q) ||
        it.recipientOrPayer?.toLowerCase().includes(q) ||
        it.correspondingDoc?.toLowerCase().includes(q) ||
        it.reference?.toLowerCase().includes(q) ||
        it.remark?.toLowerCase().includes(q)
    );
  }, [items, tableSearch]);

  // Total accumulated amount of all lines
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [items]);

  // Handle saving line item from modal
  const handleSaveItem = (item: CashTransactionLineItem) => {
    if (editingItemIndex !== null && editingItemIndex >= 0) {
      setItems((prev) => {
        const next = [...prev];
        next[editingItemIndex] = item;
        return next;
      });
      setEditingItemIndex(null);
    } else {
      setItems((prev) => [...prev, item]);
    }
  };

  // Handle deleting line item
  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit complete transaction voucher
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!branchId) {
      setErrorMessage('Silakan pilih Branch (Cabang).');
      return;
    }

    if (!documentType) {
      setErrorMessage('Silakan pilih Document Type (Cash Receipt atau Cash Issue).');
      return;
    }

    if (!cashBookId) {
      setErrorMessage('Silakan pilih Cash Book (Buku Kas / Rekening).');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Silakan tambahkan minimal 1 baris transaksi dengan menekan tombol "+ Add Transaction".');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];

    setIsSubmitting(true);
    try {
      const payload: Omit<CashTransaction, 'id' | 'transactionNumber' | 'createdAt'> = {
        tenantId: tenant.id,
        transactionDate,
        type: documentType,
        source: items.some((i) => i.transactionType?.includes('Claim Expense'))
          ? 'claim_expense'
          : items.some((i) => i.transactionType?.includes('Penerimaan Penagihan'))
          ? 'direct_receipt'
          : 'direct_expense',
        branchId,
        branchName: selectedBranch?.name || 'Kantor Pusat',
        accountId: selectedCashAccount?.id || cashBookId,
        accountName: selectedCashAccount?.name || 'Kas Operasional',
        cashBookBalance,
        currency: 'IDR',
        amount: totalAmount,
        recipientOrPayer: items[0]?.recipientOrPayer || 'Operasional',
        costCenterCode: items[0]?.costCenterCode,
        notes: items.map((i) => i.remark).filter(Boolean).join('; '),
        items,
        createdBy: currentUser.fullName || 'Finance Cashier'
      };

      const branchSuffix = DocumentNumberingService.resolveBranchSuffix(branchId, branches);
      const created = await CashTransactionService.createCashTransaction(payload, tenant.id, {
        tenantCode: tenant?.tenantNumber || '001',
        branchSuffix
      });

      // 1. UPDATE LIQUID BALANCE OF SELECTED CASH / BANK ACCOUNT (SINGLE GATE OF TRUTH)
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === selectedCashAccount?.id || acc.code === selectedCashAccount?.code) {
            const currentBal = acc.balance ?? 0;
            const updatedBal =
              documentType === 'receipt' ? currentBal + totalAmount : Math.max(0, currentBal - totalAmount);
            return {
              ...acc,
              balance: updatedBal
            };
          }
          return acc;
        })
      );

      // Also update bankAccounts state if this account matches a bank
      setBankAccounts((prevBankAccounts) =>
        prevBankAccounts.map((bank) => {
          if (bank.glAccountCode === selectedCashAccount?.code || bank.id === selectedCashAccount?.id) {
            const currentBal = bank.balance ?? 0;
            const updatedBal =
              documentType === 'receipt' ? currentBal + totalAmount : Math.max(0, currentBal - totalAmount);
            return {
              ...bank,
              balance: updatedBal
            };
          }
          return bank;
        })
      );

      // 2. IF ITEMS CONTAIN RECEIVE PAYMENTS (PENERIMAAN PENAGIHAN), MARK AS DEPOSITED
      const depositedDocNumbers = items
        .filter((it) => it.transactionType?.includes('Penerimaan Penagihan') && it.correspondingDoc)
        .map((it) => it.correspondingDoc!);

      if (depositedDocNumbers.length > 0) {
        setReceivePayments((prevRP) =>
          prevRP.map((rp) => {
            if (depositedDocNumbers.includes(rp.paymentNumber) || depositedDocNumbers.includes(rp.id)) {
              return {
                ...rp,
                isDeposited: true,
                depositedAt: new Date().toISOString(),
                cashTransactionId: created.id,
                cashTransactionNumber: created.transactionNumber
              };
            }
            return rp;
          })
        );
      }

      addToast(
        'Transaksi Kas Berhasil Disimpan',
        `Voucher ${created.transactionNumber} senilai Rp ${totalAmount.toLocaleString('id-ID')} berhasil dibukukan. Saldo ${selectedCashAccount?.name} telah diperbarui.`,
        'success'
      );

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi kas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. MASTER INFORMATION CARD: TWO COLUMNS (MEDIST 4.0 IMAGE 3)          */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <h2 className="text-base font-bold text-[#0F172A] tracking-tight pb-2 border-b border-[#E2E8F0]">
          Cash Transaction
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* SISI KIRI */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Branch <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  {branches
                    .filter((b) => b.isActive || b.id === branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== branchId}>
                        {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Document Type (Cash Receipt vs Cash Issue) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Document Type <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value as any);
                    setItems([]); // Clear line items if type changes to prevent mismatched types
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] font-semibold"
                >
                  <option value="receipt">Cash Receipt (Kas Masuk)</option>
                  <option value="issue">Cash Issue (Kas Keluar)</option>
                </select>
              </div>
            </div>

            {/* Cash Book */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Cash Book <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 relative flex items-center">
                <select
                  value={cashBookId}
                  onChange={(e) => setCashBookId(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="">--- Select ---</option>
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
                {cashBookId && (
                  <button
                    type="button"
                    onClick={() => setCashBookId('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    title="Hapus pilihan buku kas"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SISI KANAN */}
          <div className="space-y-3">
            {/* Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#64748B]">Balance</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={cashBookBalance.toLocaleString('id-ID')}
                  className="w-full text-xs font-mono font-bold bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#64748B]">Currency</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value="IDR - Indonesian Rupiahs"
                  className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION: + ADD TRANSACTION BUTTON (ZYVORA ERP STANDARD)          */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setEditingItemIndex(null);
            setIsItemModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-4 py-2 rounded-lg bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>

        {/* Search & Show entries for table */}
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
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search..."
              className="w-44 sm:w-52 text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[#0F172A] pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. 10-COLUMN ITEMS TABLE (EXACT MATCH TO MEDIST 4.0 IMAGE 3)          */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1]">
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
                <th className="py-2.5 px-3">Transaction Type</th>
                <th className="py-2.5 px-3">Recipient/Payer</th>
                <th className="py-2.5 px-3">Corresponding Doc</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Sub Branch Code</th>
                <th className="py-2.5 px-3 text-center">HQ</th>
                <th className="py-2.5 px-3">CA HQ PIC</th>
                <th className="py-2.5 px-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[#64748B]">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemIndex(idx);
                            setIsItemModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-[#086288] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit baris"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Transaction Type */}
                    <td className="py-2 px-3 font-medium text-[#0F172A]">
                      {item.transactionType}
                    </td>

                    {/* Recipient / Payer */}
                    <td className="py-2 px-3 font-semibold text-[#0F172A]">
                      <div>{item.recipientOrPayer}</div>
                      {item.recipientOrPayerCode && (
                        <span className="text-[10px] font-mono text-[#086288] bg-[#EFF7FA] px-1 py-0.5 rounded">
                          {item.recipientOrPayerCode}
                        </span>
                      )}
                    </td>

                    {/* Corresponding Doc */}
                    <td className="py-2 px-3 font-mono font-bold text-[#086288]">
                      {item.correspondingDoc || '-'}
                    </td>

                    {/* Reference */}
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                      {item.reference || '-'}
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                      {item.amount.toLocaleString('id-ID')}
                    </td>

                    {/* Sub Branch Code */}
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {item.subBranchCode || '-'}
                    </td>

                    {/* HQ */}
                    <td className="py-2 px-3 text-center text-slate-600">
                      {item.hq || '-'}
                    </td>

                    {/* CA HQ PIC */}
                    <td className="py-2 px-3 text-slate-600">
                      {item.caHqPic || '-'}
                    </td>

                    {/* Remark */}
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={item.remark}>
                      {item.remark || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Total Summary Row (Matches MEDIST 4.0 Image 3) */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[#64748B]">
            Showing {filteredItems.length === 0 ? 0 : 1} to {filteredItems.length} of {filteredItems.length} entries
          </span>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#0F172A]">Total</span>
            <div className="w-56 px-3 py-1.5 text-xs font-mono font-bold bg-[#E2E8F0]/60 border border-[#CBD5E1] rounded-lg text-[#0F172A] text-right">
              {totalAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. FORM ACTIONS BAR (ZYVORA STANDARD: SUBMIT TEAL & CANCEL NEUTRAL)   */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          Fields marked with <span className="text-rose-500 font-bold">*</span> are required.
        </span>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Memproses...' : 'Submit'}</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] disabled:opacity-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Transaction Line Modal */}
      <AddCashTransactionItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItemIndex(null);
        }}
        documentType={documentType || 'receipt'}
        onSave={handleSaveItem}
        initialItem={editingItemIndex !== null ? items[editingItemIndex] : null}
      />
    </div>
  );
};
