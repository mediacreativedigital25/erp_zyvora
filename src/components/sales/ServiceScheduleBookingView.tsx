import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Car,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Filter,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Phone,
  MessageSquare,
  FileText,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Layers,
  X,
  Check,
  CalendarDays,
  ListFilter,
  Eye,
  Plus,
  XCircle
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { ServiceBookingOrder, ServiceBookingSession, ServiceBookingStatus, Employee, CompanyVehicle } from '../../types/erp';
import { EmployeeService } from '../../services/employeeService';
import { VehicleMasterService } from '../../services/vehicleMasterService';
import { BaseModal } from '../common/BaseModal';

// Reference date for simulation (matches ERP operational date)
const SYSTEM_TODAY = '2026-11-05';

export const ServiceScheduleBookingView: React.FC = () => {
  const {
    serviceBookings,
    createServiceBooking,
    updateServiceBooking,
    branches,
    tenant,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast,
    companyProfile
  } = useErp();
  const { confirm } = useConfirm();

  const handleCancelBooking = async (b: ServiceBookingOrder) => {
    const isConfirmed = await confirm({
      title: 'Batalkan Jadwal Layanan (SPK)?',
      message: `Apakah Anda yakin ingin membatalkan jadwal layanan untuk "${b.customerName}" pada tanggal ${b.eventDate}?`,
      entityCode: b.bookingNumber,
      entityName: b.customerName,
      variant: 'danger',
      confirmLabel: 'Ya, Batalkan Jadwal',
      cancelLabel: 'Batal',
      consequences: [
        'Jadwal penugasan kru dan armada operasional akan dicabut.',
        'Status pesanan akan diubah menjadi CANCELLED.'
      ]
    });

    if (!isConfirmed) return;

    updateServiceBooking(b.id, { status: 'cancelled' });
    addToast('Jadwal Dibatalkan', `Jadwal ${b.bookingNumber} telah dibatalkan.`, 'info');
  };

  const canManage =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin', 'sales'].includes(currentUser.role);

  // Data states for crew and vehicle dispatch
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [empList, vehList] = await Promise.all([
          EmployeeService.getEmployees(tenant.id),
          VehicleMasterService.getVehicles(tenant.id)
        ]);
        setEmployees(empList);
        setVehicles(vehList);
      } catch (err) {
        console.warn('Failed to load dispatch resources:', err);
      }
    };
    loadResources();
  }, [tenant.id]);

  // View Mode: 'agenda' (Standard Table) or 'calendar' (Interactive Grid)
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');

  // Calendar navigation state (Year & Month)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 10, 1)); // November 2026

  // ---------------------------------------------------------------------------
  // 1. TWO-COLUMN BALANCED FILTER STATES
  // ---------------------------------------------------------------------------
  // Left Column:
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Right Column:
  const [radarFilter, setRadarFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'upcoming'>('all');
  const [filterBusinessLine, setFilterBusinessLine] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Table & Toolbar Controls
  const [tableSearch, setTableSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [dispatchTarget, setDispatchTarget] = useState<ServiceBookingOrder | null>(null);
  const [spkPrintTarget, setSpkPrintTarget] = useState<ServiceBookingOrder | null>(null);
  const [detailTarget, setDetailTarget] = useState<ServiceBookingOrder | null>(null);

  // Add to Schedule Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'queue' | 'direct'>('queue');

  // Queue Verification Mode Form States
  const [selectedQueueBookingId, setSelectedQueueBookingId] = useState<string>('');
  const [pickingDate, setPickingDate] = useState<string>(SYSTEM_TODAY);
  const [pickingDoNumber, setPickingDoNumber] = useState<string>('');
  const [queueCrewLead, setQueueCrewLead] = useState<string>('');
  const [queueVehiclePlate, setQueueVehiclePlate] = useState<string>('');
  const [queueNotes, setQueueNotes] = useState<string>('');

  // Direct Schedule Entry Form States
  const [directCustName, setDirectCustName] = useState<string>('');
  const [directCustPhone, setDirectCustPhone] = useState<string>('');
  const [directBranchId, setDirectBranchId] = useState<string>('');
  const [directBusinessLine, setDirectBusinessLine] = useState<string>('QUEINVITE');
  const [directEventTitle, setDirectEventTitle] = useState<string>('');
  const [directEventDate, setDirectEventDate] = useState<string>(SYSTEM_TODAY);
  const [directSession, setDirectSession] = useState<ServiceBookingSession>('morning');
  const [directVenueName, setDirectVenueName] = useState<string>('');
  const [directVenueAddress, setDirectVenueAddress] = useState<string>('');
  const [directCrewLead, setDirectCrewLead] = useState<string>('');
  const [directVehiclePlate, setDirectVehiclePlate] = useState<string>('');
  const [directNotes, setDirectNotes] = useState<string>('');

  // Unpicked bookings queue
  const unpickedBookings = useMemo(() => {
    return serviceBookings.filter((b) =>
      ['open', 'received', 'draft'].includes(b.status.toLowerCase())
    );
  }, [serviceBookings]);

  // Selected booking from queue
  const selectedQueueBooking = useMemo(() => {
    return (
      unpickedBookings.find((b) => b.id === selectedQueueBookingId) ||
      unpickedBookings[0] ||
      null
    );
  }, [unpickedBookings, selectedQueueBookingId]);

  const openAddModal = () => {
    if (unpickedBookings.length > 0) {
      setAddMode('queue');
      const first = unpickedBookings[0];
      setSelectedQueueBookingId(first.id);
      setPickingDate(SYSTEM_TODAY);
      setPickingDoNumber(`DO01${SYSTEM_TODAY.replace(/-/g, '').slice(0, 6)}0001`);
      setQueueCrewLead(first.assignedCrewLeadName || employees[0]?.fullName || '');
      setQueueVehiclePlate(first.assignedVehiclePlate || vehicles[0]?.licensePlate || '');
      setQueueNotes(first.notes || '');
    } else {
      setAddMode('direct');
      setSelectedQueueBookingId('');
      setPickingDate(SYSTEM_TODAY);
      setPickingDoNumber('');
      setQueueCrewLead(employees[0]?.fullName || '');
      setQueueVehiclePlate(vehicles[0]?.licensePlate || '');
      setQueueNotes('');
    }

    setDirectCustName('');
    setDirectCustPhone('');
    setDirectBranchId(branches[0]?.id || 'br_jkt_hq');
    setDirectBusinessLine('QUEINVITE');
    setDirectEventTitle('');
    setDirectEventDate(SYSTEM_TODAY);
    setDirectSession('morning');
    setDirectVenueName('');
    setDirectVenueAddress('');
    setDirectCrewLead(employees[0]?.fullName || '');
    setDirectVehiclePlate(vehicles[0]?.licensePlate || '');
    setDirectNotes('');
    setIsAddModalOpen(true);
  };

  const handleQueueBookingChange = (id: string) => {
    setSelectedQueueBookingId(id);
    const target = unpickedBookings.find((b) => b.id === id);
    if (target) {
      setQueueCrewLead(target.assignedCrewLeadName || employees[0]?.fullName || '');
      setQueueVehiclePlate(target.assignedVehiclePlate || vehicles[0]?.licensePlate || '');
      setQueueNotes(target.notes || '');
    }
  };

  const handleConfirmQueueAdd = async () => {
    if (!selectedQueueBooking) {
      addToast('No Order Selected', 'Please select an order from the picking queue.', 'warning');
      return;
    }

    const matchedVeh = vehicles.find((v) => v.licensePlate === queueVehiclePlate);

    try {
      const updated = await updateServiceBooking(selectedQueueBooking.id, {
        status: 'picked',
        pickingDate: pickingDate || SYSTEM_TODAY,
        deliveryOrderNumber: pickingDoNumber || `DO01${SYSTEM_TODAY.replace(/-/g, '').slice(0, 6)}0001`,
        assignedCrewLeadName: queueCrewLead || selectedQueueBooking.assignedCrewLeadName || employees[0]?.fullName,
        assignedCrewCount: selectedQueueBooking.assignedCrewCount || 3,
        assignedVehiclePlate: queueVehiclePlate || selectedQueueBooking.assignedVehiclePlate || vehicles[0]?.licensePlate,
        assignedVehicleModel: matchedVeh ? matchedVeh.brandModel : 'Operational Car',
        notes: queueNotes || selectedQueueBooking.notes
      });

      if (updated) {
        addToast(
          'Added to Schedule',
          `Order ${selectedQueueBooking.bookingNumber} (${selectedQueueBooking.customerName}) verified from picking queue and added to active schedule.`,
          'success'
        );
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      addToast('Error Updating Booking', err.message || 'Failed to update booking', 'error');
    }
  };

  const handleConfirmDirectAdd = async () => {
    if (!directCustName.trim()) {
      addToast('Validation Warning', 'Customer name is required.', 'warning');
      return;
    }
    if (!directEventTitle.trim()) {
      addToast('Validation Warning', 'Event title is required.', 'warning');
      return;
    }
    if (!directVenueName.trim()) {
      addToast('Validation Warning', 'Venue name is required.', 'warning');
      return;
    }

    const matchedBranch = branches.find((b) => b.id === directBranchId) || branches[0];
    const matchedVeh = vehicles.find((v) => v.licensePlate === directVehiclePlate);

    try {
      const newBooking = await createServiceBooking({
        bookingDate: SYSTEM_TODAY,
        customerId: `cust_direct_${Date.now()}`,
        customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: directCustName.trim(),
        customerPhone: directCustPhone.trim() || '0812-0000-0000',
        eventTitle: directEventTitle.trim(),
        eventDate: directEventDate || SYSTEM_TODAY,
        eventSession: directSession,
        venueName: directVenueName.trim(),
        venueAddress: directVenueAddress.trim(),
        venueCity: matchedBranch?.city || 'Jakarta',
        items: [
          {
            id: `item_${Date.now()}`,
            businessLineId: directBusinessLine,
            businessLineName: directBusinessLine,
            costCenterCode: `CC-${directBusinessLine}`,
            serviceName: `${directBusinessLine} Service Delivery`,
            quantity: 1,
            uom: 'Package',
            unitPrice: 15000000,
            discount: 0,
            subtotal: 15000000
          }
        ],
        milestones: [],
        subtotal: 15000000,
        discountTotal: 0,
        taxAmount: 1650000,
        totalAmount: 16650000,
        paidAmount: 16650000,
        outstandingBalance: 0,
        status: 'picked', // Passed picking gate!
        salesPicName: currentUser.fullName,
        pickingDate: SYSTEM_TODAY,
        branchId: matchedBranch?.id,
        branchCode: matchedBranch?.code,
        branchName: matchedBranch?.name,
        assignedCrewLeadName: directCrewLead || employees[0]?.fullName,
        assignedCrewCount: 3,
        assignedVehiclePlate: directVehiclePlate || vehicles[0]?.licensePlate,
        assignedVehicleModel: matchedVeh ? matchedVeh.brandModel : 'Operational Car',
        notes: directNotes.trim()
      });

      addToast(
        'Schedule Created',
        `Booking ${newBooking.bookingNumber} added directly to active schedule as Picked.`,
        'success'
      );
      setIsAddModalOpen(false);
    } catch (err: any) {
      addToast('Error Creating Booking', err.message || 'Failed to create booking', 'error');
    }
  };

  // Dispatch Form States
  const [dispatchLeadName, setDispatchLeadName] = useState('');
  const [dispatchVehiclePlate, setDispatchVehiclePlate] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const openDispatchModal = (b: ServiceBookingOrder) => {
    setDispatchTarget(b);
    setDispatchLeadName(b.assignedCrewLeadName || employees[0]?.fullName || '');
    setDispatchVehiclePlate(b.assignedVehiclePlate || vehicles[0]?.licensePlate || '');
    setDispatchNotes(b.notes || '');
  };

  const handleSaveDispatch = async () => {
    if (!dispatchTarget) return;

    const matchedVeh = vehicles.find((v) => v.licensePlate === dispatchVehiclePlate);
    try {
      const updated = await updateServiceBooking(dispatchTarget.id, {
        assignedCrewLeadName: dispatchLeadName,
        assignedCrewCount: dispatchTarget.assignedCrewCount || 3,
        assignedVehiclePlate: dispatchVehiclePlate,
        assignedVehicleModel: matchedVeh ? matchedVeh.brandModel : 'Operational Car',
        notes: dispatchNotes
      });

      if (updated) {
        addToast(
          'Dispatch Assigned',
          `Crew Lead [${dispatchLeadName}] & Fleet [${dispatchVehiclePlate}] assigned to ${dispatchTarget.bookingNumber}.`,
          'success'
        );
      }
      setDispatchTarget(null);
    } catch (err: any) {
      addToast('Error Assigning Dispatch', err.message || 'Failed to assign dispatch', 'error');
    }
  };

  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setRadarFilter('all');
    setFilterBusinessLine('all');
    setFilterStatus('all');
    setTableSearch('');
    setCurrentPage(1);
  };

  // Helper: compute relative schedule distance
  const getScheduleDistance = (eventDateStr: string) => {
    const today = new Date(SYSTEM_TODAY);
    const target = new Date(eventDateStr);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ---------------------------------------------------------------------------
  // FILTERING LOGIC
  // ---------------------------------------------------------------------------
  const filteredBookings = useMemo(() => {
    return serviceBookings.filter((b) => {
      // 0. Strict Picking Gate per User Request: Only orders that have passed picking process appear in the schedule
      const isPickedGatePassed = ['picked', 'in_progress', 'completed'].includes(b.status.toLowerCase());
      if (!isPickedGatePassed) return false;

      // 1. Branch filter
      if (filterBranchId !== 'all' && b.branchId !== filterBranchId) {
        return false;
      }

      // 2. Date Range
      if (filterDateFrom && b.eventDate < filterDateFrom) return false;
      if (filterDateTo && b.eventDate > filterDateTo) return false;

      // 3. Radar filter (Today, Tomorrow, This Week, Upcoming)
      if (radarFilter !== 'all') {
        const diffDays = getScheduleDistance(b.eventDate);
        if (radarFilter === 'today' && diffDays !== 0) return false;
        if (radarFilter === 'tomorrow' && diffDays !== 1) return false;
        if (radarFilter === 'week' && (diffDays < 0 || diffDays > 7)) return false;
        if (radarFilter === 'upcoming' && diffDays < 0) return false;
      }

      // 4. Business Line / LOB
      if (filterBusinessLine !== 'all') {
        const hasLob = b.items?.some(
          (it) => it.businessLineId.toLowerCase() === filterBusinessLine.toLowerCase()
        );
        if (!hasLob) return false;
      }

      // 5. Status
      if (filterStatus !== 'all') {
        if (b.status.toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // 6. Search in table
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchNo = b.bookingNumber.toLowerCase().includes(q);
        const matchCust = b.customerName.toLowerCase().includes(q);
        const matchTitle = b.eventTitle?.toLowerCase().includes(q);
        const matchVenue = b.venueName?.toLowerCase().includes(q);
        const matchLead = b.assignedCrewLeadName?.toLowerCase().includes(q);
        const matchPlate = b.assignedVehiclePlate?.toLowerCase().includes(q);
        if (!matchNo && !matchCust && !matchTitle && !matchVenue && !matchLead && !matchPlate) {
          return false;
        }
      }

      return true;
    });
  }, [
    serviceBookings,
    filterBranchId,
    filterDateFrom,
    filterDateTo,
    radarFilter,
    filterBusinessLine,
    filterStatus,
    tableSearch
  ]);

  // Sort bookings chronologically
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [filteredBookings]);

  const totalPages = Math.ceil(sortedBookings.length / entriesPerPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return sortedBookings.slice(start, start + entriesPerPage);
  }, [sortedBookings, currentPage, entriesPerPage]);

  // ---------------------------------------------------------------------------
  // RADAR BADGE RENDERER
  // ---------------------------------------------------------------------------
  const renderScheduleBadge = (eventDateStr: string) => {
    const diff = getScheduleDistance(eventDateStr);

    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          TODAY (HIGH ALERT)
        </span>
      );
    }
    if (diff === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          TOMORROW (H-1)
        </span>
      );
    }
    if (diff > 1 && diff <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300">
          <Calendar className="w-3 h-3 text-sky-600" />
          IN {diff} DAYS (H-{diff})
        </span>
      );
    }
    if (diff > 3 && diff <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          THIS WEEK
        </span>
      );
    }
    if (diff > 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          UPCOMING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
        PAST EVENT
      </span>
    );
  };

  const renderStatusBadge = (status: ServiceBookingStatus) => {
    switch (status) {
      case 'picked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> PICKED (READY)
          </span>
        );
      case 'open':
      case 'confirmed':
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" /> SCHEDULED
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Clock className="w-3 h-3 text-blue-600" /> IN PROGRESS
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {status}
          </span>
        );
    }
  };

  const renderSessionBadge = (session: ServiceBookingSession) => {
    switch (session) {
      case 'morning':
        return <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Morning (08:00–12:00)</span>;
      case 'afternoon':
        return <span className="text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Afternoon (13:00–17:00)</span>;
      case 'evening':
        return <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">Evening (18:00–22:00)</span>;
      case 'full_day':
        return <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Full Day Session</span>;
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // CALENDAR GRID COMPUTATIONS
  // ---------------------------------------------------------------------------
  const currentMonthYear = useMemo(() => {
    return calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarDate]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    setCalendarDate(new Date(2026, 10, 1));
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
                  onChange={(e) => {
                    setFilterBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Operating Branches ---</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Date Range</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Schedule From"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Schedule To"
                />
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
            {/* Schedule Radar Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Schedule Radar</label>
              <div className="sm:col-span-2">
                <select
                  value={radarFilter}
                  onChange={(e) => {
                    setRadarFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#086288] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Schedules ---</option>
                  <option value="today">🚨 TODAY (High Alert Visits)</option>
                  <option value="tomorrow">⏰ TOMORROW (H-1 Reminder)</option>
                  <option value="week">📅 THIS WEEK (H-3 to H-7 Visits)</option>
                  <option value="upcoming">🗓️ Upcoming Next 30 Days</option>
                </select>
              </div>
            </div>

            {/* Service Line / LOB */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Service Line</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBusinessLine}
                  onChange={(e) => {
                    setFilterBusinessLine(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Business Lines ---</option>
                  <option value="QUEINVITE">Queinvite (Digital System & RSVP)</option>
                  <option value="HIZAKI">Hizaki (Event Coordination & WO)</option>
                  <option value="AURUM">Aurum (Decoration & Staging)</option>
                  <option value="KIMIKO">Kimiko (Receptionists & Protocol)</option>
                </select>
              </div>
            </div>

            {/* Execution Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Active Schedules ---</option>
                  <option value="picked">PICKED (Ready for Field Dispatch)</option>
                  <option value="in_progress">IN PROGRESS (On-Site / Deployed)</option>
                  <option value="completed">COMPLETED (Event Finished)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & VIEW TOGGLE                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Mode Toggle Button Group */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-[#CBD5E1] rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-white text-[#086288] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Agenda List</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#086288] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar Grid</span>
            </button>
          </div>

          {/* + Add to Schedule Button */}
          {canManage && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add to Schedule</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Schedule Sheet</span>
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
              placeholder="Filter in schedule..."
              className="h-8 w-44 sm:w-56 px-2.5 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN CONTENT: AGENDA TABLE OR INTERACTIVE CALENDAR                 */}
      {/* ===================================================================== */}
      {viewMode === 'agenda' ? (
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
          {sortedBookings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EFF7FA] text-[#086288] flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">No Service Schedules Found</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                {tableSearch || radarFilter !== 'all' || filterBranchId !== 'all' || filterStatus !== 'all'
                  ? 'No schedule matches current filter criteria. Try clicking Reset.'
                  : 'All service orders are scheduled and up to date.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                    <th className="py-3 px-4">Date & Reminder Alert</th>
                    <th className="py-3 px-4">Booking Number</th>
                    <th className="py-3 px-4">Client & Event Title</th>
                    <th className="py-3 px-4">Destination & Venue</th>
                    <th className="py-3 px-4">Assigned Crew</th>
                    <th className="py-3 px-4">Fleet / Vehicle</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {paginatedBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-[#F8FAFC] transition-colors group cursor-default"
                    >
                      {/* 1. Date & Alert */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#086288]" />
                            <span>{b.eventDate}</span>
                          </div>
                          <div>{renderSessionBadge(b.eventSession)}</div>
                          <div>{renderScheduleBadge(b.eventDate)}</div>
                        </div>
                      </td>

                      {/* 2. Booking Number */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded w-fit">
                            {b.bookingNumber}
                          </span>
                          <span className="text-[10px] text-[#64748B] mt-1 font-mono">
                            {b.branchName || 'Jakarta HQ'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Client & Event */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] line-clamp-1 max-w-[220px]">
                          {b.eventTitle || 'Service Delivery & Setup'}
                        </div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-[#0F172A]">{b.customerName}</span>
                          {b.customerPhone && (
                            <a
                              href={`https://wa.me/${b.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 font-mono text-[10px] bg-emerald-50 px-1 rounded"
                              title="Chat WhatsApp with Client"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              {b.customerPhone}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Destination & Venue */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A] line-clamp-1 max-w-[200px]" title={b.venueName}>
                          {b.venueName}
                        </div>
                        <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5 line-clamp-1 max-w-[200px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.venueAddress ? `${b.venueAddress}, ${b.venueCity}` : b.venueCity || 'On-site Location'}</span>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(`${b.venueName} ${b.venueAddress || ''}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#086288] hover:underline mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Google Maps</span>
                        </a>
                      </td>

                      {/* 5. Assigned Crew */}
                      <td className="py-3 px-4">
                        {b.assignedCrewLeadName ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#0F172A] flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>{b.assignedCrewLeadName}</span>
                            </div>
                            <span className="text-[10px] text-[#64748B] block">
                              Lead + {Math.max((b.assignedCrewCount || 3) - 1, 1)} Field Personnel
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDispatchModal(b)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <Users className="w-3 h-3" />
                            <span>+ Assign Crew</span>
                          </button>
                        )}
                      </td>

                      {/* 6. Assigned Fleet */}
                      <td className="py-3 px-4">
                        {b.assignedVehiclePlate ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-xs text-[#086288] bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA]">
                              {b.assignedVehiclePlate}
                            </span>
                            <span className="text-[10px] text-[#64748B] block truncate max-w-[120px]">
                              {b.assignedVehicleModel || 'Fleet Car'}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDispatchModal(b)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Car className="w-3 h-3" />
                            <span>+ Assign Fleet</span>
                          </button>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4 text-center">{renderStatusBadge(b.status)}</td>

                      {/* 8. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDispatchModal(b)}
                            title="Dispatch Crew & Vehicle"
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSpkPrintTarget(b)}
                            title="Print Field Service Order (SPK)"
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailTarget(b)}
                            title="View Full Booking Info"
                            className="p-1.5 text-slate-500 hover:text-[#086288] hover:bg-[#EFF7FA] rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManage && b.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(b)}
                              title="Batalkan Jadwal Layanan"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 4. PAGINATION FOOTER                                                  */}
          {/* ===================================================================== */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#E2E8F0] gap-3 text-xs text-[#64748B]">
            <div>
              Showing <strong className="text-[#0F172A]">{sortedBookings.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
              <strong className="text-[#0F172A]">{Math.min(currentPage * entriesPerPage, sortedBookings.length)}</strong> of{' '}
              <strong className="text-[#0F172A]">{sortedBookings.length}</strong> schedules
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
      ) : (
        /* ===================================================================== */
        /* INTERACTIVE MONTHLY CALENDAR GRID VIEW                                */
        /* ===================================================================== */
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
          {/* Calendar Header with Navigation */}
          <div className="p-4 border-b border-[#CBD5E1] bg-[#FAFDFE] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#0F172A]">{currentMonthYear}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTodayMonth}
                className="px-3 py-1.5 rounded-md border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                Today Month
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-md border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs font-bold text-[#475569] py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8F0] border-b border-[#CBD5E1]">
            {calendarDays.map((cd, idx) => {
              const dayBookings = sortedBookings.filter((b) => b.eventDate === cd.dateStr);
              const isToday = cd.dateStr === SYSTEM_TODAY;

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                    !cd.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-400'
                      : isToday
                      ? 'bg-cyan-50/30'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-[#086288] text-white shadow-2xs'
                          : cd.isCurrentMonth
                          ? 'text-[#0F172A]'
                          : 'text-slate-400'
                      }`}
                    >
                      {cd.dayNumber}
                    </span>

                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-bold text-[#086288] bg-[#EFF7FA] px-1.5 py-0.2 rounded-full border border-[#B7DDEA]">
                        {dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Event Cards in Date Cell */}
                  <div className="space-y-1.5 flex-1">
                    {dayBookings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => openDispatchModal(b)}
                        className="w-full text-left p-1.5 rounded-md bg-white border border-[#CBD5E1] hover:border-[#086288] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="text-[10px] font-bold text-[#086288] truncate group-hover:text-[#064B6A]">
                          {b.eventTitle || b.customerName}
                        </div>
                        <div className="text-[9px] text-[#64748B] flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{b.venueName}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[8px]">
                          <span className="font-mono text-slate-500 uppercase">{b.eventSession}</span>
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                            {b.assignedCrewLeadName ? b.assignedCrewLeadName.split(' ')[0] : 'No Crew'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: DISPATCH & CREW / FLEET ALLOCATION                           */}
      {/* ===================================================================== */}
      {dispatchTarget && (
        <BaseModal
          isOpen={Boolean(dispatchTarget)}
          onClose={() => setDispatchTarget(null)}
          title={`Field Dispatch: ${dispatchTarget.bookingNumber}`}
          description={`Date: ${dispatchTarget.eventDate} • Venue: ${dispatchTarget.venueName}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setDispatchTarget(null)}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDispatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Dispatch Assignment</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Target Overview Card */}
            <div className="p-3.5 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-[#086288] block text-sm">
                  {dispatchTarget.eventTitle || 'Field Service Visit'}
                </span>
                <span className="text-[#475569] text-xs">
                  Client: <strong>{dispatchTarget.customerName}</strong> ({dispatchTarget.customerPhone})
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#0F172A] font-bold block">
                  {dispatchTarget.eventDate}
                </span>
                {renderSessionBadge(dispatchTarget.eventSession)}
              </div>
            </div>

            {/* Crew Lead Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#086288]" />
                <span>Assigned Crew Leader (PIC Lapangan)</span>
              </label>
              <select
                value={dispatchLeadName}
                onChange={(e) => setDispatchLeadName(e.target.value)}
                className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.fullName}>
                    {emp.employeeCode} - {emp.fullName} ({emp.position || 'Technician / Crew'})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle / Fleet Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#086288]" />
                <span>Assigned Fleet / Operational Vehicle</span>
              </label>
              <select
                value={dispatchVehiclePlate}
                onChange={(e) => setDispatchVehiclePlate(e.target.value)}
                className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-mono focus:outline-hidden focus:border-[#086288]"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.licensePlate}>
                    {v.licensePlate} — {v.brandModel} ({v.vehicleType.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes / Technical Instructions */}
            <div className="space-y-1">
              <label className="font-semibold text-[#0F172A]">Departure Notes & Equipment Checklist</label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Contoh: Loading alat mulai jam 07:30 WIB. Bawa perlengkapan cadangan kabel audio dan converter HDMI..."
                className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
              />
            </div>
          </div>
        </BaseModal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: PRINT SPK (FIELD SERVICE DISPATCH ORDER)                    */}
      {/* ===================================================================== */}
      {spkPrintTarget && (
        <>
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              body {
                overflow: visible !important;
                background: white !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-spk-document,
              #printable-spk-document * {
                visibility: visible !important;
              }
              #printable-spk-document {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                z-index: 999999 !important;
              }
            }
          `}</style>
          <BaseModal
            isOpen={Boolean(spkPrintTarget)}
            onClose={() => setSpkPrintTarget(null)}
            title={`Surat Perintah Kerja (SPK): ${spkPrintTarget.bookingNumber}`}
            description="Official field dispatch sheet for technician and coordinator deployment."
            size="xl"
            maxWidth="max-w-4xl"
            bodyClassName="p-3 sm:p-5 bg-slate-100/80"
            footer={
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] text-[#64748B]">
                  Format Kertas A4 Portrait (1 Halaman Siap Cetak & PDF)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSpkPrintTarget(null)}
                    className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print SPK Document</span>
                  </button>
                </div>
              </div>
            }
          >
            <div className="overflow-y-auto max-h-[75vh] flex justify-center">
              <div
                id="printable-spk-document"
                className="w-full max-w-[210mm] bg-white p-6 sm:p-8 shadow-sm border border-slate-300 rounded-sm font-sans text-[#0F172A] space-y-4"
              >
                {/* Official Letterhead / Header */}
                <div className="flex items-start justify-between pb-3 border-b-2 border-[#086288] gap-4">
                  <div className="space-y-1">
                    {companyProfile?.logoUrl ? (
                      <img
                        src={companyProfile.logoUrl}
                        alt="Logo"
                        className="h-10 max-w-[160px] object-contain mb-1"
                      />
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#086288] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          ZY
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#086288] tracking-tight">
                            {companyProfile?.brandName || tenant?.name || 'ZYVORA ENTERPRISE'}
                          </div>
                          <div className="text-[9.5px] text-[#64748B] uppercase tracking-wider font-semibold">
                            {companyProfile?.legalName || 'PT Zyvora Global Pratama'}
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-[#64748B] leading-tight">
                      {companyProfile?.address || 'Jl. Jenderal Sudirman Kav. 52-53, Jakarta Selatan'}
                    </p>
                    <p className="text-[10px] text-[#64748B] leading-tight">
                      Telp / WhatsApp: {companyProfile?.phone || '+62 21 5289 0000'} | Email: {companyProfile?.email || 'operations@zyvora.id'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 bg-[#EFF7FA] border border-[#B7DDEA] text-[#086288] text-[10px] font-bold uppercase tracking-wider rounded mb-1">
                      Surat Perintah Kerja (SPK)
                    </span>
                    <h2 className="font-mono font-bold text-base text-[#0F172A] leading-tight">
                      {spkPrintTarget.bookingNumber}
                    </h2>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">
                      Tanggal Terbit: <strong className="text-[#0F172A]">{spkPrintTarget.bookingDate}</strong>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Status: SIAP DISPATCH LAPANGAN
                    </span>
                  </div>
                </div>

                {/* Subtitle Bar */}
                <div className="bg-[#FAFDFE] border border-[#B7DDEA] p-2 rounded flex items-center justify-between text-xs">
                  <span className="font-bold text-[#086288] tracking-wide uppercase text-[11px]">
                    PENUGASAN LAYANAN & OPERASIONAL LAPANGAN (FIELD DISPATCH SHEET)
                  </span>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    Ref: {spkPrintTarget.id}
                  </span>
                </div>

                {/* Event & Destination Meta Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Left Box: Client & Location */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                    <span className="text-[10px] font-bold text-[#086288] uppercase tracking-wider block border-b border-slate-200 pb-1">
                      1. Informasi Klien & Lokasi Acara
                    </span>
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Nama Klien / PIC Acara:</span>
                      <span className="font-bold text-xs text-[#0F172A] block">{spkPrintTarget.customerName}</span>
                      <span className="text-[11px] text-[#475569] font-mono">{spkPrintTarget.customerPhone || '-'}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[10px] text-[#64748B] block">Lokasi / Nama Venue:</span>
                      <span className="font-semibold text-xs text-[#0F172A] block">{spkPrintTarget.venueName}</span>
                      <span className="text-[11px] text-[#475569] leading-tight block">
                        {spkPrintTarget.venueAddress || spkPrintTarget.venueCity || 'Lokasi sesuai briefing rundown'}
                      </span>
                    </div>
                  </div>

                  {/* Right Box: Schedule, Personnel & Fleet */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                    <span className="text-[10px] font-bold text-[#086288] uppercase tracking-wider block border-b border-slate-200 pb-1">
                      2. Jadwal, Kru & Armada
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#64748B] block">Tanggal Pelaksanaan:</span>
                        <span className="font-bold text-xs text-[#0F172A] block">{spkPrintTarget.eventDate}</span>
                        <span className="text-[10px] text-[#086288] font-semibold uppercase">{spkPrintTarget.eventSession} Session</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#64748B] block">Jam Layanan / Sesi:</span>
                        <span className="font-mono font-bold text-xs text-[#0F172A] block">
                          {spkPrintTarget.startTime && spkPrintTarget.endTime
                            ? `${spkPrintTarget.startTime} - ${spkPrintTarget.endTime}`
                            : '09:00 - 10:00'}
                        </span>
                        {spkPrintTarget.durationText && (
                          <span className="text-[10px] text-[#475569] block font-mono">
                            Durasi: {spkPrintTarget.durationText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] text-[#64748B] block">Koordinator Kru (Lead):</span>
                        <span className="font-bold text-xs text-[#086288] block">
                          {spkPrintTarget.assignedCrewLeadName || 'Field Lead'}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          Jumlah Kru: {spkPrintTarget.assignedCrewCount || 3} Personel
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#64748B] block">Armada Operasional:</span>
                        <span className="font-mono font-bold text-xs text-[#0F172A] block">
                          {spkPrintTarget.assignedVehiclePlate || 'B 1234 ZYV'}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {spkPrintTarget.assignedVehicleModel || 'Operasional Lapangan'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide">
                      Scope of Service & Rincian Deliverables
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      Total: {spkPrintTarget.items?.length || 0} Layanan Terdaftar
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead className="bg-[#F1F5F9] border-b border-slate-300 font-semibold text-[#334155] text-[11px]">
                      <tr>
                        <th className="p-2 w-10 text-center border-r border-slate-300">No</th>
                        <th className="p-2 border-r border-slate-300">Deskripsi Layanan & Spesifikasi Teknis</th>
                        <th className="p-2 text-center w-24 border-r border-slate-300">Volume / Qty</th>
                        <th className="p-2 text-center w-32 border-r border-slate-300">Kesiapan Tim</th>
                        <th className="p-2 text-center w-20">Verifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {spkPrintTarget.items && spkPrintTarget.items.length > 0 ? (
                        spkPrintTarget.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center font-mono text-[11px] border-r border-slate-200">{idx + 1}</td>
                            <td className="p-2 font-medium text-slate-800 border-r border-slate-200">
                              <span className="block">{it.serviceName}</span>
                              <span className="text-[10px] text-[#64748B]">Spesifikasi standar operasional dispatch sesuai kontrak</span>
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-[11px] border-r border-slate-200">
                              {it.quantity} {it.uom}
                            </td>
                            <td className="p-2 text-center text-emerald-700 font-semibold text-[11px] border-r border-slate-200">
                              Active Ready
                            </td>
                            <td className="p-2 text-center">
                              <span className="inline-block w-4 h-4 border border-slate-400 rounded-xs"></span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-slate-500 italic">
                            Tidak ada rincian item layanan spesifik.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dispatch Notes / Instruksi Khusus */}
                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded text-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                    Instruksi Khusus & Catatan Lapangan:
                  </span>
                  <p className="text-[11px] text-amber-900 leading-snug">
                    {spkPrintTarget.dispatchNotes ||
                      'Tim wajib hadir di lokasi minimum 60 menit sebelum sesi dimulai. Seluruh perlengkapan wajib diuji coba sebelum acara dan koordinasi berkala dengan PIC Klien.'}
                  </p>
                </div>

                {/* Official Signature Box */}
                <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-slate-300 text-center text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase block">
                      Koordinator Kru Lapangan:
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block">(Penerima Tugas & Pelaksana)</span>
                    <div className="h-12"></div>
                    <span className="font-bold text-xs border-t border-slate-500 px-8 pt-1 inline-block text-[#0F172A]">
                      {spkPrintTarget.assignedCrewLeadName || '(Nama Team Leader)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase block">
                      PIC Klien / Penanggung Jawab Acara:
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block">(Verifikasi Kehadiran & Layanan)</span>
                    <div className="h-12"></div>
                    <span className="font-bold text-xs border-t border-slate-500 px-8 pt-1 inline-block text-[#0F172A]">
                      {spkPrintTarget.customerName}
                    </span>
                  </div>
                </div>

                {/* Document Footer Verification */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-[#94A3B8]">
                  <span>Dokumen sah digital diterbitkan oleh Zyvora ERP Platform</span>
                  <span>Dicetak pada: {new Date().toLocaleDateString('id-ID')} · Halaman 1 dari 1</span>
                </div>
              </div>
            </div>
          </BaseModal>
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: VIEW FULL BOOKING DETAILS                                    */}
      {/* ===================================================================== */}
      {detailTarget && (
        <BaseModal
          isOpen={Boolean(detailTarget)}
          onClose={() => setDetailTarget(null)}
          title={`Booking Details: ${detailTarget.bookingNumber}`}
          description={`Customer: ${detailTarget.customerName} • Event: ${detailTarget.eventDate}`}
          size="lg"
          footer={
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl">
              <div>
                <span className="text-[10px] text-[#64748B] block">Event Title:</span>
                <span className="font-bold text-[#0F172A]">{detailTarget.eventTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Estimated Guests:</span>
                <span className="font-mono font-bold text-[#086288]">{detailTarget.estimatedGuestCount || 0} Pax</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Contract Amount:</span>
                <span className="font-mono font-bold text-[#0F172A]">Rp {detailTarget.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Outstanding Balance:</span>
                <span className="font-mono font-bold text-amber-700">Rp {detailTarget.outstandingBalance.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-[#0F172A] block mb-1.5">Technical Notes:</span>
              <p className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-[#0F172A]">
                {detailTarget.notes || 'No special technical instructions recorded.'}
              </p>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: ADD SERVICE BOOKING TO SCHEDULE (PICKING VERIFIED)           */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <BaseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Service Booking to Schedule"
          description="Schedule service delivery orders that have completed picking verification."
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {addMode === 'queue' ? (
                <button
                  type="button"
                  onClick={handleConfirmQueueAdd}
                  disabled={!selectedQueueBooking}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Picking & Add to Schedule</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmDirectAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create & Add to Schedule</span>
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Mode Switcher */}
            <div className="flex items-center border-b border-[#CBD5E1] pb-2 gap-2">
              <button
                type="button"
                onClick={() => setAddMode('queue')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  addMode === 'queue'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Select From Order Queue</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    addMode === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {unpickedBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAddMode('direct')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  addMode === 'direct'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Direct Schedule Entry</span>
              </button>
            </div>

            {addMode === 'queue' ? (
              /* TAB 1: FROM SALES ORDER QUEUE (PICKING VERIFICATION) */
              unpickedBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-slate-800">All Order Bookings Have Been Picked & Scheduled</p>
                  <p className="text-slate-500 text-[11px]">
                    No unpicked sales orders pending in the queue. You can use <strong>Direct Schedule Entry</strong> to register a new service schedule.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddMode('direct')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] text-white rounded-md font-semibold text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Switch to Direct Entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Order Selector */}
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A] block">
                      Select Sales Order / Booking to Schedule <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedQueueBookingId}
                      onChange={(e) => handleQueueBookingChange(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-medium focus:outline-hidden focus:border-[#086288]"
                    >
                      {unpickedBookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bookingNumber} — {b.customerName} ({b.eventTitle || 'Service Event'}) • {b.eventDate} [{b.status.toUpperCase()}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedQueueBooking && (
                    <>
                      {/* Order Information Snapshot Card */}
                      <div className="p-3 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#086288]">
                            {selectedQueueBooking.eventTitle || 'Service Event'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                            Current: {selectedQueueBooking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569]">
                          <div>
                            Client: <strong className="text-[#0F172A]">{selectedQueueBooking.customerName}</strong> ({selectedQueueBooking.customerPhone})
                          </div>
                          <div>
                            Event Date: <strong className="text-[#0F172A]">{selectedQueueBooking.eventDate}</strong> ({selectedQueueBooking.eventSession})
                          </div>
                          <div className="col-span-2">
                            Venue: <strong className="text-[#0F172A]">{selectedQueueBooking.venueName}</strong> {selectedQueueBooking.venueAddress ? `— ${selectedQueueBooking.venueAddress}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Picking Verification & Dispatch Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#086288]" />
                            <span>Picking Verification Date</span>
                          </label>
                          <input
                            type="date"
                            value={pickingDate}
                            onChange={(e) => setPickingDate(e.target.value)}
                            className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#086288]" />
                            <span>Delivery Order / Picking Slip No</span>
                          </label>
                          <input
                            type="text"
                            value={pickingDoNumber}
                            onChange={(e) => setPickingDoNumber(e.target.value)}
                            placeholder="e.g. DO0120261100001"
                            className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-mono focus:outline-hidden focus:border-[#086288]"
                          />
                        </div>

                        {/* Crew Lead */}
                        <div className="space-y-1">
                          <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#086288]" />
                            <span>Assigned Crew Leader (PIC)</span>
                          </label>
                          <select
                            value={queueCrewLead}
                            onChange={(e) => setQueueCrewLead(e.target.value)}
                            className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                          >
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.fullName}>
                                {emp.fullName} ({emp.position || 'Technician / Crew'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Fleet Vehicle */}
                        <div className="space-y-1">
                          <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-[#086288]" />
                            <span>Assigned Fleet Vehicle</span>
                          </label>
                          <select
                            value={queueVehiclePlate}
                            onChange={(e) => setQueueVehiclePlate(e.target.value)}
                            className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-mono focus:outline-hidden focus:border-[#086288]"
                          >
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.licensePlate}>
                                {v.licensePlate} — {v.brandModel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <label className="font-semibold text-[#0F172A]">Schedule Notes & Logistics Checklist</label>
                        <textarea
                          rows={2}
                          value={queueNotes}
                          onChange={(e) => setQueueNotes(e.target.value)}
                          placeholder="Instruksi tambahan kru dan logistik..."
                          className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                        />
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              /* TAB 2: DIRECT ENTRY */
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Customer Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={directCustName}
                      onChange={(e) => setDirectCustName(e.target.value)}
                      placeholder="e.g. PT Citra Megah Nusantara"
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Customer Phone</label>
                    <input
                      type="text"
                      value={directCustPhone}
                      onChange={(e) => setDirectCustPhone(e.target.value)}
                      placeholder="0812-XXXX-XXXX"
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Operating Branch</label>
                    <select
                      value={directBranchId}
                      onChange={(e) => setDirectBranchId(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    >
                      {branches
                        .filter((b) => b.isActive || b.id === directBranchId)
                        .map((b) => (
                          <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== directBranchId}>
                            {b.code} - {b.name} ({b.city}) {!b.isActive ? ' (Nonaktif)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Service Line (LOB)</label>
                    <select
                      value={directBusinessLine}
                      onChange={(e) => setDirectBusinessLine(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-semibold text-[#086288] focus:outline-hidden focus:border-[#086288]"
                    >
                      <option value="QUEINVITE">Queinvite (Digital System & RSVP)</option>
                      <option value="HIZAKI">Hizaki (Event Coordination & WO)</option>
                      <option value="AURUM">Aurum (Decoration & Staging)</option>
                      <option value="KIMIKO">Kimiko (Receptionists & Protocol)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F172A]">Event Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={directEventTitle}
                    onChange={(e) => setDirectEventTitle(e.target.value)}
                    placeholder="e.g. Annual Gala Dinner & Awarding 2026"
                    className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Schedule Date <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={directEventDate}
                      onChange={(e) => setDirectEventDate(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Time Session</label>
                    <select
                      value={directSession}
                      onChange={(e) => setDirectSession(e.target.value as any)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    >
                      <option value="morning">Morning (08:00 - 12:00)</option>
                      <option value="afternoon">Afternoon (13:00 - 17:00)</option>
                      <option value="evening">Evening (18:00 - 22:00)</option>
                      <option value="full_day">Full Day (All Day Operation)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Venue Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={directVenueName}
                      onChange={(e) => setDirectVenueName(e.target.value)}
                      placeholder="e.g. Grand Ballroom Kempinski"
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Venue Address / City</label>
                    <input
                      type="text"
                      value={directVenueAddress}
                      onChange={(e) => setDirectVenueAddress(e.target.value)}
                      placeholder="e.g. Jl. M.H. Thamrin No. 1, Jakarta Pusat"
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Assigned Crew Leader (PIC)</label>
                    <select
                      value={directCrewLead}
                      onChange={(e) => setDirectCrewLead(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.fullName}>
                          {emp.fullName} ({emp.position || 'Technician / Crew'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Assigned Fleet Vehicle</label>
                    <select
                      value={directVehiclePlate}
                      onChange={(e) => setDirectVehiclePlate(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] font-mono focus:outline-hidden focus:border-[#086288]"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.licensePlate}>
                          {v.licensePlate} — {v.brandModel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F172A]">Notes</label>
                  <textarea
                    rows={2}
                    value={directNotes}
                    onChange={(e) => setDirectNotes(e.target.value)}
                    placeholder="Catatan teknis khusus untuk tim lapangan..."
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                  />
                </div>
              </div>
            )}
          </div>
        </BaseModal>
      )}
    </div>
  );
};
