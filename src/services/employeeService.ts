/**
 * Zyvora ERP 1.0.0 — Employee Service (Core HR)
 * Handles comprehensive employee profiles, branch assignments, mandatory Cost Center mappings,
 * and daily-reset sequential NIK generator: [TENANT:3][BRANCH_SUFFIX][YYYYMMDD][SEQUENCE:3]
 */

import { Employee } from '../types/erp';
import { isSupabaseConfigured, getSupabaseClient } from './supabaseClient';

export const INITIAL_CORE_EMPLOYEES: Employee[] = [
  {
    id: 'emp_01',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '00120261027001',
    fullName: 'Iklas Padli',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: 'iklaspadli85@gmail.com',
    phone: '+62 811 9922 881',
    department: 'Executive & Board',
    departmentId: 'dept_exec',
    position: 'Chief Operating Officer',
    positionId: 'pos_coo',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    businessLineId: 'lob_ten_zyvora_corp_holding',
    businessLineName: 'Holding / Shared Services',
    costCenterCode: 'CC-SHARED-HOLDING',
    costCenterName: 'Holding / Shared Services',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'super_admin',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '8001239981',
    bankAccountHolder: 'Iklas Padli',
    npwp: '09.876.543.2-012.000',
    ptkpStatus: 'K/1',
    bpjsKetenagakerjaan: '19028837192',
    bpjsKesehatan: '000192837419',
    emergencyContactName: 'Aisyah Padli',
    emergencyContactPhone: '+62 812 3344 5566',
    emergencyContactRelation: 'Spouse',
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '31.74',
    regencyName: 'Kota Jakarta Selatan',
    districtId: '31.74.04',
    districtName: 'Kebayoran Baru',
    villageId: '31.74.04.1001',
    villageName: 'Selong',
    postalCode: '12110',
    rt: '002',
    rw: '005',
    address: 'Jl. Sudirman No. 45'
  },
  {
    id: 'emp_02',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '00120261027002',
    fullName: 'Sri Wahyuni, S.E., Ak.',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    email: 'sri.wahyuni@zyvora.id',
    phone: '+62 812 8844 112',
    department: 'Finance & Accounting',
    departmentId: 'dept_fin',
    position: 'Chief Financial Accountant',
    positionId: 'pos_fin_mgr',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    businessLineId: 'lob_ten_zyvora_corp_holding',
    businessLineName: 'Holding / Shared Services',
    costCenterCode: 'CC-SHARED-HOLDING',
    costCenterName: 'Holding / Shared Services',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'admin',
    supervisorId: 'emp_01',
    supervisorName: 'Iklas Padli',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1270009871234',
    bankAccountHolder: 'Sri Wahyuni',
    npwp: '12.345.678.9-021.000',
    ptkpStatus: 'K/2',
    bpjsKetenagakerjaan: '19028837193',
    bpjsKesehatan: '000192837420',
    emergencyContactName: 'Rudi Hartono',
    emergencyContactPhone: '+62 813 4455 6677',
    emergencyContactRelation: 'Spouse',
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '31.74',
    regencyName: 'Kota Jakarta Selatan',
    districtId: '31.74.05',
    districtName: 'Mampang Prapatan',
    villageId: '31.74.05.1002',
    villageName: 'Kuningan Barat',
    postalCode: '12710',
    rt: '001',
    rw: '003',
    address: 'Jl. Gatot Subroto Kav. 12'
  },
  {
    id: 'emp_03',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '00120261027003',
    fullName: 'Bambang Pamungkas',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'bambang.log@zyvora.id',
    phone: '+62 813 7721 349',
    department: 'Operations & Logistics',
    departmentId: 'dept_ops',
    position: 'Warehouse Lead Cakung',
    positionId: 'pos_wh_lead',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    businessLineId: 'lob_ten_zyvora_corp_hizaki',
    businessLineName: 'Hizaki Wedding Planner',
    costCenterCode: 'CC-LOB-HIZAKI',
    costCenterName: 'Hizaki Wedding Planner',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'admin',
    supervisorId: 'emp_01',
    supervisorName: 'Iklas Padli',
    bankName: 'Bank BRI',
    bankAccountNumber: '020601009876501',
    bankAccountHolder: 'Bambang Pamungkas',
    npwp: '23.456.789.0-031.000',
    ptkpStatus: 'K/1',
    bpjsKetenagakerjaan: '19028837194',
    bpjsKesehatan: '000192837421',
    emergencyContactName: 'Siti Rahma',
    emergencyContactPhone: '+62 814 5566 7788',
    emergencyContactRelation: 'Spouse',
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '31.75',
    regencyName: 'Kota Jakarta Timur',
    districtId: '31.75.06',
    districtName: 'Cakung',
    villageId: '31.75.06.1001',
    villageName: 'Cakung Barat',
    postalCode: '13910',
    rt: '005',
    rw: '008',
    address: 'Jl. Raya Cakung Cilincing No. 88'
  },
  {
    id: 'emp_04',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '001A20261027001',
    fullName: 'Arya Pratama',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: 'arya.sub@zyvora.id',
    phone: '+62 818 6629 110',
    department: 'Operations & Logistics',
    departmentId: 'dept_ops',
    position: 'Branch Manager Surabaya',
    positionId: 'pos_bm_sby',
    branchId: 'br_sub_east',
    branchName: 'Cabang Surabaya',
    businessLineId: 'lob_ten_zyvora_corp_aurum',
    businessLineName: 'Aurum Deco',
    costCenterCode: 'CC-LOB-AURUM',
    costCenterName: 'Aurum Deco',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'admin',
    supervisorId: 'emp_01',
    supervisorName: 'Iklas Padli',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '0189283741',
    bankAccountHolder: 'Arya Pratama',
    npwp: '34.567.890.1-041.000',
    ptkpStatus: 'TK/0',
    bpjsKetenagakerjaan: '19028837195',
    bpjsKesehatan: '000192837422',
    emergencyContactName: 'Hendro Pratama',
    emergencyContactPhone: '+62 819 1122 3344',
    emergencyContactRelation: 'Parent',
    country: 'Indonesia',
    provinceId: '35',
    provinceName: 'Jawa Timur',
    regencyId: '35.78',
    regencyName: 'Kota Surabaya',
    districtId: '35.78.07',
    districtName: 'Tegalsari',
    villageId: '35.78.07.1002',
    villageName: 'Kedungdoro',
    postalCode: '60261',
    rt: '003',
    rw: '001',
    address: 'Jl. Basuki Rahmat No. 102'
  },
  {
    id: 'emp_05',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '00120261027004',
    fullName: 'Dimas Wicaksono',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    email: 'dimas.it@zyvora.id',
    phone: '+62 812 9900 1122',
    department: 'Information Technology',
    departmentId: 'dept_it',
    position: 'Fullstack Software Engineer',
    positionId: 'pos_it_dev',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    businessLineId: 'lob_ten_zyvora_corp_holding',
    businessLineName: 'Holding / Shared Services',
    costCenterCode: 'CC-SHARED-HOLDING',
    costCenterName: 'Holding / Shared Services',
    employmentType: 'contract',
    contractEndDate: '2027-04-30',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'admin',
    supervisorId: 'emp_01',
    supervisorName: 'Iklas Padli',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1330018829910',
    bankAccountHolder: 'Dimas Wicaksono',
    npwp: '45.678.901.2-051.000',
    ptkpStatus: 'TK/0',
    bpjsKetenagakerjaan: '19028837196',
    bpjsKesehatan: '000192837423',
    emergencyContactName: 'Wicaksono Senior',
    emergencyContactPhone: '+62 815 6677 8899',
    emergencyContactRelation: 'Parent',
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '31.74',
    regencyName: 'Kota Jakarta Selatan',
    districtId: '31.74.02',
    districtName: 'Tebet',
    villageId: '31.74.02.1001',
    villageName: 'Tebet Timur',
    postalCode: '12820',
    rt: '004',
    rw: '002',
    address: 'Jl. Tebet Timur Dalam No. 19'
  },
  {
    id: 'emp_06',
    tenantId: 'ten_zyvora_corp',
    employeeCode: '00120261027005',
    fullName: 'Anisa Rahmawati',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    email: 'anisa.kimiko@zyvora.id',
    phone: '+62 812 3344 7788',
    department: 'Creative & Event Planner',
    departmentId: 'dept_event',
    position: 'Lead Usher & Receptionist',
    positionId: 'pos_usher_lead',
    branchId: 'br_jkt_hq',
    branchName: 'Kantor Pusat Jakarta',
    businessLineId: 'lob_ten_zyvora_corp_kimiko',
    businessLineName: 'Ki Mi Ko Pager Ayu',
    costCenterCode: 'CC-LOB-KIMIKO',
    costCenterName: 'Ki Mi Ko Pager Ayu',
    employmentType: 'permanent',
    joinDate: '2026-10-27',
    status: 'active',
    isSalesPic: true,
    hasSystemAccount: true,
    systemRole: 'admin',
    supervisorId: 'emp_01',
    supervisorName: 'Iklas Padli',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '0281928371',
    bankAccountHolder: 'Anisa Rahmawati',
    npwp: '56.789.012.3-061.000',
    ptkpStatus: 'TK/0',
    bpjsKetenagakerjaan: '19028837197',
    bpjsKesehatan: '000192837424',
    emergencyContactName: 'Ferry Rahmawati',
    emergencyContactPhone: '+62 811 2233 4455',
    emergencyContactRelation: 'Sibling',
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '31.74',
    regencyName: 'Kota Jakarta Selatan',
    districtId: '31.74.01',
    districtName: 'Setiabudi',
    villageId: '31.74.01.1001',
    villageName: 'Karet',
    postalCode: '12920',
    rt: '003',
    rw: '004',
    address: 'Jl. Karet Pedurenan No. 15'
  }
];

