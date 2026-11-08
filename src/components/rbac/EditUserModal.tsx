import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Building2, AlertCircle, Save } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { UserProfile, OfficialRole } from '../../types/erp';
import {
  OFFICIAL_ROLES,
  ROLE_DEFINITIONS,
  normalizeRole
} from '../../domain/validators/erpRules';
import { TenantOption } from './AddUserModal';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentUser?: UserProfile | null;
  onSave: (userId: string, data: {
    fullName: string;
    phone?: string;
    role?: OfficialRole;
    tenantId?: string;
    status?: 'active' | 'inactive';
  }) => Promise<void>;
  isSuperAdminActor: boolean;
  availableTenants?: TenantOption[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onSave,
  isSuperAdminActor,
  availableTenants = []
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OfficialRole>('admin');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setRole(normalizeRole(user.role));
      setStatus(user.status === 'active' ? 'active' : 'inactive');
      setSelectedTenantId(user.tenantId || '');
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  if (!user) return null;

  // Super Admin Rule: Super Admin accounts cannot be edited except by the Super Admin themselves
  const isTargetSuper =
    user.isPlatformSuperAdmin ||
    normalizeRole(user.role) === 'super_admin' ||
    user.userCode === '2A' ||
    user.email?.toLowerCase() === 'admin@yulovi.com';

  const isSelf =
    currentUser &&
    (currentUser.id === user.id ||
      currentUser.userCode === user.userCode ||
      currentUser.email?.toLowerCase() === user.email?.toLowerCase());

  const canEdit = !isTargetSuper || isSelf;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isTargetSuper && !isSelf) {
      setErrorMessage('Access denied: Super Admin accounts can only be edited by the Super Admin themselves.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('User full name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(user.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        role: isSuperAdminActor ? role : undefined,
        status: isSuperAdminActor ? status : undefined,
        tenantId: isSuperAdminActor ? selectedTenantId : undefined
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user profile.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <span>Edit User Profile & Authority</span>
          <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded">
            {user.userCode}
          </span>
        </div>
      }
      description={`Update account details, role permissions, and operational status for ${user.fullName}.`}
      icon={<UserCheck className="w-4.5 h-4.5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569] font-mono truncate max-w-[200px]">
            {user.email}
          </div>
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
              type="submit"
              form="edit-user-form"
              disabled={isSubmitting || !canEdit}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4 text-xs text-[#0F172A]">
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start gap-2.5 text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">{errorMessage}</div>
          </div>
        )}

        {/* Warning if target is Super Admin and actor is not self */}
        {isTargetSuper && !isSelf && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start gap-2.5 text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong>Super Admin Rule:</strong> Super Admin accounts cannot be edited except by the Super Admin themselves.
            </div>
          </div>
        )}

        {/* Readonly Identity Card */}
        <div className="p-3 bg-[#F8FAFC] border border-[#DCE5EC] rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">Account Email (Permanent)</div>
            <div className="font-mono text-xs text-[#0F172A] font-semibold mt-0.5">{user.email}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">User Code</div>
            <div className="font-mono text-xs font-bold text-[#086288] mt-0.5">{user.userCode}</div>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1">
            Full Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#DCE5EC] rounded-md focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            placeholder="Enter user full name..."
            required
          />
        </div>

        {/* Role Assignment */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
            <span>Role & Access Authority</span>
            {!isSuperAdminActor && (
              <span className="text-[10px] text-[#94A3B8] font-normal">Only Super Admins can modify</span>
            )}
          </label>
          {isSuperAdminActor ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {OFFICIAL_ROLES.map((rKey) => {
                const meta = ROLE_DEFINITIONS[rKey];
                const isSelected = role === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => setRole(rKey)}
                    className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#086288] bg-[#EFF7FA] shadow-2xs'
                        : 'border-[#DCE5EC] bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#0F172A]">{meta.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                        {meta.scope}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2.5 bg-[#F8FAFC] border border-[#DCE5EC] rounded-md text-xs text-[#475569]">
              {ROLE_DEFINITIONS[normalizeRole(user.role)]?.label || user.role}
            </div>
          )}
        </div>

        {/* Status Toggle */}
        {isSuperAdminActor && (
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Account Status
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="user-status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-[#086288] focus:ring-[#086288]"
                />
                <span className="text-[#16A34A] font-medium">Active (Can sign in & access modules)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="user-status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-[#086288] focus:ring-[#086288]"
                />
                <span className="text-[#DC2626] font-medium">Inactive (Access locked)</span>
              </label>
            </div>
          </div>
        )}

        {/* Tenant Assignment (If Super Admin & multiple tenants available) */}
        {isSuperAdminActor && availableTenants.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#086288]" />
              <span>Assigned Tenant Organization</span>
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCE5EC] rounded-md focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
