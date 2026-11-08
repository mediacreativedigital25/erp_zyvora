-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 001.1: RLS RECURSION REPAIR & HELPER FUNCTIONS
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Mode Operasi: STANDALONE PATCH MIGRATION (Idempotent & Minimal Scope)
-- Status: READY FOR OPERATOR REVIEW
-- Prinsip:
--   1. Zero modification to original Migration 001 file.
--   2. Break infinite RLS recursion on tenant_memberships via SECURITY DEFINER helpers.
--   3. Maintain strict isolation: Super Admin, Tenant Owner/Admin, Member, Cross-Tenant.
--   4. Tenant Owner/Admin aktif dapat melihat keanggotaan aktif maupun nonaktif di tenant-nya.
--   5. Strict search_path, explicit function ownership (postgres), and least-privilege grants.
--   6. Minimal patch: Tidak menyentuh audit_logs, tenants, modul ERP, atau aturan seed 2A.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER: GET AUTH USER ACTIVE TENANT IDS
-- Mengembalikan daftar ID tenant di mana auth.uid() memiliki membership aktif.
-- Dieksekusi dengan wewenang owner (postgres) untuk memutus rantai rekursi RLS.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT tm.tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active';
$$;

-- Explicit ownership & least privilege grants
ALTER FUNCTION public.get_auth_user_tenant_ids() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_auth_user_tenant_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_tenant_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_tenant_ids() TO authenticated;

-- --------------------------------------------------------------------
-- 2. SECURITY DEFINER HELPER: GET AUTH USER ADMIN TENANT IDS
-- Mengembalikan daftar ID tenant di mana auth.uid() adalah owner atau admin aktif.
-- Digunakan untuk otorisasi manajerial keanggotaan tenant dan policy terkait.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_admin_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT tm.tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin');
$$;

-- Explicit ownership & least privilege grants
ALTER FUNCTION public.get_auth_user_admin_tenant_ids() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_auth_user_admin_tenant_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_admin_tenant_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_admin_tenant_ids() TO authenticated;

-- --------------------------------------------------------------------
-- 3. RE-DEFINE POLICY: tenant_memberships_select_scoped
-- Menghilangkan self-referential subquery pada tenant_memberships.
-- Menggunakan helper bebas rekursi dan memberikan hak visibilitas penuh
-- (aktif & nonaktif) bagi Tenant Owner/Admin di tenant yang dikelolanya.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_memberships_select_scoped" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_select_scoped" ON public.tenant_memberships
    FOR SELECT
    TO authenticated
    USING (
        -- A. Pengguna dapat melihat penugasan tenant miliknya sendiri (aktif maupun inaktif)
        user_id = auth.uid()
        -- B. Platform Super Admin berhak melihat seluruh keanggotaan pada platform
        OR public.is_platform_super_admin()
        -- C. Tenant Owner/Admin aktif dapat melihat seluruh membership (aktif & inaktif) pada tenant yang dikelolanya
        OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
        -- D. Anggota tenant aktif biasa dapat melihat rekan satu tenant yang berstatus aktif
        OR (
            tenant_id IN (SELECT public.get_auth_user_tenant_ids())
            AND status = 'active'
        )
    );

-- --------------------------------------------------------------------
-- 4. RE-DEFINE POLICY: profiles_select_scoped
-- Menyelaraskan akses profiles agar konsisten dengan helper bebas siklus RLS.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        -- A. Pengguna dapat membaca profil miliknya sendiri
        id = auth.uid()
        -- B. Platform Super Admin berhak membaca seluruh profil untuk administrasi
        OR public.is_platform_super_admin()
        -- C. Anggota tenant aktif dapat melihat profil rekan aktif dalam tenant yang sama
        OR EXISTS (
            SELECT 1 
            FROM public.tenant_memberships tm
            WHERE tm.user_id = public.profiles.id
              AND tm.status = 'active'
              AND tm.tenant_id IN (SELECT public.get_auth_user_tenant_ids())
        )
    );

COMMIT;
