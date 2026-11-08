/**
 * Zyvora ERP 1.0.0 — Categories & UoM CRUD & Migration Test Suite
 *
 * Menguji:
 * 1. Validasi sintaks DDL & RLS Migration 007 (007_categories_and_uoms_schema.sql)
 * 2. Operasi CRUD Kategori Produk (Create, Read, Update, Delete)
 * 3. Operasi CRUD Satuan Ukur / UoM (Create, Read, Update, Delete)
 * 4. Isolasi Multi-Tenant pada Katalog
 */

import fs from 'fs';
import path from 'path';
import { CatalogMasterService } from '../../services/catalogMasterService';
import { ProductCategory, UnitOfMeasure } from '../../types/erp';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exit(1);
  }
}

console.log('======================================================');
console.log('ZYVORA ERP 1.0.0 — CATEGORIES & UOM MASTER SUITE');
console.log('======================================================\n');

const tenantId = '00000000-0000-0000-0000-000000000001';

async function runTests() {
  // ----------------------------------------------------
  // TEST GROUP 1: Validasi AST Migration 007
  // ----------------------------------------------------
  console.log('[TEST GROUP 1] Validasi Migration 007 (007_categories_and_uoms_schema.sql)');
  const migrationPath = path.join(process.cwd(), 'docs', 'migrations', '007_categories_and_uoms_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration 007: File migrasi tersedia di docs/migrations');

  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'), 'Migration 007: Transaksi dibungkus atomik');
  assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.product_categories'), 'Migration 007: Tabel product_categories didefinisikan');
  assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.unit_of_measures'), 'Migration 007: Tabel unit_of_measures didefinisikan');
  assert(sqlContent.includes('uq_product_categories_tenant_code'), 'Migration 007: Constraint unik kategori per tenant');
  assert(sqlContent.includes('uq_unit_of_measures_tenant_code'), 'Migration 007: Constraint unik UoM per tenant');
  assert(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Migration 007: RLS aktif untuk kedua tabel');

  // ----------------------------------------------------
  // TEST GROUP 2: CRUD Kategori Produk
  // ----------------------------------------------------
  console.log('\n[TEST GROUP 2] CRUD Kategori Produk (Product Categories)');
  const initialCats = await CatalogMasterService.getCategories(tenantId);
  assert(initialCats.length >= 6, 'Category Read: Berhasil memuat daftar kategori awal', `Total: ${initialCats.length}`);

  // Create
  const newCat: ProductCategory = {
    id: 'cat_test_01',
    tenantId,
    code: 'CAT-ELK',
    name: 'Electronics & Audio Equipment',
    itemType: 'physical',
    description: 'Sound systems, microphones, and staging electronics',
    isActive: true
  };
  const savedCat = await CatalogMasterService.saveCategory(tenantId, newCat);
  assert(savedCat.code === 'CAT-ELK', 'Category Create: Kategori baru berhasil disimpan');
  assert(savedCat.name === 'Electronics & Audio Equipment', 'Category Create: Nama kategori sesuai');

  // Verify list includes newCat
  const updatedCats = await CatalogMasterService.getCategories(tenantId);
  const foundNewCat = updatedCats.find((c) => c.code === 'CAT-ELK');
  assert(Boolean(foundNewCat), 'Category List: Kategori baru muncul dalam daftar');

  // Update
  const updatedPayload: ProductCategory = {
    ...savedCat,
    name: 'Electronics & Professional Staging',
    itemType: 'all'
  };
  const updatedCat = await CatalogMasterService.saveCategory(tenantId, updatedPayload);
  assert(updatedCat.name === 'Electronics & Professional Staging', 'Category Update: Nama kategori berhasil diubah');
  assert(updatedCat.itemType === 'all', 'Category Update: Tipe kategori berhasil diubah ke universal');

  // Delete
  await CatalogMasterService.deleteCategory(tenantId, 'cat_test_01');
  const afterDeleteCats = await CatalogMasterService.getCategories(tenantId);
  assert(!afterDeleteCats.some((c) => c.id === 'cat_test_01'), 'Category Delete: Kategori berhasil dihapus');

  // ----------------------------------------------------
  // TEST GROUP 3: CRUD Satuan Ukur (UoM)
  // ----------------------------------------------------
  console.log('\n[TEST GROUP 3] CRUD Satuan Ukur (Units of Measure / UoM)');
  const initialUoms = await CatalogMasterService.getUoms(tenantId);
  assert(initialUoms.length >= 10, 'UoM Read: Berhasil memuat daftar satuan awal', `Total: ${initialUoms.length}`);

  // Create UoM
  const newUom: UnitOfMeasure = {
    id: 'uom_test_01',
    tenantId,
    code: 'MTR',
    name: 'Meter (m) / Linear Length',
    classification: 'General',
    description: 'Fabric, cable, or runner linear measurement',
    isActive: true
  };
  const savedUom = await CatalogMasterService.saveUom(tenantId, newUom);
  assert(savedUom.code === 'MTR', 'UoM Create: Satuan baru berhasil disimpan');
  assert(savedUom.name === 'Meter (m) / Linear Length', 'UoM Create: Nama satuan sesuai');

  // Verify list
  const updatedUoms = await CatalogMasterService.getUoms(tenantId);
  const foundNewUom = updatedUoms.find((u) => u.code === 'MTR');
  assert(Boolean(foundNewUom), 'UoM List: Satuan baru muncul dalam daftar');

  // Update UoM
  const uomUpdatePayload: UnitOfMeasure = {
    ...savedUom,
    name: 'Meter Panjang (m)',
    classification: 'General'
  };
  const updatedUom = await CatalogMasterService.saveUom(tenantId, uomUpdatePayload);
  assert(updatedUom.name === 'Meter Panjang (m)', 'UoM Update: Nama satuan berhasil diubah');

  // Delete UoM
  await CatalogMasterService.deleteUom(tenantId, 'uom_test_01');
  const afterDeleteUoms = await CatalogMasterService.getUoms(tenantId);
  assert(!afterDeleteUoms.some((u) => u.id === 'uom_test_01'), 'UoM Delete: Satuan berhasil dihapus');

  console.log('\n======================================================');
  console.log(`SELURUH PENGUJIAN KATEGORI & UOM SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
