/**
 * Zyvora ERP 1.0.0 — Clean Path URL Routing Utility
 * Handles bi-directional synchronization between React SPA state and Browser Address Bar.
 */

import { NavigationModule } from '../context/ErpContext';

export interface RouteMatch {
  module: NavigationModule;
  featureId: string;
  accordionId: string | null;
}

// Map from feature ID to canonical clean URL path
export const FEATURE_TO_PATH_MAP: Record<string, string> = {
  // Dashboard
  dashboard: '/dashboard',

  // Sales
  sales: '/sales/customers',
  sales_customers: '/sales/customers',
  customers: '/sales/customers',
  sales_order: '/sales/orders',
  sales_order_service: '/sales/orders',
  sales_service_schedule: '/sales/service-schedule',
  service_schedule: '/sales/service-schedule',
  sales_order_receive: '/sales/order-receive',
  order_receipt: '/sales/order-receive',
  sales_order_picking: '/sales/order-picking',
  sales_print_invoice: '/sales/invoices',
  invoices: '/sales/invoices',
  sales_do_list: '/sales/delivery-orders',
  sales_order_list: '/sales/order-list',
  sales_order_cancellation: '/sales/cancellations',
  sales_report: '/sales/reports',

  // Inventory
  inventory: '/inventory/products',
  persediaan: '/inventory/products',
  inv_list_product: '/inventory/products',
  inv_category: '/inventory/categories',
  inv_warehouse: '/inventory/warehouses',
  inv_stock_overview: '/inventory/stock-overview',
  inv_stock_movement: '/inventory/stock-movement',
  inv_stock_adjustment: '/inventory/stock-adjustment',
  inv_stock_opname: '/inventory/stock-opname',
  inv_stock_transfer: '/inventory/stock-transfer',
  inv_report: '/inventory/reports',

  // Account Receivable
  account_receivable: '/account-receivable/receive-payment',
  ar_receive_payment: '/account-receivable/receive-payment',
  ar_invoice_collection: '/account-receivable/invoice-collection',
  ar_resume_invoice: '/account-receivable/resume-invoice',
  ar_invoice_list: '/account-receivable/invoices',
  ar_outstanding_invoice: '/account-receivable/outstanding-invoices',
  ar_aging_receivable: '/account-receivable/aging',
  ar_payment_history: '/account-receivable/payment-history',

  // Cash Management
  cash_management: '/cash-management/claim-expense',
  cash_claim_expense: '/cash-management/claim-expense',

  // Approval
  approval: '/approval',
  approval_list: '/approval/list',

  // Human Resources
  human_resources: '/human-resources/recruitment',
  sdm: '/human-resources/recruitment',
  hr_recruitment: '/human-resources/recruitment',
  hr_attendance: '/human-resources/attendance',
  hr_work_schedule: '/human-resources/work-schedule',
  hr_leave_permission: '/human-resources/leave-permission',
  hr_overtime: '/human-resources/overtime',
  hr_payroll: '/human-resources/payroll',
  hr_payslip: '/human-resources/payslip',
  hr_benefits: '/human-resources/benefits',
  hr_performance_kpi: '/human-resources/performance-kpi',
  hr_training_dev: '/human-resources/training-dev',
  hr_employee_docs: '/human-resources/employee-docs',
  hr_reports: '/human-resources/reports',

  // Master Data
  master_data: '/master/company-profile',
  master: '/master/company-profile',
  master_company_profile: '/master/company-profile',
  tenant: '/master/company-profile',
  master_market_business_line: '/master/market-lines',
  master_branches_business_units: '/master/branches',
  master_taxes: '/master/taxes',
  master_business_contacts: '/master/vendors',
  master_finance: '/master/finance-accounts',
  master_vehicles: '/master/vehicles',
  master_system_config: '/master/system-config',
  rbac: '/master/tenant-members',

  // Reporting
  reporting: '/reporting/cost-ratio',
  laporan: '/reporting/cost-ratio',
  reporting_cost_ratio: '/reporting/cost-ratio',
  reporting_sales_performance: '/reporting/sales-performance',
  reporting_expense_cashflow: '/reporting/expense-cashflow',

  // Super Admin
  super_admin: '/superadmin/tenants',
  superadmin_tenants: '/superadmin/tenants',
  superadmin_users: '/superadmin/users',
  superadmin_connections: '/superadmin/connections',
  superadmin_menu_governance: '/superadmin/menu-governance'
};

