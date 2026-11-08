/**
 * Canonical RSV Number Generator: RSV + 2-digit Branch + YYYYMM + 5-digit Sequence (16 characters)
 * Example: Branch "BR-01" in November 2026 => RSV0120261100001
 */
export const generateRsvNumber = (branchCode: string, dateStr?: string, seq?: number): string => {
  const digitsOnly = (branchCode || '01').replace(/\D/g, '');
  const branchDigits = digitsOnly.length >= 2 ? digitsOnly.slice(-2) : (digitsOnly.padStart(2, '0') || '01');
  const cleanDate = (dateStr || new Date().toISOString()).slice(0, 7).replace('-', '');
  const paddedSeq = seq !== undefined ? String(seq).padStart(5, '0') : String(Math.floor(10000 + Math.random() * 90000));
  return `RSV${branchDigits}${cleanDate}${paddedSeq}`;
};

/**
 * Canonical DO (Delivery Order / Picking) Number Generator:
 * Pattern: DO + 2-digit Branch + YYYYMM + 5-digit Sequence (15 characters)
 * Example: Branch "BR-01" in November 2026 => DO0120261100001
 */
export const generateDoNumber = (branchCode: string, dateStr?: string, seq?: number): string => {
  const digitsOnly = (branchCode || '01').replace(/\D/g, '');
  const branchDigits = digitsOnly.length >= 2 ? digitsOnly.slice(-2) : (digitsOnly.padStart(2, '0') || '01');
  const cleanDate = (dateStr || new Date().toISOString()).slice(0, 7).replace('-', '');
  const paddedSeq = seq !== undefined ? String(seq).padStart(5, '0') : String(Math.floor(10000 + Math.random() * 90000));
  return `DO${branchDigits}${cleanDate}${paddedSeq}`;
};
