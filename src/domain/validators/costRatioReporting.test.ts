/**
 * Zyvora ERP 1.0.0 — Cost Ratio Reporting Test Suite
 * Validates:
 * 1. Health status thresholds (healthy <= 60%, moderate 60-80%, warning > 80%, deficit)
 * 2. Revenue and direct cost compilation across client lines (Hizaki, Ki Mi Ko, Aurum)
 * 3. Zero-leakage holding cost share distribution (CC-SHARED-HOLDING)
 * 4. Exact mathematical formula: Cost Ratio = (Total Cost / Revenue) * 100%
 * 5. Net operating margin precision (Revenue - Total Cost)
 */

import { ReportingService } from '../../services/reportingService';
import { CostAllocationService } from '../../services/costAllocationService';

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

async function runCostRatioReportingSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — COST RATIO REPORTING TEST SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Health Status Thresholds
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Health Status Threshold Evaluator');

  assert(
    ReportingService.determineHealthStatus(100000000, 50000000) === 'healthy',
    'Threshold 1: 50% cost ratio is Healthy (<= 60%)'
  );
  assert(
    ReportingService.determineHealthStatus(100000000, 60000000) === 'healthy',
    'Threshold 2: Exactly 60% cost ratio is Healthy'
  );
  assert(
    ReportingService.determineHealthStatus(100000000, 70000000) === 'moderate',
    'Threshold 3: 70% cost ratio is Moderate (61% - 80%)'
  );
  assert(
    ReportingService.determineHealthStatus(100000000, 80000000) === 'moderate',
    'Threshold 4: Exactly 80% cost ratio is Moderate'
  );
  assert(
    ReportingService.determineHealthStatus(100000000, 85000000) === 'warning',
    'Threshold 5: 85% cost ratio is Warning (> 80%)'
  );
  assert(
    ReportingService.determineHealthStatus(100000000, 110000000) === 'deficit',
    'Threshold 6: Cost exceeding revenue (> 100%) is Deficit'
  );
  assert(
    ReportingService.determineHealthStatus(0, 15000000) === 'deficit',
    'Threshold 7: Zero revenue with costs is Deficit'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: Full Report Generation & Business Line Aggregation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Cost Ratio Report Generation & Multi-Brand Lines');

  const report = await ReportingService.getCostRatioReport('ten_zyvora_corp', {
    period: 'this_month'
  });

  assert(Boolean(report), 'Report 1: Report generated successfully');
  assert(report.lines.length >= 4, 'Report 2: Contains at least 4 business lines (Hizaki, Ki Mi Ko, Aurum, Holding)');

  const hizaki = report.lines.find((l) => l.businessLineCode === 'HIZAKI');
  assert(Boolean(hizaki), 'Report 3: Hizaki Wedding Planner is present in report');
  assert(hizaki?.costCenterCode === 'CC-LOB-HIZAKI', 'Report 4: Hizaki has costCenterCode CC-LOB-HIZAKI');
  assert((hizaki?.revenue || 0) > 0, 'Report 5: Hizaki has commercial revenue (> Rp 0)');

  const kimiko = report.lines.find((l) => l.businessLineCode === 'KIMIKO');
  assert(Boolean(kimiko), 'Report 6: Ki Mi Ko Pager Ayu is present in report');
  assert(kimiko?.costCenterCode === 'CC-LOB-KIMIKO', 'Report 7: Ki Mi Ko has costCenterCode CC-LOB-KIMIKO');

  const aurum = report.lines.find((l) => l.businessLineCode === 'AURUM');
  assert(Boolean(aurum), 'Report 8: Aurum Deco is present in report');
  assert(aurum?.costCenterCode === 'CC-LOB-AURUM', 'Report 9: Aurum Deco has costCenterCode CC-LOB-AURUM');

  const holding = report.lines.find((l) => l.businessLineCode === 'HOLDING');
  assert(Boolean(holding), 'Report 10: Holding / Shared Services is present as cost center');
  assert(holding?.costCenterCode === 'CC-SHARED-HOLDING', 'Report 11: Holding has costCenterCode CC-SHARED-HOLDING');

  // ------------------------------------------------------------------
  // TEST GROUP 3: Mathematical Formula & Cost Ratio Integrity
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Mathematical Formula & Cost Ratio Accuracy');

  for (const line of [hizaki, kimiko, aurum]) {
    if (!line) continue;
    const expectedTotal = line.directCost + line.sharedHoldingCost;
    assert(
      line.totalCost === expectedTotal,
      `Formula 1 (${line.businessLineCode}): totalCost matches directCost + sharedHoldingCost (${line.totalCost})`
    );

    const calculatedRatio = Number(((line.totalCost / line.revenue) * 100).toFixed(1));
    assert(
      line.costRatioPercent === calculatedRatio,
      `Formula 2 (${line.businessLineCode}): costRatioPercent strictly conforms to formula (got ${line.costRatioPercent}%)`
    );

    const expectedMargin = line.revenue - line.totalCost;
    assert(
      line.netOperatingMargin === expectedMargin,
      `Formula 3 (${line.businessLineCode}): netOperatingMargin strictly equals revenue - totalCost (${line.netOperatingMargin})`
    );
  }

  // ------------------------------------------------------------------
  // TEST GROUP 4: Zero Penny Leakage in Holding Distribution Flow
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Zero-Leakage Holding Distribution Flow');

  const holdingPool = report.holdingDistribution.totalHoldingPool;
  const sumOfDistributed = report.holdingDistribution.distributions.reduce(
    (sum, d) => sum + d.amount,
    0
  );

  assert(holdingPool > 0, 'Holding 1: Holding pool contains allocated administrative costs');
  assert(
    sumOfDistributed === holdingPool,
    `Holding 2: Zero Penny Leakage — sum of distributed shares (${sumOfDistributed}) exactly equals holding pool (${holdingPool})`
  );
  assert(
    report.holdingDistribution.distributions.length === 3,
    'Holding 3: Distributed to exactly 3 active commercial lines (Hizaki, Ki Mi Ko, Aurum)'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 5: Cost Breakdown Donut Data Integrity
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Cost Breakdown Composition');

  assert(report.costBreakdown.length >= 4, 'Breakdown 1: Donut breakdown contains all operational categories');
  const sumOfBreakdownAmounts = report.costBreakdown.reduce((sum, c) => sum + c.amount, 0);
  assert(
    sumOfBreakdownAmounts > 0,
    `Breakdown 2: Cumulative breakdown amount is positive (${sumOfBreakdownAmounts})`
  );

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed (100%).`);
  console.log('======================================================\n');
}

runCostRatioReportingSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
