// Official 5 Roles per PO Specification (Phase 1 & Phase 3)
export type OfficialRole = 'super_admin' | 'owner' | 'admin' | 'sales' | 'customer';

// Expanded TenantRole covering official roles + backward-compatible legacy roles
export type TenantRole =
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'sales'
  | 'customer'
  | 'tenant_admin'
  | 'branch_manager'
  | 'accountant'
  | 'inventory_staff'
  | 'sales_rep';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  slug: string;
  plan: 'enterprise' | 'growth' | 'starter';
  tenantNumber?: string; // 3-digit tenant sequence for document numbering (e.g. '001', '002', '003')
  createdAt: string;
  status: 'active' | 'suspended';
  // Legal profile & address hierarchy
  address?: string;
  provinceId?: string;
  provinceName?: string;
  regencyId?: string;
  regencyName?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  website?: string;
  description?: string;
}

export interface BusinessUnit {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  taxId: string;
  currency: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  businessUnitId: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isHeadquarters: boolean;
  codeSuffix?: string; // Suffix for branch document numbering: '' for HQ, 'A', 'B', 'C' for branches
  isActive: boolean;
  country?: string;
  provinceId?: string;
  provinceName?: string;
  regencyId?: string;
  regencyName?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  postalCode?: string;
}

export interface Warehouse {
  id: string;
  branchId: string;
  code: string;
  name: string;
  type: 'central' | 'retail' | 'transit' | 'returns';
  address: string;
  capacityM2: number;
  isActive: boolean;
  country?: string;
  provinceId?: string;
  provinceName?: string;
  regencyId?: string;
  regencyName?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  postalCode?: string;
}

export interface UserProfile {
  id: string; // Auth UUID
  userCode: string; // 2-3 alphanumeric uppercase (e.g. '1A', '1A1', '1BZ')
  email: string;
  fullName: string;
  role: TenantRole;
  roleTitle: string;
  isPlatformSuperAdmin?: boolean; // Dedicated Platform Super Admin flag
  status: 'active' | 'inactive' | 'invited';
  avatarUrl?: string;
  tenantId: string;
  tenantName?: string;
  allowedBusinessUnits: string[];
  allowedBranches: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface PlatformSuperAdmin {
  id: string;
  userId: string;
  userCode: string;
  email: string;
  fullName: string;
  grantedAt: string;
  grantedBy?: string;
  isActive: boolean;
  notes?: string;
}

export interface RoleChangeAudit {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetUserId: string;
  targetUserCode: string;
  targetUserName: string;
  tenantId?: string;
  previousRole: string;
  newRole: string;
  reason: string;
  timestamp: string;
  success: boolean;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'EXPORT' | 'LOGIN';
  entity: 'SalesOrder' | 'PurchaseOrder' | 'StockMovement' | 'JournalEntry' | 'Customer' | 'Settings' | 'ReceivePayment' | 'SalesInvoice';
  entityId: string;
  description: string;
  ipAddress: string;
}

export type CustomerType = 'general' | 'corporate' | 'booking';

export interface Customer {
  id: string;
  tenantId: string;
  customerCode: string; // Exactly 5 chars uppercase alphanumeric (e.g. "K9X2B") or formatted code
  customerType?: CustomerType; // 'general' | 'corporate' | 'booking'
  name: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  creditLimit: number;
  totalOrders: number;
  outstandingBalance: number;
  createdAt: string;
  status: 'active' | 'inactive';
  paymentTerms?: string;
  npwp?: string;

  // Full Indonesian Administrative Address
  address?: string;
  rt?: string;
  rw?: string;
  province?: string;
  provinceId?: string;
  regency?: string;
  regencyId?: string;
  district?: string;
  districtId?: string;
  village?: string;
  villageId?: string;
  postalCode?: string;
  country?: string;

  // Geolocation Coordinates & Headquarters Distance
  latitude?: number;
  longitude?: number;
  distanceFromHqKm?: number;

