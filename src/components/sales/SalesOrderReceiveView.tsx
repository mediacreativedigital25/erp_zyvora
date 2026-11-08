import React, { useState, useMemo } from 'react';
import {
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
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Plus
} from 'lucide-react';
import {
  SalesOrder,
  ServiceBookingOrder,
  SalesOrderStatus,
  ServiceBookingStatus,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { getTodayDateString } from '../../utils/dateUtils';
import { BaseModal } from '../common/BaseModal';
import { CustomerLookupModal } from './CustomerLookupModal';
import { SalesOrderReceivePrintModal } from './SalesOrderReceivePrintModal';
import { SalesOrderReceiveCreatePage } from './SalesOrderReceiveCreatePage';
import { generateRsvNumber } from '../../utils/salesReceiveUtils';

export interface UnifiedReceiveItem {
  id: string; // e.g. "so_1" or "sb_1"
  sourceType: 'goods' | 'service';
  orderType: string; // "Normal SO" | "Service" | "Goods"
  orderNumber: string;
  receiveNumber?: string; // RSV0120261100001
  receiveDate?: string;   // 2026-11-01
  customerId?: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  branchId?: string;
  branchCode: string;
  branchName?: string;
  branchDisplay: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouseDisplay: string;
  date: string;
  targetDate?: string;
  destinationOrVenue: string;
  itemCount: number;
  subtotal: number;
  lineDiscount: number;
  orderDiscount: number;
  discountTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  items: Array<{
    id: string;
    sku?: string;
    name: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount?: number;
    discountPercent?: number;
    total: number;
    businessLineId?: string;
    isBonus?: boolean;
  }>;
  rawGoodsOrder?: SalesOrder;
  rawServiceBooking?: ServiceBookingOrder;
}


export const SalesOrderReceiveView: React.FC = () => {
  const {
    salesOrders,
    setSalesOrders,
    serviceBookings,
    setServiceBookings,
    branches,
    warehouses,
    addToast
  } = useErp();

  // View Mode: 'list' (default table) or 'create' (Add Sales Order Reserve / Receive)
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [orderToReceive, setOrderToReceive] = useState<UnifiedReceiveItem | null>(null);

  // =========================================================================
  // TWO-COLUMN FILTER CARD STATES (Zyvora / MEDIST 4.0 Standard)
  // =========================================================================
  // Left Column Filters
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(getTodayDateString());
  const [dateTo, setDateTo] = useState<string>(getTodayDateString());
  const [filterCustomer, setFilterCustomer] = useState<{ id: string; code: string; name: string } | null>(null);
  const [filterOrderNumber, setFilterOrderNumber] = useState<string>('all');

  // Right Column Filters
  const [filterOrderType, setFilterOrderType] = useState<string>('all');
  const [filterProductType, setFilterProductType] = useState<string>('all'); // Business Line / LOB
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Customer Lookup Modal State
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);

  // Table Controls (Show entries, instant search & pagination)
  const [tableSearch, setTableSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Multi-select Row State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals: Inspection, Batch Receive, Print
  const [viewingItem, setViewingItem] = useState<UnifiedReceiveItem | null>(null);
  const [isBatchReceiveOpen, setIsBatchReceiveOpen] = useState<boolean>(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [isStockConfirmed, setIsStockConfirmed] = useState(true);
  const [isScheduleConfirmed, setIsScheduleConfirmed] = useState(true);

  // Multi-Page Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<UnifiedReceiveItem[]>([]);

  // =========================================================================
  // UNIFIED QUEUE DATA (Sales Order Goods + Service Bookings)
  // =========================================================================
  const unifiedItems: UnifiedReceiveItem[] = useMemo(() => {
    const list: UnifiedReceiveItem[] = [];

    // Helper to resolve branch
    const resolveBranch = (bId?: string, bCodeParam?: string) => {
      const b = branches.find(
        (branch) => branch.id === bId || branch.code === bId || (bCodeParam && branch.code === bCodeParam.split(' - ')[0])
      );
      const code = b ? b.code : (bCodeParam ? bCodeParam.split(' - ')[0] : (bId || 'BR-01'));
      const name = b ? b.name : 'Jakarta Pusat (Kantor Pusat)';
      const city = b?.city ? ` (${b.city})` : '';
      const display = b ? `${b.code} - ${b.name}${city}` : (bCodeParam || `${code} - ${name}`);
      return { code, name, display, id: b?.id || bId };
    };

    // Helper to resolve warehouse
    const resolveWarehouse = (wId?: string, wNameParam?: string) => {
      const w = warehouses.find(
        (wh) => wh.id === wId || wh.code === wId || wh.name === wNameParam || (wNameParam && wh.name.includes(wNameParam))
      );
      const code = w ? w.code : 'WH-JKT-01';
      const name = w ? w.name : (wNameParam || 'Gudang Pusat Cakung');
      const display = wNameParam || (w ? `${w.code} - ${w.name}` : 'WH-JKT-01 - Gudang Pusat Cakung');
      return { code, name, display, id: w?.id || wId || warehouses[0]?.id };
    };

    // 1. Goods Sales Orders
    salesOrders.forEach((so, idx) => {
      const branchMeta = resolveBranch(so.branchId);
      const whMeta = resolveWarehouse(so.warehouseId);

      const lineDiscount = (so.items || []).reduce((sum, it) => sum + (it.discount || 0), 0);
      const discountTotal = so.discountTotal || lineDiscount;
      const orderDiscount = Math.max(0, discountTotal - lineDiscount);
      const subtotal = so.subtotal || (so.totalAmount - (so.tax || 0) + discountTotal);
      const taxAmount = so.tax || 0;

      let rsvNumber = so.receiveNumber;
      let rsvDate = so.receiveDate;
      if (!rsvNumber && (so.status === 'received' || so.status === 'picked')) {
        rsvNumber = generateRsvNumber(branchMeta.code, so.orderDate, idx + 1);
        rsvDate = so.deliveryDate || so.orderDate;
      }

      list.push({
        id: `so_${so.id}`,
        sourceType: 'goods',
        orderType: 'Goods',
        orderNumber: so.orderNumber,
        receiveNumber: rsvNumber,
        receiveDate: rsvDate,
        customerId: so.customerId,
        customerCode: so.customerCode || 'CUST-GEN',
        customerName: so.customerName,
        customerPhone: so.customerPhone,
        customerAddress: so.customerAddress,
        branchId: so.branchId,
        branchCode: branchMeta.code,
        branchName: branchMeta.name,
        branchDisplay: branchMeta.display,
        warehouseId: whMeta.id,
        warehouseName: whMeta.name,
        warehouseDisplay: whMeta.display,
        date: so.orderDate,
        targetDate: so.deliveryDate,
        destinationOrVenue: so.customerAddress || 'Direct Shipping',
        itemCount: so.items?.length || 0,
        subtotal,
        lineDiscount,
        orderDiscount,
        discountTotal,
        taxAmount,
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
          businessLineId: 'GOODS',
          isBonus: it.isBonus || false
        })),
        rawGoodsOrder: so
      });
    });

    // 2. Service Bookings (and Normal SO unified bookings)
    serviceBookings.forEach((sb, idx) => {
      const branchMeta = resolveBranch(sb.branchId, sb.branchCode);
      const whMeta = resolveWarehouse(sb.warehouseId, sb.warehouseName);
      const derivedOrderType = sb.orderType || 'Service';

      const lineDiscount = (sb.items || []).reduce((sum, it) => sum + (it.discount || 0), 0);
      const orderDiscount = sb.orderDiscountAmount || 0;
      const discountTotal = sb.discountTotal || (lineDiscount + orderDiscount);
      const subtotal = sb.subtotal || 0;
      const taxAmount = sb.taxAmount || 0;

      let rsvNumber = sb.receiveNumber;
      let rsvDate = sb.receiveDate;
      if (!rsvNumber && (sb.status === 'received' || sb.status === 'picked')) {
        rsvNumber = generateRsvNumber(branchMeta.code, sb.bookingDate, idx + 1);
        rsvDate = sb.eventDate || sb.bookingDate;
      }

      list.push({
        id: `sb_${sb.id}`,
        sourceType: derivedOrderType.toLowerCase().includes('goods') ? 'goods' : 'service',
        orderType: derivedOrderType,
        orderNumber: sb.bookingNumber,
        receiveNumber: rsvNumber,
        receiveDate: rsvDate,
        customerId: sb.customerId,
        customerCode: sb.customerCode || 'CUST-GEN',
        customerName: sb.customerName,
        customerPhone: sb.customerPhone,
        customerAddress: sb.venueAddress,
        branchId: sb.branchId,
        branchCode: branchMeta.code,
        branchName: branchMeta.name,
        branchDisplay: branchMeta.display,
        warehouseId: whMeta.id,
        warehouseName: whMeta.name,
        warehouseDisplay: whMeta.display,
        date: sb.bookingDate,
        targetDate: sb.eventDate,
        destinationOrVenue: sb.venueName ? `${sb.venueName}${sb.venueCity ? ` (${sb.venueCity})` : ''}` : (sb.venueAddress || 'Direct Venue'),
        itemCount: sb.items?.length || 0,
        subtotal,
        lineDiscount,
        orderDiscount,
        discountTotal,
        taxAmount,
        totalAmount: sb.totalAmount,
        status: sb.status,
        items: (sb.items || []).map((it) => ({
          id: it.id,
          sku: it.sku || it.costCenterCode,
          name: it.serviceName,
          quantity: it.quantity,
          uom: it.uom,
          unitPrice: it.unitPrice,
          discount: it.discount,
          discountPercent: it.discountPercent,
          total: it.subtotal,
          businessLineId: it.businessLineId,
          isBonus: it.isBonus || false
        })),
        rawServiceBooking: sb
      });
    });

    return list;
  }, [salesOrders, serviceBookings, branches, warehouses]);

  // =========================================================================
  // RECEIVED ITEMS QUEUE (EXCLUDES 'OPEN' ORDERS AS PER ERP SPECIFICATION)
  // =========================================================================
  const receivedItems: UnifiedReceiveItem[] = useMemo(() => {
    return unifiedItems.filter((item) => item.status.toLowerCase() !== 'open');
  }, [unifiedItems]);

  // =========================================================================
  // FILTERING LOGIC
  // =========================================================================
  const filteredList = useMemo(() => {
    return receivedItems.filter((item) => {
      // 1. Branch Filter
      if (filterBranch !== 'all') {
        const matchBranchId = item.branchId === filterBranch;
        const matchBranchCode = item.branchCode.toLowerCase().includes(filterBranch.toLowerCase());
        const matchBranchName = item.branchName?.toLowerCase().includes(filterBranch.toLowerCase());
        if (!matchBranchId && !matchBranchCode && !matchBranchName) return false;
      }

      // 2. Date Range Filter (Order date or target date)
      if (dateFrom && item.date < dateFrom && (!item.targetDate || item.targetDate < dateFrom)) return false;
      if (dateTo && item.date > dateTo && (!item.targetDate || item.targetDate > dateTo)) return false;

      // 3. Customer Filter
      if (filterCustomer) {
        if (item.customerId !== filterCustomer.id && item.customerCode !== filterCustomer.code) {
          return false;
        }
      }

      // 4. Order Number Filter
      if (filterOrderNumber !== 'all') {
        if (item.orderNumber !== filterOrderNumber) return false;
      }

      // 5. Order Type Filter
      if (filterOrderType !== 'all') {
        if (!item.orderType.toLowerCase().includes(filterOrderType.toLowerCase())) return false;
      }

      // 6. Category / Line (LOB) Filter
      if (filterProductType !== 'all') {
        const hasLOB = item.items?.some((it) => it.businessLineId === filterProductType);
        if (!hasLOB) return false;
      }

      // 7. Status Filter
      if (filterStatus !== 'all') {
        if (item.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // 8. Instant Table Search Box
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = item.orderNumber.toLowerCase().includes(q);
        const matchRsv = item.receiveNumber?.toLowerCase().includes(q);
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchCode = item.customerCode.toLowerCase().includes(q);
        const matchDest = item.destinationOrVenue.toLowerCase().includes(q);
        const matchBranch = item.branchCode.toLowerCase().includes(q);
        if (!matchNo && !matchRsv && !matchCust && !matchCode && !matchDest && !matchBranch) {
          return false;
        }
      }

      return true;
    });
  }, [
    receivedItems,
    filterBranch,
    dateFrom,
    dateTo,
    filterCustomer,
    filterOrderNumber,
    filterOrderType,
    filterProductType,
    filterStatus,
    tableSearch
  ]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setFilterBranch('all');
    setDateFrom(getTodayDateString());
    setDateTo(getTodayDateString());
    setFilterCustomer(null);
    setFilterOrderNumber('all');
    setFilterOrderType('all');
    setFilterProductType('all');
    setFilterStatus('all');
    setTableSearch('');
    setCurrentPage(1);
    addToast('Filters Reset', 'All filter options have been restored to defaults.', 'info');
  };

  // Pagination Slice
  const totalEntries = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredList.slice(start, start + entriesPerPage);
  }, [filteredList, currentPage, entriesPerPage]);

  // =========================================================================
  // ROW SELECTION HANDLERS
  // =========================================================================
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedList.length && paginatedList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedList.map((item) => item.id));
    }
  };

  // =========================================================================
  // ADD RECEIVE / VALIDATE ACTION HANDLERS
  // =========================================================================
  // Open items currently selected
  const openSelectedItems = useMemo(() => {
    return unifiedItems.filter(
      (item) => selectedIds.includes(item.id) && item.status.toLowerCase() === 'open'
    );
  }, [unifiedItems, selectedIds]);

  // Main toolbar button handler
  const handleToolbarValidateAndReceive = () => {
    // If multiple open items are selected, open batch modal
    if (openSelectedItems.length > 1) {
      setIsBatchReceiveOpen(true);
      return;
    }

    // If exactly 1 open item is selected, pre-populate it into create view
    if (openSelectedItems.length === 1) {
      setOrderToReceive(openSelectedItems[0]);
      setViewMode('create');
      return;
    }

    // Otherwise open create view for user to pick an order
    setOrderToReceive(null);
    setViewMode('create');
  };

  // Batch Confirm Receive for all selected items that are currently OPEN
  const handleConfirmBatchReceive = () => {
    const goodsIds = openSelectedItems
      .filter((i) => i.sourceType === 'goods' && i.rawGoodsOrder)
      .map((i) => i.rawGoodsOrder!.id);

    const serviceIds = openSelectedItems
      .filter((i) => i.rawServiceBooking)
      .map((i) => i.rawServiceBooking!.id);

    const today = new Date().toISOString().slice(0, 10);

    if (goodsIds.length > 0) {
      setSalesOrders((prev) =>
        prev.map((o) => {
          if (!goodsIds.includes(o.id)) return o;
          return {
            ...o,
            status: 'received',
            receiveNumber: o.receiveNumber || generateRsvNumber(o.branchId || '01', today),
            receiveDate: o.receiveDate || today
          };
        })
      );
    }

    if (serviceIds.length > 0) {
      setServiceBookings((prev) =>
        prev.map((b) => {
          if (!serviceIds.includes(b.id)) return b;
          return {
            ...b,
            status: 'received',
            receiveNumber: b.receiveNumber || generateRsvNumber(b.branchCode || '01', today),
            receiveDate: b.receiveDate || today
          };
        })
      );
    }

    addToast(
      'Batch Validation Completed',
      `Successfully validated and received ${openSelectedItems.length} orders into Gate 1 (Ready for Picking).`,
      'success'
    );

    setIsBatchReceiveOpen(false);
    setSelectedIds([]);
    setValidationNotes('');
  };

  // =========================================================================
  // PRINT RECEIVE SHEET HANDLER (MULTI-PAGE BATCH PRINT)
  // =========================================================================

  const handlePrintSelected = () => {
    if (selectedIds.length === 0) {
      addToast(
        'Pilih Pesanan',
        'Silakan beri tanda centang pada satu atau beberapa pesanan yang ingin dicetak.',
        'info'
      );
      return;
    }

    const targetItems = receivedItems.filter((i) => selectedIds.includes(i.id));
    if (targetItems.length === 0) {
      addToast('Pilih Pesanan', 'Tidak ada pesanan valid yang terpilih.', 'warning');
      return;
    }

    setItemsToPrint(targetItems);
    setIsPrintModalOpen(true);
  };

  // Status Badge Styler (Consistent with SalesOrderServiceView)
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" /> OPEN
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> RECEIVED
          </span>
        );
      case 'picked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <PackageCheck className="w-3 h-3 text-amber-600" /> PICKED
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

  // Order Type Badge Styler
  const renderOrderTypeBadge = (orderType: string) => {
    const ot = orderType.toLowerCase();
    if (ot.includes('goods')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          <Package className="w-2.5 h-2.5" /> Goods
        </span>
      );
    }
    if (ot.includes('normal')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Layers className="w-2.5 h-2.5" /> Normal SO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
        <Sparkles className="w-2.5 h-2.5" /> Service
      </span>
    );
  };

  // =========================================================================
  // VIEW MODE: CREATE / RESERVE PAGE (MEDIST 4.0 DEDICATED FORM)
  // =========================================================================
  if (viewMode === 'create') {
    return (
      <SalesOrderReceiveCreatePage
        initialOrder={orderToReceive}
        availableOrders={unifiedItems}
        onBack={() => {
          setViewMode('list');
          setOrderToReceive(null);
        }}
        onSuccess={() => {
          setViewMode('list');
          setOrderToReceive(null);
        }}
      />
    );
  }

  // =========================================================================
  // VIEW MODE: LIST TABLE VIEW
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (MEDIST 4.0 STANDARD DESIGN)           */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN FILTERS                                  */}
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

            {/* Order Date (Date Range: From - To) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Order Date</label>
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

            {/* Customer Order (Input with Search Modal Button) */}
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

            {/* Order Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Order Number</label>
              <div className="sm:col-span-2">
                <select
                  value={filterOrderNumber}
                  onChange={(e) => setFilterOrderNumber(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Order Numbers ---</option>
                  {receivedItems.map((item) => (
                    <option key={item.id} value={item.orderNumber}>
                      {item.orderNumber} ({item.customerName})
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
          {/* RIGHT COLUMN FILTERS                                 */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Order Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Order Type</label>
              <div className="sm:col-span-2">
                <select
                  value={filterOrderType}
                  onChange={(e) => setFilterOrderType(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Order Types ---</option>
                  <option value="Normal SO">Normal SO (Goods & Services)</option>
                  <option value="Service">Service (Event Services)</option>
                  <option value="Goods">Goods (Physical Inventory)</option>
                </select>
              </div>
            </div>

            {/* Product Type / Service Line (LOB) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Category / Line</label>
              <div className="sm:col-span-2">
                <select
                  value={filterProductType}
                  onChange={(e) => setFilterProductType(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">All Categories / LOB</option>
                  <option value="QUEINVITE">QUEINVITE — Digital Wedding Invitation & RSVP</option>
                  <option value="HIZAKI">HIZAKI — Wedding Planner & Event Organizer</option>
                  <option value="AURUM">AURUM — Grand Floral Stage & Deco Production</option>
                  <option value="KIMIKO">KIMIKO — Professional Pager Ayu Ushers</option>
                  <option value="GOODS">GOODS — Warehouse Physical Inventory</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">All Received Status</option>
                  <option value="received">RECEIVED (Gate 1 Validated)</option>
                  <option value="picked">PICKED (Gate 2 Picking)</option>
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
            onClick={handleToolbarValidateAndReceive}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Validate & Receive</span>
          </button>

          <button
            type="button"
            onClick={handlePrintSelected}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Print selected receive sheet documents"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print</span>
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
      {/* 3. MAIN DATA TABLE (9 UNIVERSAL COLUMNS IN ENGLISH)                   */}
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
                <th className="py-2.5 px-2 text-center w-20">Action</th>
                <th className="py-2.5 px-3 w-24">Branch</th>
                <th className="py-2.5 px-3 w-32">Receive Date</th>
                <th className="py-2.5 px-3 w-48">Receive No</th>
                <th className="py-2.5 px-3 w-28">Order Type</th>
                <th className="py-2.5 px-3 w-32">Customer Code</th>
                <th className="py-2.5 px-3 min-w-[180px]">Customer Name</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No sales orders in receive queue</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      All orders have been validated or no orders match your current filter criteria.
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

                      {/* 2. Action Column (Inspection Detail Only) */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Inspection / View Details */}
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded-lg transition-colors cursor-pointer"
                            title="View Details & Inspection"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* 3. Branch (Code Badge Only) */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                          {item.branchCode}
                        </span>
                      </td>

                      {/* 4. Receive Date */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-[#0F172A] font-medium">
                          {item.receiveDate || '—'}
                        </div>
                      </td>

                      {/* 5. Receive No (RSV Pattern + Sales Order Ref) */}
                      <td className="py-2.5 px-3">
                        {item.receiveNumber ? (
                          <div>
                            <span className="font-mono font-bold text-xs bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded">
                              {item.receiveNumber}
                            </span>
                            <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                              Ref: {item.orderNumber}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs text-[#94A3B8] font-medium">—</span>
                            <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                              Ref: {item.orderNumber}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Order Type */}
                      <td className="py-2.5 px-3">
                        {renderOrderTypeBadge(item.orderType)}
                      </td>

                      {/* 7. Customer Code */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-semibold text-xs bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] px-2 py-0.5 rounded">
                          {item.customerCode}
                        </span>
                      </td>

                      {/* 8. Customer Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#0F172A]">{item.customerName}</div>
                      </td>

                      {/* 9. Status */}
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

        {/* Pagination & Footer Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#F8FAFC] border-t border-[#CBD5E1] text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#0F172A]">
              {totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, totalEntries)}
            </span>{' '}
            of <span className="font-semibold text-[#0F172A]">{totalEntries}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-[#0F172A]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. MODAL: OPERATIONAL READINESS VALIDATION (BATCH)                     */}
      {/* ===================================================================== */}
      {isBatchReceiveOpen && (
        <BaseModal
          isOpen={isBatchReceiveOpen}
          onClose={() => setIsBatchReceiveOpen(false)}
          title={`Batch Receive & Validation (${openSelectedItems.length} Orders)`}
          description="Validate operational readiness for multiple selected orders simultaneously."
          size="lg"
          maxWidth="max-w-[720px]"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-[#64748B]">
                All {openSelectedItems.length} orders will be moved to RECEIVED status.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchReceiveOpen(false)}
                  className="h-9 px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchReceive}
                  className="h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Batch Receive ({openSelectedItems.length})</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Orders Summary List */}
            <div className="max-h-48 overflow-y-auto divide-y divide-[#E2E8F0] border border-[#CBD5E1] rounded-xl bg-white p-2">
              {openSelectedItems.map((item) => (
                <div key={item.id} className="py-2 px-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-[#086288] mr-2">
                      {item.orderNumber}
                    </span>
                    <span className="font-semibold text-[#0F172A]">{item.customerName}</span>
                    <span className="text-slate-500 text-[11px] ml-1">({item.orderType})</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A]">
                    Rp {item.totalAmount.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist Box */}
            <div className="p-3.5 bg-white border border-[#CBD5E1] rounded-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
                <ShieldCheck className="w-4 h-4 text-[#086288]" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                  Batch Operational Readiness Checklist
                </h4>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStockConfirmed}
                    onChange={(e) => setIsStockConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#0F172A] block">
                      Warehouse Inventory Availability Verified
                    </span>
                    <span className="text-[#64748B]">
                      Physical inventory stock is allocated and sufficient for all selected goods orders.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduleConfirmed}
                    onChange={(e) => setIsScheduleConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#0F172A] block">
                      LOB Crew Schedule & Venue Slot Confirmed
                    </span>
                    <span className="text-[#64748B]">
                      Schedules and operational crews have been verified for all selected service orders.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Batch Reception Notes
                </label>
                <textarea
                  rows={2}
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="e.g. Batch reception verified by Operations Manager..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                />
              </div>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL: INSPECTION DETAILS                                          */}
      {/* ===================================================================== */}
      {viewingItem && (
        <BaseModal
          isOpen={Boolean(viewingItem)}
          onClose={() => setViewingItem(null)}
          title={`Order Inspection: ${viewingItem.orderNumber}`}
          description="Detailed breakdown of sales order and line items."
          size="lg"
          maxWidth="max-w-[760px]"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-[#64748B]">
                Status:{' '}
                <strong className="text-[#086288] uppercase">
                  {viewingItem.status}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="h-9 px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemsToPrint([viewingItem]);
                    setIsPrintModalOpen(true);
                  }}
                  className="h-9 px-3.5 py-2 bg-white hover:bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1] text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Order Number</span>
                <span className="font-mono font-bold text-[#086288]">{viewingItem.orderNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Order Date</span>
                <span className="font-medium text-[#0F172A]">{viewingItem.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Customer</span>
                <span className="font-semibold text-[#0F172A]">{viewingItem.customerName}</span>
                <span className="text-[10px] text-slate-500 block">[{viewingItem.customerCode}]</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Branch & Target</span>
                <span className="font-medium text-[#0F172A]">{viewingItem.branchCode}</span>
                <span className="text-[10px] text-slate-500 block">{viewingItem.targetDate || '-'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h5 className="text-xs font-bold text-[#0F172A] mb-2 uppercase tracking-wider">
                Line Items ({viewingItem.items.length})
              </h5>
              <div className="border border-[#CBD5E1] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item / Service Description</th>
                      <th className="py-2 px-3 text-center w-16">Qty</th>
                      <th className="py-2 px-3 text-center w-20">UoM</th>
                      <th className="py-2 px-3 text-right w-28">Unit Price</th>
                      <th className="py-2 px-3 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {viewingItem.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-medium text-[#0F172A]">{it.name}</div>
                          {it.sku && <div className="text-[10px] text-slate-500 font-mono">{it.sku}</div>}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{it.uom}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          Rp {it.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-[#0F172A]">
                          Rp {it.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] border-t border-[#CBD5E1] font-bold text-xs">
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right text-slate-700">
                        Grand Total:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#086288]">
                        Rp {viewingItem.totalAmount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ===================================================================== */}
      {/* 6. CUSTOMER LOOKUP MODAL (FILTER BAR)                                 */}
      {/* ===================================================================== */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={(cust) => {
          setFilterCustomer({
            id: cust.id,
            code: cust.customerCode,
            name: cust.name
          });
          setIsCustomerLookupOpen(false);
        }}
        title="Select Customer Order"
      />

      {/* ===================================================================== */}
      {/* 7. MULTI-PAGE PRINT MODAL FOR SALES ORDER RECEIVE                     */}
      {/* ===================================================================== */}
      <SalesOrderReceivePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={itemsToPrint}
      />
    </div>
  );
};
