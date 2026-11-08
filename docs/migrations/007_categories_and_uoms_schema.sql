-- ====================================================================
-- ZYVORA ERP 1.0.0 - MIGRATION 007: PRODUCT CATEGORIES & UOM MASTER SCHEMA
-- Target Database: PostgreSQL 15+ (Multi-Tenant RLS)
-- Operation: ATOMIC MIGRATION (DDL & RLS)
-- Description:
--   1. public.product_categories: Master kategori barang fisik dan layanan jasa
--   2. public.unit_of_measures: Master satuan ukur (UoM) konversi persediaan & tarif jasa
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABEL: product_categories
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    item_type VARCHAR(32) NOT NULL DEFAULT 'all', -- 'physical', 'service', 'all'
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_categories_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant 
    ON public.product_categories(tenant_id, is_active);

-- --------------------------------------------------------------------
-- 2. TABEL: unit_of_measures
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unit_of_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    classification VARCHAR(64) NOT NULL DEFAULT 'General', -- 'Packaging', 'Weight', 'Volume', 'Service', 'Logistics', 'General'
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_unit_of_measures_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_unit_of_measures_tenant 
    ON public.unit_of_measures(tenant_id, is_active);

-- --------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_of_measures ENABLE ROW LEVEL SECURITY;

-- Policy product_categories: Read
DROP POLICY IF EXISTS "tenant_isolation_product_categories_select" ON public.product_categories;
CREATE POLICY "tenant_isolation_product_categories_select" ON public.product_categories
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Policy product_categories: Mutation (Admin/Owner)
DROP POLICY IF EXISTS "tenant_isolation_product_categories_mutation" ON public.product_categories;
CREATE POLICY "tenant_isolation_product_categories_mutation" ON public.product_categories
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
        )
    );

-- Policy unit_of_measures: Read
DROP POLICY IF EXISTS "tenant_isolation_unit_of_measures_select" ON public.unit_of_measures;
CREATE POLICY "tenant_isolation_unit_of_measures_select" ON public.unit_of_measures
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Policy unit_of_measures: Mutation (Admin/Owner)
DROP POLICY IF EXISTS "tenant_isolation_unit_of_measures_mutation" ON public.unit_of_measures;
CREATE POLICY "tenant_isolation_unit_of_measures_mutation" ON public.unit_of_measures
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
        )
    );

COMMIT;
