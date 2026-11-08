import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
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
  OfficialRole,
  CompanyProfile,
  TenantMarketProfile,
  TenantSystemConfig,
  Vendor,
  TaxRule,
  BankAccount,
  PaymentMethod,
  ServiceBookingOrder,
  SalesInvoice,
  Collector,
  ReceivePayment
} from '../types/erp';
import { TenantMasterService } from '../services/tenantMasterService';
import {
  INITIAL_TENANT,
  ALL_TENANTS,
  INITIAL_BUSINESS_UNITS,
  INITIAL_BRANCHES,
  INITIAL_WAREHOUSES,
  INITIAL_USERS,
  INITIAL_ROLE_AUDITS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_FINANCIAL_ACCOUNTS,
  INITIAL_VENDORS,
  INITIAL_TAXES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_SERVICE_BOOKINGS,
  INITIAL_SALES_ORDERS,
  INITIAL_INVOICES,
  INITIAL_COLLECTORS,
  INITIAL_RECEIVE_PAYMENTS
} from '../data/mockData';
import { EmployeeService, INITIAL_CORE_EMPLOYEES } from '../services/employeeService';
import { AuthService, AuthState } from '../services/authService';
import {
  SessionTimeoutService,
  AuthLogoutReason,
  IDLE_TIMEOUT_MS
} from '../services/sessionTimeoutService';

export const GUEST_UNAUTHENTICATED_USER: UserProfile = {
  id: '',
  userCode: 'NA',
  email: '',
  fullName: 'Tamu (Belum Masuk)',
  role: 'customer',
  roleTitle: 'Tamu Belum Terautentikasi',
  isPlatformSuperAdmin: false,
  status: 'inactive',
  tenantId: '',
  allowedBusinessUnits: [],
  allowedBranches: [],
  createdAt: ''
};

import {
  validateCustomerCode,
  generateCustomerCodeCandidate,
  generateCanonicalSequence,
  validateDoubleEntryJournal,
  generateServiceBookingNumber,
  validateServiceBookingNumber,
  generateSalesOrderNumber,
  validateSalesOrderNumber,
  validateSalesOrderOrBookingNumber,
  generateSalesInvoiceNumber,
  validateSalesInvoiceNumber
} from '../domain/validators/erpRules';
import {
  testSupabaseConnection,
  ConnectionTestResult,
  isSupabaseConfigured,
  supabaseUrl,
  getSupabaseClient
} from '../services/supabaseClient';
import {
  UserAccessRepository,
  CreateUserPayload,
  UserFilter
} from '../services/repositories/userAccessRepository';
import {
  sanitizeTenantId,
  fetchCustomersFromSupabase,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  fetchServiceBookingsFromSupabase,
  syncServiceBookingToSupabase,
  deleteServiceBookingFromSupabase,
  fetchSalesOrdersFromSupabase,
  syncSalesOrderToSupabase,
  deleteSalesOrderFromSupabase,
  fetchInvoicesFromSupabase,
  syncInvoiceToSupabase,
  deleteInvoiceFromSupabase,
  fetchReceivePaymentsFromSupabase,
  syncReceivePaymentToSupabase,
  fetchProductsFromSupabase,
  syncProductToSupabase,
  deleteProductFromSupabase,
  fetchVendorsFromSupabase,
  syncVendorToSupabase,
  deleteVendorFromSupabase,
  syncStockMovementToSupabase,
  fetchStockMovementsFromSupabase,
  syncPurchaseOrderToSupabase,
  fetchPurchaseOrdersFromSupabase,
  syncJournalEntryToSupabase,
  fetchJournalEntriesFromSupabase,
  syncAuditLogToSupabase
} from '../services/supabaseSyncService';
import {
  getRouteFromPath,
  getPathForFeature,
  updateBrowserUrl
} from '../utils/routeUtils';

