import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { UserProfile, OfficialRole } from '../../types/erp';
import { OFFICIAL_ROLES, ROLE_DEFINITIONS, normalizeRole } from '../../domain/validators/erpRules';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentUser?: UserProfile | null;
  onConfirmChangeRole: (targetUserId: string, newRole: OfficialRole, reason: string) => Promise<void>;
  isSuperAdminActor: boolean;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onConfirmChangeRole,
  isSuperAdminActor
}) => {
  const [selectedRole, setSelectedRole] = useState<OfficialRole>('admin');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRole(normalizeRole(user.role));
      setReason('');
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  if (!user) return null;

  const currentRoleNormalized = normalizeRole(user.role);

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

  const canModifyRole = isSuperAdminActor && (!isTargetSuper || isSelf);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSuperAdminActor) {
      setErrorMessage('Access denied: Only Platform Super Admins are authorized to change user roles.');
      return;
    }

    if (isTargetSuper && !isSelf) {
      setErrorMessage('Access denied: Super Admin accounts can only be modified by the Super Admin themselves.');
      return;
    }

    if (!reason || reason.trim().length < 3) {
      setErrorMessage('Role change reason is required with at least 3 characters for official audit trail records.');
      return;
    }

    if (selectedRole === currentRoleNormalized) {
      setErrorMessage("Selected role is the same as the user's current role.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmChangeRole(user.id, selectedRole, reason.trim());
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while processing role change.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <span>Change User Role & Access Rights</span>
        </div>
      }
      description={`Official role update for ${user.fullName} (${user.userCode}). This operation is permanently audited.`}
      icon={<KeyRound className="w-4.5 h-4.5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#475569]">
            {isSuperAdminActor ? (
              <span className="text-[#16A34A] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Super Admin Authorization Verified
              </span>
            ) : (
              <span className="text-[#DC2626] flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Access Denied (Not Super Admin)
              </span>
            )}
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
              disabled={isSubmitting || !canModifyRole}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-2xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Role Changes</span>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Guard warning if actor is not super admin */}
        {!isSuperAdminActor && (
          <div className="p-3 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              You currently do not possess <strong>Platform Super Admin</strong> privileges. Role assignments and modifications can only be processed by a Platform Super Admin.
            </p>
          </div>
        )}

        {/* Guard warning if target is Super Admin and actor is not self */}
        {isTargetSuper && !isSelf && (
          <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Super Admin Rule:</strong> Super Admin accounts cannot be edited or modified except by the Super Admin themselves.
            </p>
          </div>
        )}

        {/* User Summary Box */}
        <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DCE5EC] flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[#0F172A]">{user.fullName}</div>
            <div className="text-[11px] text-[#475569]">{user.email}</div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded block">
              {user.userCode}
            </span>
            <span className="text-[10px] text-[#94A3B8] block mt-0.5">
              Current Role: <strong>{ROLE_DEFINITIONS[currentRoleNormalized]?.label || user.role}</strong>
            </span>
          </div>
        </div>

        {/* Role Options */}
        <div className="space-y-2">
          <label className="font-semibold text-xs text-[#0F172A] block">
            Select Official Zyvora ERP Role <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {OFFICIAL_ROLES.map((roleKey) => {
              const meta = ROLE_DEFINITIONS[roleKey];
              const isSelected = selectedRole === roleKey;
              const isCurrent = currentRoleNormalized === roleKey;

              return (
                <label
                  key={roleKey}
                  className={`p-3 rounded-md border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-[#086288] bg-[#EFF7FA] shadow-2xs'
                      : 'border-[#DCE5EC] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name="official_role"
                    value={roleKey}
                    checked={isSelected}
                    onChange={() => setSelectedRole(roleKey)}
                    disabled={!isSuperAdminActor || isSubmitting}
                    className="mt-0.5 text-[#086288] focus:ring-[#086288]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#0F172A]">{meta.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                          {meta.scope === 'platform' ? 'Platform Scope' : 'Tenant Scope'}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-[#94A3B8] font-medium">
                          (Current Role)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Mandatory Reason for Audit Log */}
        <div className="space-y-1.5">
          <label className="font-semibold text-xs text-[#0F172A] block">
            Role Change Reason (Required for Audit Trail) <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={!canModifyRole || isSubmitting}
            placeholder="e.g. Operational responsibility adjustment following promotion or branch transfer..."
            rows={3}
            className="w-full px-3 py-2 text-xs border border-[#DCE5EC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed placeholder:text-[#94A3B8]"
          />
          <span className="text-[11px] text-[#94A3B8] block">
            Minimum 3 characters. This explanation will be permanently recorded in the <code>audit_logs</code> table with actor identity and timestamp.
          </span>
        </div>
      </form>
    </BaseModal>
  );
};
