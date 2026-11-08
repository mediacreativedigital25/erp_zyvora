/**
 * Zyvora ERP 1.0.0 — Test Suite: Cost Allocation & Business Line Foundation (Fase 1)
 *
 * Menguji fondasi alokasi biaya:
 * 1. Standardisasi kode Cost Center
 * 2. Mode 'single' (100% beban lini bisnis tertentu)
 * 3. Mode 'shared_equal' (dibagi rata dengan alokasi sisa rupiah presisi / zero leakage)
 * 4. Pengecualian lini bisnis non-aktif & eksklusif
 * 5. Resolusi kebijakan beban personil (SDM / Claim / Payroll)
 * 6. Validasi sintaks AST PostgreSQL Migration 005 via pgsql-parser
 */

import { CostAllocationService } from '../../services/costAllocationService';
import {
  TenantBusinessLine,
  Employee
} from '../../types/erp';
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

async function runCostAllocationSuite() {
  console.log(`\n======================================================`);
  console.log(`ZYVORA ERP 1.0.0 — COST ALLOCATION & BUSINESS LINE SUITE (FASE 1)`);
  console.log(`======================================================`);

  // Fixtures Lini Bisnis
  const mockLines: TenantBusinessLine[] = [
    {
      id: 'lob_01',
      tenantId: 'ten_zyvora',
      code: 'LOB-01',
      name: 'Queinvite (Undangan Digital & Jasa Desain)',
      description: 'Lini bisnis web invitation, souvenir dan jasa multimedia',
      isPrimary: true,
      isActive: true,
      costCenterCode: 'CC-QUEINVITE',
      allowSharedAllocation: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'lob_02',
      tenantId: 'ten_zyvora',
      code: 'LOB-02',
      name: 'Retail & Distribusi Sembako',
      description: 'Penjualan komoditas pangan pokok dan ritel',
      isPrimary: false,
      isActive: true,
      costCenterCode: 'CC-RETAIL-02',
      allowSharedAllocation: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'lob_03',
      tenantId: 'ten_zyvora',
      code: 'LOB-03',
      name: 'Logistik & Ekspedisi',
      description: 'Jasa angkut dan pergudangan',
      isPrimary: false,
      isActive: true,
      costCenterCode: 'CC-LOGISTIK',
      allowSharedAllocation: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'lob_04_exclusive',
      tenantId: 'ten_zyvora',
      code: 'LOB-04',
      name: 'Proyek Eksklusif Terpisah',
      description: 'Unit bisnis mandiri yang tidak menanggung beban pusat',
      isPrimary: false,
      isActive: true,
      costCenterCode: 'CC-EKSKLUSIF',
      allowSharedAllocation: false, // Tidak menerima beban bersama
      createdAt: new Date().toISOString()
    },
    {
      id: 'lob_05_inactive',
      tenantId: 'ten_zyvora',
      code: 'LOB-05',
      name: 'Lini Bisnis Nonaktif',
      description: 'Sudah tidak beroperasi',
      isPrimary: false,
      isActive: false, // Nonaktif
      costCenterCode: 'CC-INACTIVE',
      allowSharedAllocation: true,
      createdAt: new Date().toISOString()
    }
  ];

  // --------------------------------------------------------------------
  // TEST GROUP 1: Standardisasi Kode Cost Center
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] Standardisasi Kode Cost Center Lini Bisnis`);
  assert(
    CostAllocationService.generateCostCenterCode('LOB-01') === 'CC-LOB-01',
    'CC 1: Kode LOB-01 menghasilkan CC-LOB-01'
  );
  assert(
    CostAllocationService.generateCostCenterCode('CC-QUEINVITE') === 'CC-QUEINVITE',
    'CC 2: Kode yang sudah berawalan CC- tidak diduplikasi'
  );
  assert(
    CostAllocationService.generateCostCenterCode('retail') === 'CC-RETAIL',
    'CC 3: Huruf kecil dinormalisasi menjadi huruf kapital'
  );

  // --------------------------------------------------------------------
  // TEST GROUP 2: Mode Single (100% Beban ke Lini Bisnis Tertentu)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Alokasi Mode 'single' (100% ke Lini Tertentu)`);
  const singleQueinvite = CostAllocationService.calculateAllocation(
    2500000,
    'single',
    mockLines,
    'lob_01'
  );
  assert(singleQueinvite.allocations.length === 1, 'Single 1: Menghasilkan tepat 1 entri alokasi');
  assert(singleQueinvite.allocations[0].businessLineId === 'lob_01', 'Single 2: Tertuju ke Queinvite');
  assert(singleQueinvite.allocations[0].allocatedAmount === 2500000, 'Single 3: Nominal persis 100% (2.500.000)');
  assert(singleQueinvite.allocations[0].costCenterCode === 'CC-QUEINVITE', 'Single 4: Membawa kode Cost Center Queinvite');
  assert(singleQueinvite.isBalanced, 'Single 5: Alokasi seimbang (isBalanced = true)');

  // Fallback ke primary jika target tidak ditemukan
  const singleFallback = CostAllocationService.calculateAllocation(
    1000000,
    'single',
    mockLines,
    'id_tidak_dikenal'
  );
  assert(singleFallback.allocations[0].businessLineId === 'lob_01', 'Single 6: Fallback ke Lini Utama saat ID tidak ditemukan');
  assert(singleFallback.allocations[0].allocatedAmount === 1000000, 'Single 7: Nominal fallback tetap utuh');

  // --------------------------------------------------------------------
  // TEST GROUP 3: Mode Shared Equal (Dibagi Rata Antar Lini Bisnis Aktif)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Alokasi Mode 'shared_equal' (Dibagi Rata Tanpa Kebocoran Rupiah)`);
  // 3 Lini aktif eligible (LOB-01, LOB-02, LOB-03; LOB-04 exclusive diabaikan, LOB-05 inactive diabaikan)
  const sharedEven = CostAllocationService.calculateAllocation(
    3000000,
    'shared_equal',
    mockLines
  );
  assert(sharedEven.allocations.length === 3, 'Shared 1: Tepat 3 lini bisnis aktif menerima alokasi');
  assert(sharedEven.allocations.every((a) => a.allocatedAmount === 1000000), 'Shared 2: Angka genap terbagi rata tepat Rp 1.000.000 per lini');
  assert(sharedEven.isBalanced, 'Shared 3: Alokasi genap seimbang');

  // Angka ganjil: Rp 1.000.000 dibagi 3 lini = 333.334 + 333.333 + 333.333 = 1.000.000
  const sharedOdd = CostAllocationService.calculateAllocation(
    1000000,
    'shared_equal',
    mockLines
  );
  const totalSharedOdd = sharedOdd.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  assert(totalSharedOdd === 1000000, 'Shared 4: Zero Penny Leakage — total alokasi persis Rp 1.000.000 tanpa selisih 1 Rupiah pun');
  assert(sharedOdd.isBalanced, 'Shared 5: Flag isBalanced tetap true pada angka ganjil');
  assert(sharedOdd.allocations[0].allocatedAmount === 333334, 'Shared 6: Sisa pembagian dialokasikan presisi ke lini pertama (+Rp 1)');
  assert(sharedOdd.allocations[1].allocatedAmount === 333333, 'Shared 7: Lini kedua menerima Rp 333.333');
  assert(sharedOdd.allocations[2].allocatedAmount === 333333, 'Shared 8: Lini ketiga menerima Rp 333.333');

  // --------------------------------------------------------------------
  // TEST GROUP 4: Pengecualian Lini Bisnis Non-Aktif & Eksklusif
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Pengecualian Lini Bisnis Non-Aktif & Eksklusif`);
  const hasInactiveAllocated = sharedOdd.allocations.some((a) => a.businessLineId === 'lob_05_inactive');
  assert(!hasInactiveAllocated, 'Filter 1: Lini bisnis nonaktif (lob_05) TIDAK menerima beban bersama');

  const hasExclusiveAllocated = sharedOdd.allocations.some((a) => a.businessLineId === 'lob_04_exclusive');
  assert(!hasExclusiveAllocated, 'Filter 2: Lini bisnis eksklusif (allowSharedAllocation = false) TIDAK dibebani biaya bersama');

  // --------------------------------------------------------------------
  // TEST GROUP 5: Kebijakan Biaya Personil (Karyawan / SDM)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 5] Kebijakan Biaya Personil (Gaji & Claim Expense)`);
  const employeeDesigner: Employee = {
    id: 'emp_01',
    tenantId: 'ten_zyvora',
    employeeCode: 'EMP-01',
    fullName: 'Budi Santoso (Designer Queinvite)',
    email: 'budi@queinvite.com',
    phone: '08123456789',
    department: 'Creative',
    position: 'Lead Web Designer',
    branchId: 'br_01',
    joinDate: '2024-01-01',
    status: 'active',
    costAllocation: {
      mode: 'single',
      businessLineId: 'lob_01',
      notes: 'Khusus staf kreatif Queinvite'
    }
  };

  const designerClaim = CostAllocationService.resolvePersonilAllocation(
    employeeDesigner,
    mockLines,
    500000 // Klaim bensin/server
  );
  assert(designerClaim.mode === 'single', 'Personil 1: Mode personil adalah single');
  assert(designerClaim.allocations[0].businessLineId === 'lob_01', 'Personil 2: Klaim dibebankan 100% ke Queinvite');
  assert(designerClaim.allocations[0].allocatedAmount === 500000, 'Personil 3: Nominal klaim Rp 500.000 utuh');

  // Karyawan Finance Holding (Shared Services)
  const employeeHoldingFinance: Employee = {
    id: 'emp_02',
    tenantId: 'ten_zyvora',
    employeeCode: 'EMP-02',
    fullName: 'Siti Rahma (Finance Holding)',
    email: 'finance@holding.com',
    phone: '08129876543',
    department: 'Finance',
    position: 'Holding Senior Accountant',
    branchId: 'br_01',
    joinDate: '2023-01-01',
    status: 'active',
    costAllocation: {
      mode: 'shared_equal',
      notes: 'Staf keuangan pusat dibagi rata ke seluruh lini bisnis aktif'
    }
  };

  const financeSalary = CostAllocationService.resolvePersonilAllocation(
    employeeHoldingFinance,
    mockLines,
    6000000 // Gaji Siti Rp 6.000.000
  );
  assert(financeSalary.mode === 'shared_equal', 'Personil 4: Mode personil holding adalah shared_equal');
  assert(financeSalary.allocations.length === 3, 'Personil 5: Terbagi ke 3 lini bisnis aktif');
  assert(
    financeSalary.allocations.find((a) => a.businessLineId === 'lob_01')?.allocatedAmount === 2000000,
    'Personil 6: Lini Queinvite menanggung Rp 2.000.000 (1/3 dari total gaji)'
  );
  assert(
    financeSalary.allocations.find((a) => a.businessLineId === 'lob_02')?.allocatedAmount === 2000000,
    'Personil 7: Lini Retail menanggung Rp 2.000.000'
  );
  assert(
    financeSalary.allocations.find((a) => a.businessLineId === 'lob_03')?.allocatedAmount === 2000000,
    'Personil 8: Lini Logistik menanggung Rp 2.000.000'
  );

  // --------------------------------------------------------------------
  // TEST GROUP 6: Validasi AST Migration 005 (pgsql-parser)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 6] Validasi AST Schema Migration 005 (docs/migrations/005_business_line_cost_center_schema.sql)`);
  const migrationPath = path.resolve('docs/migrations/005_business_line_cost_center_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration 005: File migrasi tersedia di docs/migrations');

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  assert(sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'), 'Migration 005: Transaksi dibungkus atomik');
  assert(sqlContent.includes('cost_center_code VARCHAR(32)'), 'Migration 005: Kolom cost_center_code didefinisikan');
  assert(sqlContent.includes('allow_shared_allocation BOOLEAN'), 'Migration 005: Kolom allow_shared_allocation didefinisikan');
  assert(sqlContent.includes('business_line_id UUID'), 'Migration 005: Kolom business_line_id didefinisikan');

  const astResult = (await parse(sqlContent)) as { version?: number; stmts?: unknown[] };
  const stmtsCount = Array.isArray(astResult?.stmts) ? astResult.stmts.length : 0;
  assert(stmtsCount >= 6, `Migration 005: Parser PostgreSQL 15+ memvalidasi seluruh ${stmtsCount} pernyataan DDL tanpa error sintaks`);

  console.log(`\n======================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN FASE 1 FONDASI BIAYA SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`======================================================\n`);
}

runCostAllocationSuite().catch((err) => {
  console.error(`${RED}Cost Allocation test failed:${RESET}`, err);
  process.exit(1);
});
