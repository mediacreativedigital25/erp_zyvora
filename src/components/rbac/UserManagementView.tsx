import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
  UserX,
  AlertTriangle,
  Info,
  Edit3,
  Trash2
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { PageToolbar } from '../common/PageToolbar';
import { PageTable, Column } from '../common/PageTable';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { UserProfile, OfficialRole } from '../../types/erp';
import {
  OFFICIAL_ROLES,
  ROLE_DEFINITIONS,
  normalizeRole,
  USER_CODE_CAPACITY_AUDIT
} from '../../domain/validators/erpRules';
import { UserDetailModal } from './UserDetailModal';
import { ChangeRoleModal } from './ChangeRoleModal';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { ALL_TENANTS } from '../../data/mockData';

export interface UserManagementViewProps {
  mode?: 'tenant' | 'platform';
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ mode = 'tenant' }) => {
  const {
    users,
    currentUser,
    tenant,
    allTenants,
    isCurrentUserSuperAdmin,
    userRoleAudits,
    updateUserRole,
    updateUserProfile,
    deleteUser,
    toggleUserStatus,
    inviteUser,
    refreshUsers,
    addToast
  } = useErp();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load real database users on mount
  React.useEffect(() => {
    refreshUsers();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUsers();
      addToast('Data Synced', 'User directory updated successfully from the central system.', 'success');
    } catch {
      addToast('Failed to Load', 'An error occurred while updating user data.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modals state
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [userForStatusToggle, setUserForStatusToggle] = useState<UserProfile | null>(null);
  const [userForDelete, setUserForDelete] = useState<UserProfile | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isStatusToggling, setIsStatusToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCapacityInfo, setShowCapacityInfo] = useState(false);

  const handleConfirmDelete = async () => {
    if (!userForDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userForDelete.id, false, 'Deactivated / removed from user management interface');
      setUserForDelete(null);
    } catch (err: unknown) {
      // toast shown in context
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered dataset according to mode (tenant vs platform)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // In tenant mode, EXCLUDE Super Admin and only show members of this tenant
      if (mode === 'tenant') {
        if (u.isPlatformSuperAdmin || normalizeRole(u.role) === 'super_admin') {
          return false;
        }
        if (u.tenantId && u.tenantId !== tenant.id) {
          return false;
        }
      }

      // Search by name, email, or user code
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesCode = u.userCode.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesCode) {
          return false;
        }
      }

      // Role filter
      if (selectedRoleFilter !== 'all') {
        const norm = normalizeRole(u.role);
        if (norm !== selectedRoleFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (u.status !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter, mode, tenant.id]);

  // Existing user codes for collision prevention
  const existingCodes = useMemo(() => {
    return users.map((u) => u.userCode);
  }, [users]);

  // Handle status toggle confirmation
  const handleConfirmStatusToggle = async () => {
    if (!userForStatusToggle) return;
    setIsStatusToggling(true);
    const targetStatus = userForStatusToggle.status === 'active' ? 'inactive' : 'active';
    const reason =
      targetStatus === 'inactive'
        ? 'Account deactivation by administrator. User code permanently locked from reuse.'
        : 'Account reactivation by administrator.';

    try {
      await toggleUserStatus(userForStatusToggle.id, targetStatus, reason);
      setUserForStatusToggle(null);
    } catch (err: unknown) {
      // Error is already alerted via toast in context
    } finally {
      setIsStatusToggling(false);
    }
  };

  // Base list for metrics in current mode
  const currentModeBaseUsers = useMemo(() => {
    if (mode === 'tenant') {
      return users.filter(
        (u) =>
          !u.isPlatformSuperAdmin &&
          normalizeRole(u.role) !== 'super_admin' &&
          (u.tenantId === tenant.id || !u.tenantId)
      );
    }
    return users;
  }, [users, mode, tenant.id]);

  const superAdminCount = users.filter((u) => u.isPlatformSuperAdmin || normalizeRole(u.role) === 'super_admin').length;
  const activeCount = currentModeBaseUsers.filter((u) => u.status === 'active').length;
  const inactiveCount = currentModeBaseUsers.filter((u) => u.status === 'inactive').length;

  // Table columns definition
  const columns: Column<UserProfile>[] = [
    {
      key: 'userCode',
      header: 'User Code',
      width: '100px',
      align: 'center',
      render: (u) => (
        <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded tracking-wide">
          {u.userCode}
        </span>
      )
    },
    {
      key: 'identity',
      header: mode === 'tenant' ? 'Tenant Member' : 'System User',
      render: (u) => {
        const initials = u.fullName
          ? u.fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : 'U';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#086288] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-[#0F172A] truncate">
                  {u.fullName}
                </span>
                {u.isPlatformSuperAdmin && (
                  <span title="Super Admin Platform" className="shrink-0">
                    <Shield className="w-3.5 h-3.5 text-[#086288]" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#475569] truncate font-mono">{u.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'role',
      header: mode === 'tenant' ? 'Assigned Role' : 'System Role',
      width: '180px',
      render: (u) => {
        const norm = normalizeRole(u.role);
        const meta = ROLE_DEFINITIONS[norm];
        return (
          <div className="space-y-0.5">
            <span
              className={`inline-block text-[11px] px-2 py-0.5 rounded font-semibold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
            >
              {meta.label}
            </span>
            <span className="block text-[10px] text-[#94A3B8]">
              {meta.scope === 'platform' ? 'Platform Scope' : 'Tenant Scope'}
            </span>
          </div>
        );
      }
    },
    ...(mode === 'platform'
      ? [
          {
            key: 'tenant',
            header: 'Assigned Tenant',
            width: '200px',
            render: (u: UserProfile) => {
              const assignedTenant = ALL_TENANTS.find((t) => t.id === u.tenantId);
              return (
                <div className="text-xs">
                  <div className="font-medium text-[#0F172A] truncate">
                    {assignedTenant?.name || u.tenantName || 'Global System Account'}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono truncate">
                    {u.tenantId ? `ID: ${u.tenantId}` : 'Unassigned'}
                  </div>
                </div>
              );
            }
          }
        ]
      : []),
    {
      key: 'status',
      header: 'Account Status',
      width: '120px',
      align: 'center',
      render: (u) => (
        <StatusBadge status={u.status === 'active' ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '180px',
      align: 'right',
      render: (u) => {
        const isTargetSuper =
          u.isPlatformSuperAdmin ||
          normalizeRole(u.role) === 'super_admin' ||
          u.userCode === '2A' ||
          u.email?.toLowerCase() === 'admin@yulovi.com';

        const isSelf =
          currentUser &&
          (currentUser.id === u.id ||
            currentUser.userCode === u.userCode ||
            currentUser.email?.toLowerCase() === u.email?.toLowerCase());

        const canEdit = !isTargetSuper || isSelf;
        const canChangeRole = isCurrentUserSuperAdmin && (!isTargetSuper || isSelf);
        const canToggleStatus = isCurrentUserSuperAdmin && (!isTargetSuper || isSelf);
        const canDelete = isCurrentUserSuperAdmin && (!isTargetSuper || isSelf);

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSelectedUserForDetail(u)}
              className="p-1.5 text-[#475569] hover:text-[#086288] hover:bg-[#EEF4F8] rounded transition-colors cursor-pointer"
              title="View Details & Audit History"
              aria-label={`View Details ${u.fullName}`}
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (canEdit) {
                  setSelectedUserForEdit(u);
                } else {
                  addToast(
                    'Access Denied',
                    'Super Admin accounts can only be edited by the Super Admin themselves.',
                    'warning'
                  );
                }
              }}
              disabled={!canEdit}
              className={`p-1.5 rounded transition-colors ${
                canEdit
                  ? 'text-[#086288] hover:bg-[#EFF7FA] cursor-pointer'
                  : 'text-[#94A3B8] opacity-35 cursor-not-allowed'
              }`}
              title={
                canEdit
                  ? 'Edit User Profile & Data'
                  : 'Super Admin accounts can only be edited by the Super Admin themselves'
              }
              aria-label={`Edit ${u.fullName}`}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isCurrentUserSuperAdmin) {
                  addToast(
                    'Access Denied',
                    'Only Platform Super Admins are authorized to change user roles.',
                    'warning'
                  );
                  return;
                }
                if (isTargetSuper && !isSelf) {
                  addToast(
                    'Access Denied',
                    'Super Admin accounts can only be edited or modified by the Super Admin themselves.',
                    'warning'
                  );
                  return;
                }
                setSelectedUserForRoleChange(u);
              }}
              disabled={!canChangeRole}
              className={`p-1.5 rounded transition-colors ${
                canChangeRole
                  ? 'text-[#086288] hover:bg-[#EEF4F8] cursor-pointer'
                  : 'text-[#94A3B8] opacity-35 cursor-not-allowed'
              }`}
              title={
                !isCurrentUserSuperAdmin
                  ? 'Only Platform Super Admins are authorized to change user roles'
                  : isTargetSuper && !isSelf
                  ? 'Super Admin accounts can only be changed by the Super Admin themselves'
                  : 'Change User Role'
              }
              aria-label={`Change Role ${u.fullName}`}
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isCurrentUserSuperAdmin) {
                  addToast(
                    'Access Denied',
                    'Only Platform Super Admins are authorized to change account status.',
                    'warning'
                  );
                  return;
                }
                if (isTargetSuper && !isSelf) {
                  addToast(
                    'Access Denied',
                    'Super Admin account status can only be modified by the Super Admin themselves.',
                    'warning'
                  );
                  return;
                }
                setUserForStatusToggle(u);
              }}
              disabled={!canToggleStatus}
              className={`p-1.5 rounded transition-colors ${
                !canToggleStatus
                  ? 'text-[#94A3B8] opacity-35 cursor-not-allowed'
                  : u.status === 'active'
                  ? 'text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer'
                  : 'text-[#16A34A] hover:bg-[#DCFCE7] cursor-pointer'
              }`}
              title={
                !isCurrentUserSuperAdmin
                  ? 'Only Platform Super Admins are authorized'
                  : isTargetSuper && !isSelf
                  ? 'Super Admin account status can only be modified by the Super Admin themselves'
                  : u.status === 'active'
                  ? 'Deactivate Account'
                  : 'Reactivate Account'
              }
              aria-label={`Change Status ${u.fullName}`}
            >
              {u.status === 'active' ? (
                <UserX className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => setUserForDelete(u)}
                className="p-1.5 text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors cursor-pointer"
                title="Delete / Deactivate User"
                aria-label={`Delete ${u.fullName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const canAddUser =
    mode === 'platform'
      ? isCurrentUserSuperAdmin
      : (isCurrentUserSuperAdmin || ['owner', 'admin'].includes(currentUser.role));

  const addActionLabel = mode === 'platform' ? 'Add System User' : 'Add Tenant Member';

  return (
    <div className="space-y-4">
      {/* Security Status Banner */}
      <div className="p-3 rounded-md bg-white border border-[#DCE5EC] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#0F172A] flex items-center gap-2">
              <span>Session Authorization Status:</span>
              {isCurrentUserSuperAdmin ? (
                <span className="text-[#086288] font-bold bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
                  Platform Super Admin
                </span>
              ) : (
                <span className="text-[#475569] font-medium bg-[#EEF4F8] px-2 py-0.5 rounded border border-[#DCE5EC]">
                  Tenant Member ({ROLE_DEFINITIONS[normalizeRole(currentUser.role)]?.label})
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#475569] mt-0.5">
              {mode === 'tenant'
                ? `Displaying operational staff and members under ${tenant.name}. Platform Super Admin accounts are excluded to prevent overlap.`
                : isCurrentUserSuperAdmin
                ? `Your account (${currentUser.email} / ${currentUser.userCode}) is verified with Platform Super Admin privileges.`
                : 'You have tenant operational access.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EEF4F8]">
          <div className="text-right">
            <span className="text-[10px] text-[#94A3B8] block">
              {mode === 'tenant' ? 'Total Members' : 'Total Users'}
            </span>
            <span className="font-bold text-sm text-[#0F172A] tabular-nums">
              {currentModeBaseUsers.length}
            </span>
          </div>
          {mode === 'platform' && (
            <>
              <div className="h-6 w-px bg-[#DCE5EC]" />
              <div className="text-right">
                <span className="text-[10px] text-[#94A3B8] block">Super Admin</span>
                <span className="font-bold text-sm text-[#086288] tabular-nums">{superAdminCount}</span>
              </div>
            </>
          )}
          <div className="h-6 w-px bg-[#DCE5EC]" />
          <div className="text-right">
            <span className="text-[10px] text-[#94A3B8] block">Active / Inactive</span>
            <span className="font-bold text-sm text-[#16A34A] tabular-nums">
              {activeCount} <span className="text-[#94A3B8] font-normal">/</span> {inactiveCount}
            </span>
          </div>
        </div>
      </div>

      {/* Scaling Capacity Audit Note (Collapsible) */}
      <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DCE5EC] text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#475569]">
            <Info className="w-4 h-4 text-[#086288]" />
            <span className="font-semibold text-[#0F172A]">User Code Capacity Audit (2–3 Alphanumeric Characters)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCapacityInfo(!showCapacityInfo)}
            className="text-[11px] font-semibold text-[#086288] hover:underline cursor-pointer"
          >
            {showCapacityInfo ? 'Close Details' : 'View Capacity Analysis'}
          </button>
        </div>

        {showCapacityInfo && (
          <div className="mt-2.5 pt-2.5 border-t border-[#DCE5EC] space-y-1.5 text-[11px] text-[#475569] leading-relaxed">
            <p>
              In accordance with Section 4 specifications, uppercase alphanumeric User Codes (A–Z, 0–9) with 2–3 characters have the following mathematical capacity limits:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 font-mono text-[10px] text-[#0F172A]">
              <li>Length 2 characters: 36² = <strong>1,296</strong> unique combinations</li>
              <li>Length 3 characters: 36³ = <strong>46,656</strong> unique combinations</li>
              <li>Total global capacity: 1,296 + 46,656 = <strong>47,952</strong> lifetime users</li>
              <li>Safe capacity (excluding ambiguous glyphs O/0 and I/1): 32² + 32³ = <strong>33,792</strong> users</li>
            </ul>
            <p className="text-[#D97706] font-medium pt-1">
              <strong>Scalability Note:</strong> Because deactivated user codes are permanently barred from recycling, this capacity covers all historical accounts. If the platform approaches the 35,000 threshold, the Product Owner is advised to approve migrating to 4-character codes (1.67 million combinations).
            </p>
          </div>
        )}
      </div>

      {/* Toolbar: Search & Filters */}
      <PageToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name, email, or User Code (e.g. 1A, 1BZ)..."
        onResetFilters={
          selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery
            ? () => {
                setSearchQuery('');
                setSelectedRoleFilter('all');
                setSelectedStatusFilter('all');
              }
            : undefined
        }
        filterGroups={[
          {
            id: 'role',
            label: 'Role',
            options: [
              { value: 'all', label: 'All Roles' },
              { value: 'super_admin', label: 'Super Admin' },
              { value: 'owner', label: 'Owner' },
              { value: 'admin', label: 'Admin' },
              { value: 'sales', label: 'Sales' },
              { value: 'customer', label: 'Customers' }
            ],
            selectedValue: selectedRoleFilter,
            onChange: setSelectedRoleFilter
          },
          {
            id: 'status',
            label: 'Status',
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ],
            selectedValue: selectedStatusFilter,
            onChange: setSelectedStatusFilter
          }
        ]}
        extraActions={
          canAddUser ? (
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{addActionLabel}</span>
            </button>
          ) : undefined
        }
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Table of Users */}
      <PageTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        emptyTitle="No Users Found"
        emptyDescription="No user accounts match the current search query or selected filter criteria."
        emptyActionLabel={
          searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all'
            ? 'Reset Filters'
            : isCurrentUserSuperAdmin
            ? 'Add New User'
            : undefined
        }
        onEmptyAction={
          searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all'
            ? () => {
                setSearchQuery('');
                setSelectedRoleFilter('all');
                setSelectedStatusFilter('all');
              }
            : isCurrentUserSuperAdmin
            ? () => setIsAddUserModalOpen(true)
            : undefined
        }
      />

      {/* Modal Detail & Audit History */}
      <UserDetailModal
        isOpen={Boolean(selectedUserForDetail)}
        onClose={() => setSelectedUserForDetail(null)}
        user={selectedUserForDetail}
        auditLogs={userRoleAudits}
        onOpenChangeRole={(target) => setSelectedUserForRoleChange(target)}
        isSuperAdminActor={isCurrentUserSuperAdmin}
      />

      {/* Modal Change User Role */}
      <ChangeRoleModal
        isOpen={Boolean(selectedUserForRoleChange)}
        onClose={() => setSelectedUserForRoleChange(null)}
        user={selectedUserForRoleChange}
        currentUser={currentUser}
        onConfirmChangeRole={updateUserRole}
        isSuperAdminActor={isCurrentUserSuperAdmin}
      />

      {/* Modal Add / Invite User */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUser={async (payload) => {
          await inviteUser(payload);
        }}
        existingCodes={existingCodes}
        tenantId={tenant.id}
        tenantName={tenant.name}
        isSuperAdminActor={isCurrentUserSuperAdmin}
        allowTenantSelection={mode === 'platform' && isCurrentUserSuperAdmin}
        availableTenants={allTenants.map((t) => ({ id: t.id, name: t.name, code: t.code }))}
      />

      {/* Modal Edit User Data */}
      <EditUserModal
        isOpen={Boolean(selectedUserForEdit)}
        onClose={() => setSelectedUserForEdit(null)}
        user={selectedUserForEdit}
        currentUser={currentUser}
        onSave={async (userId, data) => {
          await updateUserProfile(userId, data);
        }}
        isSuperAdminActor={isCurrentUserSuperAdmin}
        availableTenants={allTenants.map((t) => ({ id: t.id, name: t.name, code: t.code }))}
      />

      {/* Dialog Confirmation: Status Toggle */}
      <ConfirmDialog
        isOpen={Boolean(userForStatusToggle)}
        title={
          userForStatusToggle?.status === 'active'
            ? 'Confirm Account Deactivation'
            : 'Confirm Account Reactivation'
        }
        message={
          userForStatusToggle?.status === 'active'
            ? `Are you sure you want to deactivate ${userForStatusToggle?.fullName} (${userForStatusToggle?.userCode})? In compliance with Section 4 rules, User Code [${userForStatusToggle?.userCode}] will be permanently locked and CANNOT be reused by other users.`
            : `Are you sure you want to reactivate ${userForStatusToggle?.fullName} (${userForStatusToggle?.userCode})? The user will regain access corresponding to Role ${userForStatusToggle?.role}.`
        }
        confirmLabel={
          userForStatusToggle?.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'
        }
        cancelLabel="Cancel"
        isDestructive={userForStatusToggle?.status === 'active'}
        isLoading={isStatusToggling}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setUserForStatusToggle(null)}
      />

      {/* Dialog Confirmation: Delete User */}
      <ConfirmDialog
        isOpen={Boolean(userForDelete)}
        title="Confirm User Deletion"
        message={`Are you sure you want to remove or deactivate the account ${userForDelete?.fullName} (${userForDelete?.userCode})? Operational access will be revoked and privileges deactivated.`}
        confirmLabel="Delete / Deactivate"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserForDelete(null)}
      />
    </div>
  );
};
