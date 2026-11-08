/**
 * Zyvora ERP 1.0.0 — Employee Form Modal (Core HR)
 * Multi-tab comprehensive employee registration modal with mandatory Cost Center binding.
 * All copywriting in standard English.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  CreditCard,
  MapPin,
  AlertCircle,
  Layers,
  Calendar,
  Briefcase,
  Phone,
  Mail,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import {
  Employee,
  Department,
  Position,
  Branch,
  EmploymentType,
  StandardAddressData,
  TenantBusinessLine,
  OfficialRole
} from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { EmployeeService } from '../../services/employeeService';
import { DocumentNumberingService } from '../../services/documentNumberingService';
import { TenantMasterService } from '../../services/tenantMasterService';
import { AddressForm } from '../common/AddressForm';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (saved: Employee) => void;
  initialEmployee?: Employee | null;
  departments: Department[];
  positions: Position[];
  branches: Branch[];
  businessLines?: TenantBusinessLine[];
  tenantCode?: string;
  tenantId?: string;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialEmployee,
  departments,
  positions,
  branches,
  businessLines,
  tenantCode = '001',
  tenantId = 'ten_zyvora_corp'
}) => {
  const { inviteUser, addToast, setEmployees } = useErp();
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'address'>('general');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Business Lines Master Data
  const [businessLinesList, setBusinessLinesList] = useState<TenantBusinessLine[]>(() => {
    return (
      businessLines ||
      TenantMasterService.getDefaultMarketProfile(tenantId).businessLines
    );
  });

  useEffect(() => {
    if (isOpen) {
      if (businessLines && businessLines.length > 0) {
        setBusinessLinesList(businessLines);
      } else {
        TenantMasterService.getMarketProfile(tenantId).then((profile) => {
          if (profile.businessLines && profile.businessLines.length > 0) {
            setBusinessLinesList(profile.businessLines);
          }
        });
      }
    }
  }, [isOpen, businessLines, tenantId]);

  // Photo
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Tab 1: General & Job Placement
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'br_jkt_hq');
  const [businessLineId, setBusinessLineId] = useState('');
  const [businessLineName, setBusinessLineName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [costCenterCode, setCostCenterCode] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('permanent');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'leave' | 'terminated'>('active');

  // Tab 1: System Access & Operational Assignment (Single-Input Convergence)
  const [isSalesPic, setIsSalesPic] = useState<boolean>(true);
  const [createSystemAccount, setCreateSystemAccount] = useState<boolean>(false);
  const [systemRole, setSystemRole] = useState<OfficialRole>('sales');
  const [systemPassword, setSystemPassword] = useState<string>('Zyvora@2026');

  // Tab 2: Financial & Tax
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [npwp, setNpwp] = useState('');
  const [ptkpStatus, setPtkpStatus] = useState<'TK/0' | 'K/0' | 'K/1' | 'K/2' | 'K/3'>('TK/0');
  const [bpjsKetenagakerjaan, setBpjsKetenagakerjaan] = useState('');
  const [bpjsKesehatan, setBpjsKesehatan] = useState('');

  // Tab 3: Address & Emergency Contact
  const [addressData, setAddressData] = useState<StandardAddressData>({
    country: 'Indonesia',
    provinceId: '',
    provinceName: '',
    regencyId: '',
    regencyName: '',
    districtId: '',
    districtName: '',
    villageId: '',
    villageName: '',
    postalCode: '',
    rt: '',
    rw: '',
    address: ''
  });
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Spouse');

  // Existing employees list for automatic NIK calculation
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);

  // Fetch existing employees whenever modal opens
  useEffect(() => {
    if (isOpen) {
      EmployeeService.getEmployees(tenantId)
        .then(setExistingEmployees)
        .catch((err) => console.error('Failed to load existing employees for NIK generation:', err));
    }
  }, [isOpen, tenantId]);

  // Reset or Populate
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setActiveTab('general');

    if (initialEmployee) {
      setAvatarUrl(initialEmployee.avatarUrl || '');
      setEmployeeCode(initialEmployee.employeeCode);
      setFullName(initialEmployee.fullName);
      setEmail(initialEmployee.email);
      setPhone(initialEmployee.phone);
      setBranchId(initialEmployee.branchId || branches[0]?.id || 'br_jkt_hq');
      const initialLob =
        businessLinesList.find((b) => b.id === initialEmployee.businessLineId) ||
        businessLinesList[0];
      setBusinessLineId(initialEmployee.businessLineId || initialLob?.id || `lob_${tenantId}_holding`);
      setBusinessLineName(initialEmployee.businessLineName || initialLob?.name || 'Holding / Shared Services');
      setDepartmentId(initialEmployee.departmentId || '');
      setPositionId(initialEmployee.positionId || '');
      setCostCenterCode(
        initialEmployee.costCenterCode || initialLob?.costCenterCode || 'CC-SHARED-HOLDING'
      );
      setSupervisorId(initialEmployee.supervisorId || '');
      setEmploymentType(initialEmployee.employmentType || 'permanent');
      setJoinDate(initialEmployee.joinDate || new Date().toISOString().split('T')[0]);
      setContractEndDate(initialEmployee.contractEndDate || '');
      setStatus(initialEmployee.status || 'active');
      setIsSalesPic(initialEmployee.isSalesPic ?? true);
      setCreateSystemAccount(initialEmployee.hasSystemAccount ?? false);
      setSystemRole(initialEmployee.systemRole || 'sales');

      setBankName(initialEmployee.bankName || 'BCA (Bank Central Asia)');
      setBankAccountNumber(initialEmployee.bankAccountNumber || '');
      setBankAccountHolder(initialEmployee.bankAccountHolder || initialEmployee.fullName);
      setNpwp(initialEmployee.npwp || '');
      setPtkpStatus(initialEmployee.ptkpStatus || 'TK/0');
      setBpjsKetenagakerjaan(initialEmployee.bpjsKetenagakerjaan || '');
      setBpjsKesehatan(initialEmployee.bpjsKesehatan || '');

      setAddressData({
        country: initialEmployee.country || 'Indonesia',
        provinceId: initialEmployee.provinceId || '',
        provinceName: initialEmployee.provinceName || '',
        regencyId: initialEmployee.regencyId || '',
        regencyName: initialEmployee.regencyName || '',
        districtId: initialEmployee.districtId || '',
        districtName: initialEmployee.districtName || '',
        villageId: initialEmployee.villageId || '',
        villageName: initialEmployee.villageName || '',
        postalCode: initialEmployee.postalCode || '',
        rt: initialEmployee.rt || '',
        rw: initialEmployee.rw || '',
        address: initialEmployee.address || '',
        latitude: initialEmployee.latitude,
        longitude: initialEmployee.longitude
      });
      setEmergencyContactName(initialEmployee.emergencyContactName || '');
      setEmergencyContactPhone(initialEmployee.emergencyContactPhone || '');
      setEmergencyContactRelation(initialEmployee.emergencyContactRelation || 'Spouse');
    } else {
      setAvatarUrl('');
      setFullName('');
      setEmail('');
      setPhone('');
      const defaultBranchId = branches[0]?.id || 'br_jkt_hq';
      setBranchId(defaultBranchId);
      const defaultLob =
        businessLinesList.find((b) => b.isPrimary) || businessLinesList[0];
      setBusinessLineId(defaultLob?.id || `lob_${tenantId}_holding`);
      setBusinessLineName(defaultLob?.name || 'Holding / Shared Services');
      const firstDept = departments[0];
      setDepartmentId(firstDept?.id || '');
      setCostCenterCode(defaultLob?.costCenterCode || 'CC-SHARED-HOLDING');
      setPositionId(positions[0]?.id || '');
      setSupervisorId('');
      setEmploymentType('permanent');
      const today = new Date().toISOString().split('T')[0];
      setJoinDate(today);
      setContractEndDate('');
      setStatus('active');
      setIsSalesPic(true);
      setCreateSystemAccount(true);
      setSystemRole('sales');
      setSystemPassword('Zyvora@2026');

      setBankName('BCA (Bank Central Asia)');
      setBankAccountNumber('');
      setBankAccountHolder('');
      setNpwp('');
      setPtkpStatus('TK/0');
      setBpjsKetenagakerjaan('');
      setBpjsKesehatan('');

      setAddressData({
        country: 'Indonesia',
        provinceId: '',
        provinceName: '',
        regencyId: '',
        regencyName: '',
        districtId: '',
        districtName: '',
        villageId: '',
        villageName: '',
        postalCode: '',
        rt: '',
        rw: '',
        address: '',
        latitude: undefined,
        longitude: undefined
      });
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setEmergencyContactRelation('Spouse');
    }
  }, [isOpen, initialEmployee, departments, positions, branches]);

  // Dynamic automatic NIK calculation when branch or joinDate changes (for new employees)
  useEffect(() => {
    if (!isOpen) return;
    if (initialEmployee) {
      setEmployeeCode(initialEmployee.employeeCode);
      return;
    }
    const branchSuffix = DocumentNumberingService.resolveBranchSuffix(branchId, branches);
    const nextNik = EmployeeService.generateNextEmployeeCode(existingEmployees, {
      tenantCode,
      branchSuffix,
      targetDate: joinDate
    });
    setEmployeeCode(nextNik);
  }, [isOpen, initialEmployee, branchId, joinDate, tenantCode, branches, existingEmployees]);

  // Handle Photo File Upload with 2MB validation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Personnel photo file size must not exceed 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // When Business Line changes, automatically suggest business line's default cost center
  const handleBusinessLineChange = (newLobId: string) => {
    setBusinessLineId(newLobId);
    const foundLob = businessLinesList.find((b) => b.id === newLobId);
    if (foundLob) {
      setBusinessLineName(foundLob.name);
      if (foundLob.costCenterCode) {
        setCostCenterCode(foundLob.costCenterCode);
      }
    }
  };

  // When Department changes, automatically suggest department's default cost center if no business line cost center
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const foundDept = departments.find((d) => d.id === newDeptId);
    if (foundDept && foundDept.costCenterCode && (!costCenterCode || costCenterCode === 'CC-GEN')) {
      setCostCenterCode(foundDept.costCenterCode);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage('Full employee name is required.');
      setActiveTab('general');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Corporate or contact email address is required.');
      setActiveTab('general');
      return;
    }

    if (!costCenterCode.trim()) {
      setErrorMessage('Cost Center Code is required for structured expense accounting.');
      setActiveTab('general');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === branchId);
    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedPos = positions.find((p) => p.id === positionId);

    const payload: Employee = {
      id: initialEmployee?.id || `emp_${Date.now()}`,
      tenantId,
      employeeCode: employeeCode.trim(),
      fullName: fullName.trim(),
      avatarUrl: avatarUrl || undefined,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      branchId,
      branchName: selectedBranch?.name || 'Main Branch',
      businessLineId: businessLineId || undefined,
      businessLineName: businessLineName || undefined,
      costAllocation: {
        mode: businessLineId?.includes('holding') ? 'shared_equal' : 'single',
        businessLineId: businessLineId || undefined
      },
      department: selectedDept?.name || 'Operations',
      departmentId: selectedDept?.id,
      position: selectedPos?.title || 'Staff Specialist',
      positionId: selectedPos?.id,
      costCenterCode: costCenterCode.trim().toUpperCase(),
      costCenterName: businessLineName || selectedDept?.name || 'Cost Center',
      supervisorId: supervisorId || undefined,
      employmentType,
      joinDate,
      contractEndDate: employmentType === 'contract' ? contractEndDate || undefined : undefined,
      status,
      isSalesPic,
      hasSystemAccount: createSystemAccount,
      systemRole: createSystemAccount ? systemRole : undefined,

      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      bankAccountHolder: bankAccountHolder.trim() || fullName.trim(),
      npwp: npwp.trim() || undefined,
      ptkpStatus,
      bpjsKetenagakerjaan: bpjsKetenagakerjaan.trim() || undefined,
      bpjsKesehatan: bpjsKesehatan.trim() || undefined,

      country: addressData.country || 'Indonesia',
      provinceId: addressData.provinceId || undefined,
      provinceName: addressData.provinceName || undefined,
      regencyId: addressData.regencyId || undefined,
      regencyName: addressData.regencyName || undefined,
      districtId: addressData.districtId || undefined,
      districtName: addressData.districtName || undefined,
      villageId: addressData.villageId || undefined,
      villageName: addressData.villageName || undefined,
      postalCode: addressData.postalCode || undefined,
      rt: addressData.rt || undefined,
      rw: addressData.rw || undefined,
      address: addressData.address?.trim() || undefined,
      latitude: addressData.latitude,
      longitude: addressData.longitude,

      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: emergencyContactRelation.trim() || undefined
    };

    try {
      const branchSuffix = DocumentNumberingService.resolveBranchSuffix(branchId, branches);
      const saved = await EmployeeService.saveEmployee(payload, {
        tenantCode,
        branchSuffix,
        targetDate: joinDate
      });
      // Provision ERP login user in Tenant Members & RBAC if requested
      if (createSystemAccount && !initialEmployee?.hasSystemAccount) {
        try {
          await inviteUser({
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            role: systemRole,
            tenantId,
            password: systemPassword
          });
          addToast(
            'Akun Login ERP Dibuat',
            `Akun login untuk ${fullName.trim()} dengan role ${systemRole} berhasil didaftarkan ke Tenant Members.`,
            'success'
          );
        } catch (uErr: any) {
          console.warn('[EmployeeFormModal] Auto-create user notice:', uErr);
        }
      }

      setEmployees((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save employee profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[#DCE5EC] my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {initialEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Registered under Tenant {tenantCode} with mandatory Cost Center allocation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#DCE5EC] bg-[#F8FAFC] px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#086288] text-[#086288] bg-white rounded-t-md'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>1. Employment & Placement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'financial'
                ? 'border-[#086288] text-[#086288] bg-white rounded-t-md'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>2. Financial & Tax (Payroll)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'address'
                ? 'border-[#086288] text-[#086288] bg-white rounded-t-md'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>3. Address & Emergency</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4 flex-1">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

          {/* TAB 1: GENERAL & JOB PLACEMENT */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fade-in">
              {/* Personnel Photo Upload Card */}
              <div className="flex items-center gap-4 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#DCE5EC]">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Personnel Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#086288] shadow-2xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#EFF7FA] text-[#086288] border-2 border-dashed border-[#B7DDEA] flex flex-col items-center justify-center">
                      <Camera className="w-6 h-6 text-[#086288]" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-xs font-bold text-[#0F172A] mb-0.5">Personnel Photograph</div>
                  <p className="text-[11px] text-[#64748B] mb-2">
                    Upload official personnel portrait (JPG, PNG, or WebP. Max 2MB).
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EFF7FA] hover:bg-[#B7DDEA]/40 text-[#086288] border border-[#B7DDEA] text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      Employee Code (NIK) <span className="text-red-500">*</span>
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                      System Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    value={employeeCode}
                    readOnly
                    placeholder="Auto-calculated by system"
                    className="w-full bg-[#F1F5F9] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] cursor-not-allowed select-all"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Format: [Tenant {tenantCode}] + [Branch Suffix] + [Date {joinDate.replace(/-/g, '')}] + [Daily Sequence]. Resets to 001 daily.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe, S.Kom."
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john.doe@company.id"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md pl-8 pr-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +62 812 3456 7890"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md pl-8 pr-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Branch, Department & Cost Center Row */}
              <div className="p-3.5 rounded-lg bg-[#EFF7FA]/50 border border-[#B7DDEA] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#086288]">
                  <Building2 className="w-4 h-4" />
                  <span>Organizational Unit & Financial Cost Allocation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Assigned Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    >
                      {branches
                        .filter((b) => b.isActive || b.id === branchId)
                        .map((b) => (
                          <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== branchId}>
                            {b.code} — {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Business Line (LOB) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={businessLineId}
                      onChange={(e) => handleBusinessLineChange(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    >
                      {businessLinesList.map((lob) => (
                        <option key={lob.id} value={lob.id}>
                          {lob.name} {lob.isPrimary ? '(Default Holding)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#086288] mb-1 flex items-center justify-between">
                      <span>Cost Center <span className="text-red-500">*</span></span>
                      <span className="text-[10px] font-normal text-[#64748B]">Auto-mapped</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={costCenterCode}
                        onChange={(e) => setCostCenterCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CC04001, CC-SHARED-HOLDING"
                        className="w-full bg-white border border-[#B7DDEA] rounded-md pl-8 pr-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                      />
                      <Layers className="w-3.5 h-3.5 text-[#086288] absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Position, Supervisor & Employment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Job Position <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">-- Select Position --</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (Level {p.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="permanent">Permanent (PKWTT)</option>
                    <option value="contract">Contract (PKWT)</option>
                    <option value="probation">Probation (3 Months)</option>
                    <option value="intern">Internship</option>
                    <option value="daily">Daily / Freelance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="active">Active</option>
                    <option value="leave">On Leave</option>
                    <option value="terminated">Terminated / Resigned</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Join Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                {employmentType === 'contract' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                  </div>
                )}
              </div>

              {/* SYSTEM ACCESS & OPERATIONAL PIC ASSIGNMENT (SINGLE-INPUT CONVERGENCE) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#F0FDF4] to-[#EFF6FF] border border-[#BBF7D0] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    <span className="text-xs font-bold text-[#0F172A]">Akses Sistem &amp; Penugasan Operasional</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                    Single Input Provisioning
                  </span>
                </div>

                {/* 1. Sales / Event PIC Assignment */}
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-[#DCE5EC]">
                  <input
                    type="checkbox"
                    id="isSalesPicCheckbox"
                    checked={isSalesPic}
                    onChange={(e) => setIsSalesPic(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#086288] rounded border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                  />
                  <label htmlFor="isSalesPicCheckbox" className="text-xs cursor-pointer select-none flex-1">
                    <span className="font-bold text-[#0F172A] block">Tugaskan sebagai Sales / Event PIC</span>
                    <span className="text-[11px] text-[#64748B]">
                      Karyawan ini akan otomatis tersedia di dropdown pilihan <strong>Sales / PIC</strong> pada modul Sales Order, Service Booking, dan <strong>Collector</strong> pada Penerimaan Pembayaran (AR).
                    </span>
                  </label>
                </div>

                {/* 2. System Login Account Provisioning */}
                <div className="bg-white p-3 rounded-lg border border-[#DCE5EC] space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="createAccountCheckbox"
                      checked={createSystemAccount}
                      onChange={(e) => setCreateSystemAccount(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-[#086288] rounded border-[#CBD5E1] focus:ring-[#086288] cursor-pointer"
                    />
                    <label htmlFor="createAccountCheckbox" className="text-xs cursor-pointer select-none flex-1">
                      <span className="font-bold text-[#0F172A] block">Buatkan Akun Login ERP (Tenant Member)</span>
                      <span className="text-[11px] text-[#64748B]">
                        Otomatis membuat akun login menggunakan email <strong>{email || 'corporate email'}</strong> dan menambahkan ke <em>Master &gt; Tenant Members &amp; RBAC</em> tanpa perlu input ulang.
                      </span>
                    </label>
                  </div>

                  {createSystemAccount && (
                    <div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                          Role Hak Akses (RBAC) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={systemRole}
                          onChange={(e) => setSystemRole(e.target.value as OfficialRole)}
                          className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                        >
                          <option value="sales">Sales &amp; Client Relationship</option>
                          <option value="admin">Administrator Cabang</option>
                          <option value="owner">Owner / Executive Board</option>
                          <option value="super_admin">Super Administrator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                          Password Sementara
                        </label>
                        <input
                          type="text"
                          value={systemPassword}
                          onChange={(e) => setSystemPassword(e.target.value)}
                          placeholder="e.g. Zyvora@2026"
                          className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                        />
                        <p className="text-[10px] text-[#64748B] mt-0.5">Pengguna dapat mengganti password setelah login pertama.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL & TAX (PAYROLL READY) */}
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-lg bg-[#EFF7FA]/50 border border-[#B7DDEA]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#086288] mb-3">
                  <CreditCard className="w-4 h-4" />
                  <span>Payroll Bank Account Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Bank Name
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    >
                      <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                      <option value="Bank Mandiri">Bank Mandiri</option>
                      <option value="Bank BRI">Bank BRI</option>
                      <option value="Bank BNI">Bank BNI</option>
                      <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
                      <option value="Bank Danamon">Bank Danamon</option>
                      <option value="Bank Permata">Bank Permata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 8001239981"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Name as printed on bank passbook"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                  </div>
                </div>
              </div>

              {/* Tax & BPJS Statutory Compliance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    NPWP (Tax ID Number)
                  </label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    placeholder="e.g. 09.876.543.2-012.000"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    PTKP Status (TER PPh 21)
                  </label>
                  <select
                    value={ptkpStatus}
                    onChange={(e) => setPtkpStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="TK/0">TK/0 — Single, No Dependents</option>
                    <option value="K/0">K/0 — Married, 0 Dependents</option>
                    <option value="K/1">K/1 — Married, 1 Dependent</option>
                    <option value="K/2">K/2 — Married, 2 Dependents</option>
                    <option value="K/3">K/3 — Married, 3 Dependents</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    BPJS Ketenagakerjaan No.
                  </label>
                  <input
                    type="text"
                    value={bpjsKetenagakerjaan}
                    onChange={(e) => setBpjsKetenagakerjaan(e.target.value)}
                    placeholder="e.g. 19028837192"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    BPJS Kesehatan No.
                  </label>
                  <input
                    type="text"
                    value={bpjsKesehatan}
                    onChange={(e) => setBpjsKesehatan(e.target.value)}
                    placeholder="e.g. 000192837419"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESS & EMERGENCY CONTACT */}
          {activeTab === 'address' && (
            <div className="space-y-4 animate-fade-in">
              {/* Kemendagri / Emsifa Cascading Regional Address Form */}
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE5EC]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#086288] mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>Residential Address (Official Regional API — Kemendagri & Emsifa)</span>
                </div>

                <AddressForm
                  value={addressData}
                  onChange={setAddressData}
                  config={{
                    title: 'Residential Hierarchy & Street Details',
                    description: 'Select Province, Regency/City, District, and Village/Subdistrict via live regional database.',
                    showHeader: false,
                    showRtRw: true,
                    countryRequired: false,
                    provinceRequired: false,
                    regencyRequired: false,
                    districtRequired: false,
                    villageRequired: false,
                    addressRequired: false,
                    postalCodeRequired: false,
                    addressRows: 2,
                    addressPlaceholder: 'Street address, housing complex, building, RT/RW...'
                  }}
                />
              </div>

              {/* Emergency Contact Person */}
              <div className="p-3.5 rounded-lg bg-[#EFF7FA]/50 border border-[#B7DDEA] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#086288]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Emergency Contact Person</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="e.g. +62 812 3456 7890"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Relationship
                    </label>
                    <select
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                    >
                      <option value="Spouse">Spouse (Suami / Istri)</option>
                      <option value="Parent">Parent (Orang Tua)</option>
                      <option value="Sibling">Sibling (Saudara Kandung)</option>
                      <option value="Child">Child (Anak)</option>
                      <option value="Other">Other Family / Guardian</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#DCE5EC] bg-white sticky bottom-0 -mb-2 pb-1 shrink-0">
            <div className="text-[11px] text-[#64748B]">
              Tab {activeTab === 'general' ? '1 of 3' : activeTab === 'financial' ? '2 of 3' : '3 of 3'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-[#DCE5EC] text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-md bg-[#086288] hover:bg-[#064B6A] text-white transition-colors cursor-pointer"
              >
                {initialEmployee ? 'Update Profile' : 'Save Employee'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
