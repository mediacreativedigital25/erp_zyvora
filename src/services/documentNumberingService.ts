/**
 * Zyvora ERP 1.0.0 — Centralized Document Numbering Service
 * Standardizes sequence numbers across all ERP documents (SO, CE, CSH, PO, INV, DO, etc.)
 * Pattern: [DOC_TYPE][TENANT_CODE][BRANCH_SUFFIX][YYYYMM][SEQUENCE:5]
 *
 * Examples:
 * - Tenant 001 HQ:       SO00120261000001,  CE00120261000001,  CSH00120261000001
 * - Tenant 001 Branch A:  SO001A20261000001, CE001A20261000001, CSH001A20261000001
 * - Tenant 002 HQ:       SO00220261000001,  CE00220261000001
 * - Tenant 002 Branch A:  SO002A20261000001, CE002A20261000001
 */

import { Branch } from '../types/erp';

export type DocumentPrefixType =
  | 'SO'   // Sales Order
  | 'CE'   // Claim Expense
  | 'CSH'  // Cash Transaction
  | 'PO'   // Purchase Order
  | 'INV'  // Invoice
  | 'DO'   // Delivery Order
  | 'PR'   // Purchase Requisition
  | 'GR'   // Goods Receipt
  | 'AP';  // Approval

export interface DocumentNumberOptions {
  docType: DocumentPrefixType;
  tenantCode?: string;       // 3-digit tenant code, e.g. '001', '002'
  branchSuffix?: string;     // '' for HQ, 'A' for Branch 1, 'B' for Branch 2, etc.
  targetDate?: string;       // YYYY-MM-DD
}

export class DocumentNumberingService {
  /**
   * Builds the standard document prefix:
   * [DOCTYPE][TENANT_CODE:3][BRANCH_SUFFIX][YYYYMM]
   */
  static buildPrefix(
    docType: DocumentPrefixType,
    tenantCode = '001',
    branchSuffix = '',
    targetDate = new Date().toISOString().split('T')[0]
  ): string {
    // Normalisasi 3 digit numerik tenant (e.g. '001', '002')
    const cleanTenant = (tenantCode || '001').padStart(3, '0').slice(-3);
    const cleanSuffix = (branchSuffix || '').trim().toUpperCase();
    const yearMonth = targetDate.replace(/-/g, '').slice(0, 6); // YYYYMM (e.g. 202610)

    return `${docType}${cleanTenant}${cleanSuffix}${yearMonth}`;
  }

  /**
   * Generates the next sequential document number given existing document numbers
   */
  static generateNextNumber(
    docType: DocumentPrefixType,
    existingNumbers: string[] = [],
    options?: {
      tenantCode?: string;
      branchSuffix?: string;
      targetDate?: string;
    }
  ): string {
    const tenantCode = options?.tenantCode || '001';
    const branchSuffix = options?.branchSuffix || '';
    const targetDate = options?.targetDate || new Date().toISOString().split('T')[0];

    const prefix = this.buildPrefix(docType, tenantCode, branchSuffix, targetDate);

    // Filter existing numbers matching this exact prefix
    const matching = (existingNumbers || []).filter(
      (n) => n && n.startsWith(prefix)
    );

    let maxSeq = 0;
    for (const num of matching) {
      const seqStr = num.slice(prefix.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
  }

  /**
   * Resolves the branch suffix letter for a given branch
   * HQ = ''
   * 1st Branch = 'A'
   * 2nd Branch = 'B'
   * 3rd Branch = 'C'
   */
  static resolveBranchSuffix(
    branchId: string | undefined,
    branches: Branch[] = []
  ): string {
    if (!branchId) return '';
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return '';
    if (branch.isHeadquarters) return '';
    if (branch.codeSuffix !== undefined) return branch.codeSuffix.trim().toUpperCase();

    // Auto-calculate letter based on non-HQ branch order
    const nonHqBranches = branches.filter((b) => !b.isHeadquarters);
    const idx = nonHqBranches.findIndex((b) => b.id === branchId);
    if (idx >= 0) {
      return String.fromCharCode(65 + (idx % 26)); // 0 -> 'A', 1 -> 'B'
    }
    return 'A';
  }

  /**
   * Parses a standard document number into its components
   */
  static parseDocumentNumber(docNumber: string): {
    docType: string;
    tenantCode: string;
    branchSuffix: string;
    period: string;
    sequence: number;
    isValid: boolean;
  } | null {
    if (!docNumber || docNumber.length < 13) return null;

    // Pattern: 2-3 chars docType + 3 digits tenantCode + optional 1-2 char suffix + 6 digits YYYYMM + 5 digits sequence
    const regex = /^([A-Z]{2,3})(\d{3})([A-Z]?)(\d{6})(\d{5})$/;
    const match = docNumber.match(regex);
    if (!match) return null;

    const [, docType, tenantCode, branchSuffix, period, seqStr] = match;
    return {
      docType,
      tenantCode,
      branchSuffix,
      period,
      sequence: parseInt(seqStr, 10),
      isValid: true
    };
  }
}
