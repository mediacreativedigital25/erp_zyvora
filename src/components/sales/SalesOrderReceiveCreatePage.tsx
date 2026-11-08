import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  PackageCheck,
  ShieldCheck,
  FileText,
  Gift
} from 'lucide-react';
import {
  UnifiedReceiveItem
} from './SalesOrderReceiveView';
import { generateRsvNumber } from '../../utils/salesReceiveUtils';
import { useErp } from '../../context/ErpContext';
import { SalesOrderLookupModal } from './SalesOrderLookupModal';

interface ReserveLineItem {
  id: string;
  sku: string;
  name: string;
  isBonus: boolean;
  itemType: 'physical' | 'service';
  availableStock: number;
  qtyOrder: number;
  qtyReserve: number;
  uom: string;
  unitPrice: number;
  discountPercent: number;
  discountValue: number;
  subtotal: number;
  boRemark: string;
}

interface SalesOrderReceiveCreatePageProps {
  initialOrder?: UnifiedReceiveItem | null;
  availableOrders: UnifiedReceiveItem[];
  onBack: () => void;
  onSuccess: () => void;
}

export const SalesOrderReceiveCreatePage: React.FC<SalesOrderReceiveCreatePageProps> = ({
  initialOrder,
  availableOrders,
  onBack,
  onSuccess
}) => {
  const {
    branches,
    warehouses,
    products,
    setSalesOrders,
    setServiceBookings,
    addToast
  } = useErp();

  // Active selected order
  const [selectedOrder, setSelectedOrder] = useState<UnifiedReceiveItem | null>(initialOrder || null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Form Fields - Left Column
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialOrder?.branchId || branches[0]?.id || ''
  );
  const [reserveDate, setReserveDate] = useState<string>(() => {
    return initialOrder?.receiveDate || new Date().toISOString().slice(0, 10);
  });
  const [reserveNumber, setReserveNumber] = useState<string>(() => {
    return initialOrder?.receiveNumber || generateRsvNumber(initialOrder?.branchCode || '01', reserveDate);
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id || ''
  );
  const [validationNotes, setValidationNotes] = useState<string>('');

  // Active Tab: 'order' or 'bonus'
  const [activeTab, setActiveTab] = useState<'order' | 'bonus'>('order');

  // Items State
  const [items, setItems] = useState<ReserveLineItem[]>([]);

  // Synchronize items whenever selectedOrder or selectedWarehouseId changes
  useEffect(() => {
    if (!selectedOrder) {
      setItems([]);
      return;
    }

    // Set branch and warehouse to match the order
    if (selectedOrder.branchId) {
      setSelectedBranchId(selectedOrder.branchId);
    }
    if (selectedOrder.warehouseId) {
      setSelectedWarehouseId(selectedOrder.warehouseId);
    }

    if (selectedOrder.receiveNumber) {
      setReserveNumber(selectedOrder.receiveNumber);
      if (selectedOrder.receiveDate) {
        setReserveDate(selectedOrder.receiveDate);
      }
    } else {
      setReserveNumber(generateRsvNumber(selectedOrder.branchCode || '01', reserveDate));
    }

    const mappedItems: ReserveLineItem[] = (selectedOrder.items || []).map((it, idx) => {
      // Determine if item is physical goods or service
      const isService =
        selectedOrder.sourceType === 'service' ||
        it.businessLineId === 'QUEINVITE' ||
        it.businessLineId === 'HIZAKI' ||
        it.businessLineId === 'AURUM' ||
        it.businessLineId === 'KIMIKO';

      const itemType: 'physical' | 'service' = isService ? 'service' : 'physical';

      // Find product in catalog for physical stock
      let availableStock = 0;
      if (itemType === 'physical') {
        const prod = products.find(
          (p) => p.sku === it.sku || p.name.toLowerCase() === it.name.toLowerCase()
        );
        if (prod) {
          availableStock = prod.stockByWarehouse?.[selectedWarehouseId] ?? prod.totalStock ?? 150;
        } else {
          availableStock = 120; // Standard demo inventory availability fallback
        }
      }

      const isBonus = Boolean(it.isBonus);

      return {
        id: it.id || `item_${idx}`,
        sku: it.sku || `SKU-${1000 + idx}`,
        name: it.name,
        isBonus,
        itemType,
        availableStock,
        qtyOrder: it.quantity,
        qtyReserve: 0, // Initial 0 until reserved or edited
        uom: it.uom || 'Piece',
        unitPrice: isBonus ? 0 : it.unitPrice,
        discountPercent: 0,
        discountValue: 0,
        subtotal: isBonus ? 0 : it.total,
        boRemark: ''
      };
    });

    setItems(mappedItems);
  }, [selectedOrder, selectedWarehouseId, products]);

  // Tab Filtering
  const orderItems = useMemo(() => items.filter((it) => !it.isBonus), [items]);
  const bonusItems = useMemo(() => items.filter((it) => it.isBonus), [items]);
  const displayedItems = activeTab === 'order' ? orderItems : bonusItems;

  // Handle Qty Reserve change manually per row
  const handleQtyReserveChange = (itemId: string, val: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const validVal = Math.max(0, val);
        let remark = it.boRemark;

        if (it.itemType === 'service') {
          remark = validVal >= it.qtyOrder ? 'Non-Stock Confirmed' : 'Partially Reserved';
        } else {
          if (validVal >= it.qtyOrder) {
            remark = 'Fully Reserved';
          } else if (validVal > 0) {
            remark = 'Partially Reserved';
          } else {
            remark = 'Wait Stock / Pending PO';
          }
        }

        return {
          ...it,
          qtyReserve: validVal,
          boRemark: remark
        };
      })
    );
  };

  // Handle BO Remark change manually per row
  const handleRemarkChange = (itemId: string, remark: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, boRemark: remark } : it))
    );
  };

  // =========================================================================
  // THE "RESERVE ALL" CORE ACTION
  // =========================================================================
  const handleReserveAll = () => {
    if (!selectedOrder || items.length === 0) {
      addToast('No Order Selected', 'Please select a Sales Order first.', 'error');
      return;
    }

    let hasDeficit = false;

    const updated = items.map((it) => {
      // 1. Non-Stock / Service Items: directly reserve 100%
      if (it.itemType === 'service') {
        return {
          ...it,
          qtyReserve: it.qtyOrder,
          boRemark: 'Non-Stock Confirmed'
        };
      }

      // 2. Physical Stock Items: check warehouse available stock
      if (it.availableStock >= it.qtyOrder) {
        return {
          ...it,
          qtyReserve: it.qtyOrder,
          boRemark: 'Fully Reserved'
        };
      } else {
        hasDeficit = true;
        const allocatable = Math.max(0, it.availableStock);
        return {
          ...it,
          qtyReserve: allocatable,
          boRemark: allocatable > 0 ? 'Partially Reserved' : 'Wait Stock / Pending PO'
        };
      }
    });

    setItems(updated);

    if (hasDeficit) {
      addToast(
        'Reserve All (Partial Stock)',
        'Some physical items have insufficient warehouse stock. Back Order Remark has been assigned.',
        'warning'
      );
    } else {
      addToast(
        'Reserve All Successful',
        'All line items have been fully reserved and validated.',
        'success'
      );
    }
  };

  // =========================================================================
  // SAVE & CONFIRM RECEIVE
  // =========================================================================
  const handleSaveAndConfirm = () => {
    if (!selectedOrder) {
      addToast('Validation Incomplete', 'Please select a Sales Order first.', 'error');
      return;
    }

    if (items.length === 0) {
      addToast('No Items', 'The selected order contains no line items to reserve.', 'error');
      return;
    }

    const unreservedCount = items.filter((it) => it.qtyReserve === 0 && !it.boRemark).length;
    if (unreservedCount > 0) {
      addToast(
        'Unreserved Items Warning',
        `There are ${unreservedCount} item(s) with 0 reserved quantity. Click 'Reserve All' or set remarks.`,
        'warning'
      );
      return;
    }

    // Move status of the order to 'received' in ErpContext
    if (selectedOrder.sourceType === 'goods' && selectedOrder.rawGoodsOrder) {
      const targetId = selectedOrder.rawGoodsOrder.id;
      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === targetId
            ? {
                ...o,
                status: 'received',
                receiveNumber: reserveNumber,
                receiveDate: reserveDate
              }
            : o
        )
      );
    } else if (selectedOrder.rawServiceBooking) {
      const targetId = selectedOrder.rawServiceBooking.id;
      setServiceBookings((prev) =>
        prev.map((b) =>
          b.id === targetId
            ? {
                ...b,
                status: 'received',
                receiveNumber: reserveNumber,
                receiveDate: reserveDate
              }
            : b
        )
      );
    }

    addToast(
      'Sales Order Received & Reserved',
      `Order ${selectedOrder.orderNumber} successfully validated & reserved (Gate 1 Passed). Ready for Delivery Picking.`,
      'success'
    );

    onSuccess();
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* FORM CARD: TWO COLUMNS (MEDIST 4.0 CREATE LAYOUT)                     */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN: ORDER & OPERATIONAL DETAILS             */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Branch <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.branchDisplay : '-'}
                  placeholder="Branch from Sales Order"
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* Receive Number / Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Receive No / Date <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  readOnly
                  value={reserveNumber}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#086288] cursor-not-allowed"
                  title="Auto-Generated Receive Number (RSV)"
                />
                <input
                  type="date"
                  value={reserveDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setReserveDate(newDate);
                    if (!selectedOrder?.receiveNumber) {
                      setReserveNumber(generateRsvNumber(selectedOrder?.branchCode || '01', newDate));
                    }
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Receive Date"
                />
              </div>
            </div>

            {/* Order Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Order Type <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.orderType : 'Select Order First'}
                  placeholder="Order type from Sales Order"
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Order Number (with Lookup Modal button) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Order Number <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="-- Select Open Sales Order --"
                    value={
                      selectedOrder
                        ? `${selectedOrder.orderNumber} (${selectedOrder.customerName})`
                        : ''
                    }
                    onClick={() => setIsLookupOpen(true)}
                    className="w-full h-9 pl-3 pr-8 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] cursor-pointer focus:outline-hidden focus:border-[#086288]"
                  />
                  {selectedOrder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsLookupOpen(true)}
                  className="h-9 px-3 bg-[#EFF7FA] hover:bg-[#B7DDEA] text-[#086288] border border-[#B7DDEA] rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  title="Lookup Open Sales Order"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Order Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Order Date</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.date : '-'}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Warehouse */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Warehouse <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.warehouseDisplay : '-'}
                  placeholder="Warehouse from Sales Order"
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* Lini Produk / Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Lini Produk</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedOrder?.items?.[0]?.businessLineId
                      ? `${selectedOrder.items[0].businessLineId} — Business Line`
                      : '0 - ALL / MULTI-LINE'
                  }
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Destination / Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Destination / Venue</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.destinationOrVenue : '-'}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN: CUSTOMER & COMMERCIAL SUMMARY          */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Customer (Code & Name) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Customer <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="Code"
                  value={selectedOrder?.customerCode || '-'}
                  className="w-24 h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#0F172A] cursor-not-allowed shrink-0"
                />
                <input
                  type="text"
                  readOnly
                  placeholder="Customer Name"
                  value={selectedOrder?.customerName || '-'}
                  className="flex-1 h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-semibold text-[#0F172A] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Customer Level */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Customer Level</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value="P1 - Primary Active Client"
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Amount (Subtotal) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Amount (Subtotal)</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedOrder
                      ? `Rp ${selectedOrder.subtotal.toLocaleString('id-ID')}`
                      : 'Rp 0'
                  }
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono font-semibold text-[#0F172A] text-right cursor-not-allowed"
                />
              </div>
            </div>

            {/* Line Disc & Order Disc */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Line / Order Disc</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Line:</span>
                  <input
                    type="text"
                    readOnly
                    value={
                      selectedOrder
                        ? `Rp ${selectedOrder.lineDiscount.toLocaleString('id-ID')}`
                        : 'Rp 0'
                    }
                    title="Line Item Discount from SO"
                    className="w-full h-9 pl-11 pr-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-right text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Order:</span>
                  <input
                    type="text"
                    readOnly
                    value={
                      selectedOrder
                        ? `Rp ${selectedOrder.orderDiscount.toLocaleString('id-ID')}`
                        : 'Rp 0'
                    }
                    title="Global Order Discount from SO"
                    className="w-full h-9 pl-12 pr-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-right text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Netto (Total Amount) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Netto (Total)</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedOrder
                      ? `Rp ${selectedOrder.totalAmount.toLocaleString('id-ID')}`
                      : 'Rp 0'
                  }
                  className="w-full h-9 px-3 py-2 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg text-sm font-mono font-bold text-[#086288] text-right cursor-not-allowed"
                />
              </div>
            </div>

            {/* Tax Amount (PPN 11%) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Tax Amount (PPN)</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedOrder
                      ? selectedOrder.taxAmount > 0
                        ? `Rp ${selectedOrder.taxAmount.toLocaleString('id-ID')}`
                        : selectedOrder.rawServiceBooking?.taxCode?.includes('02')
                        ? 'Included in Total (Inklusif)'
                        : 'Rp 0 (Non-Tax)'
                      : 'Rp 0'
                  }
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] text-right cursor-not-allowed"
                />
              </div>
            </div>

            {/* Validation Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Receive Notes</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="e.g. Verified physically at Central Warehouse Cakung..."
                  className="w-full h-9 px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. BOTTOM CARD: TABS & LINE ITEMS RESERVATION TABLE                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'order'
                ? 'border-[#086288] text-[#086288] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Order Items ({orderItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bonus')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bonus'
                ? 'border-[#086288] text-[#086288] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <span>Bonus Items ({bonusItems.length})</span>
          </button>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold">
              <tr>
                <th className="py-2.5 px-3 w-32">Product</th>
                <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                <th className="py-2.5 px-3 text-center w-28">Type</th>
                <th className="py-2.5 px-3 text-right w-32">Available Stock</th>
                <th className="py-2.5 px-3 text-center w-24">Qty. Order</th>
                <th className="py-2.5 px-3 text-center w-28">
                  Qty. Reserve <span className="text-rose-500">*</span>
                </th>
                <th className="py-2.5 px-3 text-center w-24">UOM Sales</th>
                <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                <th className="py-2.5 px-3 text-right w-32">Subtotal (Rp)</th>
                <th className="py-2.5 px-3 w-40">BO Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {!selectedOrder ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No Sales Order Selected</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Please select an open Sales Order from the Order Number field above to load items.
                    </p>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[#64748B]">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
                      <Gift className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">
                      {activeTab === 'bonus'
                        ? 'No Bonus Items in this Sales Order'
                        : 'No line items found in this section'}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {activeTab === 'bonus'
                        ? 'Promotional items and complimentary gifts will appear here for stock validation when attached to the order.'
                        : 'Please check your order lines or re-select an order.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedItems.map((it) => {
                  const isStockDeficit =
                    it.itemType === 'physical' && it.availableStock < it.qtyOrder;

                  return (
                    <tr
                      key={it.id}
                      className={`hover:bg-[#EFF7FA]/40 transition-colors ${
                        isStockDeficit ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Product SKU */}
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-[#086288]">
                        {it.sku}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#0F172A]">{it.name}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {it.itemType === 'physical' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            <Package className="w-2.5 h-2.5" /> Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-2.5 h-2.5" /> Non-Stock
                          </span>
                        )}
                      </td>

                      {/* Available Stock */}
                      <td className="py-2.5 px-3 text-right">
                        {it.itemType === 'physical' ? (
                          <div>
                            <span
                              className={`font-mono font-bold text-xs ${
                                isStockDeficit ? 'text-amber-600' : 'text-emerald-700'
                              }`}
                            >
                              {it.availableStock.toLocaleString('id-ID')}
                            </span>
                            {isStockDeficit && (
                              <div className="text-[10px] text-amber-600 font-semibold flex items-center justify-end gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Deficit: {it.qtyOrder - it.availableStock}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                          </span>
                        )}
                      </td>

                      {/* Qty Order */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0F172A]">
                        {it.qtyOrder}
                      </td>

                      {/* Qty Reserve (Editable Input) */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={it.qtyOrder}
                          value={it.qtyReserve}
                          onChange={(e) =>
                            handleQtyReserveChange(it.id, Number(e.target.value))
                          }
                          className="w-20 h-8 px-2 border border-[#CBD5E1] rounded-lg font-mono font-bold text-center text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                        />
                      </td>

                      {/* UOM Sales */}
                      <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                        {it.uom}
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">
                        {it.unitPrice.toLocaleString('id-ID')}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                        Rp {it.subtotal.toLocaleString('id-ID')}
                      </td>

                      {/* BO Remark Dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.boRemark}
                          onChange={(e) => handleRemarkChange(it.id, e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
                        >
                          <option value="">-- Remark --</option>
                          <option value="Fully Reserved">Fully Reserved</option>
                          <option value="Partially Reserved">Partially Reserved</option>
                          <option value="Wait Stock / Pending PO">Wait Stock / Pending PO</option>
                          <option value="Non-Stock Confirmed">Non-Stock Confirmed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Toolbar (Reserve All & Count) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#F8FAFC] border-t border-[#CBD5E1]">
          {/* Left: Entries info + Reserve All button */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">
              Showing <strong className="text-[#0F172A]">{displayedItems.length}</strong> {activeTab === 'bonus' ? 'bonus' : 'order'} item(s) (Total: {items.length})
            </span>

            <button
              type="button"
              onClick={handleReserveAll}
              disabled={!selectedOrder || items.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Automatically allocate full reserve for Non-Stock/Services and verify physical inventory"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Reserve All</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. FORM ACTIONS BAR (BOTTOM RIGHT)                                    */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          Fields marked with <span className="text-rose-500 font-bold">*</span> are required.
        </span>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndConfirm}
            disabled={!selectedOrder}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Confirm Receive</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. SALES ORDER LOOKUP MODAL                                           */}
      {/* ===================================================================== */}
      <SalesOrderLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        availableOrders={availableOrders}
        onSelectOrder={(order) => {
          setSelectedOrder(order);
          setIsLookupOpen(false);
        }}
        title="Lookup Open Sales Order"
      />
    </div>
  );
};
