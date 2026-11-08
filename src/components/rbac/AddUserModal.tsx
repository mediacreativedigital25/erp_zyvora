import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw, AlertCircle, Eye, EyeOff, KeyRound, Building2, Lock } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { OfficialRole } from '../../types/erp';
import {
  OFFICIAL_ROLES,
  ROLE_DEFINITIONS,
  validateUserCode,
  generateUserCodeCandidate
} from '../../domain/validators/erpRules';

export interface TenantOption {
  id: string;
  name: string;
  code: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (data: {
    fullName: string;
    email: string;
    password?: string;
    role: OfficialRole;
    tenantId: string;
    tenantName?: string;
    preferredUserCode?: string;
  }) => Promise<void>;
  existingCodes: string[];
  tenantId: string;
  tenantName: string;
  isSuperAdminActor: boolean;
  allowTenantSelection?: boolean;
  availableTenants?: TenantOption[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
  existingCodes,
  tenantId,
  tenantName,
  isSuperAdminActor,
  allowTenantSelection = false,
  availableTenants = []
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<OfficialRole>('admin');
  const [userCode, setUserCode] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenantId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to generate a strong random password
  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + symbols;

    let res = '';
    res += uppercase[Math.floor(Math.random() * uppercase.length)];
    res += lowercase[Math.floor(Math.random() * lowercase.length)];
    res += numbers[Math.floor(Math.random() * numbers.length)];
    res += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 0; i < 6; i++) {
      res += all[Math.floor(Math.random() * all.length)];
    }
    // Shuffle
    return res.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Reset and auto-generate candidate code & password when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPassword(generateStrongPassword());
      setShowPassword(false);
      setRole('admin');
      setSelectedTenantId(tenantId);
      setErrorMessage(null);
      const generated = generateUserCodeCandidate(existingCodes, 3);
      setUserCode(generated);
    }
  }, [isOpen, existingCodes, tenantId]);

  const handleRegenerateCode = () => {
    const generated = generateUserCodeCandidate(existingCodes, 3);
    setUserCode(generated);
  };

  const handleRegeneratePassword = () => {
    setPassword(generateStrongPassword());
    setShowPassword(true);
  };

  // Determine current active target tenant label
  const currentTargetTenant = availableTenants.find((t) => t.id === selectedTenantId);
  const effectiveTenantName = selectedTenantId
    ? currentTargetTenant?.name || tenantName
    : 'Global System Account (No Tenant)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('User full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Invalid email address. Please ensure correct email format.');
      return;
    }

    if (!password.trim() || password.trim().length < 8) {
      setErrorMessage('Password is required with a minimum of 8 characters.');
      return;
    }

    const codeCheck = validateUserCode(userCode);
    if (!codeCheck.isValid) {
      setErrorMessage(codeCheck.error || 'Invalid User Code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        tenantId: selectedTenantId,
        tenantName: effectiveTenantName,
        preferredUserCode: userCode.trim().toUpperCase()
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add user.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Roles available: if not super admin, exclude 'super_admin'
  const selectableRoles = isSuperAdminActor
    ? OFFICIAL_ROLES
    : OFFICIAL_ROLES.filter((r) => r !== 'super_admin');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      size="md"
      title="Add New User"
      description="Register an account with initial credentials, official role, and tenant organization assignment."
      icon={<UserPlus className="w-4.5 h-4.5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#475569] truncate max-w-[240px]">
            Tenant: <strong>{effectiveTenantName}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-2xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register User</span>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Tenant Selection */}
        <div className="space-y-1">
          <label className="font-semibold text-xs text-[#0F172A] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#086288]" />
              Assigned Organization / Tenant
            </span>
            {!allowTenantSelection && (
              <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-normal">
                <Lock className="w-3 h-3 text-[#94A3B8]" />
                Locked to active tenant
              </span>
            )}
          </label>

          {allowTenantSelection && isSuperAdminActor ? (
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9.5 px-3 border border-[#DCE5EC] rounded-md bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] cursor-pointer"
            >
              <option value="">-- No Tenant (Global System Account) --</option>
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          ) : (
            <div className="h-9.5 px-3 border border-[#DCE5EC] bg-[#F8FAFC] rounded-md flex items-center justify-between text-xs font-semibold text-[#0F172A]">
              <span>{tenantName}</span>
              <span className="text-[10px] text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded font-mono">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="font-semibold text-xs text-[#0F172A] block">
            Full Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. John Doe"
            className="w-full h-9.5 px-3 border border-[#DCE5EC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="font-semibold text-xs text-[#0F172A] block">
            Email Address (Login Identity) <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="name@company.com"
            className="w-full h-9.5 px-3 border border-[#DCE5EC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[#0F172A] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#086288]" />
              Account Password <span className="text-[#DC2626]">*</span>
            </label>
            <button
              type="button"
              onClick={handleRegeneratePassword}
              disabled={isSubmitting}
              className="text-[11px] text-[#086288] hover:text-[#064B6A] flex items-center gap-1 font-medium cursor-pointer"
              title="Generate strong random password"
            >
              <RefreshCw className="w-3 h-3" />
              Generate Strong Password
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="Minimum 8 characters..."
              className="w-full h-9.5 pl-3 pr-10 border border-[#DCE5EC] rounded-md font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] placeholder:text-[#94A3B8]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-1 cursor-pointer transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[11px] text-[#64748B] block">
            The user will use this initial password for their first sign in.
          </span>
        </div>

        {/* User Code (2-3 Characters) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[#0F172A]">
              Unique User Code (2–3 Characters) <span className="text-[#DC2626]">*</span>
            </label>
            <button
              type="button"
              onClick={handleRegenerateCode}
              disabled={isSubmitting}
              className="text-[11px] text-[#086288] hover:text-[#064B6A] flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Randomize Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={3}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              placeholder="2A / 2BZ"
              className="w-28 h-9.5 px-3 border border-[#DCE5EC] rounded-md font-mono text-center font-bold text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
            <span className="text-[11px] text-[#475569]">
              Safe 32-character alphabet (excluding 0, 1, O, I). Examples: <code>2B</code>, <code>2A2</code>, <code>2BZ</code>.
            </span>
          </div>
        </div>

        {/* Official Role */}
        <div className="space-y-1">
          <label className="font-semibold text-xs text-[#0F172A] block">
            Role & Access Rights <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectableRoles.map((r) => {
              const meta = ROLE_DEFINITIONS[r];
              const isSelected = role === r;
              return (
                <label
                  key={r}
                  className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-start gap-2 ${
                    isSelected
                      ? 'border-[#086288] bg-[#EFF7FA]'
                      : 'border-[#DCE5EC] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name="new_user_role"
                    value={r}
                    checked={isSelected}
                    onChange={() => setRole(r)}
                    className="mt-0.5 text-[#086288] focus:ring-[#086288]"
                  />
                  <div>
                    <div className="font-semibold text-xs text-[#0F172A]">{meta.label}</div>
                    <div className="text-[10px] text-[#475569] leading-tight mt-0.5">
                      {meta.scope === 'platform' ? 'Platform Administrator' : 'Tenant Member'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
