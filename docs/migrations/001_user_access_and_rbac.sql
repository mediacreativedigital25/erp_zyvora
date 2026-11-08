-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 001: USER ACCESS, USER CODE & RBAC
-- REVISI GATE C1.6: RLS CLOSURE & SCHEMA ALIGNMENT (TENANTS SELECT SCOPED)
-- Tanggal Revisi: 2026-10-24
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Status Otorisasi: PENDING PRODUCT OWNER APPROVAL (DO NOT EXECUTE)
-- Mode Operasi: LOCAL REVIEW ONLY — ZERO DATABASE EXECUTION
-- Kepatuhan Kebijakan PO:
--   1. Legacy Role: inventory_staff & accountant (HOLD), branch_manager (REVIEW)
--   2. Official Roles: super_admin, owner, admin, sales, customer (Default role: 'sales')
--   3. User Code: 32-char charset [2-9A-HJ-NP-Z], no recycling, pre-flight verified
--   4. Super Admin Pertama: admin@yulovi.com (Auth UUID Unverified -> BLOCKER)
--   5. Anti-Lockout Invariant: Abort transaction (ROLLBACK) if Super Admin candidate is absent
-- Prinsip Arsitektur:
--   - Non-Destructive, Idempotent DDL
--   - Strict Schema Qualification (SET search_path = public, pg_temp)
--   - Zero Default Public Grants (Revoke ALL from PUBLIC, anon)
--   - Scoped RLS: Zero permissive USING (TRUE) on sensitive tables
--   - Advisory Locks (94820: Super Admin, 94821: Code Generator)
--   - Profile Deletion Trigger: Auto-burn retired codes
-- ====================================================================
--
-- PRA-MIGRASI INSPEKSI READ-ONLY (Jalankan sebelum eksekusi migrasi):
--
-- 1. Periksa apakah tabel profiles memiliki user_code eksisting yang melanggar aturan 32 karakter:
--    SELECT id, full_name, user_code 
--    FROM public.profiles 
--    WHERE user_code IS NOT NULL AND user_code !~ '^[2-9A-HJ-NP-Z]{2,3}$';
--    (Harus mengembalikan 0 baris agar penambahan CHECK constraint tidak gagal).
--
-- 2. Periksa apakah akun Supabase Auth kandidat Super Admin telah terdaftar:
--    SELECT id, email, created_at 
--    FROM auth.users 
--    WHERE email = 'admin@yulovi.com';
--    (Wajib ada 1 baris agar transaksi migrasi tidak melempar EXCEPTION dan ROLLBACK).
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. PREREQUISITES & EXTENSIONS
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. EXTEND 'profiles' TABLE WITH IMMUTABLE 2-3 CHAR 'user_code'
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles 
    ADD COLUMN IF NOT EXISTS user_code VARCHAR(3);

-- Add unique constraint for user_code if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_code_unique'
    ) THEN
        ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_user_code_unique UNIQUE (user_code);
    END IF;
END $$;

-- Check constraint: user_code must be 2 to 3 characters from the 32-char safe alphabet
-- Allowed characters: 2-9, A-H, J-N, P-Z (Strictly excludes ambiguous 0, 1, O, I)
-- 8 digits + 8 letters (A-H) + 5 letters (J-N) + 11 letters (P-Z) = 32 characters
-- Combinatorial capacity: 32^2 (1,024) + 32^3 (32,768) = 33,792 unique codes
DO $$
BEGIN
    -- Drop legacy permissive format check if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_code_format_chk'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_code_format_chk;
    END IF;

    -- Apply PO Gate B3 32-character strict constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_code_safe_alphabet_chk'
    ) THEN
        ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_user_code_safe_alphabet_chk 
            CHECK (user_code ~ '^[2-9A-HJ-NP-Z]{2,3}$');
    END IF;
END $$;

-- B-Tree Index for high-performance lookup by user_code
CREATE INDEX IF NOT EXISTS idx_profiles_user_code 
    ON public.profiles(user_code);

-- --------------------------------------------------------------------
-- 1B. ALIGN 'tenant_memberships' DEFAULT ROLE & ROLE CONSTRAINT
-- Temuan Supabase Aktual: Default role adalah 'sales_rep', harus diselaraskan ke 'sales'
-- Tambahkan CHECK constraint untuk validitas role (5 resmi + 3 karantina PO)
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tenant_memberships 
    ALTER COLUMN role SET DEFAULT 'sales';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenant_memberships_role_chk'
    ) THEN
        ALTER TABLE public.tenant_memberships 
            ADD CONSTRAINT tenant_memberships_role_chk 
            CHECK (role IN ('super_admin', 'owner', 'admin', 'sales', 'customer', 'inventory_staff', 'accountant', 'branch_manager'));
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 2. DEDICATED PLATFORM SUPER ADMIN TABLE
-- Separates Platform Super Admin authority from tenant_memberships.role
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT
);

