import React from 'react';
import {
  User,
  Shield,
  Building2,
  Calendar,
  Clock,
  History,
  KeyRound,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { StatusBadge } from '../common/StatusBadge';
import { UserProfile, AuditLog } from '../../types/erp';
import { ROLE_DEFINITIONS, normalizeRole } from '../../domain/validators/erpRules';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  auditLogs: AuditLog[];
  onOpenChangeRole?: (user: UserProfile) => void;
  isSuperAdminActor: boolean;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  auditLogs,
  onOpenChangeRole,
  isSuperAdminActor
}) => {
  if (!user) return null;

  const normalizedRole = normalizeRole(user.role);
  const roleMeta = ROLE_DEFINITIONS[normalizedRole];

  // Filter logs relevant to this user's userCode or ID
  const userAudits = auditLogs.filter(
    (a) =>
      a.entityId === user.userCode ||
      a.description.includes(user.userCode) ||
      a.description.includes(user.fullName) ||
      a.description.includes(user.email)
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm text-[#0F172A]">User Details & Access Rights</span>
          <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded">
            Code: {user.userCode}
          </span>
        </div>
      }
      description="Account identity details, role permissions, and authority change audit history."
      icon={<User className="w-4.5 h-4.5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569]">
            {user.isPlatformSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-[#086288] font-medium">
                <Shield className="w-3.5 h-3.5" /> Authorized Platform Super Admin Account
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer"
            >
              Close
            </button>
            {isSuperAdminActor && onOpenChangeRole && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangeRole(user);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change User Role
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-[#0F172A]">
        {/* Main Identity */}
        <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE5EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#086288] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#0F172A]">{user.fullName}</h3>
                <span className="text-[10px] font-mono font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-1.5 py-0.2 rounded">
                  {user.userCode}
                </span>
              </div>
              <p className="text-xs text-[#475569]">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded font-semibold border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}
            >
              {roleMeta.label}
            </span>
            <StatusBadge status={user.status === 'active' ? 'active' : 'inactive'} />
          </div>
        </div>

        {/* Technical & Tenant Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-md border border-[#DCE5EC] bg-white space-y-2">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
              Authentication Parameters & UUID
            </span>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">User Code (2-3 chars):</span>
                <span className="font-mono font-bold text-[#086288]">{user.userCode}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">System User ID (UUID):</span>
                <span className="font-mono text-[10px] text-[#0F172A] truncate max-w-[180px]" title={user.id}>
                  {user.id}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">Platform Scope:</span>
                <span className="font-medium text-[#0F172A]">
                  {user.isPlatformSuperAdmin ? 'Platform Super Admin' : 'Standard Tenant Role'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-md border border-[#DCE5EC] bg-white space-y-2">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
              Tenant Membership Scope
            </span>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">Tenant Name:</span>
                <span className="font-semibold text-[#0F172A] truncate max-w-[180px]">
                  {user.tenantName || 'Zyvora Global Enterprises'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">Tenant ID:</span>
                <span className="font-mono text-[10px] text-[#475569]">{user.tenantId}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#475569]">Registered Since:</span>
                <span className="text-[#475569]">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Description & Authority */}
        <div className="p-3.5 rounded-md bg-[#EFF7FA] border border-[#B7DDEA] text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#086288] mb-1">
            <Shield className="w-4 h-4" />
            <span>Role Authority: {roleMeta.label} ({roleMeta.scope === 'platform' ? 'Platform Scope' : 'Tenant Scope'})</span>
          </div>
          <p className="text-[11px] text-[#0F172A] leading-relaxed">
            {roleMeta.description}
          </p>
        </div>

        {/* Role Change History & Audit Trail */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0F172A]">
              <History className="w-4 h-4 text-[#086288]" />
              <span>Role Change History & Audit Trail</span>
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              {userAudits.length} recorded events
            </span>
          </div>

          {userAudits.length === 0 ? (
            <div className="p-4 text-center rounded-md border border-dashed border-[#DCE5EC] bg-[#F8FAFC] text-xs text-[#94A3B8]">
              No role change history or audit records found for this user.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {userAudits.map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 rounded border border-[#DCE5EC] bg-white hover:bg-[#F8FAFC] transition-colors text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                      <FileText className="w-3.5 h-3.5 text-[#086288]" />
                      <span>{audit.action} — {audit.entity}</span>
                    </div>
                    <span className="font-mono text-[#94A3B8] text-[10px]">
                      {new Date(audit.timestamp).toLocaleString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {audit.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
                    <span>Actor: <strong className="text-[#0F172A]">{audit.actorName}</strong> ({audit.actorRole})</span>
                    <span>•</span>
                    <span>IP: {audit.ipAddress}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
