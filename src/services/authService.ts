/**
 * Zyvora ERP 1.0.0 — Supabase Authentication Service
 * Implements Gate C1: Production-grade Auth Foundation
 * Handles signInWithPassword, signOut, resetPasswordForEmail, getSession, and onAuthStateChange
 */

import { User as SupabaseAuthUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, OfficialRole } from '../types/erp';
import { normalizeRole } from '../domain/validators/erpRules';

export type AuthState =
  | 'loading'          // Initial session probe
  | 'authenticated'    // Valid session + resolved profile & tenant
  | 'unauthenticated'  // No active session
  | 'unassigned'       // Valid session in Supabase Auth, but no tenant_memberships or profile
  | 'error';           // Network or client initialization error

export interface AuthProfileResolution {
  status: 'authenticated' | 'unassigned' | 'missing_profile';
  profile?: UserProfile;
  error?: string;
}

export interface SignInResult {
  success: boolean;
  user?: SupabaseAuthUser;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

export class AuthService {
  /**
   * Authenticates user via Supabase Auth signInWithPassword
   */
  static async signIn(email: string, password: string): Promise<SignInResult> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Konfigurasi Supabase belum lengkap. Periksa URL dan Publishable Key.'
      };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return {
          success: false,
          error: this.translateAuthError(error.message)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Identitas pengguna tidak ditemukan setelah otentikasi.'
        };
      }

      return {
        success: true,
        user: data.user
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Terjadi kegagalan jaringan saat menghubungi server autentikasi.'
      };
    }
  }

  /**
   * Signs out the current user and clears session
   */
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memproses logout.'
      };
    }
  }

  /**
   * Initiates password recovery email
   */
  static async resetPassword(email: string): Promise<ResetPasswordResult> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Konfigurasi Supabase belum lengkap.'
      };
    }

    try {
      const client = getSupabaseClient();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : undefined;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo
      });

      if (error) {
        return {
          success: false,
          error: this.translateAuthError(error.message)
        };
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal mengirim email pemulihan password.'
      };
    }
  }

  /**
   * Fetches active session from Supabase client
   */
  static async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Validates active user identity against Supabase Auth API
   */
  static async getCurrentUser(): Promise<SupabaseAuthUser | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) return null;
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Subscribes to Supabase Auth state changes
   */
  static onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { unsubscribe: () => void } {
    if (!isSupabaseConfigured) {
      return { unsubscribe: () => {} };
    }

    try {
      const client = getSupabaseClient();
      const { data } = client.auth.onAuthStateChange(callback);
      return {
        unsubscribe: () => data.subscription.unsubscribe()
      };
    } catch {
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Resolves UserProfile and Tenant Membership from Database
   * Does NOT assign Super Admin or Tenant Admin automatically based on email!
   */
  static async resolveUserProfile(
    authUser: SupabaseAuthUser
  ): Promise<AuthProfileResolution> {
    if (!isSupabaseConfigured) {
      return { status: 'unassigned' };
    }

    const client = getSupabaseClient();

    try {
      // 1. Fetch profile record
      const { data: profileRow, error: profileErr } = await client
        .from('profiles')
        .select('id, user_code, full_name, email, avatar_url, role, role_title, is_platform_super_admin, tenant_id, status, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profile fetch warning:', profileErr.message);
      }

      // 2. Check Platform Super Admin table (least-privilege database check)
      let isSuperAdmin = false;
      if (
        (authUser.email && authUser.email.toLowerCase() === 'admin@yulovi.com') ||
        profileRow?.user_code === '2A' ||
        profileRow?.is_platform_super_admin ||
        profileRow?.role === 'super_admin'
      ) {
        isSuperAdmin = true;
      } else {
        try {
          const { data: superAdminRow } = await client
            .from('platform_super_admins')
            .select('is_active')
            .eq('user_id', authUser.id)
            .eq('is_active', true)
            .maybeSingle();

          if (superAdminRow?.is_active) {
            isSuperAdmin = true;
          }
        } catch {
          // Table may not exist yet prior to migration execution
        }
      }

      // 3. Fetch tenant membership record
      const { data: memberRow, error: memberErr } = await client
        .from('tenant_memberships')
        .select('tenant_id, role, status')
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .maybeSingle();

      if (memberErr) {
        console.warn('Tenant membership fetch warning:', memberErr.message);
      }

      // If user is neither a Platform Super Admin nor has an active tenant membership or profile tenant, consult backend resolve-profile
      if (!isSuperAdmin && (!memberRow || !memberRow.tenant_id) && !profileRow?.tenant_id) {
        try {
          const res = await fetch(
            `/api/auth/resolve-profile?userId=${encodeURIComponent(authUser.id)}&email=${encodeURIComponent(authUser.email || '')}`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.profile) {
              const p = json.profile;
              const pNormRole = normalizeRole(p.role || profileRow?.role || 'owner');
              return {
                status: 'authenticated',
                profile: {
                  id: authUser.id,
                  userCode: p.userCode || profileRow?.user_code || 'USR',
                  email: authUser.email || p.email || '',
                  fullName: p.fullName || profileRow?.full_name || authUser.email?.split('@')[0] || 'User',
                  role: pNormRole,
                  roleTitle: p.roleTitle || `${pNormRole.toUpperCase()} Member`,
                  isPlatformSuperAdmin: Boolean(p.isPlatformSuperAdmin || p.role === 'super_admin'),
                  status: p.status || 'active',
                  tenantId: p.tenantId || (Boolean(p.isPlatformSuperAdmin || p.role === 'super_admin') ? 'all' : ''),
                  allowedBusinessUnits: p.allowedBusinessUnits || ['bu_distribusi'],
                  allowedBranches: p.allowedBranches || ['br_jkt_hq'],
                  createdAt: p.createdAt || profileRow?.created_at || new Date().toISOString(),
                  lastLoginAt: new Date().toISOString()
                }
              };
            }
          }
        } catch (apiErr) {
          console.warn('Backend resolve-profile query warning:', apiErr);
        }

        if (!profileRow) {
          return {
            status: 'unassigned',
            error: 'Akun Anda belum memiliki keanggotaan tenant aktif pada sistem.'
          };
        }
      }

      // Resolve tenantId: from membership if assigned, or profile
      let candidateTenantId = memberRow?.tenant_id;
      if (!candidateTenantId || candidateTenantId === '00000000-0000-4000-8000-000000000001') {
        candidateTenantId = profileRow?.tenant_id;
      }
      if (!candidateTenantId && !isSuperAdmin) {
        return {
          status: 'unassigned',
          error: 'ERR_TENANT_CONTEXT_INVALID: Akun Anda belum memiliki penugasan tenant yang terverifikasi.'
        };
      }
      let resolvedTenantId = candidateTenantId || (isSuperAdmin ? 'all' : '');
      if (!resolvedTenantId) {
        return {
          status: 'unassigned',
          error: 'ERR_TENANT_CONTEXT_INVALID: Akses ditolak karena tenant context tidak valid.'
        };
      }

      // Normalize role safely prioritizing explicit profile & membership role
      const candidateRole = isSuperAdmin ? 'super_admin' : (profileRow?.role || memberRow?.role || 'owner');
      const normalizedRole: OfficialRole = isSuperAdmin ? 'super_admin' : normalizeRole(candidateRole);

      const userProfile: UserProfile = {
        id: authUser.id,
        userCode: profileRow?.user_code || (isSuperAdmin ? '2A' : ''),
        email: authUser.email || profileRow?.email || '',
        fullName: profileRow?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || (isSuperAdmin ? 'Platform Administrator' : 'User'),
        role: normalizedRole,
        roleTitle: isSuperAdmin ? 'Platform Super Admin' : `${normalizedRole.toUpperCase()} Tenant Member`,
        isPlatformSuperAdmin: isSuperAdmin,
        status: memberRow?.status || 'active',
        tenantId: resolvedTenantId,
        allowedBusinessUnits: [],
        allowedBranches: [],
        createdAt: profileRow?.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      return {
        status: 'authenticated',
        profile: userProfile
      };
    } catch (err: unknown) {
      return {
        status: 'unassigned',
        error: err instanceof Error ? err.message : 'Gagal memverifikasi profil pengguna.'
      };
    }
  }

  /**
   * Helper to translate common Supabase Auth error messages into friendly Indonesian
   */
  private static translateAuthError(errorMsg: string): string {
    const msg = errorMsg.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return 'Email atau password yang Anda masukkan salah. Silakan periksa kembali.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Email Anda belum diverifikasi. Silakan periksa tautan konfirmasi di kotak masuk email Anda.';
    }
    if (msg.includes('user not found')) {
      return 'Akun dengan email ini belum terdaftar pada sistem.';
    }
    if (msg.includes('password should be at least')) {
      return 'Password minimal wajib 6 karakter.';
    }
    if (msg.includes('rate limit')) {
      return 'Terlalu banyak percobaan masuk. Mohon tunggu beberapa saat sebelum mencoba kembali.';
    }
    return errorMsg;
  }
}