  // Universal Payment & Commercial Terms (Single Source of Truth)
  defaultPaymentMethod?: 'dp_termin' | 'cash' | 'transfer' | 'top';
  defaultDownPaymentPercent?: number; // e.g. 20, 30, 50 (%)
  paymentTermsDays?: number; // e.g. 0, 14, 30, 60 (days)
  bankName?: string;
  bankAccountNumber?: string;

  // Event & Service Booking Specifications (Conditional)
  eventTitle?: string;
  targetEventDate?: string;
  eventSession?: 'morning' | 'afternoon' | 'evening' | 'full_day';
  startTime?: string; // e.g. "09:00"
  endTime?: string; // e.g. "10:00"
  durationHours?: number; // e.g. 1
  durationText?: string; // e.g. "1 Jam"
  interestedBusinessLineId?: string;
  estimatedGuestCount?: number;
  venueName?: string;
  eventNotes?: string;
}

export interface SalesOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discount: number;
  total: number;
  isBonus?: boolean;
}

export type SalesOrderStatus = 'open' | 'received' | 'picked' | 'shipped' | 'invoiced' | 'cancelled' | 'draft' | 'confirmed';

export interface SalesOrder {
  id: string;
  tenantId: string;
  businessUnitId: string;
  branchId: string;
  warehouseId?: string;
  orderNumber: string; // Canonical: SO00120261000001
  customerId?: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  orderDate: string;
  deliveryDate?: string;
  paymentMethod?: 'dp_termin' | 'cash' | 'transfer' | 'top';
  paymentTermsDays?: number;
  subtotal: number;
  discountTotal?: number;
  tax: number;
  totalAmount: number;
  status: SalesOrderStatus;
  items: SalesOrderItem[];
  receiveNumber?: string; // Canonical: RSV0120261100001
  receiveDate?: string;
  deliveryOrderNumber?: string; // Canonical: DO0120261100001
  pickingDate?: string;
  notes?: string;
  createdAt?: string;
}

// ====================================================================
// SALES ORDER SERVICE & EVENT BOOKING TYPES (Zyvora ERP 1.0.0)
// ====================================================================

export type ServiceBookingStatus = 'open' | 'received' | 'picked' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'draft';
export type ServiceBookingSession = 'morning' | 'afternoon' | 'evening' | 'full_day';
export type PaymentMilestoneStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface PaymentMilestone {
  id: string;
  milestoneName: string; // e.g. "Down Payment (20%)", "Technical Preparation (40%)", "Final Settlement (40%)"
  percentage: number;
  amount: number;
  dueDate: string;
  paidAmount: number;
  paidDate?: string;
  status: PaymentMilestoneStatus;
}

export interface ServiceBookingItem {
  id: string;
  businessLineId: string; // 'QUEINVITE' | 'HIZAKI' | 'KIMIKO' | 'AURUM' | custom
  businessLineName: string;
  costCenterCode: string; // e.g. 'CC-QUEINVITE', 'CC-LOB-HIZAKI'
  serviceName: string;
  sku?: string;
  description?: string;
  quantity: number;
  uom: string; // 'Package' | 'Person' | 'Set' | 'Hour' | 'Day'
  unitPrice: number;
  discount: number;
  discountPercent?: number;
  subtotal: number;
  isBonus?: boolean;
}

export interface ServiceBookingOrder {
  id: string;
  tenantId: string;
  bookingNumber: string; // Canonical Pattern: SB00120261000001
  bookingDate: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventTitle: string;
  eventDate: string;
  eventSession: ServiceBookingSession;
  venueName: string;
  venueAddress?: string;
  venueCity?: string;
  distanceFromHqKm?: number;
  estimatedGuestCount?: number;
  items: ServiceBookingItem[];
  milestones: PaymentMilestone[];
  paymentMethod?: 'dp_termin' | 'cash' | 'transfer' | 'top';
  subtotal: number;
  discountTotal: number;
  discount1?: number;
  discount2?: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: ServiceBookingStatus;
  salesPicName: string;
  receiveNumber?: string; // Canonical: RSV0120261100001
  receiveDate?: string;
  deliveryOrderNumber?: string; // Canonical: DO0120261100001
  pickingDate?: string;
  notes?: string;

