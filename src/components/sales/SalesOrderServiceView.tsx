import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  MapPin,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Layers,
  Printer,
  X,
  Check,
  PackageCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Compass
} from 'lucide-react';
import {
  ServiceBookingOrder,
  ServiceBookingStatus,
  ServiceBookingSession,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { getTodayDateString } from '../../utils/dateUtils';
import { ServiceBookingCreatePage } from './ServiceBookingCreatePage';
import { CustomerLookupModal } from './CustomerLookupModal';
import { ServiceBookingPrintModal } from './ServiceBookingPrintModal';
import { BaseModal } from '../common/BaseModal';

export const SalesOrderServiceView: React.FC = () => {
  const {
    serviceBookings,
    branches,
    currentUser,
    isCurrentUserSuperAdmin,
    deleteServiceBooking,
    addToast
  } = useErp();

  const canManage =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  // View Mode: 'list' (default MEDIST 4.0 table) or 'create' / 'edit' (dedicated page view)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingBooking, setEditingBooking] = useState<ServiceBookingOrder | null>(null);

  // =========================================================================
  // MEDIST 4.0 TWO-COLUMN FILTER CARD STATES (Zyvora / Queinvite Ecosystem)
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

  // Interactive Customer Lookup for Filter
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);

  // Table Controls (Show entries & instant search)
  const [tableSearch, setTableSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Row Selection & Print States
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [printWithPrice, setPrintWithPrice] = useState<boolean>(true);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    booking: ServiceBookingOrder | null;
    mode: 'order' | 'receipt';
  }>({
    isOpen: false,
    booking: null,
    mode: 'order'
  });

  // Inspection Drawer & Delete Modals
  const [viewingBooking, setViewingBooking] = useState<ServiceBookingOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // =========================================================================
  // FILTERING LOGIC
  // =========================================================================
  const filteredBookings = useMemo(() => {
    return serviceBookings.filter((b) => {
      // 1. Branch Filter
      if (filterBranch !== 'all') {
        const matchBranchId = b.branchId === filterBranch;
        const matchBranchCode = b.branchCode?.toLowerCase().includes(filterBranch.toLowerCase());
        const matchBranchName = b.branchName?.toLowerCase().includes(filterBranch.toLowerCase());
        const matchCity = b.venueCity?.toLowerCase().includes(filterBranch.toLowerCase());
        if (!matchBranchId && !matchBranchCode && !matchBranchName && !matchCity) return false;
      }

      // 2. Date Range Filter (by bookingDate or eventDate)
      if (dateFrom && b.bookingDate < dateFrom && b.eventDate < dateFrom) return false;
      if (dateTo && b.bookingDate > dateTo && b.eventDate > dateTo) return false;

      // 3. Customer Order Filter
      if (filterCustomer) {
        if (b.customerId !== filterCustomer.id && b.customerCode !== filterCustomer.code) {
          return false;
        }
      }

      // 4. Order Number Filter
      if (filterOrderNumber !== 'all') {
        if (b.bookingNumber !== filterOrderNumber) return false;
      }

      // 5. Order Type Filter
      if (filterOrderType !== 'all') {
        const orderType = b.orderType || 'Wedding Full Package';
        if (!orderType.toLowerCase().includes(filterOrderType.toLowerCase())) return false;
      }

      // 6. Product / Service Type Filter (LOB)
      if (filterProductType !== 'all') {
        const hasLOB = b.items?.some((it) => it.businessLineId === filterProductType);
        if (!hasLOB) return false;
      }

      // 7. Status Filter
      if (filterStatus !== 'all') {
        if (b.status !== filterStatus) return false;
      }

      // 8. Instant Table Search Box
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = b.bookingNumber.toLowerCase().includes(q);
        const matchCust = b.customerName.toLowerCase().includes(q);
        const matchCustCode = b.customerCode?.toLowerCase().includes(q) || false;
        const matchEvent = b.eventTitle.toLowerCase().includes(q);
        const matchVenue = b.venueName.toLowerCase().includes(q);
        const matchPIC = b.salesPicName?.toLowerCase().includes(q) || false;
        if (!matchNo && !matchCust && !matchCustCode && !matchEvent && !matchVenue && !matchPIC) {
          return false;
        }
      }

      return true;
    });
  }, [
    serviceBookings,
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

  // Reset Filters Handler (Reset button in MEDIST 4.0 filter card)
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
    addToast('Filters Reset', 'Search criteria reset to defaults.', 'info');
  };

  // Pagination slice
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredBookings.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredBookings, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredBookings.length / entriesPerPage) || 1;

  // Row selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBookingIds(filteredBookings.map((b) => b.id));
    } else {
      setSelectedBookingIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Actions
  const handleAddNew = () => {
    setEditingBooking(null);
    setViewMode('create');
  };

  const handleEdit = (booking: ServiceBookingOrder) => {
    setEditingBooking(booking);
    setViewMode('edit');
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    deleteServiceBooking(deleteConfirmId);
    setDeleteConfirmId(null);
    setSelectedBookingIds((prev) => prev.filter((id) => id !== deleteConfirmId));
    addToast('Booking Deleted', 'The booking record has been deleted.', 'info');
  };

  // Print Handlers
  const handlePrintSalesOrder = () => {
    const target =
      selectedBookingIds.length > 0
        ? serviceBookings.find((b) => b.id === selectedBookingIds[0])
        : paginatedBookings[0];

    if (!target) {
      addToast('No Order Selected', 'Please select or filter an order to print.', 'error');
      return;
    }

    setPrintModalState({
      isOpen: true,
      booking: target,
      mode: 'order'
    });
  };

  const handlePrintReceipt = () => {
    const target =
      selectedBookingIds.length > 0
        ? serviceBookings.find((b) => b.id === selectedBookingIds[0])
        : paginatedBookings[0];

    if (!target) {
      addToast('No Order Selected', 'Please select or filter an order to print receipt.', 'error');
      return;
    }

    setPrintModalState({
      isOpen: true,
      booking: target,
      mode: 'receipt'
    });
  };

  // Status Badge Styler
  const renderStatusBadge = (status: ServiceBookingStatus) => {
    switch (status) {
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
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600 animate-spin" /> IN PROGRESS
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Check className="w-3 h-3 text-purple-600" /> COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" /> CANCELLED
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

  // Business Line (LOB) Badge Styler
  const renderLobBadges = (items?: ServiceBookingOrder['items']) => {
    if (!items || items.length === 0) return null;
    const uniqueLobs = Array.from(new Set(items.map((it) => it.businessLineId)));

    return (
      <div className="flex flex-wrap gap-1">
        {uniqueLobs.map((lob) => {
          let color = 'bg-slate-100 text-slate-700 border-slate-200';
          let label = lob;
          if (lob === 'QUEINVITE') {
            color = 'bg-cyan-50 text-[#086288] border-cyan-200';
            label = 'Queinvite';
          } else if (lob === 'HIZAKI') {
            color = 'bg-sky-50 text-sky-700 border-sky-200';
            label = 'Hizaki';
          } else if (lob === 'AURUM') {
            color = 'bg-amber-50 text-amber-700 border-amber-200';
            label = 'Aurum';
          } else if (lob === 'KIMIKO') {
            color = 'bg-pink-50 text-pink-700 border-pink-200';
            label = 'Kimiko';
          }
          return (
            <span
              key={lob}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${color}`}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  // If in Create / Edit mode, render dedicated full-page form
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ServiceBookingCreatePage
        onBack={() => {
          setViewMode('list');
          setEditingBooking(null);
        }}
        onSuccess={(saved) => {
          setViewMode('list');
          setEditingBooking(null);
          setViewingBooking(saved);
        }}
        initialBooking={editingBooking}
      />
    );
  }

  // =========================================================================
  // LIST VIEW: MEDIST 4.0 STANDARD SALES ORDER LIST
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (SCREENSHOT 2 MEDIST 4.0 REFERENCE)    */}
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
                    className="w-full h-9 pl-3 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] cursor-pointer focus:outline-none focus:border-[#086288]"
                  />
                  {filterCustomer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterCustomer(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  {serviceBookings.map((b) => (
                    <option key={b.id} value={b.bookingNumber}>
                      {b.bookingNumber} ({b.customerName})
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
                  <option value="all">All Status</option>
                  <option value="open">OPEN (Order Entry)</option>
                  <option value="received">RECEIVED (Receive Gate 1)</option>
                  <option value="picked">PICKED (Picking Gate 2 / Invoiced)</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="completed">COMPLETED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. ACTION TOOLBAR & TABLE CONTROLS                                    */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Sales Order</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintSalesOrder}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print Order Sheet</span>
          </button>

          {/* Checkbox: Print with Price */}
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={printWithPrice}
              onChange={(e) => setPrintWithPrice(e.target.checked)}
              className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
            />
            <span>Print with Price</span>
          </label>

          <button
            type="button"
            onClick={handlePrintReceipt}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print Order Receipt</span>
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
              className="h-9 px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] cursor-pointer focus:outline-none focus:border-[#086288]"
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
              className="w-48 h-9 px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. MAIN DATA TABLE (7 UNIVERSAL COLUMNS - OPTION B)                   */}
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
                      filteredBookings.length > 0 &&
                      selectedBookingIds.length === filteredBookings.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2 text-center w-24">Action</th>
                <th className="py-2.5 px-3 w-44">Sales Order No</th>
                <th className="py-2.5 px-3 w-36">Order Type</th>
                <th className="py-2.5 px-3 w-36">Customer Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Customer Name</th>
                <th className="py-2.5 px-3 w-48">Branch & Sales PIC</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No sales order records found</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Adjust your filter criteria or click "+ Sales Order" to create a new order.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const isSelected = selectedBookingIds.includes(b.id);
                  const branchCodeDisplay = b.branchCode ? b.branchCode.split(' - ')[0] : 'BR-01';

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-[#EFF7FA]/50 transition-colors ${
                        isSelected ? 'bg-[#EFF7FA]/80' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(b.id)}
                          className="w-4 h-4 rounded text-[#086288] border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                        />
                      </td>

                      {/* Action Column */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingBooking(b)}
                            title="View Order Details"
                            className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPrintModalState({
                                isOpen: true,
                                booking: b,
                                mode: 'order'
                              });
                            }}
                            title="Print Order Sheet"
                            className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(b)}
                                title="Edit Order"
                                className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(b.id)}
                                title="Delete Order"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* No. Sales Order & Date */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-xs text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded w-fit">
                          {b.bookingNumber}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                          {b.bookingDate}
                        </div>
                      </td>

                      {/* Order Type */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            b.orderType === 'Goods'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : b.orderType === 'Service'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}
                        >
                          {b.orderType || 'Normal SO'}
                        </span>
                      </td>

                      {/* Customer Code */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-[#086288] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 inline-block">
                          {b.customerCode || 'CUST'}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-xs text-[#0F172A]">
                          {b.customerName || '-'}
                        </span>
                      </td>

                      {/* Branch & Sales PIC */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#CBD5E1]">
                            {branchCodeDisplay}
                          </span>
                          <span className="text-xs text-[#0F172A] font-medium truncate max-w-[140px]">
                            {b.salesPicName || 'PIC'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderStatusBadge(b.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-[#F8FAFC] border-t border-[#CBD5E1] text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <strong className="text-[#0F172A]">
              {filteredBookings.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-[#0F172A]">
              {Math.min(currentPage * entriesPerPage, filteredBookings.length)}
            </strong>{' '}
            of <strong className="text-[#0F172A]">{filteredBookings.length}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-[#CBD5E1] rounded-md disabled:opacity-40 hover:bg-[#F1F5F9] cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx + 1)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  currentPage === idx + 1
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                {idx + 1}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-[#CBD5E1] rounded-md disabled:opacity-40 hover:bg-[#F1F5F9] cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. MODALS: INSPECTION, LOOKUP, PRINT, DELETE                          */}
      {/* ===================================================================== */}

      {/* Customer Lookup for Filter */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={(cust) => {
          setFilterCustomer({
            id: cust.id,
            code: cust.customerCode,
            name: cust.name
          });
        }}
        title="Filter by Customer Order"
      />

      {/* Print Preview Modal */}
      <ServiceBookingPrintModal
        isOpen={printModalState.isOpen}
        onClose={() =>
          setPrintModalState((prev) => ({ ...prev, isOpen: false, booking: null }))
        }
        booking={printModalState.booking}
        mode={printModalState.mode}
        printWithPrice={printWithPrice}
      />

      {/* Booking Detail Inspection Modal */}
      {viewingBooking && (
        <BaseModal
          isOpen={Boolean(viewingBooking)}
          onClose={() => setViewingBooking(null)}
          title={`Order Inspection: ${viewingBooking.bookingNumber}`}
          description={`${viewingBooking.eventTitle} • Recorded on ${viewingBooking.bookingDate}`}
          size="xl"
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  const b = viewingBooking;
                  setViewingBooking(null);
                  setPrintModalState({
                    isOpen: true,
                    booking: b,
                    mode: 'order'
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF7FA] hover:bg-[#B7DDEA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Order Sheet
              </button>

              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = viewingBooking;
                      setViewingBooking(null);
                      handleEdit(b);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingBooking(null)}
                  className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top Summary Card */}
            <div className="bg-[#EFF7FA] border border-[#B7DDEA] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#086288]">
                    {viewingBooking.bookingNumber}
                  </span>
                  {renderStatusBadge(viewingBooking.status)}
                </div>
                <h3 className="text-base font-bold text-[#0F172A] mt-1">
                  {viewingBooking.eventTitle}
                </h3>
                <div className="text-xs text-[#475569] flex flex-wrap items-center gap-3 mt-1">
                  <span>Branch: {viewingBooking.branchName || viewingBooking.branchCode || 'BR-01'}</span>
                  <span>PIC: {viewingBooking.salesPicName || 'Dimas Wicaksono'}</span>
                  <span>Event Date: {viewingBooking.eventDate} ({viewingBooking.eventSession})</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-[#64748B]">Total Contract Value</span>
                <div className="text-xl font-mono font-extrabold text-[#086288]">
                  Rp {viewingBooking.totalAmount.toLocaleString('id-ID')}
                </div>
                <span className="text-[11px] text-[#64748B]">
                  Payment Terms: {viewingBooking.paymentTermText || 'DP 20% + Net 30'}
                </span>
              </div>
            </div>

            {/* Client & Venue Two-Column Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
                <span className="font-bold uppercase text-[10px] text-[#475569] tracking-wider block border-b border-[#CBD5E1] pb-1">
                  Customer Information
                </span>
                <div>Name: <strong className="text-[#0F172A]">{viewingBooking.customerName}</strong></div>
                <div>Code: <span className="font-mono text-[#086288] font-bold">{viewingBooking.customerCode}</span></div>
                <div>Phone: <span className="text-[#0F172A]">{viewingBooking.customerPhone}</span></div>
                {viewingBooking.customerEmail && <div>Email: {viewingBooking.customerEmail}</div>}
                {viewingBooking.taxRegNumber && <div>NPWP: <span className="font-mono">{viewingBooking.taxRegNumber}</span></div>}
              </div>

              <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
                <span className="font-bold uppercase text-[10px] text-[#475569] tracking-wider block border-b border-[#CBD5E1] pb-1">
                  Venue & Logistics
                </span>
                <div>Venue: <strong className="text-[#0F172A]">{viewingBooking.venueName}</strong></div>
                <div>Address: {viewingBooking.venueAddress || viewingBooking.deliveryAddress}</div>
                <div>City: {viewingBooking.venueCity || 'Jakarta'}</div>
                {typeof viewingBooking.distanceFromHqKm === 'number' && (
                  <div className="text-[#086288] font-bold">
                    HQ Distance: ±{viewingBooking.distanceFromHqKm} km
                  </div>
                )}
                <div>Delivery Via: {viewingBooking.deliveryVia || 'Crew & Fleet Logistics'}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-1.5">
              <span className="font-bold text-xs text-[#475569] uppercase tracking-wider block">
                Ordered Service Items ({viewingBooking.items?.length || 0})
              </span>
              <div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#EFF7FA] text-[#086288] font-bold border-b border-[#CBD5E1]">
                    <tr>
                      <th className="py-2 px-3">Service Name</th>
                      <th className="py-2 px-3">Cost Center</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-center">UoM</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {viewingBooking.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-semibold text-[#0F172A]">{it.serviceName}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#475569]">
                          {it.costCenterCode || it.businessLineId}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">{it.quantity}</td>
                        <td className="py-2 px-2 text-center text-[#64748B]">{it.uom}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          Rp {it.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#086288]">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Milestones */}
            {viewingBooking.milestones && viewingBooking.milestones.length > 0 && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl space-y-2">
                <span className="font-bold text-xs text-[#086288] uppercase tracking-wider block">
                  Payment Milestone Schedule
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {viewingBooking.milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="bg-white p-2.5 rounded-lg border border-[#CBD5E1] text-xs space-y-0.5"
                    >
                      <div className="font-bold text-[#0F172A]">
                        {ms.milestoneName} ({ms.percentage}%)
                      </div>
                      <div className="font-mono font-bold text-[#086288]">
                        Rp {ms.amount.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Due: {ms.dueDate || 'Upon Schedule'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </BaseModal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <BaseModal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Sales Order Record"
          description="Are you sure you want to delete this sales order? This action cannot be undone."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          }
        >
          <p className="text-xs text-[#475569]">
            The selected sales order record and its items will be removed permanently.
          </p>
        </BaseModal>
      )}
    </div>
  );
};
