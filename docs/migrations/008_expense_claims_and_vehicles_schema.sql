-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 008: EXPENSE CLAIMS & VEHICLE FLEET
-- Description: Master Vehicles & Multi-Line Claim Expense Transactions
-- Numbering Pattern: CE + YYYYMM + 5-digit sequence (e.g. CE20261000001)
-- ====================================================================

BEGIN;

-- 1. Table: Company Vehicles (Master Armada Operasional)
CREATE TABLE IF NOT EXISTS public.company_vehicles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    license_plate TEXT NOT NULL, -- Nomor Polisi (e.g. 'B 1234 XYZ')
    brand_model TEXT NOT NULL,   -- e.g. 'Toyota Avanza 1.3 G'
    vehicle_type TEXT NOT NULL DEFAULT 'car', -- 'car', 'motorcycle', 'van', 'truck'
    fuel_type TEXT NOT NULL DEFAULT 'pertamax', -- 'pertalite', 'pertamax', 'dexlite', 'solar'
    assigned_branch_id TEXT,
    assigned_business_line_id TEXT,
    current_odometer_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_company_vehicles_plate UNIQUE (tenant_id, license_plate)
);

CREATE INDEX IF NOT EXISTS idx_company_vehicles_tenant ON public.company_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_active ON public.company_vehicles(tenant_id, is_active);

-- 2. Table: Expense Claims (Header Dokumen Klaim Biaya)
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    claim_number TEXT NOT NULL, -- Format: CE + YYYYMM + 00001 (e.g. CE20261000001)
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_by_user_id TEXT NOT NULL,
    request_by_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'paid', 'rejected'
    notes TEXT,
    disbursement_method TEXT NOT NULL DEFAULT 'petty_cash', -- 'petty_cash', 'bank_transfer'
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_expense_claims_number UNIQUE (tenant_id, claim_number),
    CONSTRAINT chk_expense_claims_status CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant ON public.expense_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON public.expense_claims(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_date ON public.expense_claims(tenant_id, claim_date DESC);

-- 3. Table: Expense Claim Items (Rincian Baris Multi-Line Claim)
CREATE TABLE IF NOT EXISTS public.expense_claim_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    claim_id TEXT NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    order_by_type TEXT NOT NULL, -- 'business_line', 'personnel', 'branch'
    order_by_target_id TEXT NOT NULL,
    order_by_target_name TEXT NOT NULL,
    cost_center_code TEXT NOT NULL, -- Locked Cost Center Code (e.g. 'CC-QUEINVITE')
    category TEXT NOT NULL, -- 'vehicle_fuel', 'travel_lodging', 'meals_representation', 'office_supplies', 'courier_logistics', 'general'
    activity TEXT NOT NULL, -- Activity name or purpose
    is_vehicle_activity BOOLEAN NOT NULL DEFAULT false,
    vehicle_id TEXT REFERENCES public.company_vehicles(id) ON DELETE SET NULL,
    license_plate TEXT,
    odometer_km NUMERIC(12, 2),
    fuel_liters NUMERIC(10, 2),
    fuel_purchase_date DATE,
    nominal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    disbursement_method TEXT NOT NULL DEFAULT 'petty_cash', -- 'petty_cash', 'bank_transfer'
    remark TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_expense_claim_items_claim ON public.expense_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_items_cost_center ON public.expense_claim_items(cost_center_code);

-- 4. Row Level Security (RLS) Enablement
ALTER TABLE public.company_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS p_company_vehicles_tenant ON public.company_vehicles;
CREATE POLICY p_company_vehicles_tenant ON public.company_vehicles
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR current_setting('request.jwt.claims', true) IS NULL);

DROP POLICY IF EXISTS p_expense_claims_tenant ON public.expense_claims;
CREATE POLICY p_expense_claims_tenant ON public.expense_claims
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR current_setting('request.jwt.claims', true) IS NULL);

DROP POLICY IF EXISTS p_expense_claim_items_tenant ON public.expense_claim_items;
CREATE POLICY p_expense_claim_items_tenant ON public.expense_claim_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.expense_claims ec 
            WHERE ec.id = expense_claim_items.claim_id 
            AND (ec.tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR current_setting('request.jwt.claims', true) IS NULL)
        )
    );

COMMIT;
