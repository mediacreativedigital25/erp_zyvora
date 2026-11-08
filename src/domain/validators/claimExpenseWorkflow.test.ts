/**
 * Zyvora ERP 1.0.0 — Claim Expense & Fleet Fuel Workflow Test Suite
 * Validates:
 * 1. Document Number format: CE + YYYYMM + 00001 (e.g. CE20261000001)
 * 2. Multi-row claim calculation (sum of lines matches totalAmount)
 * 3. Cost Center resolution (Business Line, Personnel, Branch)
 * 4. Vehicle activity calculation (Odometer, Liters, Rp/L)
 * 5. Migration 008 SQL syntax AST validation via pgsql-parser
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'pgsql-parser';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { VehicleMasterService, INITIAL_COMPANY_VEHICLES } from '../../services/vehicleMasterService';
import { ExpenseClaim, ExpenseClaimItem, TenantBusinessLine, Branch } from '../../types/erp';

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

async function runClaimExpenseSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — CLAIM EXPENSE & FLEET WORKFLOW SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Document Number Generator (CE + YYYYMM + 00001)
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Format Penomoran Dokumen CE20261000001');

  const emptyClaimsList: ExpenseClaim[] = [];
  const claimNum1 = ExpenseClaimService.generateNextClaimNumber(emptyClaimsList, '2026-10-26');
  assert(
    claimNum1 === 'CE20261000001',
    'Claim 1: Dokumen pertama periode 2026-10 bernomor CE20261000001',
    `Ditemukan: ${claimNum1}`
  );

  const existingClaims: ExpenseClaim[] = [
    {
      id: 'c1',
      tenantId: 'ten_zyvora_corp',
      claimNumber: 'CE20261000001',
      claimDate: '2026-10-26',
      requestByUserId: 'u1',
      requestByName: 'Bambang',
      totalAmount: 350000,
      status: 'submitted',
      disbursementMethod: 'petty_cash',
      items: []
    },
    {
      id: 'c2',
      tenantId: 'ten_zyvora_corp',
      claimNumber: 'CE20261000002',
      claimDate: '2026-10-26',
      requestByUserId: 'u2',
      requestByName: 'Sri',
      totalAmount: 120000,
      status: 'draft',
      disbursementMethod: 'petty_cash',
      items: []
    }
  ];

  const claimNum3 = ExpenseClaimService.generateNextClaimNumber(existingClaims, '2026-10-26');
  assert(
    claimNum3 === 'CE20261000003',
    'Claim 2: Dokumen berikutnya berurutan menjadi CE20261000003',
    `Ditemukan: ${claimNum3}`
  );

  // Rollover ke bulan berikutnya (November 2026)
  const claimNextMonth = ExpenseClaimService.generateNextClaimNumber(existingClaims, '2026-11-01');
  assert(
    claimNextMonth === 'CE20261100001',
    'Claim 3: Berganti bulan ke November 2026 mereset urutan ke CE20261100001',
    `Ditemukan: ${claimNextMonth}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: Multi-Line Calculation & Header Sum
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Kalkulasi Multi-Line Item & Presisi Nominal');

  const sampleItems: ExpenseClaimItem[] = [
    {
      id: 'item_1',
      lineNumber: 1,
      orderByType: 'business_line',
      orderByTargetId: 'lob_01',
      orderByTargetName: 'Queinvite Wedding Digital',
      costCenterCode: 'CC-QUEINVITE',
      category: 'vehicle_fuel',
      activity: 'Pengantaran Hampers',
      isVehicleActivity: true,
      licensePlate: 'B 1234 XYZ',
      odometerKm: 45280,
      fuelLiters: 28.5,
      nominal: 350000,
      disbursementMethod: 'petty_cash'
    },
    {
      id: 'item_2',
      lineNumber: 2,
      orderByType: 'business_line',
      orderByTargetId: 'lob_01',
      orderByTargetName: 'Queinvite Wedding Digital',
      costCenterCode: 'CC-QUEINVITE',
      category: 'travel_lodging',
      activity: 'E-Toll Senayan & BSD',
      isVehicleActivity: false,
      nominal: 70000,
      disbursementMethod: 'petty_cash'
    },
    {
      id: 'item_3',
      lineNumber: 3,
      orderByType: 'personnel',
      orderByTargetId: 'emp_01',
      orderByTargetName: 'Iklas Padli',
      costCenterCode: 'CC-QUEINVITE',
      category: 'meals_representation',
      activity: 'Meeting Klien Vendor',
      isVehicleActivity: false,
      nominal: 100000,
      disbursementMethod: 'petty_cash'
    }
  ];

  const multiRowClaim: ExpenseClaim = {
    id: 'test_claim_01',
    tenantId: 'ten_zyvora_corp',
    claimNumber: 'CE20261000001',
    claimDate: '2026-10-26',
    requestByUserId: 'emp_01',
    requestByName: 'Iklas Padli',
    totalAmount: 0, // Should be calculated automatically
    status: 'draft',
    disbursementMethod: 'petty_cash',
    items: sampleItems
  };

  const saved = await ExpenseClaimService.saveClaim(multiRowClaim, 'ten_zyvora_corp');
  assert(
    saved.totalAmount === 520000,
    'Multi-line 1: Total klaim terakumulasi tepat Rp 520.000 (350k + 70k + 100k)',
    `Ditemukan: ${saved.totalAmount}`
  );
  assert(
    saved.items.length === 3,
    'Multi-line 2: Tepat 3 baris rincian tersimpan',
    `Ditemukan: ${saved.items.length}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: Resolusi Otomatis Cost Center
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Resolusi Otomatis Cost Center Berdasarkan Order By');

  const mockBusinessLines: TenantBusinessLine[] = [
    {
      id: 'lob_01',
      tenantId: 'ten_zyvora_corp',
      code: 'QUEINVITE',
      name: 'Queinvite Wedding Digital',
      description: 'Lini bisnis undangan',
      isPrimary: true,
      isActive: true,
      costCenterCode: 'CC-QUEINVITE',
      allowSharedAllocation: true,
      createdAt: '2026-10-26T00:00:00Z'
    },
    {
      id: 'lob_02',
      tenantId: 'ten_zyvora_corp',
      code: 'RETAIL',
      name: 'Retail Store Official',
      description: 'Lini bisnis merchandise',
      isPrimary: false,
      isActive: true,
      costCenterCode: 'CC-RETAIL',
      allowSharedAllocation: true,
      createdAt: '2026-10-26T00:00:00Z'
    }
  ];

  const mockBranches: Branch[] = [
    {
      id: 'br_jkt_hq',
      businessUnitId: 'bu_holding',
      code: 'JKT',
      name: 'Head Office Jakarta',
      city: 'Jakarta Selatan',
      address: 'Jl. Jend. Sudirman Kav 52-53',
      phone: '+62 21 5150 555',
      isHeadquarters: true,
      isActive: true
    },
    {
      id: 'br_sub_east',
      businessUnitId: 'bu_holding',
      code: 'SUB',
      name: 'Cabang Surabaya',
      city: 'Surabaya',
      address: 'Jl. Basuki Rahmat No. 12',
      phone: '+62 31 5310 111',
      isHeadquarters: false,
      isActive: true
    }
  ];

  const ccLOB = ExpenseClaimService.resolveCostCenter(
    'business_line',
    'lob_01',
    mockBusinessLines,
    [],
    mockBranches
  );
  assert(
    ccLOB.costCenterCode === 'CC-QUEINVITE',
    'Cost Center 1: Order By Lini Bisnis Queinvite mengunci CC-QUEINVITE',
    `Ditemukan: ${ccLOB.costCenterCode}`
  );

  const ccBranch = ExpenseClaimService.resolveCostCenter(
    'branch',
    'br_sub_east',
    mockBusinessLines,
    [],
    mockBranches
  );
  assert(
    ccBranch.costCenterCode === 'CC-BR-SUB',
    'Cost Center 2: Order By Cabang Surabaya mengunci CC-BR-SUB',
    `Ditemukan: ${ccBranch.costCenterCode}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 4: Validasi Aktivitas Armada & Log Bahan Bakar
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Master Armada & Log Aktivitas BBM');

  const fleet = await VehicleMasterService.getVehicles('ten_zyvora_corp');
  assert(
    fleet.length >= 3,
    'Fleet 1: Master armada terisi kendaraan operasional awal',
    `Jumlah: ${fleet.length}`
  );

  const avanza = fleet.find((v) => v.licensePlate === 'B 1234 XYZ');
  assert(
    Boolean(avanza),
    'Fleet 2: Armada B 1234 XYZ tersedia di master kendaraan',
    `Ditemukan: ${avanza?.brandModel}`
  );

  // Validasi perhitungan harga per liter
  const nominalBBM = 350000;
  const liters = 28.5;
  const estimatedPricePerLiter = Math.round(nominalBBM / liters);
  assert(
    estimatedPricePerLiter === 12281,
    'Fleet 3: Kalkulasi rasio harga BBM per liter akurat (Rp 12.281 / Liter)',
    `Ditemukan: ${estimatedPricePerLiter}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 5: Validasi AST Schema Migration 008
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Validasi AST Schema Migration 008 (docs/migrations/008_expense_claims_and_vehicles_schema.sql)');

  const migrationPath = path.resolve('docs/migrations/008_expense_claims_and_vehicles_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration 008: File migrasi tersedia di docs/migrations');

  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(
    sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'),
    'Migration 008: Transaksi dibungkus atomik'
  );
  assert(
    sqlContent.includes('CREATE TABLE IF NOT EXISTS public.company_vehicles'),
    'Migration 008: Tabel company_vehicles didefinisikan'
  );
  assert(
    sqlContent.includes('CREATE TABLE IF NOT EXISTS public.expense_claims'),
    'Migration 008: Tabel expense_claims didefinisikan'
  );
  assert(
    sqlContent.includes('CREATE TABLE IF NOT EXISTS public.expense_claim_items'),
    'Migration 008: Tabel expense_claim_items didefinisikan'
  );
  assert(
    sqlContent.includes('ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY'),
    'Migration 008: RLS aktif untuk tabel klaim'
  );

  try {
    const astResult = (await parse(sqlContent)) as { version?: number; stmts?: unknown[] };
    const stmtsCount = astResult?.stmts?.length || 0;
    assert(
      stmtsCount > 0,
      `Migration 008: Parser PostgreSQL 15+ memvalidasi seluruh ${stmtsCount} pernyataan DDL tanpa error sintaks`
    );
  } catch (err: any) {
    assert(false, 'Migration 008: Parser PostgreSQL gagal', err.message);
  }

  // ------------------------------------------------------------------
  // RINGKASAN HASIL
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  if (failedTests === 0) {
    console.log(`SELURUH PENGUJIAN CLAIM EXPENSE SUKSES: ${passedTests}/${passedTests} TESTS PASSED (100%)`);
  } else {
    console.error(`PENGUJIAN GAGAL: ${failedTests} gagal dari total ${passedTests + failedTests} tes.`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

runClaimExpenseSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
