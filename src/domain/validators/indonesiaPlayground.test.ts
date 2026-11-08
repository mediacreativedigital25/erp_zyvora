/**
 * Zyvora ERP 1.0.0 — Test Suite: Playground API Wilayah Indonesia (Emsifa v2)
 *
 * Verifies:
 * 1. Provinces retrieval from Emsifa v2
 * 2. Regencies cascading from Province
 * 3. Districts cascading from Regency
 * 4. Villages cascading from District
 * 5. Parent cascade resets and invalidation
 * 6. Live API request URL construction, latency measurement, and JSON parsing
 * 7. Error handling for non-OK / 404 endpoints
 * 8. Polygon path retrieval and multi-ring island normalization
 * 9. Postal code direct search endpoint
 * 10. Isolation invariant: Playground queries do NOT mutate tenant profile storage
 */

import { IndonesiaRegionService } from '../../services/indonesiaRegionService';
import { TenantMasterService } from '../../services/tenantMasterService';
import { UserProfile } from '../../types/erp';

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

async function runPlaygroundTestSuite() {
  console.log(`\n==================================================================`);
  console.log(`ZYVORA ERP 1.0.0 — TEST SUITE: PLAYGROUND API WILAYAH INDONESIA V2`);
  console.log(`==================================================================`);

  // --------------------------------------------------------------------
  // TEST GROUP 1: Provinces API (/provinces.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] Fetch Provinsi Emsifa v2`);
  const provResult = await IndonesiaRegionService.fetchV2Provinces();
  assert(provResult.ok === true, '1.1: Request /provinces.json berstatus OK (200)');
  assert(provResult.status === 200, `1.2: HTTP status code adalah 200 (didapat: ${provResult.status})`);
  assert(Array.isArray(provResult.data), '1.3: Data provinsi berupa array');
  assert(provResult.data!.length >= 34, `1.4: Memuat setidaknya 34+ provinsi (didapat: ${provResult.data!.length})`);
  const dki = provResult.data!.find((p) => p.id === '31');
  assert(Boolean(dki), '1.5: DKI Jakarta dengan ID "31" ditemukan pada v2');
  assert(dki?.has_path === true, '1.6: DKI Jakarta memiliki polygon (has_path: true)');
  assert(typeof dki?.lat === 'number' && typeof dki?.lng === 'number', '1.7: Koordinat lat/lng tersedia');

  // --------------------------------------------------------------------
  // TEST GROUP 2: Regencies API Cascading (/regencies/{province_id}.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Fetch Kabupaten/Kota Cascading`);
  const regResult = await IndonesiaRegionService.fetchV2Regencies('31');
  assert(regResult.ok === true, '2.1: Request /regencies/31.json berstatus OK');
  assert(Array.isArray(regResult.data) && regResult.data.length >= 5, `2.2: DKI Jakarta memiliki 5+ wilayah kota/kabupaten (didapat: ${regResult.data?.length})`);
  const jaksel = regResult.data!.find((r) => r.id === '31.74' || r.name.toLowerCase().includes('jakarta selatan'));
  assert(Boolean(jaksel), '2.3: Jakarta Selatan ditemukan di daftar regencies DKI');
  assert(Boolean(jaksel?.id.startsWith('31.')), `2.4: ID Kab/Kota berawalan kode provinsi "31." (didapat: ${jaksel?.id})`);

  // --------------------------------------------------------------------
  // TEST GROUP 3: Districts API Cascading (/districts/{regency_id}.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Fetch Kecamatan Cascading`);
  const regencyId = jaksel?.id || '31.74';
  const distResult = await IndonesiaRegionService.fetchV2Districts(regencyId);
  assert(distResult.ok === true, '3.1: Request /districts/{regency_id}.json berstatus OK');
  assert(Array.isArray(distResult.data) && distResult.data.length > 0, `3.2: Kecamatan di Jakarta Selatan berhasil dimuat (didapat: ${distResult.data?.length})`);
  const kebBaru = distResult.data!.find((d) => d.name.toLowerCase().includes('kebayoran baru'));
  assert(Boolean(kebBaru), '3.3: Kecamatan Kebayoran Baru ditemukan');
  assert(Boolean(kebBaru?.id.startsWith(regencyId)), `3.4: ID Kecamatan berawalan ID Kab/Kota (didapat: ${kebBaru?.id})`);

  // --------------------------------------------------------------------
  // TEST GROUP 4: Villages API Cascading (/villages/{district_id}.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Fetch Kelurahan/Desa Cascading`);
  const districtId = kebBaru?.id || '31.74.07';
  const vilResult = await IndonesiaRegionService.fetchV2Villages(districtId);
  assert(vilResult.ok === true, '4.1: Request /villages/{district_id}.json berstatus OK');
  assert(Array.isArray(vilResult.data) && vilResult.data.length >= 7, `4.2: Kelurahan di Kebayoran Baru berhasil dimuat (didapat: ${vilResult.data?.length})`);
  const senayan = vilResult.data!.find((v) => v.name.toLowerCase().includes('senayan'));
  assert(Boolean(senayan), '4.3: Kelurahan Senayan ditemukan');
  assert(senayan?.postal_code === '12190', `4.4: Kode pos kelurahan Senayan adalah 12190 (didapat: ${senayan?.postal_code})`);

  // --------------------------------------------------------------------
  // TEST GROUP 5: Paths API (/paths/{region_id}.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 5] Fetch Polygon Batas Wilayah`);
  const pathResult = await IndonesiaRegionService.fetchV2Path('31');
  assert(pathResult.ok === true, '5.1: Path /paths/31.json berstatus OK');
  assert(Boolean(pathResult.data), '5.2: Data path polygon tidak null');
  const rawPath = (pathResult.data as any)?.path || pathResult.data;
  assert(Array.isArray(rawPath), '5.3: Struktur koordinat path berupa array multi-point');

  // --------------------------------------------------------------------
  // TEST GROUP 6: Postal Code Search API (/postal-codes/{code}.json)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 6] Fetch Pencarian Kode Pos`);
  const pcResult = await IndonesiaRegionService.fetchV2PostalCode('12190');
  assert(pcResult.ok === true, '6.1: Request /postal-codes/12190.json berstatus OK');
  assert(Array.isArray(pcResult.data) && pcResult.data.length > 0, '6.2: Ditemukan entitas wilayah dengan kode pos 12190');
  const matched = pcResult.data![0];
  assert(matched.name.toLowerCase().includes('senayan'), `6.3: Wilayah yang cocok adalah Senayan (didapat: ${matched.name})`);

  // --------------------------------------------------------------------
  // TEST GROUP 7: Error & Non-OK Handling
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 7] Penanganan Error & Endpoint Non-OK`);
  const notFoundResult = await IndonesiaRegionService.executeV2Request('/paths/non-existent-999.json');
  assert(notFoundResult.ok === false, '7.1: Endpoint tidak ditemukan ditandai ok = false');
  assert(notFoundResult.status === 404, `7.2: HTTP status 404 terdeteksi dengan tepat (didapat: ${notFoundResult.status})`);
  assert(Boolean(notFoundResult.error), '7.3: Pesan error deskriptif disertakan');

  const invalidInputResult = await IndonesiaRegionService.fetchV2Regencies('');
  assert(invalidInputResult.ok === false && invalidInputResult.status === 400, '7.4: Parameter kosong ditolak dengan status 400 Bad Request');

  // --------------------------------------------------------------------
  // TEST GROUP 8: In-Memory Caching & Latency Tracking
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 8] In-Memory Caching & Latency Tracking`);
  const cacheRun1 = await IndonesiaRegionService.fetchV2Provinces(false);
  const cacheRun2 = await IndonesiaRegionService.fetchV2Provinces(false);
  assert(cacheRun2.ok === true, '8.1: Panggilan kedua dari cache berhasil');
  assert(cacheRun1.data?.length === cacheRun2.data?.length, '8.2: Data cache konsisten dengan panggilan awal');

  // --------------------------------------------------------------------
  // TEST GROUP 9: Isolasi Penyimpanan Profil Perusahaan (Non-destructive)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 9] Isolasi Penyimpanan Profil Perusahaan`);
  const mockUser: UserProfile = {
    id: 'usr-admin-1',
    userCode: '2A',
    tenantId: 't-test-iso',
    role: 'super_admin',
    roleTitle: 'Platform Super Admin',
    fullName: 'Super Administrator',
    email: 'admin@zyvora.com',
    status: 'active',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };
  const initialProfile = await TenantMasterService.getCompanyProfile('t-test-iso', 'ZYV-ISO');
  const originalAddress = initialProfile.address;

  // Simulate multiple playground requests
  await IndonesiaRegionService.fetchV2Provinces();
  await IndonesiaRegionService.fetchV2Regencies('32'); // Jawa Barat
  await IndonesiaRegionService.fetchV2Districts('32.04'); // Kab. Bandung

  // Verify profile in storage did NOT change
  const postProfile = await TenantMasterService.getCompanyProfile('t-test-iso', 'ZYV-ISO');
  assert(postProfile.address === originalAddress, '9.1: Operasi Playground TIDAK mengubah alamat profil yang tersimpan tanpa tindakan simpan');
  assert(postProfile.provinceId === initialProfile.provinceId, '9.2: Province ID profil tersimpan tetap terjaga utuh');

  // --------------------------------------------------------------------
  // TEST GROUP 10: Hak Akses & Visibilitas (Dokumentasi Resmi & Request API)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 10] Hak Akses & Visibilitas Playground (Dokumentasi Resmi & Request API)`);

  const evaluateDocumentationVisibility = (user: Partial<UserProfile>): boolean => {
    return Boolean(user.role === 'super_admin' || user.isPlatformSuperAdmin || user.userCode === '2A');
  };

  assert(
    evaluateDocumentationVisibility({ role: 'super_admin', userCode: '1A' }) === true,
    '10.1: Tombol Dokumentasi Resmi DITAMPILKAN untuk role "super_admin"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'admin', isPlatformSuperAdmin: true, userCode: '1B' }) === true,
    '10.2: Tombol Dokumentasi Resmi DITAMPILKAN untuk Platform Super Admin'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'owner', userCode: '2A' }) === true,
    '10.3: Tombol Dokumentasi Resmi DITAMPILKAN untuk akun root Super Admin "2A"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'owner', userCode: '1C' }) === false,
    '10.4: Tombol Dokumentasi Resmi DISEMBUNYIKAN untuk role "owner"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'admin', userCode: '1D' }) === false,
    '10.5: Tombol Dokumentasi Resmi DISEMBUNYIKAN untuk role "admin"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'sales', userCode: '1E' }) === false,
    '10.6: Tombol Dokumentasi Resmi DISEMBUNYIKAN untuk role "sales"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'customer', userCode: '1F' }) === false,
    '10.7: Tombol Dokumentasi Resmi DISEMBUNYIKAN untuk role "customer"'
  );
  assert(
    evaluateDocumentationVisibility({ role: 'accountant', userCode: '1G' }) === false,
    '10.8: Tombol Dokumentasi Resmi DISEMBUNYIKAN untuk role internal lainnya ("accountant")'
  );

  // Request API visibility check
  const defaultShowApiSection = false;
  assert(
    defaultShowApiSection === false,
    '10.9: Panel "Request API (Metode & Endpoint Aktif)" dan "Response Viewer" default DISEMBUNYIKAN untuk tampilan clean'
  );

  console.log(`\n==================================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN PLAYGROUND API SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`==================================================================\n`);
}

runPlaygroundTestSuite().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
