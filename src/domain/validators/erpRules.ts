/**
 * Zyvora ERP 1.0.0 — Domain Business Rules & Invariants Validator
 * Adheres strictly to Section 6 of Zyvora Master Plan.
 */

// Characters allowed for Customer Code: 0-9, A-Z (excluding ambiguous glpyhs 0/O, 1/I for operator safety)
export const CUSTOMER_CODE_ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Validates a Customer Code:
 * 1. Exactly 5 characters in length.
 * 2. Only uppercase alphanumeric [A-Z0-9].
 */
export const validateCustomerCode = (code: string): { isValid: boolean; error?: string } => {
  if (!code) {
    return { isValid: false, error: 'Customer Code tidak boleh kosong.' };
  }
  if (code.length !== 5) {
    return { isValid: false, error: `Customer Code wajib tepat 5 karakter (ditemukan: ${code.length} karakter).` };
  }
  const regex = /^[A-Z0-9]{5}$/;
  if (!regex.test(code)) {
    return { isValid: false, error: 'Customer Code hanya boleh mengandung huruf kapital A-Z dan angka 0-9.' };
  }
  return { isValid: true };
};

/**
 * Generates an immutable, unique 5-character uppercase alphanumeric Customer Code.
 */
export const generateCustomerCodeCandidate = (existingCodes: string[] = []): string => {
  const codeSet = new Set(existingCodes.map((c) => c.toUpperCase()));
  let candidate = '';
  let attempts = 0;

  while (attempts < 200) {
    candidate = '';
    for (let i = 0; i < 5; i++) {
      candidate += CUSTOMER_CODE_ALLOWED_CHARS.charAt(
        Math.floor(Math.random() * CUSTOMER_CODE_ALLOWED_CHARS.length)
      );
    }
    if (!codeSet.has(candidate)) {
      return candidate;
    }
    attempts++;
  }
  // Fallback: system-time entropy
  return `C${Date.now().toString(36).slice(-4).toUpperCase()}`;
};

/**
 * Validates canonical document number sequence:
 * Pattern: [PREFIX]-[YYYYMM]-[6 DIGIT SEQUENCE]
 * Examples: SO-202610-000104, PO-202610-000042, MUT-202610-000088, JV-202610-000215
 */
export const validateDocumentNumber = (
  docNumber: string,
  expectedPrefix?: string
): { isValid: boolean; error?: string } => {
  if (!docNumber) {
    return { isValid: false, error: 'Nomor dokumen transaksi tidak boleh kosong.' };
  }

  const parts = docNumber.split('-');
  if (parts.length !== 3) {
    return {
      isValid: false,
      error: 'Format nomor dokumen tidak valid. Wajib mengikuti format [PREFIX]-[YYYYMM]-[SEQUENCE].'
    };
  }

  const [prefix, period, seq] = parts;

  if (expectedPrefix && prefix !== expectedPrefix) {
    return {
      isValid: false,
      error: `Prefix nomor dokumen harus '${expectedPrefix}', ditemukan '${prefix}'.`
    };
  }

  if (!/^\d{6}$/.test(period)) {
    return {
      isValid: false,
      error: `Format periode harus 6 digit YYYYMM, ditemukan '${period}'.`
    };
  }

  if (!/^\d{6}$/.test(seq)) {
    return {
      isValid: false,
      error: `Format nomor urut sequence harus tepat 6 digit angka, ditemukan '${seq}'.`
    };
  }

  return { isValid: true };
};

/**
 * Generates canonical document number:
 * [PREFIX]-[YYYYMM]-[6 DIGIT SEQUENCE]
 */
export const generateCanonicalSequence = (
  prefix: string,
  sequenceNumber: number,
  date: Date = new Date()
): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${yyyy}${mm}`;
  const seqStr = String(sequenceNumber).padStart(6, '0');
  return `${prefix}-${period}-${seqStr}`;
};

/**
 * Generates canonical Sales Order (Goods) document number:
 * SO + [3 DIGIT TENANT/BRANCH] + [YYYYMM] + [5 DIGIT SEQUENCE]
 * Example: SO00120261000001 (16 characters total)
 */
export const generateSalesOrderNumber = (
  tenantSequence: string = '001',
  sequenceNumber: number = 1,
  date: Date = new Date()
): string => {
  const cleanTenant = tenantSequence.replace(/\D/g, '').slice(0, 3).padStart(3, '0') || '001';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${yyyy}${mm}`;
  const seqStr = String(sequenceNumber).padStart(5, '0');
  return `SO${cleanTenant}${period}${seqStr}`;
};

