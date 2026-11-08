import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Building2,
  Users,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';
import {
  ServiceBookingOrder,
  ServiceBookingItem,
  PaymentMilestone,
  ServiceBookingStatus,
  ServiceBookingSession,
  Customer
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { BaseModal } from '../common/BaseModal';
import { validateServiceBookingNumber } from '../../domain/validators/erpRules';

interface ServiceBookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (savedBooking: ServiceBookingOrder) => void;
  initialBooking?: ServiceBookingOrder | null;
}

const BUSINESS_LINES_CONFIG = [
  { id: 'QUEINVITE', name: 'Queinvite Wedding Digital', costCenter: 'CC-QUEINVITE', color: '#086288' },
  { id: 'HIZAKI', name: 'Hizaki Wedding Planner', costCenter: 'CC-LOB-HIZAKI', color: '#0284C7' },
  { id: 'AURUM', name: 'Aurum Deco', costCenter: 'CC-LOB-AURUM', color: '#D97706' },
  { id: 'KIMIKO', name: 'Ki Mi Ko Pager Ayu', costCenter: 'CC-LOB-KIMIKO', color: '#EC4899' }
];

export const ServiceBookingFormModal: React.FC<ServiceBookingFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialBooking
}) => {
  const {
    customers,
    currentUser,
    generateServiceBookingNumber,
    createServiceBooking,
    updateServiceBooking,
    addToast
  } = useErp();

  const isEditing = Boolean(initialBooking);

  // 1. Header & Numbering
  const [bookingNumber, setBookingNumber] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [salesPicName, setSalesPicName] = useState('');

  // 2. Client & Event Specifications
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventSession, setEventSession] = useState<ServiceBookingSession>('evening');
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [estimatedGuestCount, setEstimatedGuestCount] = useState<number>(500);
  const [distanceFromHqKm, setDistanceFromHqKm] = useState<number | undefined>(undefined);

  // 3. Service Items (Multi-LOB)
  const [items, setItems] = useState<ServiceBookingItem[]>([
    {
      id: 'item_1',
      businessLineId: 'HIZAKI',
      businessLineName: 'Hizaki Wedding Planner',
      costCenterCode: 'CC-LOB-HIZAKI',
      serviceName: 'Full Day Wedding Planning, Rundown & Coordination',
      description: 'Comprehensive WO services with 8 field event coordinators and lead planner.',
      quantity: 1,
      uom: 'Package',
      unitPrice: 35000000,
      discount: 0,
      subtotal: 35000000
    }
  ]);

  // 4. Payment Milestones Schedule (Order Terms, Pure Agreement)
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([
    {
      id: 'ms_1',
      milestoneName: 'Down Payment (DP 20%)',
      percentage: 20,
      amount: 7000000,
      dueDate: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      status: 'unpaid'
    },
    {
      id: 'ms_2',
      milestoneName: 'Technical Preparation (40%)',
      percentage: 40,
      amount: 14000000,
      dueDate: '',
      paidAmount: 0,
      status: 'unpaid'
    },
    {
      id: 'ms_3',
      milestoneName: 'Final Settlement Before Event (40%)',
      percentage: 40,
      amount: 14000000,
      dueDate: '',
      paidAmount: 0,
      status: 'unpaid'
    }
  ]);

  // 5. Commercial Summary & Status
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [status, setStatus] = useState<ServiceBookingStatus>('open');
  const [notes, setNotes] = useState('');

  // UI & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialBooking) {
        setBookingNumber(initialBooking.bookingNumber);
        setBookingDate(initialBooking.bookingDate);
        setSelectedCustomerId(initialBooking.customerId);
        setSalesPicName(initialBooking.salesPicName || currentUser.fullName);

        setCustomerName(initialBooking.customerName);
        setCustomerPhone(initialBooking.customerPhone);
        setCustomerEmail(initialBooking.customerEmail || '');
        setEventTitle(initialBooking.eventTitle);
        setEventDate(initialBooking.eventDate);
        setEventSession(initialBooking.eventSession);
        setVenueName(initialBooking.venueName);
        setVenueCity(initialBooking.venueCity || '');
        setVenueAddress(initialBooking.venueAddress || '');
        setEstimatedGuestCount(initialBooking.estimatedGuestCount || 500);
        setDistanceFromHqKm(initialBooking.distanceFromHqKm);

        setItems(initialBooking.items);
        setMilestones(initialBooking.milestones);
        setOrderDiscount(initialBooking.discountTotal || 0);
        setTaxAmount(initialBooking.taxAmount || 0);
        setStatus(initialBooking.status);
        setNotes(initialBooking.notes || '');
      } else {
        const newNo = generateServiceBookingNumber();
        setBookingNumber(newNo);
        setBookingDate(new Date().toISOString().split('T')[0]);
        setSelectedCustomerId('');
        setSalesPicName(currentUser.fullName);

        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setEventTitle('');
        setEventDate('');
        setEventSession('evening');
        setVenueName('');
        setVenueCity('');
        setVenueAddress('');
        setEstimatedGuestCount(500);
        setDistanceFromHqKm(undefined);

        const defaultItems: ServiceBookingItem[] = [
          {
            id: `item_${Date.now()}_1`,
            businessLineId: 'HIZAKI',
            businessLineName: 'Hizaki Wedding Planner',
            costCenterCode: 'CC-LOB-HIZAKI',
            serviceName: 'Full Day Wedding Planning, Rundown & Coordination',
            description: 'Comprehensive WO services with 8 field event coordinators and lead planner.',
            quantity: 1,
            uom: 'Package',
            unitPrice: 35000000,
            discount: 0,
            subtotal: 35000000
          }
        ];
        setItems(defaultItems);

        const sub = 35000000;
        setMilestones([
          {
            id: `ms_${Date.now()}_1`,
            milestoneName: 'Down Payment (DP 20%)',
            percentage: 20,
            amount: Math.round(sub * 0.2),
            dueDate: new Date().toISOString().split('T')[0],
            paidAmount: Math.round(sub * 0.2),
            status: 'paid'
          },
          {
            id: `ms_${Date.now()}_2`,
            milestoneName: 'Technical Preparation (40%)',
            percentage: 40,
            amount: Math.round(sub * 0.4),
            dueDate: '',
            paidAmount: 0,
            status: 'unpaid'
          },
          {
            id: `ms_${Date.now()}_3`,
            milestoneName: 'Final Settlement Before Event (40%)',
            percentage: 40,
            amount: Math.round(sub * 0.4),
            dueDate: '',
            paidAmount: 0,
            status: 'unpaid'
          }
        ]);

        setOrderDiscount(0);
        setTaxAmount(0);
        setStatus('open');
        setNotes('');
      }

      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, initialBooking, currentUser, generateServiceBookingNumber]);

  // Handle Customer Selection & Auto-Fill from Master Customer (Single Source of Truth)
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email || '');

      if (found.eventTitle) {
        setEventTitle(found.eventTitle);
      } else if (!eventTitle) {
        setEventTitle(`${found.name} Event`);
      }

      if (found.targetEventDate) setEventDate(found.targetEventDate);
      if (found.eventSession) setEventSession(found.eventSession);
      if (found.venueName) setVenueName(found.venueName);
      if (found.city) setVenueCity(found.city);
      if (found.address) setVenueAddress(found.address);
      if (found.estimatedGuestCount) setEstimatedGuestCount(found.estimatedGuestCount);
      if (found.distanceFromHqKm !== undefined) setDistanceFromHqKm(found.distanceFromHqKm);
      if (found.eventNotes && !notes) setNotes(found.eventNotes);

      // Auto-configure payment milestones based on Customer Master terms
      if (found.defaultPaymentMethod === 'dp_termin' && found.defaultDownPaymentPercent === 50) {
        handleRebalanceMilestones('2_step');
      } else {
        handleRebalanceMilestones('3_step');
      }
    }
  };

  // Re-shuffle booking number
  const handleReshuffleBookingNumber = () => {
    if (isEditing) return;
    const nextNumber = generateServiceBookingNumber();
    setBookingNumber(nextNumber);
  };

  // Financial Computations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [items]);

  const totalContractAmount = useMemo(() => {
    return Math.max(0, subtotal - orderDiscount + taxAmount);
  }, [subtotal, orderDiscount, taxAmount]);

  const totalPaidAmount = useMemo(() => {
    return milestones.reduce((acc, m) => acc + (m.paidAmount || 0), 0);
  }, [milestones]);

  const outstandingBalance = useMemo(() => {
    return Math.max(0, totalContractAmount - totalPaidAmount);
  }, [totalContractAmount, totalPaidAmount]);

  const milestonePercentageSum = useMemo(() => {
    return milestones.reduce((acc, m) => acc + (m.percentage || 0), 0);
  }, [milestones]);

  // Line Items Mutators
  const handleAddItem = () => {
    const newItem: ServiceBookingItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessLineId: 'AURUM',
      businessLineName: 'Aurum Deco',
      costCenterCode: 'CC-LOB-AURUM',
      serviceName: 'Floral Stage & Thematic Venue Staging',
      description: '',
      quantity: 1,
      uom: 'Set',
      unitPrice: 25000000,
      discount: 0,
      subtotal: 25000000
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<ServiceBookingItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      // Auto update cost center & line name if businessLineId changes
      if (updates.businessLineId) {
        const foundLOB = BUSINESS_LINES_CONFIG.find((b) => b.id === updates.businessLineId);
        if (foundLOB) {
          current.businessLineName = foundLOB.name;
          current.costCenterCode = foundLOB.costCenter;
        }
      }

      const qty = current.quantity || 0;
      const price = current.unitPrice || 0;
      const disc = current.discount || 0;
      current.subtotal = Math.max(0, qty * price - disc);

      copy[index] = current;
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      addToast('Cannot Remove', 'A service booking must have at least one line item.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Rebalance milestones based on totalContractAmount
  const handleRebalanceMilestones = (preset: '3_step' | '2_step') => {
    if (preset === '3_step') {
      const dpAmt = Math.round(totalContractAmount * 0.2);
      const m2Amt = Math.round(totalContractAmount * 0.4);
      const m3Amt = totalContractAmount - dpAmt - m2Amt;

      setMilestones([
        {
          id: `ms_${Date.now()}_1`,
          milestoneName: 'Down Payment (DP 20%)',
          percentage: 20,
          amount: dpAmt,
          dueDate: bookingDate,
          paidAmount: 0,
          status: 'unpaid'
        },
        {
          id: `ms_${Date.now()}_2`,
          milestoneName: 'Technical Preparation (40%)',
          percentage: 40,
          amount: m2Amt,
          dueDate: eventDate || '',
          paidAmount: 0,
          status: 'unpaid'
        },
        {
          id: `ms_${Date.now()}_3`,
          milestoneName: 'Final Settlement Before Event (40%)',
          percentage: 40,
          amount: m3Amt,
          dueDate: eventDate || '',
          paidAmount: 0,
          status: 'unpaid'
        }
      ]);
    } else {
      const dpAmt = Math.round(totalContractAmount * 0.5);
      const m2Amt = totalContractAmount - dpAmt;

      setMilestones([
        {
          id: `ms_${Date.now()}_1`,
          milestoneName: 'Booking Deposit (50%)',
          percentage: 50,
          amount: dpAmt,
          dueDate: bookingDate,
          paidAmount: 0,
          status: 'unpaid'
        },
        {
          id: `ms_${Date.now()}_2`,
          milestoneName: 'Final Balance (50%)',
          percentage: 50,
          amount: m2Amt,
          dueDate: eventDate || '',
          paidAmount: 0,
          status: 'unpaid'
        }
      ]);
    }
  };

  const handleUpdateMilestone = (index: number, updates: Partial<PaymentMilestone>) => {
    setMilestones((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      if (updates.percentage !== undefined) {
        current.amount = Math.round((current.percentage / 100) * totalContractAmount);
      }

      if (updates.paidAmount !== undefined) {
        if (current.paidAmount >= current.amount && current.amount > 0) {
          current.status = 'paid';
        } else if (current.paidAmount > 0) {
          current.status = 'partially_paid';
        } else {
          current.status = 'unpaid';
        }
      }

      copy[index] = current;
      return copy;
    });
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const numCheck = validateServiceBookingNumber(bookingNumber);
    if (!numCheck.isValid) {
      newErrors.bookingNumber = numCheck.error || 'Invalid booking number.';
    }

    if (!eventTitle.trim()) {
      newErrors.eventTitle = 'Event / Couple Title is required.';
    }

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer / Client Name is required.';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Client phone / WhatsApp is required.';
    }

    if (!eventDate) {
      newErrors.eventDate = 'Execution Event Date is required.';
    }

    if (!venueName.trim()) {
      newErrors.venueName = 'Venue / Location name is required.';
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one service item.';
    } else {
      const hasInvalidItem = items.some((it) => !it.serviceName.trim() || it.unitPrice <= 0);
      if (hasInvalidItem) {
        newErrors.items = 'Each line item must have a valid service name and unit price > 0.';
      }
    }

    if (milestonePercentageSum !== 100) {
      newErrors.milestones = `Milestone percentages must total exactly 100% (currently ${milestonePercentageSum}%).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast('Validation Failed', 'Please complete all required fields and verify milestone balancing.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      const custCode = selectedCustomer ? selectedCustomer.customerCode : 'CUST-X';

      const payload = {
        bookingDate,
        customerId: selectedCustomerId || `cust_${Date.now()}`,
        customerCode: custCode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        eventTitle: eventTitle.trim(),
        eventDate,
        eventSession,
        venueName: venueName.trim(),
        venueCity: venueCity.trim() || undefined,
        venueAddress: venueAddress.trim() || undefined,
        distanceFromHqKm,
        estimatedGuestCount: Number(estimatedGuestCount) || 500,
        items,
        milestones,
        subtotal,
        discountTotal: orderDiscount,
        taxAmount,
        totalAmount: totalContractAmount,
        paidAmount: totalPaidAmount,
        outstandingBalance,
        status,
        salesPicName: salesPicName.trim() || currentUser.fullName,
        notes: notes.trim() || undefined
      };

      if (isEditing && initialBooking) {
        const updated = await updateServiceBooking(initialBooking.id, payload);
        addToast('Booking Updated', `Service booking order '${updated.bookingNumber}' updated successfully.`, 'success');
        if (onSuccess) onSuccess(updated);
      } else {
        const created = await createServiceBooking({
          preferredBookingNumber: bookingNumber,
          ...payload
        });
        addToast('Booking Created', `Service booking order '${created.bookingNumber}' created successfully.`, 'success');
        if (onSuccess) onSuccess(created);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save service booking order.';
      addToast('Submission Error', msg, 'error');
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Service Booking Order' : 'New Service Booking Order'}
      description="Sales Order Service · Multi-LOB Revenue Splitting, Milestones & Event Logistics"
      icon={<Sparkles className="w-4 h-4 text-[#086288]" />}
      size="lg"
      maxWidth="max-w-[1000px]"
      closeOnBackdropClick={false}
      closeOnEscape={!isSubmitting}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569]">
            <span className="text-[#DC2626] font-bold">*</span> Mandatory fields
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] hover:bg-[#EEF4F8] rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="service-booking-form"
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors cursor-pointer shadow-2xs min-w-[180px] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Confirm Service Booking'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="service-booking-form"
        onSubmit={handleSubmit}
        className="space-y-6 text-xs"
      >
        {/* SECTION 1: BOOKING NUMBER & IDENTITY */}
        <div className="p-4 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#086288] uppercase tracking-wider block">
                Canonical Document Number
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-bold text-[#086288] tracking-widest bg-white px-3 py-1 rounded border border-[#B7DDEA] shadow-2xs">
                  {bookingNumber || 'SB001YYYYMMXXXXX'}
                </span>
                <span className="text-[11px] text-[#475569]">
                  {isEditing ? 'Immutable Identifier' : 'Enterprise Pattern: SB + 001 + YYYYMM + 00001'}
                </span>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={handleReshuffleBookingNumber}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#086288] bg-white hover:bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Next Sequence</span>
              </button>
            )}
          </div>
          {errors.bookingNumber && (
            <p className="text-[10px] text-[#DC2626] font-medium">{errors.bookingNumber}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#B7DDEA]/60">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Select Master Customer <span className="text-[#086288] text-[10px] font-normal">(Auto-fill)</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#B7DDEA] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="">-- Choose Existing Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.customerCode}] {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Booking Issue Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#B7DDEA] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Account Manager / PIC Sales
              </label>
              <input
                type="text"
                value={salesPicName}
                onChange={(e) => setSalesPicName(e.target.value)}
                placeholder="e.g. Dimas Wicaksono"
                className="w-full px-3 py-2 bg-white border border-[#B7DDEA] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: EVENT & CLIENT SPECIFICATIONS */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <Calendar className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              1. Event & Client Specifications
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Event / Couple Title <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Aditya & Sarah Wedding Reception"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              {errors.eventTitle && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.eventTitle}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Customer / Contact Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Aditya Pratama"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              {errors.customerName && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.customerName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Execution Event Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              {errors.eventDate && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.eventDate}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Event Session
              </label>
              <select
                value={eventSession}
                onChange={(e) => setEventSession(e.target.value as ServiceBookingSession)}
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="morning">Morning / Akad / Ceremony</option>
                <option value="afternoon">Afternoon Session</option>
                <option value="evening">Evening / Reception</option>
                <option value="full_day">Full Day Package</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Phone / WhatsApp Number <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+62 812 8899 7711"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              {errors.customerPhone && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.customerPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Guest Capacity (Pax)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={estimatedGuestCount}
                onChange={(e) => setEstimatedGuestCount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Venue Name & Address <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Grand Ballroom Hotel Mulia, Jl. Asia Afrika No. 8, Senayan"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              {errors.venueName && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.venueName}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                City / Domicile
              </label>
              <input
                type="text"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                placeholder="e.g. Jakarta Pusat"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: MULTI-LOB SERVICE LINE ITEMS */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#DCE5EC]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#086288]" />
              <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
                2. Service Line Items & Multi-LOB Revenue Allocation
              </h3>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-[#DCE5EC] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-2.5 px-3 w-44">Business Line</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Service / Package Name</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-24">UoM</th>
                  <th className="py-2.5 px-3 w-36 text-right">Unit Price (Rp)</th>
                  <th className="py-2.5 px-3 w-36 text-right">Subtotal (Rp)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    {/* Business Line Picker */}
                    <td className="py-2 px-3 align-top">
                      <select
                        value={item.businessLineId}
                        onChange={(e) => handleUpdateItem(idx, { businessLineId: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-[#DCE5EC] rounded text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      >
                        {BUSINESS_LINES_CONFIG.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <span className="font-mono text-[10px] text-[#086288] block mt-0.5 font-bold">
                        {item.costCenterCode}
                      </span>
                    </td>

                    {/* Service Name & Description */}
                    <td className="py-2 px-3 align-top">
                      <input
                        type="text"
                        required
                        value={item.serviceName}
                        onChange={(e) => handleUpdateItem(idx, { serviceName: e.target.value })}
                        placeholder="Service name / package description"
                        className="w-full px-2 py-1.5 bg-white border border-[#DCE5EC] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                        placeholder="Optional scope of work notes..."
                        className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded text-[11px] text-[#64748B] mt-1 focus:outline-none focus:border-[#086288]"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 align-top">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-2 py-1.5 bg-white border border-[#DCE5EC] rounded text-xs text-center font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>

                    {/* UoM */}
                    <td className="py-2 px-3 align-top">
                      <select
                        value={item.uom}
                        onChange={(e) => handleUpdateItem(idx, { uom: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-[#DCE5EC] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      >
                        <option value="Package">Package</option>
                        <option value="Person">Person</option>
                        <option value="Set">Set</option>
                        <option value="Day">Day</option>
                        <option value="Hour">Hour</option>
                      </select>
                    </td>

                    {/* Unit Price */}
                    <td className="py-2 px-3 align-top">
                      <input
                        type="number"
                        min="0"
                        step="500000"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 bg-white border border-[#DCE5EC] rounded text-xs text-right font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="py-2 px-3 align-top text-right font-mono font-bold text-xs text-[#0F172A]">
                      Rp {item.subtotal?.toLocaleString('id-ID')}
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2 align-top text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                        title="Remove Service Line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.items && (
            <p className="text-[10px] text-[#DC2626] font-medium">{errors.items}</p>
          )}

          {/* Subtotal Preview */}
          <div className="flex justify-end p-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono">
            <span className="text-[#64748B] mr-3">Services Subtotal:</span>
            <span className="font-bold text-[#0F172A]">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* SECTION 4: PAYMENT MILESTONES (TERMIN PEMBAYARAN) */}
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#086288]" />
              <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
                3. Payment Milestones (Termin Pembayaran)
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748B]">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleRebalanceMilestones('3_step')}
                className="px-2 py-1 text-[10px] font-semibold bg-white hover:bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded transition-colors cursor-pointer"
              >
                Standard 3-Termin (20%-40%-40%)
              </button>
              <button
                type="button"
                onClick={() => handleRebalanceMilestones('2_step')}
                className="px-2 py-1 text-[10px] font-semibold bg-white hover:bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded transition-colors cursor-pointer"
              >
                2-Termin (50%-50%)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#DCE5EC] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-2.5 px-3">Milestone Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">%</th>
                  <th className="py-2.5 px-3 w-36 text-right">Target Amount (Rp)</th>
                  <th className="py-2.5 px-3 w-36">Due Date</th>
                  <th className="py-2.5 px-3 w-36 text-right">Paid Amount (Rp)</th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {milestones.map((ms, idx) => (
                  <tr key={ms.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={ms.milestoneName}
                        onChange={(e) => handleUpdateMilestone(idx, { milestoneName: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-[#DCE5EC] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={ms.percentage}
                        onChange={(e) => handleUpdateMilestone(idx, { percentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#DCE5EC] rounded text-xs text-center font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-xs text-[#0F172A]">
                      Rp {ms.amount?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ms.dueDate || ''}
                        onChange={(e) => handleUpdateMilestone(idx, { dueDate: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-[#DCE5EC] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="500000"
                        value={ms.paidAmount}
                        onChange={(e) => handleUpdateMilestone(idx, { paidAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#DCE5EC] rounded text-xs text-right font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ms.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ms.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {ms.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.milestones && (
            <p className="text-[10px] text-[#DC2626] font-medium">{errors.milestones}</p>
          )}

          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Total Percentage: <strong className={milestonePercentageSum === 100 ? 'text-emerald-700' : 'text-[#DC2626]'}>{milestonePercentageSum}%</strong> (Must be 100%)
            </span>
            <span>
              Total Collected: <strong className="text-[#086288] font-mono">Rp {totalPaidAmount.toLocaleString('id-ID')}</strong>
            </span>
          </div>
        </div>

        {/* SECTION 5: FINANCIAL SUMMARY & LIFECYCLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8FAFC] border border-[#DCE5EC] rounded-xl text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Booking Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceBookingStatus)}
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="draft">Draft (Preliminary Inquiry)</option>
                <option value="confirmed">Confirmed (DP Received)</option>
                <option value="in_progress">In Progress (Execution & Preparation)</option>
                <option value="completed">Completed (Event Successfully Finished)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Special Event Notes & Client Requirements
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Loading time Aurum Deco starts at 23:00 H-1. Rehearsal at 14:00 with WO Hizaki team."
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>

          <div className="space-y-2 p-3 bg-white border border-[#DCE5EC] rounded-lg font-mono">
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Services Subtotal:</span>
              <span className="font-bold text-[#0F172A]">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Order Discount (Rp):</span>
              <input
                type="number"
                min="0"
                step="500000"
                value={orderDiscount}
                onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                className="w-36 px-2 py-0.5 text-right font-mono border border-[#DCE5EC] rounded text-xs focus:outline-none focus:border-[#086288]"
              />
            </div>
            <div className="flex justify-between py-1.5 border-b-2 border-[#DCE5EC] text-sm">
              <span className="font-bold text-[#086288]">Total Contract Value:</span>
              <span className="font-bold text-[#086288]">Rp {totalContractAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-700">
              <span>Paid Down Payment / Milestones:</span>
              <span className="font-bold">-Rp {totalPaidAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1.5 pt-2 border-t border-[#DCE5EC] text-sm">
              <span className="font-bold text-[#DC2626]">Outstanding Balance:</span>
              <span className="font-bold text-[#DC2626]">Rp {outstandingBalance.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
