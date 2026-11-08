import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Building2,
  Calendar,
  MapPin,
  CreditCard,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Customer, CustomerType } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';

interface CustomerLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  title?: string;
  allowedCustomerCodes?: string[];
  emptyMessage?: string;
  zIndex?: string;
}

export const CustomerLookupModal: React.FC<CustomerLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  title = 'Select Customer Order',
  allowedCustomerCodes,
  emptyMessage,
  zIndex = 'z-50'
}) => {
  const { customers } = useErp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | CustomerType>('all');

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Status filter (active only)
      if (cust.status && cust.status !== 'active') return false;

      // Filter by allowed customer codes (e.g. only customers with Receive Payment)
      if (allowedCustomerCodes && allowedCustomerCodes.length > 0) {
        if (!allowedCustomerCodes.includes(cust.customerCode) && !allowedCustomerCodes.includes(cust.id)) {
          return false;
        }
      } else if (allowedCustomerCodes && allowedCustomerCodes.length === 0) {
        return false;
      }

      // Customer type filter
      if (selectedType !== 'all') {
        const type = cust.customerType || 'general';
        if (type !== selectedType) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = cust.customerCode?.toLowerCase().includes(q);
        const matchName = cust.name?.toLowerCase().includes(q);
        const matchCompany = cust.companyName?.toLowerCase().includes(q);
        const matchPhone = cust.phone?.toLowerCase().includes(q);
        const matchEmail = cust.email?.toLowerCase().includes(q);
        const matchCity = cust.city?.toLowerCase().includes(q);
        const matchEvent = cust.eventTitle?.toLowerCase().includes(q);
        if (
          !matchCode &&
          !matchName &&
          !matchCompany &&
          !matchPhone &&
          !matchEmail &&
          !matchCity &&
          !matchEvent
        ) {
          return false;
        }
      }

      return true;
    });
  }, [customers, selectedType, searchQuery]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  const renderTypeBadge = (type?: CustomerType) => {
    switch (type) {
      case 'booking':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-[#086288] border border-cyan-200">
            <Sparkles className="w-2.5 h-2.5" /> Event Booking
          </span>
        );
      case 'corporate':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-2.5 h-2.5" /> Corporate B2B
          </span>
        );
      case 'general':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-2.5 h-2.5" /> General Retail
          </span>
        );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Search and select from active master customer records to inherit commercial payment terms and location specs."
      size="xl"
      maxWidth="max-w-4xl"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, customer name, company, event, phone, or city..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'booking', label: 'Booking' },
                { id: 'corporate', label: 'Corporate' },
                { id: 'general', label: 'Retail' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-white text-[#475569] border border-[#CBD5E1] hover:bg-[#F1F5F9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Table List */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-[#475569]">Code & Category</th>
                <th className="py-2.5 px-3 font-semibold text-[#475569]">Customer / Entity</th>
                <th className="py-2.5 px-3 font-semibold text-[#475569]">Contact Info</th>
                <th className="py-2.5 px-3 font-semibold text-[#475569]">City & HQ Dist</th>
                <th className="py-2.5 px-3 font-semibold text-[#475569]">Payment Terms</th>
                <th className="py-2.5 px-3 font-semibold text-[#475569] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    <Users className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="font-semibold text-xs text-[#0F172A]">No Customers Found</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {emptyMessage || 'Try searching with different terms or category filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const paymentTermDesc =
                    cust.defaultPaymentMethod === 'dp_termin'
                      ? `DP ${cust.defaultDownPaymentPercent || 20}% + Net ${cust.paymentTermsDays || 30}d`
                      : cust.defaultPaymentMethod === 'top'
                      ? `TOP ${cust.paymentTermsDays || 30} Days`
                      : cust.defaultPaymentMethod === 'cash'
                      ? 'Full Cash / Upfront'
                      : 'Bank Transfer (100%)';

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => handleSelect(cust)}
                      className="hover:bg-[#EFF7FA]/60 cursor-pointer transition-colors group"
                    >
                      {/* Code & Category */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[#086288]">
                          {cust.customerCode}
                        </div>
                        <div className="mt-0.5">{renderTypeBadge(cust.customerType)}</div>
                      </td>

                      {/* Customer / Entity */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#0F172A] group-hover:text-[#086288] transition-colors">
                          {cust.name}
                        </div>
                        {cust.companyName && cust.companyName !== cust.name && (
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-[#94A3B8]" />
                            {cust.companyName}
                          </div>
                        )}
                        {cust.eventTitle && (
                          <div className="text-[10px] text-cyan-800 bg-cyan-50/80 px-1.5 py-0.5 rounded border border-cyan-200 mt-1 inline-flex items-center gap-1 max-w-[260px] truncate">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{cust.eventTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td className="py-2.5 px-3 text-[#475569]">
                        <div>{cust.phone}</div>
                        {cust.email && (
                          <div className="text-[11px] text-[#94A3B8]">{cust.email}</div>
                        )}
                      </td>

                      {/* City & HQ Dist */}
                      <td className="py-2.5 px-3">
                        <div className="text-[#0F172A] font-medium">{cust.city || 'Jakarta'}</div>
                        {typeof cust.distanceFromHqKm === 'number' && (
                          <div className="text-[10px] font-semibold text-[#086288] mt-0.5">
                            ±{cust.distanceFromHqKm.toFixed(1)} km from HQ
                          </div>
                        )}
                      </td>

                      {/* Payment Terms */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1]">
                          <CreditCard className="w-3 h-3 text-[#086288]" />
                          {paymentTermDesc}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(cust);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#086288] hover:bg-[#064B6A] text-white text-[11px] font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Select
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
          <span>
            Showing <strong className="text-[#0F172A]">{filteredCustomers.length}</strong> matching customers
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
