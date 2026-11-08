/**
 * Zyvora ERP 1.0.0 — Multi-Tenant & Branch Document Numbering Test Suite
 *
 * Validates the standardized document numbering formula:
 * [DOC_TYPE][TENANT_CODE:3][BRANCH_SUFFIX][YYYYMM][SEQUENCE:5]
 *
 * Specifications tested:
 * - Tenant 001 HQ:       SO00120261000001,  CE00120261000001,  CSH00120261000001
 * - Tenant 001 Branch A:  SO001A20261000001, CE001A20261000001, CSH001A20261000001
 * - Tenant 002 HQ:       SO00220261000001,  CE00220261000001
 * - Tenant 002 Branch A:  SO002A20261000001, CE002A20261000001
 * - Sequential incrementing (00001 -> 00002)
 * - Branch isolation (Tenant 001 HQ seq does not increment Branch A seq)
 * - Tenant isolation (Tenant 001 seq does not affect Tenant 002 seq)
 * - Month rollover reset
 * - Branch suffix resolver
 * - Document string parser
 */

import { DocumentNumberingService } from '../../services/documentNumberingService';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { Branch, ExpenseClaim } from '../../types/erp';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — MULTI-TENANT DOCUMENT NUMBERING SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Standard Prefix Construction
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Standard Prefix Formula Construction');

  const p1 = DocumentNumberingService.buildPrefix('SO', '001', '', '2026-10-27');
  assert(p1 === 'SO001202610', 'Tenant 001 HQ SO prefix is SO001202610', `Got: ${p1}`);

  const p2 = DocumentNumberingService.buildPrefix('SO', '001', 'A', '2026-10-27');
  assert(p2 === 'SO001A202610', 'Tenant 001 Branch A SO prefix is SO001A202610', `Got: ${p2}`);

  const p3 = DocumentNumberingService.buildPrefix('CE', '001', '', '2026-10-27');
  assert(p3 === 'CE001202610', 'Tenant 001 HQ CE prefix is CE001202610', `Got: ${p3}`);

  const p4 = DocumentNumberingService.buildPrefix('CE', '001', 'A', '2026-10-27');
  assert(p4 === 'CE001A202610', 'Tenant 001 Branch A CE prefix is CE001A202610', `Got: ${p4}`);

  const p5 = DocumentNumberingService.buildPrefix('SO', '002', '', '2026-10-27');
  assert(p5 === 'SO002202610', 'Tenant 002 HQ SO prefix is SO002202610', `Got: ${p5}`);

  const p6 = DocumentNumberingService.buildPrefix('SO', '002', 'A', '2026-10-27');
  assert(p6 === 'SO002A202610', 'Tenant 002 Branch A SO prefix is SO002A202610', `Got: ${p6}`);

  const p7 = DocumentNumberingService.buildPrefix('CSH', '001', '', '2026-10-27');
  assert(p7 === 'CSH001202610', 'Tenant 001 HQ CSH prefix is CSH001202610', `Got: ${p7}`);

  const p8 = DocumentNumberingService.buildPrefix('CSH', '001', 'A', '2026-10-27');
  assert(p8 === 'CSH001A202610', 'Tenant 001 Branch A CSH prefix is CSH001A202610', `Got: ${p8}`);

  // ------------------------------------------------------------------
  // TEST GROUP 2: Sequential Number Generation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Sequential Generation & Initial Sequences');

  const num1 = DocumentNumberingService.generateNextNumber('SO', [], {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(num1 === 'SO00120261000001', 'First number for Tenant 001 HQ is SO00120261000001', `Got: ${num1}`);

  const numBranchA = DocumentNumberingService.generateNextNumber('SO', [], {
    tenantCode: '001',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(numBranchA === 'SO001A20261000001', 'First number for Tenant 001 Branch A is SO001A20261000001', `Got: ${numBranchA}`);

  const numTenant002 = DocumentNumberingService.generateNextNumber('SO', [], {
    tenantCode: '002',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(numTenant002 === 'SO00220261000001', 'First number for Tenant 002 HQ is SO00220261000001', `Got: ${numTenant002}`);

  const numTenant002BranchA = DocumentNumberingService.generateNextNumber('SO', [], {
    tenantCode: '002',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(numTenant002BranchA === 'SO002A20261000001', 'First number for Tenant 002 Branch A is SO002A20261000001', `Got: ${numTenant002BranchA}`);

  // ------------------------------------------------------------------
  // TEST GROUP 3: Incrementing & Isolation Across Branches and Tenants
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Multi-Tenant & Branch Sequence Isolation');

  const existingPool = [
    'SO00120261000001',
    'SO00120261000002',
    'SO001A20261000001',
    'SO00220261000001'
  ];

  const nextTenant001Hq = DocumentNumberingService.generateNextNumber('SO', existingPool, {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(nextTenant001Hq === 'SO00120261000003', 'Tenant 001 HQ correctly increments to sequence 00003', `Got: ${nextTenant001Hq}`);

  const nextTenant001BranchA = DocumentNumberingService.generateNextNumber('SO', existingPool, {
    tenantCode: '001',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(nextTenant001BranchA === 'SO001A20261000002', 'Tenant 001 Branch A increments to 00002 independently', `Got: ${nextTenant001BranchA}`);

  const nextTenant002Hq = DocumentNumberingService.generateNextNumber('SO', existingPool, {
    tenantCode: '002',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(nextTenant002Hq === 'SO00220261000002', 'Tenant 002 HQ increments to 00002 independently', `Got: ${nextTenant002Hq}`);

  const nextTenant002BranchAFirst = DocumentNumberingService.generateNextNumber('SO', existingPool, {
    tenantCode: '002',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(nextTenant002BranchAFirst === 'SO002A20261000001', 'Tenant 002 Branch A starts at 00001 because no previous entries exist', `Got: ${nextTenant002BranchAFirst}`);

  // Month rollover
  const nextMonthNum = DocumentNumberingService.generateNextNumber('SO', existingPool, {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-11-01'
  });
  assert(nextMonthNum === 'SO00120261100001', 'New month (202611) resets sequence to 00001', `Got: ${nextMonthNum}`);

  // ------------------------------------------------------------------
  // TEST GROUP 4: Branch Suffix Resolver
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Branch Suffix Resolver');

  const mockBranches: Branch[] = [
    {
      id: 'br-hq',
      businessUnitId: 'bu-1',
      code: 'JKT-HQ',
      name: 'Kantor Pusat Jakarta',
      city: 'Jakarta',
      address: 'Jl. Sudirman',
      phone: '021-1234567',
      isHeadquarters: true,
      codeSuffix: '',
      isActive: true
    },
    {
      id: 'br-sub',
      businessUnitId: 'bu-1',
      code: 'SBY-BR1',
      name: 'Cabang Surabaya',
      city: 'Surabaya',
      address: 'Jl. Pemuda',
      phone: '031-1234567',
      isHeadquarters: false,
      codeSuffix: 'A',
      isActive: true
    },
    {
      id: 'br-medan',
      businessUnitId: 'bu-1',
      code: 'MDN-BR2',
      name: 'Cabang Medan',
      city: 'Medan',
      address: 'Jl. Gatot Subroto',
      phone: '061-1234567',
      isHeadquarters: false,
      codeSuffix: 'B',
      isActive: true
    }
  ];

  const suffixHQ = DocumentNumberingService.resolveBranchSuffix('br-hq', mockBranches);
  assert(suffixHQ === '', 'Headquarters branch resolves to empty suffix ""', `Got: "${suffixHQ}"`);

  const suffixSub = DocumentNumberingService.resolveBranchSuffix('br-sub', mockBranches);
  assert(suffixSub === 'A', 'First branch resolves to "A"', `Got: "${suffixSub}"`);

  const suffixMedan = DocumentNumberingService.resolveBranchSuffix('br-medan', mockBranches);
  assert(suffixMedan === 'B', 'Second branch resolves to "B"', `Got: "${suffixMedan}"`);

  // ------------------------------------------------------------------
  // TEST GROUP 5: Parsing Document Numbers
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Document Number Parser');

  const parsedHQ = DocumentNumberingService.parseDocumentNumber('SO00120261000001');
  assert(
    parsedHQ !== null &&
    parsedHQ.docType === 'SO' &&
    parsedHQ.tenantCode === '001' &&
    parsedHQ.branchSuffix === '' &&
    parsedHQ.period === '202610' &&
    parsedHQ.sequence === 1,
    'Parse SO00120261000001 correctly decomposes into components',
    JSON.stringify(parsedHQ)
  );

  const parsedBranchA = DocumentNumberingService.parseDocumentNumber('CE001A20261000005');
  assert(
    parsedBranchA !== null &&
    parsedBranchA.docType === 'CE' &&
    parsedBranchA.tenantCode === '001' &&
    parsedBranchA.branchSuffix === 'A' &&
    parsedBranchA.period === '202610' &&
    parsedBranchA.sequence === 5,
    'Parse CE001A20261000005 correctly extracts branchSuffix "A" and sequence 5',
    JSON.stringify(parsedBranchA)
  );

  const parsedCSH = DocumentNumberingService.parseDocumentNumber('CSH002B20261000042');
  assert(
    parsedCSH !== null &&
    parsedCSH.docType === 'CSH' &&
    parsedCSH.tenantCode === '002' &&
    parsedCSH.branchSuffix === 'B' &&
    parsedCSH.period === '202610' &&
    parsedCSH.sequence === 42,
    'Parse CSH002B20261000042 correctly extracts tenant "002", suffix "B", seq 42',
    JSON.stringify(parsedCSH)
  );

  // ------------------------------------------------------------------
  // TEST GROUP 6: Sequential Claims on the Same Date (Anti-Duplicate Guarantee)
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 6] Sequential Claims on the Same Date');

  const claimsPoolSameDate: ExpenseClaim[] = [
    {
      id: 'claim_1',
      tenantId: 'ten_001',
      claimNumber: 'CE00120261000001',
      claimDate: '2026-10-27',
      requestByUserId: 'u1',
      requestByName: 'User 1',
      totalAmount: 150000,
      status: 'submitted',
      items: []
    }
  ];

  // Next claim on the exact same date MUST increment sequence to 00002
  const nextClaimSameDate = ExpenseClaimService.generateNextClaimNumber(
    claimsPoolSameDate,
    '2026-10-27',
    { tenantCode: '001', branchSuffix: '' }
  );
  assert(
    nextClaimSameDate === 'CE00120261000002',
    'Claim 2 on same date 2026-10-27 is numbered CE00120261000002',
    `Got: ${nextClaimSameDate}`
  );

  // Claim 3 on the same date with both 00001 and 00002 present MUST become 00003
  claimsPoolSameDate.push({
    id: 'claim_2',
    tenantId: 'ten_001',
    claimNumber: 'CE00120261000002',
    claimDate: '2026-10-27',
    requestByUserId: 'u1',
    requestByName: 'User 1',
    totalAmount: 58000,
    status: 'submitted',
    items: []
  });

  const nextClaim3SameDate = ExpenseClaimService.generateNextClaimNumber(
    claimsPoolSameDate,
    '2026-10-27',
    { tenantCode: '001', branchSuffix: '' }
  );
  assert(
    nextClaim3SameDate === 'CE00120261000003',
    'Claim 3 on same date 2026-10-27 is numbered CE00120261000003',
    `Got: ${nextClaim3SameDate}`
  );

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
