/**
 * Zyvora ERP 1.0.0 — Test Suite: Global Address Standard & Indonesia Hierarchy
 * Validates 4-Tier Administrative Hierarchy, Cascading Resets, Postal Code Suggestions,
 * Shared Validator, Persistent Storage Round-Trip, and Migration 003 AST.
 */

import { IndonesiaRegionService, SUPPORTED_COUNTRIES } from '../../services/indonesiaRegionService';
import { PROVINCES } from '../../data/indonesiaRegions';
import { TenantMasterService } from '../../services/tenantMasterService';
import { UserProfile, CompanyProfile, StandardAddressData } from '../../types/erp';
import { validateStandardAddress } from '../../components/common/AddressForm';
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

async function runAddressTestSuite() {
  console.log(`\n==================================================================`);
  console.log(`ZYVORA ERP 1.0.0 — TEST SUITE: GLOBAL ADDRESS STANDARD`);
  console.log(`==================================================================`);

  // --------------------------------------------------------------------
  // TEST GROUP 1: Master Wilayah Indonesia (38 Provinsi & Hirarki)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] Master Data Wilayah & Daftar Negara`);
  const provinces = IndonesiaRegionService.getProvinces();
  assert(provinces.length === 38, `1.1: Tepat 38 provinsi resmi Republik Indonesia terdaftar (didapat: ${provinces.length})`);
  assert(provinces.some((p) => p.name === 'DKI Jakarta' && p.id === '31'), '1.2: DKI Jakarta (ID: 31) tersedia');
  assert(provinces.some((p) => p.name === 'Jawa Tengah' && p.id === '33'), '1.3: Jawa Tengah (ID: 33) tersedia');
  assert(SUPPORTED_COUNTRIES.some((c) => c.name === 'Indonesia' && c.code === 'ID'), '1.4: Indonesia tersedia sebagai negara default sistem');

  // --------------------------------------------------------------------
  // TEST GROUP 2: Pemuatan Kabupaten/Kota, Kecamatan, dan Kelurahan
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Pemuatan Bertahap Wilayah Administratif`);
  const regenciesJateng = await IndonesiaRegionService.getRegencies('33');
  assert(regenciesJateng.length >= 35, `2.1: Seluruh 35 Kab/Kota di Jawa Tengah dapat dimuat (didapat: ${regenciesJateng.length})`);
  assert(regenciesJateng.some((r) => r.name.includes('Semarang')), '2.2: Kota/Kab Semarang ada di daftar Jawa Tengah');

  const regenciesJakarta = await IndonesiaRegionService.getRegencies('31');
  assert(regenciesJakarta.length >= 6, `2.3: Wilayah DKI Jakarta dapat dimuat (didapat: ${regenciesJakarta.length})`);

  // Districts for Jakarta Selatan (3171)
  const districtsJaksel = await IndonesiaRegionService.getDistricts('3171');
  assert(districtsJaksel.length > 0, `2.4: Kecamatan untuk Jakarta Selatan (3171) dapat dimuat`);
  assert(districtsJaksel.some((d) => d.name.toLowerCase().includes('kebayoran baru')), '2.5: Kecamatan Kebayoran Baru ditemukan');

  // Districts for Jakarta Barat (3174) — ensure no regression/false remapping
  const districtsJakbar = await IndonesiaRegionService.getDistricts('3174');
  assert(districtsJakbar.length > 0, `2.6: Kecamatan untuk Jakarta Barat (3174) dapat dimuat`);

  // Villages for Kebayoran Baru
  const matchedDistrict = districtsJaksel.find((d) => d.name.toLowerCase().includes('kebayoran baru'));
  const districtIdToTest = matchedDistrict?.id || '317101';
  const villagesKebayoran = await IndonesiaRegionService.getVillages(districtIdToTest);
  assert(villagesKebayoran.length > 0, `2.7: Kelurahan untuk Kebayoran Baru dapat dimuat bertahap (didapat: ${villagesKebayoran.length})`);

  // --------------------------------------------------------------------
  // TEST GROUP 3: Rekomendasi Kode Pos Cerdas
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Rekomendasi Kode Pos Berdasarkan Wilayah`);
  const postalSenayan = IndonesiaRegionService.suggestPostalCode(undefined, 'Senayan', undefined, 'Kebayoran Baru');
  assert(postalSenayan === '12190', `3.1: Kelurahan Senayan menghasilkan saran kode pos 12190 (didapat: ${postalSenayan})`);

  const postalMiroto = IndonesiaRegionService.suggestPostalCode(undefined, 'Miroto', undefined, 'Semarang Tengah');
  assert(postalMiroto === '50134', `3.2: Kelurahan Miroto Semarang menghasilkan kode pos 50134 (didapat: ${postalMiroto})`);

  const postalDago = IndonesiaRegionService.suggestPostalCode(undefined, 'Dago', undefined, 'Coblong');
  assert(postalDago === '40135', `3.3: Kelurahan Dago Bandung menghasilkan kode pos 40135 (didapat: ${postalDago})`);

  // --------------------------------------------------------------------
  // TEST GROUP 4: Penyimpanan & Retensi Data Profil Perusahaan
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Integritas Penyimpanan & Backward Compatibility Data`);
  const mockAdmin: UserProfile = {
    id: 'user_admin_test',
    userCode: '1A',
    email: 'admin@perusahaan.com',
    fullName: 'Admin Tenant',
    role: 'admin',
    roleTitle: 'Administrator',
    status: 'active',
    tenantId: 'ten_test_address',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const testProfile: CompanyProfile = {
    ...TenantMasterService.getDefaultCompanyProfile('ten_test_address', 'ZYV-TEST'),
    country: 'Indonesia',
    provinceId: '33',
    provinceName: 'Jawa Tengah',
    regencyId: '3374',
    regencyName: 'Kota Semarang',
    districtId: '337401',
    districtName: 'Semarang Tengah',
    villageId: '3374011001',
    villageName: 'Miroto',
    postalCode: '50134',
    address: 'Jl. Pemuda No. 142, Gedung Graha Megah Lt. 4, RT.02/RW.05',
    updatedAt: new Date().toISOString()
  };

  const saveRes = await TenantMasterService.saveCompanyProfile(testProfile, mockAdmin);
  assert(saveRes.success, '4.1: Profil dengan struktur alamat lengkap Indonesia berhasil disimpan');

  const retrieved = await TenantMasterService.getCompanyProfile('ten_test_address', 'ZYV-TEST');
  assert(retrieved.country === 'Indonesia', '4.2: Field Negara tersimpan dan dimuat kembali');
  assert(retrieved.provinceId === '33' && retrieved.provinceName === 'Jawa Tengah', '4.3: Field Provinsi tersimpan dan dimuat kembali');
  assert(retrieved.regencyId === '3374' && retrieved.regencyName === 'Kota Semarang', '4.4: Field Kabupaten/Kota tersimpan dan dimuat kembali');
  assert(retrieved.districtId === '337401' && retrieved.districtName === 'Semarang Tengah', '4.5: Field Kecamatan tersimpan dan dimuat kembali');
  assert(retrieved.villageId === '3374011001' && retrieved.villageName === 'Miroto', '4.6: Field Kelurahan/Desa tersimpan dan dimuat kembali');
  assert(retrieved.postalCode === '50134', '4.7: Field Kode Pos tersimpan dan dimuat kembali');
  assert(retrieved.address === 'Jl. Pemuda No. 142, Gedung Graha Megah Lt. 4, RT.02/RW.05', '4.8: Field Alamat Lengkap tersimpan dan dimuat kembali');

  // --------------------------------------------------------------------
  // TEST GROUP 5: Komponen Validator Bersama (validateStandardAddress)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 5] Komponen Validator Bersama (validateStandardAddress)`);
  const validAddr: StandardAddressData = {
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '3171',
    regencyName: 'Kota Jakarta Selatan',
    districtId: '3171060',
    districtName: 'Kebayoran Baru',
    villageId: '3171060010',
    villageName: 'Senayan',
    postalCode: '12190',
    address: 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55'
  };

  const errsValid = validateStandardAddress(validAddr);
  assert(Object.keys(errsValid).length === 0, '5.1: Alamat Indonesia lengkap dan valid lulus tanpa error');

  const incompleteAddr: StandardAddressData = {
    country: 'Indonesia',
    provinceId: '',
    regencyId: '',
    districtId: '',
    villageId: '',
    address: 'Jl'
  };
  const errsIncomplete = validateStandardAddress(incompleteAddr);
  assert(Boolean(errsIncomplete.province), '5.2: Provinsi kosong menghasilkan error validasi');
  assert(Boolean(errsIncomplete.regency), '5.3: Kabupaten/Kota kosong menghasilkan error validasi');
  assert(Boolean(errsIncomplete.district), '5.4: Kecamatan kosong menghasilkan error validasi');
  assert(Boolean(errsIncomplete.village), '5.5: Kelurahan kosong menghasilkan error validasi');
  assert(Boolean(errsIncomplete.address), '5.6: Alamat terlalu pendek (<5 karakter) menghasilkan error');

  const invalidPostalAddr: StandardAddressData = {
    ...validAddr,
    postalCode: '123'
  };
  const errsPostal = validateStandardAddress(invalidPostalAddr);
  assert(Boolean(errsPostal.postalCode), '5.7: Format kode pos non-5 digit ditolak');

  // Foreign country address (e.g. Singapura) does not force Indonesian subdistricts
  const foreignAddr: StandardAddressData = {
    country: 'Singapura',
    address: '10 Marina Boulevard, Tower 2 #32-01',
    postalCode: '018983'
  };
  const errsForeign = validateStandardAddress(foreignAddr);
  assert(!errsForeign.province && !errsForeign.district, '5.8: Alamat luar negeri tidak dipaksakan mengisi kecamatan/kelurahan Kemendagri');

  // --------------------------------------------------------------------
  // TEST GROUP 6: Validasi AST Migration 003 (docs/migrations/003_global_address_standard.sql)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 6] Validasi AST Schema Migration 003`);
  const mig003Path = path.resolve('docs/migrations/003_global_address_standard.sql');
  assert(fs.existsSync(mig003Path), '6.1: Naskah migrasi 003 tersedia di docs/migrations');

  const mig003Sql = fs.readFileSync(mig003Path, 'utf8');
  assert(mig003Sql.includes('BEGIN;') && mig003Sql.includes('COMMIT;'), '6.2: Migrasi 003 dibungkus transaksi atomik');
  assert(mig003Sql.includes('public.customers'), '6.3: Tabel customers distandarisasi');
  assert(mig003Sql.includes('public.branches'), '6.4: Tabel branches distandarisasi');
  assert(mig003Sql.includes('public.warehouses'), '6.5: Tabel warehouses distandarisasi');
  assert(mig003Sql.includes('public.vendors'), '6.6: Tabel vendors distandarisasi');

  const ast003 = (await parse(mig003Sql)) as { version?: number; stmts?: unknown[] };
  const stmtsCount = Array.isArray(ast003?.stmts) ? ast003.stmts.length : 0;
  assert(stmtsCount >= 5, `6.7: Parser PostgreSQL 15+ memvalidasi seluruh ${stmtsCount} pernyataan DDL Migration 003 tanpa error`);

  console.log(`\n==================================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN GLOBAL ADDRESS STANDARD SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`==================================================================\n`);
}

runAddressTestSuite().catch((err) => {
  console.error(`${RED}Address test suite failed:${RESET}`, err);
  process.exit(1);
});