-- B-Tree Index for active platform super admin queries
CREATE INDEX IF NOT EXISTS idx_platform_super_admins_active 
    ON public.platform_super_admins(user_id) 
    WHERE is_active = TRUE;

-- Enable Row Level Security (RLS) on platform_super_admins
ALTER TABLE public.platform_super_admins ENABLE ROW LEVEL SECURITY;

-- Revoke default public access on table
REVOKE ALL ON TABLE public.platform_super_admins FROM PUBLIC;
REVOKE ALL ON TABLE public.platform_super_admins FROM anon;
GRANT SELECT ON TABLE public.platform_super_admins TO authenticated;

-- --------------------------------------------------------------------
-- 3. BURNED USER CODES TABLE (INVARIANT: NO REUSE OF DEACTIVATED CODES)
-- Ensures that once an account is deactivated, its user code is never recycled
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.burned_user_codes (
    user_code VARCHAR(3) PRIMARY KEY,
    deactivated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    original_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    CONSTRAINT burned_user_code_format_chk CHECK (user_code ~ '^[2-9A-HJ-NP-Z]{2,3}$')
);

-- Enable Row Level Security (RLS) on burned_user_codes
ALTER TABLE public.burned_user_codes ENABLE ROW LEVEL SECURITY;

-- Revoke default public access on table
REVOKE ALL ON TABLE public.burned_user_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.burned_user_codes FROM anon;
GRANT SELECT ON TABLE public.burned_user_codes TO authenticated;

-- Automatic trigger: Burn user code when a profile row is deleted
CREATE OR REPLACE FUNCTION public.trg_burn_user_code_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.user_code IS NOT NULL THEN
        INSERT INTO public.burned_user_codes (user_code, original_user_id, reason)
        VALUES (OLD.user_code, OLD.id, 'Otomatis dibakar saat profil pengguna dihapus')
        ON CONFLICT (user_code) DO NOTHING;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_burn_code_on_delete ON public.profiles;
CREATE TRIGGER trg_profiles_burn_code_on_delete
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_burn_user_code_on_profile_delete();

-- Server-side Trigger: Enforce strict immutability of profiles.user_code
-- Rejects unauthorized client-side or SQL updates to user_code once assigned,
-- while allowing legitimate profile updates (full_name, avatar, etc.) to proceed seamlessly.
CREATE OR REPLACE FUNCTION public.trg_enforce_profiles_user_code_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Pertahankan user_code lama jika payload update tidak menyertakan user_code (NULL)
    IF OLD.user_code IS NOT NULL AND NEW.user_code IS NULL THEN
        NEW.user_code := OLD.user_code;
    END IF;

    -- Jika user_code lama sudah terisi dan dicoba diubah ke nilai berbeda, tolak mutasi!
    IF OLD.user_code IS NOT NULL AND NEW.user_code IS DISTINCT FROM OLD.user_code THEN
        RAISE EXCEPTION 'ERR_ZYVORA_IMMUTABLE_USER_CODE: Kolom user_code bersifat permanen dan tidak dapat diubah setelah ditetapkan.';
    END IF;

    -- Jika user_code masih NULL dan dicoba ditetapkan, hanya izinkan proses server berwenang
    -- (DBA/migrasi tanpa auth.uid() atau Platform Super Admin), tolak penetapan langsung oleh klien biasa.
    IF OLD.user_code IS NULL AND NEW.user_code IS NOT NULL THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_platform_super_admin() THEN
            RAISE EXCEPTION 'ERR_ZYVORA_FORBIDDEN_USER_CODE_ASSIGNMENT: Penetapan user_code baru hanya diizinkan melalui proses server berwenang atau Platform Super Admin, bukan oleh klien langsung.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_user_code_immutable ON public.profiles;
CREATE TRIGGER trg_profiles_user_code_immutable
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_profiles_user_code_immutable();

-- --------------------------------------------------------------------
-- 4. FUNCTION: CHECK IF AUTHENTICATED CALLER IS PLATFORM SUPER ADMIN
-- Implements both zero-argument RPC and parameterized signature with strict security
-- --------------------------------------------------------------------

-- Zero-argument RPC: checks if current caller (auth.uid()) is active Super Admin
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.platform_super_admins
        WHERE user_id = auth.uid()
          AND is_active = TRUE
    );
$$;

-- Parameterized version: checks specific user UUID.
-- Security constraint: Non-super admins may ONLY inspect their own UUID to prevent user enumeration attacks.
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If caller is checking another user, caller MUST be a platform super admin
    IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.platform_super_admins 
            WHERE user_id = auth.uid() AND is_active = TRUE
        ) THEN
            -- Deny probing of other user identities (Anti-Enumeration Defense)
            RETURN FALSE;
        END IF;
    END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM public.platform_super_admins
        WHERE user_id = COALESCE(p_user_id, auth.uid())
          AND is_active = TRUE
    );
