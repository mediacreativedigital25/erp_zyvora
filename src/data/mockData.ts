import {
  Tenant,
  BusinessUnit,
  Branch,
  Warehouse,
  UserProfile,
  Customer,
  Product,
  SalesOrder,
  PurchaseOrder,
  StockMovement,
  FinancialAccount,
  JournalEntry,
  Employee,
  AuditLog,
  Vendor,
  TaxRule,
  BankAccount,
  PaymentMethod,
  ServiceBookingOrder,
  SalesInvoice,
  Collector,
  ReceivePayment
} from '../types/erp';

export const INITIAL_TENANT: Tenant = {
  id: 'ten_zyvora_corp',
  name: 'Zyvora Global Enterprises',
  code: 'ZYV-CORP',
  tenantNumber: '001',
  slug: 'zyvora-enterprises',
  plan: 'enterprise',
  createdAt: '2025-01-15T00:00:00Z',
  status: 'active'
};

export const ALL_TENANTS: Tenant[] = [
  INITIAL_TENANT,
  {
    id: 'ten_yulovi_holdings',
    name: 'PT Yulovi Niaga Nusantara',
    code: 'YUL-HOLD',
    tenantNumber: '002',
    slug: 'yulovi-holdings',
    plan: 'enterprise',
    createdAt: '2025-02-01T00:00:00Z',
    status: 'active'
  },
  {
    id: 'ten_prima_logistik',
    name: 'PT Prima Logistik Sentosa',
    code: 'PLS-LOG',
    tenantNumber: '003',
    slug: 'prima-logistik',
    plan: 'growth',
    createdAt: '2025-03-10T00:00:00Z',
    status: 'active'
  }
];

export const INITIAL_BUSINESS_UNITS: BusinessUnit[] = [
  {
    id: 'bu_distribusi',
    tenantId: 'ten_zyvora_corp',
    code: 'BU-01',
    name: 'PT Zyvora Distribusi Nusantara',
    taxId: '01.345.678.9-012.000',
    currency: 'IDR',
    isActive: true
  },
  {
    id: 'bu_retail',
    tenantId: 'ten_zyvora_corp',
    code: 'BU-02',
    name: 'PT Zyvora Retail Dinamika',
    taxId: '02.987.654.3-045.000',
    currency: 'IDR',
    isActive: true
  }
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br_jkt_hq',
    businessUnitId: 'bu_distribusi',
    code: 'BR-01',
    name: 'Jakarta Pusat (Kantor Pusat)',
    city: 'Jakarta',
    address: 'Jl. Sudirman Kav. 52-53, Jakarta Selatan',
    phone: '+62 21 5289 0000',
    isHeadquarters: true,
    codeSuffix: '',
    isActive: true
  },
  {
    id: 'br_sub_east',
    businessUnitId: 'bu_distribusi',
    code: 'BR-02',
    name: 'Surabaya Cabang Timur',
    city: 'Surabaya',
    address: 'Kawasan Industri Rungkut Blok B-12, Surabaya',
    phone: '+62 31 8432 1100',
    isHeadquarters: false,
    codeSuffix: 'A',
    isActive: true
  },
  {
    id: 'br_mdn_west',
    businessUnitId: 'bu_distribusi',
    code: 'BR-03',
    name: 'Medan Cabang Deli',
    city: 'Medan',
    address: 'Jl. Krakatau No. 88, Medan Timur',
    phone: '+62 61 6612 9900',
    isHeadquarters: false,
    codeSuffix: 'B',
    isActive: true
  },
  {
    id: 'br_bdg',
    businessUnitId: 'bu_distribusi',
    code: 'BR-04',
    name: 'Bandung Event Studio & Office',
    city: 'Bandung',
    address: 'Jl. Riau No. 45, Citarum, Bandung',
    phone: '+62 22 4231 8800',
    isHeadquarters: false,
    codeSuffix: 'C',
    isActive: true
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh_cakung_01',
    branchId: 'br_jkt_hq',
    code: 'WH-JKT-01',
    name: 'Gudang Pusat Cakung',
    type: 'central',
    address: 'Kawasan Logistik Cakung Indah Blok A4',
    capacityM2: 5200,
    isActive: true
  },
  {
    id: 'wh_marunda_02',
    branchId: 'br_jkt_hq',
    code: 'WH-JKT-02',
    name: 'Gudang Transit Marunda',
    type: 'transit',
    address: 'Jl. Akses Pelabuhan Marunda No. 19',
    capacityM2: 2400,
    isActive: true
  },
  {
    id: 'wh_rungkut_03',
    branchId: 'br_sub_east',
    code: 'WH-SUB-01',
    name: 'Gudang Regional Rungkut',
    type: 'retail',
    address: 'Rungkut Industri Raya No. 45, Surabaya',
    capacityM2: 3800,
    isActive: true
  },
  {
    id: 'wh_belawan_04',
    branchId: 'br_mdn_west',
    code: 'WH-MDN-01',
    name: 'Gudang Hub Belawan',
    type: 'transit',
    address: 'Pelabuhan Belawan Sektor 3, Medan',
    capacityM2: 2900,
    isActive: true
  }
];

