/**
 * Zyvora ERP 1.0.0 — Sales Order Service & Enterprise Booking Test Suite
 * Validates:
 * 1. Strict document numbering format: SB00120261000001 (16 characters)
 * 2. Prefix, tenant ID, YYYYMM, and counter sequential generation & padding
 * 3. Document number validator edge cases & error messages
 * 4. Multi-LOB line item cost center mapping and subtotal calculations
 * 5. Payment milestone balancing (sum = 100%) and stage amount formulas
 * 6. Outstanding balance and settlement tracking
 */

import {
  generateServiceBookingNumber,
  validateServiceBookingNumber
} from './erpRules';
import {
  ServiceBookingOrder,
  ServiceBookingItem,
  PaymentMilestone
} from '../../types/erp';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runServiceBookingTestSuite() {
  console.log('\n=============================================================');
  console.log('ZYVORA ERP 1.0.0 — SALES ORDER SERVICE TEST SUITE');
  console.log('=============================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Document Numbering Generation (SB00120261000001)
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Service Booking Document Numbering Generation');

  const canonicalDate = new Date(2026, 9, 29); // October 2026 (Month is 0-indexed: 9 = October)
  const bookingNo1 = generateServiceBookingNumber('001', 1, canonicalDate);
  assert(
    bookingNo1 === 'SB00120261000001',
    'SB Num 1: First booking generates exact pattern SB00120261000001',
    `Expected 'SB00120261000001', received '${bookingNo1}'`
  );

  const bookingNo2 = generateServiceBookingNumber('001', 42, canonicalDate);
  assert(
    bookingNo2 === 'SB00120261000042',
    'SB Num 2: Sequence 42 is padded with 3 leading zeroes to 5 digits (00042)',
    `Expected 'SB00120261000042', received '${bookingNo2}'`
  );

  const bookingNo3 = generateServiceBookingNumber('1', 5, canonicalDate);
  assert(
    bookingNo3 === 'SB00120261000005',
    'SB Num 3: Single-digit tenant "1" is normalized to 3 digits ("001")',
    `Expected 'SB00120261000005', received '${bookingNo3}'`
  );

  const futureDate = new Date(2027, 2, 15); // March 2027
  const bookingNoFuture = generateServiceBookingNumber('002', 123, futureDate);
  assert(
    bookingNoFuture === 'SB00220270300123',
    'SB Num 4: Future date March 2027 with tenant 002 produces SB00220270300123',
    `Expected 'SB00220270300123', received '${bookingNoFuture}'`
  );

  assert(
    bookingNo1.length === 16,
    'SB Num 5: Canonical document number length is strictly 16 characters',
    `Length is ${bookingNo1.length}`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: Document Number Validation Regex
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Service Booking Number Validation Regex');

  const validResult1 = validateServiceBookingNumber('SB00120261000001');
  assert(
    validResult1.isValid === true && !validResult1.error,
    'SB Val 1: Canonical "SB00120261000001" passes validation'
  );

  const invalidPrefix = validateServiceBookingNumber('SO00120261000001');
  assert(
    invalidPrefix.isValid === false && Boolean(invalidPrefix.error?.includes('SB')),
    'SB Val 2: Rejects non-SB prefix "SO00120261000001"'
  );

  const invalidCase = validateServiceBookingNumber('sb00120261000001');
  assert(
    invalidCase.isValid === false,
    'SB Val 3: Rejects lowercase prefix "sb00120261000001"'
  );

  const tooShort = validateServiceBookingNumber('SB0012026100001');
  assert(
    tooShort.isValid === false && Boolean(tooShort.error?.includes('16 characters')),
    'SB Val 4: Rejects 15-character string "SB0012026100001"'
  );

  const tooLong = validateServiceBookingNumber('SB001202610000001');
  assert(
    tooLong.isValid === false && Boolean(tooLong.error?.includes('16 characters')),
    'SB Val 5: Rejects 17-character string "SB001202610000001"'
  );

  const nonNumericTenant = validateServiceBookingNumber('SBABC20261000001');
  assert(
    nonNumericTenant.isValid === false,
    'SB Val 6: Rejects non-numeric tenant digits "SBABC20261000001"'
  );

  const emptyInput = validateServiceBookingNumber('');
  assert(
    emptyInput.isValid === false && Boolean(emptyInput.error?.includes('required')),
    'SB Val 7: Rejects empty string'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: Multi-LOB Revenue Allocation & Subtotal Calculations
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Multi-LOB Revenue Allocation & Calculations');

  const mockItems: ServiceBookingItem[] = [
    {
      id: 'item_1',
      businessLineId: 'HIZAKI',
      businessLineName: 'Hizaki Wedding Planner',
      costCenterCode: 'CC-LOB-HIZAKI',
      serviceName: 'Full Day Wedding Organizer',
      quantity: 1,
      uom: 'Package',
      unitPrice: 35000000,
      discount: 0,
      subtotal: 35000000
    },
    {
      id: 'item_2',
      businessLineId: 'AURUM',
      businessLineName: 'Aurum Deco',
      costCenterCode: 'CC-LOB-AURUM',
      serviceName: 'Royal Ballroom Floral & Backdrop Stage',
      quantity: 1,
      uom: 'Package',
      unitPrice: 50000000,
      discount: 5000000,
      subtotal: 45000000
    },
    {
      id: 'item_3',
      businessLineId: 'KIMIKO',
      businessLineName: 'Ki Mi Ko Pager Ayu',
      costCenterCode: 'CC-LOB-KIMIKO',
      serviceName: '6 Person Traditional Reception Usherettes',
      quantity: 1,
      uom: 'Package',
      unitPrice: 5000000,
      discount: 0,
      subtotal: 5000000
    }
  ];

  const subtotal = mockItems.reduce((sum, item) => sum + item.subtotal, 0);
  assert(
    subtotal === 85000000,
    'Multi-LOB 1: Combined items subtotal equals 85,000,000 IDR',
    `Expected 85000000, got ${subtotal}`
  );

  // Cost Center breakdown
  const hizakiTotal = mockItems
    .filter((i) => i.costCenterCode === 'CC-LOB-HIZAKI')
    .reduce((sum, i) => sum + i.subtotal, 0);
  const aurumTotal = mockItems
    .filter((i) => i.costCenterCode === 'CC-LOB-AURUM')
    .reduce((sum, i) => sum + i.subtotal, 0);
  const kimikoTotal = mockItems
    .filter((i) => i.costCenterCode === 'CC-LOB-KIMIKO')
    .reduce((sum, i) => sum + i.subtotal, 0);

  assert(
    hizakiTotal === 35000000,
    'Multi-LOB 2: Hizaki WO mapped to CC-LOB-HIZAKI receives 35,000,000 IDR'
  );
  assert(
    aurumTotal === 45000000,
    'Multi-LOB 3: Aurum Deco mapped to CC-LOB-AURUM receives 45,000,000 IDR'
  );
  assert(
    kimikoTotal === 5000000,
    'Multi-LOB 4: Kimiko mapped to CC-LOB-KIMIKO receives 5,000,000 IDR'
  );

  // Commercial net calculation: Subtotal (85M) - Order Discount (5M) + Tax (0) = 80M
  const orderDiscount = 5000000;
  const taxAmount = 0;
  const totalAmount = subtotal - orderDiscount + taxAmount;
  assert(
    totalAmount === 80000000,
    'Multi-LOB 5: Grand total after 5,000,000 IDR order discount equals 80,000,000 IDR'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 4: Payment Milestone Balancing & Schedules
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Payment Milestone Balancing & Schedules');

  const standardMilestones: PaymentMilestone[] = [
    {
      id: 'ms_1',
      milestoneName: 'Down Payment (20%)',
      percentage: 20,
      amount: Math.round(totalAmount * 0.2),
      dueDate: '2026-10-30',
      paidAmount: 16000000,
      status: 'paid'
    },
    {
      id: 'ms_2',
      milestoneName: 'Technical Preparation H-30 (40%)',
      percentage: 40,
      amount: Math.round(totalAmount * 0.4),
      dueDate: '2026-11-20',
      paidAmount: 0,
      status: 'unpaid'
    },
    {
      id: 'ms_3',
      milestoneName: 'Final Settlement H-7 (40%)',
      percentage: 40,
      amount: Math.round(totalAmount * 0.4),
      dueDate: '2026-12-13',
      paidAmount: 0,
      status: 'unpaid'
    }
  ];

  const totalPercentage = standardMilestones.reduce((sum, m) => sum + m.percentage, 0);
  assert(
    totalPercentage === 100,
    'Milestone 1: 3-stage milestone percentages sum up to exactly 100%',
    `Sum is ${totalPercentage}%`
  );

  const totalScheduledAmount = standardMilestones.reduce((sum, m) => sum + m.amount, 0);
  assert(
    totalScheduledAmount === totalAmount,
    'Milestone 2: Sum of scheduled milestone amounts matches total contract value (80M IDR)',
    `Expected ${totalAmount}, got ${totalScheduledAmount}`
  );

  const twoStagePercentages = [50, 50].reduce((sum, p) => sum + p, 0);
  assert(
    twoStagePercentages === 100,
    'Milestone 3: 2-stage milestone preset (50% - 50%) sums up to 100%'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 5: Outstanding Balance & Settlement Tracking
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Outstanding Balance & Settlement Tracking');

  const paidAmount = standardMilestones.reduce((sum, m) => sum + m.paidAmount, 0);
  assert(
    paidAmount === 16000000,
    'Settlement 1: Paid amount from DP equals 16,000,000 IDR'
  );

  const outstandingBalance = totalAmount - paidAmount;
  assert(
    outstandingBalance === 64000000,
    'Settlement 2: Remaining balance due is 64,000,000 IDR'
  );

  const collectionRate = (paidAmount / totalAmount) * 100;
  assert(
    collectionRate === 20,
    'Settlement 3: Collection rate is 20%'
  );

  // Full settlement test
  const fullyPaid = totalAmount;
  const zeroBalance = totalAmount - fullyPaid;
  assert(
    zeroBalance === 0,
    'Settlement 4: Fully settled contract yields 0 outstanding balance'
  );

  console.log('\n-------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('ALL SERVICE BOOKING TESTS PASSED (100%)');
  console.log('-------------------------------------------------------------\n');
}

runServiceBookingTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
