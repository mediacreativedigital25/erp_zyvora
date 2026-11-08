-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 009: CLAIM SETTINGS & VEHICLE TAX EXPIRY
-- Description: Master Kendaraan with Tax Due Dates & Claim Settings
-- ====================================================================

BEGIN;

-- 1. Alter company_vehicles: Add Custodian and Tax Due Dates
ALTER TABLE IF EXISTS public.company_vehicles
    ADD COLUMN IF NOT EXISTS custodian_employee_id TEXT,
    ADD COLUMN IF NOT EXISTS custodian_name TEXT,
    ADD COLUMN IF NOT EXISTS tax_due_date DATE,         -- Tanggal Pajak Tahunan
    ADD COLUMN IF NOT EXISTS plate_expiry_date DATE;    -- Tanggal Plat 5 Tahunan

CREATE INDEX IF NOT EXISTS idx_company_vehicles_tax_due ON public.company_vehicles(tax_due_date);

-- 2. Table: Claim Expense Categories (Master Kategori Beban Klaim)
CREATE TABLE IF NOT EXISTS public.claim_expense_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,                                  -- e.g. 'CAT-FUEL', 'CAT-MEAL'
    name TEXT NOT NULL,                                  -- e.g. 'Bahan Bakar Kendaraan (BBM)'
    is_vehicle_activity BOOLEAN NOT NULL DEFAULT false,  -- Memicu log armada (Nopol, KM, Liter)
    max_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,         -- 0 = No Limit
    is_receipt_required BOOLEAN NOT NULL DEFAULT true,   -- Wajib nota fisik
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_claim_categories_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_claim_categories_tenant ON public.claim_expense_categories(tenant_id);

-- 3. Table: Claim Expense Activities (Master Jenis Aktivitas Operasional)
CREATE TABLE IF NOT EXISTS public.claim_expense_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,                                  -- e.g. 'ACT-DELIV', 'ACT-CLIENT'
    name TEXT NOT NULL,                                  -- e.g. 'Pengantaran Hampers Undangan'
    business_line_id TEXT,                               -- Relasi ke Lini Bisnis atau null (Semua)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_claim_activities_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_claim_activities_tenant ON public.claim_expense_activities(tenant_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.claim_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_expense_activities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS p_claim_categories_tenant ON public.claim_expense_categories;
CREATE POLICY p_claim_categories_tenant ON public.claim_expense_categories
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR current_setting('request.jwt.claims', true) IS NULL);

DROP POLICY IF EXISTS p_claim_activities_tenant ON public.claim_expense_activities;
CREATE POLICY p_claim_activities_tenant ON public.claim_expense_activities
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR current_setting('request.jwt.claims', true) IS NULL);

COMMIT;
