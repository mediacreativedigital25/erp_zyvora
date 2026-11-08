/**
 * Zyvora ERP 1.0.0 — Department & Position Service (Core HR)
 * Manages company organizational units, hierarchical positions, and their default Cost Center bindings.
 */

import { Department, Position } from '../types/erp';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept_exec',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-EXEC',
    name: 'Executive & Board',
    costCenterCode: 'CC-EXEC',
    isActive: true,
    description: 'Executive management, board of directors, and strategic leadership.'
  },
  {
    id: 'dept_fin',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-FIN',
    name: 'Finance & Accounting',
    costCenterCode: 'CC-FIN',
    isActive: true,
    description: 'Corporate treasury, accounting, tax compliance, and payroll disbursement.'
  },
  {
    id: 'dept_ops',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-OPS',
    name: 'Operations & Logistics',
    costCenterCode: 'CC-OPS',
    isActive: true,
    description: 'Supply chain management, fulfillment, and branch operations.'
  },
  {
    id: 'dept_it',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-IT',
    name: 'Information Technology',
    costCenterCode: 'CC-IT',
    isActive: true,
    description: 'Software development, cloud infrastructure, and technical support.'
  },
  {
    id: 'dept_mkt',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-MKT',
    name: 'Sales & Marketing',
    costCenterCode: 'CC-MKT',
    isActive: true,
    description: 'Commercial sales, client partnership, and digital marketing.'
  },
  {
    id: 'dept_hr',
    tenantId: 'ten_zyvora_corp',
    code: 'DEP-HR',
    name: 'Human Resources & GA',
    costCenterCode: 'CC-HR',
    isActive: true,
    description: 'Talent recruitment, employee relations, and office administration.'
  }
];

export const INITIAL_POSITIONS: Position[] = [
  {
    id: 'pos_coo',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_exec',
    departmentName: 'Executive & Board',
    code: 'POS-EXEC-01',
    title: 'Chief Operating Officer',
    gradeLevel: 7,
    isActive: true,
    description: 'Oversees company operational efficiency and strategic business goals.'
  },
  {
    id: 'pos_fin_mgr',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_fin',
    departmentName: 'Finance & Accounting',
    code: 'POS-FIN-01',
    title: 'Chief Financial Accountant',
    gradeLevel: 6,
    reportsToPositionId: 'pos_coo',
    reportsToTitle: 'Chief Operating Officer',
    isActive: true,
    description: 'Head of financial reporting, budgeting, and statutory compliance.'
  },
  {
    id: 'pos_fin_staff',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_fin',
    departmentName: 'Finance & Accounting',
    code: 'POS-FIN-02',
    title: 'Finance & Tax Specialist',
    gradeLevel: 4,
    reportsToPositionId: 'pos_fin_mgr',
    reportsToTitle: 'Chief Financial Accountant',
    isActive: true,
    description: 'Handles day-to-day invoice verification, cash transactions, and tax reporting.'
  },
  {
    id: 'pos_it_lead',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_it',
    departmentName: 'Information Technology',
    code: 'POS-IT-01',
    title: 'Lead System Architect',
    gradeLevel: 6,
    reportsToPositionId: 'pos_coo',
    reportsToTitle: 'Chief Operating Officer',
    isActive: true,
    description: 'Architects enterprise ERP platforms and database scalability.'
  },
  {
    id: 'pos_it_dev',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_it',
    departmentName: 'Information Technology',
    code: 'POS-IT-02',
    title: 'Fullstack Software Engineer',
    gradeLevel: 4,
    reportsToPositionId: 'pos_it_lead',
    reportsToTitle: 'Lead System Architect',
    isActive: true,
    description: 'Develops web modules, APIs, and microservices.'
  },
  {
    id: 'pos_wh_lead',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_ops',
    departmentName: 'Operations & Logistics',
    code: 'POS-OPS-01',
    title: 'Warehouse Lead Cakung',
    gradeLevel: 5,
    reportsToPositionId: 'pos_coo',
    reportsToTitle: 'Chief Operating Officer',
    isActive: true,
    description: 'Manages central warehouse inventory inbound and outbound distribution.'
  },
  {
    id: 'pos_bm_sby',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_ops',
    departmentName: 'Operations & Logistics',
    code: 'POS-OPS-02',
    title: 'Branch Manager Surabaya',
    gradeLevel: 6,
    reportsToPositionId: 'pos_coo',
    reportsToTitle: 'Chief Operating Officer',
    isActive: true,
    description: 'Leads East Java regional branch sales, fulfillment, and operations.'
  },
  {
    id: 'pos_hr_spec',
    tenantId: 'ten_zyvora_corp',
    departmentId: 'dept_hr',
    departmentName: 'Human Resources & GA',
    code: 'POS-HR-01',
    title: 'People & Talent Specialist',
    gradeLevel: 4,
    reportsToPositionId: 'pos_coo',
    reportsToTitle: 'Chief Operating Officer',
    isActive: true,
    description: 'Facilitates recruitment pipeline, employee onboarding, and attendance logs.'
  }
];

