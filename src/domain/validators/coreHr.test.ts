/**
 * Zyvora ERP 1.0.0 — Core HR & Cost Center Validation Test Suite
 *
 * Validates:
 * 1. Department master and mandatory Cost Center mapping (e.g. CC-FIN, CC-OPS).
 * 2. Position grade hierarchy (1 to 7) and supervisory reporting lines.
 * 3. Employee registration with mandatory Cost Center allocation and sequential NIK generation.
 * 4. Recruitment pipeline progression and one-click candidate-to-employee conversion with Cost Center integrity.
 */

import { DepartmentPositionService, INITIAL_DEPARTMENTS, INITIAL_POSITIONS } from '../../services/departmentPositionService';
import { EmployeeService, INITIAL_CORE_EMPLOYEES } from '../../services/employeeService';
import { RecruitmentService, INITIAL_JOB_OPENINGS, INITIAL_CANDIDATES } from '../../services/recruitmentService';
import { Employee, Department, Position } from '../../types/erp';

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

async function runCoreHrTestSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — CORE HR & COST CENTER TEST SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Department Master & Cost Center Invariants
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Department Master & Cost Center Bindings');

  const departments = await DepartmentPositionService.getDepartments('ten_zyvora_corp');
  assert(departments.length >= 6, 'Initial departments contain at least 6 core organizational units');

  const allDeptsHaveCostCenter = departments.every((d) => Boolean(d.costCenterCode && d.costCenterCode.startsWith('CC-')));
  assert(allDeptsHaveCostCenter, 'Every department is strictly bound to a valid Cost Center code (CC-*)');

  const finDept = departments.find((d) => d.code === 'DEP-FIN');
  assert(finDept !== undefined && finDept.costCenterCode === 'CC-FIN', 'DEP-FIN maps to CC-FIN');

  const opsDept = departments.find((d) => d.code === 'DEP-OPS');
  assert(opsDept !== undefined && opsDept.costCenterCode === 'CC-OPS', 'DEP-OPS maps to CC-OPS');

  const itDept = departments.find((d) => d.code === 'DEP-IT');
  assert(itDept !== undefined && itDept.costCenterCode === 'CC-IT', 'DEP-IT maps to CC-IT');

  // ------------------------------------------------------------------
  // TEST GROUP 2: Position Hierarchy & Grade Levels
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Position Hierarchy & Grade Levels (1 - 7)');

  const positions = await DepartmentPositionService.getPositions('ten_zyvora_corp');
  assert(positions.length >= 8, 'Initial positions list contains all functional roles');

  const validGrades = positions.every((p) => p.gradeLevel >= 1 && p.gradeLevel <= 7);
  assert(validGrades, 'All positions conform to Grade Level range 1 to 7');

  const cooPos = positions.find((p) => p.code === 'POS-EXEC-01');
  assert(cooPos !== undefined && cooPos.gradeLevel === 7, 'Chief Operating Officer is Grade 7 top executive');

  const finMgrPos = positions.find((p) => p.code === 'POS-FIN-01');
  assert(
    finMgrPos !== undefined && finMgrPos.reportsToPositionId === 'pos_coo',
    'Finance Manager reports directly to COO position'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: Employee Code Generator ([TENANT:3][BRANCH_SUFFIX][YYYYMMDD][SEQUENCE:3])
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Employee Sequential Code Generator (Daily Rollover & Branch Suffix)');

  // 1. Tenant 001 HQ on 2026-10-27
  const nextCodeEmpty = EmployeeService.generateNextEmployeeCode([], {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(nextCodeEmpty === '00120261027001', 'First HQ employee for Tenant 001 is 00120261027001', `Got: ${nextCodeEmpty}`);

  // 2. Tenant 001 Branch A on 2026-10-27
  const branchACode = EmployeeService.generateNextEmployeeCode([], {
    tenantCode: '001',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(branchACode === '001A20261027001', 'Branch A employee for Tenant 001 is 001A20261027001', `Got: ${branchACode}`);

  const mockExisting: Employee[] = [
    {
      id: 'e1',
      tenantId: 't1',
      employeeCode: '00120261027001',
      fullName: 'Emp 1',
      email: 'e1@test.com',
      phone: '123',
      department: 'Finance',
      position: 'Staff',
      branchId: 'b1',
      costCenterCode: 'CC-FIN',
      joinDate: '2026-10-27',
      status: 'active'
    },
    {
      id: 'e2',
      tenantId: 't1',
      employeeCode: '00120261027002',
      fullName: 'Emp 2',
      email: 'e2@test.com',
      phone: '123',
      department: 'Finance',
      position: 'Staff',
      branchId: 'b1',
      costCenterCode: 'CC-FIN',
      joinDate: '2026-10-27',
      status: 'active'
    },
    {
      id: 'e3',
      tenantId: 't1',
      employeeCode: '001A20261027001',
      fullName: 'Emp 3 Branch A',
      email: 'e3@test.com',
      phone: '123',
      department: 'Operations',
      position: 'Staff',
      branchId: 'b2',
      costCenterCode: 'CC-OPS',
      joinDate: '2026-10-27',
      status: 'active'
    }
  ];

  // 3. Same-day sequence increment for HQ (next after 002 is 003)
  const nextCodeSeq = EmployeeService.generateNextEmployeeCode(mockExisting, {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(nextCodeSeq === '00120261027003', 'Sequential code increments to 00120261027003', `Got: ${nextCodeSeq}`);

  // 4. Same-day sequence increment for Branch A (next after 001 is 002)
  const branchANext = EmployeeService.generateNextEmployeeCode(mockExisting, {
    tenantCode: '001',
    branchSuffix: 'A',
    targetDate: '2026-10-27'
  });
  assert(branchANext === '001A20261027002', 'Branch A sequence increments to 001A20261027002', `Got: ${branchANext}`);

  // 5. Daily Rollover Rule: Date changes to 2026-10-28 -> Sequence strictly resets to 001!
  const nextDayCode = EmployeeService.generateNextEmployeeCode(mockExisting, {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-28'
  });
  assert(nextDayCode === '00120261028001', 'Next day resets sequence to 00120261028001', `Got: ${nextDayCode}`);

  // 6. Tenant 002 starts its own sequence
  const tenant002Code = EmployeeService.generateNextEmployeeCode(mockExisting, {
    tenantCode: '002',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(tenant002Code === '00220261027001', 'Tenant 002 starts at 00220261027001', `Got: ${tenant002Code}`);

  // ------------------------------------------------------------------
  // TEST GROUP 4: Employee Cost Center Requirement, Photos & Addresses
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Employee Cost Center, Photos, & Regional Addresses');

  const employees = await EmployeeService.getEmployees('ten_zyvora_corp');
  assert(employees.length >= 5, 'Employee directory contains initial personnel');

  const allEmployeesHaveCostCenter = employees.every(
    (e) => Boolean(e.costCenterCode && e.costCenterCode.length > 0)
  );
  assert(
    allEmployeesHaveCostCenter,
    'Every employee is strictly bound to a valid Cost Center (e.g. CC-EXEC, CC-FIN, CC-OPS, CC-IT)'
  );

  const employeesWithPhotos = employees.filter((e) => Boolean(e.avatarUrl));
  assert(employeesWithPhotos.length >= 4, 'Personnel records contain avatar / profile photograph URLs');

  const employeesWithFullAddress = employees.filter(
    (e) => Boolean(e.provinceId && e.regencyId && e.districtId && e.villageId && e.address)
  );
  assert(
    employeesWithFullAddress.length >= 4,
    'Personnel records contain complete Kemendagri hierarchy addresses'
  );

  // Test save employee with auto Cost Center fallback and NIK generation
  const newStaff: Employee = {
    id: 'emp_test_save',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '',
    fullName: 'Test Employee Accountant',
    email: 'test.acc@zyvora.id',
    phone: '+62 812 0000 1111',
    department: 'Finance & Accounting',
    departmentId: 'dept_fin',
    position: 'Accountant',
    positionId: 'pos_fin_staff',
    branchId: 'br_jkt_hq',
    costCenterCode: 'CC-FIN',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active'
  };

  const savedStaff = await EmployeeService.saveEmployee(newStaff, {
    tenantCode: '001',
    branchSuffix: '',
    targetDate: '2026-10-27'
  });
  assert(
    savedStaff.employeeCode.startsWith('00120261027'),
    `Saved employee gets auto-generated employeeCode with prefix 00120261027 (got ${savedStaff.employeeCode})`
  );
  assert(savedStaff.costCenterCode === 'CC-FIN', 'Saved employee retains Cost Center CC-FIN');

  // ------------------------------------------------------------------
  // TEST GROUP 5: Recruitment Pipeline & Candidate Conversion
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Recruitment Pipeline & Conversion to Employee');

  const openings = await RecruitmentService.getJobOpenings('ten_zyvora_corp');
  assert(openings.length >= 3, 'Active vacancies list is populated');

  const candidates = await RecruitmentService.getCandidates('ten_zyvora_corp');
  assert(candidates.length >= 4, 'Recruitment pipeline contains applicants');

  const hiredCandidate = candidates.find((c) => c.stage === 'hired');
  assert(hiredCandidate !== undefined, 'Hired candidate is available for onboarding');

  if (hiredCandidate) {
    const conversionResult = await RecruitmentService.convertCandidateToEmployee(
      hiredCandidate.id,
      '001',
      'ten_zyvora_corp'
    );
    assert(conversionResult !== null, 'Candidate conversion executes successfully');
    if (conversionResult) {
      assert(
        conversionResult.employee.fullName === hiredCandidate.fullName,
        'Converted employee has correct candidate name'
      );
      assert(
        conversionResult.employee.costCenterCode === hiredCandidate.costCenterCode,
        'Converted employee inherits the job opening Cost Center'
      );
      assert(
        conversionResult.candidate.convertedEmployeeId === conversionResult.employee.id,
        'Candidate record logs converted employee ID link'
      );
    }
  }

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

runCoreHrTestSuite().catch((err) => {
  console.error('Fatal test error in Core HR suite:', err);
  process.exit(1);
});
