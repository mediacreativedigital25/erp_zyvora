import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  Package,
  Calendar,
  Building2,
  Search,
  Filter,
  RotateCcw,
  Users,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  Printer,
  FileText,
  AlertCircle,
  Eye,
  Check,
  X,
  Truck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Gift
} from 'lucide-react';
import {
  SalesOrder,
  ServiceBookingOrder,
  SalesInvoice,
  SalesInvoiceItem,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';
import { CustomerLookupModal } from './CustomerLookupModal';
import { SalesOrderPickingCreatePage } from './SalesOrderPickingCreatePage';
import {
  SalesOrderPickingPrintModal,
  UnifiedPickingItem
} from './SalesOrderPickingPrintModal';
import { UnifiedReceiveItem } from './SalesOrderReceiveView';
import { generateRsvNumber, generateDoNumber } from '../../utils/salesReceiveUtils';
import { getTodayDateString } from '../../utils/dateUtils';

export const SalesOrderPickingView: React.FC = () => {
  const {
    salesOrders,
    setSalesOrders,
    serviceBookings,
    setServiceBookings,
    branches,
    warehouses,
    customers,
    invoices,
    createSalesInvoice,
    navigateToFeature,
    addToast
  } = useErp();

  // =========================================================================
  // VIEW MODE: 'list' (default table) or 'create' (Add Sales Order Picking)
  // =========================================================================
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [orderToPick, setOrderToPick] = useState<UnifiedReceiveItem | null>(null);

  // =========================================================================
  // TWO-COLUMN FILTER CARD STATES (MEDIST 4.0 SO DELIVERY PICKING STANDARD)
  // =========================================================================
  // Left Column Filters
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Right Column Filters
  const [filterCustomer, setFilterCustomer] = useState<{ id: string; code: string; name: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Customer Lookup Modal State
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);

  // Table Controls (Entries per page, Search box & Pagination)
  const [tableSearch, setTableSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Multi-select Row State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<UnifiedPickingItem[]>([]);

  // Inspection / Detail Modal State
  const [viewingItem, setViewingItem] = useState<UnifiedPickingItem | null>(null);

  // =========================================================================
  // UNIFIED QUEUE DATA (Sales Order Goods + Service Bookings)
  // =========================================================================
  const allPickingOrders: UnifiedPickingItem[] = useMemo(() => {
    const list: UnifiedPickingItem[] = [];

    // Helper to resolve branch
    const resolveBranch = (bId?: string, bCodeParam?: string) => {
      const b = branches.find(
        (branch) => branch.id === bId || branch.code === bId || (bCodeParam && branch.code === bCodeParam.split(' - ')[0])
      );
      const code = b ? b.code : (bCodeParam ? bCodeParam.split(' - ')[0] : (bId || 'BR-01'));
      const name = b ? b.name : 'Jakarta Pusat (Kantor Pusat)';
      return { code, name, id: b?.id || bId };
    };

    // Helper to resolve warehouse
    const resolveWarehouse = (wId?: string, wNameParam?: string) => {
      const w = warehouses.find((wh) => wh.id === wId || wh.name === wNameParam);
      const name = w ? w.name : (wNameParam || 'Gudang Utama Cakung');
      return { id: w?.id || wId || 'wh_cakung_01', name };
    };

    // 1. Goods Sales Orders
    salesOrders.forEach((so, idx) => {
      const branchMeta = resolveBranch(so.branchId);
      const whMeta = resolveWarehouse(so.warehouseId);

      let rsvNumber = (so as any).receiveNumber;
      if (!rsvNumber && (so.status === 'received' || so.status === 'picked')) {
        rsvNumber = generateRsvNumber(branchMeta.code, so.orderDate, idx + 1);
      }

      let doNumber = so.deliveryOrderNumber;
      let pickingDate = so.pickingDate;
      if (!doNumber && so.status === 'picked') {
        doNumber = generateDoNumber(branchMeta.code, so.deliveryDate || so.orderDate, idx + 1);
        pickingDate = so.deliveryDate || so.orderDate;
      }

      list.push({
        id: so.id.startsWith('so_') ? so.id : `so_${so.id}`,
        sourceType: 'goods',
        orderType: 'Goods',
        orderNumber: so.orderNumber,
        receiveNumber: rsvNumber,
        deliveryOrderNumber: doNumber,
        pickingDate,
        customerId: so.customerId,
        customerCode: so.customerCode,
        customerName: so.customerName,
        customerPhone: so.customerPhone,
        customerAddress: so.customerAddress,
        branchId: so.branchId,
        branchCode: branchMeta.code,
        branchName: branchMeta.name,
        warehouseId: whMeta.id,
        warehouseName: whMeta.name,
        date: so.orderDate,
        targetDate: so.deliveryDate,
        destinationOrVenue: so.customerAddress || 'Direct Shipping',
        itemCount: so.items?.length || 0,
        subtotal: so.subtotal,
        taxAmount: so.tax,
        totalAmount: so.totalAmount,
        status: so.status,
        items: (so.items || []).map((it, itIdx) => ({
          id: `so_it_${itIdx}`,
          sku: it.sku,
          name: it.name,
          quantity: it.quantity,
          uom: it.uom,
          unitPrice: it.unitPrice,
          discount: it.discount,
          total: it.total,
          isBonus: it.isBonus,
          batchNumber: `BATCH-202611-${String(itIdx + 1).padStart(2, '0')}`,
          expiredDate: '2028-11-01'
        })),
        rawGoodsOrder: so
      });
    });

    // 2. Service Bookings
    serviceBookings.forEach((sb, idx) => {
      const branchMeta = resolveBranch(sb.branchId, sb.branchCode);
      const whMeta = resolveWarehouse(sb.warehouseId, sb.warehouseName);
      const derivedOrderType = sb.orderType || 'Service';

      let rsvNumber = sb.receiveNumber;
      if (!rsvNumber && (sb.status === 'received' || sb.status === 'picked')) {
        rsvNumber = generateRsvNumber(branchMeta.code, sb.bookingDate, idx + 1);
      }

      let doNumber = sb.deliveryOrderNumber;
      let pickingDate = sb.pickingDate;
      if (!doNumber && sb.status === 'picked') {
        doNumber = generateDoNumber(branchMeta.code, sb.eventDate || sb.bookingDate, idx + 1);
        pickingDate = sb.eventDate || sb.bookingDate;
      }

      list.push({
        id: sb.id.startsWith('sb_') ? sb.id : `sb_${sb.id}`,
        sourceType: derivedOrderType.toLowerCase().includes('goods') ? 'goods' : 'service',
        orderType: derivedOrderType,
        orderNumber: sb.bookingNumber,
        receiveNumber: rsvNumber,
        deliveryOrderNumber: doNumber,
        pickingDate,
        customerId: sb.customerId,
        customerCode: sb.customerCode || 'CUST-GEN',
        customerName: sb.customerName,
        customerPhone: sb.customerPhone,
        customerAddress: sb.venueAddress,
        branchId: sb.branchId,
        branchCode: branchMeta.code,
        branchName: branchMeta.name,
        warehouseId: whMeta.id,
        warehouseName: whMeta.name,
        date: sb.bookingDate,
        targetDate: sb.eventDate,
        destinationOrVenue: sb.venueName ? `${sb.venueName}${sb.venueCity ? ` (${sb.venueCity})` : ''}` : (sb.venueAddress || 'Direct Venue'),
        itemCount: sb.items?.length || 0,
        subtotal: sb.subtotal || 0,
        taxAmount: sb.taxAmount || 0,
        totalAmount: sb.totalAmount,
        status: sb.status,
        items: (sb.items || []).map((it, itIdx) => ({
          id: it.id,
          sku: it.sku || it.costCenterCode,
          name: it.serviceName,
          quantity: it.quantity,
          uom: it.uom,
          unitPrice: it.unitPrice,
          discount: it.discount,
          total: it.subtotal,
          businessLineId: it.businessLineId,
          isBonus: it.isBonus,
          batchNumber: 'Non-Stock / Service',
          expiredDate: 'N/A'
        })),
        rawServiceBooking: sb
      });
    });

    return list;
  }, [salesOrders, serviceBookings, branches, warehouses]);

  // =========================================================================
  // QUEUE DATA AVAILABLE FOR PICKING (RECEIVED & PICKED ONLY, EXCLUDES 'OPEN')
  // =========================================================================
  const availableOrdersForPicking: UnifiedReceiveItem[] = useMemo(() => {
    return allPickingOrders
      .filter((item) => item.status.toLowerCase() !== 'open')
      .map((item) => ({
        id: item.id,
        sourceType: item.sourceType,
        orderType: item.orderType,
        orderNumber: item.orderNumber,
        receiveNumber: item.receiveNumber,
        receiveDate: item.date,
        customerId: item.customerId,
        customerCode: item.customerCode,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        customerAddress: item.customerAddress,
        branchId: item.branchId,
        branchCode: item.branchCode,
        branchDisplay: `${item.branchCode} - ${item.branchName || 'Jakarta Pusat'}`,
        warehouseId: item.warehouseId,
        warehouseDisplay: item.warehouseName || 'Gudang Utama Cakung',
        date: item.date,
        targetDate: item.targetDate,
        destinationOrVenue: item.destinationOrVenue,
        itemCount: item.itemCount,
        subtotal: item.subtotal,
        lineDiscount: 0,
        orderDiscount: 0,
        discountTotal: 0,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        status: item.status,
        items: item.items.map((it) => ({
          ...it,
          discountPercent: 0
        })),
        rawGoodsOrder: item.rawGoodsOrder,
        rawServiceBooking: item.rawServiceBooking
      }));
  }, [allPickingOrders]);

  // =========================================================================
  // QUEUE DATA: ORDERS READY FOR PICKING ('received') AND COMPLETED ('picked')
  // =========================================================================
  const pickedOrders = useMemo(() => {
    return allPickingOrders.filter((item) => {
      const s = item.status.toLowerCase();
      return s === 'received' || s === 'picked';
    });
  }, [allPickingOrders]);

  // Filtered List based on pickedOrders
  const filteredList = useMemo(() => {
    return pickedOrders.filter((item) => {
      // 1. Branch Filter
      if (filterBranch !== 'all') {
        const matchBranchId = item.branchId === filterBranch;
        const matchBranchCode = item.branchCode.toLowerCase().includes(filterBranch.toLowerCase());
        const matchBranchName = item.branchName?.toLowerCase().includes(filterBranch.toLowerCase());
        if (!matchBranchId && !matchBranchCode && !matchBranchName) return false;
      }

      // 2. Date Range Filter (Picking date)
      const effectiveDate = item.pickingDate || item.date;
      if (dateFrom && effectiveDate < dateFrom && (!item.targetDate || item.targetDate < dateFrom)) return false;
      if (dateTo && effectiveDate > dateTo && (!item.targetDate || item.targetDate > dateTo)) return false;

      // 3. Customer Filter
      if (filterCustomer) {
        if (item.customerId !== filterCustomer.id && item.customerCode !== filterCustomer.code) {
          return false;
        }
      }

      // 4. Status Filter
      if (filterStatus !== 'all') {
        if (item.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // 5. Instant Table Search Box
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = item.orderNumber.toLowerCase().includes(q);
        const matchDo = item.deliveryOrderNumber?.toLowerCase().includes(q);
        const matchRsv = item.receiveNumber?.toLowerCase().includes(q);
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchCode = item.customerCode.toLowerCase().includes(q);
        if (!matchNo && !matchDo && !matchRsv && !matchCust && !matchCode) return false;
      }

      return true;
    });
  }, [pickedOrders, filterBranch, dateFrom, dateTo, filterCustomer, filterStatus, tableSearch]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / entriesPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredList.slice(start, start + entriesPerPage);
  }, [filteredList, currentPage, entriesPerPage]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterBranch('all');
    setDateFrom('');
    setDateTo('');
    setFilterCustomer(null);
    setFilterStatus('all');
    setTableSearch('');
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Toggle selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedList.map((i) => i.id));
    }
  };

  // Print Handlers
  const handlePrintSelected = () => {
    if (selectedIds.length === 0) {
      addToast(
        'Pilih Dokumen DO',
        'Silakan beri tanda centang pada satu atau beberapa dokumen DO yang ingin dicetak.',
        'info'
      );
      return;
    }

    const targetItems = allPickingOrders.filter((i) => selectedIds.includes(i.id));
    if (targetItems.length === 0) {
      addToast('Pilih Dokumen', 'Tidak ada dokumen valid yang terpilih.', 'warning');
      return;
    }

    setItemsToPrint(targetItems);
    setIsPrintModalOpen(true);
  };

  const handlePrintSingle = (item: UnifiedPickingItem) => {
    setItemsToPrint([item]);
    setIsPrintModalOpen(true);
  };

  // Status Badge Styler
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'picked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> PICKED
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <PackageCheck className="w-3 h-3 text-sky-600" /> RECEIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {status}
          </span>
        );
    }
  };

  // =========================================================================
  // VIEW MODE: CREATE / SO DELIVERY PICKING PAGE
  // =========================================================================
  if (viewMode === 'create') {
    return (
      <SalesOrderPickingCreatePage
        initialOrder={orderToPick}
        availableOrders={availableOrdersForPicking}
        onBack={() => {
          setViewMode('list');
          setOrderToPick(null);
        }}
        onSuccess={() => {
          setViewMode('list');
          setOrderToPick(null);
        }}
      />
    );
  }

  // =========================================================================
  // VIEW MODE: LIST TABLE VIEW (MEDIST 4.0 STANDARD DESIGN)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (MEDIST 4.0 SO PICKING SCREEN)         */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN: BRANCH & PICKING DATE RANGE             */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
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

            {/* Picking Date (Date Range: From - To) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Picking Date</label>
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
          {/* RIGHT COLUMN: CUSTOMER & STATUS                      */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Customer (Input with Search Modal Button) */}
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

            {/* Status Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Status (Received & Picked) ---</option>
                  <option value="received">RECEIVED (Siap Diproses Picking)</option>
                  <option value="picked">PICKED (Gate 2 Passed - DO Generated)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ACTION TOOLBAR & TABLE CONTROLS                                    */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOrderToPick(null);
              setViewMode('create');
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Sales Order Picking</span>
          </button>

          <button
            type="button"
            onClick={handlePrintSelected}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Print selected Delivery Order documents"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print DO List</span>
            {selectedIds.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-[#086288] text-white rounded-full text-[10px] font-bold">
                {selectedIds.length}
              </span>
            )}
          </button>
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
      {/* 3. MAIN DATA TABLE (8 UNIVERSAL COLUMNS IN ENGLISH)                   */}
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
                      paginatedList.length > 0 &&
                      selectedIds.length === paginatedList.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2 text-center w-24">Action</th>
                <th className="py-2.5 px-3 w-24">Branch</th>
                <th className="py-2.5 px-3 w-32">Picking Date</th>
                <th className="py-2.5 px-3 w-48">DO Number</th>
                <th className="py-2.5 px-3 w-32">Cust Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Cust Name</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <Truck className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No data available in table</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      No picked delivery orders match your filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#EFF7FA]/50 transition-colors ${
                        isSelected ? 'bg-[#EFF7FA]/80' : ''
                      }`}
                    >
                      {/* 1. Selection Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                        />
                      </td>

                      {/* 2. Action Column (Process Picking, Inspection Eye & Quick Print DO) */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Process Picking for Received Orders */}
                          {item.status.toLowerCase() === 'received' && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetOrder = availableOrdersForPicking.find((o) => o.id === item.id) || null;
                                setOrderToPick(targetOrder);
                                setViewMode('create');
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Process Delivery Picking (Gate 2)"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Detail & Inspection */}
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded-lg transition-colors cursor-pointer"
                            title="View DO Detail & Specifications"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Print DO Sheet (for Picked Orders) */}
                          {item.status.toLowerCase() === 'picked' && (
                            <button
                              type="button"
                              onClick={() => handlePrintSingle(item)}
                              className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded-lg transition-colors cursor-pointer"
                              title="Print Delivery Order (Surat Jalan)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 3. Branch (Code Badge Only) */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                          {item.branchCode}
                        </span>
                      </td>

                      {/* 4. Picking Date */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-[#0F172A] font-medium">
                          {item.pickingDate || item.date}
                        </div>
                      </td>

                      {/* 5. DO Number */}
                      <td className="py-2.5 px-3">
                        {item.deliveryOrderNumber ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-extrabold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded inline-block">
                              {item.deliveryOrderNumber}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {item.receiveNumber || item.orderNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                              Siap Picking
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {item.receiveNumber || item.orderNumber}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Customer Code */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {item.customerCode}
                        </span>
                      </td>

                      {/* 7. Customer Name */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-bold text-[#0F172A]">
                          {item.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.destinationOrVenue}
                        </div>
                      </td>

                      {/* 8. Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderStatusBadge(item.status)}
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
              {filteredList.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredList.length)}
            </span>{' '}
            of <span className="font-bold text-[#0F172A]">{filteredList.length}</span> entries
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

      {/* ===================================================================== */}
      {/* 5. MODALS & POPUPS                                                    */}
      {/* ===================================================================== */}
      {/* Customer Lookup Modal */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={(c: Customer) => {
          setFilterCustomer({ id: c.id, code: c.customerCode, name: c.name });
          setIsCustomerLookupOpen(false);
          setCurrentPage(1);
        }}
      />

      {/* Delivery Order Print Modal */}
      <SalesOrderPickingPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={itemsToPrint}
      />

      {/* Inspection & Details Modal */}
      {viewingItem && (() => {
        const matchedInvoice = invoices.find(
          (inv) =>
            inv.sourceNumber === viewingItem.orderNumber ||
            inv.sourceId === viewingItem.id
        );

        return (
          <BaseModal
            isOpen={Boolean(viewingItem)}
            onClose={() => setViewingItem(null)}
            title={`Delivery Order Details: ${viewingItem.deliveryOrderNumber || viewingItem.orderNumber}`}
            description="Rincian alokasi picking fisik, nomor batch, dan verifikasi faktur komersial."
            size="lg"
            maxWidth="max-w-[800px]"
            footer={
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-500">
                  Status: <strong className="text-[#086288]">{viewingItem.status.toUpperCase()}</strong>
                </span>
                <div className="flex items-center gap-2">
                  {matchedInvoice && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingItem(null);
                        navigateToFeature('sales_print_invoice');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF7FA] hover:bg-[#B7DDEA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      title="Lihat Faktur di menu Print Invoice"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Buka di Print Invoice</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrintSingle(viewingItem)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#086288]" />
                    <span>Print DO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingItem(null)}
                    className="px-4 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Top Info Banner */}
              <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Customer & Destination</span>
                  <span className="font-bold text-[#0F172A] text-sm">{viewingItem.customerName}</span>
                  <span className="text-slate-600 block text-[11px] mt-0.5">{viewingItem.destinationOrVenue}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Surat Jalan (DO Number)</span>
                  <span className="font-mono font-bold text-sm text-[#086288]">
                    {viewingItem.deliveryOrderNumber || 'DO-PENDING'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Ref RSV: {viewingItem.receiveNumber || 'N/A'} | SO: {viewingItem.orderNumber}
                  </div>
                </div>
              </div>

              {/* Linked Commercial Invoice Banner */}
              {matchedInvoice && (
                <div className="p-3 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#086288] text-white flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Faktur Penjualan (Commercial Invoice) Terbit:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-xs text-[#086288]">{matchedInvoice.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-500">Jatuh Tempo: {matchedInvoice.dueDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                      {matchedInvoice.status === 'unpaid' ? 'BELUM LUNAS' : matchedInvoice.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingItem(null);
                        navigateToFeature('sales_print_invoice');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      <span>Buka di Print Invoice</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-[#CBD5E1]">
                    <tr>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">Batch Number</th>
                      <th className="py-2 px-3">Expired Date</th>
                      <th className="py-2 px-3 text-right">Picked Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {viewingItem.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#086288]">{it.sku}</td>
                        <td className="py-2 px-3 font-semibold text-[#0F172A]">{it.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{it.batchNumber || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{it.expiredDate || '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#0F172A]">
                          {it.quantity} {it.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </BaseModal>
        );
      })()}
    </div>
  );
};
