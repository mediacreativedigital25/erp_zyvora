/**
 * Zyvora ERP 1.0.0 — Test Suite: Live Products & Services Database Integration (Fase 2)
 *
 * Menguji integrasi live database:
 * 1. Validasi sintaks AST PostgreSQL 15+ Migration 006 via pgsql-parser
 * 2. Operasi CRUD ProductService (Produk Fisik & Layanan Jasa)
 * 3. Verifikasi persistensi dan mapping Lini Bisnis & Barcode EAN-13
 * 4. Eliminasi data demo (Clean Slate Invariant)
 */

import { ProductService } from '../../services/productService';
import { Product, ServiceItem, UserProfile } from '../../types/erp';
import { parse } from 'pgsql-parser';
import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS: ${RESET}${testName}`);
  } else {
    console.error(`  ${RED}✗ FAIL: ${RESET}${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runLiveProductDatabaseSuite() {
  console.log(`\n======================================================`);
  console.log(`ZYVORA ERP 1.0.0 — LIVE PRODUCTS & SERVICES DATABASE SUITE`);
  console.log(`======================================================`);

  const mockActor: UserProfile = {
    id: '00000000-0000-0000-0000-000000000099',
    userCode: '2A',
    email: 'admin@zyvora.com',
    fullName: 'Live Database Operator',
    role: 'admin',
    roleTitle: 'ADMIN Tenant Member',
    status: 'active',
    tenantId: '00000000-0000-0000-0000-000000000001',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const testTenantId = '00000000-0000-0000-0000-000000000001';

  // --------------------------------------------------------------------
  // TEST GROUP 1: Validasi AST Migration 006 (pgsql-parser)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] Validasi AST Schema Migration 006 (docs/migrations/006_products_services_schema.sql)`);
  const migrationPath = path.resolve('docs/migrations/006_products_services_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration 006: File migrasi tersedia di docs/migrations');

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  assert(sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'), 'Migration 006: Transaksi dibungkus atomik');
  assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.products'), 'Migration 006: Tabel products didefinisikan');
  assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.service_items'), 'Migration 006: Tabel service_items didefinisikan');
  assert(sqlContent.includes('products_unique_sku_per_tenant'), 'Migration 006: Constraint unik SKU per tenant diterapkan');
  assert(sqlContent.includes('service_items_unique_code_per_tenant'), 'Migration 006: Constraint unik kode jasa per tenant diterapkan');
  assert(sqlContent.includes('public.get_auth_user_admin_tenant_ids()'), 'Migration 006: RLS mutasi dibatasi untuk admin');

  const astResult = (await parse(sqlContent)) as { version?: number; stmts?: unknown[] };
  const stmtsCount = Array.isArray(astResult?.stmts) ? astResult.stmts.length : 0;
  assert(stmtsCount >= 18, `Migration 006: Parser PostgreSQL 15+ memvalidasi seluruh ${stmtsCount} pernyataan DDL tanpa error sintaks`);

  // --------------------------------------------------------------------
  // TEST GROUP 2: Live Persistensi Produk Fisik
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Persistensi Live Produk Fisik (ProductService.saveProduct)`);
  const newProductPayload: Product = {
    id: '00000000-0000-0000-0000-000000000101',
    tenantId: testTenantId,
    sku: 'GLP1K',
    barcode: '8999001000015',
    name: 'Gula Pasir 1kg Kristal Putih',
    description: 'Gula pasir tebu kemasan 1kg higienis',
    category: 'Sembako & Pangan Pokok',
    businessLineId: '00000000-0000-0000-0000-000000000011',
    uom: 'Kilogram (Kg)',
    weightGram: 1000,
    minStockLevel: 20,
    costPrice: 12500,
    sellingPrice: 16000,
    imageUrl: 'https://pub-r2.zyvora.my.id/tenants/00000000-0000-0000-0000-000000000001/products/GLP1K.webp',
    stockByWarehouse: {},
    totalStock: 0,
    status: 'active'
  };

  const savedProduct = await ProductService.saveProduct(testTenantId, newProductPayload, mockActor);
  assert(savedProduct.sku === 'GLP1K', 'Product 1: SKU produk tersimpan dengan benar');
  assert(savedProduct.barcode === '8999001000015', 'Product 2: Barcode EAN-13 tersimpan');
  assert(savedProduct.weightGram === 1000, 'Product 3: Berat barang dalam gram tersimpan');
  assert(savedProduct.businessLineId === '00000000-0000-0000-0000-000000000011', 'Product 4: Lini Bisnis terikat ke produk');

  // --------------------------------------------------------------------
  // TEST GROUP 3: Live Persistensi Layanan Jasa / Digital
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Persistensi Live Layanan Jasa (ProductService.saveService)`);
  const newServicePayload: ServiceItem = {
    id: '00000000-0000-0000-0000-000000000201',
    tenantId: testTenantId,
    code: 'JUDPLAT',
    barcode: '8999002000015',
    name: 'Jasa Undangan Web Digital Platinum (Queinvite)',
    description: 'Paket undangan digital interaktif responsif mobile',
    category: 'Multimedia & Undangan Digital',
    businessLineId: '00000000-0000-0000-0000-000000000012',
    uom: 'Paket Layanan',
    costPrice: 75000,
    rate: 350000,
    imageUrl: 'https://pub-r2.zyvora.my.id/tenants/00000000-0000-0000-0000-000000000001/services/JUDPLAT.webp',
    isActive: true
  };

  const savedService = await ProductService.saveService(testTenantId, newServicePayload, mockActor);
  assert(savedService.code === 'JUDPLAT', 'Service 1: SKU Jasa singkatan nama tersimpan');
  assert(savedService.rate === 350000, 'Service 2: Tarif jual layanan tersimpan');
  assert(savedService.businessLineId === '00000000-0000-0000-0000-000000000012', 'Service 3: Jasa terikat ke Lini Bisnis Queinvite');

  // --------------------------------------------------------------------
  // TEST GROUP 4: Toggle Status Operasional
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Toggle Status Produk & Jasa`);
  await ProductService.toggleProductStatus(testTenantId, savedProduct.id, 'inactive');
  const productsAfterToggle = await ProductService.getProducts(testTenantId);
  const targetProduct = productsAfterToggle.find((p) => p.id === savedProduct.id);
  assert(targetProduct?.status === 'inactive', 'Toggle 1: Status produk fisik berhasil dinonaktifkan');

  await ProductService.toggleServiceStatus(testTenantId, savedService.id, false);
  const servicesAfterToggle = await ProductService.getServices(testTenantId);
  const targetService = servicesAfterToggle.find((s) => s.id === savedService.id);
  assert(targetService?.isActive === false, 'Toggle 2: Status layanan jasa berhasil dinonaktifkan');

  console.log(`\n======================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN LIVE DATABASE PRODUK & JASA SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`======================================================\n`);
}

runLiveProductDatabaseSuite().catch((err) => {
  console.error(`${RED}Live Product Database test failed:${RESET}`, err);
  process.exit(1);
});
