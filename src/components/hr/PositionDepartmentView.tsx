/**
 * Zyvora ERP 1.0.0 — Position & Department Management (Core HR)
 * Manages enterprise departments, organizational roles, and Cost Center bindings.
 * All UI copywriting is in standard English.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Award,
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Briefcase,
  X,
  AlertCircle
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Department, Position } from '../../types/erp';
import { DepartmentPositionService } from '../../services/departmentPositionService';
import { generateSmartEntityCode, getTenant2DigitCode } from '../../utils/entityCodeGenerator';

export const PositionDepartmentView: React.FC = () => {
  const { tenant, allTenants, addToast } = useErp();
  const [activeTab, setActiveTab] = useState<'departments' | 'positions'>('departments');

  // State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCostCenter, setDeptCostCenter] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptModalError, setDeptModalError] = useState<string | null>(null);

  // Position Modal State
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posCode, setPosCode] = useState('');
  const [posTitle, setPosTitle] = useState('');
  const [posDeptId, setPosDeptId] = useState('');
  const [posGrade, setPosGrade] = useState<number>(4);
  const [posReportsTo, setPosReportsTo] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posModalError, setPosModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [deptList, posList] = await Promise.all([
        DepartmentPositionService.getDepartments(tenant.id),
        DepartmentPositionService.getPositions(tenant.id)
      ]);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err) {
      console.error('Failed to load department and position data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // Filtered lists
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.costCenterCode.toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  const filteredPositions = useMemo(() => {
    if (!searchQuery.trim()) return positions;
    const q = searchQuery.toLowerCase();
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(q))
    );
  }, [positions, searchQuery]);

  // Open Add/Edit Department Modal
  const handleOpenDeptModal = (dept?: Department) => {
    setDeptModalError(null);
    if (dept) {
      setEditingDept(dept);
      setDeptCode(dept.code);
      setDeptName(dept.name);
      setDeptCostCenter(dept.costCenterCode);
      setDeptDesc(dept.description || '');
    } else {
      setEditingDept(null);
      const autoDeptCode = generateSmartEntityCode('DEP', tenant, departments.map((d) => d.code), allTenants);
      const autoCcCode = generateSmartEntityCode('CC', tenant, departments.map((d) => d.costCenterCode), allTenants);
      setDeptCode(autoDeptCode);
      setDeptName('');
      setDeptCostCenter(autoCcCode);
      setDeptDesc('');
    }
    setIsDeptModalOpen(true);
  };

  // Save Department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptModalError(null);

    if (!deptCode.trim()) {
      setDeptModalError('Department code is required.');
      return;
    }
    if (!deptName.trim()) {
      setDeptModalError('Department name is required.');
      return;
    }
    if (!deptCostCenter.trim()) {
      setDeptModalError(`Cost Center Code is required (e.g. CC${getTenant2DigitCode(tenant, allTenants)}001).`);
      return;
    }

    const payload: Department = {
      id: editingDept?.id || `dept_${Date.now()}`,
      tenantId: tenant.id,
      code: deptCode.trim().toUpperCase(),
      name: deptName.trim(),
      costCenterCode: deptCostCenter.trim().toUpperCase(),
      description: deptDesc.trim() || undefined,
      isActive: editingDept ? editingDept.isActive : true
    };

    await DepartmentPositionService.saveDepartment(payload);
    addToast(
      editingDept ? 'Department Updated' : 'Department Created',
      `Department ${payload.name} (${payload.costCenterCode}) has been saved.`,
      'success'
    );
    setIsDeptModalOpen(false);
    loadData();
  };

  // Open Add/Edit Position Modal
  const handleOpenPosModal = (pos?: Position) => {
    setPosModalError(null);
    if (pos) {
      setEditingPos(pos);
      setPosCode(pos.code);
      setPosTitle(pos.title);
      setPosDeptId(pos.departmentId);
      setPosGrade(pos.gradeLevel || 4);
      setPosReportsTo(pos.reportsToPositionId || '');
      setPosDesc(pos.description || '');
    } else {
      setEditingPos(null);
      const autoPosCode = generateSmartEntityCode('POS', tenant, positions.map((p) => p.code), allTenants);
      setPosCode(autoPosCode);
      setPosTitle('');
      setPosDeptId(departments[0]?.id || '');
      setPosGrade(4);
      setPosReportsTo('');
      setPosDesc('');
    }
    setIsPosModalOpen(true);
  };

  // Save Position
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosModalError(null);

    if (!posCode.trim()) {
      setPosModalError('Position code is required.');
      return;
    }
    if (!posTitle.trim()) {
      setPosModalError('Job title is required.');
      return;
    }
    if (!posDeptId) {
      setPosModalError('Please select a parent department.');
      return;
    }

    const parentDept = departments.find((d) => d.id === posDeptId);
    const supervisorPos = positions.find((p) => p.id === posReportsTo);

    const payload: Position = {
      id: editingPos?.id || `pos_${Date.now()}`,
      tenantId: tenant.id,
      code: posCode.trim().toUpperCase(),
      title: posTitle.trim(),
      departmentId: posDeptId,
      departmentName: parentDept?.name || 'Department',
      gradeLevel: Number(posGrade) || 4,
      reportsToPositionId: posReportsTo || undefined,
      reportsToTitle: supervisorPos?.title,
      description: posDesc.trim() || undefined,
      isActive: editingPos ? editingPos.isActive : true
    };

    await DepartmentPositionService.savePosition(payload);
    addToast(
      editingPos ? 'Position Updated' : 'Position Created',
      `Position ${payload.title} has been successfully recorded.`,
      'success'
    );
    setIsPosModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">

      {/* 2. Main Content Card with Tabs */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-[#DCE5EC] gap-4">
          <div className="flex items-center gap-2 bg-[#F1F5F9] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('departments')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'departments'
                  ? 'bg-white text-[#086288] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Departments & Cost Centers</span>
              <span className="px-1.5 py-0.2 bg-[#EFF7FA] text-[#086288] font-bold rounded-full text-[10px]">
                {departments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('positions')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'positions'
                  ? 'bg-white text-[#086288] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Positions & Hierarchy</span>
              <span className="px-1.5 py-0.2 bg-[#EFF7FA] text-[#086288] font-bold rounded-full text-[10px]">
                {positions.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'departments'
                    ? 'Search department or cost center...'
                    : 'Search job title or code...'
                }
                className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
            </div>

            {/* Action Button */}
            {activeTab === 'departments' ? (
              <button
                type="button"
                onClick={() => handleOpenDeptModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#086288] hover:bg-[#064B6A] text-white text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenPosModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#086288] hover:bg-[#064B6A] text-white text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Position</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Departments Table */}
        {activeTab === 'departments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-32">Dept Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4 w-40">Cost Center</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                      Loading department data...
                    </td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                      No departments found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept, idx) => (
                    <tr key={dept.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3 px-4 text-center text-[#94A3B8] font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">{dept.code}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{dept.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                          {dept.costCenterCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                        {dept.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDeptModal(dept)}
                            className="p-1.5 text-[#086288] hover:bg-[#EFF7FA] rounded-md transition-colors cursor-pointer"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Positions Table */}
        {activeTab === 'positions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-32">Position Code</th>
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 w-28 text-center">Grade Level</th>
                  <th className="py-3 px-4">Reports To</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                      Loading position hierarchy...
                    </td>
                  </tr>
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                      No positions found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((pos, idx) => (
                    <tr key={pos.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3 px-4 text-center text-[#94A3B8] font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">{pos.code}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{pos.title}</td>
                      <td className="py-3 px-4 text-[#475569]">{pos.departmentName || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Level {pos.gradeLevel || 4}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {pos.reportsToTitle ? (
                          <span className="font-medium text-[#0F172A]">{pos.reportsToTitle}</span>
                        ) : (
                          <span className="text-[#94A3B8] italic">Top Executive</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPosModal(pos)}
                            className="p-1.5 text-[#086288] hover:bg-[#EFF7FA] rounded-md transition-colors cursor-pointer"
                            title="Edit Position"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT DEPARTMENT */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-[#DCE5EC]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              {deptModalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{deptModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    placeholder={`e.g. DEP${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Cost Center Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptCostCenter}
                    onChange={(e) => setDeptCostCenter(e.target.value.toUpperCase())}
                    placeholder={`e.g. CC${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Finance & Accounting"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Description / Operational Scope
                </label>
                <textarea
                  rows={3}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Describe department functions and accounting focus..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE5EC]">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-[#DCE5EC] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-[#086288] hover:bg-[#064B6A] text-white"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT POSITION */}
      {isPosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-[#DCE5EC]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingPos ? 'Edit Position' : 'Add New Position'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPosModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="p-6 space-y-4">
              {posModalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{posModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Position Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={posCode}
                    onChange={(e) => setPosCode(e.target.value.toUpperCase())}
                    placeholder={`e.g. POS${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Grade Level (1 to 7) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={posGrade}
                    onChange={(e) => setPosGrade(Number(e.target.value))}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value={7}>Level 7 — Director / C-Level</option>
                    <option value={6}>Level 6 — General Manager / Dept Head</option>
                    <option value={5}>Level 5 — Manager / Lead</option>
                    <option value={4}>Level 4 — Senior Specialist / Supervisor</option>
                    <option value={3}>Level 3 — Officer / Specialist</option>
                    <option value={2}>Level 2 — Junior Staff</option>
                    <option value={1}>Level 1 — Entry Level / Intern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={posTitle}
                  onChange={(e) => setPosTitle(e.target.value)}
                  placeholder="e.g. Finance & Accounting Manager"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={posDeptId}
                    onChange={(e) => setPosDeptId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name} ({d.costCenterCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Direct Supervisor Role
                  </label>
                  <select
                    value={posReportsTo}
                    onChange={(e) => setPosReportsTo(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">-- Top Hierarchy (None) --</option>
                    {positions
                      .filter((p) => !editingPos || p.id !== editingPos.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (Level {p.gradeLevel})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Role Description & Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={posDesc}
                  onChange={(e) => setPosDesc(e.target.value)}
                  placeholder="Brief summary of duties and responsibilities..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE5EC]">
                <button
                  type="button"
                  onClick={() => setIsPosModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-[#DCE5EC] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-[#086288] hover:bg-[#064B6A] text-white"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
