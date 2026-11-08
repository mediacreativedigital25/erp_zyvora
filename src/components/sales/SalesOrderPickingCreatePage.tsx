import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  PackageCheck,
  ShieldCheck,
  FileText,
  Barcode,
  Truck,
  Trash2,
  Eye,
  Gift
} from 'lucide-react';
import { UnifiedReceiveItem } from './SalesOrderReceiveView';
import { generateDoNumber } from '../../utils/salesReceiveUtils';
import { useErp } from '../../context/ErpContext';
import { ReserveLookupModal } from './ReserveLookupModal';
import { SalesInvoiceItem } from '../../types/erp';

interface ReservedItemRow {
  id: string;
  sku: string;
  name: string;
  uom: string;
  itemType: 'physical' | 'service';
  reservedQty: number;
  pickQty: number;
  unitPrice: number;
  total: number;
  isBonus?: boolean;
}

interface PickingItemRow {
  id: string;
  reservedItemId: string;
  sku: string;
  name: string;
  uom: string;
  itemType: 'physical' | 'service';
  batchNumber: string;
  expiredDate: string;
  qty: number;
  batchInput: string; // e.g. "Auto Allocated", "Scanned Barcode", "Non-Stock Confirmed"
  isBonus?: boolean;
}

interface SalesOrderPickingCreatePageProps {
  initialOrder?: UnifiedReceiveItem | null;
  availableOrders: UnifiedReceiveItem[];
  onBack: () => void;
  onSuccess: () => void;
}

