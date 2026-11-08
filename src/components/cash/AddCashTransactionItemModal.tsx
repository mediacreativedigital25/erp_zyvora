import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Receipt,
  AlertCircle,
  FileText,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { CashTransactionLineItem, ExpenseClaim, Customer, ReceivePayment } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { ClaimExpenseLookupModal } from './ClaimExpenseLookupModal';
import { ReceivePaymentLookupModal } from './ReceivePaymentLookupModal';
import { CustomerLookupModal } from '../sales/CustomerLookupModal';

interface AddCashTransactionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'receipt' | 'issue';
  onSave: (item: CashTransactionLineItem) => void;
  initialItem?: CashTransactionLineItem | null;
}

export const AddCashTransactionItemModal: React.FC<AddCashTransactionItemModalProps> = ({
  isOpen,
  onClose,
  documentType,
  onSave,
  initialItem
}) => {
  const { receivePayments, branches } = useErp();

  // Form Fields (Matching MEDIST 4.0 Image 4)
  const [transactionType, setTransactionType] = useState<string>('');
  const [recipientOrPayerCode, setRecipientOrPayerCode] = useState<string>('');
  const [recipientOrPayer, setRecipientOrPayer] = useState<string>('');
  const [correspondingDoc, setCorrespondingDoc] = useState<string>('');
  const [correspondingDocTitle, setCorrespondingDocTitle] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [subBranchCode, setSubBranchCode] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isClaimLookupOpen, setIsClaimLookupOpen] = useState<boolean>(false);
  const [isReceivePaymentLookupOpen, setIsReceivePaymentLookupOpen] = useState<boolean>(false);
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState<boolean>(false);

  // Identify customers who have active, un-deposited Receive Payments that are APPROVED
  const customersWithPendingPayments = useMemo(() => {
    const codes = new Set<string>();
    receivePayments.forEach((p) => {
      if (p.status === 'approved' && !p.isDeposited && p.customerCode) {
        codes.add(p.customerCode);
      }
    });
    return Array.from(codes);
  }, [receivePayments]);

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setTransactionType(initialItem.transactionType || '');
        setRecipientOrPayerCode(initialItem.recipientOrPayerCode || '');
        setRecipientOrPayer(initialItem.recipientOrPayer || '');
        setCorrespondingDoc(initialItem.correspondingDoc || '');
        setCorrespondingDocTitle(initialItem.remark?.slice(0, 40) || '');
        setReference(initialItem.reference || '');
        setAmount(String(initialItem.amount || 0));
        setSubBranchCode(initialItem.subBranchCode || initialItem.costCenterCode || '');
        setRemark(initialItem.remark || '');
      } else {
        // Default clean state based on document type
        setTransactionType(
          documentType === 'receipt' ? '73003 - Penerimaan Penagihan' : '73001 - Claim Expense'
        );
        setRecipientOrPayerCode('');
        setRecipientOrPayer('');
        setCorrespondingDoc('');
        setCorrespondingDocTitle('');
        setReference('');
        setAmount('0');
        setSubBranchCode(branches[0]?.code || '');
        setRemark('');
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialItem, documentType, branches]);

  // When a Claim Expense is selected from modal
  const handleSelectClaim = (claim: ExpenseClaim) => {
    setCorrespondingDoc(claim.claimNumber);
    setCorrespondingDocTitle(claim.notes || 'Klaim Biaya Operasional');
    setReference(claim.claimNumber);
    setAmount(String(claim.totalAmount));
    setRecipientOrPayer(claim.requestByName);
    setRecipientOrPayerCode(claim.requestByUserId || 'EMP');
    setSubBranchCode(claim.items[0]?.costCenterCode || branches[0]?.code || '');
    setRemark(
      `Pencairan klaim biaya ${claim.claimNumber} (${claim.notes || 'Operasional'})`
    );
  };

  // When a Receive Payment is selected from modal
  const handleSelectReceivePayment = (rp: ReceivePayment) => {
    setCorrespondingDoc(rp.paymentNumber);
    const invoiceSummary = rp.allocations?.map((a) => a.invoiceNumber).join(', ') || rp.documentNumber || '-';
    setCorrespondingDocTitle(`Pelunasan Faktur: ${invoiceSummary}`);
    setRecipientOrPayerCode(rp.customerCode);
    setRecipientOrPayer(rp.customerName);
    setReference(rp.documentNumber || rp.paymentMethods?.[0]?.documentNumber || rp.paymentNumber);
    setAmount(String(rp.totalPaymentAmount));
    setSubBranchCode(rp.branchCode || branches[0]?.code || '');
    setRemark(
      `Penerimaan setoran penagihan ${rp.paymentNumber} dari ${rp.customerName}`
    );
  };

  // When a Customer is selected from CustomerLookupModal
  const handleSelectCustomer = (customer: Customer) => {
    setRecipientOrPayerCode(customer.customerCode);
    setRecipientOrPayer(customer.name);

    // Auto-check if this customer has exactly 1 approved, un-deposited Receive Payment
    const customerPayments = receivePayments.filter(
      (p) => p.status === 'approved' && !p.isDeposited && (p.customerCode === customer.customerCode || p.customerId === customer.id)
    );

    if (customerPayments.length === 1) {
      handleSelectReceivePayment(customerPayments[0]);
    } else {
      // Clear doc so user chooses from lookup
      setCorrespondingDoc('');
      setCorrespondingDocTitle('');
      setAmount('0');
    }
  };

  // Trigger search on Recipient/Payer (🔍)
  const handleRecipientSearchClick = () => {
    if (transactionType.includes('Penerimaan Penagihan')) {
      setIsCustomerLookupOpen(true);
    } else if (transactionType.includes('Claim Expense')) {
      setIsClaimLookupOpen(true);
    }
  };

  // Trigger search on Corresponding Doc (🔍)
  const handleCorrespondingDocSearchClick = () => {
    if (transactionType.includes('Penerimaan Penagihan')) {
      setIsReceivePaymentLookupOpen(true);
    } else if (transactionType.includes('Claim Expense')) {
      setIsClaimLookupOpen(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!transactionType) {
      setErrorMessage('Silakan pilih Transaction Type.');
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      setErrorMessage('Amount harus lebih besar dari Rp 0.');
      return;
    }

    if (!recipientOrPayer.trim()) {
      setErrorMessage(
        documentType === 'issue'
          ? 'Penerima dana (Recipient) wajib diisi.'
          : 'Pembayar (Payer) wajib diisi.'
      );
      return;
    }

    if (transactionType.includes('Penerimaan Penagihan') && !correspondingDoc.trim()) {
      setErrorMessage('Corresponding Doc (Nomor Receive Payment) wajib dipilih untuk Penerimaan Penagihan.');
      return;
    }

    const item: CashTransactionLineItem = {
      id: initialItem?.id || `item_${Date.now()}`,
      transactionType,
      recipientOrPayer: recipientOrPayer.trim(),
      recipientOrPayerCode: recipientOrPayerCode.trim() || undefined,
      correspondingDoc: correspondingDoc.trim() || undefined,
      reference: reference.trim() || undefined,
      amount: numAmount,
      subBranchCode: subBranchCode.trim() || undefined,
      costCenterCode: subBranchCode.trim() || undefined,
      remark: remark.trim()
    };

    onSave(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              Add Cash Transaction
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Form (Horizontal Rows Matching MEDIST 4.0 Image 4) */}
          <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Row 1: Transaction Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Transaction Type <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 relative flex items-center">
                <select
                  value={transactionType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setTransactionType(newType);
                    setCorrespondingDoc('');
                    setCorrespondingDocTitle('');
                    setReference('');
                    setAmount('0');
                    setRecipientOrPayer('');
                    setRecipientOrPayerCode('');
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] cursor-pointer"
                >
                  <option value="">--- Select ---</option>
                  {documentType === 'receipt' ? (
                    <>
                      <option value="73003 - Penerimaan Penagihan">73003 - Penerimaan Penagihan</option>
                      <option value="73005 - Transfer Kas/Bank Masuk">73005 - Transfer Kas/Bank Masuk</option>
                      <option value="73006 - Setoran Kas Lainnya">73006 - Setoran Kas Lainnya</option>
                    </>
                  ) : (
                    <>
                      <option value="73001 - Claim Expense">73001 - Claim Expense</option>
                      <option value="73002 - Cash Advance">73002 - Cash Advance</option>
                      <option value="73004 - Biaya Operasional / Pengeluaran Langsung">
                        73004 - Biaya Operasional / Pengeluaran Langsung
                      </option>
                    </>
                  )}
                </select>
                {transactionType && (
                  <button
                    type="button"
                    onClick={() => setTransactionType('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-0.5"
                    title="Hapus Pilihan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Recipient/Payer (Code input with 🔍 + Name display box) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Recipient/Payer <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 grid grid-cols-5 gap-2">
                {/* Code with Search Button */}
                <div className="col-span-2 relative">
                  <input
                    type="text"
                    value={recipientOrPayerCode}
                    onChange={(e) => setRecipientOrPayerCode(e.target.value)}
                    placeholder="Kode..."
                    className="w-full text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#086288] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                  <button
                    type="button"
                    onClick={handleRecipientSearchClick}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#086288] hover:text-[#064B6A] cursor-pointer"
                    title="Cari Pelanggan / Pihak Terkait"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Name Box */}
                <div className="col-span-3">
                  <input
                    type="text"
                    value={recipientOrPayer}
                    onChange={(e) => setRecipientOrPayer(e.target.value)}
                    placeholder="Nama pihak pembayar / penerima..."
                    className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Corresponding Doc (Code with 🔍 + Document Info Box) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Corresponding Doc {transactionType.includes('Penerimaan Penagihan') && <span className="text-rose-500">*</span>}
              </label>
              <div className="sm:col-span-2 grid grid-cols-5 gap-2">
                {/* Doc Code with Search Button */}
                <div className="col-span-2 relative">
                  <input
                    type="text"
                    value={correspondingDoc}
                    onChange={(e) => setCorrespondingDoc(e.target.value)}
                    placeholder="Doc No..."
                    className="w-full text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#086288] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                  <button
                    type="button"
                    onClick={handleCorrespondingDocSearchClick}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#086288] hover:text-[#064B6A] cursor-pointer"
                    title={
                      transactionType.includes('Penerimaan Penagihan')
                        ? 'Cari Dokumen Receive Payment'
                        : 'Cari Dokumen Klaim Biaya (Approved)'
                    }
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Title / Description Box */}
                <div className="col-span-3">
                  <input
                    type="text"
                    readOnly
                    value={correspondingDocTitle}
                    placeholder="Info Dokumen Rujukan..."
                    className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-600 truncate cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Reference with 🔍 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Reference</label>
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="No. referensi transfer, no. cek, bilyet giro, memo..."
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 pr-8 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
                <button
                  type="button"
                  onClick={handleCorrespondingDocSearchClick}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#086288] cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Row 5: Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Row 6: Sub Branch Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Sub Branch Code</label>
              <div className="sm:col-span-2">
                <select
                  value={subBranchCode}
                  onChange={(e) => setSubBranchCode(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="">--- Select ---</option>
                  {branches
                    .filter((b) => b.isActive || b.code === subBranchCode)
                    .map((b) => (
                      <option key={b.id} value={b.code} disabled={!b.isActive && b.code !== subBranchCode}>
                        {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Row 7: Remark */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="text-xs font-semibold text-[#0F172A] pt-2">Remark</label>
              <div className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Catatan transaksi..."
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Modal Actions (Zyvora Standard: Save Deep Teal & Cancel Neutral Secondary) */}
            <div className="pt-4 border-t border-[#CBD5E1] flex justify-end gap-2.5">
              <button
                type="submit"
                className="h-9 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] shadow-2xs transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#CBD5E1] shadow-2xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lookup Modals (Stacking on Top of Add Item Modal: z-[70]) */}
      <ClaimExpenseLookupModal
        isOpen={isClaimLookupOpen}
        onClose={() => setIsClaimLookupOpen(false)}
        onSelectClaim={handleSelectClaim}
      />

      <ReceivePaymentLookupModal
        isOpen={isReceivePaymentLookupOpen}
        onClose={() => setIsReceivePaymentLookupOpen(false)}
        onSelectPayment={handleSelectReceivePayment}
        filterCustomerCode={recipientOrPayerCode || undefined}
        zIndex="z-[70]"
      />

      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        allowedCustomerCodes={customersWithPendingPayments}
        title="Pilih Pelanggan (Hanya yang memiliki Receive Payment)"
        emptyMessage="Tidak ada pelanggan dengan dokumen Receive Payment yang belum disetorkan."
        zIndex="z-[70]"
      />
    </>
  );
};