// Map from canonical URL path to RouteMatch
export const PATH_TO_ROUTE_MAP: Record<string, RouteMatch> = {
  '/': { module: 'dashboard', featureId: 'dashboard', accordionId: null },
  '/dashboard': { module: 'dashboard', featureId: 'dashboard', accordionId: null },

  // Sales
  '/sales': { module: 'sales', featureId: 'sales_customers', accordionId: 'sales' },
  '/sales/customers': { module: 'sales', featureId: 'sales_customers', accordionId: 'sales' },
  '/sales/orders': { module: 'sales', featureId: 'sales_order_service', accordionId: 'sales' },
  '/sales/service-schedule': { module: 'sales', featureId: 'sales_service_schedule', accordionId: 'sales' },
  '/sales/order-receive': { module: 'sales', featureId: 'sales_order_receive', accordionId: 'sales' },
  '/sales/order-picking': { module: 'sales', featureId: 'sales_order_picking', accordionId: 'sales' },
  '/sales/invoices': { module: 'sales', featureId: 'sales_print_invoice', accordionId: 'sales' },
  '/sales/delivery-orders': { module: 'sales', featureId: 'sales_do_list', accordionId: 'sales' },
  '/sales/order-list': { module: 'sales', featureId: 'sales_order_list', accordionId: 'sales' },
  '/sales/cancellations': { module: 'sales', featureId: 'sales_order_cancellation', accordionId: 'sales' },
  '/sales/reports': { module: 'sales', featureId: 'sales_report', accordionId: 'sales' },

  // Inventory
  '/inventory': { module: 'inventory', featureId: 'inv_list_product', accordionId: 'inventory' },
  '/inventory/products': { module: 'inventory', featureId: 'inv_list_product', accordionId: 'inventory' },
  '/inventory/categories': { module: 'inventory', featureId: 'inv_category', accordionId: 'inventory' },
  '/inventory/warehouses': { module: 'inventory', featureId: 'inv_warehouse', accordionId: 'inventory' },
  '/inventory/stock-overview': { module: 'inventory', featureId: 'inv_stock_overview', accordionId: 'inventory' },
  '/inventory/stock-movement': { module: 'inventory', featureId: 'inv_stock_movement', accordionId: 'inventory' },
  '/inventory/stock-adjustment': { module: 'inventory', featureId: 'inv_stock_adjustment', accordionId: 'inventory' },
  '/inventory/stock-opname': { module: 'inventory', featureId: 'inv_stock_opname', accordionId: 'inventory' },
  '/inventory/stock-transfer': { module: 'inventory', featureId: 'inv_stock_transfer', accordionId: 'inventory' },
  '/inventory/reports': { module: 'inventory', featureId: 'inv_report', accordionId: 'inventory' },

  // Account Receivable
  '/account-receivable': { module: 'account_receivable', featureId: 'ar_receive_payment', accordionId: 'account_receivable' },
  '/account-receivable/receive-payment': { module: 'account_receivable', featureId: 'ar_receive_payment', accordionId: 'account_receivable' },
  '/account-receivable/invoice-collection': { module: 'account_receivable', featureId: 'ar_invoice_collection', accordionId: 'account_receivable' },
  '/account-receivable/resume-invoice': { module: 'account_receivable', featureId: 'ar_resume_invoice', accordionId: 'account_receivable' },
  '/account-receivable/invoices': { module: 'account_receivable', featureId: 'ar_invoice_list', accordionId: 'account_receivable' },
  '/account-receivable/outstanding-invoices': { module: 'account_receivable', featureId: 'ar_outstanding_invoice', accordionId: 'account_receivable' },
  '/account-receivable/aging': { module: 'account_receivable', featureId: 'ar_aging_receivable', accordionId: 'account_receivable' },
  '/account-receivable/payment-history': { module: 'account_receivable', featureId: 'ar_payment_history', accordionId: 'account_receivable' },

  // Cash Management
  '/cash-management': { module: 'cash_management', featureId: 'cash_claim_expense', accordionId: 'cash_management' },
  '/cash-management/claim-expense': { module: 'cash_management', featureId: 'cash_claim_expense', accordionId: 'cash_management' },

  // Approval
  '/approval': { module: 'approval', featureId: 'approval', accordionId: 'approval' },
  '/approval/list': { module: 'approval', featureId: 'approval', accordionId: 'approval' },

  // Human Resources
  '/human-resources': { module: 'human_resources', featureId: 'hr_recruitment', accordionId: 'human_resources' },
  '/human-resources/recruitment': { module: 'human_resources', featureId: 'hr_recruitment', accordionId: 'human_resources' },
  '/human-resources/attendance': { module: 'human_resources', featureId: 'hr_attendance', accordionId: 'human_resources' },
  '/human-resources/work-schedule': { module: 'human_resources', featureId: 'hr_work_schedule', accordionId: 'human_resources' },
  '/human-resources/leave-permission': { module: 'human_resources', featureId: 'hr_leave_permission', accordionId: 'human_resources' },
  '/human-resources/overtime': { module: 'human_resources', featureId: 'hr_overtime', accordionId: 'human_resources' },
  '/human-resources/payroll': { module: 'human_resources', featureId: 'hr_payroll', accordionId: 'human_resources' },
  '/human-resources/payslip': { module: 'human_resources', featureId: 'hr_payslip', accordionId: 'human_resources' },
  '/human-resources/benefits': { module: 'human_resources', featureId: 'hr_benefits', accordionId: 'human_resources' },
  '/human-resources/performance-kpi': { module: 'human_resources', featureId: 'hr_performance_kpi', accordionId: 'human_resources' },
  '/human-resources/training-dev': { module: 'human_resources', featureId: 'hr_training_dev', accordionId: 'human_resources' },
  '/human-resources/employee-docs': { module: 'human_resources', featureId: 'hr_employee_docs', accordionId: 'human_resources' },
  '/human-resources/reports': { module: 'human_resources', featureId: 'hr_reports', accordionId: 'human_resources' },

  // Master Data
  '/master': { module: 'master_data', featureId: 'master_company_profile', accordionId: 'master_data' },
  '/master/company-profile': { module: 'master_data', featureId: 'master_company_profile', accordionId: 'master_data' },
  '/master/market-lines': { module: 'master_data', featureId: 'master_market_business_line', accordionId: 'master_data' },
  '/master/branches': { module: 'master_data', featureId: 'master_branches_business_units', accordionId: 'master_data' },
  '/master/taxes': { module: 'master_data', featureId: 'master_taxes', accordionId: 'master_data' },
  '/master/vendors': { module: 'master_data', featureId: 'master_business_contacts', accordionId: 'master_data' },
  '/master/finance-accounts': { module: 'master_data', featureId: 'master_finance', accordionId: 'master_data' },
  '/master/vehicles': { module: 'master_data', featureId: 'master_vehicles', accordionId: 'master_data' },
  '/master/system-config': { module: 'master_data', featureId: 'master_system_config', accordionId: 'master_data' },
  '/master/tenant-members': { module: 'master_data', featureId: 'rbac', accordionId: 'master_data' },

  // Reporting
  '/reporting': { module: 'reporting', featureId: 'reporting_cost_ratio', accordionId: 'reporting' },
  '/reporting/cost-ratio': { module: 'reporting', featureId: 'reporting_cost_ratio', accordionId: 'reporting' },
  '/reporting/sales-performance': { module: 'reporting', featureId: 'reporting_sales_performance', accordionId: 'reporting' },
  '/reporting/expense-cashflow': { module: 'reporting', featureId: 'reporting_expense_cashflow', accordionId: 'reporting' },

  // Super Admin
  '/superadmin': { module: 'super_admin', featureId: 'superadmin_tenants', accordionId: null },
  '/superadmin/tenants': { module: 'super_admin', featureId: 'superadmin_tenants', accordionId: null },
  '/superadmin/users': { module: 'super_admin', featureId: 'superadmin_users', accordionId: null },
  '/superadmin/connections': { module: 'super_admin', featureId: 'superadmin_connections', accordionId: null },
  '/superadmin/menu-governance': { module: 'super_admin', featureId: 'superadmin_menu_governance', accordionId: null }
};

