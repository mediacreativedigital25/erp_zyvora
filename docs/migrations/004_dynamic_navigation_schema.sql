-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 004: DYNAMIC NAVIGATION & REALTIME MENU ENGINE
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Mode Operasi: STANDALONE SCHEMA MIGRATION & REALTIME NAVIGATION
-- Deskripsi:
--   Mendukung penambahan menu live langsung ke database Supabase tanpa
--   memerlukan redeploy frontend.
-- Prinsip Keamanan & RLS:
--   - Scoped multi-tenant: Global ERP menus (tenant_id IS NULL) + Tenant custom menus
--   - Role Gate: Super Admin & Tenant Owner/Admin berhak mengelola menu
--   - Zero Public Grants: Hanya user terotentikasi yang dapat membaca
--   - Strict search_path = public, pg_temp
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABEL: app_navigation_items
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_navigation_items (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(32) NOT NULL,
    parent_id VARCHAR(64) REFERENCES public.app_navigation_items(id) ON DELETE SET NULL,
    label VARCHAR(128) NOT NULL,
    icon_name VARCHAR(64) DEFAULT 'Boxes' NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    badge VARCHAR(32),
    is_ready BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order INT DEFAULT 10 NOT NULL,
    min_role VARCHAR(32) DEFAULT 'sales' NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_config JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_nav_items_group ON public.app_navigation_items(group_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_tenant ON public.app_navigation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_sort ON public.app_navigation_items(sort_order);

ALTER TABLE public.app_navigation_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_navigation_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_navigation_items TO authenticated;

-- Policies
DROP POLICY IF EXISTS "app_navigation_items_select" ON public.app_navigation_items;
CREATE POLICY "app_navigation_items_select" ON public.app_navigation_items
    FOR SELECT TO authenticated
    USING (
        public.is_platform_super_admin()
        OR tenant_id IS NULL
        OR tenant_id IN (SELECT public.get_auth_user_tenant_ids())
    );

DROP POLICY IF EXISTS "app_navigation_items_admin_manage" ON public.app_navigation_items;
CREATE POLICY "app_navigation_items_admin_manage" ON public.app_navigation_items
    FOR ALL TO authenticated
    USING (
        public.is_platform_super_admin()
        OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids()))
    )
    WITH CHECK (
        public.is_platform_super_admin()
        OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids()))
    );

-- --------------------------------------------------------------------
-- 2. CLEANUP OBSOLETE SEEDS & ALIGN CANONICAL NAVIGATION
-- --------------------------------------------------------------------
DELETE FROM public.app_navigation_items
WHERE id IN (
    'master_market_business',
    'master_user_management',
    'master_customers',
    'sales_invoice',
    'sales_delivery',
    'inventory_stock',
    'inventory_movement',
    'finance_ar',
    'accounting_journal'
);

INSERT INTO public.app_navigation_items (id, group_id, label, icon_name, route_id, badge, is_ready, is_active, sort_order, min_role)
VALUES
    -- Master Data & Tenant (Canonical IDs matching src/config/navigation.ts)
    ('master_company_profile', 'master_data', 'Profil Perusahaan', 'Building2', 'master_company_profile', NULL, TRUE, TRUE, 10, 'admin'),
    ('master_market_business_line', 'master_data', 'Market & Lini Bisnis', 'Globe', 'master_market_business_line', NULL, TRUE, TRUE, 20, 'admin'),
    ('master_system_config', 'master_data', 'Konfigurasi Sistem', 'Sliders', 'master_system_config', NULL, TRUE, TRUE, 30, 'admin'),
    ('rbac', 'master_data', 'Anggota Tenant', 'ShieldCheck', 'rbac', NULL, TRUE, TRUE, 40, 'admin')
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    group_id = EXCLUDED.group_id,
    route_id = EXCLUDED.route_id,
    icon_name = EXCLUDED.icon_name,
    is_ready = EXCLUDED.is_ready,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

COMMIT;