export type NavigationModule =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'account_receivable'
  | 'cash_management'
  | 'approval'
  | 'human_resources'
  | 'master_data'
  | 'penjualan'
  | 'pembelian'
  | 'persediaan'
  | 'keuangan'
  | 'akuntansi'
  | 'sdm'
  | 'laporan'
  | 'reporting'
  | 'pengaturan'
  | 'super_admin';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ErpContextType {
  // Supabase Authentication & Route Guard State (Gate C1)
  authStatus: AuthState;
  authenticatedUser: UserProfile | null;
  authError: string | null;
  isDevSandboxMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDevSandboxUser: (mockUser: UserProfile) => void;
  checkAuthSession: () => Promise<void>;

  // Tenancy & Active Scopes
  tenant: Tenant;
  allTenants: Tenant[];
  setAllTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  switchTenant: (tenantId: string) => void;
  addNewTenant: (payload: {
    name: string;
    code?: string;
    plan?: 'enterprise' | 'growth' | 'starter';
    tenantNumber?: string;
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
  }) => Tenant;
  updateTenant: (tenantId: string, payload: Partial<Tenant>) => Promise<boolean>;
  // Master Tenant Configuration & Profiles (Profil Perusahaan, Market/Bidang Usaha, Konfigurasi Sistem)
  companyProfile: CompanyProfile;
  marketProfile: TenantMarketProfile;
  systemConfig: TenantSystemConfig;
  updateCompanyProfileState: (profile: CompanyProfile) => void;
  updateMarketProfileState: (market: TenantMarketProfile) => void;
  updateSystemConfigState: (config: TenantSystemConfig) => void;
  reloadTenantSettings: () => Promise<void>;

  businessUnits: BusinessUnit[];
  setBusinessUnits: React.Dispatch<React.SetStateAction<BusinessUnit[]>>;
  activeBusinessUnits: BusinessUnit[];
  activeBusinessUnit: BusinessUnit;
  setActiveBusinessUnitId: (id: string) => void;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  activeBranches: Branch[];
  activeBranch: Branch;
  setActiveBranchId: (id: string) => void;
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  currentUser: UserProfile;

  // Active Navigation
  currentModule: NavigationModule;
  setCurrentModule: (mod: NavigationModule) => void;
  activeFeatureId: string;
  openAccordionId: string | null;
  setOpenAccordionId: React.Dispatch<React.SetStateAction<string | null>>;
  navigateToFeature: (featureId: string) => void;
  resetNavigationToDashboard: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Data Collections
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  salesOrders: SalesOrder[];
  setSalesOrders: React.Dispatch<React.SetStateAction<SalesOrder[]>>;
  serviceBookings: ServiceBookingOrder[];
  setServiceBookings: React.Dispatch<React.SetStateAction<ServiceBookingOrder[]>>;
  invoices: SalesInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  receivePayments: ReceivePayment[];
  setReceivePayments: React.Dispatch<React.SetStateAction<ReceivePayment[]>>;
  collectors: Collector[];
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  stockMovements: StockMovement[];
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  taxes: TaxRule[];
  setTaxes: React.Dispatch<React.SetStateAction<TaxRule[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  journalEntries: JournalEntry[];
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  refreshEmployees: () => Promise<Employee[]>;
  auditLogs: AuditLog[];

  // Mutators & Rule Helpers
  generateCustomerCode: () => string;
  generateSequenceNumber: (prefix: string) => string;
  createCustomer: (
    customerData: Omit<Customer, 'id' | 'tenantId' | 'customerCode' | 'createdAt' | 'totalOrders' | 'outstandingBalance'> & { preferredCode?: string }
  ) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => Customer;
  deleteCustomer: (id: string) => void;
  generateServiceBookingNumber: () => string;
  createServiceBooking: (
    data: Omit<ServiceBookingOrder, 'id' | 'tenantId' | 'bookingNumber' | 'createdAt'> & { preferredBookingNumber?: string }
  ) => ServiceBookingOrder;
  updateServiceBooking: (id: string, data: Partial<ServiceBookingOrder>) => ServiceBookingOrder;
  deleteServiceBooking: (id: string) => void;
  createSalesOrder: (
    orderData: Omit<SalesOrder, 'id' | 'tenantId' | 'businessUnitId' | 'branchId' | 'orderNumber' | 'createdAt'> & {
      preferredOrderNumber?: string;
      businessUnitId?: string;
      branchId?: string;
    }
  ) => SalesOrder;
  updateSalesOrder: (id: string, data: Partial<SalesOrder>) => SalesOrder;
  deleteSalesOrder: (id: string) => void;
  generateSalesOrderNumber: () => string;
  generateSalesInvoiceNumber: () => string;
  createSalesInvoice: (
    data: Omit<SalesInvoice, 'id' | 'tenantId' | 'invoiceNumber' | 'createdAt'> & { preferredInvoiceNumber?: string }
  ) => SalesInvoice;
  deleteSalesInvoice: (id: string) => void;
  createReceivePayment: (
    data: Omit<ReceivePayment, 'id' | 'tenantId' | 'paymentNumber' | 'sysNumber' | 'createdAt'> & {
      preferredPaymentNumber?: string;
    }
  ) => ReceivePayment;
  approveReceivePayment: (paymentId: string) => void;
  createStockMovement: (movementData: Omit<StockMovement, 'id' | 'tenantId' | 'movementNumber' | 'date' | 'createdBy'>) => StockMovement;
  createJournalEntry: (entryData: Omit<JournalEntry, 'id' | 'tenantId' | 'entryNumber' | 'status' | 'postedBy' | 'postedAt'>) => JournalEntry;
  createProduct: (data: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  createVendor: (data: Vendor) => void;
  updateVendor: (id: string, data: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // Supabase Integration & Diagnostics
  isSupabaseConfigured: boolean;
  targetSupabaseUrl: string;
  supabaseConnection: ConnectionTestResult | null;
  isTestingConnection: boolean;
  runConnectionTest: () => Promise<ConnectionTestResult>;

  // UI state
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isArchitectureModalOpen: boolean;
  setIsArchitectureModalOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // User Access & RBAC Governance (Section 2 & 3)
  users: UserProfile[];
  isCurrentUserSuperAdmin: boolean;
  userRoleAudits: AuditLog[];
  updateUserRole: (targetUserId: string, newRole: OfficialRole, reason: string) => Promise<void>;
  updateUserProfile: (targetUserId: string, payload: { fullName?: string; phone?: string; role?: OfficialRole; tenantId?: string; status?: 'active' | 'inactive' }) => Promise<void>;
  deleteUser: (targetUserId: string, permanent?: boolean, reason?: string) => Promise<void>;
  toggleUserStatus: (targetUserId: string, status: 'active' | 'inactive', reason: string) => Promise<void>;
  inviteUser: (data: CreateUserPayload) => Promise<UserProfile>;
  refreshUsers: (filter?: UserFilter) => Promise<void>;

  // Dynamic Realtime Database Navigation
  navigationGroups: NavGroup[];
  refreshNavigation: () => Promise<void>;
  toggleMenuStatus: (itemId: string, isReady: boolean) => Promise<boolean>;
  isAddMenuModalOpen: boolean;
  setIsAddMenuModalOpen: (open: boolean) => void;

  // Feedback
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

const ErpContext = createContext<ErpContextType | undefined>(undefined);

import { NAVIGATION_CONFIG, NavGroup } from '../config/navigation';
import { NavigationService } from '../services/navigationService';

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Supabase Auth & Session State (Gate C1)
  const [authStatus, setAuthStatus] = useState<AuthState>('loading');
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDevSandboxMode, setIsDevSandboxMode] = useState<boolean>(false);

  // Eliminate CURRENT_USER as default identity.
  // currentUser returns verified authenticatedUser, or safe unauthenticated guest object.
  const currentUser: UserProfile = useMemo(() => {
    return authenticatedUser || GUEST_UNAUTHENTICATED_USER;
  }, [authenticatedUser]);

  const [tenant, setTenant] = useState<Tenant>(INITIAL_TENANT);

  const [allTenants, setAllTenants] = useState<Tenant[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ZYVORA_ALL_TENANTS');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return ALL_TENANTS;
  });

  // Load tenants live from Supabase
  useEffect(() => {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      client
        .from('tenants')
        .select('*')
        .order('tenant_number', { ascending: true })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && data.length > 0) {
            const dbTenants: Tenant[] = data.map((row: any) => ({
              id: row.id,
              name: row.name,
              code: row.code,
              slug: row.slug,
              plan: row.plan || 'growth',
              tenantNumber: row.tenant_number,
              status: row.status || 'active',
              createdAt: row.created_at,
              address: row.address,
              provinceId: row.province_id,
              provinceName: row.province_name,
              regencyId: row.regency_id,
              regencyName: row.regency_name,
              districtId: row.district_id,
              districtName: row.district_name,
              villageId: row.village_id,
              villageName: row.village_name,
              postalCode: row.postal_code,
              phone: row.phone,
              email: row.email,
              npwp: row.npwp,
              website: row.website,
              description: row.description
            }));
            setAllTenants(dbTenants);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('ZYVORA_ALL_TENANTS', JSON.stringify(dbTenants));
              } catch {}
            }
          }
        });
    }
  }, []);

  const switchTenant = (tenantId: string) => {
    const target = allTenants.find((t) => t.id === tenantId);
    if (target) {
      setTenant(target);
      addToast(
        'Beralih Ruang Tenant',
        `Sekarang mengelola tenant: ${target.name} (${target.code || target.tenantNumber})`,
        'info'
      );
    }
  };

  const addNewTenant = (payload: {
    name: string;
    code?: string;
    plan?: 'enterprise' | 'growth' | 'starter';
    tenantNumber?: string;
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
  }): Tenant => {
    let nextNum = payload.tenantNumber;
    if (!nextNum) {
      let maxNum = 0;
      for (const t of allTenants) {
        if (t.tenantNumber) {
          const parsed = parseInt(t.tenantNumber, 10);
          if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
        }
      }
      nextNum = String(maxNum + 1).padStart(3, '0');
    }

    const newT: Tenant = {
      id: `ten_${Date.now()}`,
      name: payload.name,
      code: payload.code || `TEN-${nextNum}`,
      tenantNumber: nextNum,
      slug: payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      plan: payload.plan || 'growth',
      createdAt: new Date().toISOString(),
      status: 'active',
      address: payload.address,
      provinceId: payload.provinceId,
      provinceName: payload.provinceName,
      regencyId: payload.regencyId,
      regencyName: payload.regencyName,
      districtId: payload.districtId,
      districtName: payload.districtName,
      villageId: payload.villageId,
      villageName: payload.villageName,
      postalCode: payload.postalCode,
      phone: payload.phone,
      email: payload.email,
      npwp: payload.npwp,
      website: payload.website,
      description: payload.description
    };

    setAllTenants((prev) => {
      const updated = [newT, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ZYVORA_ALL_TENANTS', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      const insertPayload: Record<string, any> = {
        id: newT.id,
        name: newT.name,
        code: newT.code,
        slug: newT.slug,
        plan: newT.plan,
        tenant_number: newT.tenantNumber,
        status: newT.status,
        created_at: newT.createdAt
      };

      if (newT.address) insertPayload.address = newT.address;
      if (newT.provinceId) insertPayload.province_id = newT.provinceId;
      if (newT.provinceName) insertPayload.province_name = newT.provinceName;
      if (newT.regencyId) insertPayload.regency_id = newT.regencyId;
      if (newT.regencyName) insertPayload.regency_name = newT.regencyName;
      if (newT.districtId) insertPayload.district_id = newT.districtId;
      if (newT.districtName) insertPayload.district_name = newT.districtName;
      if (newT.villageId) insertPayload.village_id = newT.villageId;
      if (newT.villageName) insertPayload.village_name = newT.villageName;
      if (newT.postalCode) insertPayload.postal_code = newT.postalCode;
      if (newT.phone) insertPayload.phone = newT.phone;
      if (newT.email) insertPayload.email = newT.email;
      if (newT.npwp) insertPayload.npwp = newT.npwp;
      if (newT.website) insertPayload.website = newT.website;
      if (newT.description) insertPayload.description = newT.description;

      client
        .from('tenants')
        .upsert(insertPayload)
        .then(({ error }) => {
          if (error) {
            console.warn('Supabase tenant insert notice:', error.message);
            // Fallback retry with core columns if extra columns not yet migrated
            if (error.message.includes('column') || error.code === '42703') {
              client.from('tenants').upsert({
                id: newT.id,
                name: newT.name,
                code: newT.code,
                slug: newT.slug,
                plan: newT.plan,
                tenant_number: newT.tenantNumber,
                status: newT.status,
                created_at: newT.createdAt
              });
            }
          }
        });
    }

    addToast(
      'Tenant Baru Terdaftar',
      `Tenant ${newT.name} dengan Kode ${newT.tenantNumber} berhasil didaftarkan.`,
      'success'
    );

    return newT;
  };

  const updateTenant = async (tenantId: string, payload: Partial<Tenant>): Promise<boolean> => {
    try {
      setAllTenants((prev) => {
        const updated = prev.map((t) => (t.id === tenantId ? { ...t, ...payload } : t));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('ZYVORA_ALL_TENANTS', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      if (tenant.id === tenantId) {
        setTenant((prev) => ({ ...prev, ...payload }));
      }

      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        const updateData: Record<string, any> = {};
        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.code !== undefined) updateData.code = payload.code;
        if (payload.slug !== undefined) updateData.slug = payload.slug;
        if (payload.plan !== undefined) updateData.plan = payload.plan;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.tenantNumber !== undefined) updateData.tenant_number = payload.tenantNumber;

        // Address & Profile Details
        if (payload.address !== undefined) updateData.address = payload.address;
        if (payload.provinceId !== undefined) updateData.province_id = payload.provinceId;
        if (payload.provinceName !== undefined) updateData.province_name = payload.provinceName;
        if (payload.regencyId !== undefined) updateData.regency_id = payload.regencyId;
        if (payload.regencyName !== undefined) updateData.regency_name = payload.regencyName;
        if (payload.districtId !== undefined) updateData.district_id = payload.districtId;
        if (payload.districtName !== undefined) updateData.district_name = payload.districtName;
        if (payload.villageId !== undefined) updateData.village_id = payload.villageId;
        if (payload.villageName !== undefined) updateData.village_name = payload.villageName;
        if (payload.postalCode !== undefined) updateData.postal_code = payload.postalCode;
        if (payload.phone !== undefined) updateData.phone = payload.phone;
        if (payload.email !== undefined) updateData.email = payload.email;
        if (payload.npwp !== undefined) updateData.npwp = payload.npwp;
        if (payload.website !== undefined) updateData.website = payload.website;
        if (payload.description !== undefined) updateData.description = payload.description;

        const { error } = await client
          .from('tenants')
          .update(updateData)
          .eq('id', tenantId);

        if (error) {
          console.warn('Supabase tenant update notice:', error.message);
          if (error.message.includes('column') || error.code === '42703') {
            await client
              .from('tenants')
              .update({
                name: payload.name,
                code: payload.code,
                slug: payload.slug,
                plan: payload.plan,
                status: payload.status
              })
              .eq('id', tenantId);
          }
        }
      }

      addToast('Tenant Berhasil Diperbarui', `Data tenant berhasil disimpan ke sistem.`, 'success');
      return true;
    } catch (err: any) {
      addToast('Gagal Memperbarui Tenant', err.message || 'Terjadi kesalahan sistem.', 'error');
      return false;
    }
  };

  useEffect(() => {
    if (authenticatedUser?.tenantId) {
      const safeId = sanitizeTenantId(authenticatedUser.tenantId);
      const matched = allTenants.find((t) => t.id === safeId || t.code === safeId);
      if (matched) {
        setTenant(matched);
      } else {
        setTenant((prev) => ({
          ...prev,
          id: safeId
        }));
      }
    }
  }, [authenticatedUser?.tenantId, allTenants]);

  // Master Tenant Configurations & Profiles (Profil Perusahaan, Market/Bidang Usaha, Konfigurasi Sistem)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() =>
    TenantMasterService.getDefaultCompanyProfile(INITIAL_TENANT.id, INITIAL_TENANT.code)
  );
  const [marketProfile, setMarketProfile] = useState<TenantMarketProfile>(() =>
    TenantMasterService.getDefaultMarketProfile(INITIAL_TENANT.id)
  );
  const [systemConfig, setSystemConfig] = useState<TenantSystemConfig>(() =>
    TenantMasterService.getDefaultSystemConfig(INITIAL_TENANT.id)
  );

  const reloadTenantSettings = async () => {
    try {
      const [cp, mp, sc] = await Promise.all([
        TenantMasterService.getCompanyProfile(tenant.id, tenant.code),
        TenantMasterService.getMarketProfile(tenant.id),
        TenantMasterService.getSystemConfig(tenant.id)
      ]);
      setCompanyProfile(cp);
      setMarketProfile(mp);
      setSystemConfig(sc);
      if (cp.legalName || cp.brandName) {
        setTenant((prev) => ({
          ...prev,
          name: cp.legalName || cp.brandName || prev.name
        }));
      }
    } catch (err) {
      console.warn('Failed to load tenant settings:', err);
    }
  };

  useEffect(() => {
    reloadTenantSettings();
  }, [tenant.id, tenant.code]);

  const updateCompanyProfileState = (updated: CompanyProfile) => {
    setCompanyProfile(updated);
    if (updated.legalName || updated.brandName) {
      setTenant((prev) => ({
        ...prev,
        name: updated.legalName || updated.brandName || prev.name
      }));
    }
  };

  const updateMarketProfileState = (updated: TenantMarketProfile) => {
    setMarketProfile(updated);
  };

  const updateSystemConfigState = (updated: TenantSystemConfig) => {
    setSystemConfig(updated);
  };
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(INITIAL_BUSINESS_UNITS);
  const [activeBusinessUnitId, setActiveBusinessUnitId] = useState<string>(INITIAL_BUSINESS_UNITS[0].id);

  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>(INITIAL_BRANCHES[0].id);

  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);

  // Load business units & branches live from Supabase
  useEffect(() => {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      
      client
        .from('business_units')
        .select('*')
        .order('code', { ascending: true })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && data.length > 0) {
            const dbBUs: BusinessUnit[] = data.map((row: any) => ({
              id: row.id,
              tenantId: row.tenant_id,
              code: row.code,
              name: row.name,
              taxId: row.tax_id || '',
              currency: row.currency || 'IDR',
              isActive: Boolean(row.is_active)
            }));
            setBusinessUnits(dbBUs);
          }
        });

      client
        .from('branches')
        .select('*')
        .order('code', { ascending: true })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && data.length > 0) {
            const dbBranches: Branch[] = data.map((row: any) => ({
              id: row.id,
              businessUnitId: row.business_unit_id || '',
              code: row.code,
              name: row.name,
              city: row.city || '',
              address: row.address || '',
              phone: row.phone || '',
              isHeadquarters: Boolean(row.is_headquarters),
              codeSuffix: row.code_suffix || '',
              isActive: Boolean(row.is_active)
            }));
            setBranches(dbBranches);
          }
        });
    }
  }, []);

  // User Access & RBAC (Official 5 Roles & 2-3 char User Codes)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    return isSupabaseConfigured ? [] : INITIAL_USERS;
  });
  const [userRoleAudits, setUserRoleAudits] = useState<AuditLog[]>(INITIAL_ROLE_AUDITS);

  const userAccessRepo = useMemo(() => {
    const client = isSupabaseConfigured ? getSupabaseClient() : null;
    const fallbackList = isSupabaseConfigured ? [] : INITIAL_USERS;
    return new UserAccessRepository(client, fallbackList, INITIAL_ROLE_AUDITS);
  }, [isSupabaseConfigured]);

  const isCurrentUserSuperAdmin = Boolean(
    currentUser.isPlatformSuperAdmin || currentUser.role === 'super_admin'
  );

  // Initial clean route resolution from URL path
  const initialRoute = typeof window !== 'undefined' ? getRouteFromPath(window.location.pathname) : null;

  // Navigation & Workspace State (URL Clean Path First + LocalStorage Fallback)
  const [currentModule, setCurrentModule] = useState<NavigationModule>(() => {
    if (initialRoute) return initialRoute.module;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ZYVORA_ACTIVE_MODULE');
      if (saved) return saved as NavigationModule;
    }
    return 'dashboard';
  });
  const [activeFeatureId, setActiveFeatureId] = useState<string>(() => {
    if (initialRoute) return initialRoute.featureId;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ZYVORA_ACTIVE_FEATURE_ID');
      if (saved) return saved;
    }
    return 'dashboard';
  });
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(() => {
    if (initialRoute && initialRoute.accordionId !== undefined) return initialRoute.accordionId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ZYVORA_OPEN_ACCORDION_ID');
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Listen for browser Back/Forward navigation (HTML5 History API)
  useEffect(() => {
    const handlePopState = () => {
      const match = getRouteFromPath(window.location.pathname);
      if (match) {
        setCurrentModule(match.module);
        setActiveFeatureId(match.featureId);
        if (match.accordionId !== undefined) {
          setOpenAccordionId(match.accordionId);
        }
      } else {
        setCurrentModule('dashboard');
        setActiveFeatureId('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync URL on initial mount if on root or matching route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = getRouteFromPath(window.location.pathname);
      if (match) {
        const canonical = getPathForFeature(match.featureId, match.module);
        if (window.location.pathname !== canonical && window.location.pathname !== '/') {
          updateBrowserUrl(canonical, true);
        }
      }
    }
  }, []);

  /**
   * Mengatur ulang rute dan state navigasi langsung ke Dashboard
   * Wajib dijalankan saat login sukses dan saat logout agar tidak kembali ke menu lama.
   */
  const resetNavigationToDashboard = () => {
    setCurrentModule('dashboard');
    setActiveFeatureId('dashboard');
    setOpenAccordionId(null);
    setActiveTab('overview');
    setIsMobileSidebarOpen(false);
    updateBrowserUrl('/', true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ZYVORA_ACTIVE_MODULE');
        localStorage.removeItem('ZYVORA_ACTIVE_FEATURE_ID');
        localStorage.removeItem('ZYVORA_OPEN_ACCORDION_ID');
      } catch {}
    }
  };

  // Handlers for idle session timeout and cross-tab synchronization
  const handleIdleTimeout = async () => {
    resetNavigationToDashboard();
    SessionTimeoutService.clearActivityTimer();
    await AuthService.signOut();
    setAuthenticatedUser(null);
    setIsDevSandboxMode(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
    }
    setAuthError('Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 60 menit. Silakan masuk kembali.');
    setAuthStatus('unauthenticated');
    addToast('Sesi Berakhir (Idle 60 Menit)', 'Anda telah keluar secara otomatis karena tidak ada aktivitas selama 60 menit.', 'warning');
  };

  const handleCrossTabLogout = (reason: AuthLogoutReason) => {
    resetNavigationToDashboard();
    SessionTimeoutService.clearActivityTimer();
    setAuthenticatedUser(null);
    setIsDevSandboxMode(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
    }
    setAuthStatus('unauthenticated');
    if (reason === 'idle_timeout') {
      setAuthError('Sesi Anda telah berakhir secara otomatis di tab lain karena batas waktu tidak aktif 60 menit tercapai.');
      addToast('Sesi Berakhir', 'Sesi Anda ditutup karena batas waktu tidak aktif 60 menit tercapai di tab lain.', 'warning');
    } else {
      setAuthError(null);
      addToast('Sesi Berakhir', 'Sesi telah diakhiri di tab lain.', 'info');
    }
  };

  // Check and restore active Supabase Auth session with idle timeout verification
  const checkAuthSession = async () => {
    setAuthStatus('loading');
    setAuthError(null);

    // 1. Evaluate idle session timeout before allowing restored access
    if (SessionTimeoutService.isSessionTimedOut()) {
      SessionTimeoutService.clearActivityTimer();
      await AuthService.signOut();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
      }
      setAuthenticatedUser(null);
      setIsDevSandboxMode(false);
      setAuthError('Sesi Anda sebelumnya telah berakhir karena tidak ada aktivitas selama 60 menit. Silakan masuk kembali.');
      setAuthStatus('unauthenticated');
      return;
    }

    // 2. Check if dev sandbox simulation session exists in sessionStorage
    if (typeof window !== 'undefined') {
      const sandboxJson = sessionStorage.getItem('ZYVORA_DEV_SANDBOX_USER');
      if (sandboxJson) {
        try {
          const parsed = JSON.parse(sandboxJson);
          setAuthenticatedUser(parsed);
          setIsDevSandboxMode(true);
          SessionTimeoutService.recordUserActivity(true);
          setAuthStatus('authenticated');
          return;
        } catch {
          sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
        }
      }
    }

    if (!isSupabaseConfigured) {
      setAuthStatus('unauthenticated');
      return;
    }

    try {
      const session = await AuthService.getSession();
      if (!session || !session.user) {
        setAuthenticatedUser(null);
        setIsDevSandboxMode(false);
        setAuthStatus('unauthenticated');
        return;
      }

      const resolution = await AuthService.resolveUserProfile(session.user);
      if (resolution.status === 'authenticated' && resolution.profile) {
        setAuthenticatedUser(resolution.profile);
        setIsDevSandboxMode(false);
        SessionTimeoutService.recordUserActivity(true);
        setAuthStatus('authenticated');
      } else if (resolution.status === 'unassigned') {
        setAuthenticatedUser(null);
        setAuthError(resolution.error || 'Akun Anda belum memiliki penugasan tenant atau role.');
        setAuthStatus('unassigned');
      } else {
        setAuthenticatedUser(null);
        setAuthError(resolution.error || 'Profil pengguna tidak ditemukan.');
        setAuthStatus('unassigned');
      }
    } catch (err: unknown) {
      setAuthenticatedUser(null);
      setAuthError(err instanceof Error ? err.message : 'Kegagalan verifikasi sesi.');
      setAuthStatus('unauthenticated');
    }
  };

  // Subscribe to auth state changes on mount
  useEffect(() => {
    checkAuthSession();

    const { unsubscribe } = AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const resolution = await AuthService.resolveUserProfile(session.user);
        if (resolution.status === 'authenticated' && resolution.profile) {
          // Keep current active menu undisturbed during background auth events
          setAuthenticatedUser(resolution.profile);
          setIsDevSandboxMode(false);
          SessionTimeoutService.recordUserActivity(true);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unassigned');
          setAuthError(resolution.error || 'Akun Anda belum memiliki penugasan tenant.');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // CRITICAL GATE C1 RULE: Background token refresh MUST NOT reset the user idle timer!
        // We purposefully DO NOT call SessionTimeoutService.recordUserActivity() here.
      } else if (event === 'SIGNED_OUT') {
        resetNavigationToDashboard();
        setAuthenticatedUser(null);
        setIsDevSandboxMode(false);
        SessionTimeoutService.clearActivityTimer();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
        }
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Activate SessionTimeoutService & fetch live users when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return;
    }

    refreshUsers();

    const cleanup = SessionTimeoutService.init({
      onIdleTimeout: handleIdleTimeout,
      onCrossTabLogout: handleCrossTabLogout
    });

    return () => {
      cleanup();
    };
  }, [authStatus]);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    const res = await AuthService.signIn(email, password);
    if (!res.success) {
      setAuthError(res.error || 'Gagal masuk ke sistem');
      return { success: false, error: res.error };
    }

    if (res.user) {
      const resolution = await AuthService.resolveUserProfile(res.user);
      if (resolution.status === 'authenticated' && resolution.profile) {
        resetNavigationToDashboard();
        setAuthenticatedUser(resolution.profile);
        setIsDevSandboxMode(false);
        SessionTimeoutService.resetActivityTimer();
        SessionTimeoutService.broadcastAuthEvent({
          type: 'AUTH_LOGIN',
          timestamp: Date.now()
        });
        setAuthStatus('authenticated');
        addToast('Autentikasi Berhasil', `Selamat datang kembali, ${resolution.profile.fullName}.`, 'success');
        return { success: true };
      } else {
        setAuthStatus('unassigned');
        setAuthError(resolution.error || 'Akun Anda belum memiliki penugasan tenant.');
        return { success: true };
      }
    }
    return { success: true };
  };

  const logout = async () => {
    // 0. Reset navigation state to dashboard immediately
    resetNavigationToDashboard();

    // 1. Broadcast logout event to synchronize other open browser tabs
    SessionTimeoutService.broadcastAuthEvent({
      type: 'AUTH_LOGOUT',
      reason: 'manual',
      timestamp: Date.now()
    });

    // 2. Clear activity tracking & sensitive storage
    SessionTimeoutService.clearActivityTimer();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ZYVORA_DEV_SANDBOX_USER');
    }

    // 3. Supabase SignOut
    await AuthService.signOut();
    setAuthenticatedUser(null);
    setIsDevSandboxMode(false);
    setAuthStatus('unauthenticated');
    addToast('Sesi Berakhir', 'Anda telah keluar dari sistem secara aman.', 'info');
  };

  const resetPassword = async (email: string) => {
    const res = await AuthService.resetPassword(email);
    return res;
  };

  const loginAsDevSandboxUser = (mockUser: UserProfile) => {
    resetNavigationToDashboard();
    setAuthenticatedUser(mockUser);
    setIsDevSandboxMode(true);
    SessionTimeoutService.resetActivityTimer();
    SessionTimeoutService.broadcastAuthEvent({
      type: 'AUTH_LOGIN',
      timestamp: Date.now()
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ZYVORA_DEV_SANDBOX_USER', JSON.stringify(mockUser));
    }
    setAuthStatus('authenticated');
    addToast('Mode Simulasi Sandbox Aktif', `Masuk sebagai ${mockUser.fullName} (${mockUser.roleTitle}).`, 'info');
  };

  const refreshUsers = async (filter?: UserFilter) => {
    try {
      const list = await userAccessRepo.getUsers(filter);
      setUsers(list);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const updateUserRole = async (targetUserId: string, newRole: OfficialRole, reason: string) => {
    const res = await userAccessRepo.assignUserRole(currentUser, targetUserId, newRole, reason);
    const updatedUsers = await userAccessRepo.getUsers();
    setUsers(updatedUsers);
    if (res.auditLog) {
      setUserRoleAudits((prev) => [res.auditLog!, ...prev]);
      setAuditLogs((prev) => [res.auditLog!, ...prev]);
    }
    addToast('Role Berhasil Diperbarui', res.message, 'success');
  };

  const toggleUserStatus = async (targetUserId: string, status: 'active' | 'inactive', reason: string) => {
    const res = await userAccessRepo.toggleUserStatus(currentUser, targetUserId, status, reason);
    const updatedUsers = await userAccessRepo.getUsers();
    setUsers(updatedUsers);
    if (res.auditLog) {
      setUserRoleAudits((prev) => [res.auditLog!, ...prev]);
      setAuditLogs((prev) => [res.auditLog!, ...prev]);
    }
    addToast('Status Akun Diperbarui', res.message, 'success');
  };

  const inviteUser = async (data: CreateUserPayload): Promise<UserProfile> => {
    const res = await userAccessRepo.createUser(currentUser, data);
    if (res.user) {
      const updatedUsers = await userAccessRepo.getUsers();
      setUsers(updatedUsers);
      if (res.auditLog) {
        setUserRoleAudits((prev) => [res.auditLog!, ...prev]);
        setAuditLogs((prev) => [res.auditLog!, ...prev]);
      }
      addToast('Pengguna Ditambahkan', res.message, 'success');
      return res.user;
    }
    throw new Error(res.message);
  };

  const updateUserProfile = async (
    targetUserId: string,
    payload: { fullName?: string; phone?: string; role?: OfficialRole; tenantId?: string; status?: 'active' | 'inactive' }
  ) => {
    const res = await userAccessRepo.updateUserProfile(currentUser, targetUserId, payload);
    const updatedUsers = await userAccessRepo.getUsers();
    setUsers(updatedUsers);
    if (res.auditLog) {
      setUserRoleAudits((prev) => [res.auditLog!, ...prev]);
      setAuditLogs((prev) => [res.auditLog!, ...prev]);
    }
    addToast('Data Pengguna Diperbarui', res.message, 'success');
  };

  const deleteUser = async (targetUserId: string, permanent: boolean = false, reason: string = '') => {
    const res = await userAccessRepo.deleteUser(currentUser, targetUserId, permanent, reason);
    const updatedUsers = await userAccessRepo.getUsers();
    setUsers(updatedUsers);
    if (res.auditLog) {
      setUserRoleAudits((prev) => [res.auditLog!, ...prev]);
      setAuditLogs((prev) => [res.auditLog!, ...prev]);
    }
    addToast('Pengguna Diproses', res.message, permanent ? 'info' : 'warning');
  };

  // Dynamic Realtime Database Navigation State
  const [navigationGroups, setNavigationGroups] = useState<NavGroup[]>(NAVIGATION_CONFIG);
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);

  const refreshNavigation = async () => {
    try {
      const items = await NavigationService.fetchNavigationItems(tenant.id);
      const groups = NavigationService.buildNavGroups(items, currentUser.role, isCurrentUserSuperAdmin);
      setNavigationGroups(groups);
    } catch (e) {
      console.warn('Navigation refresh error:', e);
    }
  };

  const toggleMenuStatus = async (itemId: string, isReady: boolean): Promise<boolean> => {
    try {
      const res = await NavigationService.setMenuReadyStatus(itemId, isReady, currentUser);
      if (res.success) {
        addToast('Status Menu Diperbarui', res.message, 'success');
        await refreshNavigation();
        return true;
      } else {
        addToast('Akses Ditolak', res.message, 'error');
        return false;
      }
    } catch (err: any) {
      addToast('Kesalahan Sistem', err.message || 'Gagal mengubah status menu', 'error');
      return false;
    }
  };

  useEffect(() => {
    refreshNavigation();
  }, [currentUser.role, isCurrentUserSuperAdmin, tenant.id]);

  const navigateToFeature = (featureId: string) => {
    const persistRoute = (mod: NavigationModule, feat: string, acc: string | null = null) => {
      setCurrentModule(mod);
      setActiveFeatureId(feat);
      setOpenAccordionId(acc);
      setIsMobileSidebarOpen(false);

      const targetPath = getPathForFeature(feat, mod);
      updateBrowserUrl(targetPath, false);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ZYVORA_ACTIVE_MODULE', mod);
          localStorage.setItem('ZYVORA_ACTIVE_FEATURE_ID', feat);
          if (acc) localStorage.setItem('ZYVORA_OPEN_ACCORDION_ID', acc);
          else localStorage.removeItem('ZYVORA_OPEN_ACCORDION_ID');
        } catch {}
      }
    };

    if (featureId === 'tenant') {
      featureId = 'master_company_profile';
    }

    if (featureId === 'dashboard') {
      persistRoute('dashboard', 'dashboard', null);
      return;
    }

    if (
      featureId === 'superadmin_menu_governance' ||
      featureId === 'superadmin_connections' ||
      featureId.startsWith('superadmin_')
    ) {
      persistRoute('super_admin', featureId, null);
      return;
    }

    if (featureId.startsWith('cash_') || featureId === 'cash_claim_expense') {
      persistRoute('cash_management', featureId, 'cash_management');
      return;
    }

    if (featureId.startsWith('approval_') || featureId === 'approval') {
      persistRoute('approval', featureId, 'approval');
      return;
    }

    for (const group of navigationGroups) {
      if (group.items) {
        for (const item of group.items) {
          if (item.id === featureId) {
            // Guard: Item nonaktif tidak boleh diakses oleh non-Super Admin
            if (!item.isReady && !isCurrentUserSuperAdmin) {
              addToast('Fitur Belum Tersedia', 'Menu ini sedang dalam pemeliharaan berkala (maintenance).', 'warning');
              return;
            }
            persistRoute(group.id as NavigationModule, featureId, group.id);
            return;
          }

          if (item.children) {
            const childFound = item.children.find((child) => child.id === featureId);
            if (childFound) {
              // Guard: Item anak nonaktif tidak boleh diakses oleh non-Super Admin
              if (!childFound.isReady && !isCurrentUserSuperAdmin) {
                addToast('Fitur Belum Tersedia', 'Menu ini sedang dalam pemeliharaan berkala (maintenance).', 'warning');
                return;
              }
              persistRoute(group.id as NavigationModule, featureId, group.id);
              return;
            }
          }
        }
      }
    }

    persistRoute(currentModule, featureId, openAccordionId);
  };

  // Known mock/dummy IDs purged from production database
  const KNOWN_DUMMY_IDS = useMemo(() => new Set([
    'c001', 'c002', 'c003',
    'cust_01', 'cust_02', 'cust_03', 'cust_04', 'cust_05', 'cust_06',
    'so_001', 'so_002',
    'sb_001', 'sb_002', 'sb_003', 'sb_004', 'sb_005', 'sb_006',
    'inv_001', 'inv_002', 'inv_003'
  ]), []);

  // Operational Data & Master Catalogs (Strict Cloud-First Clean State)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ZYVORA_CUSTOMERS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((c: any) => 
              c.id?.startsWith('cust_') &&
              !['XPB3R', 'CUST-001', 'CUST-002', 'CUST-003', 'F5N6Y', 'T2Z9Q', 'W4M1T', 'K9X2B', 'P8L3R'].includes(c.customerCode)
            );
            return clean;
          }
        }
      } catch {}
    }
    return [];
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => INITIAL_VENDORS);
  const [products, setProducts] = useState<Product[]>(() => INITIAL_PRODUCTS);

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ZYVORA_SALES_ORDERS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((o: any) => !['so_001', 'so_002'].includes(o.id));
            return clean;
          }
        }
      } catch {}
    }
    return [];
  });

  const [serviceBookings, setServiceBookings] = useState<ServiceBookingOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ZYVORA_SERVICE_BOOKINGS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((b: any) => !b.id?.startsWith('sb_00'));
            return clean;
          }
        }
      } catch {}
    }
    return [];
  });

  const [invoices, setInvoices] = useState<SalesInvoice[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ZYVORA_INVOICES');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((i: any) => !i.id?.startsWith('inv_00'));
            return clean;
          }
        }
      } catch {}
    }
    return [];
  });

  const [receivePayments, setReceivePayments] = useState<ReceivePayment[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ZYVORA_RECEIVE_PAYMENTS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Synchronize Operational Data to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ZYVORA_CUSTOMERS', JSON.stringify(customers));
      } catch {}
    }
  }, [customers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ZYVORA_SALES_ORDERS', JSON.stringify(salesOrders));
      } catch {}
    }
  }, [salesOrders]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ZYVORA_SERVICE_BOOKINGS', JSON.stringify(serviceBookings));
      } catch {}
    }
  }, [serviceBookings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ZYVORA_INVOICES', JSON.stringify(invoices));
      } catch {}
    }
  }, [invoices]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ZYVORA_RECEIVE_PAYMENTS', JSON.stringify(receivePayments));
      } catch {}
    }
  }, [receivePayments]);

  // -------------------------------------------------------------
  // SUPABASE REALTIME CLOUD HYDRATION
  // Authoritatively pulls data from Supabase Cloud on mount & tenant switch
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const targetTenantId = tenant?.id || 'ten_zyvora_corp';
    let isMounted = true;

    const hydrateFromCloud = async () => {
      try {
        const [
          cloudCustomers,
          cloudBookings,
          cloudOrders,
          cloudInvoices,
          cloudPayments,
          cloudMovements,
          cloudPOs,
          cloudJournals
        ] = await Promise.all([
          fetchCustomersFromSupabase(targetTenantId),
          fetchServiceBookingsFromSupabase(targetTenantId),
          fetchSalesOrdersFromSupabase(targetTenantId),
          fetchInvoicesFromSupabase(targetTenantId),
          fetchReceivePaymentsFromSupabase(targetTenantId),
          fetchStockMovementsFromSupabase(targetTenantId),
          fetchPurchaseOrdersFromSupabase(targetTenantId),
          fetchJournalEntriesFromSupabase(targetTenantId)
        ]);

        if (!isMounted) return;

        setCustomers(cloudCustomers);
        setServiceBookings(cloudBookings);
        setSalesOrders(cloudOrders);
        setInvoices(cloudInvoices);
        setReceivePayments(cloudPayments);
        if (cloudMovements && cloudMovements.length > 0) setStockMovements(cloudMovements);
        if (cloudPOs && cloudPOs.length > 0) setPurchaseOrders(cloudPOs);
        if (cloudJournals && cloudJournals.length > 0) setJournalEntries(cloudJournals);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('ZYVORA_CUSTOMERS', JSON.stringify(cloudCustomers));
            localStorage.setItem('ZYVORA_SERVICE_BOOKINGS', JSON.stringify(cloudBookings));
            localStorage.setItem('ZYVORA_SALES_ORDERS', JSON.stringify(cloudOrders));
            localStorage.setItem('ZYVORA_INVOICES', JSON.stringify(cloudInvoices));
            localStorage.setItem('ZYVORA_RECEIVE_PAYMENTS', JSON.stringify(cloudPayments));
          } catch {}
        }
      } catch (err) {
        console.warn('[ErpContext] Supabase cloud hydration error:', err);
      }
    };

    hydrateFromCloud();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => INITIAL_FINANCIAL_ACCOUNTS);
  const [taxes, setTaxes] = useState<TaxRule[]>(() => INITIAL_TAXES);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => INITIAL_BANK_ACCOUNTS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => INITIAL_PAYMENT_METHODS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(() => INITIAL_CORE_EMPLOYEES);

  // Collectors dynamically mapped strictly from registered employees
  const collectors = useMemo<Collector[]>(() => {
    return employees.map((emp, idx) => ({
      id: `col_${emp.id}`,
      code: emp.employeeCode ? `COL-${emp.employeeCode.slice(-3)}` : `COL-${String(idx + 1).padStart(2, '0')}`,
      name: `${emp.fullName}${emp.position ? ` (${emp.position})` : ''}`,
      phone: emp.phone || '',
      branchId: emp.branchId || 'br_jkt_hq',
      status: emp.status === 'active' ? ('active' as const) : ('inactive' as const)
    }));
  }, [employees]);

  // One-time scrubber for legacy dummy localStorage data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const claimsKey = 'ZYVORA_EXPENSE_CLAIMS_CACHE';
        const claims = localStorage.getItem(claimsKey);
        if (claims) {
          const parsed = JSON.parse(claims);
          const filtered = (parsed || []).filter((c: any) => !c.id.startsWith('claim_demo_'));
          localStorage.setItem(claimsKey, JSON.stringify(filtered));
        }
      } catch {}
    }
  }, []);

  const refreshEmployees = useCallback(async (): Promise<Employee[]> => {
    try {
      const list = await EmployeeService.getEmployees(tenant.id);
      if (list && list.length > 0) {
        setEmployees(list);
        return list;
      }
    } catch (err) {
      console.warn('[ErpContext] refreshEmployees notice:', err);
    }
    return employees;
  }, [tenant.id, employees]);

  useEffect(() => {
    refreshEmployees();
  }, [tenant.id]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const recordAuditLog = (audit: AuditLog) => {
    setAuditLogs((prev) => [audit, ...prev]);
    syncAuditLogToSupabase(audit);
  };

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Supabase Connection Diagnostics
  const [supabaseConnection, setSupabaseConnection] = useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  const runConnectionTest = async (): Promise<ConnectionTestResult> => {
    setIsTestingConnection(true);
    try {
      const res = await testSupabaseConnection();
      setSupabaseConnection(res);
      if (res.isConnected) {
        addToast('Supabase Terhubung', `Latensi: ${res.latencyMs}ms (${res.targetUrl})`, 'success');
      } else if (res.isConfigured) {
        addToast('Koneksi Supabase Gagal', res.error || 'Terjadi kesalahan jaringan', 'error');
      } else {
        addToast('Konfigurasi Supabase', 'Publishable key belum diisi di environment variables', 'info');
      }
      return res;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Run quiet connection check on mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      testSupabaseConnection().then(setSupabaseConnection);
    }
  }, []);

  // Load & Hydrate Operational Data from Supabase when Supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured || !tenant?.id) return;

    let isMounted = true;

    const loadAllFromSupabase = async () => {
      try {
        const [
          dbCustomers,
          dbBookings,
          dbSalesOrders,
          dbInvoices,
          dbPayments,
          dbProducts,
          dbVendors
        ] = await Promise.all([
          fetchCustomersFromSupabase(tenant.id),
          fetchServiceBookingsFromSupabase(tenant.id),
          fetchSalesOrdersFromSupabase(tenant.id),
          fetchInvoicesFromSupabase(tenant.id),
          fetchReceivePaymentsFromSupabase(tenant.id),
          fetchProductsFromSupabase(tenant.id),
          fetchVendorsFromSupabase(tenant.id)
        ]);

        if (!isMounted) return;

        // 1. Customers
        const cleanDbCustomers = dbCustomers.filter((c) => !KNOWN_DUMMY_IDS.has(c.id));
        setCustomers(cleanDbCustomers);

        // 2. Service Bookings
        const cleanDbBookings = dbBookings.filter((b) => !KNOWN_DUMMY_IDS.has(b.id));
        setServiceBookings(cleanDbBookings);

        // 3. Sales Orders
        const cleanDbSalesOrders = dbSalesOrders.filter((o) => !KNOWN_DUMMY_IDS.has(o.id));
        setSalesOrders(cleanDbSalesOrders);

        // 4. Invoices
        const cleanDbInvoices = dbInvoices.filter((i) => !KNOWN_DUMMY_IDS.has(i.id));
        setInvoices(cleanDbInvoices);

        // 5. Receive Payments
        if (dbPayments.length > 0) {
          setReceivePayments(dbPayments);
        }

        // 6. Products
        if (dbProducts.length > 0) {
          setProducts(dbProducts);
        }

        // 7. Vendors
        if (dbVendors.length > 0) {
          setVendors(dbVendors);
        }
      } catch (err) {
        console.warn('[Supabase Sync] Failed to load data from Supabase:', err);
      }
    };

    loadAllFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  const activeBusinessUnits = useMemo(() => {
    return businessUnits.filter((bu) => bu.isActive);
  }, [businessUnits]);

  const activeBusinessUnit = useMemo(() => {
    return (
      businessUnits.find((b) => b.id === activeBusinessUnitId && b.isActive) ||
      businessUnits.find((b) => b.isActive) ||
      businessUnits[0]
    );
  }, [businessUnits, activeBusinessUnitId]);

  const activeBranches = useMemo(() => {
    const activeBuSet = new Set(businessUnits.filter((b) => b.isActive).map((b) => b.id));
    return branches.filter((br) => br.isActive && (activeBuSet.size === 0 || activeBuSet.has(br.businessUnitId)));
  }, [branches, businessUnits]);

  const activeBranch = useMemo(() => {
    return (
      branches.find((br) => br.id === activeBranchId && br.isActive) ||
      branches.find((br) => br.isActive) ||
      branches[0]
    );
  }, [branches, activeBranchId]);

  // Section 6 Rule: Customer Code must be EXACTLY 5 characters uppercase alphanumeric, unique, auto-generated, immutable
  const generateCustomerCode = (): string => {
    const existingCodes = customers.map((c) => c.customerCode);
    return generateCustomerCodeCandidate(existingCodes);
  };

  // Section 6 Rule: Transaction number follows Prefix + YYYYMM + 6 digit sequence (e.g. SO-202610-000105)
  const generateSequenceNumber = (prefix: string): string => {
    let count = 1;
    if (prefix === 'SO') {
      count = salesOrders.length + 101;
    } else if (prefix === 'PO') {
      count = purchaseOrders.length + 41;
    } else if (prefix === 'MUT') {
      count = stockMovements.length + 86;
    } else if (prefix === 'JV') {
      count = journalEntries.length + 214;
    } else {
      count = Math.floor(Math.random() * 900) + 100;
    }
    return generateCanonicalSequence(prefix, count, new Date());
  };

  const createCustomer = (
    data: Omit<Customer, 'id' | 'tenantId' | 'customerCode' | 'createdAt' | 'totalOrders' | 'outstandingBalance'> & { preferredCode?: string }
  ): Customer => {
    let finalCode = data.preferredCode ? data.preferredCode.trim().toUpperCase() : '';
    
    if (finalCode) {
      const validation = validateCustomerCode(finalCode);
      if (!validation.isValid) {
        throw new Error(`Customer Code tidak valid: ${validation.error}`);
      }
      const isDuplicate = customers.some((c) => c.customerCode === finalCode);
      if (isDuplicate) {
        throw new Error(`Customer Code [${finalCode}] sudah terdaftar. Silakan gunakan tombol Acak Ulang untuk memperoleh kode baru.`);
      }
    } else {
      finalCode = generateCustomerCode();
    }

    const { preferredCode: _, ...customerFields } = data;

    const newCustomer: Customer = {
      ...customerFields,
      id: `cust_${Date.now()}`,
      tenantId: sanitizeTenantId(tenant.id || 'ten_hizaki_wedding'),
      customerCode: finalCode,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      outstandingBalance: 0
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    syncCustomerToSupabase(newCustomer).then((syncRes) => {
      if (!syncRes.success) {
        console.error('[Supabase Sync Error]', syncRes.error);
        addToast('Peringatan Database', `Pelanggan tersimpan lokal, namun sinkronisasi cloud: ${syncRes.error}`, 'warning');
      }
    });

    // Audit log
    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'Customer',
      entityId: finalCode,
      description: `Mendaftarkan pelanggan baru ${newCustomer.companyName} (${finalCode})`,
      ipAddress: '182.253.18.92'
    };
    recordAuditLog(audit);

    return newCustomer;
  };

  const updateCustomer = (id: string, data: Partial<Customer>): Customer => {
    let updatedCustomer: Customer | null = null;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedCustomer = { ...c, ...data };
          return updatedCustomer;
        }
        return c;
      })
    );
    if (!updatedCustomer) throw new Error(`Customer with id ${id} not found.`);
    syncCustomerToSupabase(updatedCustomer);
    return updatedCustomer;
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteCustomerFromSupabase(id);
  };

  const generateServiceBookingNumberCandidate = (): string => {
    const tenantSeq = tenant.tenantNumber || '001';
    const nextSeq = Math.max(serviceBookings.length, salesOrders.length) + 1;
    return generateSalesOrderNumber(tenantSeq, nextSeq, new Date());
  };

  const createServiceBooking = (
    data: Omit<ServiceBookingOrder, 'id' | 'tenantId' | 'bookingNumber' | 'createdAt'> & { preferredBookingNumber?: string }
  ): ServiceBookingOrder => {
    let finalNumber = data.preferredBookingNumber ? data.preferredBookingNumber.trim().toUpperCase() : '';

    if (finalNumber) {
      const validation = validateSalesOrderOrBookingNumber(finalNumber);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid booking number format.');
      }
      const isDuplicate = serviceBookings.some((b) => b.bookingNumber === finalNumber);
      if (isDuplicate) {
        throw new Error(`Booking number [${finalNumber}] is already assigned.`);
      }
    } else {
      finalNumber = generateServiceBookingNumberCandidate();
    }

    const { preferredBookingNumber: _, ...fields } = data;

    const safeCustomerName = (fields.customerName && fields.customerName.trim()) || 'Pelanggan Umum';
    const safeBookingDate = (fields.bookingDate && fields.bookingDate.trim()) || new Date().toISOString().split('T')[0];
    const safeEventTitle = (fields.eventTitle && fields.eventTitle.trim()) || `Pesanan ${safeCustomerName}`;
    const safeEventDate = (fields.eventDate && fields.eventDate.trim()) || safeBookingDate;

    const newBooking: ServiceBookingOrder = {
      ...fields,
      customerName: safeCustomerName,
      bookingDate: safeBookingDate,
      eventTitle: safeEventTitle,
      eventDate: safeEventDate,
      id: `sb_${Date.now()}`,
      tenantId: sanitizeTenantId(tenant.id || 'ten_hizaki_wedding'),
      bookingNumber: finalNumber,
      createdAt: new Date().toISOString()
    };

    setServiceBookings((prev) => [newBooking, ...prev]);
    syncServiceBookingToSupabase(newBooking).then((syncRes) => {
      if (!syncRes.success) {
        console.error('[Supabase Sync Error]', syncRes.error);
        addToast('Peringatan Database', `Pesanan tersimpan lokal, namun sinkronisasi cloud: ${syncRes.error}`, 'warning');
      }
    });

    // Audit log
    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'SalesOrder',
      entityId: finalNumber,
      description: `Created service booking order ${finalNumber} for event: ${newBooking.eventTitle}`,
      ipAddress: '127.0.0.1'
    };
    recordAuditLog(audit);

    return newBooking;
  };

  const updateServiceBooking = (id: string, data: Partial<ServiceBookingOrder>): ServiceBookingOrder => {
    let updatedBooking: ServiceBookingOrder | null = null;

    setServiceBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          updatedBooking = {
            ...b,
            ...data,
            updatedAt: new Date().toISOString()
          };
          return updatedBooking;
        }
        return b;
      })
    );

    if (!updatedBooking) {
      throw new Error(`Service booking order with id ${id} not found.`);
    }

    syncServiceBookingToSupabase(updatedBooking).then((res) => {
      if (res && !res.success) {
        console.error('[Supabase Sync Error]', res.error);
        addToast('Peringatan Database', `Pembaruan tersimpan lokal, namun sinkronisasi database: ${res.error}`, 'warning');
      }
    });
    return updatedBooking;
  };

  const deleteServiceBooking = (id: string) => {
    setServiceBookings((prev) => prev.filter((b) => b.id !== id));
    deleteServiceBookingFromSupabase(id);
  };

  const generateSalesOrderNumberCandidate = (): string => {
    const tenantSeq = tenant.tenantNumber || '001';
    const nextSeq = Math.max(salesOrders.length, serviceBookings.length) + 1;
    return generateSalesOrderNumber(tenantSeq, nextSeq, new Date());
  };

  const createSalesOrder = (
    data: Omit<SalesOrder, 'id' | 'tenantId' | 'businessUnitId' | 'branchId' | 'orderNumber' | 'createdAt'> & {
      preferredOrderNumber?: string;
      businessUnitId?: string;
      branchId?: string;
    }
  ): SalesOrder => {
    const finalNumber = data.preferredOrderNumber || generateSalesOrderNumberCandidate();
    const validation = validateSalesOrderNumber(finalNumber);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid Sales Order number format.');
    }

    const newOrder: SalesOrder = {
      ...data,
      id: `so_${Date.now()}`,
      tenantId: sanitizeTenantId(tenant.id),
      businessUnitId: data.businessUnitId || activeBusinessUnit.id,
      branchId: data.branchId || activeBranch.id,
      orderNumber: finalNumber,
      status: data.status || 'open',
      createdAt: new Date().toISOString()
    };

    setSalesOrders((prev) => [newOrder, ...prev]);
    syncSalesOrderToSupabase(newOrder).then((res) => {
      if (res && !res.success) {
        console.error('[Supabase Sync Error]', res.error);
        addToast('Peringatan Database', `Sales Order tersimpan lokal, namun sinkronisasi database: ${res.error}`, 'warning');
      }
    });

    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'SalesOrder',
      entityId: finalNumber,
      description: `Created Sales Order ${finalNumber} for customer ${newOrder.customerName}`,
      ipAddress: '127.0.0.1'
    };
    recordAuditLog(audit);

    addToast('Sales Order Created', `Order ${finalNumber} created with status OPEN.`, 'success');
    return newOrder;
  };

  const updateSalesOrder = (id: string, data: Partial<SalesOrder>): SalesOrder => {
    let updatedOrder: SalesOrder | null = null;
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          updatedOrder = { ...o, ...data };
          return updatedOrder;
        }
        return o;
      })
    );
    if (!updatedOrder) throw new Error(`Sales Order with id ${id} not found.`);
    syncSalesOrderToSupabase(updatedOrder);
    return updatedOrder;
  };

  const deleteSalesOrder = (id: string) => {
    setSalesOrders((prev) => prev.filter((o) => o.id !== id));
    deleteSalesOrderFromSupabase(id);
  };

  const generateSalesInvoiceNumberCandidate = (): string => {
    const tenantSeq = tenant.tenantNumber || '001';
    const nextSeq = invoices.length + 1;
    return generateSalesInvoiceNumber(tenantSeq, nextSeq, new Date());
  };

  const createSalesInvoice = (
    data: Omit<SalesInvoice, 'id' | 'tenantId' | 'invoiceNumber' | 'createdAt'> & {
      preferredInvoiceNumber?: string;
    }
  ): SalesInvoice => {
    const finalNumber = data.preferredInvoiceNumber || generateSalesInvoiceNumberCandidate();
    const validation = validateSalesInvoiceNumber(finalNumber);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid Invoice number format.');
    }

    const newInvoice: SalesInvoice = {
      ...data,
      id: `inv_${Date.now()}`,
      tenantId: sanitizeTenantId(tenant.id),
      invoiceNumber: finalNumber,
      status: data.status || 'unpaid',
      createdAt: new Date().toISOString()
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    syncInvoiceToSupabase(newInvoice);

    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'SalesOrder',
      entityId: finalNumber,
      description: `Generated Commercial Invoice ${finalNumber} for order ${newInvoice.sourceNumber}`,
      ipAddress: '127.0.0.1'
    };
    recordAuditLog(audit);

    addToast('Invoice Generated', `Commercial Invoice ${finalNumber} has been generated.`, 'success');
    return newInvoice;
  };

  const deleteSalesInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    deleteInvoiceFromSupabase(id);
  };

  const createReceivePayment = (
    data: Omit<ReceivePayment, 'id' | 'tenantId' | 'paymentNumber' | 'sysNumber' | 'createdAt'> & {
      preferredPaymentNumber?: string;
    }
  ): ReceivePayment => {
    const nextSeq = receivePayments.length + 1;
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const finalNumber =
      data.preferredPaymentNumber ||
      `RP${data.branchCode || '01'}${yearMonth}${String(nextSeq).padStart(5, '0')}`;
    const sysNumber = `SYS-RP-${yearMonth}-${String(nextSeq).padStart(4, '0')}`;

    const newPayment: ReceivePayment = {
      ...data,
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tenantId: sanitizeTenantId(tenant.id),
      paymentNumber: finalNumber,
      sysNumber,
      isChecked: data.isChecked ?? (data.status === 'approved'),
      isDeposited: false,
      approvedAt: data.status === 'approved' ? (data.approvedAt || new Date().toISOString()) : undefined,
      approvedBy: data.status === 'approved' ? (data.approvedBy || currentUser.fullName) : undefined,
      createdAt: new Date().toISOString()
    };

    // If status is approved, instantly settle the targeted invoices
    if (newPayment.status === 'approved' && newPayment.allocations.length > 0) {
      setInvoices((prev) =>
        prev.map((inv) => {
          const matchedAlloc = newPayment.allocations.find(
            (a) => a.invoiceId === inv.id || a.invoiceNumber === inv.invoiceNumber
          );
          if (matchedAlloc) {
            const newPaid = inv.paidAmount + matchedAlloc.paidAmount;
            const newOutstanding = Math.max(0, inv.totalAmount - newPaid);
            const updated = {
              ...inv,
              paidAmount: newPaid,
              outstandingBalance: newOutstanding,
              status: (newOutstanding === 0 ? 'paid' : 'partially_paid') as SalesInvoice['status']
            };
            syncInvoiceToSupabase(updated);
            return updated;
          }
          return inv;
        })
      );
    }

    setReceivePayments((prev) => [newPayment, ...prev]);
    syncReceivePaymentToSupabase(newPayment).then((res) => {
      if (res && !res.success) {
        console.error('[Supabase Sync Error]', res.error);
        addToast('Peringatan Database', `Penerimaan tersimpan lokal, namun sinkronisasi database: ${res.error}`, 'warning');
      }
    });

    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'ReceivePayment',
      entityId: newPayment.id,
      description: `Mencatat Receive Payment ${finalNumber} senilai Rp ${newPayment.totalPaymentAmount.toLocaleString('id-ID')} untuk ${newPayment.customerName}`,
      ipAddress: '127.0.0.1'
    };
    recordAuditLog(audit);

    addToast(
      'Penerimaan Pembayaran Disimpan',
      `Bukti pembayaran ${finalNumber} senilai Rp ${newPayment.totalPaymentAmount.toLocaleString('id-ID')} berhasil dicatat.`,
      'success'
    );
    return newPayment;
  };

  const approveReceivePayment = (paymentId: string) => {
    let targetUpdated: ReceivePayment | null = null;
    setReceivePayments((prev) =>
      prev.map((rp) => {
        if (rp.id === paymentId) {
          // Settle targeted invoices if any
          if (rp.allocations.length > 0) {
            setInvoices((prevInv) =>
              prevInv.map((inv) => {
                const matchedAlloc = rp.allocations.find(
                  (a) => a.invoiceId === inv.id || a.invoiceNumber === inv.invoiceNumber
                );
                if (matchedAlloc) {
                  const newPaid = inv.paidAmount + matchedAlloc.paidAmount;
                  const newOutstanding = Math.max(0, inv.totalAmount - newPaid);
                  const updatedInv = {
                    ...inv,
                    paidAmount: newPaid,
                    outstandingBalance: newOutstanding,
                    status: (newOutstanding === 0 ? 'paid' : 'partially_paid') as SalesInvoice['status']
                  };
                  syncInvoiceToSupabase(updatedInv);
                  return updatedInv;
                }
                return inv;
              })
            );
          }

          targetUpdated = {
            ...rp,
            status: 'approved',
            isChecked: true,
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.fullName
          };
          syncReceivePaymentToSupabase(targetUpdated);
          return targetUpdated;
        }
        return rp;
      })
    );

    addToast(
      'Pembayaran Disetujui (Approved)',
      `Dokumen pembayaran telah disetujui dan saldo faktur berhasil diperbarui.`,
      'success'
    );
  };

  const createProduct = (data: Product) => {
    setProducts((prev) => [data, ...prev]);
    syncProductToSupabase(data);
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...data };
          syncProductToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProductFromSupabase(id);
  };

  const createVendor = (data: Vendor) => {
    setVendors((prev) => [data, ...prev]);
    syncVendorToSupabase(data);
  };

  const updateVendor = (id: string, data: Partial<Vendor>) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, ...data };
          syncVendorToSupabase(updated);
          return updated;
        }
        return v;
      })
    );
  };

  const deleteVendor = (id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    deleteVendorFromSupabase(id);
  };

  const createStockMovement = (
    data: Omit<StockMovement, 'id' | 'tenantId' | 'movementNumber' | 'date' | 'createdBy'>
  ): StockMovement => {
    const movementNumber = generateSequenceNumber('MUT');
    const newMovement: StockMovement = {
      ...data,
      id: `mut_${Date.now()}`,
      tenantId: tenant.id,
      movementNumber,
      date: new Date().toISOString(),
      createdBy: currentUser.fullName
    };

    setStockMovements((prev) => [newMovement, ...prev]);
    syncStockMovementToSupabase(newMovement);

    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'StockMovement',
      entityId: movementNumber,
      description: `Mutasi stok ${movementNumber}: ${data.quantity} ${data.uom} ${data.productName}`,
      ipAddress: '182.253.18.92'
    };
    recordAuditLog(audit);

    addToast('Mutasi Stok Dicatat', `${movementNumber} berhasil disimpan ke kartu stok`, 'success');
    return newMovement;
  };

  const createJournalEntry = (
    data: Omit<JournalEntry, 'id' | 'tenantId' | 'entryNumber' | 'status' | 'postedBy' | 'postedAt'>
  ): JournalEntry => {
    const entryNumber = generateSequenceNumber('JV');
    const newEntry: JournalEntry = {
      ...data,
      id: `jv_${Date.now()}`,
      tenantId: tenant.id,
      entryNumber,
      status: 'draft',
      postedBy: currentUser.fullName
    };

    setJournalEntries((prev) => [newEntry, ...prev]);
    syncJournalEntryToSupabase(newEntry);

    const audit: AuditLog = {
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'CREATE',
      entity: 'JournalEntry',
      entityId: entryNumber,
      description: `Draf voucher jurnal umum ${entryNumber} dibuat (Debit/Kredit seimbang)`,
      ipAddress: '182.253.18.92'
    };
    recordAuditLog(audit);

    addToast('Jurnal Draf Disimpan', `Nomor Jurnal: ${entryNumber}`, 'info');
    return newEntry;
  };

  const createPurchaseOrder = (poData: PurchaseOrder) => {
    setPurchaseOrders((prev) => [poData, ...prev]);
    syncPurchaseOrderToSupabase(poData);
  };

  // Keyboard shortcut for Cmd/Ctrl+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErpContext.Provider
      value={{
        // Gate C1 Auth State & Handlers
        authStatus,
        authenticatedUser,
        authError,
        isDevSandboxMode,
        login,
        logout,
        resetPassword,
        loginAsDevSandboxUser,
        checkAuthSession,
        tenant,
        allTenants,
        setAllTenants,
        switchTenant,
        addNewTenant,
        updateTenant,
        // Master Tenant Configuration & Profiles
        companyProfile,
        marketProfile,
        systemConfig,
        updateCompanyProfileState,
        updateMarketProfileState,
        updateSystemConfigState,
        reloadTenantSettings,
        businessUnits,
        setBusinessUnits,
        activeBusinessUnits,
        activeBusinessUnit,
        setActiveBusinessUnitId,
        branches,
        setBranches,
        activeBranches,
        activeBranch,
        setActiveBranchId,
        warehouses,
        setWarehouses,
        currentUser,
        currentModule,
        setCurrentModule,
        activeFeatureId,
        openAccordionId,
        setOpenAccordionId,
        navigateToFeature,
        resetNavigationToDashboard,
        activeTab,
        setActiveTab,
        customers,
        setCustomers,
        vendors,
        setVendors,
        products,
        setProducts,
        salesOrders,
        setSalesOrders,
        serviceBookings,
        setServiceBookings,
        invoices,
        setInvoices,
        receivePayments,
        setReceivePayments,
        collectors,
        purchaseOrders,
        setPurchaseOrders,
        createPurchaseOrder,
        stockMovements,
        accounts,
        setAccounts,
        taxes,
        setTaxes,
        bankAccounts,
        setBankAccounts,
        paymentMethods,
        setPaymentMethods,
        journalEntries,
        employees,
        setEmployees,
        refreshEmployees,
        auditLogs,
        generateCustomerCode,
        generateSequenceNumber,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        generateServiceBookingNumber: generateServiceBookingNumberCandidate,
        createServiceBooking,
        updateServiceBooking,
        deleteServiceBooking,
        generateSalesOrderNumber: generateSalesOrderNumberCandidate,
        createSalesOrder,
        updateSalesOrder,
        deleteSalesOrder,
        generateSalesInvoiceNumber: generateSalesInvoiceNumberCandidate,
        createSalesInvoice,
        deleteSalesInvoice,
        createReceivePayment,
        approveReceivePayment,
        createStockMovement,
        createJournalEntry,
        createProduct,
        updateProduct,
        deleteProduct,
        createVendor,
        updateVendor,
        deleteVendor,
        isSupabaseConfigured,
        targetSupabaseUrl: supabaseUrl,
        supabaseConnection,
        isTestingConnection,
        runConnectionTest,
        isSearchOpen,
        setIsSearchOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        isHelpOpen,
        setIsHelpOpen,
        isArchitectureModalOpen,
        setIsArchitectureModalOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toasts,
        addToast,
        removeToast,
        users,
        isCurrentUserSuperAdmin,
        userRoleAudits,
        updateUserRole,
        updateUserProfile,
        deleteUser,
        toggleUserStatus,
        inviteUser,
        refreshUsers,
        navigationGroups,
        refreshNavigation,
        toggleMenuStatus,
        isAddMenuModalOpen,
        setIsAddMenuModalOpen
      }}
    >
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
};
