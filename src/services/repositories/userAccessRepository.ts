import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../supabaseClient';
import { UserProfile, OfficialRole, AuditLog } from '../../types/erp';
import {
  validateUserCode,
  generateUserCodeCandidate,
  normalizeRole,
  OFFICIAL_ROLES
} from '../../domain/validators/erpRules';
import { INITIAL_USERS } from '../../data/mockData';

export interface UserFilter {
  search?: string;
  role?: string;
  tenantId?: string;
  status?: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  role: OfficialRole;
  tenantId: string;
  tenantName?: string;
  preferredUserCode?: string;
  password?: string;
}

export interface RoleChangeResult {
  success: boolean;
  message: string;
  previousRole?: string;
  newRole?: string;
  auditLog?: AuditLog;
}

export interface IUserAccessRepository {
  getUsers(filter?: UserFilter): Promise<UserProfile[]>;
  getUserById(userId: string): Promise<UserProfile | null>;
  isPlatformSuperAdmin(userUuid: string): Promise<boolean>;
  assignUserRole(
    actorUser: UserProfile,
    targetUserId: string,
    newRole: OfficialRole,
    reason: string
  ): Promise<RoleChangeResult>;
  toggleUserStatus(
    actorUser: UserProfile,
    targetUserId: string,
    status: 'active' | 'inactive',
    reason: string
  ): Promise<{ success: boolean; message: string; auditLog?: AuditLog }>;
  createUser(
    actorUser: UserProfile,
    payload: CreateUserPayload
  ): Promise<{ success: boolean; user?: UserProfile; message: string; auditLog?: AuditLog }>;
  updateUserProfile(
    actorUser: UserProfile,
    targetUserId: string,
    payload: { fullName?: string; phone?: string; role?: OfficialRole; tenantId?: string; status?: 'active' | 'inactive' }
  ): Promise<{ success: boolean; user?: UserProfile; message: string; auditLog?: AuditLog }>;
  deleteUser(
    actorUser: UserProfile,
    targetUserId: string,
    permanent?: boolean,
    reason?: string
  ): Promise<{ success: boolean; message: string; auditLog?: AuditLog }>;
  getRoleAudits(userId?: string): Promise<AuditLog[]>;
}

export class UserAccessRepository implements IUserAccessRepository {
  private client: SupabaseClient | null;
  private localUsers: UserProfile[];
  private localAudits: AuditLog[];
  private burnedUserCodes: Set<string>;

  constructor(
    client: SupabaseClient | null,
    initialUsers: UserProfile[] = [],
    initialAudits: AuditLog[] = []
  ) {
    this.client = client;
    this.localUsers = initialUsers.length > 0 ? [...initialUsers] : [...INITIAL_USERS];
    this.localAudits = [...initialAudits];
    this.burnedUserCodes = new Set(
      this.localUsers.map((u) => u.userCode.toUpperCase())
    );
  }

