import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  FileCheck,
  Eye,
  Edit2,
  Trash2,
  Printer,
  X,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  SalesOrder,
  SalesOrderStatus
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { SalesOrderGoodsFormModal } from './SalesOrderGoodsFormModal';
import { BaseModal } from '../common/BaseModal';

export const SalesOrderGoodsView: React.FC = () => {
  const {
    salesOrders,
    setSalesOrders,
    branches,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();

  const canManage =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  // Standard 2-Column Filters
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SalesOrderStatus>('all');
  const [tableSearch, setTableSearch] = useState<string>('');

  // Pagination & Entry Controls
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Inspection Drawer
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      // 1. Branch Filter
      if (filterBranchId !== 'all' && order.branchId !== filterBranchId) {
        return false;
      }

      // 2. Periode Filter
      if (filterPeriod !== 'all') {
        if (filterPeriod === '2026-Q4') {
          const isQ4 = order.orderDate.startsWith('2026-10') ||
                       order.orderDate.startsWith('2026-11') ||
                       order.orderDate.startsWith('2026-12');
          if (!isQ4) return false;
        } else {
          if (!order.orderDate.startsWith(filterPeriod)) return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // 4. Search in Table (Customer name, code, order number, destination address)
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = order.orderNumber.toLowerCase().includes(q);
        const matchCust = order.customerName.toLowerCase().includes(q);
        const matchCode = order.customerCode?.toLowerCase().includes(q) || false;
        const matchAddr = order.customerAddress?.toLowerCase().includes(q) || false;
        if (!matchNo && !matchCust && !matchCode && !matchAddr) {
          return false;
        }
      }

      return true;
    });
  }, [salesOrders, filterBranchId, filterPeriod, statusFilter, tableSearch]);

  const totalPages = Math.ceil(filteredOrders.length / entriesPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredOrders.slice(start, start + entriesPerPage);
  }, [filteredOrders, currentPage, entriesPerPage]);

  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterPeriod('all');
    setStatusFilter('all');
    setTableSearch('');
    setCurrentPage(1);
  };

  // Handler: Open Add
  const handleAddNew = () => {
    setEditingOrder(null);
    setIsFormModalOpen(true);
  };

  // Handler: Open Edit
  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsFormModalOpen(true);
  };

  // Handler: Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    setSalesOrders((prev) => prev.filter((o) => o.id !== deleteConfirmId));
    setDeleteConfirmId(null);
    addToast('Order Deleted', 'Sales Order record has been removed.', 'info');
  };

  // Status Badge Styler
  const renderStatusBadge = (status: SalesOrderStatus) => {
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
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3 h-3 text-indigo-600" /> SHIPPED
          </span>
        );
      case 'invoiced':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <FileCheck className="w-3 h-3 text-purple-600" /> INVOICED
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

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (STANDARD BLUEPRINT)                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* LEFT COLUMN FILTERS */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Branches ---</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Period</label>
              <div className="sm:col-span-2">
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Periods ---</option>
                  <option value="2026-10">October 2026 (Current)</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">December 2026</option>
                  <option value="2026-Q4">Q4 2026 (Oct - Dec)</option>
                </select>
              </div>
            </div>

            {/* Filter Buttons */}
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

          {/* RIGHT COLUMN FILTERS */}
          <div className="space-y-3">
            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Statuses ---</option>
                  <option value="open">OPEN</option>
                  <option value="received">RECEIVED</option>
                  <option value="picked">PICKED</option>
                  <option value="shipped">SHIPPED</option>
                  <option value="invoiced">INVOICED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {canManage && (
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Sales Order</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print List</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative">
            <span className="text-xs text-[#64748B] mr-1.5">Search:</span>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter in table..."
              className="h-8 w-44 sm:w-56 px-2.5 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. DATA TABLE (DIRECT CONTENT)                                        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">No Sales Orders Found</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              {tableSearch || statusFilter !== 'all' || filterBranchId !== 'all' || filterPeriod !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Get started by creating your first sales order with status OPEN.'}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={handleAddNew}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + Create Sales Order
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Customer & Organization</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Branch & Destination</th>
                  <th className="py-3 px-4 text-center">Line Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {paginatedOrders.map((order) => {
                  const branch = branches.find((b) => b.id === order.branchId);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#F8FAFC] transition-colors group cursor-default"
                    >
                      {/* 1. Order Number */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded w-fit">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-[#94A3B8] mt-1">
                            Terms: {order.paymentMethod?.toUpperCase() || 'TOP'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Customer & Organization */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] line-clamp-1">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-medium text-[#086288]">[{order.customerCode}]</span>
                          {order.customerPhone && (
                            <>
                              <span className="text-[#CBD5E1]">•</span>
                              <span className="text-[#64748B]">{order.customerPhone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Order Date */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#086288]" />
                          <span>{order.orderDate}</span>
                        </div>
                        {order.deliveryDate && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Target: {order.deliveryDate}
                          </div>
                        )}
                      </td>

                      {/* 4. Branch & Destination */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">
                          {branch ? `${branch.code} - ${branch.city}` : 'HQ Jakarta'}
                        </div>
                        <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                          {order.customerAddress || 'Direct Pickup'}
                        </div>
                      </td>

                      {/* 5. Line Items */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-xs font-semibold text-[#086288] bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
                          {order.items?.length || 0} Products
                        </span>
                      </td>

                      {/* 6. Total Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-xs text-[#0F172A]">
                          Rp {order.totalAmount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Tax Inc: Rp {order.tax.toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4 text-center">{renderStatusBadge(order.status)}</td>

                      {/* 8. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(order)}
                            title="View Order Details"
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(order)}
                                title="Edit Order"
                                className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(order.id)}
                                title="Delete Order"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 4. PAGINATION FOOTER                                                  */}
        {/* ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#E2E8F0] gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#0F172A]">{filteredOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
            <strong className="text-[#0F172A]">{Math.min(currentPage * entriesPerPage, filteredOrders.length)}</strong> of{' '}
            <strong className="text-[#0F172A]">{filteredOrders.length}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-7 h-7 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#086288] border-[#086288] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <SalesOrderGoodsFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingOrder(null);
        }}
        initialOrder={editingOrder}
        onSuccess={(saved) => {
          setIsFormModalOpen(false);
          setEditingOrder(null);
          setViewingOrder(saved);
        }}
      />

      {/* Inspection Modal */}
      {viewingOrder && (
        <BaseModal
          isOpen={Boolean(viewingOrder)}
          onClose={() => setViewingOrder(null)}
          title={`Sales Order: ${viewingOrder.orderNumber}`}
          description={`Customer: ${viewingOrder.customerName} • Date: ${viewingOrder.orderDate}`}
          size="xl"
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-[#EFF7FA] border border-[#B7DDEA] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-sm text-[#086288]">
                  {viewingOrder.orderNumber}
                </span>
                <div className="mt-1">{renderStatusBadge(viewingOrder.status)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#64748B]">Total Contract Value</span>
                <div className="text-xl font-bold font-mono text-[#0F172A]">
                  Rp {viewingOrder.totalAmount.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {viewingOrder.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-3 font-mono text-slate-500">{it.sku}</td>
                      <td className="py-2 px-3 font-semibold text-[#0F172A]">{it.name}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        Rp {it.unitPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                        Rp {it.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </BaseModal>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <BaseModal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirm Delete Sales Order"
          description="Are you sure you want to permanently delete this Sales Order record?"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Delete Order
              </button>
            </div>
          }
        >
          <div className="p-2 text-xs text-[#64748B]">
            This action cannot be undone. Order allocations will be removed.
          </div>
        </BaseModal>
      )}
    </div>
  );
};
