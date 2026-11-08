export interface SubmenuItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  isReady: boolean; // true if fully functional workspace, false if informative placeholder
  children?: SubmenuItem[]; // For nested dropdowns (e.g. Master Data > Sales > Customers)
  groupHeader?: string; // For internal display grouping (e.g. in Human Resources)
}

export interface NavGroup {
  id: string;
  label: string;
  iconName: string;
  isDirectLink?: boolean; // For Dashboard
  items?: SubmenuItem[];
}

export const NAVIGATION_CONFIG: NavGroup[] = [
  // 1. Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconName: 'LayoutDashboard',
    isDirectLink: true
  },

  // 2. Sales
  {
    id: 'sales',
    label: 'Sales',
    iconName: 'ShoppingBag',
    items: [
      {
        id: 'sales_customers',
        label: 'Customers Directory',
        description: 'Daftar akun pelanggan, kontak personal & profil komersial klien',
        isReady: true
      },
      {
        id: 'sales_order_service',
        label: 'Sales Order',
        description: 'Pesanan & transaksi penjualan barang dan layanan jasa',
        isReady: true
      },
      {
        id: 'sales_service_schedule',
        label: 'Service Schedule & Booking',
        description: 'Jadwal kunjungan, kalender sesi & pengingat operasional',
        isReady: true
      },
      {
        id: 'sales_order_receive',
        label: 'Sales Order Receive',
        description: 'Penerimaan & validasi konfirmasi pesanan',
        isReady: true
      },
      {
        id: 'sales_order_picking',
        label: 'Sales Order Picking',
        description: 'Garda terakhir validasi fisik & auto-invoice',
        isReady: true
      },
      {
        id: 'sales_print_invoice',
        label: 'Print Invoice',
        description: 'Pencetakan faktur komersial penjualan resmi',
        isReady: true
      },
      {
        id: 'sales_do_list',
        label: 'Delivery Order List',
        description: 'Daftar surat jalan & pengiriman pesanan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'sales_order_list',
        label: 'Sales Order List',
        description: 'Daftar riwayat pesanan penjualan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'sales_order_cancellation',
        label: 'Sales Order Cancellation',
        description: 'Manajemen pembatalan pesanan penjualan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'sales_report',
        label: 'Sales Report',
        description: 'Laporan komprehensif penjualan',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  },

  // 3. Inventory
  {
    id: 'inventory',
    label: 'Inventory',
    iconName: 'Boxes',
    items: [
      {
        id: 'inv_list_product',
        label: 'Products & Services',
        description: 'Unified catalog for physical items, services, commercial pricing, and cost centers',
        isReady: true
      },
      {
        id: 'inv_category',
        label: 'Categories & UoM',
        description: 'Product merchandise classifications and conversion units of measure',
        isReady: true
      },
      {
        id: 'inv_warehouse',
        label: 'Warehouses & Facilities',
        description: 'Physical storage directory, capacities, and stock keeping zones',
        isReady: true
      },
      {
        id: 'inv_stock_overview',
        label: 'Stock Overview',
        description: 'Ringkasan posisi stok fisik',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'inv_stock_movement',
        label: 'Stock Movement',
        description: 'Mutasi dan jejak pergerakan stok',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'inv_stock_adjustment',
        label: 'Stock Adjustment',
        description: 'Penyesuaian kuantitas & nilai persediaan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'inv_stock_opname',
        label: 'Stock Opname',
        description: 'Perhitungan fisik stok berkala',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'inv_stock_transfer',
        label: 'Stock Transfer',
        description: 'Transfer persediaan antar gudang',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'inv_report',
        label: 'Inventory Report',
        description: 'Laporan valuasi dan analisis persediaan',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  },

  // 4. Account Receivable
  {
    id: 'account_receivable',
    label: 'Account Receivable',
    iconName: 'Receipt',
    items: [
      {
        id: 'ar_invoice_collection',
        label: 'Invoice Collection',
        description: 'Manajemen penagihan faktur',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_receive_payment',
        label: 'Receive Payment',
        description: 'Penerimaan pembayaran pelanggan',
        isReady: true
      },
      {
        id: 'ar_resume_invoice',
        label: 'Resume Invoice',
        description: 'Ikhtisar dan rekapitulasi faktur',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_invoice_list',
        label: 'Invoice List',
        description: 'Daftar faktur piutang usaha',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_outstanding_invoice',
        label: 'Outstanding Invoice',
        description: 'Faktur belum tertagih jatuh tempo',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_aging_receivable',
        label: 'Aging Receivable',
        description: 'Skedul umur piutang usaha (AR Aging)',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_payment_history',
        label: 'Payment History',
        description: 'Riwayat jejak pelunasan pembayaran',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'ar_report',
        label: 'Receivable Report',
        description: 'Laporan analisis piutang usaha',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  },

  // 5. Cash Management
  {
    id: 'cash_management',
    label: 'Cash Management',
    iconName: 'Wallet',
    items: [
      {
        id: 'cash_bank_transfer_list',
        label: 'Bank Transfer List',
        description: 'Daftar transfer antar rekening bank',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'cash_transaction',
        label: 'Cash Transaction',
        description: 'Transaksi kas kecil dan kas operasional (Receipt & Issue)',
        isReady: true
      },
      {
        id: 'cash_claim_expense',
        label: 'Claim Expense',
        description: 'Operational employee expense claims, reimbursements, and fleet fuel logs',
        isReady: true
      },
      {
        id: 'cash_advance',
        label: 'Cash Advance',
        description: 'Pengajuan dan pencairan kasbon / uang muka kerja',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'cash_print_report',
        label: 'Print Cash Report',
        description: 'Cetak laporan arus kas operasional',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  },

  // 6. Approval
  {
    id: 'approval',
    label: 'Approval',
    iconName: 'CheckSquare',
    items: [
      {
        id: 'approval_list',
        label: 'Approval List',
        description: 'Daftar dokumen dalam antrean persetujuan (Expense Claims, PO, dll)',
        isReady: true
      }
    ]
  },

  // 7. Human Resources (HR/SDM)
  {
    id: 'human_resources',
    label: 'Human Resources (HR/SDM)',
    iconName: 'Users',
    items: [
      // Kelompok internal Organization & Personnel (Pilar 1 - Active):
      {
        id: 'hr_employee_list',
        label: 'Employee List',
        groupHeader: 'Organization & Personnel',
        description: 'Personnel directory and comprehensive employee profiles',
        isReady: true
      },
      {
        id: 'hr_position_dept',
        label: 'Position & Department',
        description: 'Department divisions, job positions, and cost center bindings',
        isReady: true
      },
      {
        id: 'hr_org_structure',
        label: 'Organization Structure',
        description: 'Visual organizational hierarchy and reporting lines',
        isReady: true
      },
      {
        id: 'hr_recruitment',
        label: 'Employee Recruitment',
        description: 'Talent acquisition and job applicant pipeline',
        isReady: true
      },

      // Kelompok internal Kehadiran & Waktu Kerja:
      {
        id: 'hr_attendance',
        label: 'Attendance',
        groupHeader: 'Kehadiran & Waktu Kerja',
        description: 'Presensi dan catatan kehadiran',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_work_schedule',
        label: 'Work Schedule & Shift',
        description: 'Jadwal kerja dan penugasan shift',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_leave_permission',
        label: 'Leave & Permission',
        description: 'Permohonan cuti dan izin kerja',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_overtime',
        label: 'Overtime',
        description: 'Pencatatan dan persetujuan lembur',
        isReady: false,
        badge: 'Segera tersedia'
      },

      // Kelompok internal Kompensasi & Pengembangan:
      {
        id: 'hr_payroll',
        label: 'Payroll',
        groupHeader: 'Kompensasi & Pengembangan',
        description: 'Perhitungan dan pemrosesan gaji karyawan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_payslip',
        label: 'Payslip',
        description: 'Penerbitan slip gaji elektronik',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_benefits',
        label: 'Benefits & Allowances',
        description: 'Manajemen tunjangan dan benefit karyawan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_performance_kpi',
        label: 'Performance & KPI',
        description: 'Penilaian kinerja dan Key Performance Indicators',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_training_dev',
        label: 'Training & Development',
        description: 'Program pelatihan dan peningkatan kompetensi',
        isReady: false,
        badge: 'Segera tersedia'
      },

      // Kelompok internal Administrasi:
      {
        id: 'hr_employee_docs',
        label: 'Employee Documents',
        groupHeader: 'Administrasi',
        description: 'Arsip berkas, kontrak, dan dokumen karyawan',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'hr_reports',
        label: 'HR Reports',
        description: 'Laporan dan statistik sumber daya manusia',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  },

  // 8. Master Data / Master Tenant
  {
    id: 'master_data',
    label: 'Master',
    iconName: 'Database',
    items: [
      {
        id: 'master_company_profile',
        label: 'Company Profile',
        description: 'Company legal identity, brand trademarks, NIB, tax ID, official contacts, address, and logos',
        isReady: true
      },
      {
        id: 'master_market_business_line',
        label: 'Market & Business Lines',
        description: 'Industry classifications, business models, and multi-business lines directory',
        isReady: true
      },
      {
        id: 'master_branches_business_units',
        label: 'Branches & Business Units',
        description: 'Operational branch hierarchy and legal subsidiary corporate entities',
        isReady: true
      },
      {
        id: 'master_taxes',
        label: 'Taxes & Duties',
        description: 'VAT/PPN rates, income withholding taxes, commercial deductions, and GL account mappings',
        isReady: true
      },
      {
        id: 'master_business_contacts',
        label: 'Vendors & Partners',
        description: 'Directory for certified vendors, suppliers, and freight carriers',
        isReady: true
      },
      {
        id: 'master_finance',
        label: 'Finance & Accounts',
        description: 'Chart of Accounts (CoA), holding bank accounts, petty cash vaults, and expense claim rules',
        isReady: true
      },
      {
        id: 'master_vehicles',
        label: 'Vehicles & Fleet',
        description: 'Operational fleet directory, license plate registry, custodians, and tax due date monitoring',
        isReady: true
      },
      {
        id: 'master_system_config',
        label: 'System Configuration',
        description: 'Base accounting currency, transaction timezones, date formatting, and fiscal year cycle',
        isReady: true
      },
      {
        id: 'rbac',
        label: 'Tenant Members & RBAC',
        description: 'Organization member directory, operational role assignments, and tenant staff access control',
        isReady: true
      }
    ]
  },

  // 9. Reporting
  {
    id: 'reporting',
    label: 'Reporting',
    iconName: 'BarChart3',
    items: [
      {
        id: 'reporting_cost_ratio',
        label: 'Cost Ratio',
        description: 'Comprehensive business line revenue vs cost analysis, holding allocations, and efficiency thresholds',
        isReady: true
      },
      {
        id: 'reporting_sales_performance',
        label: 'Sales Performance',
        description: 'Commercial sales revenue breakdown across brands and channels',
        isReady: false,
        badge: 'Segera tersedia'
      },
      {
        id: 'reporting_expense_cashflow',
        label: 'Expense & Cashflow',
        description: 'Operational disbursement audit and petty cash outflow logs',
        isReady: false,
        badge: 'Segera tersedia'
      }
    ]
  }
];
