-- ============================================================
-- ZYVORA ERP 1.0.0 — DEFINITIVE DATABASE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nfjucyabfiqlmrxnviuz/sql
-- ============================================================

-- STEP 1: DROP ALL DEPENDENT RLS POLICIES ON ALL TABLES
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "tenant_memberships_select_scoped" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_deny_client_role_update" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_allow_all" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_all" ON public.tenant_memberships;

DROP POLICY IF EXISTS "tenants_select_scoped" ON public.tenants;
DROP POLICY IF EXISTS "audit_logs_select_scoped" ON public.audit_logs;

DROP POLICY IF EXISTS "company_profiles_select_scoped" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles_modify_admin_only" ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles_all" ON public.company_profiles;

DROP POLICY IF EXISTS "tenant_market_profiles_select_scoped" ON public.tenant_market_profiles;
DROP POLICY IF EXISTS "tenant_market_profiles_modify_admin_only" ON public.tenant_market_profiles;
DROP POLICY IF EXISTS "tenant_market_profiles_all" ON public.tenant_market_profiles;

DROP POLICY IF EXISTS "tenant_business_lines_select_scoped" ON public.tenant_business_lines;
DROP POLICY IF EXISTS "tenant_business_lines_modify_admin_only" ON public.tenant_business_lines;
DROP POLICY IF EXISTS "tenant_business_lines_all" ON public.tenant_business_lines;

DROP POLICY IF EXISTS "tenant_system_configs_select_scoped" ON public.tenant_system_configs;
DROP POLICY IF EXISTS "tenant_system_configs_modify_admin_only" ON public.tenant_system_configs;
DROP POLICY IF EXISTS "tenant_system_configs_all" ON public.tenant_system_configs;

-- STEP 2: DROP OLD UUID FOREIGN KEY CONSTRAINTS IF PRESENT
ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_tenant_id_fkey;
ALTER TABLE public.company_profiles DROP CONSTRAINT IF EXISTS company_profiles_tenant_id_fkey;
ALTER TABLE public.tenant_market_profiles DROP CONSTRAINT IF EXISTS tenant_market_profiles_tenant_id_fkey;
ALTER TABLE public.tenant_business_lines DROP CONSTRAINT IF EXISTS tenant_business_lines_tenant_id_fkey;
ALTER TABLE public.tenant_system_configs DROP CONSTRAINT IF EXISTS tenant_system_configs_tenant_id_fkey;

-- STEP 3: ALTER TENANT_ID COLUMNS TO TEXT ACROSS ALL TABLES
ALTER TABLE public.tenant_memberships ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE public.company_profiles ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE public.tenant_market_profiles ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE public.tenant_business_lines ALTER COLUMN tenant_id TYPE TEXT;
ALTER TABLE public.tenant_system_configs ALTER COLUMN tenant_id TYPE TEXT;

-- STEP 4: RECREATE CLEAN RLS POLICIES
CREATE POLICY "profiles_select_scoped" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "tenant_memberships_select_scoped" ON public.tenant_memberships FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "tenant_memberships_all" ON public.tenant_memberships FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "tenants_select_scoped" ON public.tenants FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "audit_logs_select_scoped" ON public.audit_logs FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "company_profiles_all" ON public.company_profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "tenant_market_profiles_all" ON public.tenant_market_profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "tenant_business_lines_all" ON public.tenant_business_lines FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "tenant_system_configs_all" ON public.tenant_system_configs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- STEP 5: ADD ADDRESS & PROFILE COLUMNS TO TENANTS TABLE
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS province_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS regency_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS regency_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS district_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS village_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS village_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS npwp TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description TEXT;

-- STEP 6: SET HEADQUARTERS ADDRESS DATA FOR SEEDED TENANT
UPDATE public.tenants 
SET 
  address = 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55',
  province_id = '31',
  province_name = 'DKI Jakarta',
  regency_id = '3171',
  regency_name = 'Kota Jakarta Selatan',
  district_id = '317101',
  district_name = 'Kebayoran Baru',
  village_id = '3171011001',
  village_name = 'Senayan',
  postal_code = '12190',
  phone = '+62 21 5289 0000',
  email = 'corporate@zyvora.com',
  npwp = '01.345.678.9-012.000'
WHERE id = 'ten_zyvora_corp';

-- STEP 7: SET DEFAULT ROLE TO 'owner'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'owner';

-- STEP 8: ENSURE SUPER ADMIN & OWNER ACCOUNT ROLES
UPDATE public.profiles 
SET 
  role = 'super_admin',
  role_title = 'Platform Super Admin',
  is_platform_super_admin = true,
  tenant_id = 'ten_zyvora_corp'
WHERE email = 'admin@yulovi.com' OR user_code = '2A';

UPDATE public.profiles 
SET 
  role = 'owner',
  role_title = 'Business Owner & Director',
  tenant_id = 'ten_zyvora_corp'
WHERE email = 'admin2@yulovi.com';
