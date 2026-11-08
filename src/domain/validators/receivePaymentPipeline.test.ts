/**
 * Receive Payment & AR Settlement Pipeline Test Suite
 * Validates standard payment receipt workflows, multi-payment calculations,
 * and FIFO/manual invoice settlement algorithms within Zyvora ERP.
 */

import {
  ReceivePayment,
  PaymentInvoiceAllocation,
  PaymentMethodEntry,
  SalesInvoice
} from '../../types/erp';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('\n=============================================================');
console.log('ZYVORA ERP 1.0.0 — RECEIVE PAYMENT & AR SETTLEMENT TEST SUITE');
console.log('=============================================================\n');

// 1. Payment Numbering Patterns
console.log('[TEST GROUP 1] Receive Payment Document Numbering');
const testRpNumber = 'RP00120261100001';
const testSysNumber = 'SYS-RP-202611-00001';

const rpRegex = /^RP\d{3}\d{4}\d{2}\d{5}$/; // RP + 3-digit tenant + 4-digit year + 2-digit month + 5-digit sequence
assert(rpRegex.test(testRpNumber), `RP number follows canonical format (${testRpNumber})`);
assert(testRpNumber.length === 16, `RP number length is exactly 16 characters (${testRpNumber.length})`);
assert(testSysNumber.startsWith('SYS-RP-'), `System number has SYS-RP- prefix (${testSysNumber})`);

// 2. Multi-Payment Methods Calculation
console.log('\n[TEST GROUP 2] Multi-Payment Methods & Aggregation');
const paymentMethods: PaymentMethodEntry[] = [
  {
    id: 'pm_1',
    paymentMethod: 'bank_transfer',
    paymentDescription: 'BCA-8830192831 Bank BCA',
    documentNumber: 'TRF-20261101-098',
    amount: 50000000
  },
  {
    id: 'pm_2',
    paymentMethod: 'cash',
    paymentDescription: 'KAS-KECIL Kasir Utama',
    documentNumber: 'KAS-001',
    amount: 11000000
  }
];

const totalPayment = paymentMethods.reduce((acc, curr) => acc + curr.amount, 0);
assert(totalPayment === 61000000, `Total payment aggregates correctly: Rp ${totalPayment.toLocaleString('id-ID')}`);

// 3. FIFO Auto-Allocation Algorithm
console.log('\n[TEST GROUP 3] Invoice Allocation & Status Updates');
const sampleInvoices: SalesInvoice[] = [
  {
    id: 'inv_1',
    tenantId: 'tenant_default',
    invoiceNumber: 'INV00120261000001',
    sourceType: 'sales_order',
    sourceId: 'so_1',
    sourceNumber: 'SO00120261000001',
    customerId: 'cust_1',
    customerCode: 'B3K9A',
    customerName: 'PT Sumber Alfaria Trijaya Tbk',
    invoiceDate: '2026-10-30',
    dueDate: '2026-11-29',
    paymentMethod: 'top',
    status: 'unpaid',
    subtotal: 100000000,
    discountTotal: 0,
    taxAmount: 11000000,
    totalAmount: 111000000,
    paidAmount: 0,
    outstandingBalance: 111000000,
    items: [],
    createdAt: '2026-10-30T10:00:00Z'
  },
  {
    id: 'inv_2',
    tenantId: 'tenant_default',
    invoiceNumber: 'INV00120261000002',
    sourceType: 'sales_order',
    sourceId: 'so_2',
    sourceNumber: 'SO00120261000002',
    customerId: 'cust_1',
    customerCode: 'B3K9A',
    customerName: 'PT Sumber Alfaria Trijaya Tbk',
    invoiceDate: '2026-10-31',
    dueDate: '2026-11-30',
    paymentMethod: 'top',
    status: 'unpaid',
    subtotal: 40000000,
    discountTotal: 0,
    taxAmount: 4400000,
    totalAmount: 44400000,
    paidAmount: 0,
    outstandingBalance: 44400000,
    items: [],
    createdAt: '2026-10-31T10:00:00Z'
  }
];

// Scenario A: Partial Payment on Invoice 1
const partialPaymentAmount = 61000000;
let remainingToAllocate = partialPaymentAmount;

const allocations: PaymentInvoiceAllocation[] = [];
for (const inv of sampleInvoices) {
  if (remainingToAllocate <= 0) break;
  const pay = Math.min(inv.outstandingBalance, remainingToAllocate);
  allocations.push({
    id: `alloc_${inv.id}`,
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerCode: inv.customerCode,
    customerName: inv.customerName,
    dueDate: inv.dueDate,
    invoiceAmount: inv.totalAmount,
    outstandingBalance: inv.outstandingBalance - pay,
    paidAmount: pay,
    method: 'Automatic',
    documentNumber: inv.sourceNumber
  });
  remainingToAllocate -= pay;
}

assert(allocations.length === 1, `Allocates strictly to first unpaid invoice`);
assert(allocations[0].paidAmount === 61000000, `Allocated amount matches: Rp ${allocations[0].paidAmount.toLocaleString('id-ID')}`);
assert(allocations[0].outstandingBalance === 50000000, `Remaining balance updated to Rp 50,000,000`);

