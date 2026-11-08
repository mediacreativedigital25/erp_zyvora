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
  Copy,
  Check,
  X,
  Search,
  ArrowLeft,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  Percent,
  Compass,
  Gift,
  User,
  Phone,
  Mail,
  Receipt,
  Tag,
  Lock,
  RotateCcw,
  ShieldCheck
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
import { useConfirm } from '../../context/ConfirmContext';
import { CustomerLookupModal } from './CustomerLookupModal';
import { ProductLookupModal, SelectedProductItem } from './ProductLookupModal';
import { BonusLookupModal } from './BonusLookupModal';
import { PromotionLookupModal } from './PromotionLookupModal';
import { validateSalesOrderOrBookingNumber } from '../../domain/validators/erpRules';

interface ServiceBookingCreatePageProps {
  onBack: () => void;
  onSuccess: (booking: ServiceBookingOrder) => void;
  initialBooking?: ServiceBookingOrder | null;
}

// Pre-configured multi-LOB catalogs for Queinvite ecosystem
const BUSINESS_LINES_CONFIG = [
  { id: 'QUEINVITE', name: 'Queinvite Wedding Digital', costCenter: 'CC-QUEINVITE', color: '#086288' },
  { id: 'HIZAKI', name: 'Hizaki Wedding Planner', costCenter: 'CC-LOB-HIZAKI', color: '#0284C7' },
  { id: 'AURUM', name: 'Aurum Deco', costCenter: 'CC-LOB-AURUM', color: '#D97706' },
  { id: 'KIMIKO', name: 'Ki Mi Ko Pager Ayu', costCenter: 'CC-LOB-KIMIKO', color: '#EC4899' }
];

const PREDEFINED_SERVICES = [
  {
    lobId: 'HIZAKI',
    name: 'Full Day Wedding Planning, Rundown & Coordination',
    sku: 'SRV-HIZ-001',
    costCenter: 'CC-LOB-HIZAKI',
    uom: 'Package',
    unitPrice: 35000000,
    desc: 'Comprehensive WO services with 8 field event coordinators and lead planner.'
  },
  {
    lobId: 'HIZAKI',
    name: 'Half Day Holy Matrimony / Akad Coordination',
    sku: 'SRV-HIZ-002',
    costCenter: 'CC-LOB-HIZAKI',
    uom: 'Package',
    unitPrice: 18000000,
    desc: 'Ceremony coordination with 5 field crew, rundown direction, and guest welcoming.'
  },
  {
    lobId: 'AURUM',
    name: 'Grand Floral Stage 14m & Foyer Photo Gallery',
    sku: 'SRV-AUR-001',
    costCenter: 'CC-LOB-AURUM',
    uom: 'Set',
    unitPrice: 45000000,
    desc: 'Premium fresh floral decoration, thematic lighting, photo booth and pathway pergola.'
  },
  {
    lobId: 'AURUM',
    name: 'Rustic Garden Backdrop & Entrance Pergola',
    sku: 'SRV-AUR-002',
    costCenter: 'CC-LOB-AURUM',
    uom: 'Set',
    unitPrice: 22000000,
    desc: 'Botanical foliage, custom calligraphy board, and acoustic stage decoration.'
  },
  {
    lobId: 'QUEINVITE',
    name: 'Digital Web Invitation & RSVP Management Hub',
    sku: 'SRV-QUE-001',
    costCenter: 'CC-QUEINVITE',
    uom: 'Package',
    unitPrice: 2500000,
    desc: 'Luxury responsive web invitation, WhatsApp blast gateway, and digital guestbook.'
  },
  {
    lobId: 'QUEINVITE',
    name: 'QR Check-In Guest System with 4 Thermal Printers',
    sku: 'SRV-QUE-002',
    costCenter: 'CC-QUEINVITE',
    uom: 'Set',
    unitPrice: 7500000,
    desc: 'High-speed QR check-in kiosks, name tag label printing, and real-time attendance dashboard.'
  },
  {
    lobId: 'KIMIKO',
    name: '8 Professional Receptionist Ushers & Traditional Kebaya',
    sku: 'SRV-KIM-001',
    costCenter: 'CC-LOB-KIMIKO',
    uom: 'Person',
    unitPrice: 1500000,
    desc: 'VIP guest assistance, souvenir & angpao booth escort, customized coordinated wardrobe.'
  },
  {
    lobId: 'KIMIKO',
    name: '4 Ushers & Reception Desk Coordination',
    sku: 'SRV-KIM-002',
    costCenter: 'CC-LOB-KIMIKO',
    uom: 'Person',
    unitPrice: 1625000,
    desc: 'Bilingual receptionists for family escort and gift table management.'
  }
];

