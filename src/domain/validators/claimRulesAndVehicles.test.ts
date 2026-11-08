/**
 * Zyvora ERP 1.0.0 — Setting Claim Expense & Master Kendaraan Test Suite
 * Validates:
 * 1. Tax Status Countdown Calculation (Safe, Warning <= 30 days, Overdue)
 * 2. Master Kendaraan Registry (Nopol, Pemegang Inventaris / Custodian, Tanggal Pajak, Tanggal Plat)
 * 3. Claim Settings Service (Categories & Activities CRUD, Limits, Vehicle Flags)
 * 4. Migration 009 SQL AST syntax validation via pgsql-parser
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'pgsql-parser';
import { VehicleMasterService, INITIAL_COMPANY_VEHICLES } from '../../services/vehicleMasterService';
import {
  ClaimSettingsService,
  INITIAL_CLAIM_CATEGORIES,
  INITIAL_CLAIM_ACTIVITIES
} from '../../services/claimSettingsService';
import { CompanyVehicle, ClaimExpenseCategory, ClaimExpenseActivity } from '../../types/erp';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — CLAIM RULES & VEHICLES TEST SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Smart Tax Due Date & Countdown Calculations
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Smart Tax Status & Countdown Alert (Mencegah Telat Pajak)');

  const today = new Date();

  // 1. Overdue Test: 5 days in the past
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 5);
  const pastIso = pastDate.toISOString().split('T')[0];
  const overdueAlert = VehicleMasterService.getTaxStatus(pastIso);

  assert(
    overdueAlert.status === 'overdue' && overdueAlert.isOverdue === true,
    'Tax Alert 1: Tanggal jatuh tempo lampau terdeteksi OVERDUE (Telat Pajak)',
    `Status: ${overdueAlert.status}, isOverdue: ${overdueAlert.isOverdue}`
  );
  assert(
    overdueAlert.badgeVariant === 'danger' && overdueAlert.label.includes('Telat'),
    'Tax Alert 2: Badge teks memuat "Telat X Hari" dengan varian danger',
    `label: ${overdueAlert.label}, badgeVariant: ${overdueAlert.badgeVariant}`
  );

  // 2. Warning Test: 12 days in the future (<= 30 days)
  const warnDate = new Date(today);
  warnDate.setDate(today.getDate() + 12);
  const warnIso = warnDate.toISOString().split('T')[0];
  const warnAlert = VehicleMasterService.getTaxStatus(warnIso);

  assert(
    warnAlert.status === 'warning' && warnAlert.isOverdue === false,
    'Tax Alert 3: Tanggal jatuh tempo <= 30 hari terdeteksi WARNING (Segera Jatuh Tempo)',
    `Status: ${warnAlert.status}, daysRemaining: ${warnAlert.daysRemaining}`
  );
  assert(
    warnAlert.badgeVariant === 'warning' && warnAlert.label.includes('Sisa'),
    'Tax Alert 4: Badge teks memuat "Sisa X Hari" dengan varian warning',
    `label: ${warnAlert.label}`
  );

  // 3. Safe Test: 90 days in the future (> 30 days)
  const safeDate = new Date(today);
  safeDate.setDate(today.getDate() + 90);
  const safeIso = safeDate.toISOString().split('T')[0];
  const safeAlert = VehicleMasterService.getTaxStatus(safeIso);

  assert(
    safeAlert.status === 'safe' && safeAlert.badgeVariant === 'success',
    'Tax Alert 5: Tanggal jatuh tempo > 30 hari terdeteksi SAFE (Pajak Aktif)',
    `Status: ${safeAlert.status}, badgeVariant: ${safeAlert.badgeVariant}`
  );

  // 4. Undefined / Empty test
  const emptyAlert = VehicleMasterService.getTaxStatus(undefined);
  assert(
    emptyAlert.status === 'unknown' && emptyAlert.label === 'Belum Diatur',
    'Tax Alert 6: Tanggal kosong ditangani anggun tanpa exception crash',
    `label: ${emptyAlert.label}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: Master Kendaraan Registry & Custodian Validation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Master Kendaraan & Registrasi Pemegang Inventaris');

  assert(
    INITIAL_COMPANY_VEHICLES.length >= 3,
    'Fleet 1: Minimal 3 armada kendaraan operasional terdaftar di inisial seed',
    `Jumlah: ${INITIAL_COMPANY_VEHICLES.length}`
  );

  const vanZyn = INITIAL_COMPANY_VEHICLES.find((v) => v.licensePlate === 'B 1234 XYZ');
  assert(
    Boolean(vanZyn && vanZyn.custodianName && vanZyn.taxDueDate && vanZyn.plateExpiryDate),
    'Fleet 2: Armada B 1234 XYZ memiliki data Pemegang Inventaris, Tanggal Pajak, dan Tanggal Plat',
    `Custodian: ${vanZyn?.custodianName}, Tax: ${vanZyn?.taxDueDate}, Plat: ${vanZyn?.plateExpiryDate}`
  );

  const motorcycle = INITIAL_COMPANY_VEHICLES.find((v) => v.vehicleType === 'motorcycle');
  assert(
    Boolean(motorcycle && motorcycle.licensePlate === 'L 9012 DEF'),
    'Fleet 3: Armada sepeda motor kurir operasional terdaftar (L 9012 DEF)',
    `Nopol: ${motorcycle?.licensePlate}`
  );

  // Test save vehicle
  const newVehicle: Partial<CompanyVehicle> = {
    licensePlate: 'L 9988 ZYV',
    brandModel: 'Toyota Innova Zenix Hybrid',
    vehicleType: 'car',
    fuelType: 'pertamax',
    assignedBranchId: 'br_sub_op',
    assignedBusinessLineId: 'lob_01',
    custodianName: 'Arya Pratama',
    currentOdometerKm: 12500,
    taxDueDate: '2027-04-15',
    plateExpiryDate: '2029-04-15',
    isActive: true
  };

  const savedVehicle = await VehicleMasterService.saveVehicle(newVehicle);
  assert(
    savedVehicle.licensePlate === 'L 9988 ZYV' && savedVehicle.custodianName === 'Arya Pratama',
    'Fleet 4: Penambahan armada baru berhasil menyimpan Nopol dan Pemegang Inventaris',
    `ID: ${savedVehicle.id}, Custodian: ${savedVehicle.custodianName}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: Setting Claim Expense (Categories & Activities)
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Setting Claim Expense (Kategori Klaim & Aktivitas Operasional)');

  const categories = await ClaimSettingsService.getCategories();
  assert(
    categories.length >= 6,
    'Claim Settings 1: Minimal 6 kategori klaim operasional terdaftar',
    `Jumlah: ${categories.length}`
  );

  const fuelCat = categories.find((c) => c.code === 'EXP-FUEL');
  assert(
    Boolean(fuelCat && fuelCat.isVehicleActivity === true && fuelCat.isReceiptRequired === true),
    'Claim Settings 2: Kategori EXP-FUEL terkonfigurasi wajib armada & wajib struk',
    `isVehicleActivity: ${fuelCat?.isVehicleActivity}, isReceiptRequired: ${fuelCat?.isReceiptRequired}`
  );

  const travelCat = categories.find((c) => c.code === 'EXP-TRAVEL');
  assert(
    Boolean(travelCat && travelCat.maxLimit === 2500000 && travelCat.isVehicleActivity === false),
    'Claim Settings 3: Kategori EXP-TRAVEL memiliki plafon Rp 2.500.000 dan non-armada',
    `maxLimit: ${travelCat?.maxLimit}`
  );

  const activities = await ClaimSettingsService.getActivities();
  assert(
    activities.length >= 4,
    'Claim Settings 4: Minimal 4 aktivitas operasional terdaftar',
    `Jumlah: ${activities.length}`
  );

  const hampersAct = activities.find((a) => a.code === 'ACT-DELIV');
  assert(
    Boolean(hampersAct && hampersAct.businessLineId === 'lob_01'),
    'Claim Settings 5: Aktivitas ACT-DELIV (Pengantaran Hampers) terikat pada Lini Bisnis Queinvite',
    `BusinessLineId: ${hampersAct?.businessLineId}`
  );

  // Save new category test
  const savedCat = await ClaimSettingsService.saveCategory({
    code: 'EXP-PARK',
    name: 'Parkir & Tol Operasional',
    isVehicleActivity: true,
    maxLimit: 300000,
    isReceiptRequired: true,
    isActive: true
  });
  assert(
    savedCat.code === 'EXP-PARK' && savedCat.maxLimit === 300000,
    'Claim Settings 6: Simpan kategori klaim baru berhasil disimpan',
    `Code: ${savedCat.code}, Max: ${savedCat.maxLimit}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 4: AST Syntax Validation of Migration 009
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Validasi AST Schema Migration 009 (009_claim_rules_and_vehicle_tax_schema.sql)');

  const migrationPath = path.resolve(
    process.cwd(),
    'docs/migrations/009_claim_rules_and_vehicle_tax_schema.sql'
  );
  assert(
    fs.existsSync(migrationPath),
    'Migration 009: File migrasi SQL tersedia di docs/migrations/009_claim_rules_and_vehicle_tax_schema.sql'
  );

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  assert(
    sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'),
    'Migration 009: Transaksi skrip dibungkus secara atomik (BEGIN ... COMMIT)'
  );
  assert(
    sqlContent.includes('custodian_name') && sqlContent.includes('tax_due_date'),
    'Migration 009: Kolom custodian_name dan tax_due_date ditambahkan pada company_vehicles'
  );
  assert(
    sqlContent.includes('claim_expense_categories') && sqlContent.includes('CREATE TABLE'),
    'Migration 009: Tabel claim_expense_categories dibuat'
  );
  assert(
    sqlContent.includes('claim_expense_activities') && sqlContent.includes('CREATE TABLE'),
    'Migration 009: Tabel claim_expense_activities dibuat'
  );
  assert(
    sqlContent.includes('ENABLE ROW LEVEL SECURITY;'),
    'Migration 009: Kebijakan RLS diaktifkan untuk proteksi multi-tenant'
  );

  try {
    const parseResult = await parse(sqlContent);
    const statementCount = (parseResult as { stmts?: unknown[] }).stmts?.length || 0;
    assert(
      statementCount > 0,
      `Migration 009: Parser PostgreSQL 15+ memvalidasi seluruh ${statementCount} pernyataan DDL tanpa error sintaks`
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    assert(false, 'Migration 009: PostgreSQL AST Parser memvalidasi DDL', errMsg);
  }

  // ------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  if (failedTests === 0) {
    console.log(`SELURUH PENGUJIAN CLAIM RULES & VEHICLES SUKSES: ${passedTests}/${passedTests} TESTS PASSED (100%)`);
  } else {
    console.error(`PENGUJIAN GAGAL: ${failedTests} test(s) failed, ${passedTests} passed.`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