export const CURRENT_USER: UserProfile = {
  id: '00000000-0000-4000-8000-000000000001', // Candidate Super Admin Platform UUID (resolved from Supabase Auth when logged in)
  userCode: '2A', // Local mock fixture code
  email: 'admin@yulovi.com',
  fullName: 'Platform Administrator',
  role: 'super_admin',
  roleTitle: 'Platform Super Admin',
  isPlatformSuperAdmin: true,
  status: 'active',
  tenantId: 'ten_zyvora_corp',
  tenantName: 'Zyvora Global Enterprises',
  allowedBusinessUnits: ['bu_distribusi', 'bu_retail'],
  allowedBranches: ['br_jkt_hq', 'br_sub_east', 'br_mdn_west'],
  createdAt: '2025-01-15T00:00:00Z',
  lastLoginAt: '2026-10-24T08:15:00Z'
};

// Directory of Users initialized with the single authentic Platform Super Admin
export const INITIAL_USERS: UserProfile[] = [
  CURRENT_USER
];

// Audit logs for role changes and access events
export const INITIAL_ROLE_AUDITS: AuditLog[] = [];

// Customers (CLEAN SLATE — ALL DUMMY DATA PURGED FOR LIVE PRODUCTION)
export const INITIAL_CUSTOMERS: Customer[] = [];

// Service Bookings (Format: SB001YYYYMMXXXXX e.g. SB00120261000001)
export const INITIAL_SERVICE_BOOKINGS: ServiceBookingOrder[] = [];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_01',
    tenantId: 'ten_zyvora_corp',
    sku: 'SKU-LOG-PALLET',
    name: 'Wooden Cargo Pallet Euro Standard',
    description: 'Pallet kayu standar ekspor 120x80cm',
    category: 'Logistics Supplies',
    type: 'physical',
    uom: 'Pcs',
    costPrice: 120000,
    sellingPrice: 185000,
    totalStock: 420,
    minStockLevel: 50,
    stockByWarehouse: {},
    status: 'active'
  },
  {
    id: 'prod_02',
    tenantId: 'ten_zyvora_corp',
    sku: 'SKU-SRV-WED-L',
    name: 'Ki Mi Ko Full Wedding Organizer (Luxury)',
    description: 'Layanan lengkap WO, Master of Ceremony & Usher 12 Pax',
    category: 'Wedding & Event Service',
    type: 'service',
    uom: 'Package',
    costPrice: 22000000,
    sellingPrice: 45000000,
    totalStock: 0,
    minStockLevel: 0,
    stockByWarehouse: {},
    status: 'active'
  },
  {
    id: 'prod_03',
    tenantId: 'ten_zyvora_corp',
    sku: 'SKU-SRV-DECO-E',
    name: 'Aurum Elegant Floral Stage & Backdrop',
    description: 'Dekorasi panggung 16m + lighting moving beam',
    category: 'Event Decoration',
    type: 'service',
    uom: 'Package',
    costPrice: 14000000,
    sellingPrice: 32000000,
    totalStock: 0,
    minStockLevel: 0,
    stockByWarehouse: {},
    status: 'active'
  }
];

// Transaction pattern: SO00120261000001
export const INITIAL_SALES_ORDERS: SalesOrder[] = [];

// Commercial Sales Invoices (Generated from Picking or Direct Billing)
export const INITIAL_INVOICES: SalesInvoice[] = [];

// Transaction pattern: PO-YYYYMM-XXXXXX
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

