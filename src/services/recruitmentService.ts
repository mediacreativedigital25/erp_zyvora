/**
 * Zyvora ERP 1.0.0 — Recruitment & Talent Acquisition Service (Core HR)
 * Manages job openings, candidate pipeline stages, and conversion to registered employees.
 */

import { JobOpening, RecruitmentCandidate, RecruitmentStage, Employee } from '../types/erp';
import { EmployeeService } from './employeeService';
import { assertValidTenantId } from './supabaseSyncService';

export const INITIAL_JOB_OPENINGS: JobOpening[] = [
  {
    id: 'job_01',
    tenantId: 'ten_zyvora_corp',
    code: 'JOB-2026-001',
    title: 'Senior Fullstack Software Engineer',
    departmentId: 'dept_it',
    departmentName: 'Information Technology',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    costCenterCode: 'CC-IT',
    employmentType: 'permanent',
    openingsCount: 2,
    status: 'published',
    postedDate: '2026-10-15',
    description: 'Lead modern cloud microservices development and responsive React dashboards.'
  },
  {
    id: 'job_02',
    tenantId: 'ten_zyvora_corp',
    code: 'JOB-2026-002',
    title: 'Accounting & Tax Supervisor',
    departmentId: 'dept_fin',
    departmentName: 'Finance & Accounting',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    costCenterCode: 'CC-FIN',
    employmentType: 'permanent',
    openingsCount: 1,
    status: 'published',
    postedDate: '2026-10-20',
    description: 'Responsible for statutory tax reporting, journal audits, and cash reconciliation.'
  },
  {
    id: 'job_03',
    tenantId: 'ten_zyvora_corp',
    code: 'JOB-2026-003',
    title: 'Logistics Fleet Dispatcher',
    departmentId: 'dept_ops',
    departmentName: 'Operations & Logistics',
    branchId: 'br_sub_east',
    branchName: 'Cabang Surabaya',
    costCenterCode: 'CC-OPS',
    employmentType: 'contract',
    openingsCount: 3,
    status: 'published',
    postedDate: '2026-10-22',
    description: 'Coordinates regional dispatch, vehicle odometer tracking, and delivery vouchers.'
  }
];

export const INITIAL_CANDIDATES: RecruitmentCandidate[] = [
  {
    id: 'cand_01',
    tenantId: 'ten_zyvora_corp',
    jobOpeningId: 'job_01',
    jobTitle: 'Senior Fullstack Software Engineer',
    departmentId: 'dept_it',
    departmentName: 'Information Technology',
    branchId: 'br_jkt_hq',
    costCenterCode: 'CC-IT',
    fullName: 'Kevin Sanjaya Sukamuljo',
    email: 'kevin.tech@gmail.com',
    phone: '+62 812 7788 9900',
    stage: 'interview_user',
    appliedDate: '2026-10-18',
    notes: 'Strong experience with React, TypeScript, and PostgreSQL. Passed code assessment.',
    rating: 5
  },
  {
    id: 'cand_02',
    tenantId: 'ten_zyvora_corp',
    jobOpeningId: 'job_02',
    jobTitle: 'Accounting & Tax Supervisor',
    departmentId: 'dept_fin',
    departmentName: 'Finance & Accounting',
    branchId: 'br_jkt_hq',
    costCenterCode: 'CC-FIN',
    fullName: 'Nadya Hutagalung, S.E.',
    email: 'nadya.huta@gmail.com',
    phone: '+62 813 4455 1122',
    stage: 'offering',
    appliedDate: '2026-10-21',
    notes: 'Brevet AB certified, 6 years enterprise ERP accounting experience. Offering package sent.',
    rating: 5
  },
  {
    id: 'cand_03',
    tenantId: 'ten_zyvora_corp',
    jobOpeningId: 'job_03',
    jobTitle: 'Logistics Fleet Dispatcher',
    departmentId: 'dept_ops',
    departmentName: 'Operations & Logistics',
    branchId: 'br_sub_east',
    costCenterCode: 'CC-OPS',
    fullName: 'Fajar Alfian',
    email: 'fajar.logistics@gmail.com',
    phone: '+62 811 3322 4455',
    stage: 'screening',
    appliedDate: '2026-10-24',
    notes: 'Valid SIM B1, experienced in warehouse scheduling in East Java.',
    rating: 4
  },
  {
    id: 'cand_04',
    tenantId: 'ten_zyvora_corp',
    jobOpeningId: 'job_03',
    jobTitle: 'Logistics Fleet Dispatcher',
    departmentId: 'dept_ops',
    departmentName: 'Operations & Logistics',
    branchId: 'br_sub_east',
    costCenterCode: 'CC-OPS',
    fullName: 'Muhammad Rian Ardianto',
    email: 'rian.ardianto@gmail.com',
    phone: '+62 817 6655 4433',
    stage: 'hired',
    appliedDate: '2026-10-22',
    notes: 'Offer accepted! Ready to convert into official employee profile.',
    rating: 5
  }
];

