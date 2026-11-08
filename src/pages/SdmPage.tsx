/**
 * Zyvora ERP 1.0.0 — Human Resources (HR / SDM) Module Host Page
 * Routes active HR sub-features: Employee List, Position & Department, Org Structure, and Recruitment.
 * All copywriting and breadcrumbs in standard English.
 */

import React from 'react';
import {
  Users,
  Building2,
  Award,
  Network,
  Briefcase,
  CalendarCheck,
  Banknote,
  FileText
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';

// Core HR Views (Pillar 1)
import { EmployeeListView } from '../components/hr/EmployeeListView';
import { PositionDepartmentView } from '../components/hr/PositionDepartmentView';
import { OrganizationStructureView } from '../components/hr/OrganizationStructureView';
import { RecruitmentPipelineView } from '../components/hr/RecruitmentPipelineView';

export const SdmPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  // 1. Position & Department
  if (
    activeFeatureId === 'hr_position_dept' ||
    activeFeatureId === 'departments' ||
    activeFeatureId === 'positions'
  ) {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Position & Department' }]}>
        <PositionDepartmentView />
      </PageShell>
    );
  }

  // 2. Organization Structure
  if (activeFeatureId === 'hr_org_structure' || activeFeatureId === 'org_structure') {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Organization Structure' }]}>
        <OrganizationStructureView />
      </PageShell>
    );
  }

  // 3. Employee Recruitment
  if (activeFeatureId === 'hr_recruitment' || activeFeatureId === 'recruitment') {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Employee Recruitment' }]}>
        <RecruitmentPipelineView />
      </PageShell>
    );
  }

  // 4. Time & Attendance (Phase 2 Preview)
  if (
    activeFeatureId === 'hr_attendance' ||
    activeFeatureId === 'hr_work_schedule' ||
    activeFeatureId === 'hr_leave_permission' ||
    activeFeatureId === 'hr_overtime' ||
    activeFeatureId === 'attendance'
  ) {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Time & Attendance' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<CalendarCheck className="w-5 h-5 text-[#086288]" />}
            title="Time & Attendance Ready"
            description="Attendance logs, work shift schedules, leave requests, and overtime vouchers are scheduled for Phase 2."
          />
        </div>
      </PageShell>
    );
  }

  // 5. Compensation & Payroll (Phase 3 Preview)
  if (
    activeFeatureId === 'hr_payroll' ||
    activeFeatureId === 'hr_payslip' ||
    activeFeatureId === 'hr_benefits' ||
    activeFeatureId === 'hr_performance_kpi' ||
    activeFeatureId === 'hr_training_dev' ||
    activeFeatureId === 'payroll'
  ) {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Compensation & Payroll' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Banknote className="w-5 h-5 text-[#086288]" />}
            title="Payroll Processing Ready"
            description="Monthly payroll calculations, electronic payslips, statutory BPJS & TER PPh 21 deductions are scheduled for Phase 3."
          />
        </div>
      </PageShell>
    );
  }

  // 6. Administration & Reports
  if (activeFeatureId === 'hr_employee_docs' || activeFeatureId === 'hr_reports') {
    return (
      <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'HR Administration' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<FileText className="w-5 h-5 text-[#086288]" />}
            title="HR Document Archive"
            description="Digital contracts, employee e-filing, and executive HR demographic reporting are scheduled for Phase 4."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Employee List (Data Karyawan)
  return (
    <PageShell breadcrumbs={[{ label: 'Human Resources' }, { label: 'Employee List' }]}>
      <EmployeeListView />
    </PageShell>
  );
};