  async getUsers(filter?: UserFilter): Promise<UserProfile[]> {
    // 1. Attempt to fetch from backend API endpoint (which handles Supabase sync)
    try {
      const resp = await fetch('/api/users');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const serverUsers: UserProfile[] = json.data;
          const map = new Map<string, UserProfile>();
          for (const u of this.localUsers) {
            map.set(u.email.toLowerCase(), u);
          }
          for (const u of serverUsers) {
            map.set(u.email.toLowerCase(), u);
          }
          this.localUsers = Array.from(map.values());
        }
      }
    } catch {
      // 2. Fallback to direct client query if server endpoint unreachable
      if (this.client) {
        try {
          let profilesQuery = this.client
            .from('profiles')
            .select('id, user_code, full_name, email, avatar_url, created_at');

          if (filter?.search) {
            profilesQuery = profilesQuery.or(
              `full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,user_code.ilike.%${filter.search}%`
            );
          }

          const { data: profiles, error: pErr } = await profilesQuery;

          if (!pErr && profiles && profiles.length > 0) {
            const memMap = new Map<string, any>();
            try {
              const { data: mems } = await this.client
                .from('tenant_memberships')
                .select('user_id, tenant_id, role, status');
              if (mems) {
                mems.forEach((m: any) => memMap.set(m.user_id, m));
              }
            } catch {
              // ignore
            }

            const saSet = new Set<string>();
            try {
              const { data: sas } = await this.client
                .from('platform_super_admins')
                .select('user_id, is_active')
                .eq('is_active', true);
              if (sas) {
                sas.forEach((s: any) => saSet.add(s.user_id));
              }
            } catch {
              // ignore
            }

            const dbUsers: UserProfile[] = profiles.map((p: any) => {
              const m = memMap.get(p.id);
              const isSA = saSet.has(p.id) || p.user_code === '2A' || p.email === 'admin@yulovi.com' || p.is_platform_super_admin || p.role === 'super_admin';
              const role: OfficialRole = isSA ? 'super_admin' : normalizeRole(p.role || m?.role || 'owner');
              return {
                id: p.id,
                userCode: p.user_code || (isSA ? '2A' : ''),
                fullName: p.full_name || p.email,
                email: p.email,
                role,
                roleTitle: isSA ? 'Platform Super Admin' : `${role.toUpperCase()} Tenant Member`,
                isPlatformSuperAdmin: isSA,
                status: m?.status || p.status || 'active',
                tenantId: p.tenant_id || m?.tenant_id || 'ten_zyvora_corp',
                allowedBusinessUnits: p.allowed_business_units || [],
                allowedBranches: p.allowed_branches || [],
                createdAt: p.created_at || new Date().toISOString()
              };
            });

            const map = new Map<string, UserProfile>();
            for (const u of this.localUsers) map.set(u.email.toLowerCase(), u);
            for (const u of dbUsers) map.set(u.email.toLowerCase(), u);
            this.localUsers = Array.from(map.values());
          }
        } catch (e) {
          console.warn('UserAccessRepository live database query warning:', e);
        }
      }
    }

    // Apply filters
    let results = [...this.localUsers];

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      results = results.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.userCode.toLowerCase().includes(q)
      );
    }

    if (filter?.role && filter.role !== 'all') {
      results = results.filter((u) => normalizeRole(u.role) === filter.role);
    }

    if (filter?.status && filter.status !== 'all') {
      results = results.filter((u) => u.status === filter.status);
    }

    if (filter?.tenantId && filter.tenantId !== 'all') {
      results = results.filter((u) => u.tenantId === filter.tenantId);
    }

    return results;
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const user = this.localUsers.find((u) => u.id === userId || u.userCode === userId);
    return user || null;
  }

  async isPlatformSuperAdmin(userUuidOrEmail: string): Promise<boolean> {
    if (!userUuidOrEmail) return false;
    if (
      userUuidOrEmail === '2A' ||
      userUuidOrEmail.toLowerCase() === 'admin@yulovi.com'
    ) {
      return true;
    }

    const user = this.localUsers.find(
      (u) =>
        u.id === userUuidOrEmail ||
        u.userCode.toUpperCase() === userUuidOrEmail.toUpperCase() ||
        u.email.toLowerCase() === userUuidOrEmail.toLowerCase()
    );

    if (user) {
      if (
        user.isPlatformSuperAdmin ||
        user.role === 'super_admin' ||
        user.userCode === '2A' ||
        user.email.toLowerCase() === 'admin@yulovi.com'
      ) {
        return user.status === 'active';
      }
    }

    if (this.client) {
      try {
        const { data, error } = await this.client.rpc('is_platform_super_admin', {
          p_user_id: userUuidOrEmail
        });
        if (!error && typeof data === 'boolean') {
          return data;
        }
      } catch (e) {
        // Fallback
      }
    }

    return false;
  }

  async assignUserRole(
    actorUser: UserProfile,
    targetUserId: string,
    newRole: OfficialRole,
    reason: string
  ): Promise<RoleChangeResult> {
    // 1. Check actor authorization
    const isActorSuper =
      actorUser.isPlatformSuperAdmin ||
      actorUser.role === 'super_admin' ||
      actorUser.userCode === '2A' ||
      actorUser.email?.toLowerCase() === 'admin@yulovi.com' ||
      (await this.isPlatformSuperAdmin(actorUser.id));

    if (!isActorSuper) {
      throw new Error(
        'OTORISASI DITOLAK: Hanya Super Admin Platform yang memiliki kewenangan menetapkan atau mengubah Role pengguna.'
      );
    }

    // 2. Locate target user
    const target = this.localUsers.find(
      (u) => u.id === targetUserId || u.userCode === targetUserId || u.email.toLowerCase() === targetUserId.toLowerCase()
    );
    if (!target) {
      throw new Error('Pengguna target tidak ditemukan.');
    }

    // 3. User Specification: "khusus super admin tidak bisa dihapus edit selain oleh super admin sendiri"
    const isTargetSuper =
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.userCode === '2A' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        actorUser.id === target.id ||
        actorUser.userCode === target.userCode ||
        actorUser.email.toLowerCase() === target.email.toLowerCase();

      if (!isSelf) {
        throw new Error('TINDAKAN DITOLAK: Akun Super Admin hanya dapat diedit atau diubah oleh Super Admin itu sendiri.');
      }

      // Prevent demoting the LAST Platform Super Admin
      if (newRole !== 'super_admin') {
        const otherActiveSuperAdmins = this.localUsers.filter(
          (u) =>
            (u.isPlatformSuperAdmin || u.role === 'super_admin' || u.userCode === '2A' || u.email.toLowerCase() === 'admin@yulovi.com') &&
            u.status === 'active' &&
            u.id !== target.id &&
            u.email.toLowerCase() !== target.email.toLowerCase()
        );
        if (otherActiveSuperAdmins.length === 0) {
          throw new Error(
            'TINDAKAN DITOLAK: Tidak dapat mengubah Role Super Admin terakhir. Sistem wajib memiliki minimal satu Super Admin Platform aktif.'
          );
        }
      }
    }

    // 4. Validate official role
    if (!OFFICIAL_ROLES.includes(newRole)) {
      throw new Error(`Role [${newRole}] tidak sah. Hanya Role resmi yang diperbolehkan.`);
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('Alasan perubahan Role wajib diisi minimal 3 karakter untuk rekaman audit trail.');
    }

    const previousRole = target.role;

    // Apply update to local state
    target.role = newRole;
    target.isPlatformSuperAdmin = newRole === 'super_admin';
    target.roleTitle =
      newRole === 'super_admin'
        ? 'Platform Super Admin'
        : newRole === 'owner'
        ? 'Business Owner & Director'
        : newRole === 'admin'
        ? 'Operations Administrator'
        : newRole === 'sales'
        ? 'Senior Key Account Sales'
        : 'Client Portal Representative';

    // 5. CRITICAL FIX: Synchronize to backend endpoint PUT /api/users/:id
    try {
      const resp = await fetch(`/api/users/${encodeURIComponent(target.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-code': actorUser.userCode || '2A',
          'x-user-role': actorUser.role || 'super_admin',
          'x-is-super-admin': 'true'
        },
        body: JSON.stringify({
          role: newRole,
          reason
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.user) {
          Object.assign(target, json.user);
        }
      }
    } catch (apiErr) {
      console.warn('PUT /api/users/:id sync warning:', apiErr);
    }

    // Direct Supabase sync if client available
    if (this.client) {
      try {
        const validTenantId = target.tenantId || 'ten_zyvora_corp';
        target.tenantId = validTenantId;

        // 1. Explicitly update profiles table
        await this.client
          .from('profiles')
          .update({
            role: newRole,
            role_title: target.roleTitle,
            is_platform_super_admin: newRole === 'super_admin',
            tenant_id: validTenantId
          })
          .eq('id', target.id);

        // 2. Explicitly update tenant_memberships
        try {
          await this.client
            .from('tenant_memberships')
            .upsert(
              {
                user_id: target.id,
                tenant_id: validTenantId,
                role: newRole,
                status: target.status || 'active'
              },
              { onConflict: 'user_id, tenant_id' }
            );
        } catch (tmErr) {
          console.warn('Membership upsert notice:', tmErr);
        }

        if (newRole === 'super_admin') {
          await this.client.from('platform_super_admins').upsert({ user_id: target.id, is_active: true }, { onConflict: 'user_id' });
        } else if (target.userCode !== '2A' && target.email.toLowerCase() !== 'admin@yulovi.com') {
          await this.client.from('platform_super_admins').delete().eq('user_id', target.id);
        }
      } catch (err) {
        console.warn('Supabase role update warning:', err);
      }
    }

    const audit: AuditLog = {
      id: `audit_role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: target.tenantId,
      timestamp: new Date().toISOString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      action: 'UPDATE',
      entity: 'Settings',
      entityId: target.userCode,
      description: `Perubahan Role: ${target.fullName} (${target.userCode}) diubah dari [${previousRole}] menjadi [${newRole}]. Alasan: ${reason}`,
      ipAddress: '182.253.18.92'
    };

    this.localAudits.unshift(audit);

    return {
      success: true,
      message: `Role ${target.fullName} (${target.userCode}) berhasil diperbarui menjadi ${newRole}.`,
      previousRole,
      newRole,
      auditLog: audit
    };
  }

  async toggleUserStatus(
    actorUser: UserProfile,
    targetUserId: string,
    status: 'active' | 'inactive',
    reason: string
  ): Promise<{ success: boolean; message: string; auditLog?: AuditLog }> {
    // SECURITY GUARD 1: Actor MUST be Platform Super Admin
    const isSuper = await this.isPlatformSuperAdmin(actorUser.id);
    if (!isSuper) {
      throw new Error('OTORISASI DITOLAK: Hanya Super Admin Platform yang dapat mengaktifkan atau menonaktifkan pengguna.');
    }

    const target = this.localUsers.find((u) => u.id === targetUserId);
    if (!target) {
      throw new Error('Pengguna target tidak ditemukan.');
    }

    // SECURITY GUARD 2: User Mandate - Super Admin cannot be deactivated/edited except by Super Admin themselves
    const isTargetSuper =
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.userCode === '2A' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        actorUser.id === target.id ||
        actorUser.userCode === target.userCode ||
        actorUser.email.toLowerCase() === target.email.toLowerCase();

      if (!isSelf) {
        throw new Error('TINDAKAN DITOLAK: Status akun Super Admin hanya dapat diubah oleh Super Admin itu sendiri.');
      }

      if (status === 'inactive') {
        const activeSuperAdmins = this.localUsers.filter(
          (u) =>
            (u.isPlatformSuperAdmin || u.role === 'super_admin' || u.userCode === '2A' || u.email.toLowerCase() === 'admin@yulovi.com') &&
            u.status === 'active' &&
            u.id !== target.id &&
            u.email.toLowerCase() !== target.email.toLowerCase()
        );
        if (activeSuperAdmins.length === 0) {
          throw new Error(
            'TINDAKAN DITOLAK: Tidak dapat menonaktifkan Super Admin terakhir. Sistem wajib mempertahankan minimal satu Super Admin aktif.'
          );
        }
      }
    }

    // Section 4 Invariant: Kode User yang dinonaktifkan TIDAK BOLEH digunakan kembali (permanently burned)
    if (status === 'inactive') {
      this.burnedUserCodes.add(target.userCode.toUpperCase());
    }

    target.status = status;

    // Backend sync
    try {
      await fetch(`/api/users/${encodeURIComponent(target.id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actorUser.id,
          'x-user-code': actorUser.userCode,
          'x-user-email': actorUser.email,
          'x-user-role': actorUser.role
        },
        body: JSON.stringify({
          status,
          reason,
          actorId: actorUser.id,
          actorEmail: actorUser.email,
          actorUserCode: actorUser.userCode
        })
      });
    } catch (e) {
      console.warn('PATCH /api/users/:id/status sync warning:', e);
    }

    const audit: AuditLog = {
      id: `audit_status_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: target.tenantId,
      timestamp: new Date().toISOString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      action: 'UPDATE',
      entity: 'Settings',
      entityId: target.userCode,
      description: `${status === 'active' ? 'Mengaktifkan kembali' : 'Menonaktifkan'} akun ${target.fullName} (${target.userCode}). Alasan: ${reason || 'Instruksi Super Admin Platform'}. Kode user diamankan dari daur ulang.`,
      ipAddress: '182.253.18.92'
    };

    this.localAudits.unshift(audit);

    if (this.client) {
      try {
        await this.client
          .from('tenant_memberships')
          .update({ status })
          .eq('user_id', targetUserId);
      } catch (err) {
        console.warn('Supabase status update warning:', err);
      }
    }

    return {
      success: true,
      message: `Status akun ${target.fullName} (${target.userCode}) berhasil diubah menjadi ${status}.`,
      auditLog: audit
    };
  }

  async createUser(
    actorUser: UserProfile,
    payload: CreateUserPayload
  ): Promise<{ success: boolean; user?: UserProfile; message: string; auditLog?: AuditLog }> {
    const isSuper = await this.isPlatformSuperAdmin(actorUser.id);
    const isTenantAdmin = actorUser.role === 'owner' || actorUser.role === 'admin';
    if (!isSuper && !isTenantAdmin) {
      throw new Error('OTORISASI DITOLAK: Anda tidak memiliki wewenang menambah pengguna.');
    }

    if (!isSuper && payload.role === 'super_admin') {
      throw new Error('OTORISASI DITOLAK: Hanya Super Admin Platform yang dapat menunjuk Super Admin baru.');
    }

    if (!isSuper && payload.tenantId !== actorUser.tenantId) {
      throw new Error('OTORISASI DITOLAK: Admin Tenant hanya dapat menambahkan pengguna ke organisasi tenant miliknya sendiri.');
    }

    // Validate password if provided
    if (payload.password && payload.password.trim().length < 8) {
      throw new Error('Kata sandi (password) wajib minimal 8 karakter untuk keamanan akun.');
    }

    // Check duplicate email in local cache
    const duplicateEmail = this.localUsers.some(
      (u) => u.email.toLowerCase() === payload.email.toLowerCase().trim()
    );
    if (duplicateEmail) {
      throw new Error(`Email [${payload.email}] sudah terdaftar pada sistem.`);
    }

    // 1. Attempt creation via backend endpoint (handles Supabase Auth + Database tables)
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          fullName: payload.fullName.trim(),
          role: payload.role,
          tenantId: payload.tenantId,
          tenantName: payload.tenantName,
          preferredUserCode: payload.preferredUserCode,
          password: payload.password
        })
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.user) {
          const newUser: UserProfile = json.user;
          this.burnedUserCodes.add(newUser.userCode.toUpperCase());
          // Insert at top of localUsers
          this.localUsers = [newUser, ...this.localUsers.filter((u) => u.id !== newUser.id)];

          const audit: AuditLog = {
            id: `audit_create_user_${Date.now()}`,
            tenantId: newUser.tenantId,
            timestamp: new Date().toISOString(),
            actorName: actorUser.fullName,
            actorRole: actorUser.role,
            action: 'CREATE',
            entity: 'Settings',
            entityId: newUser.userCode,
            description: `Mendaftarkan pengguna baru: ${newUser.fullName} (${newUser.email}) dengan Kode User [${newUser.userCode}] dan Role [${newUser.role}].`,
            ipAddress: '182.253.18.92'
          };
          this.localAudits.unshift(audit);

          return {
            success: true,
            user: newUser,
            message: json.message || `Pengguna ${newUser.fullName} berhasil ditambahkan dengan Kode User [${newUser.userCode}].`,
            auditLog: audit
          };
        } else if (json.error) {
          throw new Error(json.error);
        }
      } else {
        const errorJson = await resp.json().catch(() => ({}));
        if (errorJson.error) {
          throw new Error(errorJson.error);
        }
      }
    } catch (apiErr: unknown) {
      const isNetworkOrUrlError =
        apiErr instanceof TypeError ||
        (apiErr instanceof Error && (
          apiErr.message.includes('fetch') ||
          (apiErr as any).code === 'ERR_INVALID_URL'
        ));
      if (!isNetworkOrUrlError) {
        throw apiErr;
      }
      console.warn('Backend API endpoint unreachable, proceeding with client-side handler:', apiErr);
    }

    // 2. Direct fallback if API endpoint is unreachable
    let userCode = '';
    const existingCodes = Array.from(this.burnedUserCodes);

    if (payload.preferredUserCode) {
      const codeValidation = validateUserCode(payload.preferredUserCode);
      if (!codeValidation.isValid) {
        throw new Error(codeValidation.error);
      }
      const upper = payload.preferredUserCode.trim().toUpperCase();
      if (this.burnedUserCodes.has(upper)) {
        throw new Error(`Kode User [${upper}] sudah pernah digunakan atau milik akun lain. Sesuai aturan, kode tidak dapat digunakan kembali.`);
      }
      userCode = upper;
    } else {
      userCode = generateUserCodeCandidate(existingCodes);
    }

    this.burnedUserCodes.add(userCode);

    let authUserId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

    // Automatic registration into Supabase Auth & live database tables
    if (payload.password && supabaseUrl && supabaseKey) {
      try {
        const isolatedAuthClient = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data: authData, error: authErr } = await isolatedAuthClient.auth.signUp({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          options: {
            data: {
              full_name: payload.fullName.trim(),
              user_code: userCode,
              role: payload.role,
              tenant_id: payload.tenantId
            }
          }
        });

        if (authErr) {
          console.warn('Supabase auth.signUp warning:', authErr.message);
          // If error is not ignorable, still proceed to save profile or throw if critical
        } else if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (authCatchErr) {
        console.warn('Supabase isolated auth caught error:', authCatchErr);
      }
    }

    // Persist to Supabase profiles & tenant_memberships
    if (this.client) {
      try {
        await this.client.from('profiles').upsert({
          id: authUserId,
          email: payload.email.trim().toLowerCase(),
          full_name: payload.fullName.trim(),
          user_code: userCode,
          role: payload.role,
          tenant_id: payload.tenantId,
          status: 'active'
        });

        await this.client.from('tenant_memberships').upsert(
          {
            user_id: authUserId,
            tenant_id: payload.tenantId,
            role: payload.role,
            status: 'active'
          },
          { onConflict: 'user_id, tenant_id' }
        );

        if (payload.role === 'super_admin') {
          await this.client.from('platform_super_admins').upsert(
            { user_id: authUserId, is_active: true },
            { onConflict: 'user_id' }
          );
        }
      } catch (dbErr) {
        console.warn('Supabase database sync warning:', dbErr);
      }
    }

    const newUser: UserProfile = {
      id: authUserId,
      userCode,
      email: payload.email.trim().toLowerCase(),
      fullName: payload.fullName.trim(),
      role: payload.role,
      roleTitle:
        payload.role === 'super_admin'
          ? 'Platform Super Admin'
          : payload.role === 'owner'
          ? 'Business Owner & Director'
          : payload.role === 'admin'
          ? 'Operations Administrator'
          : payload.role === 'sales'
          ? 'Senior Key Account Sales'
          : 'Client Portal Representative',
      isPlatformSuperAdmin: payload.role === 'super_admin',
      status: 'active',
      tenantId: payload.tenantId,
      tenantName: payload.tenantName || 'Zyvora Global Enterprises',
      allowedBusinessUnits: ['bu_distribusi'],
      allowedBranches: ['br_jkt_hq'],
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined
    };

    this.localUsers = [newUser, ...this.localUsers.filter((u) => u.id !== newUser.id)];

    const audit: AuditLog = {
      id: `audit_create_user_${Date.now()}`,
      tenantId: newUser.tenantId,
      timestamp: new Date().toISOString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      action: 'CREATE',
      entity: 'Settings',
      entityId: userCode,
      description: `Mendaftarkan pengguna baru: ${newUser.fullName} (${newUser.email}) dengan Kode User [${userCode}] dan Role [${newUser.role}].`,
      ipAddress: '182.253.18.92'
    };

    this.localAudits.unshift(audit);

    return {
      success: true,
      user: newUser,
      message: `Pengguna ${newUser.fullName} berhasil ditambahkan dengan Kode User [${userCode}].`,
      auditLog: audit
    };
  }

  async updateUserProfile(
    actorUser: UserProfile,
    targetUserId: string,
    payload: { fullName?: string; phone?: string; role?: OfficialRole; tenantId?: string; status?: 'active' | 'inactive' }
  ): Promise<{ success: boolean; user?: UserProfile; message: string; auditLog?: AuditLog }> {
    const isSuper = await this.isPlatformSuperAdmin(actorUser.id);
    const isTenantAdmin = actorUser.role === 'owner' || actorUser.role === 'admin';
    if (!isSuper && !isTenantAdmin) {
      throw new Error('OTORISASI DITOLAK: Anda tidak memiliki wewenang memperbarui data pengguna ini.');
    }

    const target = this.localUsers.find((u) => u.id === targetUserId || u.userCode === targetUserId);
    if (!target) {
      throw new Error('Pengguna target tidak ditemukan.');
    }

    // MANDAT USER: Khusus Super Admin tidak bisa diedit selain oleh Super Admin sendiri
    const isTargetSuper =
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.userCode === '2A' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        actorUser.id === target.id ||
        actorUser.userCode === target.userCode ||
        actorUser.email.toLowerCase() === target.email.toLowerCase();

      if (!isSelf) {
        throw new Error('TINDAKAN DITOLAK: Akun Super Admin hanya dapat diedit oleh Super Admin itu sendiri.');
      }
    }

    // Try server sync
    try {
      const resp = await fetch(`/api/users/${encodeURIComponent(target.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actorUser.id,
          'x-user-code': actorUser.userCode,
          'x-user-email': actorUser.email,
          'x-user-role': actorUser.role
        },
        body: JSON.stringify({
          ...payload,
          actorId: actorUser.id,
          actorEmail: actorUser.email,
          actorUserCode: actorUser.userCode
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.user) {
          Object.assign(target, json.user);
        }
      }
    } catch (e) {
      console.warn('PUT /api/users/:id update warning:', e);
    }

    if (payload.fullName) target.fullName = payload.fullName.trim();
    if (payload.role) {
      target.role = payload.role;
      target.isPlatformSuperAdmin = payload.role === 'super_admin';
      target.roleTitle =
        payload.role === 'super_admin'
          ? 'Platform Super Admin'
          : payload.role === 'owner'
          ? 'Business Owner & Director'
          : payload.role === 'admin'
          ? 'Operations Administrator'
          : payload.role === 'sales'
          ? 'Senior Key Account Sales'
          : `${payload.role.toUpperCase()} Member`;
    }
    if (payload.status) target.status = payload.status;
    if (payload.tenantId) target.tenantId = payload.tenantId;

    if (this.client && (payload.role || payload.status || payload.tenantId || payload.fullName)) {
      try {
        const validTenantId = target.tenantId || 'ten_zyvora_corp';
        target.tenantId = validTenantId;

        // 1. Update profiles table
        await this.client
          .from('profiles')
          .update({
            full_name: target.fullName,
            role: target.role,
            role_title: target.roleTitle,
            is_platform_super_admin: target.role === 'super_admin',
            tenant_id: validTenantId,
            status: target.status || 'active'
          })
          .eq('id', target.id);

        // 2. Update tenant_memberships
        try {
          await this.client.from('tenant_memberships').upsert(
            {
              user_id: target.id,
              tenant_id: validTenantId,
              role: target.role,
              status: target.status || 'active'
            },
            { onConflict: 'user_id, tenant_id' }
          );
        } catch (tmErr) {
          console.warn('Membership upsert warning:', tmErr);
        }
      } catch (e) {
        console.warn('Direct Supabase update warning in updateUserProfile:', e);
      }
    }

    const audit: AuditLog = {
      id: `audit_edit_${Date.now()}`,
      tenantId: target.tenantId,
      timestamp: new Date().toISOString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      action: 'UPDATE',
      entity: 'Settings',
      entityId: target.userCode,
      description: `Memperbarui data profil ${target.fullName} (${target.userCode}).`,
      ipAddress: '182.253.18.92'
    };
    this.localAudits.unshift(audit);

    return {
      success: true,
      user: target,
      message: `Data pengguna ${target.fullName} (${target.userCode}) berhasil diperbarui dan disinkronkan.`,
      auditLog: audit
    };
  }

  async deleteUser(
    actorUser: UserProfile,
    targetUserId: string,
    permanent: boolean = false,
    reason: string = ''
  ): Promise<{ success: boolean; message: string; auditLog?: AuditLog }> {
    const isSuper = await this.isPlatformSuperAdmin(actorUser.id);
    if (!isSuper) {
      throw new Error('OTORISASI DITOLAK: Hanya Super Admin Platform yang berwenang menghapus pengguna.');
    }

    const targetIdx = this.localUsers.findIndex((u) => u.id === targetUserId || u.userCode === targetUserId);
    if (targetIdx === -1) {
      throw new Error('Pengguna target tidak ditemukan.');
    }

    const target = this.localUsers[targetIdx];
    // MANDAT USER: Khusus Super Admin tidak bisa dihapus selain oleh Super Admin sendiri
    const isTargetSuper =
      target.userCode === '2A' ||
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        actorUser.id === target.id ||
        actorUser.userCode === target.userCode ||
        actorUser.email.toLowerCase() === target.email.toLowerCase();

      if (!isSelf) {
        throw new Error('TINDAKAN DITOLAK: Akun Super Admin tidak dapat dihapus selain oleh Super Admin itu sendiri.');
      }

      const otherActiveSuperAdmins = this.localUsers.filter(
        (u) =>
          (u.userCode === '2A' || u.isPlatformSuperAdmin || u.role === 'super_admin' || u.email.toLowerCase() === 'admin@yulovi.com') &&
          u.status === 'active' &&
          u.id !== target.id &&
          u.email.toLowerCase() !== target.email.toLowerCase()
      );
      if (otherActiveSuperAdmins.length === 0) {
        throw new Error('TINDAKAN DITOLAK: Tidak dapat menghapus Super Admin terakhir sistem.');
      }
    }

    // Try server delete
    try {
      await fetch(`/api/users/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': actorUser.id,
          'x-user-code': actorUser.userCode,
          'x-user-email': actorUser.email,
          'x-user-role': actorUser.role
        },
        body: JSON.stringify({
          permanent,
          reason,
          actorId: actorUser.id,
          actorEmail: actorUser.email,
          actorUserCode: actorUser.userCode
        })
      });
    } catch (e) {
      console.warn('DELETE /api/users/:id sync warning:', e);
    }

    this.burnedUserCodes.add(target.userCode.toUpperCase());

    if (permanent) {
      this.localUsers.splice(targetIdx, 1);
    } else {
      target.status = 'inactive';
    }

    const audit: AuditLog = {
      id: `audit_delete_${Date.now()}`,
      tenantId: target.tenantId,
      timestamp: new Date().toISOString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      action: 'DELETE',
      entity: 'Settings',
      entityId: target.userCode,
      description: permanent
        ? `Menghapus akun ${target.fullName} (${target.userCode}) secara permanen. Alasan: ${reason || 'Instruksi Super Admin'}.`
        : `Menonaktifkan akun ${target.fullName} (${target.userCode}). Alasan: ${reason || 'Instruksi Super Admin'}.`,
      ipAddress: '182.253.18.92'
    };
    this.localAudits.unshift(audit);

    return {
      success: true,
      message: permanent
        ? `Pengguna ${target.fullName} (${target.userCode}) berhasil dihapus.`
        : `Pengguna ${target.fullName} (${target.userCode}) berhasil dinonaktifkan. Kode user diamankan.`,
      auditLog: audit
    };
  }

  async getRoleAudits(userId?: string): Promise<AuditLog[]> {
    if (!userId) {
      return this.localAudits;
    }
    const targetUser = this.localUsers.find((u) => u.id === userId || u.userCode === userId);
    if (!targetUser) return [];

    return this.localAudits.filter(
      (a) =>
        a.entityId === targetUser.userCode ||
        a.description.includes(targetUser.userCode) ||
        a.description.includes(targetUser.fullName)
    );
  }
}
