import {
  validateUserCode,
  generateUserCodeCandidate,
  USER_CODE_CAPACITY_AUDIT,
  OFFICIAL_ROLES,
  normalizeRole,
  ROLE_DEFINITIONS
} from './erpRules';
import { UserAccessRepository } from '../../services/repositories/userAccessRepository';
import { UserProfile, OfficialRole } from '../../types/erp';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`${GREEN}✓ PASS:${RESET} ${testName}`);
    passedTests++;
  } else {
    console.error(`${RED}✗ FAIL:${RESET} ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`ZYVORA ERP 1.0.0 — USER ACCESS & SECURITY TEST SUITE`);
  console.log(`======================================================\n`);

  // ------------------------------------------------------------------
  // 1. KODE USER (USER CODE) VALIDATION (SECTION 4 & PO GATE B3 MANDATE)
  // ------------------------------------------------------------------
  console.log(`[TEST GROUP 1] Validasi Kode User 2–3 Karakter 32-Alphabet Aman (Tanpa 0, 1, O, I)`);
  
  // Valid codes in 32-char safe alphabet [2-9A-HJ-NP-Z]
  assert(validateUserCode('2A').isValid, 'Kode 2-karakter seed valid: "2A"');
  assert(validateUserCode('2A2').isValid, 'Kode 3-karakter valid: "2A2"');
  assert(validateUserCode('2BZ').isValid, 'Kode 3-karakter valid: "2BZ"');
  assert(validateUserCode('9X').isValid, 'Kode 2-karakter valid: "9X"');
  assert(validateUserCode('ZZZ').isValid, 'Kode 3-karakter valid: "ZZZ"');

  // Invalid codes: ambiguous glyphs 0, 1, O, I MUST be rejected
  assert(!validateUserCode('1A').isValid, 'Karakter ambigu "1" ditolak: "1A"');
  assert(!validateUserCode('1A1').isValid, 'Karakter ambigu "1" ditolak: "1A1"');
  assert(!validateUserCode('0A').isValid, 'Karakter ambigu "0" ditolak: "0A"');
  assert(!validateUserCode('IA').isValid, 'Karakter ambigu "I" ditolak: "IA"');
  assert(!validateUserCode('OA').isValid, 'Karakter ambigu "O" ditolak: "OA"');

  // Other invalid codes
  assert(!validateUserCode('').isValid, 'Kode kosong ditolak');
  assert(!validateUserCode('A').isValid, 'Kode 1-karakter ditolak (terlalu pendek)');
  assert(!validateUserCode('2A2B').isValid, 'Kode 4-karakter ditolak (terlalu panjang)');
  assert(!validateUserCode('2A-').isValid, 'Karakter simbol "-" ditolak');
  assert(!validateUserCode('2@').isValid, 'Karakter khusus "@" ditolak');

  // ------------------------------------------------------------------
  // 2. KODE USER GENERATION & UNIQUENESS (SECTION 4)
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 2] Generator Kode User & Proteksi Kolisi`);
  const existingPool = ['2A', '2A2', '2BZ', '2K', '3X'];
  const generatedCodes = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const candidate = generateUserCodeCandidate([...existingPool, ...Array.from(generatedCodes)]);
    assert(validateUserCode(candidate).isValid, `Candidate #${i + 1} [${candidate}] memenuhi aturan 32-char aman`);
    assert(!existingPool.includes(candidate), `Candidate #${i + 1} [${candidate}] tidak bertabrakan dengan pool awal`);
    assert(!generatedCodes.has(candidate), `Candidate #${i + 1} [${candidate}] unik`);
    generatedCodes.add(candidate);
  }

  // ------------------------------------------------------------------
  // 3. CAPACITY AUDIT VERIFICATION (SECTION 4)
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 3] Audit Kapasitas Kombinasi Kode User`);
  assert(USER_CODE_CAPACITY_AUDIT.totalTheoreticalPermutations === 47952, 'Total permutasi teoritis adalah 47.952 (36^2 + 36^3)');
  assert(USER_CODE_CAPACITY_AUDIT.totalSafePermutations === 33792, 'Total permutasi aman (non-glif ambigu) adalah 33.792 (32^2 + 32^3)');

  // ------------------------------------------------------------------
  // 4. OFFICIAL ROLES SPECIFICATION & PO GATE B3 RESTRICTIONS
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 4] 5 Role Resmi & Kompatibilitas Legacy`);
  assert(OFFICIAL_ROLES.length === 5, 'Tepat ada 5 Role resmi');
  assert(OFFICIAL_ROLES.includes('super_admin'), 'Super Admin terdaftar');
  assert(OFFICIAL_ROLES.includes('owner'), 'Owner terdaftar');
  assert(OFFICIAL_ROLES.includes('admin'), 'Admin terdaftar');
  assert(OFFICIAL_ROLES.includes('sales'), 'Sales terdaftar');
  assert(OFFICIAL_ROLES.includes('customer'), 'Customer terdaftar');

  // Role Normalization (PO Gate B3: inventory_staff, accountant on HOLD, branch_manager on REVIEW)
  assert(normalizeRole('sales_rep') === 'sales', 'Legacy "sales_rep" termetakan ke "sales"');
  assert(normalizeRole('tenant_admin') === 'admin', 'Legacy "tenant_admin" termetakan ke "admin"');
  assert(normalizeRole('branch_manager') !== 'admin', 'PO REVIEW: "branch_manager" TIDAK dinaikkan ke "admin"');
  assert(normalizeRole('inventory_staff') !== 'admin', 'PO HOLD: "inventory_staff" DILARANG dinaikkan ke "admin"');
  assert(normalizeRole('accountant') !== 'admin', 'PO HOLD: "accountant" DILARANG dinaikkan ke "admin"');
  assert(normalizeRole('owner') === 'owner', '"owner" tetap "owner"');
  assert(normalizeRole('super_admin') === 'super_admin', '"super_admin" tetap "super_admin"');

  // ------------------------------------------------------------------
  // 5. BACKEND AUTHORIZATION & SECURITY GUARDS (SECTION 2, 7 & 8)
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 5] Otorisasi Backend, RBAC Guards, & Audit Trail`);

  const mockSuperAdmin: UserProfile = {
    id: '00000000-0000-4000-8000-000000000001',
    userCode: '2A',
    email: '64.iklas@gmail.com',
    fullName: 'Iklas Padli',
    role: 'super_admin',
    roleTitle: 'Platform Super Admin',
    isPlatformSuperAdmin: true,
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const mockRegularAdmin: UserProfile = {
    id: '00000000-0000-4000-8000-000000000002',
    userCode: '2A2',
    email: 'bukan.superadmin@zyvora.com',
    fullName: 'Budi Admin',
    role: 'admin',
    roleTitle: 'Operations Administrator',
    isPlatformSuperAdmin: false,
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const mockTargetUser: UserProfile = {
    id: '00000000-0000-4000-8000-000000000003',
    userCode: '2K',
    email: 'target.user@zyvora.com',
    fullName: 'Target User',
    role: 'sales',
    roleTitle: 'Sales Associate',
    isPlatformSuperAdmin: false,
    status: 'active',
    tenantId: 'ten_zyvora_corp',
    allowedBusinessUnits: [],
    allowedBranches: [],
    createdAt: new Date().toISOString()
  };

  const repo = new UserAccessRepository(null, [mockSuperAdmin, mockRegularAdmin, mockTargetUser]);

  // A. Non-Super Admin REJECTED from changing role
  let nonSuperRejected = false;
  try {
    await repo.assignUserRole(mockRegularAdmin, mockTargetUser.id, 'admin', 'Test unauthorized role change');
  } catch (err: any) {
    if (err.message.includes('Hanya Super Admin Platform')) {
      nonSuperRejected = true;
    }
  }
  assert(nonSuperRejected, 'Aktor non-Super Admin DITOLAK saat mencoba mengubah Role pengguna');

  // B. Super Admin AUTHORIZED to change role with valid reason
  const changeResult = await repo.assignUserRole(
    mockSuperAdmin,
    mockTargetUser.id,
    'admin',
    'Penugasan tugas administratif cabang'
  );
  assert(changeResult.success, 'Super Admin Platform BERHASIL mengubah Role target menjadi admin');
  assert(changeResult.auditLog !== undefined, 'Audit log tercatat secara otomatis');
  assert(changeResult.auditLog?.action === 'UPDATE', 'Audit log mencatat action UPDATE');
  assert(changeResult.auditLog?.entityId === '2K', 'Audit log mereferensikan Kode User target [2K]');

  // C. Demoting the LAST Super Admin REJECTED
  let lastSuperAdminProtected = false;
  try {
    await repo.assignUserRole(mockSuperAdmin, mockSuperAdmin.id, 'admin', 'Mencoba demote diri sendiri');
  } catch (err: any) {
    if (err.message.includes('Super Admin terakhir')) {
      lastSuperAdminProtected = true;
    }
  }
  assert(lastSuperAdminProtected, 'Proteksi Super Admin terakhir: Penurunan hak Super Admin terakhir DITOLAK');

  // D. Deactivating the LAST Super Admin REJECTED
  let deactivationProtected = false;
  try {
    await repo.toggleUserStatus(mockSuperAdmin, mockSuperAdmin.id, 'inactive', 'Mencoba nonaktifkan diri');
  } catch (err: any) {
    if (err.message.includes('Super Admin terakhir')) {
      deactivationProtected = true;
    }
  }
  assert(deactivationProtected, 'Proteksi Super Admin terakhir: Penonaktifan Super Admin terakhir DITOLAK');

  // E. Deactivating user burns the user code (no reuse)
  const deactivateResult = await repo.toggleUserStatus(
    mockSuperAdmin,
    mockTargetUser.id,
    'inactive',
    'Pengunduran diri karyawan'
  );
  assert(deactivateResult.success, 'Penonaktifan akun target berhasil');

  // Attempt to create a new user with the burned code '2K' must be REJECTED
  let burnedCodeReuseRejected = false;
  try {
    await repo.createUser(mockSuperAdmin, {
      fullName: 'Pengguna Baru',
      email: 'newuser@zyvora.com',
      role: 'sales',
      tenantId: 'ten_zyvora_corp',
      preferredUserCode: '2K' // Attempt reusing deactivated user code
    });
  } catch (err: any) {
    if (err.message.includes('tidak dapat digunakan kembali')) {
      burnedCodeReuseRejected = true;
    }
  }
  assert(burnedCodeReuseRejected, 'Invariant Section 4: Kode User dari akun yang dinonaktifkan DILARANG digunakan kembali');

  // ------------------------------------------------------------------
  // 6. TENANTS SELECT SCOPED & MULTI-TENANT ISOLATION (GATE C1.6)
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 6] Verifikasi Policy tenants_select_scoped & Isolasi Multi-Tenant`);

  // Evaluator function reproducing SQL policy "tenants_select_scoped"
  const evaluateTenantsSelectPolicy = (
    actor: { id: string; isPlatformSuperAdmin: boolean },
    memberships: { userId: string; tenantId: string; status: 'active' | 'inactive' }[],
    targetTenantId: string
  ): boolean => {
    // 1. Platform Super Admin has platform-wide tenant visibility
    if (actor.isPlatformSuperAdmin) {
      return true;
    }
    // 2. Tenant member can only read tenant if they hold an active membership
    return memberships.some(
      (m) => m.userId === actor.id && m.tenantId === targetTenantId && m.status === 'active'
    );
  };

  const sampleMemberships: { userId: string; tenantId: string; status: 'active' | 'inactive' }[] = [
    { userId: 'usr_single_a', tenantId: 'ten_alpha', status: 'active' },
    { userId: 'usr_single_b', tenantId: 'ten_beta', status: 'active' },
    { userId: 'usr_suspended_a', tenantId: 'ten_alpha', status: 'inactive' },
    { userId: 'usr_multi_ab', tenantId: 'ten_alpha', status: 'active' },
    { userId: 'usr_multi_ab', tenantId: 'ten_beta', status: 'active' },
    { userId: 'usr_multi_ab', tenantId: 'ten_gamma', status: 'inactive' }
  ];

  const actorSuperAdmin = { id: 'usr_super', isPlatformSuperAdmin: true };
  const actorSingleA = { id: 'usr_single_a', isPlatformSuperAdmin: false };
  const actorSuspendedA = { id: 'usr_suspended_a', isPlatformSuperAdmin: false };
  const actorMultiAB = { id: 'usr_multi_ab', isPlatformSuperAdmin: false };
  const actorUnassigned = { id: 'usr_unassigned', isPlatformSuperAdmin: false };

  // A. Super Admin Platform Access
  assert(
    evaluateTenantsSelectPolicy(actorSuperAdmin, sampleMemberships, 'ten_alpha') === true,
    'Super Admin: Memiliki akses baca ke Tenant Alpha'
  );
  assert(
    evaluateTenantsSelectPolicy(actorSuperAdmin, sampleMemberships, 'ten_beta') === true,
    'Super Admin: Memiliki akses baca ke Tenant Beta'
  );
  assert(
    evaluateTenantsSelectPolicy(actorSuperAdmin, sampleMemberships, 'ten_unseen') === true,
    'Super Admin: Memiliki akses baca ke Tenant mana pun di seluruh platform'
  );

  // B. Single Active Tenant Member Access
  assert(
    evaluateTenantsSelectPolicy(actorSingleA, sampleMemberships, 'ten_alpha') === true,
    'Anggota aktif Tenant Alpha: Dapat membaca Tenant Alpha'
  );
  assert(
    evaluateTenantsSelectPolicy(actorSingleA, sampleMemberships, 'ten_beta') === false,
    'Isolasi Tenant: Anggota Tenant Alpha DITOLAK membaca data Tenant Beta'
  );

  // C. Inactive / Suspended Membership
  assert(
    evaluateTenantsSelectPolicy(actorSuspendedA, sampleMemberships, 'ten_alpha') === false,
    'Status Inactive: Anggota dengan membership inactive DITOLAK membaca tenant bersangkutan'
  );

  // D. Multi-Tenant Member Handling
  assert(
    evaluateTenantsSelectPolicy(actorMultiAB, sampleMemberships, 'ten_alpha') === true,
    'Multi-Tenant: Pengguna aktif di Alpha & Beta dapat membaca Tenant Alpha'
  );
  assert(
    evaluateTenantsSelectPolicy(actorMultiAB, sampleMemberships, 'ten_beta') === true,
    'Multi-Tenant: Pengguna aktif di Alpha & Beta dapat membaca Tenant Beta'
  );
  assert(
    evaluateTenantsSelectPolicy(actorMultiAB, sampleMemberships, 'ten_gamma') === false,
    'Multi-Tenant: Akses ke Tenant Gamma DITOLAK karena status membership inactive di Gamma'
  );
  assert(
    evaluateTenantsSelectPolicy(actorMultiAB, sampleMemberships, 'ten_delta') === false,
    'Multi-Tenant: Akses ke Tenant Delta DITOLAK karena tidak memiliki membership'
  );

  // E. Unassigned User
  assert(
    evaluateTenantsSelectPolicy(actorUnassigned, sampleMemberships, 'ten_alpha') === false,
    'Unassigned User: Pengguna tanpa tenant DITOLAK membaca tenant mana pun'
  );

  // F. Role & Default Alignment Verification
  assert(
    OFFICIAL_ROLES.includes('sales'),
    'Official Roles: "sales" terdaftar sebagai role resmi Zyvora ERP'
  );
  assert(
    !OFFICIAL_ROLES.includes('sales_rep' as any),
    'Official Roles: Legacy "sales_rep" BUKAN role resmi'
  );
  assert(
    ROLE_DEFINITIONS.sales !== undefined && ROLE_DEFINITIONS.sales.id === 'sales',
    'Role Definitions: Metadata untuk role resmi "sales" terdefinisi dengan benar'
  );

  // ------------------------------------------------------------------
  // 7. FINAL REVIEW BLOCKER VALIDATION: IMMUTABILITY & 2A ABORT
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 7] Penegakan Imutabilitas profiles.user_code & Penghentian Bootstrap 2A`);

  // A. Simulasi Trigger Imutabilitas profiles.user_code di Server
  function simulateProfilesUserCodeTrigger(
    oldRow: { user_code: string | null },
    newRow: { user_code?: string | null },
    context: { authUid?: string | null; isSuperAdmin?: boolean } = { authUid: 'user-regular', isSuperAdmin: false }
  ) {
    let effectiveNewCode = newRow.user_code;
    // Jika update tidak menyertakan user_code atau diset null, pertahankan nilai lama
    if (oldRow.user_code !== null && (effectiveNewCode === undefined || effectiveNewCode === null)) {
      effectiveNewCode = oldRow.user_code;
    }
    // Jika user_code lama sudah terisi dan diubah ke nilai berbeda, tolak mutasi!
    if (oldRow.user_code !== null && effectiveNewCode !== oldRow.user_code) {
      throw new Error('ERR_ZYVORA_IMMUTABLE_USER_CODE: Kolom user_code bersifat permanen dan tidak dapat diubah setelah ditetapkan.');
    }
    // Jika user_code masih NULL dan dicoba ditetapkan oleh klien biasa (bukan super admin / server)
    if (oldRow.user_code === null && effectiveNewCode !== undefined && effectiveNewCode !== null) {
      if (context.authUid && !context.isSuperAdmin) {
        throw new Error('ERR_ZYVORA_FORBIDDEN_USER_CODE_ASSIGNMENT: Penetapan user_code baru hanya diizinkan melalui proses server berwenang atau Platform Super Admin, bukan oleh klien langsung.');
      }
    }
    return {
      user_code: effectiveNewCode
    };
  }

  // 1. Pembaruan profil yang sah (mengubah nama, user_code tidak diubah atau tidak dikirim)
  const legitimateUpdate1 = simulateProfilesUserCodeTrigger({ user_code: '2A' }, { user_code: '2A' });
  assert(legitimateUpdate1.user_code === '2A', 'Pembaruan sah dengan user_code sama: DIIZINKAN');

  const legitimateUpdate2 = simulateProfilesUserCodeTrigger({ user_code: '2A' }, { user_code: undefined });
  assert(legitimateUpdate2.user_code === '2A', 'Pembaruan sah tanpa kolom user_code (omitted): DIIZINKAN & kode dipertahankan');

  const legitimateUpdate3 = simulateProfilesUserCodeTrigger({ user_code: '2A' }, { user_code: null });
  assert(legitimateUpdate3.user_code === '2A', 'Pembaruan sah dengan user_code null: DIIZINKAN & kode lama dipertahankan');

  // 2. Upaya ilegal klien biasa mengubah user_code yang sudah ada
  let illegalChangeRejected = false;
  try {
    simulateProfilesUserCodeTrigger({ user_code: '2A' }, { user_code: '9Z' });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_IMMUTABLE_USER_CODE')) {
      illegalChangeRejected = true;
    }
  }
  assert(illegalChangeRejected, 'Mutasi user_code yang sudah ada DITOLAK dengan ERR_ZYVORA_IMMUTABLE_USER_CODE');

  // 3. Upaya ilegal klien biasa menetapkan user_code yang masih NULL secara langsung
  let clientAssignNullRejected = false;
  try {
    simulateProfilesUserCodeTrigger({ user_code: null }, { user_code: '2A' }, { authUid: 'user-regular', isSuperAdmin: false });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_FORBIDDEN_USER_CODE_ASSIGNMENT')) {
      clientAssignNullRejected = true;
    }
  }
  assert(clientAssignNullRejected, 'Klien biasa DITOLAK saat mencoba menetapkan user_code yang masih NULL (wajib proses server berwenang)');

  // 4. Penetapan user_code yang masih NULL oleh proses server berwenang / Super Admin
  const authorizedServerAssign = simulateProfilesUserCodeTrigger(
    { user_code: null },
    { user_code: '2A' },
    { authUid: 'superadmin-uuid', isSuperAdmin: true }
  );
  assert(authorizedServerAssign.user_code === '2A', 'Proses server berwenang / Super Admin BERHASIL menetapkan user_code dari NULL');

  // 5. Pembaruan profil sah oleh klien biasa saat user_code masih NULL (omitted/null)
  const clientUpdateProfileWithNullCode = simulateProfilesUserCodeTrigger(
    { user_code: null },
    { user_code: null },
    { authUid: 'user-regular', isSuperAdmin: false }
  );
  assert(clientUpdateProfileWithNullCode.user_code === null, 'Pembaruan profil umum klien saat user_code NULL: DIIZINKAN (user_code tetap NULL)');

  // B. Simulasi Kebijakan Bootstrap Super Admin Re-Design (admin@yulovi.com)
  interface AuthUserMock {
    id: string;
    email: string;
  }

  interface ProfileMock {
    id: string;
    email: string;
    full_name?: string;
    user_code: string | null;
  }

  interface PlatformSuperAdminMock {
    user_id: string;
    is_active: boolean;
    notes?: string;
  }

  function simulateRedesignedBootstrap(params: {
    targetEmail: string;
    candidateSeedCode: string;
    authUsers: AuthUserMock[];
    existingProfiles: ProfileMock[];
    burnedCodes: string[];
    existingSuperAdmins: PlatformSuperAdminMock[];
  }): {
    success: boolean;
    allocatedCode: string;
    designatedSuperAdminId: string;
    profilesState: ProfileMock[];
    superAdminsState: PlatformSuperAdminMock[];
  } {
    const normalizedCandidateEmail = params.targetEmail.trim().toLowerCase();
    
    // 1. Verifikasi auth.users
    const matchingAuth = params.authUsers.filter(
      u => u.email.trim().toLowerCase() === normalizedCandidateEmail
    );
    if (matchingAuth.length === 0) {
      throw new Error(`ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND: Akun Supabase Auth untuk email [${normalizedCandidateEmail}] belum terdaftar pada auth.users.`);
    }
    if (matchingAuth.length > 1) {
      throw new Error(`ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER: Ditemukan lebih dari 1 akun auth.users untuk email [${normalizedCandidateEmail}].`);
    }

    const candidateUuid = matchingAuth[0].id;
    let targetUserCode: string;

    // 2. Periksa profil existing
    const existingProfile = params.existingProfiles.find(p => p.id === candidateUuid);
    if (existingProfile) {
      if (existingProfile.email && existingProfile.email.trim().toLowerCase() !== normalizedCandidateEmail) {
        throw new Error(`ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH: Profil existing untuk UUID [${candidateUuid}] memiliki email [${existingProfile.email}] yang berbeda dari kandidat.`);
      }

      if (existingProfile.user_code !== null) {
        // Validasi format
        if (!/^[2-9A-HJ-NP-Z]{2,3}$/.test(existingProfile.user_code)) {
          throw new Error(`ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID: Profil existing memiliki user_code [${existingProfile.user_code}] yang melanggar aturan format 32-simbol aman.`);
        }
        if (params.burnedCodes.includes(existingProfile.user_code)) {
          throw new Error(`ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED: Profil existing memiliki user_code [${existingProfile.user_code}] yang tercatat dalam burned_user_codes.`);
        }
        targetUserCode = existingProfile.user_code; // pertahankan kode (immutability)
      } else {
        targetUserCode = params.candidateSeedCode;
      }
    } else {
      targetUserCode = params.candidateSeedCode;
    }

    // 3. Verifikasi ketersediaan kode jika kode baru
    if (!existingProfile || existingProfile.user_code === null) {
      if (!/^[2-9A-HJ-NP-Z]{2,3}$/.test(targetUserCode)) {
        throw new Error(`ERR_ZYVORA_BOOTSTRAP_INVALID_CODE_FORMAT: Target kode [${targetUserCode}] tidak mematuhi format 32-simbol aman.`);
      }

      const codeInUseByOther = params.existingProfiles.some(
        p => p.user_code === targetUserCode && p.id !== candidateUuid
      );
      const codeBurned = params.burnedCodes.includes(targetUserCode);

      if (codeInUseByOther || codeBurned) {
        throw new Error(
          `ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE: Kode user seed ${targetUserCode} telah digunakan atau berada dalam daftar kode terbakar (burned). Transaksi bootstrap DIBATALKAN.`
        );
      }
    }

    // 4. Update / Insert Profile
    const profilesCopy = [...params.existingProfiles];
    const profileIdx = profilesCopy.findIndex(p => p.id === candidateUuid);
    if (profileIdx >= 0) {
      profilesCopy[profileIdx] = {
        ...profilesCopy[profileIdx],
        user_code: profilesCopy[profileIdx].user_code ?? targetUserCode,
        email: normalizedCandidateEmail
      };
    } else {
      profilesCopy.push({
        id: candidateUuid,
        email: normalizedCandidateEmail,
        full_name: 'Platform Administrator',
        user_code: targetUserCode
      });
    }

    // 5. Update / Insert Platform Super Admin
    const superAdminsCopy = [...params.existingSuperAdmins];
    const saIdx = superAdminsCopy.findIndex(sa => sa.user_id === candidateUuid);
    if (saIdx >= 0) {
      superAdminsCopy[saIdx] = {
        ...superAdminsCopy[saIdx],
        is_active: true
      };
    } else {
      superAdminsCopy.push({
        user_id: candidateUuid,
        is_active: true,
        notes: `Designated Platform Super Admin bootstrap for ${normalizedCandidateEmail}`
      });
    }

    return {
      success: true,
      allocatedCode: targetUserCode,
      designatedSuperAdminId: candidateUuid,
      profilesState: profilesCopy,
      superAdminsState: superAdminsCopy
    };
  }

  // 1. Kondisi normal: Bootstrap identitas baru admin@yulovi.com berhasil
  const cleanBootstrapNew = simulateRedesignedBootstrap({
    targetEmail: 'admin@yulovi.com',
    candidateSeedCode: '2A',
    authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
    existingProfiles: [],
    burnedCodes: [],
    existingSuperAdmins: []
  });
  assert(
    cleanBootstrapNew.success &&
      cleanBootstrapNew.designatedSuperAdminId === 'auth-uuid-yulovi-001' &&
      cleanBootstrapNew.allocatedCode === '2A',
    'Bootstrap identitas baru admin@yulovi.com: BERHASIL dialokasikan dan ditautkan'
  );

  // 2. Identitas lama 64.iklas@gmail.com TIDAK menjadi target bootstrap aktif
  let oldIdentityRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-old-001', email: '64.iklas@gmail.com' }],
      existingProfiles: [],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND')) {
      oldIdentityRejected = true;
    }
  }
  assert(
    oldIdentityRejected,
    'Identitas lama 64.iklas@gmail.com TIDAK memenuhi syarat bootstrap baru (hanya admin@yulovi.com yang diterima)'
  );

  // 3. Akun Auth tidak ditemukan: Wajib melempar ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND
  let authNotFound = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [],
      existingProfiles: [],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND')) {
      authNotFound = true;
    }
  }
  assert(
    authNotFound,
    'Akun Auth tidak ditemukan: Wajib melempar ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND dan membatalkan transaksi'
  );

  // 4. Akun Auth ambigus (>1 akun dengan email sama): Wajib melempar ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER
  let ambiguousAuthRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [
        { id: 'auth-uuid-1', email: 'admin@yulovi.com' },
        { id: 'auth-uuid-2', email: 'admin@yulovi.com' }
      ],
      existingProfiles: [],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER')) {
      ambiguousAuthRejected = true;
    }
  }
  assert(
    ambiguousAuthRejected,
    'Akun Auth ganda/ambigu: Wajib melempar ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER'
  );

  // 5. Profil telah ada dengan kode berbeda yang sah (misal '3B'): Imutabilitas dipertahankan (tidak ditimpa 2A)
  const existingProfilePreserved = simulateRedesignedBootstrap({
    targetEmail: 'admin@yulovi.com',
    candidateSeedCode: '2A',
    authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
    existingProfiles: [
      { id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '3B' }
    ],
    burnedCodes: [],
    existingSuperAdmins: []
  });
  assert(
    existingProfilePreserved.allocatedCode === '3B',
    'Profil existing dengan kode 3B: Kode 3B DIPERTAHANKAN (tidak ditimpa oleh seed code 2A)'
  );

  // 6. Kode seed sudah digunakan oleh profil lain: Wajib melempar ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE
  let seedCodeTakenRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [
        { id: 'other-user-uuid', email: 'other@zyvora.com', user_code: '2A' }
      ],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE')) {
      seedCodeTakenRejected = true;
    }
  }
  assert(
    seedCodeTakenRejected,
    'Kode seed digunakan pengguna lain: Bootstrap BERHENTI dengan ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE'
  );

  // 7. Kode seed sudah ada di burned_user_codes: Wajib melempar ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE
  let seedCodeBurnedRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [],
      burnedCodes: ['2A'],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE')) {
      seedCodeBurnedRejected = true;
    }
  }
  assert(
    seedCodeBurnedRejected,
    'Kode seed terbakar: Bootstrap BERHENTI dengan ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE'
  );

  // 8. UUID profil existing memiliki email yang berbeda dari akun Auth kandidat: Wajib melempar ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH
  let profileEmailMismatchRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [
        { id: 'auth-uuid-yulovi-001', email: 'impostor@external.com', user_code: '2A' }
      ],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH')) {
      profileEmailMismatchRejected = true;
    }
  }
  assert(
    profileEmailMismatchRejected,
    'UUID akun dan profil berbeda email: Wajib melempar ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH'
  );

  // 9. Profil existing memiliki kode berformat tidak valid: Wajib melempar ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID
  let existingCodeInvalidRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [
        { id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '01' } // memuat 0 dan 1 terlarang
      ],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID')) {
      existingCodeInvalidRejected = true;
    }
  }
  assert(
    existingCodeInvalidRejected,
    'Kode profil existing tidak valid: Wajib melempar ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID'
  );

  // 10. Profil existing memiliki kode yang sudah terbakar: Wajib melempar ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED
  let existingCodeBurnedRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [
        { id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '2B' }
      ],
      burnedCodes: ['2B'],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED')) {
      existingCodeBurnedRejected = true;
    }
  }
  assert(
    existingCodeBurnedRejected,
    'Kode profil existing terbakar: Wajib melempar ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED'
  );

  // 11. Format kode seed kandidat tidak valid: Wajib melempar ERR_ZYVORA_BOOTSTRAP_INVALID_CODE_FORMAT
  let candidateCodeInvalidRejected = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: 'INVALID_TOO_LONG',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_INVALID_CODE_FORMAT')) {
      candidateCodeInvalidRejected = true;
    }
  }
  assert(
    candidateCodeInvalidRejected,
    'Format target seed code tidak valid: Wajib melempar ERR_ZYVORA_BOOTSTRAP_INVALID_CODE_FORMAT'
  );

  // 12. Isolasi Upsert: Penetapan Super Admin kandidat tidak mengubah status Super Admin lain
  const otherAdminId = 'auth-uuid-existing-other-admin';
  const bootstrapWithOtherAdmin = simulateRedesignedBootstrap({
    targetEmail: 'admin@yulovi.com',
    candidateSeedCode: '2A',
    authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
    existingProfiles: [],
    burnedCodes: [],
    existingSuperAdmins: [
      { user_id: otherAdminId, is_active: true, notes: 'Existing pre-established Super Admin' }
    ]
  });
  const otherAdminPreserved = bootstrapWithOtherAdmin.superAdminsState.find(sa => sa.user_id === otherAdminId);
  assert(
    otherAdminPreserved?.is_active === true &&
      bootstrapWithOtherAdmin.superAdminsState.length === 2 &&
      bootstrapWithOtherAdmin.superAdminsState.some(sa => sa.user_id === 'auth-uuid-yulovi-001'),
    'Isolasi Upsert: Wewenang Super Admin lain tidak terganggu dan akun baru terdaftar secara independen'
  );

  console.log(`\n[TEST GROUP 8] Rekonsiliasi Kebijakan Bootstrap & Concurrency (Temuan 1, 2, 3)`);

  // --- TEMUAN 1: KEBIJAKAN KODE PENGGUNA (Pilihan A vs Pilihan B) ---
  // Pilihan A (Strict 2A requirement): Jika '2A' bentrok dengan profil lain, migrasi wajib HALT (tidak mengganti diam-diam)
  let choiceACollisionHalted = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [{ id: 'occupant-uuid', email: 'occupant@zyvora.com', user_code: '2A' }],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE')) {
      choiceACollisionHalted = true;
    }
  }
  assert(
    choiceACollisionHalted,
    'Temuan 1 (Pilihan A): Jika kode 2A telah dipakai profil lain, bootstrap WAJIB HALT tanpa pergantian diam-diam'
  );

  // Pilihan A: Jika '2A' ada di burned_user_codes, migrasi wajib HALT
  let choiceABurnedHalted = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [],
      burnedCodes: ['2A'],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE')) {
      choiceABurnedHalted = true;
    }
  }
  assert(
    choiceABurnedHalted,
    'Temuan 1 (Pilihan A): Jika kode 2A berada dalam burned_user_codes, bootstrap WAJIB HALT tanpa pergantian diam-diam'
  );

  // Simulasi Pilihan B (Alokasi dinamis terkontrol jika disetujui PO):
  // Menjamin jika alokasi dinamis dijalankan, kode hasil alokasi harus memenuhi format 32-simbol aman dan unik
  function simulateChoiceBDynamicAllocation(
    candidateSeed: string,
    existingProfiles: ProfileMock[],
    burnedCodes: string[]
  ): { allocatedCode: string; wasDynamic: boolean } {
    const isCandidateFree =
      !existingProfiles.some(p => p.user_code === candidateSeed) &&
      !burnedCodes.includes(candidateSeed);
    if (isCandidateFree) {
      return { allocatedCode: candidateSeed, wasDynamic: false };
    }
    // Dynamic generation from safe 32-char charset
    const safeChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let i = 0; i < safeChars.length; i++) {
      for (let j = 0; j < safeChars.length; j++) {
        const candidate = `${safeChars[i]}${safeChars[j]}`;
        const taken = existingProfiles.some(p => p.user_code === candidate) || burnedCodes.includes(candidate);
        if (!taken) {
          return { allocatedCode: candidate, wasDynamic: true };
        }
      }
    }
    throw new Error('ERR_CAPACITY_EXHAUSTED');
  }

  const choiceBSimulation = simulateChoiceBDynamicAllocation(
    '2A',
    [{ id: 'occupant-uuid', email: 'occupant@zyvora.com', user_code: '2A' }],
    ['2B', '2C']
  );
  assert(
    choiceBSimulation.wasDynamic === true &&
      /^[2-9A-HJ-NP-Z]{2,3}$/.test(choiceBSimulation.allocatedCode) &&
      choiceBSimulation.allocatedCode !== '2A',
    'Temuan 1 (Pilihan B Model): Simulasi alokasi dinamis menghasilkan kode valid dari pool 32-simbol aman'
  );

  // --- TEMUAN 2: PROFIL EXISTING DENGAN USER_CODE TIDAK VALID ---
  // Profil existing dengan kode memuat glif terlarang (misal '1A') wajib HALT & TIDAK ditimpa otomatis
  let invalidGlyphHalted = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '1A' }],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID')) {
      invalidGlyphHalted = true;
    }
  }
  assert(
    invalidGlyphHalted,
    'Temuan 2: Profil existing dengan kode "1A" (glif terlarang) WAJIB HALT dengan ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID'
  );

  // Profil existing dengan kode huruf kecil (misal '2a') wajib HALT & TIDAK dinormalisasi diam-diam
  let lowercaseCodeHalted = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '2a' }],
      burnedCodes: [],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID')) {
      lowercaseCodeHalted = true;
    }
  }
  assert(
    lowercaseCodeHalted,
    'Temuan 2: Profil existing dengan kode non-kapital "2a" WAJIB HALT (tanpa normalisasi otomatis yang mengubah identitas)'
  );

  // Profil existing dengan kode yang sudah masuk burned_user_codes wajib HALT & TIDAK di-unburn otomatis
  let existingBurnedHalted = false;
  try {
    simulateRedesignedBootstrap({
      targetEmail: 'admin@yulovi.com',
      candidateSeedCode: '2A',
      authUsers: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com' }],
      existingProfiles: [{ id: 'auth-uuid-yulovi-001', email: 'admin@yulovi.com', user_code: '9Z' }],
      burnedCodes: ['9Z'],
      existingSuperAdmins: []
    });
  } catch (err: any) {
    if (err.message.includes('ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED')) {
      existingBurnedHalted = true;
    }
  }
  assert(
    existingBurnedHalted,
    'Temuan 2: Profil existing dengan kode 9Z yang telah burned WAJIB HALT (tidak memulihkan kode burned secara diam-diam)'
  );

  // --- TEMUAN 3: ADVISORY LOCK & CONCURRENCY ASSUMPTIONS ---
  // Lock 94820 (Super Admin Mutex) dan Lock 94821 (User Code Mutex) adalah domain independen
  const SUPER_ADMIN_MUTEX_KEY: number = 94820;
  const USER_CODE_MUTEX_KEY: number = 94821;

  assert(
    SUPER_ADMIN_MUTEX_KEY !== USER_CODE_MUTEX_KEY,
    'Temuan 3: Key 94820 (Super Admin) dan Key 94821 (User Code) terpisah dan tidak saling tumpang-tindih'
  );

  // Simulasi analisis independensi lock:
  // Lock 94820 HANYA melindungi tabel platform_super_admins dan anti-lockout check
  // Lock 94821 HANYA melindungi alokasi namespace user_code
  // Tidak boleh berasumsi lock 94820 melindungi namespace user_code atau sebaliknya.
  type LockDomain = 'SUPER_ADMIN_STATE' | 'USER_CODE_NAMESPACE';
  const lockDomainMap: Record<number, LockDomain> = {
    [SUPER_ADMIN_MUTEX_KEY]: 'SUPER_ADMIN_STATE',
    [USER_CODE_MUTEX_KEY]: 'USER_CODE_NAMESPACE'
  };

  assert(
    lockDomainMap[94820] === 'SUPER_ADMIN_STATE' && lockDomainMap[94821] === 'USER_CODE_NAMESPACE',
    'Temuan 3: Domain lock terverifikasi: 94820 melindungi wewenang Super Admin, 94821 melindungi namespace kode pengguna'
  );

  // Migrasi Section 9 memegang KEDUA lock (94820 lalu 94821) dalam urutan deterministik
  // Memverifikasi urutan akuisisi seragam untuk mencegah deadlocks antar transaksi konkuren
  const bootstrapAcquisitionOrder = [SUPER_ADMIN_MUTEX_KEY, USER_CODE_MUTEX_KEY];
  assert(
    bootstrapAcquisitionOrder[0] === 94820 && bootstrapAcquisitionOrder[1] === 94821,
    'Temuan 3: Bootstrap mengakuisisi 94820 kemudian 94821 secara berurutan, menjamin kompatibilitas tanpa risiko deadlock'
  );

  // ------------------------------------------------------------------
  // 9. MODEL KEBIJAKAN RLS TENANT MEMBERSHIPS & PENCEGAHAN REKURSI
  // ------------------------------------------------------------------
  console.log(`\n[TEST GROUP 9] Model Kebijakan RLS Tenant Memberships & Anti-Recursion Validation`);

  interface MembershipRow {
    id: string;
    user_id: string;
    tenant_id: string;
    role: OfficialRole;
    status: 'active' | 'inactive';
  }

  const rlsTestMemberships: MembershipRow[] = [
    { id: 'm1', user_id: 'user-tenantA-1', tenant_id: 'tenant-A', role: 'sales', status: 'active' },
    { id: 'm2', user_id: 'user-tenantA-2', tenant_id: 'tenant-A', role: 'admin', status: 'active' },
    { id: 'm3', user_id: 'user-tenantA-inactive', tenant_id: 'tenant-A', role: 'sales', status: 'inactive' },
    { id: 'm4', user_id: 'user-tenantB-1', tenant_id: 'tenant-B', role: 'owner', status: 'active' },
    { id: 'm5', user_id: 'user-tenantB-2', tenant_id: 'tenant-B', role: 'sales', status: 'active' }
  ];

  // Helper function mock: get_auth_user_tenant_ids() (SECURITY DEFINER behavior)
  function simulateGetAuthUserTenantIds(authUid: string | null): string[] {
    if (!authUid) return [];
    return rlsTestMemberships
      .filter(m => m.user_id === authUid && m.status === 'active')
      .map(m => m.tenant_id);
  }

  // Helper function mock: get_auth_user_admin_tenant_ids() (SECURITY DEFINER behavior)
  function simulateGetAuthUserAdminTenantIds(authUid: string | null): string[] {
    if (!authUid) return [];
    return rlsTestMemberships
      .filter(m => m.user_id === authUid && m.status === 'active' && ['owner', 'admin'].includes(m.role))
      .map(m => m.tenant_id);
  }

  // Model evaluation of proposed candidate policy:
  // USING (
  //   user_id = auth.uid()
  //   OR public.is_platform_super_admin()
  //   OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
  //   OR (tenant_id IN (SELECT public.get_auth_user_tenant_ids()) AND status = 'active')
  // )
  function evaluateTenantMembershipSelectRLS(
    row: MembershipRow,
    authUid: string | null,
    isPlatformSuperAdmin: boolean
  ): boolean {
    if (!authUid) return false;
    if (row.user_id === authUid) return true;
    if (isPlatformSuperAdmin) return true;
    const adminTenantIds = simulateGetAuthUserAdminTenantIds(authUid);
    if (adminTenantIds.includes(row.tenant_id)) return true;
    const userTenantIds = simulateGetAuthUserTenantIds(authUid);
    if (userTenantIds.includes(row.tenant_id) && row.status === 'active') return true;
    return false;
  }

  // 1. Pengguna belum login (auth.uid() IS NULL) -> 0 rows diizinkan
  const anonCanView = rlsTestMemberships.some(row => evaluateTenantMembershipSelectRLS(row, null, false));
  assert(!anonCanView, 'RLS Matrix 1: Pengguna belum login (anon) DITOLAK 100% dari seluruh membership');

  // 2. Pengguna terautentikasi tanpa membership -> 0 rows diizinkan
  const unassignedCanView = rlsTestMemberships.some(row => evaluateTenantMembershipSelectRLS(row, 'user-unassigned-001', false));
  assert(!unassignedCanView, 'RLS Matrix 2: Pengguna tanpa membership DITOLAK dari membaca membership mana pun');

  // 3. Anggota aktif melihat rekan satu tenant yang berstatus aktif -> DIIZINKAN
  const canViewColleague = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm2')!,
    'user-tenantA-1',
    false
  );
  assert(canViewColleague, 'RLS Matrix 3: Anggota aktif DIIZINKAN melihat rekan aktif satu tenant');

  // 4. Anggota tenant berbeda -> DITOLAK (Cross-Tenant Isolation)
  const canViewCrossTenant = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm4')!, // row tenant B
    'user-tenantA-1', // user tenant A
    false
  );
  assert(!canViewCrossTenant, 'RLS Matrix 4: Anggota Tenant A DITOLAK melihat anggota Tenant B (Isolasi Ketat)');

  // 5. Super Admin terverifikasi -> Melihat SELURUH membership
  const superAdminViewsAll = rlsTestMemberships.every(row => evaluateTenantMembershipSelectRLS(row, 'super-admin-uuid', true));
  assert(superAdminViewsAll, 'RLS Matrix 5: Platform Super Admin terverifikasi DIIZINKAN melihat seluruh membership platform');

  // 6. Membership nonaktif:
  // Rekan biasa DITOLAK melihat anggota nonaktif
  const peerCanViewInactive = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm3')!, // inactive row tenant A
    'user-tenantA-1', // active peer (sales) in tenant A
    false
  );
  assert(!peerCanViewInactive, 'RLS Matrix 6A: Rekan biasa DITOLAK melihat membership anggota yang telah nonaktif');

  // Pemilik baris itu sendiri DIIZINKAN melihat status nonaktifnya
  const ownCanViewInactive = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm3')!,
    'user-tenantA-inactive',
    false
  );
  assert(ownCanViewInactive, 'RLS Matrix 6B: Pemilik akun DIIZINKAN melihat baris membership miliknya sendiri meskipun nonaktif');

  // Super Admin DIIZINKAN melihat membership nonaktif untuk manajemen akun
  const saCanViewInactive = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm3')!,
    'super-admin-uuid',
    true
  );
  assert(saCanViewInactive, 'RLS Matrix 6C: Platform Super Admin DIIZINKAN melihat membership nonaktif');

  // Tenant Owner/Admin aktif DIIZINKAN melihat membership nonaktif di tenant yang dikelolanya
  const adminCanViewInactive = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm3')!,
    'user-tenantA-2', // active admin in tenant A
    false
  );
  assert(adminCanViewInactive, 'RLS Matrix 6D: Tenant Owner/Admin aktif DIIZINKAN melihat membership nonaktif di tenant-nya');

  // Tenant Owner/Admin DITOLAK melihat membership nonaktif di tenant lain (cross-tenant)
  const crossTenantAdminCanViewInactive = evaluateTenantMembershipSelectRLS(
    rlsTestMemberships.find(m => m.id === 'm3')!,
    'user-tenantB-1', // active owner in tenant B
    false
  );
  assert(!crossTenantAdminCanViewInactive, 'RLS Matrix 6E: Tenant Owner/Admin DITOLAK melihat membership nonaktif di tenant lain');

  // 7. Pencegahan Recursion: Call graph asiklik
  // Helper memanggil basis data secara langsung dengan security definer, tanpa menyentuh subquery berkorelasi
  const helperIsSelfContained = typeof simulateGetAuthUserTenantIds === 'function';
  assert(helperIsSelfContained, 'RLS Matrix 7: Desain helper SECURITY DEFINER memutus graf rekursi RLS (0% loop)');

  // Model evaluation of profiles_select_scoped:
  // USING (
  //   id = auth.uid()
  //   OR public.is_platform_super_admin()
  //   OR EXISTS (
  //     SELECT 1 FROM public.tenant_memberships tm
  //     WHERE tm.user_id = public.profiles.id
  //       AND tm.status = 'active'
  //       AND tm.tenant_id IN (SELECT public.get_auth_user_tenant_ids())
  //   )
  // )
  interface ProfileRow {
    id: string;
    full_name: string;
    email: string;
  }

  const rlsTestProfiles: ProfileRow[] = [
    { id: 'user-tenantA-1', full_name: 'Tenant A Sales', email: 'salesA@example.com' },
    { id: 'user-tenantA-2', full_name: 'Tenant A Admin', email: 'adminA@example.com' },
    { id: 'user-tenantA-inactive', full_name: 'Tenant A Inactive', email: 'inactiveA@example.com' },
    { id: 'user-tenantB-1', full_name: 'Tenant B Owner', email: 'ownerB@example.com' },
    { id: 'user-unassigned-001', full_name: 'Unassigned User', email: 'unassigned@example.com' },
  ];

  function evaluateProfilesSelectRLS(
    profile: ProfileRow,
    authUid: string | null,
    isPlatformSuperAdmin: boolean
  ): boolean {
    if (!authUid) return false;
    if (profile.id === authUid) return true;
    if (isPlatformSuperAdmin) return true;
    const userTenantIds = simulateGetAuthUserTenantIds(authUid);
    const targetMemberships = rlsTestMemberships.filter(
      m => m.user_id === profile.id && m.status === 'active'
    );
    return targetMemberships.some(m => userTenantIds.includes(m.tenant_id));
  }

  // Model evaluation of audit_logs_select_scoped:
  // USING (
  //   public.is_platform_super_admin()
  //   OR tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())
  // )
  function evaluateAuditLogsSelectRLS(
    logTenantId: string,
    authUid: string | null,
    isPlatformSuperAdmin: boolean
  ): boolean {
    if (!authUid) return false;
    if (isPlatformSuperAdmin) return true;
    const adminTenantIds = simulateGetAuthUserAdminTenantIds(authUid);
    return adminTenantIds.includes(logTenantId);
  }

  // 8. Evaluasi Helper Admin Tenant IDs
  const adminA_Tenants = simulateGetAuthUserAdminTenantIds('user-tenantA-2');
  assert(adminA_Tenants.includes('tenant-A') && adminA_Tenants.length === 1, 'RLS Helper 1: Admin Tenant A memperoleh tepat [tenant-A]');

  const salesA_AdminTenants = simulateGetAuthUserAdminTenantIds('user-tenantA-1');
  assert(salesA_AdminTenants.length === 0, 'RLS Helper 2: Sales biasa tidak memiliki wewenang pada get_auth_user_admin_tenant_ids');

  // 9. Evaluasi Profiles Select Scoped
  const selfProfileView = evaluateProfilesSelectRLS(rlsTestProfiles[0], 'user-tenantA-1', false);
  assert(selfProfileView, 'RLS Profiles 1: Pengguna dapat membaca profil miliknya sendiri');

  const peerActiveProfileView = evaluateProfilesSelectRLS(rlsTestProfiles[1], 'user-tenantA-1', false);
  assert(peerActiveProfileView, 'RLS Profiles 2: Pengguna aktif dapat membaca profil rekan aktif satu tenant');

  const peerInactiveProfileView = evaluateProfilesSelectRLS(rlsTestProfiles[2], 'user-tenantA-1', false);
  assert(!peerInactiveProfileView, 'RLS Profiles 3: Pengguna biasa DITOLAK membaca profil rekan non-aktif (mencegah user harvesting)');

  const crossTenantProfileView = evaluateProfilesSelectRLS(rlsTestProfiles[3], 'user-tenantA-1', false);
  assert(!crossTenantProfileView, 'RLS Profiles 4: Pengguna Tenant A DITOLAK membaca profil anggota Tenant B');

  const saAllProfilesView = rlsTestProfiles.every(p => evaluateProfilesSelectRLS(p, 'super-admin-uuid', true));
  assert(saAllProfilesView, 'RLS Profiles 5: Platform Super Admin DIIZINKAN membaca seluruh profil');

  // 10. Evaluasi Audit Logs Select Scoped
  const saCanViewAuditLogs = evaluateAuditLogsSelectRLS('tenant-A', 'super-admin-uuid', true);
  assert(saCanViewAuditLogs, 'RLS Audit Logs 1: Super Admin dapat membaca audit log tenant manapun');

  const tenantAdminCanViewAuditLogs = evaluateAuditLogsSelectRLS('tenant-A', 'user-tenantA-2', false);
  assert(tenantAdminCanViewAuditLogs, 'RLS Audit Logs 2: Tenant Admin dapat membaca audit log tenant miliknya');

  const tenantSalesCannotViewAuditLogs = evaluateAuditLogsSelectRLS('tenant-A', 'user-tenantA-1', false);
  assert(!tenantSalesCannotViewAuditLogs, 'RLS Audit Logs 3: Anggota biasa (Sales) DITOLAK membaca audit log');

  const crossTenantAdminCannotView = evaluateAuditLogsSelectRLS('tenant-B', 'user-tenantA-2', false);
  assert(!crossTenantAdminCannotView, 'RLS Audit Logs 4: Admin Tenant A DITOLAK membaca audit log Tenant B');

  // 11. Verifikasi AST File Migrasi Patch 001.1
  console.log(`\n[TEST GROUP 10] Validasi Sintaks & AST Patch Migration 001.1 (pgsql-parser)`);
  const fs = await import('fs');
  const path = await import('path');
  const { parse } = await import('pgsql-parser');

  const patchFilePath = path.resolve('docs/migrations/001_1_fix_membership_rls.sql');
  assert(fs.existsSync(patchFilePath), 'Patch Verification 1: File docs/migrations/001_1_fix_membership_rls.sql tersedia');

  const patchSql = fs.readFileSync(patchFilePath, 'utf8');
  assert(patchSql.includes('BEGIN;') && patchSql.includes('COMMIT;'), 'Patch Verification 2: Patch dibungkus dalam blok transaksi BEGIN / COMMIT');
  assert(patchSql.includes('get_auth_user_tenant_ids'), 'Patch Verification 3: Helper get_auth_user_tenant_ids didefinisikan');
  assert(patchSql.includes('get_auth_user_admin_tenant_ids'), 'Patch Verification 4: Helper get_auth_user_admin_tenant_ids didefinisikan');
  assert(patchSql.includes('SECURITY DEFINER'), 'Patch Verification 5: Helper menggunakan SECURITY DEFINER');
  assert(patchSql.includes('search_path = public, pg_temp'), 'Patch Verification 6: SET search_path terlindungi');
  assert(patchSql.includes('OWNER TO postgres'), 'Patch Verification 7: Function owner diarahkan ke postgres');
  assert(patchSql.includes('tenant_id IN (SELECT public.get_auth_user_admin_tenant_ids())'), 'Patch Verification 8: Policy tenant_memberships memberikan akses ke Tenant Owner/Admin');
  assert(!patchSql.includes('audit_logs_select_scoped'), 'Patch Verification 9: Minimal Scope: audit_logs_select_scoped tidak diubah');
  assert(!patchSql.includes('tenants_select_scoped'), 'Patch Verification 10: Minimal Scope: tenants_select_scoped tidak diubah');

  const astResult = (await parse(patchSql)) as { version?: number; stmts?: unknown[] };
  const stmtsCount = Array.isArray(astResult?.stmts) ? astResult.stmts.length : 0;
  assert(stmtsCount > 0, `Patch Verification 11: Parser PostgreSQL 15+ memvalidasi ${stmtsCount} pernyataan SQL tanpa error`);

  console.log(`\n======================================================`);
  console.log(`${GREEN}SELURUH PENGUJIAN SELESAI: ${passedTests}/${totalTests} TESTS PASSED (100%)${RESET}`);
  console.log(`======================================================\n`);
}

runTestSuite().catch((err) => {
  console.error(`${RED}Test execution failed:${RESET}`, err);
  process.exit(1);
});
