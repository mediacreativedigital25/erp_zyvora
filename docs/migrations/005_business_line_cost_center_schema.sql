-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 005: BUSINESS LINE & COST CENTER FOUNDATION
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Mode Operasi: ENHANCEMENT SCHEMA MIGRATION (FASE 1 COST CENTER)
-- Deskripsi:
--   Menyediakan fondasi akuntansi multi-dimensi Pusat Biaya (Cost Center)
--   dan Pusat Laba (Profit Center) berbasis Lini Bisnis:
--   1. Penambahan cost_center_code & allow_shared_allocation pada tenant_business_lines
--   2. Penambahan business_line_id pada tabel katalog products
--   3. Penambahan cost_allocation_mode & business_line_id pada tabel employees
-- Prinsip Keamanan & RLS:
--   - Scoped multi-tenant via get_auth_user_tenant_ids() & get_auth_user_admin_tenant_ids()
--   - Zero Public Grants
--   - Strict search_path = public, pg_temp
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABEL: tenant_business_lines (Pusat Biaya & Alokasi Beban Bersama)
-- --------------------------------------------------------------------
ALTER TABLE public.tenant_business_lines
    ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS allow_shared_allocation BOOLEAN DEFAULT TRUE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_business_lines_cost_center 
    ON public.tenant_business_lines(tenant_id, cost_center_code);

-- Self-healing: Inisialisasi kode Cost Center untuk data yang belum memiliki cost_center_code
UPDATE public.tenant_business_lines
SET cost_center_code = 'CC-' || code
WHERE cost_center_code IS NULL;

-- --------------------------------------------------------------------
-- 2. TABEL: products (Atribusi Pendapatan & HPP ke Lini Bisnis)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        ALTER TABLE public.products
            ADD COLUMN IF NOT EXISTS business_line_id UUID REFERENCES public.tenant_business_lines(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_products_business_line_id 
            ON public.products(tenant_id, business_line_id);
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 3. TABEL: employees (Alokasi Beban Gaji & Klaim Operasional Personil)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
        ALTER TABLE public.employees
            ADD COLUMN IF NOT EXISTS cost_allocation_mode VARCHAR(32) DEFAULT 'single' NOT NULL,
            ADD COLUMN IF NOT EXISTS business_line_id UUID REFERENCES public.tenant_business_lines(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS cost_allocation_policy JSONB DEFAULT '{"mode": "single"}'::jsonb NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_employees_business_line_id 
            ON public.employees(tenant_id, business_line_id);
    END IF;
END $$;

COMMIT;