// Stock movements: MUT-YYYYMM-XXXXXX
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc_1001',
    tenantId: 'ten_zyvora_corp',
    code: '1001',
    name: 'Kas Operasional Kantor Pusat',
    category: 'Kas & Bank',
    balance: 45800000,
    currency: 'IDR'
  },
  {
    id: 'acc_1002',
    tenantId: 'ten_zyvora_corp',
    code: '1002',
    name: 'Bank BCA Giro Operasional',
    category: 'Kas & Bank',
    balance: 1420500000,
    currency: 'IDR',
    accountNumber: '802-991-3401',
    bankName: 'PT Bank Central Asia Tbk'
  },
  {
    id: 'acc_1003',
    tenantId: 'ten_zyvora_corp',
    code: '1003',
    name: 'Bank Mandiri Payroll & Pajak',
    category: 'Kas & Bank',
    balance: 530200000,
    currency: 'IDR',
    accountNumber: '122-00-9831-229',
    bankName: 'PT Bank Mandiri (Persero) Tbk'
  },
  {
    id: 'acc_1101',
    tenantId: 'ten_zyvora_corp',
    code: '1101',
    name: 'Piutang Usaha Dagang',
    category: 'Piutang Usaha',
    balance: 259100000,
    currency: 'IDR'
  },
  {
    id: 'acc_1201',
    tenantId: 'ten_zyvora_corp',
    code: '1201',
    name: 'Persediaan Barang Dagang',
    category: 'Persediaan',
    balance: 984500000,
    currency: 'IDR'
  },
  {
    id: 'acc_2001',
    tenantId: 'ten_zyvora_corp',
    code: '2001',
    name: 'Utang Usaha Pemasok',
    category: 'Utang Usaha',
    balance: 412800000,
    currency: 'IDR'
  }
];

