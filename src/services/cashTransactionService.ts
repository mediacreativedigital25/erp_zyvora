/**
 * Zyvora ERP 1.0.0 — Cash Transaction Service
 * Manages Cash Receipts and Cash Issues (Disbursements)
 * Provides integration between Approved Expense Claims and Cash Disbursement
 */

import { CashTransaction, ExpenseClaim } from '../types/erp';
import { ExpenseClaimService } from './expenseClaimService';
import { DocumentNumberingService } from './documentNumberingService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'ZYVORA_CASH_TRANSACTIONS';

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [];

export class CashTransactionService {
  /**
   * Generates next unique cash transaction number based on type and date
   * Supports standard modular format: CSH + [TENANT:3] + [BRANCH] + [YYYYMM] + [SEQUENCE:5]
   * Example: CSH00120261000001 (HQ) or CSH001A20261000001 (Branch A)
   * Also supports legacy pattern: CSH-IN-YYYYMM-XXXX / CSH-OUT-YYYYMM-XXXX
   */
  static generateNextNumber(
    existing: CashTransaction[],
    type: 'receipt' | 'issue',
    txDate = new Date().toISOString().split('T')[0],
    options?: { tenantCode?: string; branchSuffix?: string }
  ): string {
    if (options?.tenantCode) {
      return DocumentNumberingService.generateNextNumber(
        'CSH',
        existing.map((tx) => tx.transactionNumber),
        {
          tenantCode: options.tenantCode,
          branchSuffix: options.branchSuffix || '',
          targetDate: txDate
        }
      );
    }

    const yearMonth = txDate.replace(/-/g, '').slice(0, 6);
    const prefix = type === 'receipt' ? `CSH-IN-${yearMonth}-` : `CSH-OUT-${yearMonth}-`;
    const relevant = existing.filter((tx) => tx.transactionNumber && tx.transactionNumber.startsWith(prefix));

    let maxSeq = 0;
    for (const tx of relevant) {
      const parts = tx.transactionNumber.split('-');
      const seqStr = parts[parts.length - 1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Reads all cash transactions from cloud server or local storage fallback
   */
  static async getCashTransactions(tenantId = 'ten_zyvora_corp'): Promise<CashTransaction[]> {
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('cash_transactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('transaction_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            transactionNumber: row.transaction_number,
            transactionDate: row.transaction_date,
            type: row.type,
            source: row.source,
            referenceId: row.reference_id,
            referenceNumber: row.reference_number,
            accountId: row.account_id,
            accountName: row.account_name,
            amount: Number(row.amount) || 0,
            recipientOrPayer: row.recipient_or_payer,
            costCenterCode: row.cost_center_code,
            notes: row.notes,
            disbursementMethod: row.disbursement_method,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
        }
      } catch (err) {
        console.warn('Fallback to local storage for cash transactions:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const sanitized = Array.isArray(parsed) ? parsed.filter((t: any) => t.id !== 'csh_tx_01') : [];
          return sanitized;
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CASH_TRANSACTIONS));
      } catch {}
    }

    return INITIAL_CASH_TRANSACTIONS;
  }

  /**
   * Retrieves approved claims that are eligible for cash disbursement
   * Only returns claims where status === 'approved' (excludes draft, submitted, paid, rejected)
   */
  static async getApprovedClaimsForDisbursement(tenantId = 'ten_zyvora_corp'): Promise<ExpenseClaim[]> {
    const allClaims = await ExpenseClaimService.getClaims(tenantId);
    return allClaims.filter((claim) => claim.status === 'approved');
  }

  /**
   * Records a new cash transaction.
   * If type === 'issue' and source === 'claim_expense', automatically updates the referenced claim to 'paid'
   */
  static async createCashTransaction(
    payload: Omit<CashTransaction, 'id' | 'transactionNumber' | 'createdAt'> & { transactionNumber?: string },
    tenantId = 'ten_zyvora_corp',
    options?: { tenantCode?: string; branchSuffix?: string }
  ): Promise<CashTransaction> {
    const list = await this.getCashTransactions(tenantId);
    const txNumber = payload.transactionNumber || this.generateNextNumber(list, payload.type, payload.transactionDate, options);

    const newTx: CashTransaction = {
      ...payload,
      id: `csh_tx_${Date.now()}`,
      transactionNumber: txNumber,
      createdAt: new Date().toISOString()
    };

    list.unshift(newTx);

    // If this issue transaction is disbursing a Claim Expense, update the claim status to 'paid'
    if (newTx.type === 'issue') {
      // 1. Single reference disbursement
      if (newTx.source === 'claim_expense' && newTx.referenceId) {
        await ExpenseClaimService.updateStatus(
          newTx.referenceId,
          'paid',
          {
            actorName: newTx.createdBy,
            transactionId: newTx.id,
            transactionNumber: newTx.transactionNumber
          },
          tenantId
        );
      }

      // 2. Multi-line items disbursement
      if (newTx.items && newTx.items.length > 0) {
        for (const item of newTx.items) {
          if (item.transactionType === 'claim_expense' && item.reference) {
            await ExpenseClaimService.updateStatus(
              item.reference,
              'paid',
              {
                actorName: newTx.createdBy,
                transactionId: newTx.id,
                transactionNumber: newTx.transactionNumber
              },
              tenantId
            );
          }
        }
      }
    }

    // Save to server if configured
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('cash_transactions').insert({
          id: newTx.id,
          tenant_id: newTx.tenantId,
          transaction_number: newTx.transactionNumber,
          transaction_date: newTx.transactionDate,
          type: newTx.type,
          source: newTx.source,
          reference_id: newTx.referenceId,
          reference_number: newTx.referenceNumber,
          account_id: newTx.accountId,
          account_name: newTx.accountName,
          amount: newTx.amount,
          recipient_or_payer: newTx.recipientOrPayer,
          cost_center_code: newTx.costCenterCode,
          notes: newTx.notes,
          disbursement_method: newTx.disbursementMethod,
          created_by: newTx.createdBy
        });
      } catch (err) {
        console.warn('Failed to insert cash transaction to server:', err);
      }
    }

    // Save to local storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    return newTx;
  }
}
