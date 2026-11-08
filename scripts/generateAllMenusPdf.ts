/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Zyvora ERP 1.0.0 — Executive PDF Generator for All Menus Catalog
 */

import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { NAVIGATION_CONFIG, NavGroup, SubmenuItem } from '../src/config/navigation';

interface EnrichedMenuItem extends SubmenuItem {
  moduleName: string;
  moduleId: string;
  minRole: string;
}

// Role mapping by module
function getMinRoleForModule(moduleId: string, itemId: string): string {
  if (moduleId === 'dashboard') return 'Semua Role Terdaftar';
  if (moduleId === 'sales') return 'Sales / Kasir / Admin';
  if (moduleId === 'inventory') return 'Staff Gudang / Admin';
  if (moduleId === 'account_receivable') return 'Finance / Kasir / Admin';
  if (moduleId === 'cash_management') return 'Kasir / Finance / Admin';
  if (moduleId === 'approval') return 'Manager / Admin / Owner';
  if (moduleId === 'human_resources') {
    if (['hr_employee_list', 'hr_position_dept', 'hr_org_structure'].includes(itemId)) {
      return 'Staff HR / Manager / Admin';
    }
    return 'HR / Admin / Owner';
  }
  if (moduleId === 'master_data') return 'Administrator / Owner';
  if (moduleId === 'reporting') return 'Manager / Direksi / Owner';
  return 'Admin';
}

