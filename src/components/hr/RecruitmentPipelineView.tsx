/**
 * Zyvora ERP 1.0.0 — Recruitment Pipeline View (Core HR)
 * Manages job openings, candidate assessment stages, and one-click conversion to active Employee with Cost Center.
 * All copywriting in standard English.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Users,
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Star,
  Building2,
  Layers,
  MapPin,
  X,
  AlertCircle
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import {
  JobOpening,
  RecruitmentCandidate,
  RecruitmentStage,
  Department,
  Branch
} from '../../types/erp';
import { RecruitmentService } from '../../services/recruitmentService';
import { DepartmentPositionService } from '../../services/departmentPositionService';

export const RecruitmentPipelineView: React.FC = () => {
  const { tenant, branches, addToast } = useErp();

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');

  // Add Job Opening Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDeptId, setJobDeptId] = useState('');
  const [jobBranchId, setJobBranchId] = useState('');
  const [jobOpeningsCount, setJobOpeningsCount] = useState<number>(1);
  const [jobDesc, setJobDesc] = useState('');
  const [jobModalError, setJobModalError] = useState<string | null>(null);

  // Add Candidate Modal State
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candJobId, setCandJobId] = useState('');
  const [candNotes, setCandNotes] = useState('');
  const [candModalError, setCandModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [jList, cList, dList] = await Promise.all([
        RecruitmentService.getJobOpenings(tenant.id),
        RecruitmentService.getCandidates(tenant.id),
        DepartmentPositionService.getDepartments(tenant.id)
      ]);
      setJobOpenings(jList);
      setCandidates(cList);
      setDepartments(dList);
    } catch (err) {
      console.error('Failed to load recruitment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (filterStage !== 'all' && c.stage !== filterStage) return false;
      if (selectedJobId !== 'all' && c.jobOpeningId !== selectedJobId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.fullName.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesJob = c.jobTitle.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesJob) return false;
      }
      return true;
    });
  }, [candidates, filterStage, selectedJobId, searchQuery]);

  // Advance Candidate Stage
  const handleUpdateStage = async (candidateId: string, nextStage: RecruitmentStage) => {
    await RecruitmentService.updateCandidateStage(candidateId, nextStage, tenant.id);
    addToast('Candidate Stage Updated', `Candidate moved to ${nextStage.toUpperCase()} stage.`, 'info');
    loadData();
  };

  // Convert Hired Candidate to Employee
  const handleConvertToEmployee = async (candidate: RecruitmentCandidate) => {
    try {
      const result = await RecruitmentService.convertCandidateToEmployee(
        candidate.id,
        tenant?.tenantNumber || '001',
        tenant.id
      );
      if (result) {
        addToast(
          'Candidate Converted to Employee',
          `${result.employee.fullName} is now an official employee (${result.employee.employeeCode}) under Cost Center ${result.employee.costCenterCode}.`,
          'success'
        );
        loadData();
      }
    } catch (err: any) {
      addToast('Conversion Failed', err.message || 'Failed to convert candidate.', 'error');
    }
  };

  // Save Job Opening
  const handleSaveJobOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobModalError(null);

    if (!jobTitle.trim()) {
      setJobModalError('Job title is required.');
      return;
    }
    if (!jobDeptId) {
      setJobModalError('Please select a department.');
      return;
    }

    const dept = departments.find((d) => d.id === jobDeptId);
    const branch = branches.find((b) => b.id === (jobBranchId || branches[0]?.id));

    const payload: JobOpening = {
      id: `job_${Date.now()}`,
      tenantId: tenant.id,
      code: `JOB-${new Date().getFullYear()}-${String(jobOpenings.length + 1).padStart(3, '0')}`,
      title: jobTitle.trim(),
      departmentId: jobDeptId,
      departmentName: dept?.name || 'Operations',
      branchId: branch?.id || 'br_jkt_hq',
      branchName: branch?.name || 'Kantor Pusat Jakarta',
      costCenterCode: dept?.costCenterCode || 'CC-GEN',
      employmentType: 'permanent',
      openingsCount: Number(jobOpeningsCount) || 1,
      status: 'published',
      postedDate: new Date().toISOString().split('T')[0],
      description: jobDesc.trim() || undefined
    };

    await RecruitmentService.saveJobOpening(payload);
    addToast('Job Opening Published', `Position ${payload.title} (${payload.costCenterCode}) is now open.`, 'success');
    setIsJobModalOpen(false);
    loadData();
  };

  // Save Candidate
  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandModalError(null);

    if (!candName.trim() || !candEmail.trim()) {
      setCandModalError('Candidate full name and email are required.');
      return;
    }
    if (!candJobId) {
      setCandModalError('Please select an active job vacancy.');
      return;
    }

    const job = jobOpenings.find((j) => j.id === candJobId);

    const payload: RecruitmentCandidate = {
      id: `cand_${Date.now()}`,
      tenantId: tenant.id,
      jobOpeningId: candJobId,
      jobTitle: job?.title || 'Open Role',
      departmentId: job?.departmentId || 'dept_ops',
      departmentName: job?.departmentName || 'Operations',
      branchId: job?.branchId || 'br_jkt_hq',
      costCenterCode: job?.costCenterCode || 'CC-GEN',
      fullName: candName.trim(),
      email: candEmail.trim().toLowerCase(),
      phone: candPhone.trim(),
      stage: 'screening',
      appliedDate: new Date().toISOString().split('T')[0],
      notes: candNotes.trim() || undefined,
      rating: 4
    };

    await RecruitmentService.saveCandidate(payload);
    addToast('Candidate Registered', `${payload.fullName} added to pipeline under ${payload.jobTitle}.`, 'success');
    setIsCandidateModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* Top Controls & Action Buttons */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setJobModalError(null);
                setJobTitle('');
                setJobDeptId(departments[0]?.id || '');
                setJobBranchId(branches[0]?.id || 'br_jkt_hq');
                setJobOpeningsCount(1);
                setJobDesc('');
                setIsJobModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] hover:bg-[#F8FAFC] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#086288]" />
              <span>Post Vacancy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCandModalError(null);
                setCandName('');
                setCandEmail('');
                setCandPhone('');
                setCandJobId(jobOpenings[0]?.id || '');
                setCandNotes('');
                setIsCandidateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#086288] hover:bg-[#064B6A] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Filter by Vacancy</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
            >
              <option value="all">All Job Vacancies</option>
              {jobOpenings.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.code} — {job.title} ({job.costCenterCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Filter by Stage</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
            >
              <option value="all">All Assessment Stages</option>
              <option value="screening">Screening</option>
              <option value="interview_hr">Interview HR</option>
              <option value="interview_user">Interview User</option>
              <option value="offering">Offering Package</option>
              <option value="hired">Hired (Ready to Convert)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Search Candidate</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or email..."
                className="w-full bg-white border border-[#DCE5EC] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Candidate Pipeline Table */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#DCE5EC]">
          <h3 className="text-sm font-bold text-[#0F172A]">Candidate Applicants Pipeline</h3>
          <p className="text-[11px] text-[#64748B]">
            Track candidate progression across selection gates and convert hired talent to employees
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] font-bold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Applied Position</th>
                <th className="py-3 px-4">Department & Cost Center</th>
                <th className="py-3 px-4 w-36 text-center">Current Stage</th>
                <th className="py-3 px-4">Assessment Notes</th>
                <th className="py-3 px-4 w-44 text-center">Pipeline Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5EC]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    Loading candidate pipeline...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    No candidates found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand, idx) => (
                  <tr key={cand.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3 px-4 text-center text-[#94A3B8] font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A]">{cand.fullName}</div>
                      <div className="text-[11px] text-[#64748B]">{cand.email} • {cand.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#0F172A]">{cand.jobTitle}</td>
                    <td className="py-3 px-4">
                      <div className="text-[#475569]">{cand.departmentName}</div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                        {cand.costCenterCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          cand.stage === 'hired'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cand.stage === 'offering'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {cand.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                      {cand.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cand.stage === 'hired' ? (
                        cand.convertedEmployeeId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Converted</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertToEmployee(cand)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#086288] hover:bg-[#064B6A] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Convert to Staff</span>
                          </button>
                        )
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {cand.stage === 'screening' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(cand.id, 'interview_hr')}
                              className="px-2 py-1 rounded border border-[#DCE5EC] hover:bg-[#EFF7FA] text-[#086288] text-[11px] font-medium"
                            >
                              Interview HR →
                            </button>
                          )}
                          {cand.stage === 'interview_hr' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(cand.id, 'interview_user')}
                              className="px-2 py-1 rounded border border-[#DCE5EC] hover:bg-[#EFF7FA] text-[#086288] text-[11px] font-medium"
                            >
                              User Interview →
                            </button>
                          )}
                          {cand.stage === 'interview_user' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(cand.id, 'offering')}
                              className="px-2 py-1 rounded border border-[#DCE5EC] hover:bg-[#EFF7FA] text-[#086288] text-[11px] font-medium"
                            >
                              Send Offer →
                            </button>
                          )}
                          {cand.stage === 'offering' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(cand.id, 'hired')}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                            >
                              Mark Hired ✓
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: POST JOB VACANCY */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-[#DCE5EC]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Post New Job Vacancy</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJobOpening} className="p-6 space-y-4">
              {jobModalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{jobModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Tax Accountant"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department & Cost Center <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobDeptId}
                    onChange={(e) => setJobDeptId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.costCenterCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Branch Placement
                  </label>
                  <select
                    value={jobBranchId}
                    onChange={(e) => setJobBranchId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Number of Open Positions
                </label>
                <input
                  type="number"
                  min="1"
                  value={jobOpeningsCount}
                  onChange={(e) => setJobOpeningsCount(Number(e.target.value))}
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Job Description & Criteria
                </label>
                <textarea
                  rows={3}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Summary of responsibilities and required qualifications..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE5EC]">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-[#DCE5EC] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-[#086288] hover:bg-[#064B6A] text-white"
                >
                  Publish Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CANDIDATE */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-[#DCE5EC]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Add Candidate Applicant</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCandidateModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
              {candModalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{candModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Candidate Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g. Jessica Mila, S.E."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="e.g. jessica.mila@gmail.com"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    placeholder="e.g. +62 812 3456 7890"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Applied Vacancy Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={candJobId}
                  onChange={(e) => setCandJobId(e.target.value)}
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                >
                  <option value="">-- Select Vacancy Role --</option>
                  {jobOpenings.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.departmentName} ({job.costCenterCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Initial Notes & Qualifications
                </label>
                <textarea
                  rows={3}
                  value={candNotes}
                  onChange={(e) => setCandNotes(e.target.value)}
                  placeholder="Experience highlights, portfolio link, or interview schedule..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE5EC]">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-[#DCE5EC] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-[#086288] hover:bg-[#064B6A] text-white"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