const LOCAL_STORAGE_DEP_KEY = 'ZYVORA_DEPARTMENTS_CACHE';
const LOCAL_STORAGE_POS_KEY = 'ZYVORA_POSITIONS_CACHE';

export class DepartmentPositionService {
  // ----------------------------------------------------
  // DEPARTMENTS
  // ----------------------------------------------------
  static async getDepartments(tenantId = 'ten_zyvora_corp'): Promise<Department[]> {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_DEP_KEY);
        if (cached) {
          const parsed: Department[] = JSON.parse(cached);
          return parsed.filter((d) => !tenantId || d.tenantId === tenantId);
        }
        localStorage.setItem(LOCAL_STORAGE_DEP_KEY, JSON.stringify(INITIAL_DEPARTMENTS));
      } catch {}
    }
    return INITIAL_DEPARTMENTS.filter((d) => !tenantId || d.tenantId === tenantId);
  }

  static async saveDepartment(dept: Department): Promise<Department> {
    const list = await this.getDepartments(dept.tenantId);
    let saved: Department;
    const idx = list.findIndex((d) => d.id === dept.id);

    if (idx >= 0) {
      saved = {
        ...list[idx],
        ...dept,
        updatedAt: new Date().toISOString()
      };
      list[idx] = saved;
    } else {
      saved = {
        ...dept,
        id: dept.id || `dept_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(saved);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_DEP_KEY, JSON.stringify(list));
      } catch {}
    }

    return saved;
  }

  static async deleteDepartment(id: string, tenantId = 'ten_zyvora_corp'): Promise<boolean> {
    const list = await this.getDepartments(tenantId);
    const filtered = list.filter((d) => d.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_DEP_KEY, JSON.stringify(filtered));
      } catch {}
    }
    return true;
  }

  // ----------------------------------------------------
  // POSITIONS
  // ----------------------------------------------------
  static async getPositions(tenantId = 'ten_zyvora_corp'): Promise<Position[]> {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
        if (cached) {
          const parsed: Position[] = JSON.parse(cached);
          return parsed.filter((p) => !tenantId || p.tenantId === tenantId);
        }
        localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(INITIAL_POSITIONS));
      } catch {}
    }
    return INITIAL_POSITIONS.filter((p) => !tenantId || p.tenantId === tenantId);
  }

  static async savePosition(pos: Position): Promise<Position> {
    const list = await this.getPositions(pos.tenantId);
    let saved: Position;
    const idx = list.findIndex((p) => p.id === pos.id);

    if (idx >= 0) {
      saved = {
        ...list[idx],
        ...pos,
        updatedAt: new Date().toISOString()
      };
      list[idx] = saved;
    } else {
      saved = {
        ...pos,
        id: pos.id || `pos_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(saved);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(list));
      } catch {}
    }

    return saved;
  }

  static async deletePosition(id: string, tenantId = 'ten_zyvora_corp'): Promise<boolean> {
    const list = await this.getPositions(tenantId);
    const filtered = list.filter((p) => p.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(filtered));
      } catch {}
    }
    return true;
  }
}