// Double entry journals: JV-YYYYMM-XXXXXX
export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp_01',
    tenantId: 'ten_zyvora_corp',
    employeeCode: 'EMP-0101',
    fullName: 'Iklas Padli',
    email: 'iklaspadli85@gmail.com',
    phone: '+62 811 9922 881',
    department: 'Direksi & Operasional',
    position: 'Chief Operating Officer',
    branchId: 'br_jkt_hq',
    joinDate: '2023-01-10',
    status: 'active'
  },
  {
    id: 'emp_02',
    tenantId: 'ten_zyvora_corp',
    employeeCode: 'EMP-0102',
    fullName: 'Sri Wahyuni, S.E., Ak.',
    email: 'sri.wahyuni@zyvora.id',
    phone: '+62 812 8844 112',
    department: 'Keuangan & Akuntansi',
    position: 'Chief Financial Accountant',
    branchId: 'br_jkt_hq',
    joinDate: '2023-03-01',
    status: 'active'
  },
  {
    id: 'emp_03',
    tenantId: 'ten_zyvora_corp',
    employeeCode: 'EMP-0103',
    fullName: 'Bambang Pamungkas',
    email: 'bambang.log@zyvora.id',
    phone: '+62 813 7721 349',
    department: 'Rantai Pasok & Gudang',
    position: 'Warehouse Lead Cakung',
    branchId: 'br_jkt_hq',
    joinDate: '2023-06-15',
    status: 'active'
  },
  {
    id: 'emp_04',
    tenantId: 'ten_zyvora_corp',
    employeeCode: 'EMP-0201',
    fullName: 'Arya Pratama',
    email: 'arya.sub@zyvora.id',
    phone: '+62 818 6629 110',
    department: 'Operasional Cabang',
    position: 'Branch Manager Surabaya',
    branchId: 'br_sub_east',
    joinDate: '2024-01-10',
    status: 'active'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_VENDORS: Vendor[] = [];

export const INITIAL_TAXES: TaxRule[] = [
  {
    id: 'tax_ppn_11',
    tenantId: 'ten_zyvora_corp',
    code: 'PPN-11',
    name: 'Pajak Pertambahan Nilai (PPN 11%)',
    ratePercent: 11,
    taxType: 'ppn',
    isSalesTax: true,
    isPurchaseTax: true,
    glAccountCode: '2002',
    description: 'Tarif PPN standar nasional berlaku saat ini',
    isActive: true
  },
  {
    id: 'tax_ppn_12',
    tenantId: 'ten_zyvora_corp',
    code: 'PPN-12',
    name: 'Pajak Pertambahan Nilai (PPN 12%)',
    ratePercent: 12,
    taxType: 'ppn',
    isSalesTax: true,
    isPurchaseTax: true,
    glAccountCode: '2002',
    description: 'Penyesuaian tarif PPN masa depan aman UU Harmonisasi Perpajakan',
    isActive: false
  },
  {
    id: 'tax_pph_23',
    tenantId: 'ten_zyvora_corp',
    code: 'PPH-23',
    name: 'PPh Pasal 23 Jasa & Sewa (2%)',
    ratePercent: 2,
    taxType: 'pph23',
    isSalesTax: false,
    isPurchaseTax: true,
    glAccountCode: '2003',
    description: 'Pemotongan pajak penghasilan atas imbalan jasa dan persewaan aset',
    isActive: true
  },
  {
    id: 'tax_pph_21',
    tenantId: 'ten_zyvora_corp',
    code: 'PPH-21',
    name: 'PPh Pasal 21 Tenaga Ahli (2.5%)',
    ratePercent: 2.5,
    taxType: 'pph21',
    isSalesTax: false,
    isPurchaseTax: true,
    glAccountCode: '2004',
    description: 'Pemotongan pajak atas imbalan tenaga ahli non-pegawai ber-NPWP',
    isActive: true
  },
  {
    id: 'tax_pph_final',
    tenantId: 'ten_zyvora_corp',
    code: 'PPH-FINAL',
    name: 'PPh Final PP 55 / UMKM (0.5%)',
    ratePercent: 0.5,
    taxType: 'pph_final',
    isSalesTax: true,
    isPurchaseTax: false,
    glAccountCode: '2005',
    description: 'Pajak penghasilan final omset bruto peredaran usaha PP 55/2022',
    isActive: true
  },
  {
    id: 'tax_exempt',
    tenantId: 'ten_zyvora_corp',
    code: 'NON-PAJAK',
    name: 'Bebas Pajak / Non-PKP (0%)',
    ratePercent: 0,
    taxType: 'exempt',
    isSalesTax: true,
    isPurchaseTax: true,
    description: 'Barang kebutuhan pokok non-kena pajak atau transaksi non-PKP',
    isActive: true
  }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank_01',
    tenantId: 'ten_zyvora_corp',
    businessUnitId: 'bu_distribusi',
    bankName: 'PT Bank Central Asia Tbk (BCA)',
    accountNumber: '802-991-3401',
    accountHolderName: 'PT Zyvora Distribusi Nusantara',
    currency: 'IDR',
    glAccountCode: '1002',
    balance: 1420500000,
    isActive: true
  },
  {
    id: 'bank_02',
    tenantId: 'ten_zyvora_corp',
    businessUnitId: 'bu_distribusi',
    bankName: 'PT Bank Mandiri (Persero) Tbk',
    accountNumber: '122-00-9831-229',
    accountHolderName: 'PT Zyvora Distribusi Nusantara',
    currency: 'IDR',
    glAccountCode: '1003',
    balance: 530200000,
    isActive: true
  },
  {
    id: 'bank_03',
    tenantId: 'ten_zyvora_corp',
    businessUnitId: 'bu_retail',
    bankName: 'PT Bank Rakyat Indonesia (Persero) Tbk (BRI)',
    accountNumber: '0341-01-002931-30-8',
    accountHolderName: 'PT Zyvora Retail Dinamika',
    currency: 'IDR',
    glAccountCode: '1004',
    balance: 275000000,
    isActive: true
  }
];

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_01',
    tenantId: 'ten_zyvora_corp',
    code: 'BCA-TRF',
    name: 'BCA Transfer Bank (Manual/Otomatis)',
    type: 'bank_transfer',
    bankAccountId: 'bank_01',
    isActive: true
  },
  {
    id: 'pm_02',
    tenantId: 'ten_zyvora_corp',
    code: 'MANDIRI-VA',
    name: 'Mandiri Virtual Account (VA)',
    type: 'virtual_account',
    bankAccountId: 'bank_02',
    isActive: true
  },
  {
    id: 'pm_03',
    tenantId: 'ten_zyvora_corp',
    code: 'QRIS-STATIC',
    name: 'QRIS Statis Toko & Kasir',
    type: 'qris',
    bankAccountId: 'bank_03',
    isActive: true
  },
  {
    id: 'pm_04',
    tenantId: 'ten_zyvora_corp',
    code: 'TUNAI-KAS',
    name: 'Pembayaran Kas / Tunai Langsung',
    type: 'cash',
    isActive: true
  }
];

// ====================================================================
// INITIAL AR COLLECTORS (AUTHENTIC ZYVORA AR STAFF & SALES PIC)
// ====================================================================

export const INITIAL_COLLECTORS: Collector[] = [];

// ====================================================================
// INITIAL RECEIVE PAYMENTS (CLEAN SLATE — ALL DEMO DATA PURGED)
// ====================================================================

export const INITIAL_RECEIVE_PAYMENTS: ReceivePayment[] = [];

