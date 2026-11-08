import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Package,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  Check
} from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { UnifiedReceiveItem } from './SalesOrderReceiveView';

interface SalesOrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: UnifiedReceiveItem) => void;
  availableOrders: UnifiedReceiveItem[];
  title?: string;
}

export const SalesOrderLookupModal: React.FC<SalesOrderLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
  availableOrders,
  title = 'Select Open Sales Order for Receive'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Filter only OPEN orders that match search query and type filter
  const openOrders = useMemo(() => {
    return availableOrders.filter((item) => {
      // Must be OPEN status
      if (item.status.toLowerCase() !== 'open') return false;

      // Filter by order type
      if (filterType !== 'all') {
        if (!item.orderType.toLowerCase().includes(filterType.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = item.orderNumber.toLowerCase().includes(q);
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchCode = item.customerCode.toLowerCase().includes(q);
        const matchDest = item.destinationOrVenue.toLowerCase().includes(q);
        const matchBranch = item.branchCode.toLowerCase().includes(q);
        if (!matchNo && !matchCust && !matchCode && !matchDest && !matchBranch) {
          return false;
        }
      }

      return true;
    });
  }, [availableOrders, filterType, searchQuery]);

  // Order type badge styler
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Choose an existing OPEN Sales Order to validate inventory and reserve items."
      size="xl"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#64748B]">
            Showing <strong className="text-[#0F172A]">{openOrders.length}</strong> available open orders
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order No, Customer, Destination..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-9 px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
            >
              <option value="all">All Order Types</option>
              <option value="Normal SO">Normal SO</option>
              <option value="Service">Service</option>
              <option value="Goods">Goods</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden bg-white max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-40">Sales Order No</th>
                <th className="py-2.5 px-3 w-28">Type</th>
                <th className="py-2.5 px-3 min-w-[180px]">Customer</th>
                <th className="py-2.5 px-3 w-28">Branch</th>
                <th className="py-2.5 px-3 w-24">Date</th>
                <th className="py-2.5 px-3 text-right w-32">Total (Rp)</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {openOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-xs text-[#0F172A]">No OPEN sales orders found</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      All sales orders have already been received or none match your search.
                    </p>
                  </td>
                </tr>
              ) : (
                openOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#EFF7FA]/60 transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectOrder(order);
                      onClose();
                    }}
                  >
                    {/* Order Number */}
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-xs bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded">
                        {order.orderNumber}
                      </span>
                    </td>

                    {/* Order Type */}
                    <td className="py-2.5 px-3">
                      {renderOrderTypeBadge(order.orderType)}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#0F172A]">{order.customerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">[{order.customerCode}]</div>
                    </td>

                    {/* Branch */}
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                        {order.branchCode}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-slate-700">
                      {order.date}
                    </td>

                    {/* Total */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                      Rp {order.totalAmount.toLocaleString('id-ID')}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 h-7 px-3 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Select</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  );
};
