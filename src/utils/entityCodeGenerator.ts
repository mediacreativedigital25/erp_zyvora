import { Tenant } from '../types/erp';

/**
 * Extracts a normalized 2-digit tenant code string (e.g. '01', '02', '03', '04').
 * Uses tenantNumber if available, or numeric code, or tenant index.
 */
export function getTenant2DigitCode(
  tenant?: Tenant | { tenantNumber?: string; code?: string; id?: string } | null,
  allTenants?: { id: string }[]
): string {
  if (tenant?.tenantNumber) {
    const parsed = parseInt(tenant.tenantNumber, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return String(parsed).padStart(2, '0');
    }
  }
  if (tenant?.code) {
    const parsed = parseInt(tenant.code, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return String(parsed).padStart(2, '0');
    }
  }
  if (tenant?.id && allTenants && allTenants.length > 0) {
    const idx = allTenants.findIndex((t) => t.id === tenant.id);
    if (idx !== -1) {
      return String(idx + 1).padStart(2, '0');
    }
  }
  return '01';
}

/**
 * Generates next entity code in Option A format:
 * [PREFIX][TENANT_2DIGIT][SEQUENCE_3DIGIT]
 * Examples for Tenant 04:
 * - Cost Center: CC04001
 * - Department: DEP04001
 * - Position: POS04001
 * - Business Unit: BU04001
 * - Branch: BR04001
 * - Line of Business: LOB04001
 * - Warehouse: WH04001
 * - Vendor: VND04001
 */
export function generateSmartEntityCode(
  prefix: string,
  tenant?: Tenant | { tenantNumber?: string; code?: string; id?: string } | null,
  existingCodes: (string | undefined | null)[] = [],
  allTenants?: { id: string }[]
): string {
  const tCode = getTenant2DigitCode(tenant, allTenants);
  const targetPattern = new RegExp(`^${prefix}${tCode}(\\d+)$`, 'i');

  let maxSeq = 0;
  for (const c of existingCodes) {
    if (!c) continue;
    const match = c.match(targetPattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  // Fallback to legacy pattern detection if no new format exists yet
  if (maxSeq === 0) {
    const legacyPattern = new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i');
    for (const c of existingCodes) {
      if (!c) continue;
      const match = c.match(legacyPattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeqNum = maxSeq > 0 ? maxSeq + 1 : existingCodes.filter(Boolean).length + 1;
  const nextSeq = String(nextSeqNum).padStart(3, '0');
  return `${prefix}${tCode}${nextSeq}`;
}
