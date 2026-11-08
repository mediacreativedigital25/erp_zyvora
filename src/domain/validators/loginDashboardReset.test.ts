/**
 * Zyvora ERP 1.0.0 — Mandatory Dashboard Landing on Login & Logout Reset Test
 *
 * Memastikan bahwa:
 * 1. Setiap login (resmi / sandbox) wajib me-reset rute dan landing ke Dashboard.
 * 2. Setiap logout (manual / idle 60 menit / lintas-tab) wajib me-reset state menu sebelumnya.
 */

import fs from 'fs';
import path from 'path';

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
console.log('ZYVORA ERP 1.0.0 — LOGIN & LOGOUT DASHBOARD RESET SUITE');
console.log('======================================================\n');

const erpContextPath = path.join(process.cwd(), 'src', 'context', 'ErpContext.tsx');
assert(fs.existsSync(erpContextPath), 'File ErpContext.tsx tersedia');

const erpContextContent = fs.readFileSync(erpContextPath, 'utf-8');

console.log('[TEST GROUP 1] Deklarasi & Kontrak resetNavigationToDashboard()');
assert(erpContextContent.includes('const resetNavigationToDashboard = () => {'), 'Fungsi resetNavigationToDashboard() terdefinisi');
assert(erpContextContent.includes("setCurrentModule('dashboard');"), 'Reset: Modul diset ke dashboard');
assert(erpContextContent.includes("setActiveFeatureId('dashboard');"), 'Reset: Fitur aktif diset ke dashboard');
assert(erpContextContent.includes('setOpenAccordionId(null);'), 'Reset: Accordion sidebar ditutup rapi');
assert(erpContextContent.includes("setActiveTab('overview');"), 'Reset: Tab aktif diset ke overview');
assert(erpContextContent.includes('setIsMobileSidebarOpen(false);'), 'Reset: Mobile sidebar ditutup');

console.log('\n[TEST GROUP 2] Trigger Wajib Pada Alur Login');
// Cari blok login()
const loginMatch = erpContextContent.match(/const login = async[\s\S]*?return \{ success: true \};/);
assert(Boolean(loginMatch && loginMatch[0].includes('resetNavigationToDashboard()')), 'Login Resmi: Memanggil resetNavigationToDashboard() saat login sukses');

// Cari blok loginAsDevSandboxUser()
const sandboxLoginMatch = erpContextContent.match(/const loginAsDevSandboxUser =[\s\S]*?setAuthStatus\('authenticated'\);/);
assert(Boolean(sandboxLoginMatch && sandboxLoginMatch[0].includes('resetNavigationToDashboard()')), 'Login Sandbox: Memanggil resetNavigationToDashboard() saat memilih profil');

// Cari blok onAuthStateChange SIGNED_IN
const onAuthChangeMatch = erpContextContent.match(/AuthService\.onAuthStateChange[\s\S]*?\}\);/);
assert(Boolean(onAuthChangeMatch && onAuthChangeMatch[0].includes("event === 'SIGNED_IN'") && onAuthChangeMatch[0].includes('resetNavigationToDashboard()')), 'Auth Listener: Reset dashboard saat event SIGNED_IN diterima');

console.log('\n[TEST GROUP 3] Trigger Wajib Pada Alur Logout & Sesi Berakhir');
// Cari blok logout()
const logoutMatch = erpContextContent.match(/const logout = async \(\) =>[\s\S]*?addToast\('Sesi Berakhir'/);
assert(Boolean(logoutMatch && logoutMatch[0].includes('resetNavigationToDashboard()')), 'Logout Manual: Memanggil resetNavigationToDashboard() sebelum keluar');

// Cari blok handleIdleTimeout()
const idleMatch = erpContextContent.match(/const handleIdleTimeout = async \(\) =>[\s\S]*?addToast\('Sesi Berakhir/);
assert(Boolean(idleMatch && idleMatch[0].includes('resetNavigationToDashboard()')), 'Idle Timeout (60 min): Memanggil resetNavigationToDashboard() saat idle');

// Cari blok handleCrossTabLogout()
const crossTabMatch = erpContextContent.match(/const handleCrossTabLogout =[\s\S]*?setAuthStatus\('unauthenticated'\);/);
assert(Boolean(crossTabMatch && crossTabMatch[0].includes('resetNavigationToDashboard()')), 'Cross-Tab Sync: Memanggil resetNavigationToDashboard() saat logout dari tab lain');

console.log('\n[TEST GROUP 4] Penyelarasan UI Topbar');
const topbarPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Topbar.tsx');
const topbarContent = fs.readFileSync(topbarPath, 'utf-8');
assert(topbarContent.includes('Signing out...'), 'Topbar: Label loading logout diselaraskan ke English (Signing out...)');

console.log('\n======================================================');
console.log(`SELURUH PENGUJIAN RESET LOGIN KE DASHBOARD LULUS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('======================================================\n');