  // Field Service Dispatch & Crew Allocation
  assignedCrewLeadName?: string;
  assignedCrewCount?: number;
  assignedCrewMembers?: string[];
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  assignedVehicleModel?: string;
  startTime?: string;
  endTime?: string;
  durationText?: string;
  dispatchNotes?: string;

  // Enterprise MEDIST 4.0 Standard Fields
  soFormat?: string; // e.g. "00 - NORMAL SERVICE BOOKING"
  branchId?: string;
  branchCode?: string; // e.g. "73 - Sukorejo", "01 - Jakarta HQ"
  branchName?: string;
  orderType?: string; // e.g. "T01 - Normal Order", "Wedding Full Package", "Corporate Gala"
  deliveryCustomerId?: string;
  deliveryCustomerCode?: string;
  deliveryCustomerName?: string;
  deliveryAddress?: string;
  invoiceCustomerId?: string;
  invoiceCustomerCode?: string;
  invoiceCustomerName?: string;
  invoiceAddress?: string;
  warehouseId?: string;
  warehouseName?: string;
  poNumber?: string;
  poDate?: string;
  projectNumber?: string;
  deliveryVia?: string;
  deliveryReason?: string;
  priceList?: string;
  discCustDefault?: number;
  expiredDate?: string;
  paymentTermText?: string;
  taxCode?: string;
  taxPercent?: number;
  ourReference?: string;
  yourReference?: string;
  taxRegNumber?: string; // NPWP
  idCardNumber?: string; // NIK
  subAccount?: string;
  productType?: string;
  takingOrder?: string;
  voucherCode?: string;
  voucherAmount?: number;
  orderDiscountPercent?: number;
  orderDiscountAmount?: number;
  cubicationPax?: number;
  tonaseCrew?: number;
  unitCount?: number;

  createdAt: string;
  updatedAt?: string;
}

// ====================================================================
// SALES INVOICE & COMMERCIAL BILLING TYPES (Zyvora ERP 1.0.0)
// ====================================================================

export interface SalesInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discount: number;
  subtotal: number;
  costCenterCode?: string;
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface SalesInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string; // Canonical Pattern: INV00120261000001
  sourceType: 'sales_order' | 'service_booking';
  sourceId: string;
  sourceNumber: string; // SO... or SB...
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: string;
  dueDate: string;
  paymentMethod: 'dp_termin' | 'cash' | 'transfer' | 'top';
  paymentTermsDays?: number;
  subtotal: number;
  discountTotal: number;
  discount1?: number;
  discount2?: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  items: SalesInvoiceItem[];
  notes?: string;
  deliveryOrderNumber?: string;
  branchId?: string;
  branchCode?: string;
  salesPicName?: string;
  isPrinted?: boolean;
  printedAt?: string;
  createdAt: string;
}

// ====================================================================
// ACCOUNT RECEIVABLE (AR) & RECEIVE PAYMENT TYPES (MEDIST 4.0 STANDARD)
// ====================================================================

export type PaymentAllocationType = 'automatic' | 'manual';
export type ReceivePaymentStatus = 'approved' | 'pending' | 'draft' | 'rejected';

export interface PaymentMethodEntry {
  id: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'giro' | 'cheque' | 'qris' | 'credit_card';
  paymentDescription: string;
  documentNumber: string;
  amount: number;
}

export interface PaymentInvoiceAllocation {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerCode: string;
  customerName: string;
  dueDate: string;
  invoiceAmount: number;
  outstandingBalance: number;
  paidAmount: number;
  method: string;
  documentNumber: string;
}

export interface Collector {
  id: string;
  code: string;
  name: string;
  phone?: string;
  branchId?: string;
  status: 'active' | 'inactive';
}