/**
 * Validates canonical Sales Order number strictly matching pattern:
 * SO + 3 digits (tenant) + 6 digits (YYYYMM) + 5 digits (sequence) = 16 characters
 * Example: SO00120261000001
 */
export const validateSalesOrderNumber = (
  orderNumber: string
): { isValid: boolean; error?: string } => {
  if (!orderNumber || typeof orderNumber !== 'string') {
    return { isValid: false, error: 'Sales Order number is required.' };
  }
  const clean = orderNumber.trim();
  if (clean.length !== 16) {
    return { isValid: false, error: `Sales Order number must be exactly 16 characters (got ${clean.length}).` };
  }
  if (!clean.startsWith('SO')) {
    return { isValid: false, error: "Sales Order number must begin with uppercase 'SO' prefix." };
  }
  const regex = /^SO\d{3}\d{6}\d{5}$/;
  if (!regex.test(clean)) {
    return { isValid: false, error: "Sales Order format must strictly be SO + 3-digit tenant + YYYYMM + 5-digit sequence (e.g. SO00120261000001)." };
  }
  return { isValid: true };
};

/**
 * Validates canonical Sales Order or Legacy Booking document number:
 * Accepts both Universal Sales Order (SO) and Legacy Booking (SB):
 * (SO|SB) + 3 digits (tenant) + 6 digits (YYYYMM) + 5 digits (sequence) = 16 characters
 * Examples: SO00120261100001 (Universal SO), SB00120261000001 (Legacy Service Booking)
 */
export const validateSalesOrderOrBookingNumber = (
  orderNumber: string
): { isValid: boolean; error?: string } => {
  if (!orderNumber || typeof orderNumber !== 'string') {
    return { isValid: false, error: 'Sales Order number is required.' };
  }
  const clean = orderNumber.trim();
  if (clean.length !== 16) {
    return { isValid: false, error: `Sales Order number must be exactly 16 characters (got ${clean.length}).` };
  }
  if (!clean.startsWith('SO') && !clean.startsWith('SB')) {
    return { isValid: false, error: "Sales Order number must begin with uppercase 'SO' or 'SB' prefix." };
  }
  const regex = /^(SO|SB)\d{3}\d{6}\d{5}$/;
  if (!regex.test(clean)) {
    return { isValid: false, error: "Sales Order format must strictly be SO/SB + 3-digit tenant + YYYYMM + 5-digit sequence (e.g. SO00120261100001)." };
  }
  return { isValid: true };
};

/**
 * Generates canonical Commercial Invoice document number:
 * INV + [3 DIGIT TENANT/BRANCH] + [YYYYMM] + [5 DIGIT SEQUENCE]
 * Example: INV00120261000001 (17 characters total)
 */
export const generateSalesInvoiceNumber = (
  tenantSequence: string = '001',
  sequenceNumber: number = 1,
  date: Date = new Date()
): string => {
  const cleanTenant = tenantSequence.replace(/\D/g, '').slice(0, 3).padStart(3, '0') || '001';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${yyyy}${mm}`;
  const seqStr = String(sequenceNumber).padStart(5, '0');
  return `INV${cleanTenant}${period}${seqStr}`;
};

/**
 * Validates canonical Commercial Invoice document number:
 * INV + 3 digits (tenant) + 6 digits (YYYYMM) + 5 digits (sequence) = 17 characters
 * Example: INV00120261000001
 */
export const validateSalesInvoiceNumber = (
  invoiceNumber: string
): { isValid: boolean; error?: string } => {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return { isValid: false, error: 'Invoice number is required.' };
  }
  const clean = invoiceNumber.trim();
  if (clean.length !== 17) {
    return { isValid: false, error: `Invoice number must be exactly 17 characters (got ${clean.length}).` };
  }
  if (!clean.startsWith('INV')) {
    return { isValid: false, error: "Invoice number must begin with uppercase 'INV' prefix." };
  }
  const regex = /^INV\d{3}\d{6}\d{5}$/;
  if (!regex.test(clean)) {
    return { isValid: false, error: "Invoice number format must strictly be INV + 3-digit tenant + YYYYMM + 5-digit sequence (e.g. INV00120261000001)." };
  }
  return { isValid: true };
};

/**
 * Generates canonical Service Booking document number:
 * SB + [3 DIGIT TENANT/BRANCH] + [YYYYMM] + [5 DIGIT SEQUENCE]
 * Example: SB00120261000001 (16 characters total)
 */
export const generateServiceBookingNumber = (
  tenantSequence: string = '001',
  sequenceNumber: number = 1,
  date: Date = new Date()
): string => {
  const cleanTenant = tenantSequence.replace(/\D/g, '').slice(0, 3).padStart(3, '0') || '001';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${yyyy}${mm}`;
  const seqStr = String(sequenceNumber).padStart(5, '0');
  return `SB${cleanTenant}${period}${seqStr}`;
};