function generateHtml(): string {
  let totalMenus = 0;
  let readyMenus = 0;
  let pendingMenus = 0;

  const modulesData = NAVIGATION_CONFIG.map((group) => {
    const isDirect = !!group.isDirectLink;
    let items: EnrichedMenuItem[] = [];

    if (isDirect) {
      totalMenus += 1;
      readyMenus += 1;
      items.push({
        id: group.id,
        label: group.label,
        description: 'Dashboard analitik eksekutif & ringkasan operasional real-time',
        isReady: true,
        moduleName: group.label,
        moduleId: group.id,
        minRole: 'Semua Role Terdaftar'
      });
    } else if (group.items) {
      items = group.items.map((sub) => {
        totalMenus += 1;
        if (sub.isReady) {
          readyMenus += 1;
        } else {
          pendingMenus += 1;
        }
        return {
          ...sub,
          moduleName: group.label,
          moduleId: group.id,
          minRole: getMinRoleForModule(group.id, sub.id)
        };
      });
    }

    return {
      group,
      items
    };
  });

  const currentDateStr = '03 November 2026';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Zyvora ERP — Katalog & Struktur Seluruh Menu Sistem</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #0F172A;
      background: #FFFFFF;
    }

    /* Header styling */
    .doc-header {
      border-bottom: 2.5px solid #086288;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 19pt;
      font-weight: 800;
      color: #086288;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 10pt;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748B;
      line-height: 1.4;
    }
    .doc-meta strong {
      color: #0F172A;
    }

    /* Executive summary cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .summary-card {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #F8FAFC;
    }
    .summary-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
    }
    .summary-value {
      font-size: 15pt;
      font-weight: 800;
      color: #086288;
      margin-top: 2px;
    }
    .summary-desc {
      font-size: 7pt;
      color: #475569;
      margin-top: 2px;
    }

    /* Policy Alert Box */
    .policy-box {
      background: #EFF7FA;
      border: 1.5px solid #B7DDEA;
      border-left: 5px solid #086288;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 8.5pt;
    }
    .policy-box h3 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #086288;
      margin-bottom: 4px;
    }
    .policy-box ul {
      margin-left: 18px;
      margin-top: 4px;
    }
    .policy-box li {
      margin-bottom: 2px;
    }

    /* Section / Module Table */
    .module-section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .module-header {
      background: #086288;
      color: #FFFFFF;
      padding: 6px 12px;
      border-radius: 6px 6px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10pt;
      font-weight: 700;
    }
    .module-badge-count {
      font-size: 8pt;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 12px;
    }

    table.menu-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      border: 1px solid #CBD5E1;
      border-top: none;
      margin-bottom: 8px;
    }
    table.menu-table th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1.5px solid #CBD5E1;
      border-right: 1px solid #E2E8F0;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.menu-table td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      vertical-align: middle;
    }
    table.menu-table td:last-child, table.menu-table th:last-child {
      border-right: none;
    }
    table.menu-table tr:nth-child(even) {
      background: #F8FAFC;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
    }
    .badge-ready {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    .badge-pending {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #CBD5E1;
    }
    .vis-show {
      color: #086288;
      font-weight: 700;
      font-size: 7.5pt;
    }
    .vis-hide {
      color: #DC2626;
      font-weight: 600;
      font-size: 7.5pt;
    }

    .code-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.5pt;
      font-weight: 700;
      color: #086288;
      background: #EFF7FA;
      border: 1px solid #B7DDEA;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .group-header-row td {
      background: #E2E8F0 !important;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.5px;
      padding: 3px 8px;
    }

    /* Footer */
    .doc-footer {
      margin-top: 24px;
      border-top: 1.5px solid #CBD5E1;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748B;
    }
    .approval-table {
      width: 100%;
      margin-top: 14px;
      border-collapse: collapse;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .approval-table td {
      width: 33.33%;
      border: 1px solid #CBD5E1;
      padding: 10px;
      text-align: center;
      background: #FFFFFF;
    }
    .sign-space {
      height: 40px;
    }
  </style>
</head>
<body>

  <!-- DOCUMENT HEADER -->
  <div class="doc-header">
    <div>
      <div class="brand-title">ZYVORA ERP 1.0.0</div>
      <div class="brand-subtitle">Katalog & Struktur Seluruh Menu Sistem (All Menus Directory)</div>
    </div>
    <div class="doc-meta">
      <div>No. Dokumen: <strong>DOC-ZYV-NAV-2026-001</strong></div>
      <div>Tanggal Rilis: <strong>${currentDateStr}</strong></div>
      <div>Standar UI: <strong>MEDIST 4.0 / Clean Deep Teal</strong></div>
      <div>Status Otorisasi: <strong>Resmi (Approved for Execution)</strong></div>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total Modul Utama</div>
      <div class="summary-value">${NAVIGATION_CONFIG.length} Modul</div>
      <div class="summary-desc">Termasuk Dashboard & Master</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Keseluruhan Menu</div>
      <div class="summary-value">${totalMenus} Menu</div>
      <div class="summary-desc">Seluruh cakupan fitur sistem</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Menu Siap Operasional</div>
      <div class="summary-value" style="color: #059669;">${readyMenus} Menu (${Math.round((readyMenus / totalMenus) * 100)}%)</div>
      <div class="summary-desc">Aktif untuk seluruh role berwenang</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Menu Segera Tersedia</div>
      <div class="summary-value" style="color: #DC2626;">${pendingMenus} Menu (${Math.round((pendingMenus / totalMenus) * 100)}%)</div>
      <div class="summary-desc">Disembunyikan dari non-Super Admin</div>
    </div>
  </div>

  <!-- GOVERNANCE & ACCESS CONTROL POLICY -->
  <div class="policy-box">
    <h3>Kebijakan Otoritas & Visibilitas Menu (Role-Based Menu Visibility Policy)</h3>
    <p>Berdasarkan arahan standarisasi operasional Zyvora ERP, visibilitas navigasi menu diatur dengan aturan mutlak sebagai berikut:</p>
    <ul>
      <li><strong>Role Super Admin (2A / Platform Administrator):</strong> Memiliki visibilitas penuh terhadap <strong>100% menu (${totalMenus} menu)</strong>, termasuk ${pendingMenus} menu yang masih berstatus <em>Segera tersedia</em> dengan penanda ikon gembok untuk pengujian sandbox dan development.</li>
      <li><strong>Role Selain Super Admin (Owner, Admin, Manager, Accountant, Inventory Staff, Cashier, Sales):</strong> Sistem secara otomatis <strong>hanya menampilkan ${readyMenus} menu yang telah siap operasional</strong>. Seluruh ${pendingMenus} menu yang belum siap disembunyikan total dari sidebar dan dilindungi oleh Route Guard.</li>
    </ul>
  </div>

  <!-- MODULE DIRECTORY -->
  ${modulesData
    .map(({ group, items }, idx) => {
      const readyCount = items.filter((i) => i.isReady).length;
      const pendingCount = items.filter((i) => !i.isReady).length;

      return `
    <div class="module-section">
      <div class="module-header">
        <span>${idx + 1}. MODUL: ${group.label.toUpperCase()} (${group.id})</span>
        <span class="module-badge-count">${readyCount} Tersedia | ${pendingCount} Disembunyikan</span>
      </div>

      <table class="menu-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">No</th>
            <th style="width: 140px;">Kode / ID Menu</th>
            <th style="width: 160px;">Nama Menu (Label)</th>
            <th style="width: 100px; text-align: center;">Kesiapan</th>
            <th style="width: 125px; text-align: center;">Visibilitas Staf</th>
            <th style="width: 130px;">Role Minimum</th>
            <th>Deskripsi Fungsi & Ruang Lingkup</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item, itemIdx) => {
              const headerRow = item.groupHeader
                ? `<tr class="group-header-row"><td colspan="7">Kelompok: ${item.groupHeader}</td></tr>`
                : '';

              return `
              ${headerRow}
              <tr>
                <td style="text-align: center; color: #64748B; font-weight: 600;">${itemIdx + 1}</td>
                <td><span class="code-pill">${item.id}</span></td>
                <td><strong>${item.label}</strong></td>
                <td style="text-align: center;">
                  ${
                    item.isReady
                      ? '<span class="badge badge-ready">Siap Pakai</span>'
                      : '<span class="badge badge-pending">Segera Tersedia</span>'
                  }
                </td>
                <td style="text-align: center;">
                  ${
                    item.isReady
                      ? '<span class="vis-show">&#x2714; Tampil</span>'
                      : '<span class="vis-hide">&#x1F6AB; Sembunyi</span>'
                  }
                </td>
                <td style="color: #334155;">${item.minRole}</td>
                <td style="color: #475569; font-size: 7.5pt;">${item.description || '-'}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    `;
    })
    .join('')}

  <!-- APPROVAL SIGN-OFF SECTION -->
  <table class="approval-table">
    <tr>
      <td>
        <div style="font-weight: 700; color: #475569; font-size: 7.5pt;">Disiapkan Oleh:</div>
        <div style="font-weight: 700; color: #086288; margin-top: 4px;">Product Engineering & UI Architect</div>
        <div class="sign-space"></div>
        <div style="font-weight: 700; border-top: 1px solid #CBD5E1; padding-top: 4px;">Antigravity Lead Architect</div>
        <div style="font-size: 7pt; color: #64748B;">Zyvora ERP System Core</div>
      </td>
      <td>
        <div style="font-weight: 700; color: #475569; font-size: 7.5pt;">Diverifikasi Oleh:</div>
        <div style="font-weight: 700; color: #086288; margin-top: 4px;">Quality Assurance & Compliance</div>
        <div class="sign-space"></div>
        <div style="font-weight: 700; border-top: 1px solid #CBD5E1; padding-top: 4px;">Lead QA & Security Officer</div>
        <div style="font-size: 7pt; color: #64748B;">Role Governance & RBAC</div>
      </td>
      <td>
        <div style="font-weight: 700; color: #475569; font-size: 7.5pt;">Disetujui Oleh:</div>
        <div style="font-weight: 700; color: #086288; margin-top: 4px;">Product Owner & Super Admin</div>
        <div class="sign-space"></div>
        <div style="font-weight: 700; border-top: 1px solid #CBD5E1; padding-top: 4px;">Product Owner / Super Admin</div>
        <div style="font-size: 7pt; color: #64748B;">Zyvora ERP Platform</div>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div class="doc-footer">
    <div>Zyvora ERP 1.0.0 &bull; Hak Cipta &copy; 2026. Seluruh hak cipta dilindungi undang-undang.</div>
    <div>Dicetak otomatis dari sumber kode tunggal <code>src/config/navigation.ts</code></div>
  </div>

</body>
</html>`;
}

async function run() {
  const outputHtmlPath = path.resolve(process.cwd(), 'ZYVORA_ERP_ALL_MENUS_CATALOG.html');
  const outputPdfPath = path.resolve(process.cwd(), 'ZYVORA_ERP_ALL_MENUS_CATALOG.pdf');
  const artifactDir = 'C:\\Users\\iklas\\.gemini\\antigravity\\brain\\509d9ee2-b35e-4928-89fd-48446d6a2e9f';
  const artifactPdfPath = path.join(artifactDir, 'ZYVORA_ERP_ALL_MENUS_CATALOG.pdf');

  console.log('[1/4] Generating HTML catalog...');
  const htmlContent = generateHtml();
  fs.writeFileSync(outputHtmlPath, htmlContent, 'utf-8');
  console.log('  -> HTML catalog written to:', outputHtmlPath);

  console.log('[2/4] Converting HTML to high-resolution vector PDF using Chrome Headless...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${outputPdfPath}`,
    outputHtmlPath
  ]);

  if (fs.existsSync(outputPdfPath)) {
    const stats = fs.statSync(outputPdfPath);
    console.log(`[3/4] PDF successfully created! Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log('  -> Workspace PDF:', outputPdfPath);

    // Copy to artifact directory
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(outputPdfPath, artifactPdfPath);
      console.log('[4/4] Copied PDF to artifact directory:', artifactPdfPath);
    }
  } else {
    throw new Error('PDF output file was not found after execution.');
  }
}

run().catch((err) => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
