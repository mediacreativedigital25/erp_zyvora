/**
 * Zyvora ERP 1.0.0 — Test Suite: Master Tenant (Tahap 1)
 * Validates Company Profile, Cloudflare R2 Media Service, Multi Lines of Business,
 * System Configuration, RBAC authorization, and Migration 002 AST.
 */

import { TenantMasterService } from '../../services/tenantMasterService';
import { MediaService } from '../../services/mediaService';
import {
  UserProfile,
  CompanyProfile,
  TenantMarketProfile,
  TenantBusinessLine,
  TenantSystemConfig
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

async function runMasterTenantSuite() {
  console.log(`\n======================================================`);
  console.log(`ZYVORA ERP 1.0.0 — MASTER TENANT TEST SUITE (TAHAP 1)`);
  console.log(`======================================================`);

  const mockSuperAdmin: UserProfile = {
    id: 'user_sa_01',
    userCode: '2A',
    email: 'admin@yulovi.com',
    fullName: 'Platform Super Administrator',
    role: 'super_admin',
    roleTitle: 'Platform Super Admin',
    isPlatformSuperAdmin: true,
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const mockTenantOwner: UserProfile = {
    id: 'user_owner_01',
    userCode: '2B',
    email: 'owner@zyvora.com',
    fullName: 'Tenant Owner Executive',
    role: 'owner',
    roleTitle: 'OWNER Tenant Member',
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const mockTenantSales: UserProfile = {
    id: 'user_sales_01',
    userCode: '2C',
    email: 'sales@zyvora.com',
    fullName: 'Sales Representative',
    role: 'sales',
    roleTitle: 'SALES Tenant Member',
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  // --------------------------------------------------------------------
  // TEST GROUP 1: Hak Akses RBAC Master Tenant
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] RBAC Authorization: Master Tenant Access Guards`);
  assert(TenantMasterService.canEditMaster(mockSuperAdmin), 'RBAC 1: Platform Super Admin DIIZINKAN mengedit Master Tenant');
  assert(TenantMasterService.canEditMaster(mockTenantOwner), 'RBAC 2: Tenant Owner DIIZINKAN mengedit Master Tenant');
  assert(TenantMasterService.canEditMaster({ ...mockTenantOwner, role: 'admin' }), 'RBAC 3: Tenant Admin DIIZINKAN mengedit Master Tenant');
  assert(!TenantMasterService.canEditMaster(mockTenantSales), 'RBAC 4: Anggota biasa (Sales) DITOLAK mengedit Master Tenant (Hanya-Baca)');
  assert(!TenantMasterService.canEditMaster({ ...mockTenantSales, role: 'customer' }), 'RBAC 5: Peran Customer DITOLAK mengedit Master Tenant');

  // --------------------------------------------------------------------
  // TEST GROUP 2: Validasi & Invariant Profil Perusahaan
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Profil Perusahaan: Aturan Validasi & Invariant`);
  const defaultProfile = TenantMasterService.getDefaultCompanyProfile('ten_alpha', 'ZYV-ALPHA');
  assert(defaultProfile.tenantCode === 'ZYV-ALPHA', 'Profile 1: Tenant Code terikat dengan benar');
  assert(defaultProfile.country === 'Indonesia', 'Profile 2: Default negara adalah Indonesia');

  // Validasi input
  let caughtError = false;
  try {
    await TenantMasterService.saveCompanyProfile({ ...defaultProfile, legalName: 'AB' }, mockTenantOwner);
  } catch {
    caughtError = true;
  }
  assert(caughtError, 'Profile 3: Nama legal di bawah 3 karakter DITOLAK dengan validasi');

  caughtError = false;
  try {
    await TenantMasterService.saveCompanyProfile({ ...defaultProfile, email: 'bukan-email' }, mockTenantOwner);
  } catch {
    caughtError = true;
  }
  assert(caughtError, 'Profile 4: Format email tidak valid DITOLAK');

  caughtError = false;
  try {
    await TenantMasterService.saveCompanyProfile(defaultProfile, mockTenantSales);
  } catch {
    caughtError = true;
  }
  assert(caughtError, 'Profile 5: Aktor non-admin DITOLAK saat menyimpan profil (ERR_FORBIDDEN)');

  // --------------------------------------------------------------------
  // TEST GROUP 3: Media Storage Cloudflare R2
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Cloudflare R2 Media Service & Format Validation`);
  const validPngFile = new File(['dummy-bytes'], 'logo.png', { type: 'image/png' });
  const valResult = MediaService.validateImageFile(validPngFile);
  assert(valResult.valid, 'R2 1: Berkas PNG valid diterima');

  const exeFile = new File(['dummy-bytes'], 'script.exe', { type: 'application/x-msdownload' });
  const exeVal = MediaService.validateImageFile(exeFile);
  assert(!exeVal.valid, 'R2 2: Berkas format biner terlarang (.exe) DITOLAK');

  // File size limit
  const largeFile = new File([new Uint8Array(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
  const largeVal = MediaService.validateImageFile(largeFile);
  assert(!largeVal.valid, 'R2 3: Berkas melebihi 2MB DITOLAK');

  // Simulated upload generates canonical R2 CDN URL
  const uploadRes = await MediaService.uploadCompanyLogo('ten_alpha', validPngFile);
  assert(uploadRes.success && Boolean(uploadRes.url?.includes('/tenants/ten_alpha/brand/logo_')), 'R2 4: Upload menghasilkan URL CDN Cloudflare R2 terstandarisasi');
  assert(!uploadRes.url?.includes('base64'), 'R2 5: URL tidak mengandung payload base64 di database reference');

  // --------------------------------------------------------------------
  // TEST GROUP 4: Market & Lini Bisnis (Multi LOB & Primary Invariant)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Market & Lini Bisnis: Multi LOB & Primary Invariant`);
  const defaultMarket = TenantMasterService.getDefaultMarketProfile('ten_alpha');
  assert(defaultMarket.businessLines.length >= 2, 'Market 1: Mendukung beberapa lini bisnis dalam satu tenant');
  assert(defaultMarket.businessLines.filter(l => l.isPrimary).length === 1, 'Market 2: Invariant Tepat 1 Lini Bisnis Utama (Primary)');

  // Demotion / Promotion rule test
  const lines: TenantBusinessLine[] = [
    { id: '1', tenantId: 'ten_alpha', code: 'LOB-01', name: 'Line 1', description: '', isPrimary: true, isActive: true, createdAt: '' },
    { id: '2', tenantId: 'ten_alpha', code: 'LOB-02', name: 'Line 2', description: '', isPrimary: true, isActive: true, createdAt: '' }
  ];
  const normalizedMarket = await TenantMasterService.saveMarketProfile(
    { ...defaultMarket, businessLines: lines },
    mockTenantOwner
  );
  const primaryCount = normalizedMarket.profile.businessLines.filter(l => l.isPrimary).length;
  assert(primaryCount === 1, 'Market 3: Menyimpan multi primary otomatis dinormalisasi menjadi tepat 1 primary');

  assert(normalizedMarket.profile.industryCategory === defaultMarket.industryCategory, 'Market 4: Kategori industri tersimpan tanpa mengubah entitlement modul');

  // Automatic Business Line Code Generation (LOB-XX) & Immutability
  const nextCodeEmpty = TenantMasterService.generateNextBusinessLineCode([]);
  assert(nextCodeEmpty === 'LOB-01', 'Market 5: Kode lini bisnis pertama otomatis "LOB-01"');

  const nextCodeFromExisting = TenantMasterService.generateNextBusinessLineCode(lines);
  assert(nextCodeFromExisting === 'LOB-03', 'Market 6: Kode lini bisnis baru berurutan otomatis "LOB-03" setelah LOB-01 & LOB-02');

  const nonContinuousLines: TenantBusinessLine[] = [
    { id: '1', tenantId: 'ten_alpha', code: 'LOB-01', name: 'L1', description: '', isPrimary: true, isActive: true, createdAt: '' },
    { id: '5', tenantId: 'ten_alpha', code: 'LOB-05', name: 'L5', description: '', isPrimary: false, isActive: true, createdAt: '' }
  ];
  const nextNonContinuous = TenantMasterService.generateNextBusinessLineCode(nonContinuousLines);
  assert(nextNonContinuous === 'LOB-06', 'Market 7: Kode berurutan mengambil max sequence + 1 ("LOB-06") untuk mencegah tabrakan ID');

  // --------------------------------------------------------------------
  // TEST GROUP 5: Konfigurasi Sistem Dasar
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 5] Konfigurasi Sistem Dasar: Parameter & Penomoran`);
  const defaultSys = TenantMasterService.getDefaultSystemConfig('ten_alpha');
  assert(defaultSys.baseCurrency === 'IDR', 'Config 1: Mata uang dasar default adalah IDR');
  assert(defaultSys.timezone === 'Asia/Jakarta', 'Config 2: Zona waktu default adalah Asia/Jakarta (WIB)');
  assert(defaultSys.language === 'id', 'Config 3: Bahasa default adalah Bahasa Indonesia (id)');
  assert(defaultSys.dateFormat === 'DD/MM/YYYY', 'Config 4: Format tanggal default adalah DD/MM/YYYY');
  assert(defaultSys.fiscalYearStartMonth === 1, 'Config 5: Tahun buku default dimulai Januari (Bulan 1)');

  const updatedSys = await TenantMasterService.saveSystemConfig(
    { ...defaultSys, baseCurrency: 'USD', timezone: 'Asia/Makassar' },
    mockTenantOwner
  );
  assert(updatedSys.config.baseCurrency === 'USD' && updatedSys.config.timezone === 'Asia/Makassar', 'Config 6: Pembaruan konfigurasi tersimpan dengan benar');

  // --------------------------------------------------------------------
  // TEST GROUP 6: Validasi AST Migration 002 (pgsql-parser)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 6] Validasi AST Schema Migration 002 (docs/migrations/002_master_tenant_schema.sql)`);
  const migrationPath = path.resolve('docs/migrations/002_master_tenant_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration 002: File naskah skema tersedia di docs/migrations');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(migrationSql.includes('BEGIN;') && migrationSql.includes('COMMIT;'), 'Migration 002: Transaksi dibungkus BEGIN/COMMIT');
  assert(migrationSql.includes('public.company_profiles'), 'Migration 002: Tabel company_profiles didefinisikan');
  assert(migrationSql.includes('public.tenant_market_profiles'), 'Migration 002: Tabel tenant_market_profiles didefinisikan');
  assert(migrationSql.includes('public.tenant_business_lines'), 'Migration 002: Tabel tenant_business_lines didefinisikan');
  assert(migrationSql.includes('public.tenant_system_configs'), 'Migration 002: Tabel tenant_system_configs didefinisikan');
  assert(migrationSql.includes('get_auth_user_tenant_ids()'), 'Migration 002: Policy RLS menggunakan helper get_auth_user_tenant_ids()');
  assert(migrationSql.includes('get_auth_user_admin_tenant_ids()'), 'Migration 002: Hak mutasi dibatasi oleh helper get_auth_user_admin_tenant_ids()');

  const astResult = (await parse(migrationSql)) as { version?: number; stmts?: unknown[] };
  const stmtsCount = Array.isArray(astResult?.stmts) ? astResult.stmts.length : 0;
  assert(stmtsCount === 36, `Migration 002: Parser PostgreSQL 15+ memvalidasi seluruh ${stmtsCount} pernyataan DDL tanpa error sintaks`);

  console.log(`\n======================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN MASTER TENANT SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`======================================================\n`);
}

runMasterTenantSuite().catch((err) => {
  console.error(`${RED}Master Tenant test failed:${RESET}`, err);
  process.exit(1);
});