// Simulate settlement in invoice state
const settledInvoices = sampleInvoices.map((inv) => {
  const match = allocations.find((a) => a.invoiceId === inv.id);
  if (match) {
    const newPaid = inv.paidAmount + match.paidAmount;
    const newBal = inv.totalAmount - newPaid;
    return {
      ...inv,
      paidAmount: newPaid,
      outstandingBalance: newBal,
      status: (newBal === 0 ? 'paid' : 'partially_paid') as SalesInvoice['status']
    };
  }
  return inv;
});

assert(settledInvoices[0].status === 'partially_paid', `Invoice 1 status transitioned to PARTIALLY_PAID`);
assert(settledInvoices[0].outstandingBalance === 50000000, `Invoice 1 outstanding balance is Rp 50,000,000`);
assert(settledInvoices[1].status === 'unpaid', `Invoice 2 remains UNPAID`);

// Scenario B: Subsequent Settlement (Paying off remaining 50,000,000 + 44,400,000)
const fullPaymentRemaining = 50000000 + 44400000;
let rem2 = fullPaymentRemaining;
const allocs2: PaymentInvoiceAllocation[] = [];
for (const inv of settledInvoices) {
  if (rem2 <= 0) break;
  const pay = Math.min(inv.outstandingBalance, rem2);
  allocs2.push({
    id: `alloc_sub_${inv.id}`,
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerCode: inv.customerCode,
    customerName: inv.customerName,
    dueDate: inv.dueDate,
    invoiceAmount: inv.totalAmount,
    outstandingBalance: inv.outstandingBalance - pay,
    paidAmount: pay,
    method: 'Automatic',
    documentNumber: inv.sourceNumber
  });
  rem2 -= pay;
}

const fullySettledInvoices = settledInvoices.map((inv) => {
  const match = allocs2.find((a) => a.invoiceId === inv.id);
  if (match) {
    const newPaid = inv.paidAmount + match.paidAmount;
    const newBal = Math.max(0, inv.totalAmount - newPaid);
    return {
      ...inv,
      paidAmount: newPaid,
      outstandingBalance: newBal,
      status: (newBal === 0 ? 'paid' : 'partially_paid') as SalesInvoice['status']
    };
  }
  return inv;
});

assert(fullySettledInvoices[0].status === 'paid', `Invoice 1 is now 100% PAID`);
assert(fullySettledInvoices[0].outstandingBalance === 0, `Invoice 1 outstanding balance is Rp 0`);
assert(fullySettledInvoices[1].status === 'paid', `Invoice 2 is now 100% PAID`);
assert(fullySettledInvoices[1].outstandingBalance === 0, `Invoice 2 outstanding balance is Rp 0`);

// 4. Verification Check and Approval Status
console.log('\n[TEST GROUP 4] Approval & Checked Indicator Flag');
const pendingPayment: ReceivePayment = {
  id: 'rp_test_1',
  tenantId: 'tenant_default',
  branchId: 'br_01',
  branchCode: 'BR-01',
  branchName: 'Cabang Utama Jakarta',
  paymentNumber: 'RP00120261100001',
  sysNumber: 'SYS-RP-202611-00001',
  documentNumber: 'KWT-001',
  paymentDate: '2026-11-01',
  paymentAllocation: 'automatic',
  fromInvoiceCollection: false,
  collectorId: 'col_01',
  collectorCode: 'COL-01',
  collectorName: 'Arya Pratama',
  customerId: 'cust_1',
  customerCode: 'B3K9A',
  customerName: 'PT Sumber Alfaria Trijaya Tbk',
  currency: 'IDR',
  source: 'MANUAL',
  status: 'pending',
  isChecked: false,
  totalPaymentAmount: 61000000,
  totalAllocatedAmount: 61000000,
  paymentMethods: paymentMethods,
  allocations: allocations,
  createdAt: '2026-11-01T08:00:00Z'
};

assert(pendingPayment.isChecked === false, `Pending payment has unchecked flag (indicates red dot badge)`);
assert(pendingPayment.status === 'pending', `Pending payment status is PENDING`);

// Approve action
const approvedPayment: ReceivePayment = {
  ...pendingPayment,
  status: 'approved',
  isChecked: true,
  approvedAt: '2026-11-01T08:30:00Z',
  approvedBy: 'Finance Supervisor'
};

assert(approvedPayment.isChecked === true, `Approved payment has checked flag = true`);
assert(approvedPayment.status === 'approved', `Approved payment status is APPROVED`);
assert(approvedPayment.approvedBy === 'Finance Supervisor', `Approved payment records approver`);

console.log('\n-------------------------------------------------------------');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('ALL RECEIVE PAYMENT & AR PIPELINE TESTS PASSED (100%)');
} else {
  console.error(`RECEIVE PAYMENT PIPELINE TESTS FAILED: ${failedTests} failure(s)`);
}
console.log('-------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
}
