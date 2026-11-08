import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Printer,
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import {
  SalesInvoice,
  InvoiceStatus,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { getTodayDateString } from '../../utils/dateUtils';
import { BaseModal } from '../common/BaseModal';
import { CustomerLookupModal } from './CustomerLookupModal';
import { angkaTerbilang } from '../../utils/terbilang';

export const SalesPrintInvoiceView: React.FC = () => {
  const {
    tenant,
    invoices,
    setInvoices,
    branches,
    salesOrders,
    serviceBookings,
    customers,
    companyProfile,
    bankAccounts,
    addToast
  } = useErp();

  // Active Tenant Entity Name (Strictly displays Tenant name instead of platform Zyvora)
  const tenantEntityName = useMemo(() => {
    if (companyProfile?.brandName && !companyProfile.brandName.toLowerCase().includes('zyvora')) {
      return companyProfile.brandName;
    }
    if (companyProfile?.legalName && !companyProfile.legalName.toLowerCase().includes('zyvora')) {
      return companyProfile.legalName;
    }
    if (tenant?.name && !tenant.name.toLowerCase().includes('zyvora')) {
      return tenant.name;
    }
    return companyProfile?.brandName || companyProfile?.legalName || tenant?.name || 'Hizaki Wedding Planner';
  }, [tenant, companyProfile]);

  // =========================================================================
  // TWO-COLUMN FILTER CARD STATES (MEDIST 4.0 PRINT DELIVERY ORDER STANDARD)
  // =========================================================================
  // Left Column Filters
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(getTodayDateString());
  const [dateTo, setDateTo] = useState<string>(getTodayDateString());
  const [filterCustomer, setFilterCustomer] = useState<{ id: string; code: string; name: string } | null>(null);
  const [filterDoNumber, setFilterDoNumber] = useState<string>('all');
  const [filterOrderNumber, setFilterOrderNumber] = useState<string>('all');

  // Right Column Filters
  const [filterSalesman, setFilterSalesman] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [printStatusFilter, setPrintStatusFilter] = useState<'all' | 'printed' | 'not_printed'>('all');

  // Customer Lookup Modal State
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);

  // Table Controls & Pagination
  const [tableSearch, setTableSearch] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Row Selection (Multi-select)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Print Mode Options (Matching MEDIST 4.0: Blanko vs Print with Price)
  const [printWithPrice, setPrintWithPrice] = useState<boolean>(true);
  const [isBlanko, setIsBlanko] = useState<boolean>(false);

  // Inspection & Printable Modal State
  const [batchInvoicesToPrint, setBatchInvoicesToPrint] = useState<SalesInvoice[]>([]);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [batchActivePageIndex, setBatchActivePageIndex] = useState<number>(0);

  // Helper to resolve DO Number
  const resolveDoNumber = (inv: SalesInvoice): string => {
    if (inv.deliveryOrderNumber) return inv.deliveryOrderNumber;
    const cleanSourceId = inv.sourceId
      ? inv.sourceId.replace(/^(sb_sb_|so_so_)/, (m) => (m === 'sb_sb_' ? 'sb_' : 'so_'))
      : '';
    const foundSo = salesOrders.find(
      (so) => so.orderNumber === inv.sourceNumber || so.id === inv.sourceId || so.id === cleanSourceId
    );
    if (foundSo?.deliveryOrderNumber) return foundSo.deliveryOrderNumber;
    const foundSb = serviceBookings.find(
      (sb) => sb.bookingNumber === inv.sourceNumber || sb.id === inv.sourceId || sb.id === cleanSourceId
    );
    if (foundSb?.deliveryOrderNumber) return foundSb.deliveryOrderNumber;
    return `DO0120261000001`;
  };

  // Helper to resolve Sales PIC / Salesman
  const resolveSalesman = (inv: SalesInvoice): string => {
    if (inv.salesPicName) return inv.salesPicName;
    const cleanSourceId = inv.sourceId
      ? inv.sourceId.replace(/^(sb_sb_|so_so_)/, (m) => (m === 'sb_sb_' ? 'sb_' : 'so_'))
      : '';
    const foundSb = serviceBookings.find(
      (sb) => sb.bookingNumber === inv.sourceNumber || sb.id === inv.sourceId || sb.id === cleanSourceId
    );
    if (foundSb?.salesPicName) return foundSb.salesPicName;
    return 'David Pratama';
  };

  // Unique DO Numbers for dropdown filter
  const allDoNumbers = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => set.add(resolveDoNumber(inv)));
    return Array.from(set);
  }, [invoices, salesOrders, serviceBookings]);

  // Unique Order Numbers for dropdown filter
  const allOrderNumbers = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => set.add(inv.sourceNumber));
    return Array.from(set);
  }, [invoices]);

  // Unique Salesmen for dropdown filter
  const allSalesmen = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => set.add(resolveSalesman(inv)));
    return Array.from(set);
  }, [invoices, serviceBookings]);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Branch Filter
      if (filterBranchId !== 'all') {
        if (inv.branchId && inv.branchId !== filterBranchId && inv.branchCode !== filterBranchId) {
          return false;
        }
      }

      // 2. Date Range Filter (invoiceDate)
      if (dateFrom && inv.invoiceDate < dateFrom) return false;
      if (dateTo && inv.invoiceDate > dateTo) return false;

      // 3. Customer Filter
      if (filterCustomer) {
        if (inv.customerId !== filterCustomer.id && inv.customerCode !== filterCustomer.code) {
          return false;
        }
      }

      // 4. DO Number Filter
      if (filterDoNumber !== 'all') {
        if (resolveDoNumber(inv) !== filterDoNumber) return false;
      }

      // 5. Order Number Filter
      if (filterOrderNumber !== 'all') {
        if (inv.sourceNumber !== filterOrderNumber) return false;
      }

      // 6. Salesman Filter
      if (filterSalesman !== 'all') {
        if (resolveSalesman(inv) !== filterSalesman) return false;
      }

      // 7. Payment Status Filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }

      // 8. Print Status Filter
      if (printStatusFilter !== 'all') {
        const isPrinted = inv.isPrinted === true;
        if (printStatusFilter === 'printed' && !isPrinted) return false;
        if (printStatusFilter === 'not_printed' && isPrinted) return false;
      }

      // 9. Instant Table Search Query
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchSource = inv.sourceNumber.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q);
        const matchCode = inv.customerCode.toLowerCase().includes(q);
        const matchDo = resolveDoNumber(inv).toLowerCase().includes(q);
        if (!matchNo && !matchSource && !matchCust && !matchCode && !matchDo) return false;
      }

      return true;
    });
  }, [
    invoices,
    filterBranchId,
    dateFrom,
    dateTo,
    filterCustomer,
    filterDoNumber,
    filterOrderNumber,
    filterSalesman,
    statusFilter,
    printStatusFilter,
    tableSearch,
    salesOrders,
    serviceBookings
  ]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / entriesPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredInvoices.slice(start, start + entriesPerPage);
  }, [filteredInvoices, currentPage, entriesPerPage]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterBranchId('all');
    setDateFrom(getTodayDateString());
    setDateTo(getTodayDateString());
    setFilterCustomer(null);
    setFilterDoNumber('all');
    setFilterOrderNumber('all');
    setFilterSalesman('all');
    setStatusFilter('all');
    setPrintStatusFilter('all');
    setTableSearch('');
    setCurrentPage(1);
    setSelectedInvoiceIds([]);
  };

  // Toggle Selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoiceIds.length === paginatedInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(paginatedInvoices.map((i) => i.id));
    }
  };

  // Mark invoice as printed
  const markInvoicesAsPrinted = (ids: string[]) => {
    const nowStr = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) =>
        ids.includes(inv.id) ? { ...inv, isPrinted: true, printedAt: nowStr } : inv
      )
    );
  };

  // Batch / Single Print Trigger: User must checklist invoice(s) and click Print
  const handlePrintBatch = () => {
    if (selectedInvoiceIds.length === 0) {
      addToast(
        'Pilih Faktur',
        'Silakan beri tanda centang (checklist) pada satu atau beberapa faktur yang ingin dicetak.',
        'info'
      );
      return;
    }

    const selectedList = invoices.filter((i) => selectedInvoiceIds.includes(i.id));
    if (selectedList.length === 0) {
      addToast('Pilih Faktur', 'Tidak ada faktur valid yang terpilih.', 'warning');
      return;
    }

    markInvoicesAsPrinted(selectedInvoiceIds);
    setBatchInvoicesToPrint(selectedList);
    setBatchActivePageIndex(0);
    setIsBatchPrintModalOpen(true);
  };

  // Status Badge Styler
  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" /> BELUM LUNAS
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            SEBAGIAN
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> LUNAS
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            JATUH TEMPO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
            {status}
          </span>
        );
    }
  };

  // Print Status Badge Styler
  const renderPrintStatusBadge = (isPrinted?: boolean) => {
    if (isPrinted) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> PRINTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        <Clock className="w-2.5 h-2.5 text-slate-400" /> NOT PRINTED YET
      </span>
    );
  };

  // Primary Bank for Invoice Payment (Accounts under Tenant entity name)
  const primaryBank = useMemo(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      const found = bankAccounts.find((b) => b.isActive) || bankAccounts[0];
      return {
        ...found,
        accountHolderName:
          found.accountHolderName && !found.accountHolderName.toLowerCase().includes('zyvora')
            ? found.accountHolderName
            : tenantEntityName
      };
    }
    return {
      bankName: 'PT Bank Central Asia Tbk (BCA)',
      accountNumber: '802-991-3401',
      accountHolderName: tenantEntityName
    };
  }, [bankAccounts, tenantEntityName]);

  // Helper to render an authentic A4 Invoice Sheet (Optimized for guaranteed 1-page fit with fixed 15-row clean grid, 2-column signatures & pinned bottom)
  const renderSingleInvoiceA4 = (inv: SalesInvoice, pageNum?: number, totalPages?: number) => {
    const doNumber = resolveDoNumber(inv);
    const terbilangRupiah = angkaTerbilang(inv.totalAmount);
    const discount1 = inv.discount1 ?? (inv.discountTotal > 0 ? inv.discountTotal : 0);
    const discount2 = inv.discount2 ?? 0;
    const currentYear = new Date().getFullYear();
    const filledRows = inv.items;
    const fillerCount = Math.max(0, 15 - filledRows.length);

    return (
      <div
        key={inv.id}
        className="a4-invoice-sheet w-full max-w-[210mm] min-h-[260mm] bg-white p-5 sm:p-6 shadow-xl border border-slate-300 rounded-xs font-sans flex flex-col justify-between text-[#0F172A] mx-auto box-border"
      >
        {/* TOP SECTION: KOP PERUSAHAAN TENANT & HEADER */}
        <div className="space-y-2">
          {/* 1. Header KOP Surat Perusahaan Tenant */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 pb-2 border-b-2 border-[#086288]">
            {/* Left: Logo & Tenant Profile */}
            <div className="space-y-0.5 max-w-sm">
              {companyProfile?.logoUrl ? (
                <img
                  src={companyProfile.logoUrl}
                  alt={companyProfile.brandName || tenantEntityName}
                  className="h-9 max-w-[150px] object-contain mb-1"
                />
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#086288] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {tenantEntityName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#086288] tracking-tight">
                      {companyProfile?.brandName || tenantEntityName}
                    </div>
                    <div className="text-[9px] text-[#64748B] uppercase tracking-wider font-semibold">
                      {tenantEntityName}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-[10px] text-[#475569] leading-tight">
                <p className="font-bold text-[#0F172A]">
                  {tenantEntityName}
                </p>
                <p>
                  {companyProfile?.address || 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55'}
                  , {companyProfile?.regencyName || 'Kota Bandung'}{' '}
                  {companyProfile?.postalCode || '40161'}
                </p>
                <p className="text-[9px] text-[#64748B] pt-0.5">
                  NPWP: <span className="font-mono">{companyProfile?.npwp || '01.345.678.9-012.000'}</span>
                  {' '}• NIB: <span className="font-mono">{companyProfile?.nib || '9120003456781'}</span>
                  <br />
                  Telp: {companyProfile?.phone || '+62 21 5289 0000'} | Email: {companyProfile?.email || `finance@${tenant?.slug || 'hizaki'}.com`}
                </p>
              </div>
            </div>

            {/* Right: Document Identity & Meta */}
            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block px-2.5 py-0.5 bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded font-mono text-[11px] font-extrabold uppercase tracking-wider">
                {isBlanko ? 'SURAT JALAN & PENGIRIMAN (BLANKO)' : 'FAKTUR PENJUALAN'}
              </div>
              <div className="text-base font-extrabold text-[#0F172A] font-mono pt-0.5">
                {inv.invoiceNumber}
              </div>
              <div className="text-[11px] text-[#64748B] font-mono space-y-0.5">
                <div>No. Surat Jalan (DO): <strong className="text-[#086288]">{doNumber}</strong></div>
                <div>Referensi Pesanan (SO): <strong className="text-[#0F172A]">{inv.sourceNumber}</strong></div>
                <div>Tanggal Faktur: <strong className="text-[#0F172A]">{inv.invoiceDate}</strong></div>
              </div>
              <div className="pt-0.5">
                {renderStatusBadge(inv.status)}
              </div>
            </div>
          </div>

          {/* 2. Bill To & Commercial Terms Strip (Two-Column Paper.id Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-2 rounded-lg border border-[#CBD5E1]">
            {/* Left: Customer Info */}
            <div className="space-y-0.5">
              <span className="font-bold text-[#475569] uppercase text-[9.5px] tracking-wider block border-b border-[#CBD5E1] pb-0.5">
                Tagihan Kepada (Billed To)
              </span>
              <div className="font-extrabold text-xs text-[#0F172A]">
                {inv.customerName}
              </div>
              <div className="text-[#475569] text-[10px]">
                Kode Pelanggan: <span className="font-mono font-semibold">{inv.customerCode}</span>
              </div>
              <div className="text-[#64748B] text-[10px] leading-snug pt-0.5">
                {inv.customerAddress || 'Alamat Penagihan Sesuai Sales Order'}
              </div>
              {inv.customerPhone && (
                <div className="text-[#64748B] text-[9.5px]">
                  Kontak: {inv.customerPhone}
                </div>
              )}
            </div>

            {/* Right: Payment Terms */}
            <div className="space-y-0.5 sm:border-l sm:border-[#CBD5E1] sm:pl-2.5">
              <span className="font-bold text-[#475569] uppercase text-[9.5px] tracking-wider block border-b border-[#CBD5E1] pb-0.5">
                Ketentuan Pembayaran (Payment Terms)
              </span>
              <div className="grid grid-cols-2 gap-0.5 text-[10px] pt-0.5">
                <span className="text-[#64748B]">Metode:</span>
                <span className="font-semibold text-[#0F172A] capitalize">
                  {inv.paymentMethod === 'top'
                    ? `Terms of Payment (Net ${inv.paymentTermsDays || 30} Hari)`
                    : inv.paymentMethod}
                </span>

                <span className="text-[#64748B]">Jatuh Tempo:</span>
                <span className="font-bold font-mono text-rose-600">{inv.dueDate}</span>

                <span className="text-[#64748B]">Mata Uang:</span>
                <span className="font-semibold text-[#0F172A]">IDR (Rupiah Indonesia)</span>

                <span className="text-[#64748B]">Sales PIC:</span>
                <span className="font-semibold text-[#086288]">{resolveSalesman(inv)}</span>
              </div>
            </div>
          </div>

          {/* 3. Items Table (15 Baris Bersih Sesuai Referensi Gambar 2) */}
          <div className="border border-[#CBD5E1] rounded-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#086288] text-white font-semibold h-6.5 border-b border-[#086288]">
                  <th className="py-1 px-2 w-8 text-center border-r border-[#0A739F]">No</th>
                  <th className="py-1 px-2 border-r border-[#0A739F]">Deskripsi Produk / Layanan</th>
                  <th className="py-1 px-2 w-14 text-center border-r border-[#0A739F]">Qty</th>
                  <th className="py-1 px-2 w-16 text-center border-r border-[#0A739F]">Satuan</th>
                  {printWithPrice && !isBlanko && (
                    <>
                      <th className="py-1 px-2 w-28 text-right border-r border-[#0A739F]">Harga Satuan</th>
                      <th className="py-1 px-2 w-32 text-right">Subtotal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {/* 3a. Filled Order Rows (Tanpa Garis Horizontal, Hanya Garis Vertikal Bersih) */}
                {filledRows.map((it, idx) => (
                  <tr key={it.id || idx} className="h-5.5 bg-white">
                    <td className="py-0.5 px-2 text-center text-[#64748B] font-mono border-r border-[#CBD5E1]">{idx + 1}</td>
                    <td className="py-0.5 px-2 font-medium text-[#0F172A] border-r border-[#CBD5E1]">
                      <span className="truncate whitespace-nowrap block max-w-[280px]" title={it.description}>
                        {it.description}
                      </span>
                    </td>
                    <td className="py-0.5 px-2 text-center font-bold text-[#0F172A] border-r border-[#CBD5E1]">{it.quantity}</td>
                    <td className="py-0.5 px-2 text-center text-[#64748B] border-r border-[#CBD5E1]">{it.uom}</td>
                    {printWithPrice && !isBlanko && (
                      <>
                        <td className="py-0.5 px-2 text-right font-mono text-slate-700 border-r border-[#CBD5E1]">
                          Rp {it.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-0.5 px-2 text-right font-mono font-bold text-[#0F172A]">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {/* 3b. Empty Filler Rows (Nomor Kosong & Tanpa Garis Pembagi Horizontal per Gambar 2) */}
                {Array.from({ length: fillerCount }).map((_, fIdx) => (
                  <tr key={`filler-${fIdx}`} className="h-5 bg-white">
                    <td className="py-0.5 px-2 text-center text-transparent font-mono border-r border-[#CBD5E1]">&nbsp;</td>
                    <td className="py-0.5 px-2 border-r border-[#CBD5E1]">&nbsp;</td>
                    <td className="py-0.5 px-2 border-r border-[#CBD5E1]">&nbsp;</td>
                    <td className="py-0.5 px-2 border-r border-[#CBD5E1]">&nbsp;</td>
                    {printWithPrice && !isBlanko && (
                      <>
                        <td className="py-0.5 px-2 border-r border-[#CBD5E1]">&nbsp;</td>
                        <td className="py-0.5 px-2">&nbsp;</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Financial Summary & Terbilang (Sesuai Gambar 2: Diskon 1, Diskon 2, PPN 11%, Netto) */}
          {printWithPrice && !isBlanko ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {/* Left: Terbilang & Catatan Box */}
              <div className="p-2 bg-[#EFF7FA] rounded-lg border border-[#B7DDEA] flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-[#086288] uppercase tracking-wider block">
                    Terbilang :
                  </span>
                  <p className="text-[10.5px] font-semibold text-[#0F172A] italic capitalize leading-relaxed pt-0.5">
                    "{terbilangRupiah} Rupiah"
                  </p>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-[#B7DDEA]/80 text-[9.5px] text-[#475569]">
                  <span className="font-bold text-[#0F172A]">Catatan :</span>{' '}
                  {inv.notes || 'Pembayaran dianggap sah apabila telah diterima di rekening resmi perusahaan.'}
                </div>
              </div>

              {/* Right: Subtotal, Diskon 1, Diskon 2, PPN 11%, Netto */}
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#CBD5E1] space-y-0.5 text-[10.5px]">
                <div className="flex justify-between py-0.5 text-[#475569]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">Rp {inv.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-0.5 text-[#475569]">
                  <span>Diskon 1:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {discount1 > 0 ? `- Rp ${discount1.toLocaleString('id-ID')}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 text-[#475569]">
                  <span>Diskon 2:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {discount2 > 0 ? `- Rp ${discount2.toLocaleString('id-ID')}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 text-[#475569]">
                  <span>PPN 11%:</span>
                  <span className="font-mono font-semibold">Rp {inv.taxAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 border-t-2 border-[#086288] font-bold text-xs text-[#086288]">
                  <span>Netto:</span>
                  <span className="font-mono text-sm">Rp {inv.totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#475569] space-y-0.5">
              <span className="font-bold text-[#0F172A]">Ketentuan Serah Terima (Blanko Delivery Slip):</span>
              <p className="text-[10px] leading-snug">
                Barang-barang di atas telah diterima dalam kondisi baik, lengkap, dan tersegel dengan baik sesuai pesanan.
              </p>
            </div>
          )}

          {/* 5. Payment Channel Info (Bank Transfer BCA/Mandiri under Tenant Account) */}
          {printWithPrice && !isBlanko && (
            <div className="p-1.5 bg-white border border-[#CBD5E1] rounded text-[9.5px] text-[#475569] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F172A]">Instruksi Pembayaran Transfer Bank:</span>
                <div>
                  Bank: <strong className="text-[#086288]">{primaryBank.bankName}</strong> | No. Rekening:{' '}
                  <strong className="font-mono text-[#0F172A]">{primaryBank.accountNumber}</strong> a.n.{' '}
                  <strong>{primaryBank.accountHolderName}</strong>
                </div>
              </div>
              <span className="text-[8.5px] font-mono text-slate-400">Ref: {inv.invoiceNumber}</span>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: TANDA TANGAN RESMI (2 Kolom: Kiri Tenant, Kanan Customer, 4 Baris Kosong, Pinned to Bottom) */}
        <div className="signature-container pt-2.5 mt-auto border-t border-[#CBD5E1]">
          <div className="grid grid-cols-2 gap-8 sm:gap-16 text-center text-[10px]">
            {/* Kolom Kiri: Pihak Tenant */}
            <div className="flex flex-col items-center text-center min-w-[170px]">
              <div>
                <span className="font-bold text-[#0F172A] block text-xs">Hormat Kami</span>
                <span className="text-[9.5px] text-[#64748B] block mt-0.5">Finance & Billing Department</span>
              </div>

              {/* 4 Baris Kosong untuk Area Tanda Tangan Basah & Stempel Perusahaan Tenant */}
              <div className="h-14 my-1 flex items-center justify-center" aria-hidden="true">
                {/* Ruang 4 baris kosong leluasa */}
              </div>

              <div className="w-full">
                <div className="border-b border-[#0F172A] w-48 mx-auto mb-1"></div>
                <span className="font-bold text-[#086288] block text-xs underline truncate">{tenantEntityName}</span>
                {/* Spacer penyeimbang tinggi agar garis kiri dan kanan sejajar 100% presisi */}
                <span className="text-[9.5px] text-transparent block pt-0.5 select-none" aria-hidden="true">&nbsp;</span>
              </div>
            </div>

            {/* Kolom Kanan: Pihak Customer / Pelanggan */}
            <div className="flex flex-col items-center text-center min-w-[170px]">
              <div>
                <span className="font-bold text-[#0F172A] block text-xs">Diterima & Disetujui Oleh</span>
                <span className="text-[9.5px] text-[#64748B] block mt-0.5">Customer / Pelanggan</span>
              </div>

              {/* 4 Baris Kosong untuk Area Tanda Tangan Basah & Stempel Pelanggan */}
              <div className="h-14 my-1 flex items-center justify-center" aria-hidden="true">
                {/* Ruang 4 baris kosong leluasa */}
              </div>

              <div className="w-full">
                <div className="border-b border-[#0F172A] w-48 mx-auto mb-1"></div>
                <span className="font-bold text-[#0F172A] block text-xs underline truncate">( {inv.customerName} )</span>
                <span className="text-[9.5px] text-[#64748B] block pt-0.5">Tgl: _____/_____/{currentYear}</span>
              </div>
            </div>
          </div>

          {/* Footer watermark & pagination */}
          <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1.5 mt-1 border-t border-slate-100">
            <span>Dicetak melalui Zyvora Enterprise ERP System pada {new Date().toLocaleString('id-ID')}</span>
            <span>
              {pageNum && totalPages ? `Dokumen ${pageNum} dari ${totalPages}` : `No. ${inv.invoiceNumber}`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (MEDIST 4.0 STANDARD DESIGN)           */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN: BRANCH, DELIVERY DATE, CUSTOMER & DO NO */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Branch <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">-- All Branches --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} - {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delivery Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Delivery Date <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Date From"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Date To"
                />
              </div>
            </div>

            {/* Customer (Input with Lookup Modal Button) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Customer</label>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="-- Select Customer --"
                    value={
                      filterCustomer
                        ? `${filterCustomer.code} - ${filterCustomer.name}`
                        : ''
                    }
                    onClick={() => setIsCustomerLookupOpen(true)}
                    className="w-full h-9 pl-3 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] cursor-pointer focus:outline-hidden focus:border-[#086288]"
                  />
                  {filterCustomer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterCustomer(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Customer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerLookupOpen(true)}
                  className="h-9 px-3 bg-[#EFF7FA] hover:bg-[#B7DDEA] text-[#086288] border border-[#B7DDEA] rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  title="Lookup Customer from Master"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delivery Order Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Delivery Order Number</label>
              <div className="sm:col-span-2">
                <select
                  value={filterDoNumber}
                  onChange={(e) => setFilterDoNumber(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                >
                  <option value="all">--- Select DO Number ---</option>
                  {allDoNumbers.map((doNum) => (
                    <option key={doNum} value={doNum}>
                      {doNum}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Order Number</label>
              <div className="sm:col-span-2">
                <select
                  value={filterOrderNumber}
                  onChange={(e) => setFilterOrderNumber(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                >
                  <option value="all">--- Select Order Number ---</option>
                  {allOrderNumbers.map((soNum) => (
                    <option key={soNum} value={soNum}>
                      {soNum}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons: Filter & Reset */}
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
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN: SALESMAN, STATUS & PRINT STATUS        */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Salesman */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Salesman</label>
              <div className="sm:col-span-2">
                <select
                  value={filterSalesman}
                  onChange={(e) => setFilterSalesman(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                >
                  <option value="all">--- Select Salesman ---</option>
                  {allSalesmen.map((pic) => (
                    <option key={pic} value={pic}>
                      {pic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Status <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                >
                  <option value="all">All Payment Status</option>
                  <option value="unpaid">BELUM LUNAS (Unpaid)</option>
                  <option value="paid">LUNAS (Paid)</option>
                  <option value="partially_paid">SEBAGIAN (Partially Paid)</option>
                  <option value="overdue">JATUH TEMPO (Overdue)</option>
                </select>
              </div>
            </div>

            {/* Print Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Print Status <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={printStatusFilter}
                  onChange={(e) => setPrintStatusFilter(e.target.value as any)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                >
                  <option value="all">All Print Status</option>
                  <option value="not_printed">Not printed yet (Belum Dicetak)</option>
                  <option value="printed">Printed (Sudah Dicetak)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ACTION TOOLBAR & PRINT CONTROLS (BLANKO & PRINT WITH PRICE)        */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Left Action Buttons & Checkbox Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePrintBatch}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
            {selectedInvoiceIds.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                {selectedInvoiceIds.length}
              </span>
            )}
          </button>

          {/* Blanko Checkbox */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isBlanko}
              onChange={(e) => {
                const val = e.target.checked;
                setIsBlanko(val);
                if (val) setPrintWithPrice(false);
              }}
              className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
            />
            <span>Blanko (Tanpa Harga)</span>
          </label>

          {/* Print with Price Checkbox */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={printWithPrice}
              onChange={(e) => {
                const val = e.target.checked;
                setPrintWithPrice(val);
                if (val) setIsBlanko(false);
              }}
              className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
            />
            <span>Print with Price (Faktur Lengkap)</span>
          </label>
        </div>

        {/* Right Table Controls (Show entries & Search box) */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Show Entries */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] cursor-pointer focus:outline-hidden focus:border-[#086288]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-1 text-xs text-[#64748B]">
            <span>Search:</span>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter in table..."
              className="w-48 h-9 px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN DATA TABLE (CHECKLIST-MANDATORY PRINT FLOW, NO ACTION COLUMN)  */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedInvoices.length > 0 &&
                      selectedInvoiceIds.length === paginatedInvoices.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                    aria-label="Select all invoices"
                  />
                </th>
                <th className="py-2.5 px-3 w-36">Delivery Number</th>
                <th className="py-2.5 px-3 w-28">Delivery Date</th>
                <th className="py-2.5 px-3 w-36">Invoice Number</th>
                <th className="py-2.5 px-3 w-32">Order Number</th>
                <th className="py-2.5 px-3 w-24">Customer</th>
                <th className="py-2.5 px-3 min-w-[180px]">Customer Name</th>
                <th className="py-2.5 px-3 text-right w-32">Total Amount</th>
                <th className="py-2.5 px-3 text-center w-28">Print Status</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No data available in table</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      No invoices match your filter criteria or orders are still pending picking.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const doNumber = resolveDoNumber(inv);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleToggleSelectRow(inv.id)}
                      className={`hover:bg-[#EFF7FA]/50 transition-colors cursor-pointer select-none ${
                        isSelected ? 'bg-[#EFF7FA]/80' : ''
                      }`}
                    >
                      {/* 1. Selection Checkbox */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(inv.id)}
                          className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                        />
                      </td>

                      {/* 2. Delivery Number (DO) */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded inline-block">
                          {doNumber}
                        </span>
                      </td>

                      {/* 3. Delivery Date */}
                      <td className="py-2.5 px-3 font-mono text-xs text-[#0F172A]">
                        {inv.invoiceDate}
                      </td>

                      {/* 4. Invoice Number */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded inline-block">
                          {inv.invoiceNumber}
                        </span>
                      </td>

                      {/* 5. Order Number (SO/SB) */}
                      <td className="py-2.5 px-3 font-mono text-xs font-medium text-slate-700">
                        {inv.sourceNumber}
                      </td>

                      {/* 6. Customer Code */}
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-700">
                        {inv.customerCode}
                      </td>

                      {/* 7. Customer Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-xs text-[#0F172A]">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {inv.customerAddress || 'Direct Shipping'}
                        </div>
                      </td>

                      {/* 8. Total Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#086288]">
                        Rp {inv.totalAmount.toLocaleString('id-ID')}
                      </td>

                      {/* 9. Print Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderPrintStatusBadge(inv.isPrinted)}
                      </td>

                      {/* 10. Payment Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderStatusBadge(inv.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================================== */}
        {/* 4. PAGINATION FOOTER (MEDIST 4.0 STANDARD DESIGN)                     */}
        {/* ===================================================================== */}
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <span className="font-bold text-[#0F172A]">
              {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredInvoices.length)}
            </span>{' '}
            of <span className="font-bold text-[#0F172A]">{filteredInvoices.length}</span> entries
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
              if (
                p === 1 ||
                p === totalPages ||
                (p >= currentPage - 1 && p <= currentPage + 1)
              ) {
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

      {/* ========================================================================= */}
      {/* 5. CUSTOMER LOOKUP MODAL                                                  */}
      {/* ========================================================================= */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={(c: Customer) => {
          setFilterCustomer({ id: c.id, code: c.customerCode, name: c.name });
          setIsCustomerLookupOpen(false);
          setCurrentPage(1);
        }}
      />

      {/* ========================================================================= */}
      {/* 6. BATCH & SINGLE INVOICE PRINT PREVIEW MODAL (STANDAR A4 PAPER.ID)       */}
      {/* ========================================================================= */}
      {isBatchPrintModalOpen && batchInvoicesToPrint.length > 0 && (
        <BaseModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          title={
            batchInvoicesToPrint.length === 1
              ? `Faktur Penjualan: ${batchInvoicesToPrint[0]?.invoiceNumber}`
              : `Print Invoices (${batchInvoicesToPrint.length} Dokumen)`
          }
          description={
            batchInvoicesToPrint.length === 1
              ? `Ditujukan kepada ${batchInvoicesToPrint[0]?.customerName} • Format Dokumen Resmi Standar A4`
              : `Menampilkan pratinjau ${batchInvoicesToPrint.length} dokumen faktur siap cetak.`
          }
          size="xl"
          maxWidth="max-w-4xl"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              {/* Pagination Controls (if multi-invoice selected) */}
              <div className="flex items-center gap-2">
                {batchInvoicesToPrint.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setBatchActivePageIndex((prev) => Math.max(0, prev - 1))}
                      disabled={batchActivePageIndex === 0}
                      className="p-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-[#0F172A] px-1">
                      Dokumen {batchActivePageIndex + 1} dari {batchInvoicesToPrint.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBatchActivePageIndex((prev) =>
                          Math.min(batchInvoicesToPrint.length - 1, prev + 1)
                        )
                      }
                      disabled={batchActivePageIndex >= batchInvoicesToPrint.length - 1}
                      className="p-1.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono ml-2 hidden sm:inline">
                      ({batchInvoicesToPrint[batchActivePageIndex]?.invoiceNumber})
                    </span>
                  </>
                )}
                {batchInvoicesToPrint.length === 1 && (
                  <span className="text-[11px] text-[#64748B]">
                    Format Dokumen A4 Resmi 1 Lembar Penuh • Otorisasi Resmi Tenant
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPrintModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markInvoicesAsPrinted(batchInvoicesToPrint.map((i) => i.id));
                    window.print();
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {batchInvoicesToPrint.length === 1
                      ? 'Cetak Dokumen (A4 / PDF)'
                      : `Cetak Semua (${batchInvoicesToPrint.length} Faktur)`}
                  </span>
                </button>
              </div>
            </div>
          }
        >
          {/* Print Stylesheet for Pure A4 Paper Output (Isolated Portal directly on Body) */}
          <style>{`
            @page {
              size: A4 portrait;
              margin: 5mm 6mm;
            }
            @media screen {
              #batch-printable-portal {
                display: none !important;
              }
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              /* Hide the entire ERP React App (navbar, topbar, modal, dashboard) to eliminate offsets */
              #root {
                display: none !important;
              }
              /* Dedicated Print Portal rendered directly into document.body */
              #batch-printable-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .a4-invoice-sheet {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 245mm !important;
                max-height: 258mm !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                background-color: white !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .a4-invoice-sheet:not(:last-child) {
                page-break-after: always !important;
                break-after: page !important;
              }
              .a4-invoice-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .signature-container {
                margin-top: auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          {/* Screen Preview Container (Visible on Screen inside BaseModal) */}
          <div className="bg-slate-200/80 p-2 sm:p-5 rounded-xl overflow-y-auto max-h-[78vh]">
            {renderSingleInvoiceA4(
              batchInvoicesToPrint[batchActivePageIndex],
              batchActivePageIndex + 1,
              batchInvoicesToPrint.length
            )}
          </div>

          {/* Dedicated Print Portal rendered directly on document.body for window.print() */}
          {typeof document !== 'undefined' &&
            createPortal(
              <div id="batch-printable-portal">
                {batchInvoicesToPrint.map((it, idx) =>
                  renderSingleInvoiceA4(it, idx + 1, batchInvoicesToPrint.length)
                )}
              </div>,
              document.body
            )}
        </BaseModal>
      )}
    </div>
  );
};
