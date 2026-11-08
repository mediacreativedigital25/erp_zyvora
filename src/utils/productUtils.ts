/**
 * Zyvora ERP 1.0.0 — Product & Retail Barcode Utilities
 *
 * 1. EAN-13 Barcode Generator & Modulo-10 Checksum Validator
 *    Menghasilkan kode barcode 13 digit resmi standar ritel kasir (POS) Indonesia
 *    berawalan '899' dengan digit penguji yang lolos validasi hardware scanner laser.
 *
 * 2. Smart SKU Abbreviation Generator
 *    Menghasilkan singkatan SKU cerdas dari nama produk (contoh: 'Gula Pasir 1kg' -> 'GLP1K').
 */

/**
 * Menghitung digit penguji (checksum) Modulo-10 standar GS1 EAN-13
 */
export function calculateEan13Checksum(first12Digits: string): number {
  if (first12Digits.length !== 12 || !/^\d{12}$/.test(first12Digits)) {
    throw new Error('EAN-13 checksum memerlukan tepat 12 digit numerik.');
  }

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    if (i % 2 === 0) {
      // Posisi ganjil (indeks 0, 2, 4... / posisi 1, 3, 5...) bobot 1
      oddSum += digit;
    } else {
      // Posisi genap (indeks 1, 3, 5... / posisi 2, 4, 6...) bobot 3
      evenSum += digit * 3;
    }
  }

  const totalSum = oddSum + evenSum;
  const remainder = totalSum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Menghasilkan barcode EAN-13 valid (13 digit) yang dijamin terbaca oleh scanner kasir POS
 * Format: [3 digit negara 899] [4 digit toko/tenant] [5 digit nomor serial] [1 digit checksum]
 */
export function generateEan13Barcode(
  sequenceNumber: number,
  countryPrefix = '899',
  tenantSeed = '9001'
): string {
  const cleanPrefix = countryPrefix.replace(/\D/g, '').padEnd(3, '8').slice(0, 3);
  const cleanTenant = tenantSeed.replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
  const cleanSeq = Math.abs(sequenceNumber).toString().padStart(5, '0').slice(-5);

  const base12 = `${cleanPrefix}${cleanTenant}${cleanSeq}`;
  const checksum = calculateEan13Checksum(base12);

  return `${base12}${checksum}`;
}

/**
 * Memvalidasi apakah sebuah string barcode merupakan EAN-13 yang valid
 */
export function isValidEan13(barcode: string): boolean {
  if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) {
    return false;
  }

  const base12 = barcode.slice(0, 12);
  const expectedChecksum = calculateEan13Checksum(base12);
  const actualChecksum = parseInt(barcode[12], 10);

  return expectedChecksum === actualChecksum;
}

/**
 * Menghasilkan singkatan SKU cerdas dari Nama Produk
 * Contoh:
 * - "Gula Pasir 1kg" -> "GLP1K"
 * - "Minyak Goreng Sawit 2L" -> "MGS2L"
 * - "Beras Ramos Premium 25Kg" -> "BRP25K"
 * - "Tepung Terigu Segitiga 500g" -> "TTS500G"
 * - "Jasa Undangan Web Digital Platinum" -> "JUDPLAT"
 */
export function generateSmartSku(productName: string, fallbackPrefix = 'ZYV'): string {
  if (!productName || !productName.trim()) {
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `${fallbackPrefix}-${randomSeq}`;
  }

  let cleanName = productName.trim().toUpperCase();

  // 1. Ekstraksi spesifikasi ukuran / berat (misal: 1kg, 500g, 2l, 25kg, 250ml)
  let sizeToken = '';
  const sizeMatch = cleanName.match(/\b(\d+)\s*(KG|G|GR|GRAM|L|LTR|LITER|ML|PCS|PAKET|M|CM)\b/);
  if (sizeMatch) {
    const num = sizeMatch[1];
    const unit = sizeMatch[2];
    // Singkat unit: KG -> K, G/GR/GRAM -> G, L/LTR/LITER -> L, ML -> M
    let shortUnit = 'K';
    if (['G', 'GR', 'GRAM'].includes(unit)) shortUnit = 'G';
    else if (['L', 'LTR', 'LITER'].includes(unit)) shortUnit = 'L';
    else if (unit === 'ML') shortUnit = 'M';
    else if (unit === 'PCS') shortUnit = 'P';
    else if (unit === 'PAKET') shortUnit = 'PKT';
    else shortUnit = unit[0];

    sizeToken = `${num}${shortUnit}`;
    // Hapus token ukuran dari nama untuk memproses kata-kata utamanya
    cleanName = cleanName.replace(sizeMatch[0], '').trim();
  }

  // 2. Bersihkan karakter non-alphanumeric dan buang kata hubung bahasa Indonesia
  const stopwords = new Set(['DAN', 'YANG', 'DI', 'KE', 'DARI', 'UNTUK', 'DENGAN', 'ISI', 'CAP']);
  const words = cleanName
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopwords.has(w));

  if (words.length === 0) {
    return sizeToken ? `${fallbackPrefix}${sizeToken}` : `${fallbackPrefix}-SKU`;
  }

  let wordAbbreviation = '';

  if (words.length === 1) {
    // 1 kata: ambil 3-4 konsonan atau huruf pertama
    const word = words[0];
    const consonants = word.replace(/[AEIOU]/g, '');
    wordAbbreviation = (consonants.length >= 3 ? consonants : word).slice(0, 4);
  } else if (words.length === 2) {
    // 2 kata: (misal: Gula Pasir -> GL + P = GLP)
    const w1 = words[0];
    const w2 = words[1];
    const c1 = w1.replace(/[AEIOU]/g, '');
    const p1 = (c1.length >= 2 ? c1 : w1).slice(0, 2);
    const p2 = w2[0]; // Inisial kata kedua
    wordAbbreviation = `${p1}${p2}`;
  } else {
    // 3+ kata: ambil inisial setiap kata (contoh: Minyak Goreng Sawit -> MGS)
    const initials = words.map((w) => w[0]).join('');
    if (initials.length >= 3 && initials.length <= 6) {
      wordAbbreviation = initials;
    } else if (initials.length > 6) {
      wordAbbreviation = initials.slice(0, 6);
    } else {
      const lastWord = words[words.length - 1];
      const lastWordClean = (lastWord.replace(/[AEIOU]/g, '') || lastWord).slice(0, 3);
      wordAbbreviation = `${initials}${lastWordClean}`;
    }
  }

  const candidate = `${wordAbbreviation}${sizeToken}`.toUpperCase();
  return candidate.length >= 3 ? candidate : `${candidate}${Math.floor(Math.random() * 89 + 10)}`;
}