export interface ReceivePayment {
  id: string;
  tenantId: string;
  paymentNumber: string; // e.g. KR73_0731026000639 or RP0120261100001
  sysNumber: string; // e.g. SYS-RP-202611-0001
  branchId: string;
  branchCode: string;
  branchName: string;
  documentNumber: string; // Nomor bukti fisik transfer / kuitansi
  paymentDate: string; // YYYY-MM-DD
  paymentAllocation: PaymentAllocationType; // 'automatic' | 'manual'
  fromInvoiceCollection: boolean; // Yes / No
  invoiceCollectionNumber?: string;
  collectorId?: string;
  collectorCode?: string;
  collectorName?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  currency: string; // 'IDR'
  totalPaymentAmount: number;
  totalAllocatedAmount: number;
  paymentMethods: PaymentMethodEntry[];
  allocations: PaymentInvoiceAllocation[];
  source: string; // 'Medist' | 'Zyvora' | 'Mobile'
  status: ReceivePaymentStatus; // 'approved' | 'pending' | 'draft'
  isChecked?: boolean; // Payment has not been checked indicator (pastel cyan)
  isDeposited?: boolean; // True when deposited into Cash/Bank Book via Cash Transaction
  depositedAt?: string;
  cashTransactionId?: string;
  cashTransactionNumber?: string;
  notes?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  uom: string;
  unitCost: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  businessUnitId: string;
  branchId: string;
  warehouseId: string;
  orderNumber: string; // PO-YYYYMM-XXXXXX
  vendorCode: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: number;
  status: 'draft' | 'approved' | 'partially_received' | 'received' | 'billed' | 'cancelled';
  items: PurchaseOrderItem[];
}

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  barcode?: string; // Standard EAN-13 13-digit barcode for POS scanner
  name: string;
  description?: string;
  type?: 'physical' | 'service' | 'digital';
  category: string;
  uom: string; // Unit of measure
  sellingPrice: number;
  costPrice: number;
  minStockLevel: number;
  weightGram?: number; // Berat barang dalam gram (khusus fisik)
  imageUrl?: string; // Link URL foto produk teroptimasi
  stockByWarehouse: Record<string, number>; // warehouseId -> qty
  totalStock: number;
  status: 'active' | 'inactive';
  businessLineId?: string; // Penanggung Jawab Lini Bisnis / Cost Center
}

export interface ServiceItem {
  id: string;
  tenantId?: string;
  code: string; // SKU Jasa (singkatan nama)
  barcode?: string; // Barcode EAN-13 Jasa untuk scan kasir POS
  name: string;
  description?: string;
  category: string;
  businessLineId?: string; // Lini Bisnis (contoh: Queinvite)
  uom: string; // Paket, Proyek, Bulan, Sesi, Jam, Pax, dll.
  costPrice?: number; // Modal / HPP Layanan
  rate: number; // Tarif Jual Layanan
  imageUrl?: string; // Foto / Sampel Layanan Jasa WebP
  isActive: boolean;
}

export interface ProductCategory {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  itemType: 'physical' | 'service' | 'all';
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitOfMeasure {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  classification: 'Packaging' | 'Weight' | 'Volume' | 'Service' | 'Logistics' | 'General';
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  movementNumber: string; // MUT-YYYYMM-XXXXXX
  date: string;
  type: 'inbound' | 'outbound' | 'transfer' | 'adjustment';
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  sku: string;
  productName: string;
  quantity: number;
  uom: string;
  referenceDoc: string;
  notes: string;
  createdBy: string;
}

export interface FinancialAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: 'Kas & Bank' | 'Piutang Usaha' | 'Persediaan' | 'Aset Tetap' | 'Utang Usaha' | 'Modal' | 'Pendapatan' | 'Beban Operasional';
  balance: number;
  currency: string;
  accountNumber?: string;
  bankName?: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string; // JV-YYYYMM-XXXXXX
  date: string;
  reference: string;
  description: string;
  status: 'posted' | 'draft' | 'reversed';
  totalDebit: number;
  totalCredit: number;
  postedBy: string;
  postedAt?: string;
  lines: JournalLine[];
}

export type EmploymentType = 'permanent' | 'contract' | 'probation' | 'intern' | 'daily';

