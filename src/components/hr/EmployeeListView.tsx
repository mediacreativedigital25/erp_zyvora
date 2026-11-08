/**
 * Zyvora ERP 1.0.0 — Employee Directory View (Core HR)
 * Standardized to MEDIST 4.0 Layout (Blueprint matching Sales Order)
 * Zero Title/Description Clutter, Zero Bulky Metric Cards -> Directly 2-Col Filter -> Toolbar -> Table
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Building2,
  Briefcase,
  Layers,
  Edit2,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Phone,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Employee, Department, Position } from '../../types/erp';
import { EmployeeService } from '../../services/employeeService';
import { DepartmentPositionService } from '../../services/departmentPositionService';
import { EmployeeFormModal } from './EmployeeFormModal';

export const EmployeeListView: React.FC = () => {
  const { tenant, branches, marketProfile, addToast, refreshEmployees } = useErp();

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters (Aligned with 2-Column Standard Filter Box)
  const [filterBranchId, setFilterBranchId] = useState('all');
  const [filterDepartmentId, setFilterDepartmentId] = useState('all');
  const [filterPositionId, setFilterPositionId] = useState('all');
  const [filterCostCenter, setFilterCostCenter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJoinDateFrom, setFilterJoinDateFrom] = useState('');
  const [filterJoinDateTo, setFilterJoinDateTo] = useState('');

  // Table Toolbar Controls
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, deptList, posList] = await Promise.all([
        EmployeeService.getEmployees(tenant.id),
        DepartmentPositionService.getDepartments(tenant.id),
        DepartmentPositionService.getPositions(tenant.id)
      ]);
      setEmployees(empList);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // Unique cost centers among employees
  const availableCostCenters = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.costCenterCode) set.add(e.costCenterCode);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filterBranchId !== 'all' && emp.branchId !== filterBranchId) return false;
      if (filterDepartmentId !== 'all' && emp.departmentId !== filterDepartmentId) return false;
      if (filterPositionId !== 'all' && emp.positionId !== filterPositionId) return false;
      if (filterCostCenter !== 'all' && emp.costCenterCode !== filterCostCenter) return false;
      if (filterStatus !== 'all' && emp.status !== filterStatus) return false;

      // Join Date Range Filter
      if (filterJoinDateFrom && emp.joinDate && emp.joinDate < filterJoinDateFrom) return false;
      if (filterJoinDateTo && emp.joinDate && emp.joinDate > filterJoinDateTo) return false;

      // Quick Table Search
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchesName = emp.fullName?.toLowerCase().includes(q);
        const matchesCode = emp.employeeCode?.toLowerCase().includes(q);
        const matchesEmail = emp.email?.toLowerCase().includes(q);
        const matchesPosition = (emp.position || '').toLowerCase().includes(q);
        const matchesDept = (emp.department || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesPosition && !matchesDept) {
          return false;
        }
      }
      return true;
    });
  }, [
    employees,
    filterBranchId,
    filterDepartmentId,
    filterPositionId,
    filterCostCenter,
    filterStatus,
    filterJoinDateFrom,
    filterJoinDateTo,
    searchTableQuery
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / entriesPerPage));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredEmployees.slice(start, start + entriesPerPage);
  }, [filteredEmployees, currentPage, entriesPerPage]);

  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterDepartmentId('all');
    setFilterPositionId('all');
    setFilterCostCenter('all');
    setFilterStatus('all');
    setFilterJoinDateFrom('');
    setFilterJoinDateTo('');
    setSearchTableQuery('');
    setCurrentPage(1);
  };

  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsFormModalOpen(true);
  };

  const handleEmployeeSaved = (saved: Employee) => {
    addToast(
      selectedEmployee ? 'Employee Updated' : 'Employee Registered',
      `${saved.fullName} (${saved.employeeCode}) has been successfully saved.`,
      'success'
    );
    loadData();
    refreshEmployees();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (EXACT MATCH TO SALES ORDER BLUEPRINT) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN FILTERS                                  */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">-- All Branches --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Join Date (Date Range: From - To) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Join Date</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterJoinDateFrom}
                  onChange={(e) => setFilterJoinDateFrom(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Join Date From"
                />
                <input
                  type="date"
                  value={filterJoinDateTo}
                  onChange={(e) => setFilterJoinDateTo(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  title="Join Date To"
                />
              </div>
            </div>

            {/* Department */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Department</label>
              <div className="sm:col-span-2">
                <select
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Departments ---</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons: Filter & Reset */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN FILTERS                                 */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Position */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Position</label>
              <div className="sm:col-span-2">
                <select
                  value={filterPositionId}
                  onChange={(e) => setFilterPositionId(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Positions ---</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost Center */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Cost Center</label>
              <div className="sm:col-span-2">
                <select
                  value={filterCostCenter}
                  onChange={(e) => setFilterCostCenter(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer font-mono"
                >
                  <option value="all">All Cost Centers</option>
                  {availableCostCenters.map((cc) => (
                    <option key={cc} value={cc}>
                      {cc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status</label>
              <div className="sm:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active (On Payroll)</option>
                  <option value="leave">On Leave</option>
                  <option value="terminated">Terminated / Resigned</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-[#086288]" />
            <span>Print List</span>
          </button>
        </div>

        {/* Right Table Controls: Show entries & Quick Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 px-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#475569] hidden sm:inline">Search:</span>
            <div className="relative">
              <input
                type="text"
                value={searchTableQuery}
                onChange={(e) => {
                  setSearchTableQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter in table..."
                className="w-48 sm:w-60 h-9 pl-3 pr-3 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. STANDARDIZED DATA TABLE (EXACT MATCH TO SALES ORDER BLUEPRINT)     */}
      {/* ===================================================================== */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] font-bold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedEmployees.length > 0 &&
                      selectedIds.length === paginatedEmployees.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-[#CBD5E1] text-[#086288] focus:ring-[#086288] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-20 text-center">Action</th>
                <th className="py-3 px-4 w-40">Employee Code</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Branch Placement</th>
                <th className="py-3 px-4">Cost Center</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#94A3B8]">
                    Loading personnel directory...
                  </td>
                </tr>
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#94A3B8]">
                    No employees found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const isChecked = selectedIds.includes(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isChecked ? 'bg-[#EFF7FA]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(emp.id)}
                          className="rounded border-[#CBD5E1] text-[#086288] focus:ring-[#086288] cursor-pointer"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1 text-slate-500 hover:text-[#086288] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Employee Code (NIK Badge + Join Date) */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 font-mono text-[11px] font-bold rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                          {emp.employeeCode}
                        </span>
                        {emp.joinDate && (
                          <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                            {emp.joinDate}
                          </div>
                        )}
                      </td>

                      {/* Employee Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-[#CBD5E1] shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold text-[11px] flex items-center justify-center shrink-0">
                              {emp.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-[#0F172A] block truncate">
                              {emp.fullName}
                            </span>
                            {emp.email && (
                              <span className="text-[10px] text-[#64748B] block truncate">
                                {emp.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department & Position */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A] truncate">
                          {emp.position || '-'}
                        </div>
                        <div className="text-[10px] text-[#64748B] truncate">
                          {emp.department || '-'}
                        </div>
                      </td>

                      {/* Branch Placement */}
                      <td className="py-3 px-4">
                        <span className="text-[#334155] text-xs">
                          {emp.branchName || 'Kantor Pusat'}
                        </span>
                      </td>

                      {/* Cost Center */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 font-mono text-[10px] font-bold rounded bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]">
                          {emp.costCenterCode || 'CC-SHARED-HOLDING'}
                        </span>
                        {emp.businessLineName && (
                          <div
                            className="text-[10px] text-[#64748B] truncate max-w-[130px] mt-0.5"
                            title={emp.businessLineName}
                          >
                            {emp.businessLineName}
                          </div>
                        )}
                      </td>

                      {/* Employment Type */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded capitalize bg-slate-100 text-slate-700">
                          {emp.employmentType || 'Permanent'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {emp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        ) : emp.status === 'leave' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>LEAVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>RESIGNED</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================================== */}
        {/* 4. PAGINATION FOOTER                                                */}
        {/* =================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#E2E8F0] gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#0F172A]">{filteredEmployees.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
            <strong className="text-[#0F172A]">{Math.min(currentPage * entriesPerPage, filteredEmployees.length)}</strong> of{' '}
            <strong className="text-[#0F172A]">{filteredEmployees.length}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-7 h-7 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#086288] text-white border-[#086288]'
                    : 'bg-white text-slate-700 border-[#CBD5E1] hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Employee */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleEmployeeSaved}
        initialEmployee={selectedEmployee}
        departments={departments}
        positions={positions}
        branches={branches}
        businessLines={marketProfile.businessLines}
        tenantCode={tenant?.tenantNumber || '001'}
        tenantId={tenant.id}
      />
    </div>
  );
};
