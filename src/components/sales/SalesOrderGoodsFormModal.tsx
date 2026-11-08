import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Building2,
  Users,
  MapPin,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  FileText,
  Warehouse as WarehouseIcon,
  ShoppingBag
} from 'lucide-react';
import {
  SalesOrder,
  SalesOrderItem,
  Product,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';
import { validateSalesOrderNumber } from '../../domain/validators/erpRules';
import { ProductLookupModal, SelectedProductItem } from './ProductLookupModal';

interface SalesOrderGoodsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (savedOrder: SalesOrder) => void;
  initialOrder?: SalesOrder | null;
}

export const SalesOrderGoodsFormModal: React.FC<SalesOrderGoodsFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialOrder
}) => {
  const {
    customers,
    products,
    branches,
    warehouses,
    generateSalesOrderNumber,
    createSalesOrder,
    updateSalesOrder,
    addToast
  } = useErp();

  const isEditing = Boolean(initialOrder);

  // 1. Order Header
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // 2. Customer & Payment Terms (Auto-filled from Master Customer)
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dp_termin' | 'cash' | 'transfer' | 'top'>('top');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);

  // 3. Line Items
  const [items, setItems] = useState<SalesOrderItem[]>([
    {
      productId: 'prod_01',
      sku: 'ZYV-IND-001',
      name: 'Minyak Goreng Premium 2L Pouch',
      quantity: 100,
      uom: 'Dus',
      unitPrice: 195000,
      discount: 0,
      total: 19500000
    }
  ]);

  // 4. Commercial Summary
  const [isTaxIncluded, setIsTaxIncluded] = useState(true);
  const [notes, setNotes] = useState('');

  // UI & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);

  // Synchronize on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialOrder) {
        setOrderNumber(initialOrder.orderNumber);
        setOrderDate(initialOrder.orderDate);
        setDeliveryDate(initialOrder.deliveryDate || '');
        setSelectedBranchId(initialOrder.branchId);
        setSelectedWarehouseId(initialOrder.warehouseId || '');
        setSelectedCustomerId(initialOrder.customerId || '');
        setCustomerCode(initialOrder.customerCode);
        setCustomerName(initialOrder.customerName);
        setCustomerPhone(initialOrder.customerPhone || '');
        setCustomerAddress(initialOrder.customerAddress || '');
        setPaymentMethod(initialOrder.paymentMethod || 'top');
        setPaymentTermsDays(initialOrder.paymentTermsDays || 30);
        setItems(initialOrder.items);
        setIsTaxIncluded(initialOrder.tax > 0);
        setNotes(initialOrder.notes || '');
      } else {
        const newNo = generateSalesOrderNumber();
        setOrderNumber(newNo);
        setOrderDate(new Date().toISOString().split('T')[0]);
        setDeliveryDate('');
        setSelectedBranchId(branches[0]?.id || '');
        setSelectedWarehouseId(warehouses[0]?.id || '');
        setSelectedCustomerId('');
        setCustomerCode('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setPaymentMethod('top');
        setPaymentTermsDays(30);

        if (products.length > 0) {
          const firstProd = products[0];
          setItems([
            {
              productId: firstProd.id,
              sku: firstProd.sku,
              name: firstProd.name,
              quantity: 50,
              uom: firstProd.uom,
              unitPrice: firstProd.sellingPrice,
              discount: 0,
              total: 50 * firstProd.sellingPrice
            }
          ]);
        } else {
          setItems([]);
        }

        setIsTaxIncluded(true);
        setNotes('');
      }

      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, initialOrder, branches, warehouses, products, generateSalesOrderNumber]);

  // Handle Customer Selection & Auto-fill from Master Customer
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerCode(found.customerCode);
      setCustomerName(found.companyName || found.name);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.address ? `${found.address}, ${found.city || ''}` : found.city || '');
      setPaymentMethod(found.defaultPaymentMethod || (found.customerType === 'corporate' ? 'top' : 'cash'));
      setPaymentTermsDays(found.paymentTermsDays !== undefined ? found.paymentTermsDays : (found.customerType === 'corporate' ? 30 : 0));
    }
  };

  // Add Item
  const handleAddItem = () => {
    setIsProductLookupOpen(true);
  };

  const handleProductSelected = (selected: SelectedProductItem) => {
    const qty = selected.quantity || 1;
    const price = selected.unitPrice || 0;
    const newItem: SalesOrderItem = {
      productId: selected.id || `prod_${Date.now()}`,
      sku: selected.sku,
      name: selected.name,
      quantity: qty,
      uom: selected.uom || 'Unit',
      unitPrice: price,
      discount: 0,
      total: qty * price
    };
    setItems((prev) => [...prev, newItem]);
    addToast('Product Added', `${selected.name} (${qty} ${selected.uom}) added to order.`, 'success');
  };

  // Update Item
  const handleUpdateItem = (index: number, updates: Partial<SalesOrderItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      if (updates.productId) {
        const p = products.find((prod) => prod.id === updates.productId);
        if (p) {
          current.sku = p.sku;
          current.name = p.name;
          current.uom = p.uom;
          current.unitPrice = p.sellingPrice;
        }
      }

      const qty = current.quantity || 0;
      const price = current.unitPrice || 0;
      const disc = current.discount || 0;
      current.total = Math.max(0, qty * price - disc);

      copy[index] = current;
      return copy;
    });
  };

  // Delete Item
  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      addToast('Cannot Remove', 'Order must have at least one product item.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Computations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.total || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return isTaxIncluded ? Math.round(subtotal * 0.11) : 0;
  }, [subtotal, isTaxIncluded]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const numCheck = validateSalesOrderNumber(orderNumber);
    if (!numCheck.isValid) {
      newErrors.orderNumber = numCheck.error || 'Invalid Sales Order number.';
    }

    if (!selectedCustomerId) {
      newErrors.customer = 'Please select a registered customer.';
    }

    if (!orderDate) {
      newErrors.orderDate = 'Order Date is required.';
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one product item.';
    }

    items.forEach((it, idx) => {
      if (!it.quantity || it.quantity <= 0) {
        newErrors[`item_qty_${idx}`] = 'Quantity must be > 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast('Validation Failed', 'Please complete all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        customerId: selectedCustomerId,
        customerCode,
        customerName,
        customerPhone,
        customerAddress,
        orderDate,
        deliveryDate: deliveryDate || undefined,
        paymentMethod,
        paymentTermsDays,
        subtotal,
        tax: taxAmount,
        totalAmount: grandTotal,
        status: 'open' as const,
        items,
        notes: notes.trim() || undefined
      };

      let savedOrder: SalesOrder;
      if (isEditing && initialOrder) {
        savedOrder = updateSalesOrder(initialOrder.id, payload);
        addToast('Order Updated', `Sales Order ${savedOrder.orderNumber} updated successfully.`, 'success');
      } else {
        savedOrder = createSalesOrder({
          ...payload,
          preferredOrderNumber: orderNumber
        });
      }

      if (onSuccess) onSuccess(savedOrder);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to save Sales Order.';
      addToast('Error', msg, 'error');
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Sales Order: ${orderNumber}` : 'Create New Sales Order (Goods)'}
      description="Queinvite Standard · Pure order agreement recorded with status OPEN"
      size="xl"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span>Document will be saved with initial status <strong>OPEN</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="sales-order-goods-form"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Order...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Sales Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="sales-order-goods-form" onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: HEADER & DOCUMENT REFERENCE */}
        <div className="p-3.5 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#B7DDEA]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#086288]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#086288]">
                1. Sales Order Document Header
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-[#B7DDEA]">
              Status: OPEN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Order Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={orderNumber}
                readOnly
                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#086288] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Order Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Delivery Target Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Branch / Business Unit
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              >
                {branches
                  .filter((b) => b.isActive || b.id === selectedBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== selectedBranchId}>
                      {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER SELECTION & AUTO-FILL */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <Users className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
              2. Customer & Payment Terms (Auto-filled from Master Customer)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Select Customer <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              >
                <option value="">-- Select Registered Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.customerCode}] {c.companyName || c.name} ({c.city || 'No City'})
                  </option>
                ))}
              </select>
              {errors.customer && (
                <span className="text-[10px] text-rose-500 font-medium">{errors.customer}</span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                readOnly
                placeholder="Auto-filled"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#0F172A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Delivery Address / Destination
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Destination address"
                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Payment Terms (Master Acuan)
              </label>
              <div className="px-2.5 py-1.5 bg-slate-50 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#086288] flex items-center justify-between">
                <span>{paymentMethod.toUpperCase()}</span>
                <span className="text-[10px] text-slate-500">
                  {paymentMethod === 'top' ? `Net ${paymentTermsDays} Days` : 'Cash/Transfer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: INVENTORY LINE ITEMS */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#086288]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                3. Products from Inventory Master
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#086288] hover:text-[#064B6A] bg-[#EFF7FA] hover:bg-[#DCE5EC] px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Product Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                  <th className="py-2 px-3">Product Name & SKU</th>
                  <th className="py-2 px-3 text-center w-24">Qty</th>
                  <th className="py-2 px-3 text-center w-20">UoM</th>
                  <th className="py-2 px-3 text-right w-36">Unit Price (Rp)</th>
                  <th className="py-2 px-3 text-right w-28">Discount</th>
                  <th className="py-2 px-3 text-right w-36">Subtotal</th>
                  <th className="py-2 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC]">
                    <td className="py-2 px-3">
                      <select
                        value={it.productId}
                        onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (Stock: {p.totalStock} {p.uom})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-center font-mono font-bold focus:outline-hidden focus:border-[#086288]"
                      />
                    </td>

                    <td className="py-2 px-3 text-center text-slate-500 font-mono">
                      {it.uom}
                    </td>

                    <td className="py-2 px-3 text-right font-mono">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={it.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-right font-mono focus:outline-hidden focus:border-[#086288]"
                      />
                    </td>

                    <td className="py-2 px-3 text-right font-mono">
                      <input
                        type="number"
                        min="0"
                        value={it.discount}
                        onChange={(e) => handleUpdateItem(idx, { discount: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-right font-mono focus:outline-hidden focus:border-[#086288]"
                      />
                    </td>

                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                      Rp {it.total.toLocaleString('id-ID')}
                    </td>

                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: COMMERCIAL SUMMARY & NOTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
              Order Notes & Delivery Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Kirim via armada CDD Box, wajib konfirmasi H-1 jam 14:00..."
              className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>

          <div className="p-3 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Items Subtotal:</span>
              <span className="font-mono text-[#0F172A]">
                Rp {subtotal.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#64748B]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTaxIncluded}
                  onChange={(e) => setIsTaxIncluded(e.target.checked)}
                  className="rounded text-[#086288] focus:ring-0 cursor-pointer"
                />
                <span>Include PPN (11%)</span>
              </label>
              <span className="font-mono text-[#0F172A]">
                Rp {taxAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex justify-between font-bold text-sm text-[#0F172A] pt-1.5 border-t border-[#B7DDEA]">
              <span>Total Contract Value:</span>
              <span className="font-mono text-[#086288]">
                Rp {grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Product Lookup Modal */}
      <ProductLookupModal
        isOpen={isProductLookupOpen}
        onClose={() => setIsProductLookupOpen(false)}
        onSelectProduct={handleProductSelected}
      />
    </BaseModal>
  );
};