END;
$$;

-- Tighten EXECUTE privileges
REVOKE ALL ON FUNCTION public.is_platform_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_platform_super_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_super_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_super_admin(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 5. FUNCTION: CONCURRENCY-SAFE USER CODE GENERATOR (2-3 CHARS)
-- Strictly enforces 32-character alphabet (excludes 0, 1, O, I)
-- Uses advisory lock 94821 to prevent race conditions during concurrent user creation
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_concurrency_safe_user_code()
RETURNS VARCHAR(3)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
    -- Strictly 32 characters safe pool (no 0, 1, O, I)
    v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_code VARCHAR(3);
    v_attempts INT := 0;
    v_len INT := 3;
    v_collision BOOLEAN;
BEGIN
    -- Acquire advisory lock for user code allocation namespace (key 94821)
    PERFORM pg_advisory_xact_lock(94821);

    LOOP
        v_attempts := v_attempts + 1;
        v_code := '';
        
        -- Length selection strategy:
        -- Attempts 1-50: try 2-character permutations (pool: 1,024)
        -- Attempts 51+: switch to 3-character permutations (pool: 32,768)
        IF v_attempts <= 50 THEN
            v_len := 2;
        ELSE
            v_len := 3;
        END IF;

        FOR i IN 1..v_len LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;

        -- Check existence in profiles and burned codes simultaneously
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE user_code = v_code
            UNION ALL
            SELECT 1 FROM public.burned_user_codes WHERE user_code = v_code
        ) INTO v_collision;

        IF NOT v_collision THEN
            RETURN v_code;
        END IF;

        IF v_attempts > 1000 THEN
            RAISE EXCEPTION 'ERR_ZYVORA_USER_CODE_CAPACITY_EXHAUSTED: Kapasitas namespace Kode User 2-3 karakter (% percobaan tabrakan). Eskalasi arsitektur ke 4 karakter diperlukan.', v_attempts;
        END IF;
    END LOOP;
END;
$$;

-- Generator is an internal utility: revoke from PUBLIC and anon; only authenticated callers may invoke it
REVOKE ALL ON FUNCTION public.generate_concurrency_safe_user_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_concurrency_safe_user_code() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_concurrency_safe_user_code() TO authenticated;

