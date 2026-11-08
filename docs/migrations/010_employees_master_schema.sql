-- ==============================================================================
-- Zyvora ERP 1.0.0 — Migration 010: Core HR Employees Master Schema
-- Table: public.employees
-- Description: Comprehensive HR master records with Cost Center & Business Line mapping
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    department_id TEXT,
    position TEXT,
    position_id TEXT,
    branch_id TEXT,
    branch_name TEXT,
    cost_center_code TEXT,
    cost_center_name TEXT,
    join_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'leave', 'terminated')),
    employment_type TEXT DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'freelance', 'internship')),
    contract_end_date DATE,
    supervisor_id TEXT,
    supervisor_name TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_holder TEXT,
    npwp TEXT,
    ptkp_status TEXT,
    bpjs_ketenagakerjaan TEXT,
    bpjs_kesehatan TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    business_line_id TEXT,
    business_line_name TEXT,
    address TEXT,
    country TEXT DEFAULT 'Indonesia',
    province_id TEXT,
    province_name TEXT,
    regency_id TEXT,
    regency_name TEXT,
    district_id TEXT,
    district_name TEXT,
    village_id TEXT,
    village_name TEXT,
    postal_code TEXT,
    rt TEXT,
    rw TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for multi-tenant and fast lookup
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(tenant_id, employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_line_id ON public.employees(tenant_id, business_line_id);
CREATE INDEX IF NOT EXISTS idx_employees_cost_center ON public.employees(tenant_id, cost_center_code);

-- Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Permissive tenant policy
DROP POLICY IF EXISTS p_employees_tenant ON public.employees;
CREATE POLICY p_employees_tenant ON public.employees
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seed initial 6 employees for ten_zyvora_corp
INSERT INTO public.employees (
    id, tenant_id, employee_code, full_name, avatar_url, email, phone,
    department, department_id, position, position_id,
    branch_id, branch_name, business_line_id, business_line_name,
    cost_center_code, cost_center_name, employment_type, join_date, status,
    bank_name, bank_account_number, bank_account_holder, npwp, ptkp_status,
    bpjs_ketenagakerjaan, bpjs_kesehatan,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    country, province_id, province_name, regency_id, regency_name,
    district_id, district_name, village_id, village_name, postal_code, rt, rw, address
) VALUES 
(
    'emp_01', 'ten_zyvora_corp', '00120261027001', 'Iklas Padli',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'iklaspadli85@gmail.com', '+62 811 9922 881',
    'Executive & Board', 'dept_exec', 'Chief Operating Officer', 'pos_coo',
    'br_jkt_hq', 'Kantor Pusat Jakarta', 'lob_ten_zyvora_corp_holding', 'Holding / Shared Services',
    'CC-SHARED-HOLDING', 'Holding / Shared Services', 'permanent', '2026-10-27', 'active',
    'BCA (Bank Central Asia)', '8001239981', 'Iklas Padli', '09.876.543.2-012.000', 'K/1',
    '19028837192', '000192837419', 'Aisyah Padli', '+62 812 3344 5566', 'Spouse',
    'Indonesia', '31', 'DKI Jakarta', '31.74', 'Kota Jakarta Selatan',
    '31.74.04', 'Kebayoran Baru', '31.74.04.1001', 'Selong', '12110', '002', '005', 'Jl. Sudirman No. 45'
),
(
    'emp_02', 'ten_zyvora_corp', '00120261027002', 'Sri Wahyuni, S.E., Ak.',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'sri.wahyuni@zyvora.id', '+62 812 8844 112',
    'Finance & Accounting', 'dept_fin', 'Chief Financial Accountant', 'pos_fin_mgr',
    'br_jkt_hq', 'Kantor Pusat Jakarta', 'lob_ten_zyvora_corp_holding', 'Holding / Shared Services',
    'CC-SHARED-HOLDING', 'Holding / Shared Services', 'permanent', '2026-10-27', 'active',
    'Bank Mandiri', '1270009871234', 'Sri Wahyuni', '12.345.678.9-021.000', 'K/2',
    '19028837193', '000192837420', 'Rudi Hartono', '+62 813 4455 6677', 'Spouse',
    'Indonesia', '31', 'DKI Jakarta', '31.74', 'Kota Jakarta Selatan',
    '31.74.05', 'Mampang Prapatan', '31.74.05.1002', 'Kuningan Barat', '12710', '001', '003', 'Jl. Gatot Subroto Kav. 12'
),
(
    'emp_03', 'ten_zyvora_corp', '00120261027003', 'Bambang Pamungkas',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'bambang.log@zyvora.id', '+62 813 7721 349',
    'Operations & Logistics', 'dept_ops', 'Warehouse Lead Cakung', 'pos_wh_lead',
    'br_jkt_hq', 'Kantor Pusat Jakarta', 'lob_ten_zyvora_corp_hizaki', 'Hizaki Wedding Planner',
    'CC-LOB-HIZAKI', 'Hizaki Wedding Planner', 'permanent', '2026-10-27', 'active',
    'Bank BRI', '020601009876501', 'Bambang Pamungkas', '23.456.789.0-031.000', 'K/1',
    '19028837194', '000192837421', 'Siti Rahma', '+62 814 5566 7788', 'Spouse',
    'Indonesia', '31', 'DKI Jakarta', '31.75', 'Kota Jakarta Timur',
    '31.75.06', 'Cakung', '31.75.06.1001', 'Cakung Barat', '13910', '005', '008', 'Jl. Raya Cakung Cilincing No. 88'
),
(
    'emp_04', 'ten_zyvora_corp', '001A20261027001', 'Arya Pratama',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'arya.sub@zyvora.id', '+62 818 6629 110',
    'Operations & Logistics', 'dept_ops', 'Branch Manager Surabaya', 'pos_bm_sby',
    'br_sub_east', 'Cabang Surabaya', 'lob_ten_zyvora_corp_aurum', 'Aurum Deco',
    'CC-LOB-AURUM', 'Aurum Deco', 'permanent', '2026-10-27', 'active',
    'BCA (Bank Central Asia)', '0189283741', 'Arya Pratama', '34.567.890.1-041.000', 'TK/0',
    '19028837195', '000192837422', 'Hendro Pratama', '+62 819 1122 3344', 'Parent',
    'Indonesia', '35', 'Jawa Timur', '35.78', 'Kota Surabaya',
    '35.78.07', 'Tegalsari', '35.78.07.1002', 'Kedungdoro', '60261', '003', '001', 'Jl. Basuki Rahmat No. 102'
),
(
    'emp_05', 'ten_zyvora_corp', '00120261027004', 'Dimas Wicaksono',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    'dimas.it@zyvora.id', '+62 812 9900 1122',
    'Information Technology', 'dept_it', 'Fullstack Software Engineer', 'pos_it_dev',
    'br_jkt_hq', 'Kantor Pusat Jakarta', 'lob_ten_zyvora_corp_holding', 'Holding / Shared Services',
    'CC-SHARED-HOLDING', 'Holding / Shared Services', 'contract', '2026-10-27', 'active',
    'Bank Mandiri', '1330018829910', 'Dimas Wicaksono', '45.678.901.2-051.000', 'TK/0',
    '19028837196', '000192837423', 'Wicaksono Senior', '+62 815 6677 8899', 'Parent',
    'Indonesia', '31', 'DKI Jakarta', '31.74', 'Kota Jakarta Selatan',
    '31.74.02', 'Tebet', '31.74.02.1001', 'Tebet Timur', '12820', '004', '002', 'Jl. Tebet Timur Dalam No. 19'
),
(
    'emp_06', 'ten_zyvora_corp', '00120261027005', 'Anisa Rahmawati',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'anisa.kimiko@zyvora.id', '+62 812 3344 7788',
    'Creative & Event Planner', 'dept_event', 'Lead Usher & Receptionist', 'pos_usher_lead',
    'br_jkt_hq', 'Kantor Pusat Jakarta', 'lob_ten_zyvora_corp_kimiko', 'Ki Mi Ko Pager Ayu',
    'CC-LOB-KIMIKO', 'Ki Mi Ko Pager Ayu', 'permanent', '2026-10-27', 'active',
    'BCA (Bank Central Asia)', '0281928371', 'Anisa Rahmawati', '56.789.012.3-061.000', 'TK/0',
    '19028837197', '000192837424', 'Ferry Rahmawati', '+62 811 2233 4455', 'Sibling',
    'Indonesia', '31', 'DKI Jakarta', '31.74', 'Kota Jakarta Selatan',
    '31.74.01', 'Setiabudi', '31.74.01.1001', 'Karet', '12920', '003', '004', 'Jl. Karet Pedurenan No. 15'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    cost_center_code = EXCLUDED.cost_center_code,
    business_line_id = EXCLUDED.business_line_id,
    updated_at = NOW();
