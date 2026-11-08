import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  FileCheck2,
  Check,
  AlertCircle,
  Building2
} from 'lucide-react';
import {
  CashTransaction,
  CashTransactionType,
  CashTransactionSource,
  ExpenseClaim,
  ExpenseClaimDisbursementMethod
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { CashTransactionService } from '../../services/cashTransactionService';

interface AddCashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (tx: CashTransaction) => void;
}

export const AddCashTransactionModal: React.FC<AddCashTransactionModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { tenant, currentUser, accounts, addToast } = useErp();

  const [type, setType] = useState<CashTransactionType | ''>('issue');
  const [source, setSource] = useState<CashTransactionSource>('claim_expense');
  const [approvedClaims, setApprovedClaims] = useState<ExpenseClaim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');

  const [accountId, setAccountId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<string>('');
  const [recipientOrPayer, setRecipientOrPayer] = useState<string>('');
  const [costCenterCode, setCostCenterCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [disbursementMethod, setDisbursementMethod] = useState<ExpenseClaimDisbursementMethod>('petty_cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load eligible approved claims when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form states
      setType('issue');
      setSource('claim_expense');
      setSelectedClaimId('');
      setAmount('');
      setRecipientOrPayer('');
      setCostCenterCode('');
      setNotes('');
      setDisbursementMethod('petty_cash');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setErrorMessage(null);

      // Default to Kas Kecil or first available cash account
      const defaultAccount = accounts.find((a) => a.name.toLowerCase().includes('kecil')) || accounts[0];
      setAccountId(defaultAccount?.id || '');

      // Fetch approved claims ready for disbursement
      CashTransactionService.getApprovedClaimsForDisbursement(tenant.id).then((claims) => {
        setApprovedClaims(claims);
      });
    }
  }, [isOpen, tenant.id, accounts]);

  // Handle claim selection and auto-populate
  const handleClaimSelect = (claimId: string) => {
    setSelectedClaimId(claimId);
    if (!claimId) {
      setAmount('');
      setRecipientOrPayer('');
      setCostCenterCode('');
      setNotes('');
      return;
    }

    const claim = approvedClaims.find((c) => c.id === claimId);
    if (claim) {
      setAmount(String(claim.totalAmount));
      setRecipientOrPayer(claim.requestByName);
      setCostCenterCode(claim.items[0]?.costCenterCode || '');
      setNotes(`Pencairan reimbursement klaim biaya ${claim.claimNumber} (${claim.notes || 'Operasional'})`);
      setDisbursementMethod(claim.disbursementMethod || 'petty_cash');

      // Pre-select appropriate account based on claim disbursement method
      if (claim.disbursementMethod === 'petty_cash') {
        const pettyAccount = accounts.find((a) => a.name.toLowerCase().includes('kecil') || a.code === '1002');
        if (pettyAccount) setAccountId(pettyAccount.id);
      } else {
        const bankAccount = accounts.find((a) => a.category === 'Kas & Bank' && !a.name.toLowerCase().includes('kecil'));
        if (bankAccount) setAccountId(bankAccount.id);
      }
    }
  };

  if (!isOpen) return null;

  const numericAmount = parseFloat(amount) || 0;
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!type) {
      setErrorMessage('Silakan pilih tipe transaksi kas (Receipt atau Issue).');
      return;
    }

    if (!accountId) {
      setErrorMessage('Silakan pilih akun kas / bank.');
      return;
    }

    if (type === 'issue' && source === 'claim_expense' && !selectedClaimId) {
      setErrorMessage('Silakan pilih dokumen klaim biaya yang sudah disetujui (Approved).');
      return;
    }

    if (numericAmount <= 0) {
      setErrorMessage('Nominal transaksi kas harus lebih besar dari Rp 0.');
      return;
    }

    if (!recipientOrPayer.trim()) {
      setErrorMessage(
        type === 'issue'
          ? 'Nama penerima dana (Dibayarkan Kepada) wajib diisi.'
          : 'Nama pembayar (Diterima Dari) wajib diisi.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClaim = approvedClaims.find((c) => c.id === selectedClaimId);

      const created = await CashTransactionService.createCashTransaction(
        {
          tenantId: tenant.id,
          transactionDate,
          type: type as CashTransactionType,
          source,
          referenceId: selectedClaim?.id,
          referenceNumber: selectedClaim?.claimNumber,
          accountId,
          accountName: selectedAccount?.name || 'Kas Operasional',
          amount: numericAmount,
          recipientOrPayer: recipientOrPayer.trim(),
          costCenterCode: costCenterCode || undefined,
          notes: notes.trim() || undefined,
          disbursementMethod,
          createdBy: currentUser.fullName || 'Finance Cashier'
        },
        tenant.id
      );

      addToast(
        'Transaksi Kas Berhasil Dicatat',
        type === 'issue' && source === 'claim_expense'
          ? `Pencairan dana ${created.transactionNumber} berhasil dicatat. Status klaim ${created.referenceNumber} kini Lunas (Paid).`
          : `Transaksi kas ${created.transactionNumber} berhasil dicatat.`,
        'success'
      );

      onSaved(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi kas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Modal Container: WIDENED TO max-w-4xl lg:max-w-5xl */}
      <div className="bg-white rounded-xl shadow-xl max-w-4xl lg:max-w-5xl w-full overflow-hidden border border-[#DCE5EC] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                Tambah Transaksi Kas (Cash Transaction)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Transaction Type Toggle (Receipt vs Issue) */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE5EC] space-y-3">
            <label className="block font-semibold text-[#0F172A]">
              Tipe Transaksi Kas <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  type === 'issue'
                    ? 'bg-[#EFF7FA] border-[#086288] text-[#086288] ring-1 ring-[#086288]'
                    : 'bg-white border-[#DCE5EC] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="txType"
                  value="issue"
                  checked={type === 'issue'}
                  onChange={() => setType('issue')}
                  className="sr-only"
                />
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#0F172A]">Pengeluaran Kas (Cash Issue / Disbursement)</div>
                  <div className="text-[11px] text-[#475569]">Pencairan klaim biaya, biaya dinas, atau pembayaran operasional</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  type === 'receipt'
                    ? 'bg-[#EFF7FA] border-[#086288] text-[#086288] ring-1 ring-[#086288]'
                    : 'bg-white border-[#DCE5EC] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="txType"
                  value="receipt"
                  checked={type === 'receipt'}
                  onChange={() => setType('receipt')}
                  className="sr-only"
                />
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#0F172A]">Penerimaan Kas (Cash Receipt)</div>
                  <div className="text-[11px] text-[#475569]">Setoran modal, penerimaan non-penjualan, atau pengembalian kasbon</div>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Issue Configuration (Source: Claim Expense vs Direct) */}
          {type === 'issue' && (
            <div className="p-4 rounded-lg bg-[#EFF7FA]/40 border border-[#B7DDEA] space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5">
                    Sumber Pengeluaran Kas (Source) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as CashTransactionSource)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-semibold"
                  >
                    <option value="claim_expense">Pencairan Klaim Biaya (Claim Expense)</option>
                    <option value="direct_expense">Pengeluaran Langsung / Lain-lain (Direct Expense)</option>
                  </select>
                </div>

                {source === 'claim_expense' && (
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
                      <span>Pilih Dokumen Klaim (Approved Only) <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-[#086288] font-bold">
                        {approvedClaims.length} Voucher Tersedia
                      </span>
                    </label>
                    <select
                      value={selectedClaimId}
                      onChange={(e) => handleClaimSelect(e.target.value)}
                      className="w-full bg-white border border-[#086288] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] font-medium"
                    >
                      <option value="">-- Pilih Dokumen Klaim yang Telah Disetujui --</option>
                      {approvedClaims.length === 0 ? (
                        <option disabled value="">
                          Tidak ada klaim berstatus Approved yang belum dicairkan
                        </option>
                      ) : (
                        approvedClaims.map((claim) => (
                          <option key={claim.id} value={claim.id}>
                            {claim.claimNumber} — {claim.requestByName} (Rp {claim.totalAmount.toLocaleString('id-ID')}) — {claim.claimDate}
                          </option>
                        ))
                      )}
                    </select>
                    {approvedClaims.length === 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Catatan: Hanya klaim yang sudah di-Approve di menu <strong>Approval</strong> yang dapat dicairkan di sini.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Account, Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cash/Bank Account */}
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Akun Kas / Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
              >
                <option value="">-- Pilih Akun Kas/Bank --</option>
                {accounts
                  .filter((a) => a.category === 'Kas & Bank')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name} (Saldo: Rp {acc.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Tanggal Transaksi Kas <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Nominal Transaksi (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#94A3B8] font-semibold text-xs">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  readOnly={type === 'issue' && source === 'claim_expense' && Boolean(selectedClaimId)}
                  placeholder="Contoh: 350000"
                  className={`w-full border rounded-md pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] ${
                    type === 'issue' && source === 'claim_expense' && Boolean(selectedClaimId)
                      ? 'bg-[#F8FAFC] border-[#DCE5EC] cursor-not-allowed'
                      : 'bg-white border-[#DCE5EC]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 4. Recipient / Payer and Cost Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                {type === 'issue' ? 'Dibayarkan Kepada (Recipient)' : 'Diterima Dari (Payer)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={recipientOrPayer}
                onChange={(e) => setRecipientOrPayer(e.target.value)}
                placeholder={type === 'issue' ? 'Nama karyawan / vendor penerima...' : 'Nama pihak pembayar...'}
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
                <span>Alokasi Cost Center</span>
                <span className="text-[10px] text-[#64748B] font-normal">Opsional</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={costCenterCode}
                  onChange={(e) => setCostCenterCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CC04001"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                />
              </div>
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Keterangan Transaksi (Notes / Remark)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masukkan rincian keperluan atau catatan bukti transaksi kas..."
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#DCE5EC]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Kas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