-- Public safe validator RPC: allows authorized checking of a single code availability without table dump
CREATE OR REPLACE FUNCTION public.is_user_code_available(p_code VARCHAR(3))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_code IS NULL OR p_code !~ '^[2-9A-HJ-NP-Z]{2,3}$' THEN
        RETURN FALSE;
    END IF;

    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_code = p_code
        UNION ALL
        SELECT 1 FROM public.burned_user_codes WHERE user_code = p_code
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_user_code_available(VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_code_available(VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_user_code_available(VARCHAR) TO authenticated;

-- --------------------------------------------------------------------
-- 6. STORED PROCEDURE: ASSIGN USER ROLE (BACKEND AUTHORIZATION & AUDIT)
-- Hardened against race conditions via advisory lock 94820 & row locks
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_user_role(
    p_target_user_id UUID,
    p_tenant_id UUID,
    p_new_role VARCHAR(32),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_actor_code VARCHAR(3);
    v_prev_role VARCHAR(32);
    v_target_name TEXT;
    v_target_code VARCHAR(3);
    v_super_admin_count INT;
    v_tenant_exists BOOLEAN;
BEGIN
    -- 1. Security Check: Actor MUST be Platform Super Admin
    IF NOT public.is_platform_super_admin(v_actor_id) THEN
        RAISE EXCEPTION 'ERR_ZYVORA_FORBIDDEN: Hanya Super Admin Platform yang berwenang menetapkan Role pengguna.';
    END IF;

    -- 2. Validate Tenant Existence
    SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) INTO v_tenant_exists;
    IF NOT v_tenant_exists THEN
        RAISE EXCEPTION 'ERR_ZYVORA_TENANT_NOT_FOUND: Tenant dengan ID [%] tidak ditemukan.', p_tenant_id;
    END IF;

    -- 3. Validate Role is an Official Role (Section 3: 5 Official Roles)
    IF p_new_role NOT IN ('super_admin', 'owner', 'admin', 'sales', 'customer') THEN
        RAISE EXCEPTION 'ERR_ZYVORA_INVALID_ROLE: Role tidak valid: [%]. Hanya 5 Role resmi Zyvora ERP yang diperbolehkan.', p_new_role;
    END IF;

    -- 4. Audit Reason Validation
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'ERR_ZYVORA_AUDIT_REASON_REQUIRED: Alasan perubahan Role wajib diisi minimal 5 karakter untuk audit trail resmi.';
    END IF;

    -- 5. Fetch Target Details
    SELECT full_name, user_code INTO v_target_name, v_target_code
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF v_target_name IS NULL THEN
        RAISE EXCEPTION 'ERR_ZYVORA_TARGET_USER_NOT_FOUND: Pengguna target [%] tidak ditemukan pada tabel profiles.', p_target_user_id;
    END IF;

    -- 6. Fetch Previous Role in Tenant
    SELECT role INTO v_prev_role
    FROM public.tenant_memberships
    WHERE user_id = p_target_user_id AND tenant_id = p_tenant_id;

    -- 7. CONCURRENCY-SAFE SUPER ADMIN ANTI-LOCKOUT DEFENSE
    -- Acquire exclusive advisory lock 94820 to serialize concurrent Super Admin demotions
    PERFORM pg_advisory_xact_lock(94820);

    -- Lock active platform_super_admin rows for update
    PERFORM 1 FROM public.platform_super_admins WHERE is_active = TRUE FOR UPDATE;

    IF p_new_role <> 'super_admin' AND EXISTS (
        SELECT 1 FROM public.platform_super_admins WHERE user_id = p_target_user_id AND is_active = TRUE
    ) THEN
        SELECT count(*) INTO v_super_admin_count
        FROM public.platform_super_admins
        WHERE is_active = TRUE;

        IF v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'ERR_ZYVORA_CANNOT_DEMOTE_LAST_SUPER_ADMIN: Tidak dapat mengubah Role Super Admin terakhir. Sistem wajib mempertahankan minimal 1 Super Admin Platform aktif.';
        END IF;

        -- Deactivate platform super admin record if moving to tenant-only role
        UPDATE public.platform_super_admins
        SET is_active = FALSE
        WHERE user_id = p_target_user_id;
    END IF;

    -- If elevating to Super Admin, add to platform_super_admins
    IF p_new_role = 'super_admin' THEN
        INSERT INTO public.platform_super_admins (user_id, granted_by, is_active, notes)
        VALUES (p_target_user_id, v_actor_id, TRUE, p_reason)
        ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, notes = p_reason;
    END IF;

    -- 8. Update or Insert Tenant Membership Role
    INSERT INTO public.tenant_memberships (user_id, tenant_id, role, status)
    VALUES (p_target_user_id, p_tenant_id, p_new_role, 'active')
    ON CONFLICT (user_id, tenant_id) 
    DO UPDATE SET role = p_new_role, status = 'active';

    -- 9. Fetch Actor Details for Audit Trail
    SELECT full_name, user_code INTO v_actor_name, v_actor_code 
    FROM public.profiles 
    WHERE id = v_actor_id;

    -- 10. Write Immutable Audit Log
    INSERT INTO public.audit_logs (
        tenant_id,
        actor_id,
        actor_name,
        actor_role,
        action,
        entity,
        entity_id,
        description
    ) VALUES (
        p_tenant_id,
        v_actor_id,
        COALESCE(v_actor_name, 'Platform Super Admin'),
        'super_admin',
        'UPDATE',
        'Settings',
        COALESCE(v_target_code, p_target_user_id::text),
        format('Perubahan Role: %s (%s) diubah dari [%s] menjadi [%s]. Alasan: %s',
               v_target_name, COALESCE(v_target_code, 'N/A'), COALESCE(v_prev_role, 'None'), p_new_role, p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_user_id,
        'user_code', v_target_code,
        'new_role', p_new_role,
        'message', format('Role pengguna %s (%s) berhasil diperbarui menjadi %s.', v_target_name, COALESCE(v_target_code, 'N/A'), p_new_role)
    );
END;
$$;

-- Restrict assign_user_role execution
REVOKE ALL ON FUNCTION public.assign_user_role(UUID, UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_user_role(UUID, UUID, VARCHAR, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 7. STORED PROCEDURE: TOGGLE USER STATUS (DEACTIVATION & CODE BURNING)
-- Hardened against race conditions via advisory lock 94820 & row locks
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_user_status(
    p_target_user_id UUID,
    p_tenant_id UUID,
    p_new_status VARCHAR(24),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_target_name TEXT;
    v_target_code VARCHAR(3);
    v_super_admin_count INT;
    v_tenant_exists BOOLEAN;
BEGIN
    -- 1. Security Check: Actor MUST be Platform Super Admin
    IF NOT public.is_platform_super_admin(v_actor_id) THEN
        RAISE EXCEPTION 'ERR_ZYVORA_FORBIDDEN: Hanya Super Admin Platform yang berwenang mengubah status akun pengguna.';
    END IF;

    -- 2. Validate Status Parameter
    IF p_new_status NOT IN ('active', 'inactive') THEN
        RAISE EXCEPTION 'ERR_ZYVORA_INVALID_STATUS: Status tidak valid: [%]. Nilai yang diizinkan hanya "active" atau "inactive".', p_new_status;
    END IF;

    -- 3. Validate Tenant Existence
    SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) INTO v_tenant_exists;
    IF NOT v_tenant_exists THEN
        RAISE EXCEPTION 'ERR_ZYVORA_TENANT_NOT_FOUND: Tenant dengan ID [%] tidak ditemukan.', p_tenant_id;
    END IF;

    -- 4. Fetch Target Profile
    SELECT full_name, user_code INTO v_target_name, v_target_code
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF v_target_name IS NULL THEN
        RAISE EXCEPTION 'ERR_ZYVORA_TARGET_USER_NOT_FOUND: Pengguna target [%] tidak ditemukan pada tabel profiles.', p_target_user_id;
    END IF;

    -- 5. CONCURRENCY-SAFE ANTI-LOCKOUT DEFENSE
    PERFORM pg_advisory_xact_lock(94820);
    PERFORM 1 FROM public.platform_super_admins WHERE is_active = TRUE FOR UPDATE;

    IF p_new_status = 'inactive' AND EXISTS (
        SELECT 1 FROM public.platform_super_admins WHERE user_id = p_target_user_id AND is_active = TRUE
    ) THEN
        SELECT count(*) INTO v_super_admin_count
        FROM public.platform_super_admins
        WHERE is_active = TRUE;

        IF v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'ERR_ZYVORA_CANNOT_DEACTIVATE_LAST_SUPER_ADMIN: Tidak dapat menonaktifkan Super Admin terakhir. Sistem wajib mempertahankan minimal 1 Super Admin Platform aktif.';
        END IF;

        -- Deactivate platform super admin record
        UPDATE public.platform_super_admins
        SET is_active = FALSE
        WHERE user_id = p_target_user_id;
    END IF;

    -- 6. Burn the User Code when deactivated (Invariant Section 4: Never recycle)
    IF p_new_status = 'inactive' AND v_target_code IS NOT NULL THEN
        INSERT INTO public.burned_user_codes (user_code, original_user_id, reason)
        VALUES (v_target_code, p_target_user_id, p_reason)
        ON CONFLICT (user_code) DO NOTHING;
    END IF;

    -- 7. Update Membership Status
    UPDATE public.tenant_memberships
    SET status = p_new_status
    WHERE user_id = p_target_user_id AND tenant_id = p_tenant_id;

    -- 8. Write Audit Log
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;

    INSERT INTO public.audit_logs (
        tenant_id,
        actor_id,
        actor_name,
        actor_role,
        action,
        entity,
        entity_id,
        description
    ) VALUES (
        p_tenant_id,
        v_actor_id,
        COALESCE(v_actor_name, 'Platform Super Admin'),
        'super_admin',
        'UPDATE',
        'Settings',
        COALESCE(v_target_code, p_target_user_id::text),
        format('%s akun %s (%s). Alasan: %s',
               CASE WHEN p_new_status = 'active' THEN 'Mengaktifkan kembali' ELSE 'Menonaktifkan' END,
               v_target_name, COALESCE(v_target_code, 'N/A'), p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_code', v_target_code,
        'status', p_new_status
    );
END;
$$;

-- Restrict toggle_user_status execution
REVOKE ALL ON FUNCTION public.toggle_user_status(UUID, UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_user_status(UUID, UUID, VARCHAR, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_user_status(UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 7B. REVOKE ANON ACCESS & GRANT LEAST-PRIVILEGE ON CORE TABLES
-- Temuan Supabase Aktual: Pastikan anon dicabut seluruh hak aksesnya,
-- dan authenticated hanya memiliki hak sesuai kebutuhan RLS.
-- --------------------------------------------------------------------
REVOKE ALL ON TABLE public.tenants FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.tenant_memberships FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.tenants TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.tenant_memberships TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- --------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR SECURING TABLES
-- --------------------------------------------------------------------

-- platform_super_admins policies
DROP POLICY IF EXISTS "super_admin_manage_platform_admins" ON public.platform_super_admins;
CREATE POLICY "super_admin_manage_platform_admins" ON public.platform_super_admins
    FOR ALL
    TO authenticated
    USING (public.is_platform_super_admin())
    WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS "users_read_own_super_admin_status" ON public.platform_super_admins;
CREATE POLICY "users_read_own_super_admin_status" ON public.platform_super_admins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- burned_user_codes policies (restricted to Super Admin only to prevent user enumeration)
DROP POLICY IF EXISTS "authenticated_read_burned_codes" ON public.burned_user_codes;
DROP POLICY IF EXISTS "super_admin_read_burned_codes" ON public.burned_user_codes;
CREATE POLICY "super_admin_read_burned_codes" ON public.burned_user_codes
    FOR SELECT
    TO authenticated
    USING (public.is_platform_super_admin());

-- profiles RLS: scoped SELECT to prevent cross-tenant user harvesting
-- DROP legacy simple policy discovered in Supabase audit ('users_read_own_profile')
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Pengguna dapat membaca profil miliknya sendiri
        id = auth.uid()
        -- 2. Platform Super Admin berhak membaca seluruh profil untuk administrasi
        OR public.is_platform_super_admin()
        -- 3. Anggota tenant hanya dapat melihat profil rekan satu tenant yang berstatus aktif
        OR EXISTS (
            SELECT 1 
            FROM public.tenant_memberships my_tm
            JOIN public.tenant_memberships peer_tm 
              ON my_tm.tenant_id = peer_tm.tenant_id
            WHERE my_tm.user_id = auth.uid() 
              AND my_tm.status = 'active'
              AND peer_tm.user_id = public.profiles.id
              AND peer_tm.status = 'active'
        )
    );

-- profiles update policy: allows users to update their own profile without recursive subquery
-- Server-side immutability of user_code is strictly enforced by trigger trg_profiles_user_code_immutable
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- tenant_memberships RLS: scoped SELECT to enforce multi-tenant isolation
DROP POLICY IF EXISTS "tenant_memberships_select_scoped" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_select_scoped" ON public.tenant_memberships
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Pengguna dapat melihat penugasan tenant miliknya sendiri
        user_id = auth.uid()
        -- 2. Platform Super Admin berhak melihat seluruh keanggotaan
        OR public.is_platform_super_admin()
        -- 3. Anggota tenant dapat melihat anggota lain dalam tenant yang sama
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships my_tm
            WHERE my_tm.user_id = auth.uid() 
              AND my_tm.tenant_id = public.tenant_memberships.tenant_id
              AND my_tm.status = 'active'
        )
    );

-- tenant_memberships role protection
-- Ensure tenant members cannot self-promote or update role directly without assign_user_role RPC
DROP POLICY IF EXISTS "tenant_memberships_deny_client_role_update" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_deny_client_role_update" ON public.tenant_memberships
    FOR UPDATE
    TO authenticated
    USING (public.is_platform_super_admin())
    WITH CHECK (public.is_platform_super_admin());

-- audit_logs RLS: scoped SELECT restricted to Super Admin and Tenant Owner/Admin
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_scoped" ON public.audit_logs;
CREATE POLICY "audit_logs_select_scoped" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_platform_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships my_tm
            WHERE my_tm.user_id = auth.uid()
              AND my_tm.tenant_id = public.audit_logs.tenant_id
              AND my_tm.status = 'active'
              AND my_tm.role IN ('owner', 'admin')
        )
    );

-- tenants RLS: scoped SELECT to enforce multi-tenant isolation
-- Platform Super Admin has platform-wide tenant visibility;
-- Tenant members can ONLY discover tenants where they have an active membership.
-- Avoids RLS recursion by querying tenant_memberships directly on user_id = auth.uid().
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_select_scoped" ON public.tenants;
CREATE POLICY "tenants_select_scoped" ON public.tenants
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Platform Super Admin berhak melihat seluruh tenant pada platform
        public.is_platform_super_admin()
        -- 2. Anggota tenant hanya dapat melihat tenant tempat ia memiliki keanggotaan aktif
        OR EXISTS (
            SELECT 1 
            FROM public.tenant_memberships tm
            WHERE tm.user_id = auth.uid()
              AND tm.tenant_id = public.tenants.id
              AND tm.status = 'active'
        )
    );

-- --------------------------------------------------------------------
-- 9. CANDIDATE SUPER ADMIN PLATFORM RESOLUTION PROCEDURE
-- PRODUCT OWNER DECISION — ZYVORA ERP 1.0.0 RE-DESIGN:
--   - Target Candidate Email: 'admin@yulovi.com' (Normalized lower/trim)
--   - Invariant 1: Exactly 1 auth.users record must exist (Anti-Lockout & Unambiguous Auth)
--   - Invariant 2: Candidate user_code must adhere to 32-safe-symbol charset [2-9A-HJ-NP-Z]{2,3}
--   - Invariant 3: Code must NOT exist in public.burned_user_codes or belong to another profile
--   - Invariant 4: Existing non-NULL user_code on candidate profile is preserved (Immutability)
--   - Invariant 5: If auth.users row is absent, RAISE EXCEPTION to force transaction ROLLBACK
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_candidate_email TEXT := lower(trim('admin@yulovi.com'));
    v_candidate_uuid UUID;
    v_auth_account_count INT;
    v_candidate_name TEXT := 'Platform Administrator';
    v_seed_code VARCHAR(3) := '2A'; -- Pre-flight runtime candidate seed code
    v_target_user_code VARCHAR(3);
    v_existing_profile_code VARCHAR(3);
    v_existing_profile_email TEXT;
    v_code_in_use_by_other BOOLEAN;
    v_code_burned BOOLEAN;
BEGIN
    -- 0. Concurrency Control: Serialize bootstrap against concurrent user code generation & super admin mutations
    -- Key 94820: Super Admin Mutation Mutex (kompatibel dengan assign_user_role & toggle_user_status)
    -- Key 94821: User Code Generation Mutex (kompatibel dengan generate_concurrency_safe_user_code)
    -- Urutan akuisisi seragam (94820 lalu 94821) mencegah deadlocks antar transaksi
    PERFORM pg_advisory_xact_lock(94820);
    PERFORM pg_advisory_xact_lock(94821);

    -- 1. Verifikasi keberadaan dan keunikan akun di auth.users (Anti-Lockout & Anti-Ambiguitas)
    SELECT count(*)
    INTO v_auth_account_count
    FROM auth.users
    WHERE lower(trim(email)) = v_candidate_email;

    IF v_auth_account_count = 0 THEN
        RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND: Akun Supabase Auth untuk email [%] belum terdaftar pada auth.users. Transaksi migrasi otomatis DIBATALKAN (ROLLBACK) untuk mencegah kondisi sistem tanpa Super Admin aktif. Prasyarat wajib: daftarkan akun kandidat di Supabase Auth sebelum mengeksekusi migrasi ini.', v_candidate_email;
    ELSIF v_auth_account_count > 1 THEN
        RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER: Ditemukan lebih dari 1 akun auth.users untuk email [%]. Transaksi migrasi DIBATALKAN (ROLLBACK) untuk mencegah ambiguitas identitas Super Admin.', v_candidate_email;
    END IF;

    SELECT id
    INTO v_candidate_uuid
    FROM auth.users
    WHERE lower(trim(email)) = v_candidate_email
    LIMIT 1;

    -- 2. Periksa apakah profil untuk UUID kandidat sudah ada di public.profiles
    SELECT user_code, email, full_name
    INTO v_existing_profile_code, v_existing_profile_email, v_candidate_name
    FROM public.profiles
    WHERE id = v_candidate_uuid;

    IF FOUND THEN
        -- Validasi konsistensi email jika profil sudah ada
        IF v_existing_profile_email IS NOT NULL AND lower(trim(v_existing_profile_email)) <> v_candidate_email THEN
            RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH: Profil existing untuk UUID [%] memiliki email [%] yang berbeda dari kandidat [%]. Transaksi DIBATALKAN.',
                v_candidate_uuid, v_existing_profile_email, v_candidate_email;
        END IF;

        -- Jika profil sudah memiliki user_code, terapkan asas imutabilitas
        IF v_existing_profile_code IS NOT NULL THEN
            -- Validasi format kode existing
            IF v_existing_profile_code !~ '^[2-9A-HJ-NP-Z]{2,3}$' THEN
                RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID: Profil existing memiliki user_code [%] yang melanggar aturan format 32-simbol aman. Transaksi DIBATALKAN.', v_existing_profile_code;
            END IF;

            -- Periksa apakah kode existing berada di burned_user_codes
            SELECT EXISTS (
                SELECT 1 FROM public.burned_user_codes WHERE user_code = v_existing_profile_code
            ) INTO v_code_burned;

            IF v_code_burned THEN
                RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED: Profil existing memiliki user_code [%] yang tercatat dalam daftar kode terbakar (burned). Transaksi DIBATALKAN.', v_existing_profile_code;
            END IF;

            v_target_user_code := v_existing_profile_code;
        ELSE
            -- Profil ada tetapi user_code NULL, gunakan seed_code
            v_target_user_code := v_seed_code;
        END IF;
    ELSE
        -- Profil belum ada, gunakan seed_code
        v_target_user_code := v_seed_code;
    END IF;

    -- 3. Jika kode yang akan digunakan belum terpasang pada profil kandidat, verifikasi ketersediaannya
    IF v_existing_profile_code IS NULL OR v_existing_profile_code <> v_target_user_code THEN
        -- Validasi format target kode
        IF v_target_user_code !~ '^[2-9A-HJ-NP-Z]{2,3}$' THEN
            RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_INVALID_CODE_FORMAT: Target kode [%] tidak mematuhi format 32-simbol aman (2-3 karakter [2-9A-HJ-NP-Z]). Transaksi DIBATALKAN.', v_target_user_code;
        END IF;

        -- Periksa apakah kode digunakan oleh profil lain
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE user_code = v_target_user_code AND id <> v_candidate_uuid
        ) INTO v_code_in_use_by_other;

        -- Periksa apakah kode ada di daftar burned
        SELECT EXISTS (
            SELECT 1 FROM public.burned_user_codes WHERE user_code = v_target_user_code
        ) INTO v_code_burned;

        IF v_code_in_use_by_other OR v_code_burned THEN
            RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE: Kode user [%] telah digunakan oleh profil lain atau berada dalam daftar kode terbakar (burned). Transaksi bootstrap DIBATALKAN untuk mencegah konflik keunikan dan alokasi kode sembarangan.', v_target_user_code;
        END IF;
    END IF;

    -- 4. Pastikan profil dibuat atau diperbarui dengan aman (tanpa menimpa kode non-null yang sah)
    INSERT INTO public.profiles (id, full_name, email, user_code)
    VALUES (v_candidate_uuid, COALESCE(v_candidate_name, 'Platform Administrator'), v_candidate_email, v_target_user_code)
    ON CONFLICT (id) DO UPDATE SET 
        user_code = COALESCE(profiles.user_code, EXCLUDED.user_code),
        email = EXCLUDED.email;

    -- 5. Tetapkan hak Platform Super Admin pada tabel dedicated hanya untuk UUID yang telah diverifikasi
    INSERT INTO public.platform_super_admins (user_id, is_active, notes)
    VALUES (v_candidate_uuid, TRUE, 'Designated Platform Super Admin bootstrap for admin@yulovi.com')
    ON CONFLICT (user_id) DO UPDATE SET 
        is_active = TRUE,
        notes = 'Designated Platform Super Admin bootstrap for admin@yulovi.com';

    RAISE NOTICE 'STATUS: SUPER ADMIN DIVERIFIKASI DAN DITAUTKAN. UUID: % (Email: %, Kode: %)', 
                 v_candidate_uuid, v_candidate_email, v_target_user_code;
END $$;

COMMIT;

-- ====================================================================
-- LAMPIRAN: STRATEGI PEMULIHAN & ROLLBACK
-- (DISUSUN HANYA UNTUK DOKUMENTASI DAN TINJAUAN — JANGAN DIJALANKAN)
-- ====================================================================
--
-- LEVEL 1: ROLLBACK TRANSAKSI OTOMATIS (Pre-Commit Failure)
-- Jika terjadi error sintaksis, pelanggaran constraint, atau jika akun Supabase Auth
-- kandidat belum terdaftar (ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND),
-- PostgreSQL secara otomatis menjalankan ROLLBACK transaksi secara penuh.
-- Database kembali 100% ke kondisi awal tanpa ada perubahan parsial.
--
-- LEVEL 2: COMPENSATING ROLLBACK PASCA-COMMIT (Post-Commit Emergency Recovery)
-- PERINGATAN KERAS: Skrip di bawah ini adalah compensating script destruktif.
-- Menjalankan DROP TABLE akan MENGHAPUS SELURUH METADATA KEAMANAN SECARA PERMANEN,
-- termasuk riwayat kode terbakar (burned_user_codes) dan wewenang Super Admin.
-- JANGAN PERNAH DIJALANKAN PADA DATABASE PRODUKSI YANG MEMILIKI DATA AKTIF!
--
/*
BEGIN;

-- 1. Drop Triggers on profiles
DROP TRIGGER IF EXISTS trg_profiles_user_code_immutable ON public.profiles;
DROP FUNCTION IF EXISTS public.trg_enforce_profiles_user_code_immutable();
DROP TRIGGER IF EXISTS trg_profiles_burn_code_on_delete ON public.profiles;
DROP FUNCTION IF EXISTS public.trg_burn_user_code_on_profile_delete();

-- 2. Drop RLS Policies
DROP POLICY IF EXISTS "super_admin_manage_platform_admins" ON public.platform_super_admins;
DROP POLICY IF EXISTS "users_read_own_super_admin_status" ON public.platform_super_admins;
DROP POLICY IF EXISTS "super_admin_read_burned_codes" ON public.burned_user_codes;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "tenant_memberships_select_scoped" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_deny_client_role_update" ON public.tenant_memberships;
DROP POLICY IF EXISTS "audit_logs_select_scoped" ON public.audit_logs;
DROP POLICY IF EXISTS "tenants_select_scoped" ON public.tenants;

-- 3. Drop RPC Functions
DROP FUNCTION IF EXISTS public.is_user_code_available(VARCHAR);
DROP FUNCTION IF EXISTS public.toggle_user_status(UUID, UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.assign_user_role(UUID, UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.generate_concurrency_safe_user_code();
DROP FUNCTION IF EXISTS public.is_platform_super_admin(UUID);
DROP FUNCTION IF EXISTS public.is_platform_super_admin();

-- 4. Drop Security Tables (DESTRUCTIVE: Menghapus metadata wewenang dan riwayat kode terbakar)
DROP TABLE IF EXISTS public.burned_user_codes;
DROP TABLE IF EXISTS public.platform_super_admins;

-- 5. Drop Constraints and Indexes
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_user_code_safe_alphabet_chk;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_user_code_unique;
DROP INDEX IF EXISTS public.idx_profiles_user_code;
ALTER TABLE IF EXISTS public.tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_role_chk;
ALTER TABLE IF EXISTS public.tenant_memberships ALTER COLUMN role SET DEFAULT 'sales_rep';

-- 6. Restore legacy basic profile policy if needed
CREATE POLICY "users_read_own_profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
-- Kolom user_code dipertahankan secara default agar tidak terjadi data loss:
-- ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS user_code;

COMMIT;
*/