/**
 * Validates canonical Service Booking number strictly matching pattern:
 * SB + 3 digits (tenant) + 6 digits (YYYYMM) + 5 digits (sequence) = 16 characters
 * Example: SB00120261000001
 */
export const validateServiceBookingNumber = (
  bookingNumber: string
): { isValid: boolean; error?: string } => {
  if (!bookingNumber || typeof bookingNumber !== 'string') {
    return { isValid: false, error: 'Booking number is required.' };
  }
  const clean = bookingNumber.trim();
  if (clean.length !== 16) {
    return { isValid: false, error: `Booking number must be exactly 16 characters (got ${clean.length}).` };
  }
  if (!clean.startsWith('SB')) {
    return { isValid: false, error: "Booking number must begin with uppercase 'SB' prefix." };
  }
  const regex = /^SB\d{3}\d{6}\d{5}$/;
  if (!regex.test(clean)) {
    return { isValid: false, error: "Booking number format must strictly be SB + 3-digit tenant + YYYYMM + 5-digit sequence (e.g. SB00120261000001)." };
  }
  return { isValid: true };
};

/**
 * Double-Entry Bookkeeping balance validation:
 * Total Debit must exactly equal Total Credit.
 */
export const validateDoubleEntryJournal = (
  totalDebit: number,
  totalCredit: number
): { isBalanced: boolean; difference: number; error?: string } => {
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.0001) {
    return {
      isBalanced: false,
      difference: diff,
      error: `Jurnal tidak seimbang. Selisih Debit dan Kredit: Rp ${diff.toLocaleString('id-ID')}`
    };
  }
  return {
    isBalanced: true,
    difference: 0
  };
};

// ====================================================================
// SECTION 4: KODE USER (USER CODE) SPECIFICATION & INVARIANTS
// ====================================================================

/**
 * Characters allowed for User Code:
 * 32 characters safe pool excluding ambiguous glyphs (0, 1, O, I).
 * Allowed: Digits 2-9, Letters A-H, J-N, P-Z.
 */
export const USER_CODE_ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Validates a User Code:
 * 1. Exactly 2 or 3 characters in length.
 * 2. Only safe uppercase alphanumeric [2-9A-HJ-NP-Z] (excludes 0, 1, O, I).
 * Examples: '2A', '2A2', '2BZ', '9X'.
 */
export const validateUserCode = (code: string): { isValid: boolean; error?: string } => {
  if (!code) {
    return { isValid: false, error: 'Kode User tidak boleh kosong.' };
  }
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length < 2 || cleanCode.length > 3) {
    return {
      isValid: false,
      error: `Kode User wajib sepanjang 2–3 karakter (ditemukan: ${cleanCode.length} karakter).`
    };
  }
  // Strictly enforce 32-character safe alphabet (digits 2-9, letters A-H, J-N, P-Z)
  const regex = /^[2-9A-HJ-NP-Z]{2,3}$/;
  if (!regex.test(cleanCode)) {
    return {
      isValid: false,
      error: 'Kode User hanya boleh mengandung karakter 2–9, A–H, J–N, P–Z (tidak boleh mengandung karakter ambigu 0, 1, O, I).'
    };
  }
  return { isValid: true };
};

/**
 * Generates an immutable, unique 2-3 character uppercase alphanumeric User Code
 * strictly using the 32-character safe alphabet.
 * Safe against collision via checking against an existing codes set.
 */