export const SalesOrderPickingCreatePage: React.FC<SalesOrderPickingCreatePageProps> = ({
  initialOrder,
  availableOrders,
  onBack,
  onSuccess
}) => {
  const {
    branches,
    warehouses,
    customers,
    products,
    salesOrders,
    serviceBookings,
    updateSalesOrder,
    updateServiceBooking,
    createSalesInvoice,
    addToast
  } = useErp();

  // Active Selected Order
  const [selectedOrder, setSelectedOrder] = useState<UnifiedReceiveItem | null>(initialOrder || null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Form Fields - Top Card
  const [pickingDate, setPickingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [startProcessTime, setStartProcessTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
  });

  // Barcode Scanner Input State
  const [barcodeInput, setBarcodeInput] = useState<string>('');

  // Tables State: Left (Reserved) and Right (Picking)
  const [reservedItems, setReservedItems] = useState<ReservedItemRow[]>([]);
  const [pickingItems, setPickingItems] = useState<PickingItemRow[]>([]);

  // Modal for Viewing Single Item Spec
  const [viewingReservedItem, setViewingReservedItem] = useState<ReservedItemRow | null>(null);

  // Synchronize Items when selectedOrder changes
  useEffect(() => {
    if (!selectedOrder) {
      setReservedItems([]);
      setPickingItems([]);
      return;
    }

    // Capture snapshot of start time
    const now = new Date();
    setStartProcessTime(now.toTimeString().slice(0, 8));

    const initialReserved: ReservedItemRow[] = [];
    const autoPickedNonStock: PickingItemRow[] = [];

    (selectedOrder.items || []).forEach((it, idx) => {
      const isService =
        selectedOrder.sourceType === 'service' ||
        it.businessLineId === 'QUEINVITE' ||
        it.businessLineId === 'HIZAKI' ||
        it.businessLineId === 'AURUM' ||
        it.businessLineId === 'KIMIKO';

      const itemType: 'physical' | 'service' = isService ? 'service' : 'physical';
      const itemId = it.id || `item_${idx}`;
      const sku = it.sku || `SKU-${1000 + idx}`;
      const name = it.name;
      const uom = it.uom || 'Piece';
      const reservedQty = it.quantity;

      // RULE: Non-stock / service items AUTOMATICALLY move to the Picking table!
      if (itemType === 'service') {
        initialReserved.push({
          id: itemId,
          sku,
          name,
          uom,
          itemType: 'service',
          reservedQty,
          pickQty: reservedQty, // 100% fulfilled immediately
          unitPrice: it.unitPrice,
          total: it.total,
          isBonus: it.isBonus
        });

        autoPickedNonStock.push({
          id: `pick_ns_${itemId}`,
          reservedItemId: itemId,
          sku,
          name,
          uom,
          itemType: 'service',
          batchNumber: 'Non-Stock / Service',
          expiredDate: 'N/A',
          qty: reservedQty,
          batchInput: 'Non-Stock Confirmed',
          isBonus: it.isBonus
        });
      } else {
        // Physical stock items start at pickQty = 0, waiting for scan or auto-picking
        initialReserved.push({
          id: itemId,
          sku,
          name,
          uom,
          itemType: 'physical',
          reservedQty,
          pickQty: 0,
          unitPrice: it.unitPrice,
          total: it.total,
          isBonus: it.isBonus
        });
      }
    });

    setReservedItems(initialReserved);
    setPickingItems(autoPickedNonStock);
  }, [selectedOrder]);

  // =========================================================================
  // BARCODE SCANNER HANDLER (FAST-TRACK WAREHOUSE INPUT)
  // =========================================================================
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    if (!selectedOrder || reservedItems.length === 0) {
      addToast('No Order Selected', 'Please select a Reserve Order first.', 'error');
      setBarcodeInput('');
      return;
    }

    // Find first physical item that matches SKU, name, or code and is NOT yet fully picked
    const targetItem = reservedItems.find((it) => {
      if (it.itemType !== 'physical') return false;
      const match =
        it.sku.toLowerCase() === query.toLowerCase() ||
        it.name.toLowerCase().includes(query.toLowerCase());
      return match && it.pickQty < it.reservedQty;
    });

    if (!targetItem) {
      // Check if it already exists but is full
      const alreadyFull = reservedItems.find((it) => {
        return (
          it.sku.toLowerCase() === query.toLowerCase() ||
          it.name.toLowerCase().includes(query.toLowerCase())
        );
      });

      if (alreadyFull) {
        addToast(
          'Item Already Fully Picked',
          `Item ${alreadyFull.name} (${alreadyFull.sku}) is already fully allocated (${alreadyFull.pickQty}/${alreadyFull.reservedQty}).`,
          'warning'
        );
      } else {
        addToast(
          'Barcode / Item Not Found',
          `No unfulfilled item matching "${query}" in this order reserve list.`,
          'error'
        );
      }
      setBarcodeInput('');
      return;
    }

    // Increment pickQty on Reserved table
    setReservedItems((prev) =>
      prev.map((it) => (it.id === targetItem.id ? { ...it, pickQty: it.pickQty + 1 } : it))
    );

    // Add or increment in Picking table
    const today = new Date();
    const defaultExpiry = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);
    const defaultBatch = `BATCH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    setPickingItems((prev) => {
      const existing = prev.find((p) => p.reservedItemId === targetItem.id);
      if (existing) {
        return prev.map((p) => (p.id === existing.id ? { ...p, qty: p.qty + 1 } : p));
      } else {
        return [
          ...prev,
          {
            id: `pick_${Date.now()}_${targetItem.id}`,
            reservedItemId: targetItem.id,
            sku: targetItem.sku,
            name: targetItem.name,
            uom: targetItem.uom,
            itemType: targetItem.itemType,
            batchNumber: defaultBatch,
            expiredDate: defaultExpiry,
            qty: 1,
            batchInput: 'Scanned Barcode',
            isBonus: targetItem.isBonus
          }
        ];
      }
    });

    addToast(
      'Barcode Scanned',
      `+1 unit allocated for ${targetItem.name} (${targetItem.pickQty + 1}/${targetItem.reservedQty}).`,
      'success'
    );

    setBarcodeInput('');
  };

  // =========================================================================
  // THE "AUTO PICKING" ACTION (MEDIST 4.0 ONE-CLICK ALLOCATION)
  // =========================================================================
  const handleAutoPicking = () => {
    if (!selectedOrder || reservedItems.length === 0) {
      addToast('No Order Selected', 'Please select a Reserve Order first.', 'error');
      return;
    }

    const today = new Date();
    const defaultExpiry = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);

    // 1. Set all items in Left Table to pickQty = reservedQty
    setReservedItems((prev) =>
      prev.map((it) => ({
        ...it,
        pickQty: it.reservedQty
      }))
    );

    // 2. Populate Right Table with all items
    const newPickingList: PickingItemRow[] = reservedItems.map((it, idx) => {
      const defaultBatch = `BATCH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
      const isService = it.itemType === 'service';

      return {
        id: `pick_auto_${it.id}`,
        reservedItemId: it.id,
        sku: it.sku,
        name: it.name,
        uom: it.uom,
        itemType: it.itemType,
        batchNumber: isService ? 'Non-Stock / Service' : defaultBatch,
        expiredDate: isService ? 'N/A' : defaultExpiry,
        qty: it.reservedQty,
        batchInput: isService ? 'Non-Stock Confirmed' : 'Auto Allocated',
        isBonus: it.isBonus
      };
    });

    setPickingItems(newPickingList);

    addToast(
      'Auto Picking Completed',
      'All reserved items have been 100% allocated with Batch Number and Expired Date.',
      'success'
    );
  };

  // Remove a physical item row from Picking table (unpick)
  const handleRemovePickingItem = (pickingRowId: string, reservedItemId: string) => {
    const targetRow = pickingItems.find((p) => p.id === pickingRowId);
    if (!targetRow) return;

    // Do not allow removing non-stock
    if (targetRow.itemType === 'service') {
      addToast('Cannot Remove Non-Stock', 'Service/Non-stock items are automatically confirmed.', 'info');
      return;
    }

    setPickingItems((prev) => prev.filter((p) => p.id !== pickingRowId));

    // Reset pickQty on Left Table
    setReservedItems((prev) =>
      prev.map((it) => (it.id === reservedItemId ? { ...it, pickQty: 0 } : it))
    );

    addToast('Item Unpicked', `Allocation for ${targetRow.name} has been reset.`, 'info');
  };

  // Update Batch Number or Expiry manually on Picking table
  const handleUpdatePickingField = (
    rowId: string,
    field: 'batchNumber' | 'expiredDate',
    val: string
  ) => {
    setPickingItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: val } : row))
    );
  };

  // =========================================================================
  // SUBMIT & COMPLETE PICKING (GATE 2 PASSED -> AUTO-INVOICE GENERATION)
  // =========================================================================
  const handleSubmitPicking = async () => {
    if (!selectedOrder) {
      addToast('Validation Incomplete', 'Please select a Reserve Order first.', 'error');
      return;
    }

    // Verify all reserved items are 100% picked
    const incompleteItems = reservedItems.filter((it) => it.pickQty < it.reservedQty);
    if (incompleteItems.length > 0) {
      addToast(
        'Incomplete Picking',
        `There are ${incompleteItems.length} item(s) not yet fully picked. Please scan items or click 'Auto Picking'.`,
        'warning'
      );
      return;
    }

    // 1. Generate Canonical DO Number: DO + 2-digit Branch + YYYYMM + 5-digit Seq (15 chars)
    const doNumber = generateDoNumber(selectedOrder.branchCode || '01', pickingDate);

    // 2. Update Order Status to 'picked' in Collections & Supabase
    const cleanId = selectedOrder.id.replace(/^(so_|sb_)/, '');
    const orderNo = selectedOrder.orderNumber;

    if (selectedOrder.sourceType === 'goods' && selectedOrder.rawGoodsOrder) {
      await updateSalesOrder(selectedOrder.rawGoodsOrder.id, {
        status: 'picked',
        deliveryOrderNumber: doNumber,
        pickingDate
      });
    } else if (selectedOrder.rawServiceBooking) {
      await updateServiceBooking(selectedOrder.rawServiceBooking.id, {
        status: 'picked',
        deliveryOrderNumber: doNumber,
        pickingDate
      });
    } else {
      // Fallback matching across collections
      const targetSo = salesOrders.find(
        (o) => o.id === selectedOrder.id || o.id === cleanId || o.orderNumber === orderNo
      );
      if (targetSo) {
        await updateSalesOrder(targetSo.id, {
          status: 'picked',
          deliveryOrderNumber: doNumber,
          pickingDate
        });
      }

      const targetSb = serviceBookings.find(
        (b) => b.id === selectedOrder.id || b.id === cleanId || b.bookingNumber === orderNo
      );
      if (targetSb) {
        await updateServiceBooking(targetSb.id, {
          status: 'picked',
          deliveryOrderNumber: doNumber,
          pickingDate
        });
      }
    }

    // 3. AUTO-GENERATE COMMERCIAL SALES INVOICE (FAKTUR TAGIHAN PELANGGAN)
    const customerObj = customers.find(
      (c) => c.customerCode === selectedOrder.customerCode || c.id === selectedOrder.customerId
    );
    const topDays = customerObj?.paymentTermsDays || 30;
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + topDays);
    const dueDateStr = dueDateObj.toISOString().slice(0, 10);

    const invoiceItems: SalesInvoiceItem[] = (selectedOrder.items || []).map((it, idx) => ({
      id: `inv_it_${Date.now()}_${idx}`,
      description: it.name,
      quantity: it.quantity,
      uom: it.uom,
      unitPrice: it.unitPrice,
      discount: it.discount || 0,
      subtotal: it.total
    }));

    let invoiceNumberCreated = 'INV-PENDING';
    try {
      const cleanSourceId =
        selectedOrder.rawServiceBooking?.id ||
        selectedOrder.rawGoodsOrder?.id ||
        selectedOrder.id.replace(/^(sb_sb_|so_so_)/, (m) => (m === 'sb_sb_' ? 'sb_' : 'so_'));

      const generatedInvoice = await createSalesInvoice({
        sourceType: selectedOrder.sourceType === 'goods' ? 'sales_order' : 'service_booking',
        sourceId: cleanSourceId,
        sourceNumber: selectedOrder.orderNumber,
        customerId: selectedOrder.customerId || 'cust_generic',
        customerCode: selectedOrder.customerCode,
        customerName: selectedOrder.customerName,
        customerPhone: selectedOrder.customerPhone,
        customerAddress: selectedOrder.destinationOrVenue,
        invoiceDate: pickingDate,
        dueDate: dueDateStr,
        paymentMethod: customerObj?.defaultPaymentMethod || 'top',
        paymentTermsDays: topDays,
        subtotal: selectedOrder.subtotal,
        discountTotal: selectedOrder.discountTotal,
        taxAmount: selectedOrder.taxAmount,
        totalAmount: selectedOrder.totalAmount,
        paidAmount: 0,
        outstandingBalance: selectedOrder.totalAmount,
        status: 'unpaid',
        deliveryOrderNumber: doNumber,
        branchId: selectedOrder.branchId,
        branchCode: selectedOrder.branchCode,
        isPrinted: false,
        items: invoiceItems,
        notes: `Generated automatically upon SO Delivery Picking completion (${doNumber}). Ref RSV: ${selectedOrder.receiveNumber || '-'}`
      });
      if (generatedInvoice?.invoiceNumber) {
        invoiceNumberCreated = generatedInvoice.invoiceNumber;
      }
    } catch (err: any) {
      console.error('Auto-invoice generation error:', err);
    }

    addToast(
      'Sales Order Picking Selesai (Gate 2 Passed)',
      `Surat Jalan ${doNumber} & Faktur Penjualan ${invoiceNumberCreated} otomatis diterbitkan dan siap ditagihkan di menu Print Invoice.`,
      'success'
    );

    onSuccess();
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP METADATA CARD: TWO COLUMNS (MEDIST 4.0 SO PICKING LAYOUT)      */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN: RESERVE NUMBER, DATE & BRANCH           */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Reserve Number (with Lookup Modal button) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Reserve Number <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="-- Select Reserve Number --"
                    value={
                      selectedOrder
                        ? `${selectedOrder.receiveNumber || 'RSV-N/A'} (${selectedOrder.customerName})`
                        : ''
                    }
                    onClick={() => setIsLookupOpen(true)}
                    className="w-full h-9 pl-3 pr-8 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#086288] cursor-pointer focus:outline-hidden focus:border-[#086288]"
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
                  title="Lookup Received Order (Gate 1 Passed)"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Picking Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Picking Date <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={pickingDate}
                  onChange={(e) => setPickingDate(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Picking Date"
                />
              </div>
            </div>

            {/* Branch (Two Read-only Boxes: Code + Name) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.branchCode : '-'}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                  title="Branch Code"
                />
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? (selectedOrder.branchName || 'Jakarta Pusat') : '-'}
                  className="col-span-2 w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-slate-700 cursor-not-allowed truncate"
                  title="Branch Name"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN: CUSTOMER & START PROCESS               */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Customer (Two Read-only Boxes: Code + Name) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Customer</label>
              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.customerCode : '-'}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono font-semibold text-slate-700 cursor-not-allowed"
                  title="Customer Code"
                />
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.customerName : '-'}
                  className="col-span-2 w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-semibold text-[#0F172A] cursor-not-allowed truncate"
                  title="Customer Name"
                />
              </div>
            </div>

            {/* Start Process (Date + Time) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Start Process</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  readOnly
                  value={pickingDate}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-slate-700 cursor-not-allowed"
                />
                <input
                  type="text"
                  readOnly
                  value={startProcessTime}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Warehouse / Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Warehouse / Hub</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedOrder ? selectedOrder.warehouseDisplay : '-'}
                  className="w-full h-9 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-slate-700 cursor-not-allowed truncate font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. BARCODE SCANNER STRIP (F2 FAST SCANNING INPUT)                     */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-4 space-y-2">
        <form onSubmit={handleBarcodeSubmit} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F172A] tracking-wide shrink-0">
              SCAN BARCODE (F2)
            </span>
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode with scanner or type SKU and press Enter..."
                className="w-full h-9 pl-9 pr-4 py-1.5 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg text-xs font-mono text-[#0F172A] placeholder:text-emerald-700/60 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 px-3 py-1 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Ensure Caps Lock is OFF when scanning barcode.</span>
          </div>
        </form>
      </div>

      {/* ===================================================================== */}
      {/* 3. SPLIT PANE TABLES: RESERVED (LEFT) vs PICKING (RIGHT)              */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* ------------------------------------------------------------------- */}
        {/* LEFT PANE: RESERVED TABLE                                           */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Reserved ({reservedItems.length})
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Target Allocation</span>
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold">
                <tr>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                  <th className="py-2 px-3 w-28">Product</th>
                  <th className="py-2 px-3">Description / UOM</th>
                  <th className="py-2 px-3 text-center w-20">Reserved</th>
                  <th className="py-2 px-3 text-center w-20">Pick Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {reservedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  reservedItems.map((it) => {
                    const isFullyPicked = it.pickQty >= it.reservedQty;

                    return (
                      <tr key={it.id} className="hover:bg-[#EFF7FA]/50 transition-colors">
                        {/* Action: View Spec */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingReservedItem(it)}
                            className="p-1 text-slate-400 hover:text-[#086288] hover:bg-slate-100 rounded cursor-pointer"
                            title="View Item Specification"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Product SKU */}
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-[11px] text-[#086288]">
                            {it.sku}
                          </span>
                        </td>

                        {/* Description & Type */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-[#0F172A] leading-tight">
                            {it.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-medium">{it.uom}</span>
                            {it.itemType === 'service' && (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                Non-Stock
                              </span>
                            )}
                            {it.isBonus && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                Bonus
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Reserved Qty */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-[#0F172A]">
                          {it.reservedQty}
                        </td>

                        {/* Pick Qty (Red if deficit, Green if complete) */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`font-mono font-extrabold text-xs ${
                              isFullyPicked ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {it.pickQty}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Reserved Footer with Auto Picking Button */}
          <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Showing {reservedItems.length} entries
              </span>

              <button
                type="button"
                onClick={handleAutoPicking}
                disabled={!selectedOrder || reservedItems.length === 0}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Automatically allocate all physical goods with default batch and expiry"
              >
                <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto Picking</span>
              </button>
            </div>

            <div className="p-2 bg-amber-50/80 border border-amber-200 rounded text-[10.5px] text-amber-800 leading-tight">
              Batch Number dan Expired Date akan tercetak pada print out DO / Faktur Penjualan.
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* RIGHT PANE: PICKING TABLE                                           */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Picking ({pickingItems.length})
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Physical Warehouse Execution</span>
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold">
                <tr>
                  <th className="py-2 px-2 text-center w-10">Action</th>
                  <th className="py-2 px-3 w-28">CD Product</th>
                  <th className="py-2 px-3 w-32">Batch Number</th>
                  <th className="py-2 px-3 w-28">Expired Date</th>
                  <th className="py-2 px-3 text-center w-16">QTY</th>
                  <th className="py-2 px-3 w-28">Batch Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {pickingItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  pickingItems.map((row) => (
                    <tr key={row.id} className="hover:bg-[#EFF7FA]/50 transition-colors">
                      {/* Action: Remove / Reset Row */}
                      <td className="py-2 px-2 text-center">
                        {row.itemType === 'physical' ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePickingItem(row.id, row.reservedItemId)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Reset / Unpick this item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* CD Product */}
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-[11px] text-[#086288]">
                          {row.sku}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {row.name}
                        </div>
                      </td>

                      {/* Batch Number */}
                      <td className="py-2 px-3">
                        {row.itemType === 'physical' ? (
                          <input
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) =>
                              handleUpdatePickingField(row.id, 'batchNumber', e.target.value)
                            }
                            className="w-full h-7 px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[11px] font-mono text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                          />
                        ) : (
                          <span className="font-mono text-[10.5px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            Non-Stock
                          </span>
                        )}
                      </td>

                      {/* Expired Date */}
                      <td className="py-2 px-3">
                        {row.itemType === 'physical' ? (
                          <input
                            type="date"
                            value={row.expiredDate}
                            onChange={(e) =>
                              handleUpdatePickingField(row.id, 'expiredDate', e.target.value)
                            }
                            className="w-full h-7 px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[11px] text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                          />
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">N/A</span>
                        )}
                      </td>

                      {/* QTY */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                        {row.qty}
                      </td>

                      {/* Batch Input */}
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                            row.itemType === 'service'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.batchInput}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1]">
            <span className="text-[11px] text-slate-500">
              Showing {pickingItems.length} entries
            </span>
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
            onClick={handleSubmitPicking}
            disabled={!selectedOrder || reservedItems.length === 0}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Submit / Complete Picking</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. RESERVE LOOKUP MODAL                                               */}
      {/* ===================================================================== */}
      <ReserveLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        availableOrders={availableOrders}
        onSelectOrder={(order) => {
          setSelectedOrder(order);
          setIsLookupOpen(false);
        }}
      />
    </div>
  );
};
