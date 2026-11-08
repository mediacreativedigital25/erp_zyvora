/**
 * Zyvora ERP 1.0.0 — Dynamic Navigation Unit Test Suite
 * Tests role authorization, dynamic navigation group building, and item creation guards.
 */

import { NavigationService, DynamicNavItem } from '../../services/navigationService';
import { UserProfile, OfficialRole } from '../../types/erp';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓ PASS:\x1b[0m ${testName}`);
  } else {
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('ZYVORA ERP 1.0.0 — DYNAMIC NAVIGATION TEST SUITE');
  console.log('======================================================');

  // Test 1: Role Authorization
  console.log('[TEST GROUP 1] Role Authorization Matrix');
  assert(
    NavigationService.isRoleAuthorized('super_admin', 'super_admin', true),
    'Super Admin authorized for super_admin items'
  );
  assert(
    NavigationService.isRoleAuthorized('super_admin', 'admin', true),
    'Super Admin authorized for admin items'
  );
  assert(
    NavigationService.isRoleAuthorized('admin', 'admin', false),
    'Admin authorized for admin items'
  );
  assert(
    NavigationService.isRoleAuthorized('admin', 'sales', false),
    'Admin authorized for sales items'
  );
  assert(
    !NavigationService.isRoleAuthorized('sales', 'admin', false),
    'Sales NOT authorized for admin items'
  );
  assert(
    !NavigationService.isRoleAuthorized('sales', 'super_admin', false),
    'Sales NOT authorized for super_admin items'
  );
  assert(
    NavigationService.isRoleAuthorized('sales', 'sales', false),
    'Sales authorized for sales items'
  );
  assert(
    NavigationService.isRoleAuthorized('customer', 'customer', false),
    'Customer authorized for customer items'
  );
  assert(
    !NavigationService.isRoleAuthorized('customer', 'sales', false),
    'Customer NOT authorized for sales items'
  );

  // Test 2: Build Navigation Groups
  console.log('\n[TEST GROUP 2] Navigation Group Merging & Role Filtering');
  const sampleItems: DynamicNavItem[] = [
    {
      id: 'custom_fleet',
      groupId: 'sales',
      label: 'Manajemen Armada & Kurir',
      iconName: 'Truck',
      routeId: 'custom_fleet',
      badge: 'Baru',
      isReady: true,
      isActive: true,
      sortOrder: 50,
      minRole: 'sales'
    },
    {
      id: 'custom_tax_audit',
      groupId: 'cash_management',
      label: 'Audit Pajak Bulanan',
      iconName: 'ShieldCheck',
      routeId: 'custom_tax_audit',
      badge: 'Audit',
      isReady: true,
      isActive: true,
      sortOrder: 60,
      minRole: 'admin'
    },
    {
      id: 'custom_super_vault',
      groupId: 'security',
      label: 'Kunci Vault Enkripsi',
      iconName: 'Lock',
      routeId: 'custom_super_vault',
      isReady: true,
      isActive: true,
      sortOrder: 1,
      minRole: 'super_admin'
    }
  ];

  // When user is sales: should see custom_fleet, but NOT custom_tax_audit or custom_super_vault
  const salesGroups = NavigationService.buildNavGroups(sampleItems, 'sales', false);
  const salesGroup = salesGroups.find((g) => g.id === 'sales');
  assert(
    Boolean(salesGroup?.items?.some((i) => i.id === 'custom_fleet')),
    'Sales sees dynamic sales item (custom_fleet)'
  );
  const cashGroupForSales = salesGroups.find((g) => g.id === 'cash_management');
  assert(
    !cashGroupForSales?.items?.some((i) => i.id === 'custom_tax_audit'),
    'Sales does NOT see admin item (custom_tax_audit)'
  );
  const securityGroupForSales = salesGroups.find((g) => g.id === 'security');
  assert(!securityGroupForSales, 'Sales does NOT see super_admin group (security)');

  // When user is admin: should see custom_fleet and custom_tax_audit
  const adminGroups = NavigationService.buildNavGroups(sampleItems, 'admin', false);
  const cashGroupForAdmin = adminGroups.find((g) => g.id === 'cash_management');
  assert(
    Boolean(cashGroupForAdmin?.items?.some((i) => i.id === 'custom_tax_audit')),
    'Admin sees admin item (custom_tax_audit)'
  );

  // When user is super_admin: should see all items including custom security group
  const superGroups = NavigationService.buildNavGroups(sampleItems, 'super_admin', true);
  const securityGroupForSuper = superGroups.find((g) => g.id === 'security');
  assert(
    Boolean(securityGroupForSuper?.items?.some((i) => i.id === 'custom_super_vault')),
    'Super Admin sees dynamic group and item (custom_super_vault)'
  );

  // Test 3: Creation Security Gate
  console.log('\n[TEST GROUP 3] Creation RBAC Security Gate');
  const mockSalesUser: UserProfile = {
    id: 'user_sales_1',
    userCode: 'S1',
    email: 'sales@example.com',
    fullName: 'Staf Penjualan',
    role: 'sales',
    roleTitle: 'Staf Penjualan',
    isPlatformSuperAdmin: false,
    status: 'active',
    tenantId: 'tenant_1',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const mockAdminUser: UserProfile = {
    id: 'user_admin_1',
    userCode: 'A1',
    email: 'admin@example.com',
    fullName: 'Tenant Admin',
    role: 'admin',
    roleTitle: 'Administrator',
    isPlatformSuperAdmin: false,
    status: 'active',
    tenantId: 'tenant_1',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const salesCreateRes = await NavigationService.createMenuItem(
    {
      label: 'Menu Ilegal',
      groupId: 'sales',
      iconName: 'Boxes',
      routeId: 'illegal_menu',
      isReady: true,
      isActive: true,
      sortOrder: 1,
      minRole: 'sales'
    },
    mockSalesUser
  );
  assert(
    salesCreateRes.success === false && salesCreateRes.message.includes('Akses Ditolak'),
    'Creation by non-admin actor is strictly REJECTED (Zero Privilege Escalation)'
  );

  const adminCreateRes = await NavigationService.createMenuItem(
    {
      label: 'Daftar Mitra Ekspedisi',
      groupId: 'sales',
      iconName: 'Truck',
      routeId: 'custom_expeditions',
      badge: 'Aktif',
      isReady: true,
      isActive: true,
      sortOrder: 25,
      minRole: 'sales'
    },
    mockAdminUser
  );
  assert(
    adminCreateRes.success === true && Boolean(adminCreateRes.item),
    'Creation by Admin actor is PERMITTED and produces valid record'
  );

  // Test 4: Obsolete Seed Filtering & Core Group Deduplication Guard
  console.log('\n[TEST GROUP 4] Obsolete Seed Filtering & Deduplication Guard');
  const contaminatedItems: DynamicNavItem[] = [
    {
      id: 'master_market_business',
      groupId: 'master_data',
      label: 'Market & Lini Bisnis',
      iconName: 'Globe',
      routeId: 'master_market_business',
      isReady: true,
      isActive: true,
      sortOrder: 20,
      minRole: 'admin'
    },
    {
      id: 'master_user_management',
      groupId: 'master_data',
      label: 'Pengguna & Akses',
      iconName: 'ShieldCheck',
      routeId: 'master_user_management',
      isReady: true,
      isActive: true,
      sortOrder: 40,
      minRole: 'admin'
    },
    {
      id: 'master_customers',
      groupId: 'master_data',
      label: 'Data Pelanggan',
      iconName: 'Users',
      routeId: 'master_customers',
      isReady: true,
      isActive: true,
      sortOrder: 50,
      minRole: 'sales'
    },
    {
      id: 'sales_invoice',
      groupId: 'sales',
      label: 'Faktur Penjualan',
      iconName: 'Receipt',
      routeId: 'sales_invoice',
      isReady: false,
      isActive: true,
      sortOrder: 20,
      minRole: 'sales'
    },
    {
      id: 'unauthorized_core_item',
      groupId: 'master_data',
      label: 'Menu Ilegal Non-Custom',
      iconName: 'Boxes',
      routeId: 'unauthorized_core_item',
      isReady: true,
      isActive: true,
      sortOrder: 99,
      minRole: 'admin'
    },
    {
      id: 'custom_tenant_metric',
      groupId: 'master_data',
      label: 'Metrik Kustom Tenant',
      iconName: 'BarChart3',
      routeId: 'custom_tenant_metric',
      badge: 'Tenant',
      isReady: true,
      isActive: true,
      sortOrder: 99,
      minRole: 'admin'
    }
  ];

  const sanitizedGroups = NavigationService.buildNavGroups(contaminatedItems, 'super_admin', true);
  const masterGroup = sanitizedGroups.find((g) => g.id === 'master_data');
  const masterItems = masterGroup?.items || [];

  // Verify no duplicate "Market & Lini Bisnis"
  const marketBusinessItems = masterItems.filter(
    (i) => i.id === 'master_market_business_line' || i.id === 'master_market_business'
  );
  assert(
    marketBusinessItems.length === 1 && marketBusinessItems[0].id === 'master_market_business_line',
    'Invariant: "Market & Lini Bisnis" is strictly singular and uses canonical ID'
  );

  // Verify no redundant "master_user_management" (only rbac "Anggota Tenant")
  const hasUserManagementDuplicate = masterItems.some((i) => i.id === 'master_user_management');
  assert(
    !hasUserManagementDuplicate,
    'Invariant: Redundant "Pengguna & Akses" (master_user_management) is filtered out'
  );

  // Verify no misplaced "master_customers"
  const hasMisplacedCustomers = masterItems.some((i) => i.id === 'master_customers');
  assert(
    !hasMisplacedCustomers,
    'Invariant: Misplaced "Data Pelanggan" (master_customers) is filtered out of Master'
  );

  // Verify unauthorized non-custom item in core group is rejected
  const hasUnauthorizedCoreItem = masterItems.some((i) => i.id === 'unauthorized_core_item');
  assert(
    !hasUnauthorizedCoreItem,
    'Invariant: Arbitrary non-custom item in core group is blocked by Architectural Guard'
  );

  // Verify legitimate custom item starting with 'custom_' is permitted
  const hasLegitimateCustomItem = masterItems.some((i) => i.id === 'custom_tenant_metric');
  assert(
    hasLegitimateCustomItem,
    'Invariant: Legitimate custom menu (custom_*) in core group is permitted'
  );

  // Verify total Master Data items count: exactly 9 (8 baseline + 1 custom_tenant_metric)
  assert(
    masterItems.length === 9,
    `Invariant: Master Data items count is clean and exact (${masterItems.length}/9)`
  );

  // --------------------------------------------------------------------
  // TEST GROUP 9: Invariant Opsi A: Produk, Jasa, & Gudang di Modul Persediaan
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 9] Invariant Opsi A: Produk, Jasa, & Fasilitas Gudang berada di Modul Inventory`);
  const inventoryGroup = sanitizedGroups.find((g) => g.id === 'inventory');
  assert(Boolean(inventoryGroup), 'Invariant: Inventory group is present in navigation');
  const inventoryItems = inventoryGroup?.items || [];

  const prodItem = inventoryItems.find((i) => i.id === 'inv_list_product');
  assert(Boolean(prodItem && prodItem.isReady), 'Invariant: "Daftar Produk & Jasa" is active in Inventory');

  const catItem = inventoryItems.find((i) => i.id === 'inv_category');
  assert(Boolean(catItem && catItem.isReady), 'Invariant: "Kategori & Satuan (UoM)" is active in Inventory');

  const whItem = inventoryItems.find((i) => i.id === 'inv_warehouse');
  assert(Boolean(whItem && whItem.isReady), 'Invariant: "Gudang & Fasilitas" is active in Inventory');

  console.log('======================================================');
  console.log(`ALL DYNAMIC NAVIGATION TESTS PASSED: ${passedTests}/${totalTests} TESTS (100%)`);
  console.log('======================================================');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