export interface Department {
  id: string;
  tenantId: string;
  code: string;           // e.g. 'DEP-FIN', 'DEP-OPS'
  name: string;           // e.g. 'Finance & Accounting'
  costCenterCode: string; // e.g. 'CC-FIN' (Default Cost Center)
  managerEmployeeId?: string;
  managerName?: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Position {
  id: string;
  tenantId: string;
  departmentId: string;
  departmentName?: string;
  code: string;           // e.g. 'POS-FIN-MGR'
  title: string;          // e.g. 'Finance Manager'
  gradeLevel: number;     // 1 to 7
  reportsToPositionId?: string;
  reportsToTitle?: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  employeeCode: string; // NIK e.g. 00120261027001 or 001A20261027001
  fullName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  department: string;
  departmentId?: string;
  position: string;
  positionId?: string;
  branchId: string;
  branchName?: string;
  costCenterCode?: string; // e.g. 'CC-FIN', 'CC-OPS' (Mandatory in Core HR forms)
  costCenterName?: string;
  joinDate: string;
  status: 'active' | 'leave' | 'terminated';
  employmentType?: EmploymentType;
  contractEndDate?: string;
  supervisorId?: string;
  supervisorName?: string;
  // Unified System Access & Operational Assignment
  isSalesPic?: boolean; // Can be assigned as Sales / Event PIC in Sales & AR
  hasSystemAccount?: boolean; // Indicates employee is provisioned as Tenant Member
  systemRole?: OfficialRole; // Assigned RBAC role
  userId?: string; // Linked UserProfile UUID
  // Financial & Tax info
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  npwp?: string;
  ptkpStatus?: 'TK/0' | 'K/0' | 'K/1' | 'K/2' | 'K/3';
  bpjsKetenagakerjaan?: string;
  bpjsKesehatan?: string;
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Cost allocation & address
  costAllocation?: PersonilCostPolicy; // Kebijakan alokasi biaya: 'single' (satu lini bisnis) atau 'shared_equal' (dibagi rata)
  businessLineId?: string; // Shortcut Lini Bisnis langsung untuk mode single
  businessLineName?: string; // Nama Lini Bisnis (e.g. 'Holding / Shared Services', 'Hizaki Wedding Planner')
  address?: string;
  country?: string;
  provinceId?: string;
  provinceName?: string;
  regencyId?: string;
  regencyName?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  postalCode?: string;
  rt?: string;
  rw?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type RecruitmentStage = 'applied' | 'screening' | 'interview_hr' | 'interview_user' | 'offering' | 'hired' | 'rejected';

export interface JobOpening {
  id: string;
  tenantId: string;
  code: string; // e.g. 'JOB-2026-001'
  title: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  costCenterCode: string;
  employmentType: EmploymentType;
  openingsCount: number;
  status: 'draft' | 'published' | 'closed';
  postedDate: string;
  description?: string;
}

export interface RecruitmentCandidate {
  id: string;
  tenantId: string;
  jobOpeningId: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  costCenterCode: string;
  fullName: string;
  email: string;
  phone: string;
  stage: RecruitmentStage;
  appliedDate: string;
  resumeUrl?: string;
  notes?: string;
  rating?: number; // 1 to 5
  convertedEmployeeId?: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  vendorCode: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  status: 'active' | 'inactive';
  paymentTerms?: string;
  address?: string;
  country?: string;
  provinceId?: string;
  provinceName?: string;
  regencyId?: string;
  regencyName?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  postalCode?: string;
}

// ====================================================================
// GLOBAL ADDRESS STANDARD TYPES (Zyvora ERP 1.0.0)
// ====================================================================

export interface StandardAddressData {
  country?: string; // Default: 'Indonesia'
  countryCode?: string; // e.g. 'ID'
  provinceId?: string; // Kemendagri 2-digit code (e.g. '31')
  provinceName?: string; // e.g. 'DKI Jakarta'
  regencyId?: string; // Kemendagri 4-digit code (e.g. '3171')
  regencyName?: string; // e.g. 'Kota Jakarta Selatan'
  districtId?: string; // Kemendagri / BPS code (e.g. '3171060')
  districtName?: string; // e.g. 'Kebayoran Baru'
  villageId?: string; // Kemendagri / BPS code (e.g. '3171060010')
  villageName?: string; // e.g. 'Senayan'
  postalCode?: string; // 5 digit postal code
  address?: string; // Street address, building, floor, RT/RW, etc.
  rt?: string; // Optional RT
  rw?: string; // Optional RW
  latitude?: number; // Geolocation coordinate latitude
  longitude?: number; // Geolocation coordinate longitude
}

export interface AddressFieldConfig {
  countryRequired?: boolean;
  provinceRequired?: boolean;
  regencyRequired?: boolean;
  districtRequired?: boolean;
  villageRequired?: boolean;
  postalCodeRequired?: boolean;
  addressRequired?: boolean;
  showRtRw?: boolean;
  showHeader?: boolean;
  title?: string;
  description?: string;
  addressRows?: number;
  addressPlaceholder?: string;
  allowManualEntryOnFailure?: boolean;
}

export type BusinessEntityType =
  | 'PT'
  | 'PT_PERORANGAN'
  | 'CV'
  | 'FIRMA'
  | 'UD'
  | 'KOPERASI'
  | 'YAYASAN'
  | 'PERORANGAN';

export interface CompanyProfile {
  tenantId: string;
  tenantCode: string;
  legalName: string;
  brandName: string;
  logoUrl?: string;
  description: string;
  businessEntity: BusinessEntityType;
  nib: string; // 13 digits
  npwp: string; // 15-16 digits
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export type BusinessModelType = 'B2B' | 'B2C' | 'B2B2C' | 'D2C' | 'B2G';

// Aturan Alokasi Biaya / Cost Center Lini Bisnis
export type CostAllocationMode = 'single' | 'shared_equal';

export interface PersonilCostPolicy {
  mode: CostAllocationMode; // 'single': 100% beban lini tertentu, 'shared_equal': dibagi rata ke semua lini aktif
  businessLineId?: string; // ID Lini Bisnis penanggung jawab (jika mode = 'single')
  notes?: string;
}

export interface CostAllocationBreakdown {
  businessLineId: string;
  businessLineCode: string;
  businessLineName: string;
  costCenterCode: string;
  percentage: number; // e.g. 100% atau 33.33%
  allocatedAmount: number; // Nominal Rupiah riil hasil pembagian
}

export interface CostAllocationResult {
  mode: CostAllocationMode;
  totalAmount: number;
  allocations: CostAllocationBreakdown[];
  isBalanced: boolean; // Menjamin total hasil pembagian persis sama dengan totalAmount (zero leakage)
}

export interface TenantBusinessLine {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string;
  isPrimary: boolean;
  isActive: boolean;
  costCenterCode?: string; // Kode unik Cost Center akuntansi (e.g. 'CC-QUEINVITE' atau 'CC-LOB-01')
  allowSharedAllocation?: boolean; // Apakah berhak menerima alokasi beban bersama/shared services (default: true)
  createdAt: string;
  updatedAt?: string;
}

export interface TenantMarketProfile {
  tenantId: string;
  industryCategory: string;
  businessModel: BusinessModelType;
  businessLines: TenantBusinessLine[];
  updatedAt?: string;
  updatedBy?: string;
}

export type BaseCurrencyType = 'IDR' | 'USD' | 'SGD' | 'EUR' | 'MYR';
export type SystemTimezoneType = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura' | 'UTC';
export type SystemLanguageType = 'id' | 'en';
export type SystemDateFormatType = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM/DD/YYYY';

export interface TenantSystemConfig {
  tenantId: string;
  baseCurrency: BaseCurrencyType;
  timezone: SystemTimezoneType;
  language: SystemLanguageType;
  dateFormat: SystemDateFormatType;
  fiscalYearStartMonth: number; // 1 = Januari, 4 = April, 7 = Juli
  updatedAt?: string;
  updatedBy?: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  vendorCode: string; // e.g. "VND-001"
  code?: string;
  name: string;
  companyName: string;
  category: string;
  email: string;
  phone: string;
  npwp?: string;
  paymentTermsDays: number;
  status: 'active' | 'inactive';
  address?: string;
  province?: string;
  provinceId?: string;
  regency?: string;
  regencyId?: string;
  district?: string;
  districtId?: string;
  village?: string;
  villageId?: string;
  postalCode?: string;
  country?: string;
}

export interface TaxRule {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  ratePercent: number;
  taxType: 'ppn' | 'pph23' | 'pph21' | 'pph_final' | 'exempt';
  isSalesTax: boolean;
  isPurchaseTax: boolean;
  glAccountCode?: string;
  description?: string;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  businessUnitId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  currency: string;
  glAccountCode: string;
  balance: number;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: 'bank_transfer' | 'virtual_account' | 'qris' | 'cash' | 'giro';
  bankAccountId?: string;
  isActive: boolean;
}

// ====================================================================
// CLAIM EXPENSE & FLEET MANAGEMENT (Zyvora ERP 1.0.0)
// ====================================================================

export interface CompanyVehicle {
  id: string;
  tenantId?: string;
  licensePlate: string; // Nopol, e.g. 'B 1234 XYZ'
  brandModel: string;   // e.g. 'Toyota Avanza 1.3 G'
  vehicleType: 'car' | 'motorcycle' | 'van' | 'truck';
  fuelType: 'pertalite' | 'pertamax' | 'dexlite' | 'solar';
  assignedBranchId?: string;
  assignedBusinessLineId?: string;
  custodianEmployeeId?: string; // Pemegang Inventaris (PIC / Driver)
  custodianName?: string;
  taxDueDate?: string;          // Tanggal Jatuh Tempo Pajak Tahunan (YYYY-MM-DD)
  plateExpiryDate?: string;     // Tanggal Habis Masa Berlaku STNK / Plat 5 Tahunan (YYYY-MM-DD)
  currentOdometerKm: number;
  isActive: boolean;
  notes?: string;
}

export interface ClaimExpenseCategory {
  id: string;
  tenantId?: string;
  code: string;               // e.g. 'CAT-FUEL', 'CAT-MEAL'
  name: string;               // e.g. 'Bahan Bakar Kendaraan (BBM)'
  isVehicleActivity: boolean; // Memicu form armada (Nopol, KM, Liter)
  maxLimit: number;           // 0 = Tanpa limit
  isReceiptRequired: boolean; // Wajib melampirkan nota
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClaimExpenseActivity {
  id: string;
  tenantId?: string;
  code: string;               // e.g. 'ACT-DELIV', 'ACT-CLIENT'
  name: string;               // e.g. 'Pengantaran Hampers Undangan'
  businessLineId?: string;    // Lini bisnis penanggung jawab atau undefined (Semua)
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseClaimStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
export type ExpenseClaimOrderByType = 'business_line' | 'personnel' | 'branch';
export type ExpenseClaimDisbursementMethod = 'petty_cash' | 'bank_transfer';

export interface ExpenseClaimItem {
  id: string;
  claimId?: string;
  lineNumber: number;
  orderByType: ExpenseClaimOrderByType;
  orderByTargetId: string;
  orderByTargetName: string;
  costCenterCode: string; // Locked Cost Center Code (e.g. 'CC-QUEINVITE')
  category: string;       // e.g. 'vehicle_fuel', 'travel_lodging', 'meals_representation', 'office_supplies', 'courier_logistics', 'general'
  activity: string;       // e.g. 'Hampers Delivery', 'Client Meeting', 'General Operation'
  isVehicleActivity?: boolean;
  vehicleId?: string;
  licensePlate?: string;
  odometerKm?: number;
  fuelLiters?: number;
  fuelPurchaseDate?: string;
  nominal: number;
  disbursementMethod?: ExpenseClaimDisbursementMethod;
  remark?: string;
  receiptUrl?: string;
}

export interface ExpenseClaim {
  id: string;
  tenantId: string;
  claimNumber: string; // Format: CE + YYYYMM + 00001 (e.g. CE20261000001)
  claimDate: string;   // YYYY-MM-DD
  requestByUserId: string;
  requestByName: string;
  totalAmount: number;
  status: ExpenseClaimStatus;
  notes?: string;
  disbursementMethod?: ExpenseClaimDisbursementMethod;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  disbursedCashTransactionId?: string;
  disbursedCashTransactionNumber?: string;
  items: ExpenseClaimItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type CashTransactionType = 'receipt' | 'issue';
export type CashTransactionSource = 'claim_expense' | 'direct_expense' | 'direct_receipt' | 'other';

export interface CashTransactionLineItem {
  id: string;
  transactionType: string;      // e.g. '73003 - Penerimaan Penagihan', '73001 - Claim Expense', etc.
  recipientOrPayer: string;
  recipientOrPayerCode?: string; // e.g. '17836' or 'B3K9A'
  correspondingDoc?: string;    // e.g. RP00120261100001 or CE20261000002
  reference?: string;           // reference note or claim ID
  amount: number;
  subBranchCode?: string;
  hq?: string;
  caHqPic?: string;
  remark: string;
  costCenterCode?: string;
}

export interface CashTransaction {
  id: string;
  tenantId: string;
  transactionNumber: string; // e.g. CSH-OUT-202610-0001 or CSH-IN-202610-0001
  transactionDate: string;   // YYYY-MM-DD
  type: CashTransactionType;
  source: CashTransactionSource;
  branchId?: string;
  branchName?: string;
  referenceId?: string;      // e.g. claim.id
  referenceNumber?: string;  // e.g. claim.claimNumber
  accountId: string;         // FinancialAccount id (Cash Book)
  accountName: string;       // FinancialAccount name
  cashBookBalance?: number;
  currency?: string;
  amount: number;
  recipientOrPayer: string;  // Dibayarkan Kepada / Diterima Dari
  costCenterCode?: string;
  notes?: string;
  disbursementMethod?: ExpenseClaimDisbursementMethod;
  items?: CashTransactionLineItem[];
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

// ====================================================================
// REPORTING & COST RATIO ANALYTICS (Zyvora ERP 1.0.0)
// ====================================================================

export type CostRatioHealthStatus = 'healthy' | 'moderate' | 'warning' | 'deficit';

export interface BusinessLineCostRatioData {
  businessLineId: string;
  businessLineCode: string;
  businessLineName: string;
  costCenterCode: string;
  revenue: number;              // Omzet kotor (Rp)
  directCost: number;           // Beban langsung lini bisnis / direct claims (Rp)
  sharedHoldingCost: number;    // Alokasi beban bersama holding (Rp)
  totalCost: number;            // Total beban riil (directCost + sharedHoldingCost)
  costRatioPercent: number;     // (totalCost / revenue) * 100
  netOperatingMargin: number;   // revenue - totalCost
  marginPercent: number;        // (netOperatingMargin / revenue) * 100
  status: CostRatioHealthStatus;
}

export interface CostRatioReportFilter {
  period: 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time' | 'custom';
  startDate?: string;
  endDate?: string;
  businessLineId?: string; // 'all' or specific
  branchId?: string;       // 'all' or specific
}

export interface CostBreakdownItem {
  category: string;
  label: string;
  brandName?: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CostRatioReportSummary {
  periodLabel: string;
  totalRevenue: number;
  totalDirectCost: number;
  totalHoldingSharedCost: number;
  totalCost: number;
  averageCostRatio: number;
  netMargin: number;
  overallStatus: CostRatioHealthStatus;
  lines: BusinessLineCostRatioData[];
  costBreakdown: CostBreakdownItem[];
  holdingDistribution: {
    totalHoldingPool: number;
    distributions: {
      targetLineId: string;
      targetLineName: string;
      costCenterCode: string;
      amount: number;
      percentage: number;
    }[];
  };
}




