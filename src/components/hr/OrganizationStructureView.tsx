/**
 * Zyvora ERP 1.0.0 — Organization Structure View (Core HR)
 * Visualizes hierarchical reporting lines, department divisions, and Cost Center allocations.
 * All copywriting in standard English.
 */

import React, { useState, useEffect } from 'react';
import {
  Network,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Layers,
  MapPin
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Department, Position, Employee } from '../../types/erp';
import { DepartmentPositionService } from '../../services/departmentPositionService';
import { EmployeeService } from '../../services/employeeService';

export const OrganizationStructureView: React.FC = () => {
  const { tenant } = useErp();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [dList, pList, eList] = await Promise.all([
          DepartmentPositionService.getDepartments(tenant.id),
          DepartmentPositionService.getPositions(tenant.id),
          EmployeeService.getEmployees(tenant.id)
        ]);
        setDepartments(dList);
        setPositions(pList);
        setEmployees(eList);
      } catch (err) {
        console.error('Failed to load org structure data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tenant.id]);

  // Find top executive position (Level 7 or no reportsTo)
  const topPositions = positions.filter((p) => (p.gradeLevel || 0) >= 7 || !p.reportsToPositionId);
  const managerPositions = positions.filter(
    (p) => (p.gradeLevel || 0) >= 5 && (p.gradeLevel || 0) < 7
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header Overview Card */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] flex items-center justify-center">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Organization Hierarchy</h2>
              <p className="text-xs text-[#64748B]">
                Structural reporting hierarchy, leadership roles, and divisional Cost Center distribution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] text-xs font-mono font-bold">
              {departments.length} Departments
            </span>
            <span className="px-3 py-1 rounded-md bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] text-xs font-mono font-bold">
              {employees.length} Personnel
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Executive Tier */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider px-1">
          <ShieldCheck className="w-4 h-4 text-[#086288]" />
          <span>Executive Leadership & Directorate (Tier 1)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPositions.map((pos) => {
            const incumbent = employees.find((e) => e.positionId === pos.id || e.position === pos.title);
            const dept = departments.find((d) => d.id === pos.departmentId);

            return (
              <div
                key={pos.id}
                className="bg-white border-2 border-[#086288] rounded-xl p-5 shadow-xs relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-3 py-1 bg-[#086288] text-white text-[10px] font-bold rounded-bl-lg">
                  Level {pos.gradeLevel} Executive
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                      {dept?.costCenterCode || 'CC-EXEC'}
                    </span>
                    <h3 className="text-sm font-bold text-[#0F172A] mt-2">{pos.title}</h3>
                    <p className="text-xs text-[#64748B]">{dept?.name || 'Executive & Board'}</p>
                  </div>

                  <div className="pt-3 border-t border-[#DCE5EC] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {incumbent?.avatarUrl ? (
                        <img
                          src={incumbent.avatarUrl}
                          alt={incumbent.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-[#DCE5EC]"
                        />
                      ) : incumbent ? (
                        <div className="w-8 h-8 rounded-full bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold text-xs flex items-center justify-center">
                          {incumbent.fullName.charAt(0).toUpperCase()}
                        </div>
                      ) : null}
                      <div>
                        <div className="text-[11px] text-[#94A3B8] font-medium">Assigned Officer</div>
                        <div className="text-xs font-bold text-[#086288]">
                          {incumbent ? incumbent.fullName : 'Vacant Position'}
                        </div>
                      </div>
                    </div>
                    {incumbent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {incumbent.employeeCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Divisional Heads & Departmental Cost Centers (Tier 2) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider px-1">
          <Building2 className="w-4 h-4 text-[#086288]" />
          <span>Departmental Divisions & Cost Centers (Tier 2)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments
            .filter((d) => d.code !== 'DEP-EXEC')
            .map((dept) => {
              const deptPositions = positions.filter((p) => p.departmentId === dept.id);
              const deptEmployees = employees.filter((e) => e.departmentId === dept.id || e.department === dept.name);
              const headPos = deptPositions.find((p) => (p.gradeLevel || 0) >= 5);
              const headEmp = deptEmployees.find(
                (e) => headPos && (e.positionId === headPos.id || e.position === headPos.title)
              );

              return (
                <div
                  key={dept.id}
                  className="bg-white border border-[#DCE5EC] hover:border-[#086288] transition-colors rounded-xl p-5 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center font-bold text-xs">
                        {dept.code.replace('DEP-', '')}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">{dept.name}</h4>
                        <span className="font-mono text-[11px] font-bold text-[#086288]">
                          {dept.costCenterCode}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {deptEmployees.length} Members
                    </span>
                  </div>

                  {/* Head of Department */}
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE5EC] flex items-center gap-2.5">
                    {headEmp?.avatarUrl ? (
                      <img
                        src={headEmp.avatarUrl}
                        alt={headEmp.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-[#DCE5EC] shrink-0"
                      />
                    ) : headEmp ? (
                      <div className="w-8 h-8 rounded-full bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold text-xs flex items-center justify-center shrink-0">
                        {headEmp.fullName.charAt(0).toUpperCase()}
                      </div>
                    ) : null}
                    <div>
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                        Department Lead
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                        {headEmp ? headEmp.fullName : headPos ? headPos.title : 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {headPos ? headPos.title : 'Manager Role'}
                      </div>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                      Assigned Personnel & Roles
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {deptEmployees.length === 0 ? (
                        <div className="text-[11px] text-[#94A3B8] italic">No personnel assigned yet</div>
                      ) : (
                        deptEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-2 rounded-md bg-white border border-[#DCE5EC] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {emp.avatarUrl ? (
                                <img
                                  src={emp.avatarUrl}
                                  alt={emp.fullName}
                                  className="w-6 h-6 rounded-full object-cover border border-[#DCE5EC] shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {emp.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-[#0F172A]">{emp.fullName}</div>
                                <div className="text-[10px] text-[#64748B]">{emp.position}</div>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EFF7FA] text-[#086288] font-bold">
                              {emp.costCenterCode}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