export function getCleanPathname(): string {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return path;
}

export function getRouteFromPath(rawPath?: string): RouteMatch | null {
  const pathToCheck = rawPath !== undefined ? rawPath : (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!pathToCheck) return null;
  const normalized = pathToCheck.toLowerCase().replace(/\/+$/, '') || '/';

  // 1. Direct exact match
  if (PATH_TO_ROUTE_MAP[normalized]) {
    return { ...PATH_TO_ROUTE_MAP[normalized] };
  }

  // 2. Custom dynamic menus: /custom/:slug
  if (normalized.startsWith('/custom/')) {
    const slug = normalized.replace('/custom/', '');
    return {
      module: 'dashboard' as NavigationModule,
      featureId: `custom_${slug}`,
      accordionId: null
    };
  }

  // 3. Prefix matching for top-level modules
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 0) {
    const root = `/${segments[0]}`;
    if (PATH_TO_ROUTE_MAP[root]) {
      return { ...PATH_TO_ROUTE_MAP[root] };
    }
  }

  return null;
}

export function getPathForFeature(featureId: string, module?: string): string {
  if (!featureId || featureId === 'dashboard') {
    return '/';
  }

  if (FEATURE_TO_PATH_MAP[featureId]) {
    return FEATURE_TO_PATH_MAP[featureId];
  }

  if (featureId.startsWith('custom_')) {
    return `/custom/${featureId.replace('custom_', '')}`;
  }

  // Fallback to module prefix or feature slug
  if (module && module !== 'dashboard') {
    const cleanMod = module.replace('_', '-');
    const cleanFeat = featureId.replace(`${module}_`, '').replace(/_/g, '-');
    return `/${cleanMod}/${cleanFeat}`;
  }

  return `/${featureId.replace(/_/g, '-')}`;
}

export function updateBrowserUrl(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;

  try {
    if (replace) {
      window.history.replaceState({ path }, '', path);
    } else {
      window.history.pushState({ path }, '', path);
    }
  } catch (err) {
    console.warn('[routeUtils] Failed to update browser URL:', err);
  }
}