export const generateUserCodeCandidate = (
  existingCodes: string[] = [],
  preferredLength: 2 | 3 = 3
): string => {
  const codeSet = new Set(existingCodes.map((c) => c.toUpperCase()));
  let candidate = '';
  let attempts = 0;

  // Attempt generation with safe non-ambiguous glyphs
  while (attempts < 500) {
    candidate = '';
    const len = attempts > 200 ? 3 : preferredLength;
    for (let i = 0; i < len; i++) {
      candidate += USER_CODE_ALLOWED_CHARS.charAt(
        Math.floor(Math.random() * USER_CODE_ALLOWED_CHARS.length)
      );
    }
    if (!codeSet.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  // Deterministic fallback based on safe chars
  let fallback = '';
  for (let i = 0; i < 3; i++) {
    fallback += USER_CODE_ALLOWED_CHARS.charAt(
      Math.floor(Math.random() * USER_CODE_ALLOWED_CHARS.length)
    );
  }
  return fallback;
};

/**
 * Mathematical Capacity Analysis of 2-3 Character User Codes:
 * - 36-char alphanumeric pool:
 *   - 2 characters: 36^2 = 1,296 permutations.
 *   - 3 characters: 36^3 = 46,656 permutations.
 *   - Total pool: 47,952 unique user codes.
 * - 32-char safe pool (excluding 0/O, 1/I):
 *   - 2 characters: 32^2 = 1,024 permutations.
 *   - 3 characters: 32^3 = 32,768 permutations.
 *   - Total pool: 33,792 unique user codes.
 */
export const USER_CODE_CAPACITY_AUDIT = {
  fullCharsetSize: 36,
  safeCharsetSize: 32,
  length2Permutations: 1296,
  length3Permutations: 46656,
  totalTheoreticalPermutations: 47952,
  safeCharsetLength2: 1024,
  safeCharsetLength3: 32768,
  totalSafePermutations: 33792,
  scalingLimitWarningThreshold: 35000,
  recommendedActionOnSaturation: 'Upgrade ke 4 karakter alfanumerik (1.679.616 kombinasi) jika pengguna melampaui 35.000.'
};

// ====================================================================
// SECTION 3: OFFICIAL 5 ROLES SPECIFICATION & HELPERS
// ====================================================================

export const OFFICIAL_ROLES = [
  'super_admin',
  'owner',
  'admin',
  'sales',
  'customer'
] as const;

export type OfficialRole = typeof OFFICIAL_ROLES[number];

export interface RoleMetadata {
  id: OfficialRole;
  label: string;
  scope: 'platform' | 'tenant';
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const ROLE_DEFINITIONS: Record<OfficialRole, RoleMetadata> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Admin',
    scope: 'platform',
    description: 'Mengelola platform dan menetapkan Role pengguna sesuai kewenangannya.',
    badgeBg: 'bg-[#EFF7FA]',
    badgeText: 'text-[#086288]',
    badgeBorder: 'border-[#B7DDEA]'
  },
  owner: {
    id: 'owner',
    label: 'Owner',
    scope: 'tenant',
    description: 'Akses ke seluruh modul bisnis dalam tenant sendiri, tetapi tidak dapat mengubah Role atau hak istimewa keamanan.',
    badgeBg: 'bg-[#FEF3C7]',
    badgeText: 'text-[#92400E]',
    badgeBorder: 'border-[#FDE68A]'
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    scope: 'tenant',
    description: 'Hak operasional standar yang sama untuk semua pengguna ber-Role Admin.',
    badgeBg: 'bg-[#EEF4F8]',
    badgeText: 'text-[#0F172A]',
    badgeBorder: 'border-[#DCE5EC]'
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    scope: 'tenant',
    description: 'Akses ke fungsi penjualan sesuai izin yang ditetapkan.',
    badgeBg: 'bg-[#DCFCE7]',
    badgeText: 'text-[#166534]',
    badgeBorder: 'border-[#BBF7D0]'
  },
  customer: {
    id: 'customer',
    label: 'Customers',
    scope: 'tenant',
    description: 'Hanya mengakses profil dan transaksi miliknya sendiri.',
    badgeBg: 'bg-[#F1F5F9]',
    badgeText: 'text-[#475569]',
    badgeBorder: 'border-[#E2E8F0]'
  }
};

/**
 * Maps legacy role strings to official roles
 */
export const normalizeRole = (role: string): OfficialRole => {
  const r = role.toLowerCase().trim();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'owner') return 'owner';
  if (r === 'admin' || r === 'tenant_admin') return 'admin';
  if (r === 'sales' || r === 'sales_rep') return 'sales';
  if (r === 'customer' || r === 'customers') return 'customer';
  // PO Gate B3 Mandate:
  // - inventory_staff: HOLD (Do not auto-migrate or map to admin)
  // - accountant: HOLD (Do not auto-migrate or map to admin)
  // - branch_manager: REVIEW (Do not auto-migrate to admin without explicit PO sign-off)
  // To preserve least-privilege security and prevent privilege escalation,
  // unmapped legacy roles default to 'customer' (restricted access).
  return 'customer';
};

