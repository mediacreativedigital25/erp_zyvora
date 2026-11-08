-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 006: LIVE PRODUCTS & SERVICES CATALOG
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Mode Operasi: LIVE CATALOG SCHEMA MIGRATION
-- Deskripsi:
--   Menyediakan struktur tabel katalog live untuk:
--   1. public.products (Barang Fisik Persediaan & Digital Non-Stock)
--   2. public.service_items (Layanan Jasa & Tarif Kasir Terpadu)
-- Prinsip Keamanan & RLS:
--   - Scoped multi-tenant isolation via get_auth_user_tenant_ids()
--   - Hak mutasi terbatas hanya untuk Super Admin & Tenant Owner/Admin via get_auth_user_admin_tenant_ids()
--   - Strict search_path = public, pg_temp
--   - Zero Public Grants
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABEL: products (Katalog Barang Persediaan & Produk Fisik)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL,
    barcode VARCHAR(32),
    name TEXT NOT NULL,
    description TEXT,
    type VARCHAR(32) DEFAULT 'physical' NOT NULL,
    category VARCHAR(128) NOT NULL,
    business_line_id UUID REFERENCES public.tenant_business_lines(id) ON DELETE SET NULL,
    uom VARCHAR(64) NOT NULL,
    weight_gram INT DEFAULT 0 NOT NULL,
    min_stock_level INT DEFAULT 0 NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    selling_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    image_url TEXT,
    stock_by_warehouse JSONB DEFAULT '{}'::jsonb NOT NULL,
    total_stock INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT products_unique_sku_per_tenant UNIQUE (tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_business_line ON public.products(tenant_id, business_line_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.products FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;

DROP POLICY IF EXISTS "products_select_scoped" ON public.products;
CREATE POLICY "products_select_scoped" ON public.products
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "products_modify_admin_only" ON public.products;
CREATE POLICY "products_modify_admin_only" ON public.products
    FOR ALL TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
    )
    WITH CHECK (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
    );

-- --------------------------------------------------------------------
-- 2. TABEL: service_items (Katalog Layanan Jasa & Undangan Digital)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    barcode VARCHAR(32),
    name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(128) NOT NULL,
    business_line_id UUID REFERENCES public.tenant_business_lines(id) ON DELETE SET NULL,
    uom VARCHAR(64) NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    rate NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT service_items_unique_code_per_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_items_tenant_id ON public.service_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_items_code ON public.service_items(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_service_items_barcode ON public.service_items(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_service_items_business_line ON public.service_items(tenant_id, business_line_id);

ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_items TO authenticated;

DROP POLICY IF EXISTS "service_items_select_scoped" ON public.service_items;
CREATE POLICY "service_items_select_scoped" ON public.service_items
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "service_items_modify_admin_only" ON public.service_items;
CREATE POLICY "service_items_modify_admin_only" ON public.service_items
    FOR ALL TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
    )
    WITH CHECK (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
    );

COMMIT;