export const ServiceBookingCreatePage: React.FC<ServiceBookingCreatePageProps> = ({
  onBack,
  onSuccess,
  initialBooking
}) => {
  const {
    customers,
    branches,
    currentUser,
    employees,
    generateServiceBookingNumber,
    generateSalesOrderNumber,
    createServiceBooking,
    updateServiceBooking,
    addToast
  } = useErp();
  const { confirm } = useConfirm();

  const isEditing = Boolean(initialBooking);

  // Check Owner / Super Admin privilege for branch selection
  const isOwner = Boolean(
    currentUser?.role === 'owner' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.isPlatformSuperAdmin
  );

  // Find user's assigned branch for structural staff (under owner)
  const userAssignedBranch = useMemo(() => {
    if (initialBooking?.branchCode) return initialBooking.branchCode;
    if (currentUser?.allowedBranches && currentUser.allowedBranches.length > 0) {
      const match = branches.find(
        (b) =>
          currentUser.allowedBranches.includes(b.code) ||
          currentUser.allowedBranches.includes(b.id)
      );
      if (match) return `${match.code} - ${match.name}`;
    }
    return branches[0] ? `${branches[0].code} - ${branches[0].name}` : 'BR-01 - Jakarta Pusat (Kantor Pusat)';
  }, [branches, currentUser, initialBooking]);

  // Lookup Modals State
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);
  const [customerLookupTarget, setCustomerLookupTarget] = useState<'order' | 'delivery' | 'invoice'>('order');
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [isBonusLookupOpen, setIsBonusLookupOpen] = useState(false);
  const [isPromoLookupOpen, setIsPromoLookupOpen] = useState(false);
  const [activeTargetItemId, setActiveTargetItemId] = useState<string | null>(null);

  // ==========================================
  // LEFT COLUMN FORM STATES (Header Info)
  // ==========================================
  const [bookingNumber, setBookingNumber] = useState('');
  const [bookingDate, setBookingDate] = useState(
    initialBooking?.bookingDate || new Date().toISOString().split('T')[0]
  );
  const [soFormat, setSoFormat] = useState(
    initialBooking?.soFormat || ''
  );
  const [branchCode, setBranchCode] = useState(() => {
    if (initialBooking?.branchCode) return initialBooking.branchCode;
    return isOwner ? '' : userAssignedBranch;
  });
  const [salesPicName, setSalesPicName] = useState(
    initialBooking?.salesPicName || ''
  );

  // Real Sales PIC candidates sourced directly from registered active employees in database
  const salesPicCandidates = useMemo(() => {
    const activeEmps = (employees || []).filter((e) => e.status === 'active');
    return activeEmps.length > 0 ? activeEmps : (employees || []);
  }, [employees]);
  const [orderType, setOrderType] = useState(
    initialBooking?.orderType || ''
  );
  const [isOrderTypeLocked, setIsOrderTypeLocked] = useState<boolean>(
    Boolean(initialBooking?.orderType)
  );

  // Lock Order Type on First Selection (Single Choice Policy)
  const handleOrderTypeChange = (newType: string) => {
    if (isOrderTypeLocked) return;
    if (newType) {
      setOrderType(newType);
      setIsOrderTypeLocked(true);
      addToast(
        'Tipe SO Ditetapkan',
        `Format [${newType}] telah dipilih dan dikunci. Muat ulang proses jika ingin mengganti.`,
        'info'
      );
    }
  };

  // Reset Order Type Process (Requires resetting items for data consistency)
  const handleResetOrderTypeProcess = async () => {
    if (isEditing) {
      addToast(
        'Tipe SO Terkunci',
        'Tipe SO pada dokumen yang telah tersimpan tidak dapat diubah.',
        'warning'
      );
      return;
    }
    const hasItems = items.some((it) => it.serviceName.trim().length > 0);
    if (hasItems) {
      const confirmReset = await confirm({
        title: 'Ulangi Pemilihan Tipe SO?',
        message: 'Mengulangi proses akan mereset pilihan tipe SO dan mengosongkan daftar item yang telah dimasukkan agar format data tetap konsisten.',
        variant: 'warning',
        confirmLabel: 'Ya, Reset Formulir',
        cancelLabel: 'Batal'
      });
      if (!confirmReset) return;
    }
    setOrderType('');
    setIsOrderTypeLocked(false);
    setItems([]);
    addToast('Proses Diulang', 'Silakan pilih kembali Tipe SO yang diinginkan.', 'info');
  };

  // Customer references
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialBooking?.customerId || '');
  const [orderCustomerCode, setOrderCustomerCode] = useState(initialBooking?.customerCode || '');
  const [orderCustomerName, setOrderCustomerName] = useState(initialBooking?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialBooking?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(initialBooking?.customerEmail || '');

  // Delivery / Event Customer
  const [deliveryCustomerCode, setDeliveryCustomerCode] = useState(
    initialBooking?.deliveryCustomerCode || initialBooking?.customerCode || ''
  );
  const [deliveryCustomerName, setDeliveryCustomerName] = useState(
    initialBooking?.deliveryCustomerName || initialBooking?.customerName || ''
  );

  // Invoice Customer
  const [invoiceCustomerCode, setInvoiceCustomerCode] = useState(
    initialBooking?.invoiceCustomerCode || initialBooking?.customerCode || ''
  );
  const [invoiceCustomerName, setInvoiceCustomerName] = useState(
    initialBooking?.invoiceCustomerName || initialBooking?.customerName || ''
  );

  // Delivery / Venue Address & Logistics
  const [eventTitle, setEventTitle] = useState(initialBooking?.eventTitle || '');
  const [venueName, setVenueName] = useState(initialBooking?.venueName || '');
  const [venueCity, setVenueCity] = useState(initialBooking?.venueCity || '');
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialBooking?.deliveryAddress || initialBooking?.venueAddress || ''
  );
  const [distanceFromHqKm, setDistanceFromHqKm] = useState<number | undefined>(
    initialBooking?.distanceFromHqKm
  );
  const [warehouseName, setWarehouseName] = useState(
    initialBooking?.warehouseName || 'WH01 - Central Equipment & Decor Hub Jakarta'
  );
  const [poNumber, setPoNumber] = useState(initialBooking?.poNumber || '');
  const [poDate, setPoDate] = useState(
    initialBooking?.poDate || new Date().toISOString().split('T')[0]
  );
  const [projectNumber, setProjectNumber] = useState(
    initialBooking?.projectNumber || ''
  );
  const [deliveryVia, setDeliveryVia] = useState(
    initialBooking?.deliveryVia || ''
  );
  const [deliveryReason, setDeliveryReason] = useState(
    initialBooking?.deliveryReason || ''
  );
  const [eventSession, setEventSession] = useState<ServiceBookingSession | ''>(
    initialBooking?.eventSession || ''
  );
  const [eventDate, setEventDate] = useState(
    initialBooking?.eventDate || ''
  );

  // ==========================================
  // RIGHT COLUMN FORM STATES
  // ==========================================
  const [invoiceAddress, setInvoiceAddress] = useState(
    initialBooking?.invoiceAddress || ''
  );
  const [priceList, setPriceList] = useState(
    initialBooking?.priceList || 'PL-STD - Standard Price List 2026'
  );
  const [discCustDefault, setDiscCustDefault] = useState<number>(
    initialBooking?.discCustDefault || 0
  );
  const [expiredDate, setExpiredDate] = useState(() => {
    if (initialBooking?.expiredDate) return initialBooking.expiredDate;
    return '';
  });
  const [paymentTermText, setPaymentTermText] = useState(
    initialBooking?.paymentTermText || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'dp_termin' | 'cash' | 'transfer' | 'top'>(
    initialBooking?.paymentMethod || 'dp_termin'
  );
  const [taxCode, setTaxCode] = useState(initialBooking?.taxCode || 'PPN 11%');
  const [taxInclusive, setTaxInclusive] = useState<boolean>(true); // Termasuk PPN 11% by default
  const [ourReference, setOurReference] = useState(
    initialBooking?.ourReference || `REF-ZYV-${new Date().getFullYear()}`
  );
  const [yourReference, setYourReference] = useState(initialBooking?.yourReference || '');
  const [taxRegNumber, setTaxRegNumber] = useState(initialBooking?.taxRegNumber || '');
  const [idCardNumber, setIdCardNumber] = useState(initialBooking?.idCardNumber || '');
  const [remark, setRemark] = useState(initialBooking?.notes || '');
  const [subAccount, setSubAccount] = useState(
    initialBooking?.subAccount || 'Sub Account Wedding'
  );
  const [productType, setProductType] = useState(
    initialBooking?.productType || 'Umum (Tax Include 11%)'
  );
  const [takingOrder, setTakingOrder] = useState(initialBooking?.takingOrder || '');
  const [voucherCode, setVoucherCode] = useState(initialBooking?.voucherCode || '');
  const [voucherAmount, setVoucherAmount] = useState<number>(
    initialBooking?.voucherAmount || 0
  );
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(
    initialBooking?.orderDiscountPercent || 0
  );
  const [estimatedGuestCount, setEstimatedGuestCount] = useState<number>(
    initialBooking?.estimatedGuestCount || 0
  );
  const [tonaseCrew, setTonaseCrew] = useState<number>(
    initialBooking?.tonaseCrew || 0
  );

  // ==========================================
  // DETAIL ORDER: ITEMS (1 INITIAL EMPTY ROW)
  // ==========================================
  const [items, setItems] = useState<ServiceBookingItem[]>(() => {
    if (initialBooking?.items && initialBooking.items.length > 0) {
      return initialBooking.items;
    }
    return [
      {
        id: `item_${Date.now()}`,
        businessLineId: '',
        businessLineName: '',
        costCenterCode: '',
        serviceName: '',
        sku: '',
        description: '',
        quantity: 1,
        uom: '',
        unitPrice: 0,
        discount: 0,
        subtotal: 0
      }
    ];
  });

  // ==========================================
  // PAYMENT MILESTONES
  // ==========================================
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(() => {
    if (initialBooking?.milestones && initialBooking.milestones.length > 0) {
      return initialBooking.milestones;
    }
    return [
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
    ];
  });

  // Initialize Canonical Booking Number if Create Mode
  useEffect(() => {
    if (initialBooking) {
      setBookingNumber(initialBooking.bookingNumber);
      if (initialBooking.orderType) {
        setIsOrderTypeLocked(true);
      }
    } else {
      const generated = generateSalesOrderNumber ? generateSalesOrderNumber() : generateServiceBookingNumber();
      setBookingNumber(generated);
    }
  }, [initialBooking, generateSalesOrderNumber, generateServiceBookingNumber]);

  // Handle Customer Selection from Lookup Modal
  const handleCustomerSelected = (cust: Customer) => {
    if (customerLookupTarget === 'order') {
      setSelectedCustomerId(cust.id);
      setOrderCustomerCode(cust.customerCode);
      setOrderCustomerName(cust.name);
      setCustomerPhone(cust.phone || '');
      setCustomerEmail(cust.email || '');

      // Cascade to delivery and invoice customer if empty
      if (!deliveryCustomerCode) {
        setDeliveryCustomerCode(cust.customerCode);
        setDeliveryCustomerName(cust.name);
      }
      if (!invoiceCustomerCode) {
        setInvoiceCustomerCode(cust.customerCode);
        setInvoiceCustomerName(cust.name);
      }

      // Populate venue / delivery address
      const fullAddr = [
        cust.address,
        cust.village,
        cust.district,
        cust.regency || cust.city,
        cust.province
      ]
        .filter(Boolean)
        .join(', ');

      if (fullAddr) {
        setDeliveryAddress(fullAddr);
        setInvoiceAddress(fullAddr);
      }
      if (cust.city) setVenueCity(cust.city);
      if (cust.venueName) setVenueName(cust.venueName);
      if (cust.eventTitle) setEventTitle(cust.eventTitle);
      if (cust.targetEventDate) setEventDate(cust.targetEventDate);
      if (cust.estimatedGuestCount) setEstimatedGuestCount(cust.estimatedGuestCount);
      if (typeof cust.distanceFromHqKm === 'number') setDistanceFromHqKm(cust.distanceFromHqKm);
      if (cust.npwp) setTaxRegNumber(cust.npwp);

      // Universal Payment Terms Inherited from Customer Master
      if (cust.defaultPaymentMethod) {
        setPaymentMethod(cust.defaultPaymentMethod);
        if (cust.defaultPaymentMethod === 'dp_termin') {
          const dp = cust.defaultDownPaymentPercent || 20;
          const days = cust.paymentTermsDays || 30;
          setPaymentTermText(`DP ${dp}% + Net ${days} Days`);
          applyMilestonePreset(dp);
        } else if (cust.defaultPaymentMethod === 'top') {
          const days = cust.paymentTermsDays || 30;
          setPaymentTermText(`TOP ${days} Days`);
          setMilestones([
            {
              id: 'ms_top',
              milestoneName: `Term of Payment (Net ${days} Days)`,
              percentage: 100,
              amount: calculatedFinancials.netTotal,
              dueDate: '',
              paidAmount: 0,
              status: 'unpaid'
            }
          ]);
        } else {
          setPaymentTermText('Full Cash / 100% Upfront');
          setMilestones([
            {
              id: 'ms_full',
              milestoneName: 'Full Settlement Upon Booking (100%)',
              percentage: 100,
              amount: calculatedFinancials.netTotal,
              dueDate: new Date().toISOString().split('T')[0],
              paidAmount: 0,
              status: 'unpaid'
            }
          ]);
        }
      }
    } else if (customerLookupTarget === 'delivery') {
      setDeliveryCustomerCode(cust.customerCode);
      setDeliveryCustomerName(cust.name);
      const addr = [cust.address, cust.city].filter(Boolean).join(', ');
      if (addr) setDeliveryAddress(addr);
    } else if (customerLookupTarget === 'invoice') {
      setInvoiceCustomerCode(cust.customerCode);
      setInvoiceCustomerName(cust.name);
      const addr = [cust.address, cust.city].filter(Boolean).join(', ');
      if (addr) setInvoiceAddress(addr);
      if (cust.npwp) setTaxRegNumber(cust.npwp);
    }
  };

  const openLookup = (target: 'order' | 'delivery' | 'invoice') => {
    setCustomerLookupTarget(target);
    setIsCustomerLookupOpen(true);
  };

  // ==========================================
  // CALCULATIONS (Summary Strip & Milestones)
  // ==========================================
  const calculatedFinancials = useMemo(() => {
    // 1. Gross Amount (Subtotal)
    const amount = items.reduce(
      (sum, it) => sum + (it.serviceName ? it.quantity * it.unitPrice : 0),
      0
    );

    // 2. Line Discounts (Diskon 1: Harga Coret / Diskon Per Baris Item)
    const lineDisc = items.reduce(
      (sum, it) => sum + (it.serviceName ? it.discount || 0 : 0),
      0
    );

    // 3. Subtotal after line discount
    const subtotalAfterLineDisc = Math.max(0, amount - lineDisc);

    // 4. Order Discount (Global %)
    const orderDiscValue =
      orderDiscountPercent > 0
        ? Math.round((subtotalAfterLineDisc * orderDiscountPercent) / 100)
        : 0;

    // 5. Net base after order discount and voucher (Diskon 2)
    const baseBeforeTax = Math.max(0, subtotalAfterLineDisc - orderDiscValue - voucherAmount);

    // 6. Tax calculation (PPN 11%)
    let taxAmount = 0;
    let netTotal = baseBeforeTax;

    if (baseBeforeTax > 0) {
      if (taxInclusive) {
        // Termasuk PPN 11%: PPN portion is 11/111 * baseBeforeTax
        taxAmount = Math.round((baseBeforeTax * 11) / 111);
        netTotal = baseBeforeTax;
      } else {
        // Belum Termasuk PPN 11%: PPN added to total
        taxAmount = Math.round(baseBeforeTax * 0.11);
        netTotal = baseBeforeTax + taxAmount;
      }
    }

    return {
      amount,
      lineDisc,
      orderDiscValue,
      voucher: voucherAmount,
      orderAmount: baseBeforeTax,
      taxAmount,
      netTotal,
      cubicationPax: estimatedGuestCount,
      tonaseCrew,
      numberOfUnits: items.filter((it) => Boolean(it.serviceName)).length
    };
  }, [items, orderDiscountPercent, voucherAmount, taxInclusive, estimatedGuestCount, tonaseCrew]);

  // Product modal allowed type based on SO Format
  const productModalAllowedType: 'all' | 'service' | 'physical' = useMemo(() => {
    if (orderType === 'Service') return 'service';
    if (orderType === 'Goods') return 'physical';
    return 'all';
  }, [orderType]);

  // Rebalance milestones whenever Net Total changes
  useEffect(() => {
    const net = calculatedFinancials.netTotal;
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        amount: Math.round((net * ms.percentage) / 100)
      }))
    );
  }, [calculatedFinancials.netTotal]);

  const applyMilestonePreset = (dpPercent: number) => {
    const remaining = 100 - dpPercent;
    const split2 = Math.round(remaining / 2);
    const split3 = remaining - split2;

    const net = calculatedFinancials.netTotal;
    setMilestones([
      {
        id: 'ms_1',
        milestoneName: `Down Payment (DP ${dpPercent}%)`,
        percentage: dpPercent,
        amount: Math.round((net * dpPercent) / 100),
        dueDate: new Date().toISOString().split('T')[0],
        paidAmount: 0,
        status: 'unpaid'
      },
      {
        id: 'ms_2',
        milestoneName: `Technical Preparation (${split2}%)`,
        percentage: split2,
        amount: Math.round((net * split2) / 100),
        dueDate: '',
        paidAmount: 0,
        status: 'unpaid'
      },
      {
        id: 'ms_3',
        milestoneName: `Final Settlement Before Event (${split3}%)`,
        percentage: split3,
        amount: Math.round((net * split3) / 100),
        dueDate: '',
        paidAmount: 0,
        status: 'unpaid'
      }
    ]);
  };

  // Select Product from ProductLookupModal
  const handleProductSelected = (selected: SelectedProductItem) => {
    const qty = selected.quantity || 1;
    const price = selected.unitPrice || 0;
    const sub = price * qty;

    const populatedItem: ServiceBookingItem = {
      id: activeTargetItemId || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessLineId: selected.businessLineId || 'HIZAKI',
      businessLineName:
        selected.businessLineName ||
        BUSINESS_LINES_CONFIG.find((b) => b.id === selected.businessLineId)?.name ||
        'Hizaki Wedding Planner',
      costCenterCode: selected.costCenterCode || 'CC-LOB-HIZAKI',
      serviceName: selected.name,
      sku: selected.sku,
      description: selected.description || '',
      quantity: qty,
      uom: selected.uom || 'Unit',
      unitPrice: price,
      discount: 0,
      subtotal: sub
    };

    setItems((prev) => {
      if (activeTargetItemId) {
        return prev.map((it) => (it.id === activeTargetItemId ? populatedItem : it));
      }
      if (prev.length === 1 && !prev[0].serviceName) {
        return [populatedItem];
      }
      return [...prev, populatedItem];
    });

    setActiveTargetItemId(null);
    addToast('Produk Ditambahkan', `[${selected.name}] berhasil dimasukkan ke tabel.`, 'success');
  };

  // Bonus selection from BonusLookupModal
  const handleBonusSelected = (bonus: SelectedProductItem) => {
    const bonusItem: ServiceBookingItem = {
      id: `item_${Date.now()}_bonus`,
      businessLineId: bonus.businessLineId || 'INVENTORY',
      businessLineName: bonus.businessLineName || 'Zyvora Inventory',
      costCenterCode: bonus.costCenterCode || 'CC-INVENTORY-DEFAULT',
      serviceName: bonus.name,
      sku: bonus.sku,
      description: bonus.description || 'Program Bonus / Hadiah Promosi',
      quantity: 1,
      uom: bonus.uom || 'Set',
      unitPrice: 0,
      discount: 0,
      subtotal: 0,
      isBonus: true
    };

    setItems((prev) => {
      if (prev.length === 1 && !prev[0].serviceName) {
        return [bonusItem];
      }
      return [...prev, bonusItem];
    });

    addToast('Bonus Dipasangkan', `[${bonus.name}] berhasil dipasangkan (Rp 0).`, 'success');
  };

  // Promotion / Voucher apply handler
  const handleApplyPromotion = (promo: {
    code: string;
    name: string;
    discountAmount: number;
  }) => {
    setVoucherCode(promo.code);
    setVoucherAmount(promo.discountAmount);
    addToast(
      'Voucher Dipasangkan',
      `Kupon [${promo.code}] memotong Rp ${promo.discountAmount.toLocaleString('id-ID')}`,
      'success'
    );
  };

  const handleResetVoucher = () => {
    setVoucherCode('');
    setVoucherAmount(0);
    addToast('Voucher Direset', 'Kupon promosi telah dihapus.', 'info');
  };

  // Update Item Property
  const handleItemChange = (id: string, field: keyof ServiceBookingItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // Recalculate subtotal
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discount) || 0;
        updated.subtotal = Math.max(0, qty * price - disc);

        return updated;
      })
    );
  };

  // Duplicate Item
  const handleDuplicateItem = (item: ServiceBookingItem) => {
    if (!item.serviceName) return;
    const copy: ServiceBookingItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      serviceName: `${item.serviceName} (Copy)`
    };
    setItems((prev) => [...prev, copy]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      // Reset to 1 empty row instead of leaving 0 rows
      setItems([
        {
          id: `item_${Date.now()}`,
          businessLineId: '',
          businessLineName: '',
          costCenterCode: '',
          serviceName: '',
          sku: '',
          description: '',
          quantity: 1,
          uom: '',
          unitPrice: 0,
          discount: 0,
          subtotal: 0
        }
      ]);
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Submit Handler
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!branchCode.trim()) {
      addToast('Cabang Wajib Dipilih', 'Silakan pilih Cabang / Unit Bisnis.', 'error');
      return;
    }

    if (!salesPicName.trim()) {
      addToast('Sales PIC Wajib Dipilih', 'Silakan pilih Sales / PIC penanggung jawab.', 'error');
      return;
    }

    if (!orderType.trim()) {
      addToast(
        'Tipe SO Wajib Dipilih',
        'Silakan pilih Tipe SO (Normal SO, Service, atau Goods).',
        'error'
      );
      return;
    }

    if (!orderCustomerName.trim()) {
      addToast('Pelanggan Wajib Dipilih', 'Silakan pilih Pelanggan / Mitra.', 'error');
      openLookup('order');
      return;
    }

    const validItems = items.filter((it) => it.serviceName.trim().length > 0);
    if (validItems.length === 0) {
      addToast(
        'Produk / Jasa Wajib Dipilih',
        'Silakan pilih minimal satu produk atau layanan jasa dari popup.',
        'error'
      );
      return;
    }

    const numValidation = validateSalesOrderOrBookingNumber(bookingNumber);
    if (!numValidation.isValid) {
      addToast(
        'Nomor Dokumen Tidak Valid',
        numValidation.error || 'Format nomor Sales Order tidak valid.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const safeCustomer = orderCustomerName && orderCustomerName.trim() ? orderCustomerName.trim() : 'Pelanggan Umum';
      const safeDate = bookingDate && bookingDate.trim() ? bookingDate.trim() : new Date().toISOString().split('T')[0];
      const safeTitle = eventTitle && eventTitle.trim() ? eventTitle.trim() : `Pesanan ${safeCustomer}`;
      const safeEvDate = eventDate && eventDate.trim() ? eventDate.trim() : safeDate;

      const payload: Partial<ServiceBookingOrder> = {
        bookingNumber,
        bookingDate: safeDate,
        customerId: selectedCustomerId || 'cust_temp',
        customerCode: orderCustomerCode || 'CUST',
        customerName: safeCustomer,
        customerPhone,
        customerEmail,
        eventTitle: safeTitle,
        eventDate: safeEvDate,
        eventSession: (eventSession as ServiceBookingSession) || 'full_day',
        venueName: venueName || 'Venue TBD',
        venueAddress: deliveryAddress,
        venueCity,
        distanceFromHqKm,
        estimatedGuestCount,
        items,
        milestones,
        paymentMethod,
        subtotal: calculatedFinancials.amount,
        discountTotal: calculatedFinancials.lineDisc + calculatedFinancials.orderDiscValue,
        taxAmount: calculatedFinancials.taxAmount,
        totalAmount: calculatedFinancials.netTotal,
        paidAmount: initialBooking?.paidAmount || 0,
        outstandingBalance:
          calculatedFinancials.netTotal - (initialBooking?.paidAmount || 0),
        status: initialBooking ? initialBooking.status : ('open' as ServiceBookingStatus),
        salesPicName,
        notes: remark,

        // Enterprise MEDIST 4.0 Standard Fields
        soFormat,
        branchCode,
        branchName: branchCode,
        orderType,
        deliveryCustomerCode,
        deliveryCustomerName,
        deliveryAddress,
        invoiceCustomerCode,
        invoiceCustomerName,
        invoiceAddress,
        warehouseName,
        poNumber,
        poDate,
        projectNumber,
        deliveryVia,
        deliveryReason,
        priceList,
        discCustDefault,
        expiredDate,
        paymentTermText,
        taxCode,
        ourReference,
        yourReference,
        taxRegNumber,
        idCardNumber,
        subAccount,
        productType,
        takingOrder,
        voucherCode,
        voucherAmount,
        orderDiscountPercent,
        orderDiscountAmount: calculatedFinancials.orderDiscValue,
        cubicationPax: estimatedGuestCount,
        tonaseCrew,
        unitCount: items.length
      };

      if (isEditing && initialBooking) {
        const updated = await updateServiceBooking(initialBooking.id, payload);
        addToast(
          'Sales Order Updated',
          `Sales Order [${bookingNumber}] has been saved successfully.`,
          'success'
        );
        onSuccess(updated);
      } else {
        const created = await createServiceBooking({
          ...payload,
          preferredBookingNumber: bookingNumber
        } as any);
        addToast(
          'Sales Order Created',
          `New Sales Order [${created.bookingNumber}] created with status OPEN.`,
          'success'
        );
        onSuccess(created);
      }
    } catch (err: any) {
      addToast('Error Saving Order', err.message || 'An error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ============================================================ */}
        {/* 1. TOP FORM: INFORMASI DOKUMEN & PELANGGAN (PAPER.ID CONCEPT) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ---------------------------------------------------- */}
          {/* LEFT CARD: INFORMASI PESANAN & OPERASIONAL           */}
          {/* ---------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-[#DCE5EC] shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Informasi Pesanan & Operasional
                  </h2>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold">
                {bookingNumber}
              </span>
            </div>

            <div className="space-y-4">
              {/* No. Pesanan & Tanggal Pesanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs flex items-center justify-between">
                    <span>No. Order Penjualan</span>
                    <span className="text-[10px] text-[#64748B] font-normal flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Otomatis / Read-only
                    </span>
                  </label>
                  <input
                    type="text"
                    value={bookingNumber}
                    readOnly
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] cursor-not-allowed select-all"
                    title="Nomor kanonikal otomatis"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                    Tanggal Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>
              </div>

              {/* Cabang & Penanggung Jawab (Sales PIC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                    Cabang / Unit Bisnis <span className="text-red-500">*</span>
                  </label>
                  {isOwner ? (
                    <select
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Cabang / Unit Bisnis --
                      </option>
                      {branches
                        .filter((b) => b.isActive)
                        .map((b) => (
                          <option key={b.id} value={`${b.code} - ${b.name}`}>
                            {b.code} - {b.name} ({b.city})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-semibold text-[#475569]">
                      <Lock className="w-3.5 h-3.5 text-[#086288] shrink-0" />
                      <span className="truncate">{userAssignedBranch}</span>
                      <span className="text-[10px] text-[#64748B] ml-auto shrink-0 font-normal">
                        Terkunci
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                    Sales / PIC <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={salesPicName}
                    onChange={(e) => setSalesPicName(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                  >
                    <option value="" disabled>
                      {salesPicCandidates.length > 0
                        ? `-- Pilih Sales / PIC (${salesPicCandidates.length} Karyawan Terdaftar) --`
                        : '-- Belum ada Sales PIC terdaftar di HR --'}
                    </option>
                    {salesPicCandidates.map((emp) => {
                      const displayTitle = `${emp.fullName} (${emp.position || 'Sales PIC'})`;
                      return (
                        <option key={emp.id} value={displayTitle}>
                          {displayTitle}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Tipe Pesanan & No. Referensi PO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-[#0F172A] text-xs">
                      Tipe SO (Format) <span className="text-red-500">*</span>
                    </label>
                    {isOrderTypeLocked && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Terkunci (1x Pilih)
                      </span>
                    )}
                  </div>
                  <select
                    value={orderType}
                    disabled={isOrderTypeLocked}
                    onChange={(e) => handleOrderTypeChange(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-all ${
                      isOrderTypeLocked
                        ? 'bg-[#F8FAFC] border-[#DCE5EC] text-[#086288] cursor-not-allowed opacity-90'
                        : 'bg-white border-[#DCE5EC] text-[#086288] focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer'
                    }`}
                  >
                    <option value="" disabled>
                      -- Pilih Tipe SO --
                    </option>
                    <option value="Normal SO">Normal SO (Goods & Services)</option>
                    <option value="Service">Service (Jasa & Layanan Acara)</option>
                    <option value="Goods">Goods (Barang Fisik Inventory)</option>
                  </select>
                  {isOrderTypeLocked ? (
                    <div className="flex items-center justify-between mt-1 text-[10px] text-[#64748B]">
                      <span>Tipe terkunci. Jika ingin mengganti, ulangi proses.</span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={handleResetOrderTypeProcess}
                          className="text-[#086288] hover:underline font-semibold ml-2 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Ulangi Proses
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Pilihan hanya berlaku 1 kali. Pastikan tipe sesuai sebelum memilih.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                    No. Referensi PO / Kontrak (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PO-2026/X/089"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>
              </div>

              {/* Sub-Card: Detail Acara & Operasional (Hanya tampil jika Tipe SO = Service) */}
              {orderType === 'Service' && (
                <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-xl p-4 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#086288] uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Spesifikasi Acara / Proyek
                    </span>
                    {typeof distanceFromHqKm === 'number' && distanceFromHqKm > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                        <Compass className="w-2.5 h-2.5" /> ±{distanceFromHqKm.toFixed(1)} km dari HQ
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                      Nama Acara / Proyek
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: The Wedding of Sarah & Aditya"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                        Tanggal Pelaksanaan
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                        Sesi Waktu
                      </label>
                      <select
                        value={eventSession}
                        onChange={(e) => setEventSession(e.target.value as ServiceBookingSession)}
                        className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                      >
                        <option value="" disabled>
                          -- Pilih Sesi Acara --
                        </option>
                        <option value="morning">Morning (Akad/Pemberkatan)</option>
                        <option value="afternoon">Afternoon Session</option>
                        <option value="evening">Evening (Resepsi Malam)</option>
                        <option value="full_day">Full Day (Seharian)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                        Estimasi Tamu (Pax)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Contoh: 500"
                        value={estimatedGuestCount || ''}
                        onChange={(e) => setEstimatedGuestCount(Number(e.target.value))}
                        className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                        Nama Venue / Gedung
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Grand Ballroom Hotel Mulia"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                        Alamat / Kota Venue
                      </label>
                      <input
                        type="text"
                        placeholder="Alamat lengkap lokasi acara..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT CARD: INFORMASI PELANGGAN & PENAGIHAN          */}
          {/* ---------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-[#DCE5EC] shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Informasi Pelanggan & Penagihan
                  </h2>
                </div>
              </div>
              {orderCustomerName ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {orderCustomerCode || 'CUST'}
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#64748B]">
                  Wajib Dipilih
                </span>
              )}
            </div>

            {/* Customer Information Section (Compact 1-Field Selector & Smart Reveal) */}
            <div className="space-y-4">
              {orderCustomerName ? (
                /* State 2: Terpilih (Smart Reveal Contact Card) */
                <div className="p-4 bg-[#EFF7FA]/60 border border-[#B7DDEA] rounded-xl space-y-3 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#086288] text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                        {orderCustomerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0F172A]">{orderCustomerName}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white border border-[#B7DDEA] text-[#086288] rounded">
                            {orderCustomerCode || 'CUST'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">Pelanggan Terpilih</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openLookup('order')}
                      className="text-xs text-[#086288] hover:text-[#064B6A] hover:underline font-semibold cursor-pointer"
                    >
                      Ganti Mitra
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#475569] pt-2 border-t border-[#B7DDEA]/50">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#086288] shrink-0" />
                      <span className="truncate">{customerPhone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#086288] shrink-0" />
                      <span className="truncate">{customerEmail || '-'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs flex items-center justify-between">
                      <span>Alamat Penagihan & Faktur</span>
                      <span className="text-[10px] text-[#64748B] font-normal flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Sesuai Master Pelanggan
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      readOnly
                      value={invoiceAddress}
                      className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#475569] cursor-not-allowed select-all"
                      title="Alamat penagihan terkunci sesuai data master pelanggan"
                    />
                  </div>
                </div>
              ) : (
                /* State 1: Belum Memilih (Cukup 1 Field Ramping h-9) */
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                    Pilih Pelanggan / Mitra <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => openLookup('order')}
                    className="w-full h-9 bg-white border border-[#DCE5EC] hover:border-[#086288] rounded-lg px-3 py-2 text-xs text-[#94A3B8] flex items-center justify-between cursor-pointer transition-colors group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Search className="w-3.5 h-3.5 text-[#086288] shrink-0" />
                      <span className="group-hover:text-[#086288] transition-colors truncate">
                        Pilih pelanggan dari master data...
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2.5 py-0.5 rounded shrink-0">
                      Cari Mitra
                    </span>
                  </div>
                </div>
              )}

              {/* Syarat Pembayaran (Payment Terms) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#0F172A] text-xs flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#086288]" /> Syarat Pembayaran (Terms)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermText('DP 20% + Net 30');
                        applyMilestonePreset(20);
                      }}
                      className="px-2.5 py-1 bg-[#EFF7FA] hover:bg-[#D5EBF3] text-[#086288] border border-[#B7DDEA] text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      DP 20%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermText('DP 50% + 50%');
                        applyMilestonePreset(50);
                      }}
                      className="px-2.5 py-1 bg-[#EFF7FA] hover:bg-[#D5EBF3] text-[#086288] border border-[#B7DDEA] text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      DP 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermText('Full Payment (100%)');
                        setMilestones([
                          {
                            id: 'ms_full',
                            milestoneName: 'Pelunasan Penuh (100%)',
                            percentage: 100,
                            amount: calculatedFinancials.netTotal,
                            dueDate: bookingDate,
                            paidAmount: 0,
                            status: 'unpaid'
                          }
                        ]);
                      }}
                      className="px-2.5 py-1 bg-[#EFF7FA] hover:bg-[#D5EBF3] text-[#086288] border border-[#B7DDEA] text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      100% Cash
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={paymentTermText}
                    onChange={(e) => setPaymentTermText(e.target.value)}
                    placeholder="Contoh: DP 20% + Net 30"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-semibold text-[#086288] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                  <input
                    type="date"
                    value={expiredDate}
                    onChange={(e) => setExpiredDate(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                    title="Kadaluarsa Penawaran / Jatuh Tempo"
                  />
                </div>
              </div>

              {/* NPWP / NIK Pelanggan */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                  NPWP / NIK Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Nomor NPWP / NIK resmi pelanggan..."
                  value={taxRegNumber}
                  onChange={(e) => setTaxRegNumber(e.target.value)}
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. DETAIL ORDER: TABEL PRODUK/JASA & SUMMARY (PAPER.ID)      */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-[#DCE5EC] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DCE5EC]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Rincian Produk & Layanan Jasa
                </h2>
                <span className="text-xs text-[#64748B]">
                  ({items.filter((it) => Boolean(it.serviceName)).length} item)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] hidden sm:inline">Multi-LOB:</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-[#086288] border border-cyan-200">
                Queinvite
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                Hizaki
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Aurum
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200">
                Kimiko
              </span>
            </div>
          </div>

          {/* Line Items Table (Strict Master Governance) */}
          <div className="border border-[#CBD5E1] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-bold">
                <tr>
                  <th className="py-2.5 px-2 text-center w-12">No</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Nama Barang / Jasa</th>
                  <th className="py-2.5 px-2 w-32">LOB / Bisnis</th>
                  <th className="py-2.5 px-2 text-center w-20">QTY</th>
                  <th className="py-2.5 px-2 text-center w-24">Satuan</th>
                  <th className="py-2.5 px-2 text-right min-w-[120px]">Harga Satuan (Rp)</th>
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Diskon (Rp)</th>
                  <th className="py-2.5 px-3 text-right min-w-[130px]">Subtotal (Rp)</th>
                  <th className="py-2.5 px-2 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#EFF7FA]/40 transition-colors ${
                      item.isBonus ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* No */}
                    <td className="py-2.5 px-2 text-center text-[#64748B] font-mono font-semibold">
                      {idx + 1}
                    </td>

                    {/* Nama Barang / Jasa */}
                    <td className="py-2.5 px-3">
                      {item.serviceName ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-[#0F172A]">
                            {item.serviceName}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.sku && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#F1F5F9] text-[#64748B] rounded border border-[#E2E8F0]">
                                {item.sku}
                              </span>
                            )}
                            {item.isBonus && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded uppercase">
                                ★ Bonus Program
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!orderType) {
                              addToast(
                                'Pilih Tipe SO',
                                'Silakan tentukan Tipe SO (Normal SO, Service, atau Goods) terlebih dahulu.',
                                'warning'
                              );
                              return;
                            }
                            setActiveTargetItemId(item.id);
                            setIsProductLookupOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF7FA] hover:bg-[#D5EBF3] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Pilih Produk / Jasa
                        </button>
                      )}
                    </td>

                    {/* LOB / Bisnis (Read Only) */}
                    <td className="py-2.5 px-2">
                      {item.businessLineId ? (
                        <span className="text-[11px] font-semibold text-[#086288] px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 block text-center">
                          {item.businessLineId}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] text-center block">-</span>
                      )}
                    </td>

                    {/* QTY */}
                    <td className="py-2.5 px-2 text-center">
                      {item.serviceName ? (
                        <input
                          type="number"
                          min="1"
                          disabled={Boolean(item.isBonus)}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 bg-white border border-[#DCE5EC] rounded-lg text-xs font-semibold text-center text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      ) : (
                        <span className="text-[#94A3B8]">1</span>
                      )}
                    </td>

                    {/* Satuan (Read Only) */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[11px] font-semibold text-[#475569]">
                        {item.uom || '-'}
                      </span>
                    </td>

                    {/* Harga Satuan (Read Only) */}
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-mono text-xs text-[#0F172A]">
                        {item.serviceName
                          ? `Rp ${item.unitPrice.toLocaleString('id-ID')}`
                          : 'Rp 0'}
                      </span>
                    </td>

                    {/* Diskon Baris (Diskon 1) */}
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-mono text-xs text-[#64748B]">
                        {item.discount
                          ? `Rp ${item.discount.toLocaleString('id-ID')}`
                          : 'Rp 0'}
                      </span>
                    </td>

                    {/* Subtotal */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#086288]">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </td>

                    {/* Aksi */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-[#64748B] hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Toolbar: Add Product & Bonus Buttons (NO TAMBAH BARIS MANUAL & NO PAKET CEPAT) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!orderType) {
                    addToast(
                      'Pilih Tipe SO',
                      'Silakan tentukan Tipe SO (Normal SO, Service, atau Goods) terlebih dahulu.',
                      'warning'
                    );
                    return;
                  }
                  setActiveTargetItemId(null);
                  setIsProductLookupOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Produk / Jasa
              </button>

              <button
                type="button"
                onClick={() => setIsBonusLookupOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Gift className="w-4 h-4" /> Bonus / Complimentary
              </button>
            </div>

            <div className="text-xs text-[#64748B]">
              Tipe Katalog Aktif:{' '}
              <strong className="text-[#086288] font-bold">{orderType || 'Belum Dipilih'}</strong>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 4. BOTTOM 2-COLUMN SUMMARY (PAPER.ID LAYOUT)                 */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-[#DCE5EC]">
            {/* ---------------------------------------------------- */}
            {/* LEFT COLUMN: CATATAN & KETERANGAN TRANSAKSI          */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5 text-xs">
                  Catatan Pesanan & Keterangan Khusus
                </label>
                <textarea
                  rows={5}
                  placeholder="Masukkan catatan untuk klien, instruksi pengiriman, spesifikasi pesanan, atau syarat khusus transaksi..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                />
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT COLUMN: PERHITUNGAN FINANSIAL (BOTTOM-RIGHT)   */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-2.5 bg-[#F8FAFC] p-4 rounded-xl border border-[#DCE5EC] text-xs">
              <h3 className="text-xs font-bold text-[#086288] uppercase tracking-wider pb-1.5 border-b border-[#DCE5EC]">
                Ringkasan Finansial
              </h3>

              {/* Subtotal Kotor */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[#64748B] font-semibold">Subtotal (Total Kotor)</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  Rp {calculatedFinancials.amount.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Diskon 1: Harga Coret / Diskon Per Baris */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[#64748B] font-semibold">
                  Diskon 1 (Harga Coret)
                </span>
                <span className="font-mono font-semibold text-rose-600">
                  {calculatedFinancials.lineDisc > 0
                    ? `- Rp ${calculatedFinancials.lineDisc.toLocaleString('id-ID')}`
                    : 'Rp 0'}
                </span>
              </div>

              {/* Diskon 2: Diskon Program Resmi / Voucher dengan Tombol Loupe */}
              <div className="flex items-center justify-between py-1 border-t border-dashed border-[#DCE5EC]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#64748B] font-semibold">Diskon 2 (Voucher)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Kode Kupon"
                      value={voucherCode}
                      readOnly
                      className="w-28 px-2 py-1 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#086288] uppercase focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPromoLookupOpen(true)}
                      className="w-8 h-8 flex items-center justify-center bg-[#086288] hover:bg-[#064B6A] text-white rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                      title="Pilih Program Promosi & Voucher Resmi"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    {voucherCode && (
                      <button
                        type="button"
                        onClick={handleResetVoucher}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus Voucher"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <span className="font-mono text-rose-600 font-semibold">
                  {voucherAmount > 0
                    ? `- Rp ${voucherAmount.toLocaleString('id-ID')}`
                    : 'Rp 0'}
                </span>
              </div>

              {/* Pajak Produk (PPN 11%) - Terintegrasi Langsung */}
              <div className="flex items-center justify-between py-1 border-t border-dashed border-[#DCE5EC]">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] font-semibold">Pajak (PPN 11%)</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="taxInclusiveOption"
                        checked={taxInclusive}
                        onChange={() => setTaxInclusive(true)}
                        className="text-[#086288] focus:ring-[#086288]"
                      />
                      <span>Termasuk</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="taxInclusiveOption"
                        checked={!taxInclusive}
                        onChange={() => setTaxInclusive(false)}
                        className="text-[#086288] focus:ring-[#086288]"
                      />
                      <span>Belum Termasuk</span>
                    </label>
                  </div>
                </div>
                <span className="font-mono text-[#64748B] font-semibold">
                  Rp {calculatedFinancials.taxAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {/* TOTAL AKHIR (NET TOTAL) - KOTAK RAMPING / COMPACT */}
              <div className="bg-[#086288] text-white px-3.5 py-2.5 rounded-xl shadow-2xs mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Total Akhir
                  </span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                    IDR (Rp)
                  </span>
                </div>
                <div className="text-base font-bold font-mono tracking-tight">
                  Rp {calculatedFinancials.netTotal.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>

          {/* 3.5 Bottom Form Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[#DCE5EC]">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span>
                Menyimpan pesanan ini akan menerbitkan Dokumen{' '}
                <strong className="text-[#086288] font-mono">{bookingNumber}</strong> berstatus{' '}
                <strong className="text-sky-700 font-semibold">OPEN</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Order Penjualan'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Reusable Customer Lookup Modal */}
      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        onSelectCustomer={handleCustomerSelected}
        title={
          customerLookupTarget === 'order'
            ? 'Select Order Customer'
            : customerLookupTarget === 'delivery'
            ? 'Select Delivery / Event Contact'
            : 'Select Billing / Invoice Customer'
        }
      />

      {/* Reusable Product & Service Lookup Modal */}
      <ProductLookupModal
        isOpen={isProductLookupOpen}
        onClose={() => {
          setIsProductLookupOpen(false);
          setActiveTargetItemId(null);
        }}
        onSelectProduct={handleProductSelected}
        allowedType={productModalAllowedType}
      />

      {/* Reusable Bonus Lookup Modal */}
      <BonusLookupModal
        isOpen={isBonusLookupOpen}
        onClose={() => setIsBonusLookupOpen(false)}
        onSelectBonus={handleBonusSelected}
      />

      {/* Reusable Promotion & Voucher Lookup Modal */}
      <PromotionLookupModal
        isOpen={isPromoLookupOpen}
        onClose={() => setIsPromoLookupOpen(false)}
        currentSubtotal={calculatedFinancials.amount}
        onApplyPromotion={handleApplyPromotion}
      />
    </div>
  );
};