const LOCAL_STORAGE_KEY = 'ZYVORA_CORE_EMPLOYEES_CACHE';

export class EmployeeService {
  /**
   * Generates next sequential employee code (NIK)
   * Pattern: [TENANT:3][BRANCH_SUFFIX][YYYYMMDD][SEQUENCE:3]
   * Examples:
   * - Tenant 001 HQ:       00120261027001, 00120261027002
   * - Tenant 001 Branch A: 001A20261027001, 001A20261027002
   * - Daily Reset: Automatically resets sequence to 001 every new day (YYYYMMDD).
   */
  static generateNextEmployeeCode(
    existing: Employee[] = [],
    optionsOrTenantCode?: string | {
      tenantCode?: string;
      branchSuffix?: string;
      targetDate?: string;
    }
  ): string {
    const opts = typeof optionsOrTenantCode === 'string'
      ? { tenantCode: optionsOrTenantCode }
      : optionsOrTenantCode;

    const tenantCode = (opts?.tenantCode || '001').padStart(3, '0').slice(-3);
    const branchSuffix = (opts?.branchSuffix || '').trim().toUpperCase();
    const rawDate = opts?.targetDate || new Date().toISOString().split('T')[0];
    const dateFormatted = rawDate.replace(/-/g, '').slice(0, 8); // YYYYMMDD e.g. 20261027

    const prefix = `${tenantCode}${branchSuffix}${dateFormatted}`;

    const matching = (existing || []).filter(
      (e) => e.employeeCode && e.employeeCode.startsWith(prefix)
    );

    let maxSeq = 0;
    for (const emp of matching) {
      const seqStr = emp.employeeCode.slice(prefix.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  /**
   * Helper: Maps a Supabase row (snake_case) to an Employee object (camelCase)
   */
  private static rowToEmployee(row: any): Employee {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      avatarUrl: row.avatar_url || undefined,
      email: row.email || '',
      phone: row.phone || '',
      department: row.department || '',
      departmentId: row.department_id || undefined,
      position: row.position || '',
      positionId: row.position_id || undefined,
      branchId: row.branch_id || 'br_jkt_hq',
      branchName: row.branch_name || undefined,
      businessLineId: row.business_line_id || undefined,
      businessLineName: row.business_line_name || undefined,
      costCenterCode: row.cost_center_code || 'CC-SHARED-HOLDING',
      costCenterName: row.cost_center_name || undefined,
      employmentType: row.employment_type || 'permanent',
      contractEndDate: row.contract_end_date || undefined,
      joinDate: row.join_date || new Date().toISOString().split('T')[0],
      status: row.status || 'active',
      supervisorId: row.supervisor_id || undefined,
      supervisorName: row.supervisor_name || undefined,
      bankName: row.bank_name || undefined,
      bankAccountNumber: row.bank_account_number || undefined,
      bankAccountHolder: row.bank_account_holder || undefined,
      npwp: row.npwp || undefined,
      ptkpStatus: row.ptkp_status || undefined,
      bpjsKetenagakerjaan: row.bpjs_ketenagakerjaan || undefined,
      bpjsKesehatan: row.bpjs_kesehatan || undefined,
      emergencyContactName: row.emergency_contact_name || undefined,
      emergencyContactPhone: row.emergency_contact_phone || undefined,
      emergencyContactRelation: row.emergency_contact_relation || undefined,
      country: row.country || 'Indonesia',
      provinceId: row.province_id || undefined,
      provinceName: row.province_name || undefined,
      regencyId: row.regency_id || undefined,
      regencyName: row.regency_name || undefined,
      districtId: row.district_id || undefined,
      districtName: row.district_name || undefined,
      villageId: row.village_id || undefined,
      villageName: row.village_name || undefined,
      postalCode: row.postal_code || undefined,
      rt: row.rt || undefined,
      rw: row.rw || undefined,
      address: row.address || undefined,
      isSalesPic: row.is_sales_pic ?? (
        row.position?.toLowerCase().includes('sales') ||
        row.position?.toLowerCase().includes('director') ||
        row.position?.toLowerCase().includes('manager') ||
        row.position?.toLowerCase().includes('officer') ||
        row.position?.toLowerCase().includes('chief') ||
        row.position?.toLowerCase().includes('owner') ||
        row.department?.toLowerCase().includes('sales') ||
        row.department?.toLowerCase().includes('event') ||
        row.department?.toLowerCase().includes('executive')
      ),
      hasSystemAccount: row.has_system_account ?? false,
      systemRole: row.system_role || undefined,
      userId: row.user_id || undefined
    };
  }

  /**
   * Helper: Maps an Employee object (camelCase) to a Supabase row (snake_case)
   */
  private static employeeToRow(emp: Employee): Record<string, any> {
    return {
      id: emp.id,
      tenant_id: emp.tenantId || 'ten_zyvora_corp',
      employee_code: emp.employeeCode,
      full_name: emp.fullName,
      avatar_url: emp.avatarUrl || null,
      email: emp.email || null,
      phone: emp.phone || null,
      department: emp.department || null,
      department_id: emp.departmentId || null,
      position: emp.position || null,
      position_id: emp.positionId || null,
      branch_id: emp.branchId || null,
      branch_name: emp.branchName || null,
      business_line_id: emp.businessLineId || null,
      business_line_name: emp.businessLineName || null,
      cost_center_code: emp.costCenterCode || null,
      cost_center_name: emp.costCenterName || null,
      employment_type: emp.employmentType || 'permanent',
      contract_end_date: emp.contractEndDate || null,
      join_date: emp.joinDate || null,
      status: emp.status || 'active',
      is_sales_pic: emp.isSalesPic ?? null,
      has_system_account: emp.hasSystemAccount ?? null,
      system_role: emp.systemRole ?? null,
      user_id: emp.userId ?? null,
      supervisor_id: emp.supervisorId || null,
      supervisor_name: emp.supervisorName || null,
      bank_name: emp.bankName || null,
      bank_account_number: emp.bankAccountNumber || null,
      bank_account_holder: emp.bankAccountHolder || null,
      npwp: emp.npwp || null,
      ptkp_status: emp.ptkpStatus || null,
      bpjs_ketenagakerjaan: emp.bpjsKetenagakerjaan || null,
      bpjs_kesehatan: emp.bpjsKesehatan || null,
      emergency_contact_name: emp.emergencyContactName || null,
      emergency_contact_phone: emp.emergencyContactPhone || null,
      emergency_contact_relation: emp.emergencyContactRelation || null,
      country: emp.country || 'Indonesia',
      province_id: emp.provinceId || null,
      province_name: emp.provinceName || null,
      regency_id: emp.regencyId || null,
      regency_name: emp.regencyName || null,
      district_id: emp.districtId || null,
      district_name: emp.districtName || null,
      village_id: emp.villageId || null,
      village_name: emp.villageName || null,
      postal_code: emp.postalCode || null,
      rt: emp.rt || null,
      rw: emp.rw || null,
      address: emp.address || null,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Reads all employees for a specific tenant (Supabase Cloud with local fallback)
   */
  static async getEmployees(tenantId = 'ten_zyvora_corp'): Promise<Employee[]> {
    // 1. Try fetching live from Supabase Cloud
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('employees')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(this.rowToEmployee);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[EmployeeService] Cloud fetch notice:', err);
      }
    }

    // 2. Resilient Fallback to LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed: Employee[] = JSON.parse(cached);
          const enhanced = parsed.map((e) => {
            if (!e.businessLineId) {
              const init = INITIAL_CORE_EMPLOYEES.find((item) => item.id === e.id);
              if (init) {
                return {
                  ...e,
                  businessLineId: init.businessLineId,
                  businessLineName: init.businessLineName,
                  costCenterCode: e.costCenterCode || init.costCenterCode
                };
              }
              return {
                ...e,
                businessLineId: `lob_${e.tenantId || tenantId}_holding`,
                businessLineName: 'Holding / Shared Services',
                costCenterCode: e.costCenterCode || 'CC-SHARED-HOLDING'
              };
            }
            return e;
          });
          return enhanced.filter((e) => !tenantId || e.tenantId === tenantId);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CORE_EMPLOYEES));
      } catch {}
    }
    return INITIAL_CORE_EMPLOYEES.filter((e) => !tenantId || e.tenantId === tenantId);
  }

  /**
   * Reads single employee by ID
   */
  static async getEmployeeById(id: string, tenantId = 'ten_zyvora_corp'): Promise<Employee | null> {
    const list = await this.getEmployees(tenantId);
    return list.find((e) => e.id === id) || null;
  }

  /**
   * Saves or updates an employee (persists to Supabase Cloud and syncs to local cache)
   */
  static async saveEmployee(
    emp: Employee,
    optionsOrTenantCode?: string | { tenantCode?: string; branchSuffix?: string; targetDate?: string }
  ): Promise<Employee> {
    const list = await this.getEmployees(emp.tenantId);
    let finalEmp: Employee;
    const idx = list.findIndex((e) => e.id === emp.id);

    // Auto-generate code if missing
    if (!emp.employeeCode) {
      emp.employeeCode = this.generateNextEmployeeCode(list, optionsOrTenantCode || {
        tenantCode: '001',
        targetDate: emp.joinDate
      });
    }

    // Default business line to Holding if empty
    if (!emp.businessLineId) {
      emp.businessLineId = `lob_${emp.tenantId || 'ten_zyvora_corp'}_holding`;
      emp.businessLineName = emp.businessLineName || 'Holding / Shared Services';
    }

    // Default cost center to CC-SHARED-HOLDING if empty
    if (!emp.costCenterCode) {
      emp.costCenterCode = 'CC-SHARED-HOLDING';
    }

    if (idx >= 0) {
      finalEmp = {
        ...list[idx],
        ...emp,
        updatedAt: new Date().toISOString()
      };
      list[idx] = finalEmp;
    } else {
      finalEmp = {
        ...emp,
        id: emp.id || `emp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(finalEmp);
    }

    // Persist to Supabase Cloud
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const row = this.employeeToRow(finalEmp);
        const { error } = await client.from('employees').upsert(row);
        if (error) {
          console.warn('[EmployeeService] Cloud upsert notice:', error.message);
        }
      } catch (err) {
        console.warn('[EmployeeService] Cloud sync error:', err);
      }
    }

    // Persist to local cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    return finalEmp;
  }

  /**
   * Deletes an employee (removes from Supabase Cloud and local cache)
   */
  static async deleteEmployee(id: string, tenantId = 'ten_zyvora_corp'): Promise<boolean> {
    const list = await this.getEmployees(tenantId);
    const filtered = list.filter((e) => e.id !== id);

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { error } = await client.from('employees').delete().eq('id', id).eq('tenant_id', tenantId);
        if (error) {
          console.warn('[EmployeeService] Cloud delete notice:', error.message);
        }
      } catch (err) {
        console.warn('[EmployeeService] Cloud delete error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }
    return true;
  }
}
