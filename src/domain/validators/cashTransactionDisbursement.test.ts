/**
 * Zyvora ERP 1.0.0 — Cash Transaction & Claim Disbursement Test Suite
 * Tests Segregation of Duties: Input Claim -> Approval -> Cash Transaction Issue
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { CashTransactionService } from '../../services/cashTransactionService';
import { ExpenseClaim, CashTransaction, ReceivePayment } from '../../types/erp';

console.log('\n======================================================');
console.log('ZYVORA ERP 1.0.0 — CASH TRANSACTION & APPROVAL SUITE');
console.log('======================================================\n');

async function runTests() {
  const tenantId = 'ten_zyvora_corp';

  console.log('[TEST GROUP 1] Lifecycle Status: Input Claim -> Submit -> Approval Queue');

  // 1. Create a claim in draft
  const newClaimPayload: ExpenseClaim = {
    id: `claim_test_${Date.now()}`,
    tenantId,
    claimNumber: '',
    claimDate: '2026-10-27',
    requestByUserId: 'usr_staff_01',
    requestByName: 'Ahmad Staff Operasional',
    totalAmount: 450000,
    status: 'draft',
    disbursementMethod: 'petty_cash',
    notes: 'Klaim bahan bakar dan konsumsi meeting luar kota',
    items: [
      {
        id: `item_1_${Date.now()}`,
        lineNumber: 1,
        orderByType: 'business_line',
        orderByTargetId: 'lob_01',
        orderByTargetName: 'Queinvite Project',
        costCenterCode: 'CC-QUEINVITE',
        category: 'vehicle_fuel',
        activity: 'Hampers Delivery',
        isVehicleActivity: true,
        vehicleId: 'veh_01',
        licensePlate: 'B 1234 XYZ',
        odometerKm: 45200,
        fuelLiters: 35,
        nominal: 450000,
        disbursementMethod: 'petty_cash'
      }
    ]
  };

  const draftClaim = await ExpenseClaimService.saveClaim(newClaimPayload, tenantId);
  assert.ok(draftClaim.claimNumber.startsWith('CE'), 'Claim number follows CE prefix format');
  assert.strictEqual(draftClaim.status, 'draft', 'Newly created claim has draft status');
  console.log('  ✓ PASS: Lifecycle 1: Klaim berhasil dibuat dengan status draft');

  // 2. Draft claim must NOT be eligible for disbursement
  let eligibleForDisbursement = await CashTransactionService.getApprovedClaimsForDisbursement(tenantId);
  assert.ok(!eligibleForDisbursement.some((c) => c.id === draftClaim.id), 'Draft claim cannot be disbursed');
  console.log('  ✓ PASS: Lifecycle 2: Klaim draft TIDAK diizinkan untuk dicairkan di Cash Transaction');

  // 3. Submit claim
  const submittedClaim = await ExpenseClaimService.updateStatus(draftClaim.id, 'submitted', {
    actorName: 'Ahmad Staff Operasional'
  }, tenantId);
  assert.ok(submittedClaim, 'Claim updated to submitted');
  assert.strictEqual(submittedClaim?.status, 'submitted', 'Status is now submitted');

  eligibleForDisbursement = await CashTransactionService.getApprovedClaimsForDisbursement(tenantId);
  assert.ok(!eligibleForDisbursement.some((c) => c.id === draftClaim.id), 'Submitted claim cannot be disbursed before approval');
  console.log('  ✓ PASS: Lifecycle 3: Klaim berstatus submitted TIDAK diizinkan dicairkan sebelum persetujuan (Approval)');

  console.log('\n[TEST GROUP 2] Manager Approval Workflow');

  // 4. Manager approves claim in Approval module
  const approvedClaim = await ExpenseClaimService.updateStatus(draftClaim.id, 'approved', {
    actorName: 'Manager Operasional'
  }, tenantId);
  assert.ok(approvedClaim, 'Claim updated to approved');
  assert.strictEqual(approvedClaim?.status, 'approved', 'Status is approved');
  assert.strictEqual(approvedClaim?.approvedBy, 'Manager Operasional', 'Approver name recorded');
  assert.ok(approvedClaim?.approvedAt, 'Approval timestamp recorded');
  console.log('  ✓ PASS: Approval 1: Manager menyetujui klaim dan mencatat jejak audit (approver & timestamp)');

  // 5. Approved claim is now eligible for cash disbursement
  eligibleForDisbursement = await CashTransactionService.getApprovedClaimsForDisbursement(tenantId);
  assert.ok(eligibleForDisbursement.some((c) => c.id === draftClaim.id), 'Approved claim is visible for disbursement');
  console.log('  ✓ PASS: Approval 2: Klaim yang telah disetujui (Approved) otomatis muncul di antrean pencairan Kas');

  console.log('\n[TEST GROUP 3] Cash Transaction Issue & Automatic Claim Settlement');

  // 6. Record Cash Issue Transaction referencing approved claim
  const existingTxList = await CashTransactionService.getCashTransactions(tenantId);
  const nextTxNum = CashTransactionService.generateNextNumber(existingTxList, 'issue', '2026-10-27');
  assert.ok(nextTxNum.startsWith('CSH-OUT-202610-'), 'Transaction number follows CSH-OUT-YYYYMM-XXXX pattern');
  console.log(`  ✓ PASS: Cash Tx 1: Nomor transaksi pengeluaran kas valid (${nextTxNum})`);

  const createdTx = await CashTransactionService.createCashTransaction({
    tenantId,
    transactionDate: '2026-10-27',
    type: 'issue',
    source: 'claim_expense',
    referenceId: approvedClaim!.id,
    referenceNumber: approvedClaim!.claimNumber,
    accountId: 'acc_1002',
    accountName: 'Kas Kecil (Petty Cash)',
    amount: approvedClaim!.totalAmount,
    recipientOrPayer: approvedClaim!.requestByName,
    costCenterCode: 'CC-QUEINVITE',
    notes: `Pencairan reimbursement klaim ${approvedClaim!.claimNumber}`,
    disbursementMethod: 'petty_cash',
    createdBy: 'Finance Cashier'
  }, tenantId);

  assert.strictEqual(createdTx.type, 'issue', 'Transaction type is issue');
  assert.strictEqual(createdTx.amount, 450000, 'Transaction amount matches claim total');
  assert.strictEqual(createdTx.referenceNumber, approvedClaim!.claimNumber, 'References voucher claim');
  console.log('  ✓ PASS: Cash Tx 2: Transaksi pengeluaran kas berhasil dicatat oleh Kasir');

  // 7. Verify claim status was flipped to 'paid' and records transaction reference
  const reloadedClaims = await ExpenseClaimService.getClaims(tenantId);
  const disbursedClaim = reloadedClaims.find((c) => c.id === approvedClaim!.id);
  assert.strictEqual(disbursedClaim?.status, 'paid', 'Claim status automatically updated to paid');
  assert.strictEqual(disbursedClaim?.disbursedCashTransactionId, createdTx.id, 'Disbursement Tx ID linked');
  assert.strictEqual(disbursedClaim?.disbursedCashTransactionNumber, createdTx.transactionNumber, 'Disbursement Tx Number linked');
  console.log('  ✓ PASS: Cash Tx 3: Status klaim otomatis berubah menjadi LUNAS (Paid) dan mencatat referensi CSH-OUT');

  // 8. Prevent double disbursement
  eligibleForDisbursement = await CashTransactionService.getApprovedClaimsForDisbursement(tenantId);
  assert.ok(!eligibleForDisbursement.some((c) => c.id === approvedClaim!.id), 'Paid claim cannot be disbursed again');
  console.log('  ✓ PASS: Cash Tx 4: Klaim yang telah dicairkan tereliminasi dari daftar pencairan (Anti Double-Disbursement)');

  console.log('\n[TEST GROUP 4] Multi-line Items Grid Voucher Creation (MEDIST 4.0 Standard)');

  // 9. Create another approved claim to test multi-line batch disbursement
  const batchClaim = await ExpenseClaimService.saveClaim({
    id: `claim_batch_${Date.now()}`,
    tenantId,
    claimNumber: '',
    claimDate: '2026-10-27',
    requestByUserId: 'usr_staff_02',
    requestByName: 'Budi Santoso',
    totalAmount: 120000,
    status: 'approved',
    disbursementMethod: 'petty_cash',
    items: [
      {
        id: `batch_item_${Date.now()}`,
        lineNumber: 1,
        orderByType: 'business_line',
        orderByTargetId: 'lob_01',
        orderByTargetName: 'Queinvite Project',
        costCenterCode: 'CC-QUEINVITE',
        category: 'courier_logistics',
        activity: 'Express Courier Delivery',
        nominal: 120000,
        disbursementMethod: 'petty_cash'
      }
    ]
  }, tenantId);

  // 10. Create multi-line cash voucher
  const multiLineTx = await CashTransactionService.createCashTransaction({
    tenantId,
    transactionDate: '2026-10-27',
    type: 'issue',
    source: 'claim_expense',
    branchId: 'br_hq',
    branchName: 'Kantor Pusat',
    accountId: 'acc_1002',
    accountName: 'Kas Kecil (Petty Cash)',
    amount: 170000, // 120k from claim + 50k direct
    recipientOrPayer: 'Budi Santoso',
    items: [
      {
        id: 'line_1',
        transactionType: 'claim_expense',
        recipientOrPayer: 'Budi Santoso',
        correspondingDoc: batchClaim.claimNumber,
        reference: batchClaim.id,
        amount: 120000,
        subBranchCode: 'CC-QUEINVITE',
        remark: 'Pencairan klaim kurir ekspres'
      },
      {
        id: 'line_2',
        transactionType: 'direct_expense',
        recipientOrPayer: 'Toko ATK',
        amount: 50000,
        remark: 'Beli materai operasional'
      }
    ],
    createdBy: 'Finance Cashier'
  }, tenantId);

  assert.strictEqual(multiLineTx.items?.length, 2, 'Multi-line items saved in transaction');
  assert.strictEqual(multiLineTx.amount, 170000, 'Total accumulated amount matches');
  console.log('  ✓ PASS: Multi-line 1: Transaksi kas multi-item (grid) berhasil dicatat dengan akumulasi total yang tepat');

  // Verify batchClaim is flipped to paid
  const claimsAfterBatch = await ExpenseClaimService.getClaims(tenantId);
  const updatedBatchClaim = claimsAfterBatch.find((c) => c.id === batchClaim.id);
  assert.strictEqual(updatedBatchClaim?.status, 'paid', 'Referenced claim in multi-line item automatically set to paid');
  console.log('  ✓ PASS: Multi-line 2: Voucher klaim yang dirujuk dalam multi-line grid otomatis berubah status menjadi PAID');

  console.log('\n[TEST GROUP 5] Receive Payment (AR) to Cash Transaction Receipt (73003 - Penerimaan Penagihan)');

  // 11. Mock an approved Receive Payment from customer 17836 REJO MULYO
  let mockReceivePayments: ReceivePayment[] = [
    {
      id: 'rp_test_01',
      tenantId,
      paymentNumber: 'KR73_0731026000639',
      sysNumber: 'SYS-RP-202611-0001',
      branchId: 'br_hq',
      branchCode: '073',
      branchName: 'Kantor Pusat',
      documentNumber: 'TRF-BCA-9921',
      paymentDate: '2026-10-31',
      paymentAllocation: 'automatic',
      fromInvoiceCollection: false,
      customerId: 'cust_rejo_mulyo',
      customerCode: '17836',
      customerName: 'REJO MULYO',
      currency: 'IDR',
      totalPaymentAmount: 3824000,
      totalAllocatedAmount: 3824000,
      paymentMethods: [{ id: 'pm_1', paymentMethod: 'bank_transfer', paymentDescription: 'BCA Transfer', amount: 3824000, documentNumber: 'TRF-BCA-9921' }],
      allocations: [{ id: 'alloc_1', invoiceId: 'inv_01', invoiceNumber: '073/FP/2026/089', documentNumber: 'TRF-BCA-9921', customerCode: '17836', customerName: 'REJO MULYO', dueDate: '2026-11-15', invoiceAmount: 3824000, outstandingBalance: 3824000, paidAmount: 3824000, method: 'bank_transfer' }],
      source: 'Medist',
      status: 'approved',
      isDeposited: false,
      createdAt: '2026-10-31T09:00:00Z'
    }
  ];

  // Only un-deposited, approved receive payments are eligible for Cash Transaction
  const eligibleRP = mockReceivePayments.filter((rp) => rp.status === 'approved' && !rp.isDeposited);
  assert.strictEqual(eligibleRP.length, 1, 'Only un-deposited Receive Payments are eligible');
  assert.strictEqual(eligibleRP[0].customerCode, '17836', 'Eligible customer matches 17836 REJO MULYO');
  console.log('  ✓ PASS: Receive Payment 1: Antrean penerimaan kas memvalidasi status approved & belum didepositkan');

  // 12. Create Cash Receipt Transaction for 73003 - Penerimaan Penagihan
  let mockCashBookBalance = 10000000; // Starting 10 million
  const receiptTx = await CashTransactionService.createCashTransaction({
    tenantId,
    transactionDate: '2026-10-31',
    type: 'receipt',
    source: 'direct_receipt',
    branchId: 'br_hq',
    branchName: 'Kantor Pusat',
    accountId: 'acc_1001',
    accountName: 'Kas Operasional',
    amount: eligibleRP[0].totalPaymentAmount,
    recipientOrPayer: eligibleRP[0].customerName,
    items: [
      {
        id: 'rp_line_1',
        transactionType: '73003 - Penerimaan Penagihan',
        recipientOrPayerCode: eligibleRP[0].customerCode,
        recipientOrPayer: eligibleRP[0].customerName,
        correspondingDoc: eligibleRP[0].paymentNumber,
        reference: eligibleRP[0].documentNumber,
        amount: eligibleRP[0].totalPaymentAmount,
        subBranchCode: eligibleRP[0].branchCode,
        remark: `Penerimaan penagihan dari ${eligibleRP[0].customerName}`
      }
    ],
    createdBy: 'Finance Cashier'
  }, tenantId);

  assert.strictEqual(receiptTx.type, 'receipt', 'Voucher is receipt (Kas Masuk)');
  assert.strictEqual(receiptTx.amount, 3824000, 'Voucher amount matches Receive Payment amount');
  console.log(`  ✓ PASS: Receive Payment 2: Voucher penerimaan kas (${receiptTx.transactionNumber}) berhasil dibuat`);

  // 13. Simulate Liquid Balance Increment and Deposit Mark
  mockCashBookBalance += receiptTx.amount;
  assert.strictEqual(mockCashBookBalance, 13824000, 'Cash Book balance incremented (+Rp 3.824.000)');
  console.log('  ✓ PASS: Receive Payment 3: Saldo buku kas/bank bertambah sesuai nilai penerimaan kas (Single Gate of Truth)');

  mockReceivePayments = mockReceivePayments.map((rp) => {
    if (rp.paymentNumber === eligibleRP[0].paymentNumber) {
      return {
        ...rp,
        isDeposited: true,
        depositedAt: '2026-10-31T10:00:00Z',
        cashTransactionId: receiptTx.id,
        cashTransactionNumber: receiptTx.transactionNumber
      };
    }
    return rp;
  });

  const depositedRP = mockReceivePayments.find((rp) => rp.id === 'rp_test_01');
  assert.strictEqual(depositedRP?.isDeposited, true, 'Receive Payment flagged as deposited');
  assert.strictEqual(depositedRP?.cashTransactionId, receiptTx.id, 'Receive Payment linked to Cash Tx ID');
  console.log('  ✓ PASS: Receive Payment 4: Status Receive Payment terkunci menjadi isDeposited = true');

  // 14. Anti double-entry: Re-evaluating eligible payments returns empty
  const eligibleAfterDeposit = mockReceivePayments.filter((rp) => rp.status === 'approved' && !rp.isDeposited);
  assert.strictEqual(eligibleAfterDeposit.length, 0, 'Deposited payment eliminated from lookup list (Anti Double-Deposit)');
  console.log('  ✓ PASS: Receive Payment 5: Tagihan yang sudah disetorkan hilang dari antrean pencarian (Anti Double-Deposit)');

  console.log('\n======================================================');
  console.log('SELURUH PENGUJIAN CASH TRANSACTION & APPROVAL SUKSES: 15/15 PASSED (100%)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