const LOCAL_STORAGE_JOBS_KEY = 'ZYVORA_JOB_OPENINGS_CACHE';
const LOCAL_STORAGE_CAND_KEY = 'ZYVORA_CANDIDATES_CACHE';

export class RecruitmentService {
  // ----------------------------------------------------
  // JOB OPENINGS
  // ----------------------------------------------------
  static async getJobOpenings(tenantId: string): Promise<JobOpening[]> {
    const safeTenantId = assertValidTenantId(tenantId);
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_JOBS_KEY);
        if (cached) {
          const parsed: JobOpening[] = JSON.parse(cached);
          return parsed.filter((j) => j.tenantId === safeTenantId);
        }
        localStorage.setItem(LOCAL_STORAGE_JOBS_KEY, JSON.stringify(INITIAL_JOB_OPENINGS));
      } catch {}
    }
    return INITIAL_JOB_OPENINGS.filter((j) => j.tenantId === safeTenantId);
  }

  static async saveJobOpening(job: JobOpening): Promise<JobOpening> {
    const safeTenantId = assertValidTenantId(job.tenantId);
    job.tenantId = safeTenantId;
    const list = await this.getJobOpenings(safeTenantId);
    let saved: JobOpening;
    const idx = list.findIndex((j) => j.id === job.id);

    if (idx >= 0) {
      saved = { ...list[idx], ...job, tenantId: safeTenantId };
      list[idx] = saved;
    } else {
      saved = {
        ...job,
        tenantId: safeTenantId,
        id: job.id || `job_${Date.now()}`
      };
      list.unshift(saved);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_JOBS_KEY, JSON.stringify(list));
      } catch {}
    }

    return saved;
  }

  // ----------------------------------------------------
  // CANDIDATES
  // ----------------------------------------------------
  static async getCandidates(tenantId: string): Promise<RecruitmentCandidate[]> {
    const safeTenantId = assertValidTenantId(tenantId);
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CAND_KEY);
        if (cached) {
          const parsed: RecruitmentCandidate[] = JSON.parse(cached);
          return parsed.filter((c) => c.tenantId === safeTenantId);
        }
        localStorage.setItem(LOCAL_STORAGE_CAND_KEY, JSON.stringify(INITIAL_CANDIDATES));
      } catch {}
    }
    return INITIAL_CANDIDATES.filter((c) => c.tenantId === safeTenantId);
  }

  static async saveCandidate(cand: RecruitmentCandidate): Promise<RecruitmentCandidate> {
    const safeTenantId = assertValidTenantId(cand.tenantId);
    cand.tenantId = safeTenantId;
    const list = await this.getCandidates(safeTenantId);
    let saved: RecruitmentCandidate;
    const idx = list.findIndex((c) => c.id === cand.id);

    if (idx >= 0) {
      saved = { ...list[idx], ...cand, tenantId: safeTenantId };
      list[idx] = saved;
    } else {
      saved = {
        ...cand,
        tenantId: safeTenantId,
        id: cand.id || `cand_${Date.now()}`
      };
      list.unshift(saved);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CAND_KEY, JSON.stringify(list));
      } catch {}
    }

    return saved;
  }

  static async updateCandidateStage(
    candidateId: string,
    stage: RecruitmentStage,
    tenantId: string
  ): Promise<RecruitmentCandidate | null> {
    const safeTenantId = assertValidTenantId(tenantId);
    const list = await this.getCandidates(safeTenantId);
    const candidate = list.find((c) => c.id === candidateId);
    if (!candidate) return null;

    candidate.stage = stage;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CAND_KEY, JSON.stringify(list));
      } catch {}
    }
    return candidate;
  }

  static async convertCandidateToEmployee(
    candidateId: string,
    tenantCode = '001',
    tenantId: string
  ): Promise<{ employee: Employee; candidate: RecruitmentCandidate } | null> {
    const safeTenantId = assertValidTenantId(tenantId);
    const list = await this.getCandidates(safeTenantId);
    const candidate = list.find((c) => c.id === candidateId);
    if (!candidate) return null;

    // Create official employee with candidate's details and required Cost Center
    const newEmployeePayload: Employee = {
      id: `emp_${Date.now()}`,
      tenantId: safeTenantId,
      employeeCode: '', // Auto-generated
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      department: candidate.departmentName,
      departmentId: candidate.departmentId,
      position: candidate.jobTitle,
      branchId: candidate.branchId,
      costCenterCode: candidate.costCenterCode || 'CC-GEN',
      costCenterName: candidate.departmentName,
      employmentType: 'probation',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    const savedEmployee = await EmployeeService.saveEmployee(newEmployeePayload, tenantCode);

    // Update candidate status
    candidate.stage = 'hired';
    candidate.convertedEmployeeId = savedEmployee.id;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CAND_KEY, JSON.stringify(list));
      } catch {}
    }

    return { employee: savedEmployee, candidate };
  }
}
