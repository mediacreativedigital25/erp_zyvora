-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 002: MASTER TENANT SCHEMA
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Status: PENDING OPERATOR REVIEW (DO NOT EXECUTE AUTOMATICALLY)
-- Mode Operasi: STANDALONE SCHEMA MIGRATION
-- Deskripsi:
--   Menyediakan struktur tabel pendukung Master Tenant Tahap 1:
--   1. public.company_profiles (Profil Perusahaan, Identitas Legal, Kontak, Wilayah)
--   2. public.tenant_market_profiles (Kategori Industri & Model Bisnis)
--   3. public.tenant_business_lines (Multi Lini Bisnis Tenant & Primary Line)
--   4. public.tenant_system_configs (Mata Uang, Zona Waktu, Bahasa, Format Tanggal, Tahun Buku)
-- Prinsip Keamanan & RLS:
--   - Scoped multi-tenant isolation via get_auth_user_tenant_ids()
--   - Hak mutasi terbatas hanya untuk Super Admin & Tenant Owner/Admin via get_auth_user_admin_tenant_ids()
--   - Strict search_path = public, pg_temp
--   - Zero Public Grants
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABEL: company_profiles
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_profiles (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_code VARCHAR(32) NOT NULL,
    legal_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    business_entity VARCHAR(32) DEFAULT 'PT' NOT NULL,
    nib VARCHAR(32),
    npwp VARCHAR(32),
    email VARCHAR(255),
    phone VARCHAR(64),
    whatsapp VARCHAR(64),
    website VARCHAR(255),
    address TEXT,
    province_id VARCHAR(16),
    province_name VARCHAR(128),
    regency_id VARCHAR(16),
    regency_name VARCHAR(128),
    district_id VARCHAR(16),
    district_name VARCHAR(128),
    village_id VARCHAR(16),
    village_name VARCHAR(128),
    postal_code VARCHAR(16),
    country VARCHAR(64) DEFAULT 'Indonesia' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_tenant_code ON public.company_profiles(tenant_code);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.company_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.company_profiles TO authenticated;

-- Policies for company_profiles
DROP POLICY IF EXISTS "company_profiles_select_scoped" ON public.company_profiles;
CREATE POLICY "company_profiles_select_scoped" ON public.company_profiles
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "company_profiles_modify_admin_only" ON public.company_profiles;
CREATE POLICY "company_profiles_modify_admin_only" ON public.company_profiles
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
-- 2. TABEL: tenant_market_profiles
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_market_profiles (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    industry_category TEXT NOT NULL,
    business_model VARCHAR(32) DEFAULT 'B2B' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.tenant_market_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_market_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tenant_market_profiles TO authenticated;

DROP POLICY IF EXISTS "tenant_market_profiles_select_scoped" ON public.tenant_market_profiles;
CREATE POLICY "tenant_market_profiles_select_scoped" ON public.tenant_market_profiles
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "tenant_market_profiles_modify_admin_only" ON public.tenant_market_profiles;
CREATE POLICY "tenant_market_profiles_modify_admin_only" ON public.tenant_market_profiles
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
-- 3. TABEL: tenant_business_lines
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_business_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT tenant_business_lines_unique_code_per_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_business_lines_tenant_id ON public.tenant_business_lines(tenant_id);

ALTER TABLE public.tenant_business_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_business_lines FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_business_lines TO authenticated;

DROP POLICY IF EXISTS "tenant_business_lines_select_scoped" ON public.tenant_business_lines;
CREATE POLICY "tenant_business_lines_select_scoped" ON public.tenant_business_lines
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "tenant_business_lines_modify_admin_only" ON public.tenant_business_lines;
CREATE POLICY "tenant_business_lines_modify_admin_only" ON public.tenant_business_lines
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
-- 4. TABEL: tenant_system_configs
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_system_configs (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    base_currency VARCHAR(8) DEFAULT 'IDR' NOT NULL,
    timezone VARCHAR(64) DEFAULT 'Asia/Jakarta' NOT NULL,
    language VARCHAR(8) DEFAULT 'id' NOT NULL,
    date_format VARCHAR(32) DEFAULT 'DD/MM/YYYY' NOT NULL,
    fiscal_year_start_month SMALLINT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.tenant_system_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_system_configs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tenant_system_configs TO authenticated;

DROP POLICY IF EXISTS "tenant_system_configs_select_scoped" ON public.tenant_system_configs;
CREATE POLICY "tenant_system_configs_select_scoped" ON public.tenant_system_configs
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "tenant_system_configs_modify_admin_only" ON public.tenant_system_configs;
CREATE POLICY "tenant_system_configs_modify_admin_only" ON public.tenant_system_configs
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
