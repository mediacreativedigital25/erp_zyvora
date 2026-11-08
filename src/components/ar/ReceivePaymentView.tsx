import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Printer,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Trash2,
  Zap,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  FileCheck2,
  Clock,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { getTodayDateString } from '../../utils/dateUtils';
import {
  ReceivePayment,
  PaymentMethodEntry,
  PaymentInvoiceAllocation,
  Customer,
  SalesInvoice
} from '../../types/erp';
import { BaseModal } from '../common/BaseModal';
import { CustomerLookupModal } from '../sales/CustomerLookupModal';
import { angkaTerbilang } from '../../utils/terbilang';

export const ReceivePaymentView: React.FC = () => {
  const {
    tenant,
    branches,
    customers,
    invoices,
    setInvoices,
    receivePayments,
    setReceivePayments,
    collectors,
    employees,
    serviceBookings,
    createReceivePayment,
    approveReceivePayment,
    companyProfile,
    bankAccounts,
    addToast
  } = useErp();

  // Mode: List View or Create/Add View
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Multi-Selection State for bulk actions
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // FILTER STATE (MEDIST 4.0 Standard: 2 Columns)
  // ---------------------------------------------------------------------------
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>(getTodayDateString());
  const [filterEndDate, setFilterEndDate] = useState<string>(getTodayDateString());
  const [filterCustomer, setFilterCustomer] = useState<{ id?: string; code?: string; name?: string }>({});
  const [filterCollectorId, setFilterCollectorId] = useState<string>('all');
  const [filterPaymentNumFrom, setFilterPaymentNumFrom] = useState<string>('');
  const [filterPaymentNumTo, setFilterPaymentNumTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Pagination Controls
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState<boolean>(false);
  const [customerLookupTarget, setCustomerLookupTarget] = useState<'filter' | 'form'>('filter');
  const [detailModalPayment, setDetailModalPayment] = useState<ReceivePayment | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [paymentsToPrint, setPaymentsToPrint] = useState<ReceivePayment[]>([]);

  // ---------------------------------------------------------------------------
  // CREATE / ADD FORM STATE (Matching media_1793544015928_aab9fcdb.png)
  // ---------------------------------------------------------------------------
  const [formBranchId, setFormBranchId] = useState<string>(branches[0]?.id || 'br_01');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentAllocation, setPaymentAllocation] = useState<'automatic' | 'manual'>('automatic');
  const [fromInvCollection, setFromInvCollection] = useState<'Yes' | 'No'>('Yes');
  const [invCollectionNumber, setInvCollectionNumber] = useState<string>('COL-202611-001');
  const [formCollectorId, setFormCollectorId] = useState<string>(collectors[0]?.id || '');
  const [formCustomer, setFormCustomer] = useState<Customer | null>(null);
  const [currency, setCurrency] = useState<string>('IDR - Indonesian Rupiahs');

  // Section 1: Payment Methods List
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethodEntry[]>([
    {
      id: `pm_${Date.now()}_1`,
      paymentMethod: 'bank_transfer',
      paymentDescription: 'Transfer Bank BCA Rekening Tenant',
      documentNumber: '',
      amount: 0
    }
  ]);

  // Section 2: Invoices to Settle List
  const [allocationsList, setAllocationsList] = useState<PaymentInvoiceAllocation[]>([]);

  // Active Tenant Display Name
  const tenantDisplayName = useMemo(() => {
    return companyProfile?.brandName || companyProfile?.legalName || tenant.name;
  }, [companyProfile, tenant]);

  // Primary Bank Account
  const primaryBank = useMemo(() => {
    return bankAccounts[0] || {
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '882-991-3481',
      accountHolderName: tenantDisplayName
    };
  }, [bankAccounts, tenantDisplayName]);

  // Real Sales PIC / Collectors dynamically derived from real registered employees
  const availableCollectors = useMemo(() => {
    const activeEmps = (employees || []).filter((e) => e.status === 'active');
    const sourceEmps = activeEmps.length > 0 ? activeEmps : (employees || []);
    return sourceEmps.map((emp, idx) => ({
      id: emp.id,
      code: emp.employeeCode ? `PIC-${emp.employeeCode.slice(-3)}` : `PIC-${String(idx + 1).padStart(2, '0')}`,
      name: `${emp.fullName} (${emp.position || 'Sales PIC'})`,
      phone: emp.phone,
      branchId: emp.branchId,
      status: 'active' as const
    }));
  }, [employees]);

  useEffect(() => {
    if (!formCollectorId && availableCollectors.length > 0) {
      setFormCollectorId(availableCollectors[0].id);
    }
  }, [availableCollectors, formCollectorId]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterStartDate(getTodayDateString());
    setFilterEndDate(getTodayDateString());
    setFilterCustomer({});
    setFilterCollectorId('all');
    setFilterPaymentNumFrom('');
    setFilterPaymentNumTo('');
    setFilterStatus('all');
    setFilterSource('all');
    setSearchTableQuery('');
    setCurrentPage(1);
    addToast('Filter Direset', 'Kriteria pencarian telah dikembalikan ke awal.', 'info');
  };

  // Filtered Payments Dataset
  const filteredPayments = useMemo(() => {
    return receivePayments.filter((p) => {
      if (filterBranchId !== 'all' && p.branchId !== filterBranchId && p.branchCode !== filterBranchId) {
        return false;
      }
      if (filterStartDate && p.paymentDate < filterStartDate) {
        return false;
      }
      if (filterEndDate && p.paymentDate > filterEndDate) {
        return false;
      }
      if (filterCustomer.id && p.customerId !== filterCustomer.id) {
        return false;
      }
      if (filterCollectorId !== 'all' && p.collectorId !== filterCollectorId && p.collectorCode !== filterCollectorId) {
        return false;
      }
      if (filterPaymentNumFrom && p.paymentNumber < filterPaymentNumFrom) {
        return false;
      }
      if (filterPaymentNumTo && p.paymentNumber > filterPaymentNumTo) {
        return false;
      }
      if (filterStatus !== 'all' && p.status !== filterStatus) {
        return false;
      }
      if (filterSource !== 'all' && p.source.toLowerCase() !== filterSource.toLowerCase()) {
        return false;
      }
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchNum = p.paymentNumber.toLowerCase().includes(q);
        const matchCust = p.customerName.toLowerCase().includes(q) || p.customerCode.toLowerCase().includes(q);
        const matchCol = p.collectorName?.toLowerCase().includes(q) || p.collectorCode?.toLowerCase().includes(q);
        const matchDoc = p.documentNumber.toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchCol && !matchDoc) {
          return false;
        }
      }
      return true;
    });
  }, [
    receivePayments,
    filterBranchId,
    filterStartDate,
    filterEndDate,
    filterCustomer,
    filterCollectorId,
    filterPaymentNumFrom,
    filterPaymentNumTo,
    filterStatus,
    filterSource,
    searchTableQuery
  ]);

  // Paginated Table Data
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / entriesPerPage));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredPayments.slice(start, start + entriesPerPage);
  }, [filteredPayments, currentPage, entriesPerPage]);

  // Handle Select All Checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(paginatedPayments.map((p) => p.id));
    } else {
      setSelectedPaymentIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds((prev) => [...prev, id]);
    } else {
      setSelectedPaymentIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // When form customer changes, load matching unpaid / partially paid invoices
  const handleCustomerSelected = (cust: Customer) => {
    setFormCustomer(cust);
    setIsCustomerLookupOpen(false);

    // Find unpaid/partially_paid invoices for this customer
    const matchingInvoices = invoices.filter(
      (inv) =>
        (inv.customerId === cust.id || inv.customerCode === cust.customerCode) &&
        (inv.status === 'unpaid' || inv.status === 'partially_paid')
    );

    const newAllocations: PaymentInvoiceAllocation[] = matchingInvoices.map((inv) => ({
      id: `alloc_${inv.id}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerCode: inv.customerCode,
      customerName: inv.customerName,
      dueDate: inv.dueDate,
      invoiceAmount: inv.totalAmount,
      outstandingBalance: inv.outstandingBalance || inv.totalAmount,
      paidAmount: 0,
      method: 'Automatic',
      documentNumber: inv.sourceNumber || ''
    }));

    setAllocationsList(newAllocations);

    // Auto-detect Sales PIC from active Service Booking or Invoice of this customer
    const customerBooking = serviceBookings.find(
      (b) =>
        (b.customerId === cust.id || b.customerCode === cust.customerCode) &&
        Boolean(b.salesPicName)
    );

    const customerInvoiceWithPic = matchingInvoices.find((inv) => Boolean(inv.salesPicName));
    const targetPicName = customerBooking?.salesPicName || customerInvoiceWithPic?.salesPicName;

    if (targetPicName) {
      // Find matching collector by name or partial name from available collectors
      const matchedCollector = availableCollectors.find((c) => {
        const rawPic = targetPicName.toLowerCase();
        const rawCol = c.name.toLowerCase();
        return rawCol.includes(rawPic) || rawPic.includes(rawCol.split(' (')[0].trim().toLowerCase());
      });

      if (matchedCollector) {
        setFormCollectorId(matchedCollector.id);
        addToast(
          'Sales PIC Tersinkronisasi',
          `Collector disesuaikan otomatis dengan Sales PIC: ${matchedCollector.name}`,
          'info'
        );
      }
    }

    // Auto-fill payment method amount if 0 and invoice exists
    if (matchingInvoices.length > 0 && paymentMethodsList.length === 1 && paymentMethodsList[0].amount === 0) {
      const firstInvOutstanding = matchingInvoices[0].outstandingBalance || matchingInvoices[0].totalAmount;
      setPaymentMethodsList([
        {
          ...paymentMethodsList[0],
          amount: firstInvOutstanding,
          paymentDescription: `Pelunasan Faktur ${matchingInvoices[0].invoiceNumber}`
        }
      ]);
    }
  };

  // Add new payment method row
  const handleAddPaymentMethod = () => {
    const newEntry: PaymentMethodEntry = {
      id: `pm_${Date.now()}_${paymentMethodsList.length + 1}`,
      paymentMethod: 'bank_transfer',
      paymentDescription: 'Penerimaan Transfer Bank Rekening Tenant',
      documentNumber: '',
      amount: 0
    };
    setPaymentMethodsList((prev) => [...prev, newEntry]);
  };

  // Remove payment method row
  const handleRemovePaymentMethod = (id: string) => {
    if (paymentMethodsList.length <= 1) {
      addToast('Batas Minimal', 'Minimal harus terdapat 1 metode pembayaran.', 'warning');
      return;
    }
    setPaymentMethodsList((prev) => prev.filter((p) => p.id !== id));
  };

  // Total Payment Amount from payment methods
  const totalPaymentAmount = useMemo(() => {
    return paymentMethodsList.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [paymentMethodsList]);

  // Total Allocated Amount across invoices
  const totalAllocatedAmount = useMemo(() => {
    return allocationsList.reduce((sum, it) => sum + (Number(it.paidAmount) || 0), 0);
  }, [allocationsList]);

  // Execute Auto-Allocation (FIFO: distribute totalPaymentAmount across invoices)
  const handleExecuteAllocation = () => {
    if (totalPaymentAmount <= 0) {
      addToast('Nominal Kosong', 'Silakan masukkan nominal pembayaran pada tabel Add Payment terlebih dahulu.', 'warning');
      return;
    }

    if (allocationsList.length === 0) {
      addToast('Tidak Ada Faktur', 'Tidak ada faktur unpaid yang dapat dialokasikan untuk pelanggan ini.', 'warning');
      return;
    }

    let remainingFunds = totalPaymentAmount;
    const updated = allocationsList.map((item) => {
      const needed = item.outstandingBalance || item.invoiceAmount;
      if (remainingFunds <= 0) {
        return { ...item, paidAmount: 0, method: 'Automatic' };
      }
      const canPay = Math.min(remainingFunds, needed);
      remainingFunds -= canPay;
      return {
        ...item,
        paidAmount: canPay,
        method: 'Automatic'
      };
    });

    setAllocationsList(updated);
    addToast(
      'Alokasi Otomatis Berhasil',
      `Dana Rp ${totalPaymentAmount.toLocaleString('id-ID')} berhasil dialokasikan ke ${updated.filter((u) => u.paidAmount > 0).length} faktur tagihan.`,
      'success'
    );
  };

  // Submit Receive Payment (Self-Approval or Dual-Control)
  const handleSubmitReceivePayment = (statusToSave: 'approved' | 'pending' | 'draft') => {
    if (!formCustomer) {
      addToast('Pelanggan Wajib Dipilih', 'Silakan tentukan pelanggan pembayar terlebih dahulu.', 'warning');
      return;
    }

    if (totalPaymentAmount <= 0) {
      addToast('Nominal Pembayaran Kosong', 'Total nilai pembayaran harus lebih besar dari Rp 0.', 'warning');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === formBranchId) || branches[0];
    const selectedCollector = availableCollectors.find((c) => c.id === formCollectorId) || availableCollectors[0];

    const newPayment = createReceivePayment({
      branchId: selectedBranch.id,
      branchCode: selectedBranch.code,
      branchName: selectedBranch.name,
      documentNumber: documentNumber.trim() || `KWT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      paymentDate,
      paymentAllocation,
      fromInvoiceCollection: fromInvCollection === 'Yes',
      invoiceCollectionNumber: fromInvCollection === 'Yes' ? invCollectionNumber : undefined,
      collectorId: selectedCollector?.id,
      collectorCode: selectedCollector?.code,
      collectorName: selectedCollector?.name,
      customerId: formCustomer.id,
      customerCode: formCustomer.customerCode,
      customerName: formCustomer.name,
      currency: 'IDR',
      totalPaymentAmount,
      totalAllocatedAmount,
      paymentMethods: paymentMethodsList,
      allocations: allocationsList.filter((a) => a.paidAmount > 0),
      source: 'MANUAL',
      status: statusToSave,
      isChecked: statusToSave === 'approved',
      notes: `Penerimaan pembayaran ${
        statusToSave === 'approved'
          ? 'resmi terotorisasi (Self-Approval)'
          : statusToSave === 'pending'
          ? 'menunggu persetujuan (Pending Approval)'
          : 'draft'
      } melalui ${paymentMethodsList.map((p) => p.paymentMethod).join(', ')}.`
    });

    if (statusToSave === 'approved') {
      addToast(
        'Penerimaan Disetujui (Approved)',
        `Transaksi senilai Rp ${totalPaymentAmount.toLocaleString('id-ID')} langsung disetujui & siap disetor ke Kas/Bank.`,
        'success'
      );
    } else if (statusToSave === 'pending') {
      addToast(
        'Diajukan untuk Approval',
        `Transaksi senilai Rp ${totalPaymentAmount.toLocaleString('id-ID')} berhasil diajukan dan menunggu persetujuan atasan.`,
        'info'
      );
    }

    // Reset Form & Switch back to List View
    setViewMode('list');
    setDocumentNumber('');
    setFormCustomer(null);
    setPaymentMethodsList([
      {
        id: `pm_${Date.now()}_1`,
        paymentMethod: 'bank_transfer',
        paymentDescription: 'Transfer Bank BCA Rekening Tenant',
        documentNumber: '',
        amount: 0
      }
    ]);
    setAllocationsList([]);
  };

  // Status Badge Styler
  const renderStatusBadge = (status: string, isChecked?: boolean) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
            <FileText className="w-3 h-3" />
            <span>Draft</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER VIEW MODE: CREATE / ADD FORM (IMAGE 2)
  // ---------------------------------------------------------------------------
  if (viewMode === 'create') {
    const selectedBranch = branches.find((b) => b.id === formBranchId) || branches[0];

    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        {/* 1. Header Card 2-Kolom: General Payment Info */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
            {/* Sisi Kiri */}
            <div className="space-y-3">
              {/* Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  >
                    {branches
                      .filter((b) => b.isActive || b.id === formBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== formBranchId}>
                          {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Document Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Document Number
                </label>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Auto-generated / Manual slip"
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                </div>
              </div>

              {/* Payment Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Payment Allocation <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={paymentAllocation}
                    onChange={(e) => setPaymentAllocation(e.target.value as 'automatic' | 'manual')}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  >
                    <option value="automatic">Automatic (FIFO)</option>
                    <option value="manual">Manual Allocation</option>
                  </select>
                </div>
              </div>

              {/* From Inv. Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  From Inv. Collection <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={fromInvCollection}
                    onChange={(e) => setFromInvCollection(e.target.value as 'Yes' | 'No')}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Inv. Collection Number */}
              {fromInvCollection === 'Yes' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <label className="text-xs font-semibold text-[#0F172A]">
                    Inv. Collection Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={invCollectionNumber}
                      onChange={(e) => setInvCollectionNumber(e.target.value)}
                      placeholder="e.g. COL-202611-001"
                      className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sisi Kanan */}
            <div className="space-y-3">
              {/* Sys Number (Read-only) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">Sys Number</label>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    disabled
                    value={`SYS-RP-${new Date().toISOString().slice(0, 7).replace('-', '')}-AUTO`}
                    className="w-full text-xs bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#64748B] font-mono select-none"
                  />
                </div>
              </div>

              {/* Collector / Sales PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Collector / Sales PIC <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={formCollectorId}
                    onChange={(e) => setFormCollectorId(e.target.value)}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  >
                    {availableCollectors.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.code} - {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">Sub Branch</label>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    disabled
                    value={selectedBranch.name}
                    className="w-full text-xs bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#64748B] select-none"
                  />
                </div>
              </div>

              {/* Customer Selection with Lookup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={formCustomer ? `${formCustomer.customerCode} - ${formCustomer.name}` : ''}
                      placeholder="Select Customer..."
                      onClick={() => {
                        setCustomerLookupTarget('form');
                        setIsCustomerLookupOpen(true);
                      }}
                      className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] cursor-pointer pr-9 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerLookupTarget('form');
                        setIsCustomerLookupOpen(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#086288] hover:text-[#064B6A] cursor-pointer"
                      title="Buka Pencarian Pelanggan"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  {formCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormCustomer(null);
                        setAllocationsList([]);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Pilihan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Currency <span className="text-rose-500">*</span>
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  >
                    <option value="IDR - Indonesian Rupiahs">IDR - Indonesian Rupiahs</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Section 1: Payment Method Breakdown (Add Payment) */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Metode & Nilai Pembayaran</h3>
                <p className="text-[11px] text-[#64748B]">
                  Rincian instrumen keuangan yang diserahkan pelanggan (bisa multi-metode: Tunai, Transfer, Giro, dll).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddPaymentMethod}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment</span>
            </button>
          </div>

          <div className="border border-[#CBD5E1] rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1]">
                  <th className="py-2 px-3 w-12 text-center">Action</th>
                  <th className="py-2 px-3 w-48">Payment Method</th>
                  <th className="py-2 px-3">Payment Description</th>
                  <th className="py-2 px-3 w-48">Document Number</th>
                  <th className="py-2 px-3 w-44 text-right">Amount (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {paymentMethodsList.map((pm, idx) => (
                  <tr key={pm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(pm.id)}
                        disabled={paymentMethodsList.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={pm.paymentMethod}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setPaymentMethodsList((prev) =>
                            prev.map((item) =>
                              item.id === pm.id
                                ? {
                                    ...item,
                                    paymentMethod: val,
                                    paymentDescription:
                                      val === 'cash'
                                        ? 'Penerimaan Tunai Toko'
                                        : val === 'bank_transfer'
                                        ? 'Transfer Bank BCA Rekening Tenant'
                                        : val === 'giro'
                                        ? 'Bilyet Giro Bank'
                                        : val === 'qris'
                                        ? 'Scan QRIS Kasir POS'
                                        : 'Pembayaran Kartu Kredit'
                                  }
                                : item
                            )
                          );
                        }}
                        className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash / Tunai</option>
                        <option value="giro">Giro</option>
                        <option value="cheque">Cheque / Cek</option>
                        <option value="qris">QRIS</option>
                        <option value="credit_card">Credit Card</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={pm.paymentDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaymentMethodsList((prev) =>
                            prev.map((item) => (item.id === pm.id ? { ...item, paymentDescription: val } : item))
                          );
                        }}
                        placeholder="Keterangan cara bayar..."
                        className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={pm.documentNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaymentMethodsList((prev) =>
                            prev.map((item) => (item.id === pm.id ? { ...item, documentNumber: val } : item))
                          );
                        }}
                        placeholder="No. Ref / No. Cek"
                        className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-[#0F172A] font-mono focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={pm.amount || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setPaymentMethodsList((prev) =>
                            prev.map((item) => (item.id === pm.id ? { ...item, amount: val } : item))
                          );
                        }}
                        placeholder="0"
                        className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-right font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Payment Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg">
            <div className="text-xs text-[#475569]">
              <span>Terbilang: </span>
              <strong className="text-[#086288] italic">"{angkaTerbilang(totalPaymentAmount)} Rupiah"</strong>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">Total Payment:</span>
              <span className="text-base font-extrabold font-mono text-[#086288]">
                Rp {totalPaymentAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Section 2: Invoices to Settle (Alokasi Faktur) */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Daftar Tagihan Faktur Penjualan</h3>
                <p className="text-[11px] text-[#64748B]">
                  Faktur-faktur berstatus Unpaid / Partially Paid milik pelanggan yang akan dipotong dan dilunasi.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteAllocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Execute Auto-Allocation (FIFO)</span>
            </button>
          </div>

          <div className="border border-[#CBD5E1] rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1]">
                  <th className="py-2 px-3 w-44">Invoice Number</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3 w-28 text-center">Due Date</th>
                  <th className="py-2 px-3 w-36 text-right">Invoice Amount</th>
                  <th className="py-2 px-3 w-36 text-right">Outstanding</th>
                  <th className="py-2 px-3 w-40 text-right bg-[#EFF7FA] text-[#086288]">Paid Amount (IDR)</th>
                  <th className="py-2 px-3 w-24 text-center">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {allocationsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B]">
                      {formCustomer
                        ? 'Tidak ada faktur Unpaid untuk pelanggan ini. Semua tagihan sudah lunas.'
                        : 'Pilih Customer terlebih dahulu pada form di atas untuk memuat daftar faktur tagihan.'}
                    </td>
                  </tr>
                ) : (
                  allocationsList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[#086288]">
                        {item.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-[#0F172A]">
                        {item.customerName}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-rose-600 font-semibold">
                        {item.dueDate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        Rp {item.invoiceAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-[#0F172A]">
                        Rp {item.outstandingBalance.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right bg-[#EFF7FA]/50">
                        <input
                          type="number"
                          min="0"
                          max={item.outstandingBalance}
                          value={item.paidAmount || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setAllocationsList((prev) =>
                              prev.map((al) => (al.id === item.id ? { ...al, paidAmount: val, method: 'Manual' } : al))
                            );
                          }}
                          placeholder="0"
                          className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-right font-mono font-bold text-[#086288] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.method}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Allocation Balance Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs">
            <div>
              <span className="text-[#64748B] block">Total Dana Pembayaran:</span>
              <strong className="text-[#0F172A] font-mono text-sm">
                Rp {totalPaymentAmount.toLocaleString('id-ID')}
              </strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Total Teralokasi ke Faktur:</span>
              <strong className="text-[#16A34A] font-mono text-sm">
                Rp {totalAllocatedAmount.toLocaleString('id-ID')}
              </strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Sisa Saldo Belum Teralokasi (Deposit):</span>
              <strong
                className={`font-mono text-sm ${
                  totalPaymentAmount - totalAllocatedAmount < 0 ? 'text-rose-600' : 'text-[#086288]'
                }`}
              >
                Rp {(totalPaymentAmount - totalAllocatedAmount).toLocaleString('id-ID')}
              </strong>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 4. FORM ACTIONS BAR (BOTTOM RIGHT — 100% CONSISTENT WITH ZYVORA/MEDIST)*/}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Fields marked with <span className="text-rose-500 font-bold">*</span> are required.
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmitReceivePayment('draft')}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmitReceivePayment('pending')}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Simpan sebagai transaksi yang membutuhkan persetujuan atasan/finance"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Submit for Approval</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmitReceivePayment('approved')}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Setujui langsung (Self-Approval) dan alokasikan pelunasan faktur"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Submit & Settle (Approve Langsung)</span>
            </button>
          </div>
        </div>

        {/* Customer Lookup Modal */}
        <CustomerLookupModal
          isOpen={isCustomerLookupOpen}
          onClose={() => setIsCustomerLookupOpen(false)}
          onSelectCustomer={handleCustomerSelected}
          title="Pilih Pelanggan Pembayar"
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER VIEW MODE: LIST VIEW (IMAGE 1)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (MEDIST 4.0 STANDARD DESIGN)           */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* Sisi Kiri */}
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
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Payment Date</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Customer Lookup Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Customer</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={filterCustomer.name ? `${filterCustomer.code || ''} - ${filterCustomer.name}` : ''}
                    placeholder="All Customers (click to search)"
                    onClick={() => {
                      setCustomerLookupTarget('filter');
                      setIsCustomerLookupOpen(true);
                    }}
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerLookupTarget('filter');
                      setIsCustomerLookupOpen(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#086288] hover:text-[#064B6A] cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                {filterCustomer.name && (
                  <button
                    type="button"
                    onClick={() => setFilterCustomer({})}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Filter Pelanggan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Collector</label>
              <div className="sm:col-span-2">
                <select
                  value={filterCollectorId}
                  onChange={(e) => setFilterCollectorId(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">--- Select Collector ---</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter & Reset Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    addToast('Filter Diterapkan', `Menampilkan ${filteredPayments.length} transaksi pembayaran.`, 'info');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
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

          {/* Sisi Kanan */}
          <div className="space-y-3">
            {/* Cust. Payment Number Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Cust. Payment Number</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={filterPaymentNumFrom}
                    onChange={(e) => setFilterPaymentNumFrom(e.target.value)}
                    placeholder="From..."
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] font-mono pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={filterPaymentNumTo}
                    onChange={(e) => setFilterPaymentNumTo(e.target.value)}
                    placeholder="To..."
                    className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] font-mono pr-8 focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Source */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Source</label>
              <div className="sm:col-span-2">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">All Sources</option>
                  <option value="MANUAL">Manual Entry</option>
                  <option value="SYSTEM">System Auto-Post</option>
                  <option value="ONLINE">Online Payment / Gateway</option>
                </select>
              </div>
            </div>

            {/* Indicator Legend */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-2.5 bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-medium">
                <div className="w-3.5 h-3.5 bg-[#B7DDEA] border border-[#086288] rounded-xs shrink-0" />
                <span>: Payment has not been checked (Pembayaran baru / belum diverifikasi kasir)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ACTION TOOLBAR & CONTROL STRIP                                     */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Receive Payment</span>
          </button>

          <button
            type="button"
            disabled={selectedPaymentIds.length === 0}
            onClick={() => {
              const selectedItems = receivePayments.filter((p) => selectedPaymentIds.includes(p.id));
              setPaymentsToPrint(selectedItems);
              setIsPrintModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print Selected Receive Payment</span>
            {selectedPaymentIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF7FA] text-[#086288]">
                {selectedPaymentIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={selectedPaymentIds.length === 0}
            onClick={() => {
              addToast('Permohonan Koreksi', `Pengajuan koreksi untuk ${selectedPaymentIds.length} pembayaran telah dikirim ke supervisor.`, 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#B7DDEA] hover:bg-[#EFF7FA] text-[#086288] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Request Correction for Selected</span>
          </button>
        </div>

        {/* Right: Show entries & Quick In-Table Search */}
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
      {/* 3. UNIVERSAL 11-COLUMN TABLE (MEDIST 4.0 STANDARD)                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1]">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedPayments.length > 0 &&
                      paginatedPayments.every((p) => selectedPaymentIds.includes(p.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#086288] rounded border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 w-36 text-center">Action</th>
                <th className="py-2.5 px-3 w-44">Cust. Payment Num</th>
                <th className="py-2.5 px-3 w-28 text-center">Payment Date</th>
                <th className="py-2.5 px-3 w-20 text-center">Collector</th>
                <th className="py-2.5 px-3">Collector Name</th>
                <th className="py-2.5 px-3 w-20 text-center">Customer</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3 w-32 text-right">Amount</th>
                <th className="py-2.5 px-3 w-20 text-center">Source</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-[#EFF7FA] flex items-center justify-center text-[#086288] mb-3">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-[#0F172A] mb-1">
                        {receivePayments.length === 0
                          ? 'Workspace Siap — Belum Ada Transaksi Pembayaran'
                          : 'Tidak Ada Transaksi Sesuai Filter'}
                      </h3>
                      <p className="text-xs text-[#64748B] mb-4 text-center leading-relaxed">
                        {receivePayments.length === 0
                          ? 'Seluruh data demo telah dibersihkan. Belum ada catatan penerimaan pembayaran piutang. Klik tombol di bawah untuk mencatat pelunasan faktur penjualan pelanggan.'
                          : 'Tidak ditemukan transaksi penerimaan pembayaran dengan kriteria filter saat ini. Silakan ubah kriteria atau tekan tombol Reset.'}
                      </p>
                      {receivePayments.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewMode('create')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Receive Payment</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const isChecked = p.isChecked ?? (p.status === 'approved');
                  const rowBg = !isChecked ? 'bg-[#CCFBF1]/40 hover:bg-[#CCFBF1]/60' : 'bg-white hover:bg-slate-50/80';

                  return (
                    <tr key={p.id} className={`${rowBg} transition-colors`}>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPaymentIds.includes(p.id)}
                          onChange={(e) => handleSelectRow(p.id, e.target.checked)}
                          className="w-3.5 h-3.5 text-[#086288] rounded border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                        />
                      </td>

                      {/* Action: Detail & Approve */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailModalPayment(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#086288] hover:bg-[#064B6A] text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                            title="Lihat Detail Rincian Pembayaran"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>

                          {p.status !== 'approved' ? (
                            <button
                              type="button"
                              onClick={() => approveReceivePayment(p.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Otorisasi & Setujui Pembayaran"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded select-none">
                              ✓ Approved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cust. Payment Num */}
                      <td className="py-2 px-3 font-mono font-bold text-[#086288]">
                        {p.paymentNumber}
                      </td>

                      {/* Payment Date */}
                      <td className="py-2 px-3 text-center font-mono text-[#475569]">
                        {p.paymentDate}
                      </td>

                      {/* Collector Code */}
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-semibold">
                          {p.collectorCode || '-'}
                        </span>
                      </td>

                      {/* Collector Name */}
                      <td className="py-2 px-3 font-medium text-[#0F172A] truncate max-w-[140px]">
                        {p.collectorName || '-'}
                      </td>

                      {/* Customer Code */}
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#EFF7FA] font-mono text-[10px] text-[#086288] font-bold">
                          {p.customerCode}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-2 px-3 font-semibold text-[#0F172A] truncate max-w-[200px]">
                        {p.customerName}
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                        {p.totalPaymentAmount.toLocaleString('id-ID')}
                      </td>

                      {/* Source */}
                      <td className="py-2 px-3 text-center">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {p.source || 'MANUAL'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {renderStatusBadge(p.status, p.isChecked)}
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
              {filteredPayments.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredPayments.length)}
            </span>{' '}
            of <span className="font-bold text-[#0F172A]">{filteredPayments.length}</span> entries
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
              if (p === currentPage - 2 || p === currentPage + 2) {
                return (
                  <span key={p} className="px-1 text-slate-400">
                    ...
                  </span>
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

      {/* Customer Lookup Modal */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={(c: Customer) => {
          if (customerLookupTarget === 'filter') {
            setFilterCustomer({ id: c.id, code: c.customerCode, name: c.name });
          } else {
            handleCustomerSelected(c);
          }
          setIsCustomerLookupOpen(false);
        }}
        title="Pilih Pelanggan"
      />

      {/* Detail Inspection Modal */}
      {detailModalPayment && (
        <BaseModal
          isOpen={!!detailModalPayment}
          onClose={() => setDetailModalPayment(null)}
          title={`Detail Receive Payment: ${detailModalPayment.paymentNumber}`}
          description={`Penerimaan pembayaran dari ${detailModalPayment.customerName} (${detailModalPayment.customerCode})`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#64748B]">
                Status:{' '}
                <strong className="text-[#0F172A] uppercase font-bold">{detailModalPayment.status}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentsToPrint([detailModalPayment]);
                    setIsPrintModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kuitansi Resmi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalPayment(null)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Payment Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg">
              <div>
                <span className="text-[#64748B] block text-[11px]">Tanggal Pembayaran:</span>
                <strong className="text-[#0F172A] font-mono">{detailModalPayment.paymentDate}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Cabang / Unit:</span>
                <strong className="text-[#0F172A]">{detailModalPayment.branchName} ({detailModalPayment.branchCode})</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Collector PIC:</span>
                <strong className="text-[#086288]">{detailModalPayment.collectorName || '-'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Total Penerimaan:</span>
                <strong className="text-[#16A34A] font-mono text-sm font-bold">
                  Rp {detailModalPayment.totalPaymentAmount.toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h4 className="font-bold text-[#0F172A] mb-1.5">Rincian Cara Bayar (Payment Methods)</h4>
              <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#CBD5E1]">
                    <tr>
                      <th className="py-1.5 px-3">Metode</th>
                      <th className="py-1.5 px-3">Keterangan</th>
                      <th className="py-1.5 px-3">No. Dokumen</th>
                      <th className="py-1.5 px-3 text-right">Nominal (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {detailModalPayment.paymentMethods.map((pm) => (
                      <tr key={pm.id}>
                        <td className="py-1.5 px-3 font-semibold capitalize text-[#0F172A]">{pm.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-1.5 px-3 text-slate-600">{pm.paymentDescription}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-500">{pm.documentNumber || '-'}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                          Rp {pm.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Settle */}
            <div>
              <h4 className="font-bold text-[#0F172A] mb-1.5">Alokasi Pelunasan Faktur Penjualan</h4>
              {detailModalPayment.allocations.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-dashed border-[#CBD5E1] rounded-lg text-center text-[#64748B]">
                  Belum dialokasikan ke faktur spesifik (tercatat sebagai saldo titipan/deposit pelanggan).
                </div>
              ) : (
                <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#CBD5E1]">
                      <tr>
                        <th className="py-1.5 px-3">Nomor Faktur</th>
                        <th className="py-1.5 px-3">Jatuh Tempo</th>
                        <th className="py-1.5 px-3 text-right">Nilai Faktur</th>
                        <th className="py-1.5 px-3 text-right">Alokasi Terbayar</th>
                        <th className="py-1.5 px-3 text-center">Metode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {detailModalPayment.allocations.map((al) => (
                        <tr key={al.id}>
                          <td className="py-1.5 px-3 font-mono font-bold text-[#086288]">{al.invoiceNumber}</td>
                          <td className="py-1.5 px-3 text-slate-600 font-mono">{al.dueDate}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                            Rp {al.invoiceAmount.toLocaleString('id-ID')}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#16A34A]">
                            Rp {al.paidAmount.toLocaleString('id-ID')}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {al.method}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </BaseModal>
      )}

      {/* Official Receipt Print Modal */}
      {isPrintModalOpen && paymentsToPrint.length > 0 && (
        <BaseModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Kuitansi Penerimaan Pembayaran (Kwitansi Resmi)`}
          description={`Mencetak ${paymentsToPrint.length} bukti penerimaan kas/bank berstandar dokumen resmi.`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#64748B]">
                Format Dokumen Resmi Kuitansi Otorisasi Tenant
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kuitansi (A4 / PDF)</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {paymentsToPrint.map((p) => (
              <div
                key={p.id}
                className="p-6 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-4 font-sans text-[#0F172A]"
              >
                {/* Header KOP */}
                <div className="flex items-start justify-between border-b-2 border-[#086288] pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-[#086288] uppercase tracking-wide">
                      {tenantDisplayName}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      {companyProfile?.address || 'Gedung Menara Mandiri Lt. 18, Bandung'} • Telp: {companyProfile?.phone || '+62 21 5289 0000'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                      BUKTI PENERIMAAN KAS / BANK
                    </span>
                    <div className="text-sm font-extrabold font-mono pt-1">{p.paymentNumber}</div>
                    <div className="text-[11px] text-[#64748B] font-mono">Tgl: {p.paymentDate}</div>
                  </div>
                </div>

                {/* Receipt Body */}
                <div className="grid grid-cols-3 gap-2 text-xs py-2">
                  <span className="text-[#64748B]">Telah Diterima Dari:</span>
                  <span className="col-span-2 font-bold text-[#0F172A]">{p.customerName} ({p.customerCode})</span>

                  <span className="text-[#64748B]">Jumlah Uang:</span>
                  <span className="col-span-2 font-extrabold font-mono text-sm text-[#086288]">
                    Rp {p.totalPaymentAmount.toLocaleString('id-ID')}
                  </span>

                  <span className="text-[#64748B]">Terbilang:</span>
                  <span className="col-span-2 italic text-[#0F172A] bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                    "{angkaTerbilang(p.totalPaymentAmount)} Rupiah"
                  </span>

                  <span className="text-[#64748B]">Untuk Pembayaran:</span>
                  <span className="col-span-2 text-[#0F172A]">
                    {p.notes || `Pelunasan piutang faktur penjualan via ${p.paymentMethods[0]?.paymentMethod || 'transfer'}`}
                  </span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-[#CBD5E1]">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Disetujui & Diterima Oleh</span>
                    <span className="font-bold text-[#0F172A] block pt-0.5">Kasir / Finance Department</span>
                    <div className="h-12 flex items-center justify-center"></div>
                    <div className="border-b border-[#0F172A] w-40 mx-auto mb-1"></div>
                    <span className="font-bold text-[#086288] block truncate">{tenantDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Penyetor / Pelanggan</span>
                    <span className="font-bold text-[#0F172A] block pt-0.5">Tanda Tangan & Cap</span>
                    <div className="h-12 flex items-center justify-center"></div>
                    <div className="border-b border-[#0F172A] w-40 mx-auto mb-1"></div>
                    <span className="font-bold text-[#0F172A] block truncate">( {p.customerName} )</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BaseModal>
      )}
    </div>
  );
};
