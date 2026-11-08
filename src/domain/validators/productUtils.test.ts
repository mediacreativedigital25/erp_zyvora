/**
 * Zyvora ERP 1.0.0 — Test Suite: Product & Retail Barcode Utilities (Fase 2)
 *
 * Menguji utilitas produk:
 * 1. Algoritma Checksum EAN-13 Modulo-10 standar GS1
 * 2. Generator Barcode Kasir EAN-13 (13 digit)
 * 3. Validator Barcode Kasir EAN-13
 * 4. Generator SKU Cerdas (Singkatan Nama Produk & Ukuran)
 */

import {
  calculateEan13Checksum,
  generateEan13Barcode,
  isValidEan13,
  generateSmartSku
} from '../../utils/productUtils';

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

async function runProductUtilsSuite() {
  console.log(`\n======================================================`);
  console.log(`ZYVORA ERP 1.0.0 — PRODUCT & BARCODE UTILITIES SUITE (FASE 2)`);
  console.log(`======================================================`);

  // --------------------------------------------------------------------
  // TEST GROUP 1: Algoritma Checksum EAN-13 Modulo-10
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 1] Algoritma Checksum EAN-13 Modulo-10`);
  // Contoh valid barcode GS1 / ISBN EAN-13:
  // Stabilo Boss: 4006381333931 (12 digit awal: 400638133393 -> checksum 1)
  const checksumStabilo = calculateEan13Checksum('400638133393');
  assert(checksumStabilo === 1, 'Checksum 1: Stabilo 400638133393 menghasilkan checksum 1');

  // Buku ISBN: 9780306406157 (12 digit awal: 978030640615 -> checksum 7)
  const checksumIsbn = calculateEan13Checksum('978030640615');
  assert(checksumIsbn === 7, 'Checksum 2: ISBN 978030640615 menghasilkan checksum 7');

  // Barcode kelipatan 10 menghasilkan checksum 0 (899886620011 -> total 110 -> checksum 0)
  const checksumZero = calculateEan13Checksum('899886620011');
  assert(checksumZero === 0, 'Checksum 3: Total modulo kelipatan 10 menghasilkan checksum 0');

  // Invariant error jika bukan 12 digit
  let errorCaught = false;
  try {
    calculateEan13Checksum('12345');
  } catch {
    errorCaught = true;
  }
  assert(errorCaught, 'Checksum 4: Input non-12 digit ditolak dengan aman');

  // --------------------------------------------------------------------
  // TEST GROUP 2: Generator Barcode EAN-13 Kasir POS
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Generator Barcode Kasir EAN-13 (13 Digit Resmi)`);
  const barcodeSeq1 = generateEan13Barcode(1, '899', '9001');
  assert(barcodeSeq1.length === 13, 'EAN-13 1: Panjang barcode tepat 13 digit');
  assert(barcodeSeq1.startsWith('899'), 'EAN-13 2: Berawalan 899 (Indonesia GS1)');
  assert(isValidEan13(barcodeSeq1), 'EAN-13 3: Barcode hasil generator lolos validasi checksum EAN-13');

  const barcodeSeq15 = generateEan13Barcode(15, '899', '9002');
  assert(isValidEan13(barcodeSeq15), 'EAN-13 4: Barcode serial #15 lolos validasi checksum EAN-13');

  // --------------------------------------------------------------------
  // TEST GROUP 3: Validator Barcode EAN-13
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Validator Barcode Kasir`);
  assert(isValidEan13('4006381333931'), 'Validator 1: Barcode Stabilo EAN-13 valid diterima');
  assert(isValidEan13('9780306406157'), 'Validator 2: Barcode ISBN EAN-13 valid diterima');
  assert(isValidEan13('8998866200110'), 'Validator 3: Barcode lokal dengan checksum 0 valid diterima');
  assert(!isValidEan13('4006381333932'), 'Validator 4: Barcode dengan checksum salah (angka 2 bukan 1) DITOLAK');
  assert(!isValidEan13('1234567'), 'Validator 5: Barcode terlalu pendek DITOLAK');
  assert(!isValidEan13('ABC8999001000'), 'Validator 6: Barcode non-angka DITOLAK');

  // --------------------------------------------------------------------
  // TEST GROUP 4: Smart SKU Abbreviation Generator (Singkatan Nama Produk)
  // --------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] Generator Singkatan SKU Cerdas`);
  const skuGula = generateSmartSku('Gula Pasir 1kg');
  assert(skuGula === 'GLP1K', `SKU 1: "Gula Pasir 1kg" menghasilkan "GLP1K" (didapat: ${skuGula})`);

  const skuMinyak = generateSmartSku('Minyak Goreng Sawit 2L');
  assert(skuMinyak === 'MGS2L', `SKU 2: "Minyak Goreng Sawit 2L" menghasilkan "MGS2L" (didapat: ${skuMinyak})`);

  const skuBeras = generateSmartSku('Beras Ramos Premium 25Kg');
  assert(skuBeras.includes('25K'), `SKU 3: "Beras Ramos Premium 25Kg" menyertakan token "25K" (didapat: ${skuBeras})`);

  const skuTepung = generateSmartSku('Tepung Terigu Segitiga 500g');
  assert(skuTepung.includes('500G'), `SKU 4: "Tepung Terigu Segitiga 500g" menyertakan token "500G" (didapat: ${skuTepung})`);

  const skuJasa = generateSmartSku('Jasa Undangan Web Digital Platinum');
  assert(skuJasa.length >= 4 && !skuJasa.includes(' '), `SKU 5: Jasa Undangan menghasilkan kode singkatan valid (didapat: ${skuJasa})`);

  console.log(`\n======================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN PRODUK & BARCODE KASIR SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`======================================================\n`);
}

runProductUtilsSuite().catch((err) => {
  console.error(`${RED}Product utils test failed:${RESET}`, err);
  process.exit(1);
});
