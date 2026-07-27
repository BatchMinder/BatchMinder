import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layers, Hourglass, CheckCircle2, XCircle, ExternalLink, Search, Plus, RefreshCw,
  ChevronDown, X, AlertCircle, SlidersHorizontal
} from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';

import PrerequisiteCheck from '../../components/ApprovalWorkflow/PrerequisiteCheck';
import DuplicateWarning from '../../components/ApprovalWorkflow/DuplicateWarning';
import EditRequestModal from '../../components/ApprovalWorkflow/EditRequestModal';

// ─── Avatar color palette ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9' }, // purple
  { bg: '#D1FAE5', text: '#065F46' }, // green
  { bg: '#FEE2E2', text: '#991B1B' }, // red
  { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
  { bg: '#FEF3C7', text: '#92400E' }, // amber
  { bg: '#FCE7F3', text: '#9D174D' }, // pink
  { bg: '#CCFBF1', text: '#0F766E' }, // teal
  { bg: '#F3E8FF', text: '#7E22CE' }, // violet
];
const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

// ─── Badge helpers ────────────────────────────────────────────────────────────
const getStatusBadge = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('pending')) return 'bg-blue-50 text-blue-600 border border-blue-200';
  if (s.includes('escalated') || s.includes('forwarded') || s.includes('hod')) return 'bg-violet-50 text-violet-700 border border-violet-200';
  if (s.includes('approved')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (s.includes('returned')) return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (s.includes('rejected')) return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (s.includes('live') || s.includes('active')) return 'bg-teal-50 text-teal-700 border border-teal-200';
  return 'bg-slate-50 text-slate-600 border border-slate-200';
};
const getStatusLabel = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('forwarded') || s.includes('hod')) return 'Escalated';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('returned')) return 'Returned';
  return status.replace(/_/g, ' ');
};
const getPriorityBadge = (p = 'Medium') => {
  if (p === 'High') return 'bg-orange-100 text-orange-700';
  if (p === 'Low') return 'bg-green-100 text-green-700';
  return 'bg-amber-100 text-amber-700';
};
const isActionable = (status = '') => status.toLowerCase().includes('pending');
const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// ─── Real (2-level) approval workflow, driven by the actual request state ─────
// Matches the backend ApprovalRequest status enum — pending -> advisor_approved/
// advisor_rejected -> approved/rejected/special_granted/returned_for_edit.
// There is no Registrar/Final-Confirmation step in the schema, so only these
// two levels are rendered.
const getWorkflowSteps = (req) => {
  const raw = req.rawStatus || '';
  const advisorDone = raw !== 'pending';
  const advisorApproved = advisorDone && raw !== 'advisor_rejected';
  const hodDone = ['approved', 'rejected', 'special_granted'].includes(raw);

  return [
    {
      n: 1,
      label: 'Advisor Review',
      name: req.advisorDecision?.decidedBy?.name || req.advisorId?.name || 'Unassigned',
      date: formatDate(req.advisorDecision?.decidedAt),
      active: !advisorDone,
      statusLabel: !advisorDone ? 'Pending' : advisorApproved ? 'Approved' : 'Rejected',
    },
    {
      n: 2,
      label: 'HOD Approval',
      name: req.hodDecision?.decidedBy?.name || (advisorApproved ? 'Awaiting Assignment' : '—'),
      date: formatDate(req.hodDecision?.decidedAt),
      active: advisorApproved && !hodDone,
      statusLabel: !advisorDone ? 'Not Started' : !advisorApproved ? 'Skipped' : !hodDone ? 'Pending' : raw === 'rejected' ? 'Rejected' : 'Approved',
    },
  ];
};

// ─── Real approval history, driven by actual submission/decision timestamps ──
const getHistoryEvents = (req) => {
  const events = [
    { label: 'Request Submitted', sub: req.studentName, time: formatDate(req.createdAt), dot: '#10B981' },
  ];
  if (req.advisorDecision?.decidedAt) {
    events.push({
      label: req.rawStatus === 'advisor_rejected' ? 'Rejected by Advisor' : req.rawStatus === 'returned_for_edit' ? 'Returned by Advisor' : 'Approved by Advisor',
      sub: req.advisorDecision.decidedBy?.name || req.advisorId?.name || 'Advisor',
      time: formatDate(req.advisorDecision.decidedAt),
      dot: '#3B82F6',
    });
  }
  if (req.hodDecision?.decidedAt) {
    events.push({
      label: req.rawStatus === 'rejected' ? 'Rejected by HOD' : req.rawStatus === 'special_granted' ? 'Special Permission Granted' : 'Approved by HOD',
      sub: req.hodDecision.decidedBy?.name || 'HOD',
      time: formatDate(req.hodDecision.decidedAt),
      dot: '#3B82F6',
    });
  }
  const withTags = events.map((ev, i) => ({ n: i + 1, tag: i === events.length - 1 && isActionable(req.status) ? 'Current Step' : undefined, ...ev }));
  return withTags.reverse();
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdvisorQueue() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [evalStudent, setEvalStudent] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [requestType, setRequestType] = useState('add');
  const [justification, setJustification] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [eligibleCourses, setEligibleCourses] = useState({ enrolledCourses: [], curriculumCourses: [] });
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const fetchRequests = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    try {
      const res = await fetch('/api/advisor/requests');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const list = data.data.requests || [];
        setRequests(list);
        if (list.length > 0 && !selectedRequest) handleSelectRequest(list[0]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    if (studentSearch.trim().length < 2) { setStudentsList([]); return; }
    const t = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(studentSearch.trim())}&limit=5`);
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          const advisorBatchIds = (user?.assignedBatchIds || []).map(id => id.toString());
          setStudentsList((data.data.students || []).filter(s => advisorBatchIds.includes(s.batchId?._id?.toString() || s.batchId?.toString())));
        }
      } catch (err) { console.error(err); }
      finally { setSearchingStudents(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [studentSearch, user]);

  useEffect(() => {
    if (!selectedStudent) { setEligibleCourses({ enrolledCourses: [], curriculumCourses: [] }); setSelectedCourseId(''); setCourseCode(''); setCourseTitle(''); setCreditHours(3); return; }
    const fetch_ = async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`/api/advisor/students/${selectedStudent._id}/eligible-courses`);
        const data = await res.json();
        if (res.ok && data.status === 'success') setEligibleCourses({ enrolledCourses: data.data.enrolledCourses || [], curriculumCourses: data.data.curriculumCourses || [] });
      } catch (err) { console.error(err); }
      finally { setLoadingCourses(false); }
    };
    fetch_();
  }, [selectedStudent]);

  useEffect(() => { setSelectedCourseId(''); setCourseCode(''); setCourseTitle(''); setCreditHours(3); }, [requestType]);

  const handleSelectRequest = async (req) => {
    setSelectedRequest(req); setRemarks(''); setActionError(''); setEvalStudent(null);
    if (window.innerWidth < 1280) {
      setTimeout(() => {
        document.getElementById('details-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    try {
      const studentIdString = typeof req.studentId === 'object' && req.studentId ? req.studentId._id : req.studentId;
      const res = await fetch(`/api/advisor/students/${studentIdString}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') setEvalStudent(data.data.student);
    } catch (err) { console.error(err); }
  };

  const handleResolveAction = async (decision) => {
    const isApprove = decision === true;
    if (!isApprove && (!remarks || remarks.trim() === '')) {
      setActionError(`Remarks are required when rejecting.`);
      return;
    }
    setActionError(''); setActionLoading(true);
    try {
      const reqId = selectedRequest._id || selectedRequest.id;
      const endpoint = isApprove ? `/api/advisor/approve/${reqId}` : `/api/advisor/reject/${reqId}`;
      const remarksText = remarks.trim();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ remarks: remarksText })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') { setSelectedRequest(null); setEvalStudent(null); fetchRequests(); }
      else setActionError(data.message || 'Action failed.');
    } catch (err) { setActionError('Network error.'); }
    finally { setActionLoading(false); }
  };

  const handleCourseChange = (e) => {
    const val = e.target.value; setSelectedCourseId(val);
    if (!val) { setCourseCode(''); setCourseTitle(''); setCreditHours(3); return; }
    const list = (requestType === 'add' || requestType === 'special_permission') ? eligibleCourses.curriculumCourses : eligibleCourses.enrolledCourses;
    const m = list.find(c => (c._id === val || (c.courseCode || c.code) === val));
    if (m) { setCourseCode(m.courseCode || m.code || ''); setCourseTitle(m.courseTitle || m.title || ''); setCreditHours(Number(m.creditHours)); }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { setSubmitError('Please select a student.'); return; }
    if (!courseCode.trim() || !courseTitle.trim()) { setSubmitError('Please select a subject.'); return; }
    if (requestType === 'special_permission' && !justification.trim()) { setSubmitError('Justification is required for special permission requests.'); return; }
    setSubmitError(''); setSubmitLoading(true);
    try {
      const res = await fetch('/api/advisor/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: selectedStudent._id, courseCode: courseCode.trim().toUpperCase(), courseTitle: courseTitle.trim(), creditHours: Number(creditHours), requestType, justification: justification.trim() }) });
      const data = await res.json();
      if (res.ok && data.status === 'success') { setShowSubmitModal(false); setSelectedStudent(null); setCourseCode(''); setCourseTitle(''); setCreditHours(3); setRequestType('add'); setJustification(''); setSelectedCourseId(''); setEligibleCourses({ enrolledCourses: [], curriculumCourses: [] }); fetchRequests(); }
      else setSubmitError(data.message || 'Failed to submit.');
    } catch (err) { setSubmitError('Network error.'); }
    finally { setSubmitLoading(false); }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const filteredRequests = requests.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = r.studentName?.toLowerCase().includes(q) || r.rollNo?.toLowerCase().includes(q) || r.courseCode?.toLowerCase().includes(q);
    const matchType = filterType === 'all' || r.type?.toLowerCase().includes(filterType.toLowerCase());
    const st = r.status?.toLowerCase() || '';
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'pending' && st.includes('pending'))
      || (filterStatus === 'approved' && st.includes('approved'))
      || (filterStatus === 'rejected' && st.includes('rejected'))
      || (filterStatus === 'escalated' && (st.includes('forwarded') || st.includes('hod')));
    const p = (r.priority || (r.type?.toLowerCase().includes('add') ? 'High' : 'Medium')).toLowerCase();
    const matchPriority = filterPriority === 'all' || p === filterPriority;
    return matchSearch && matchType && matchStatus && matchPriority;
  });
  const totalFiltered = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalReqs = requests.length;
  const pendingCount = requests.filter(r => r.status?.toLowerCase().includes('pending')).length;
  const approvedCount = requests.filter(r => r.status?.toLowerCase() === 'approved').length;
  const rejectedCount = requests.filter(r => r.status?.toLowerCase().includes('reject')).length;
  const escalatedCount = requests.filter(r => r.status?.toLowerCase().includes('forwarded') || r.status?.toLowerCase().includes('hod')).length;
  const pct = (n) => totalReqs ? `${((n / totalReqs) * 100).toFixed(1)}% of total` : '0% of total';

  const selectedReqId = selectedRequest ? `REQ-2026-${selectedRequest.id.slice(-4).toUpperCase()}` : '';
  const cgpa = parseFloat(selectedRequest?.cgpa || 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Routing System</p>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mt-0.5">Approval Requests</h1>
          <p className="text-xs text-slate-500 mt-1">Manage, evaluate and route course adjustments for your assigned batches.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchRequests(true)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Sync Queue
          </button>
          <button onClick={() => { setSubmitError(''); setShowSubmitModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Submit Request
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Requests', value: totalReqs, sub: 'This Semester', color: '#2563EB', bg: '#EFF6FF', Icon: Layers },
          { label: 'Pending (My Level)', value: pendingCount, sub: pct(pendingCount), color: '#D97706', bg: '#FFFBEB', Icon: Hourglass },
          { label: 'Approved', value: approvedCount, sub: pct(approvedCount), color: '#059669', bg: '#E6F4EA', Icon: CheckCircle2 },
          { label: 'Rejected', value: rejectedCount, sub: pct(rejectedCount), color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
          { label: 'Escalated to HOD', value: escalatedCount, sub: 'Awaiting HOD Action', color: '#7C3AED', bg: '#F5F3FF', Icon: ExternalLink },
        ].map(({ label, value, sub, color, bg, Icon }, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 leading-tight">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-800">{value}</span>
              <span className="text-[10px] font-bold" style={{ color }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className={`grid gap-5 ${selectedRequest ? 'grid-cols-1 xl:grid-cols-[1.55fr_1fr]' : 'grid-cols-1'}`}>

        {/* Requests Queue Card */}
        <div className="order-1 xl:col-start-1 xl:row-start-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-w-0">

          {/* Table Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800">Requests Queue</h2>
            {selectedRequest && <span className="text-xs font-bold text-slate-500">{selectedReqId}</span>}
          </div>

          {/* Filters */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search by student, ID or request type..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none placeholder-slate-400" />
            </div>
            {[
              { value: filterType, onChange: e => { setFilterType(e.target.value); setPage(1); }, opts: [['all', 'All Request Types'], ['add', 'Course Registration'], ['drop', 'Course Drop'], ['withdrawal', 'Course Withdrawal']] },
              { value: filterStatus, onChange: e => { setFilterStatus(e.target.value); setPage(1); }, opts: [['all', 'All Status'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['escalated', 'Escalated']] },
              { value: filterPriority, onChange: e => { setFilterPriority(e.target.value); setPage(1); }, opts: [['all', 'All Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] },
            ].map((sel, i) => (
              <ResponsiveSelect
                key={i}
                value={sel.value}
                onChange={sel.onChange}
                options={sel.opts.map(([v, l]) => ({ value: v, label: l }))}
              />
            ))}
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
              <SlidersHorizontal className="w-3 h-3" /> Filter
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Request Type</th>
                  <th className="px-4 py-3">Course / Detail</th>
                  <th className="px-4 py-3">Requested On</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400"><CircularProgress size={16} /></td></tr>
                ) : pagedRequests.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">No requests found.</td></tr>
                ) : pagedRequests.map(req => {
                  const isSelected = selectedRequest?.id === req.id;
                  const priority = req.priority || (req.type?.toLowerCase().includes('add') ? 'High' : 'Medium');
                  const stLabel = getStatusLabel(req.status);
                  const avatarColor = getAvatarColor(req.studentName);
                  const initials = getInitials(req.studentName);
                  const reqId = `REQ-2026-${req.id.slice(-4).toUpperCase()}`;
                  const actionable = isActionable(req.status);
                  const typeLabel = req.type?.toLowerCase().includes('add') ? 'Course Registration' : (req.type || '');

                  return (
                    <tr key={req.id} onClick={() => handleSelectRequest(req)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/40'}`}>
                      <td className="px-4 py-3 font-bold text-slate-700 text-[11px]">{reqId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0"
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[11px] leading-tight">{req.studentName}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{req.rollNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 text-[11px]">{typeLabel}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 text-[11px]">{req.courseCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">May 22, 2026</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getPriorityBadge(priority)}`}>{priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadge(req.status)}`}>{stLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {actionable
                          ? <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectRequest(req); }} className="px-2.5 py-1 border border-blue-300 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-50 cursor-pointer transition-colors">Review</button>
                          : <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectRequest(req); }} className="text-slate-400 text-[10px] font-bold cursor-pointer hover:underline bg-transparent border-none">View</button>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
            <span>Showing {totalFiltered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered} requests</span>
            <div className="flex flex-wrap items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30">‹</button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold border ${page === n ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-slate-200 hover:bg-slate-100'}`}>{n}</button>
              ))}
              {totalPages > 3 && <span className="text-slate-400">...</span>}
              {totalPages > 3 && <button onClick={() => setPage(totalPages)} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold border ${page === totalPages ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-slate-200 hover:bg-slate-100'}`}>{totalPages}</button>}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30">›</button>
            </div>
          </div>
        </div>

        {/* ── Bottom: Approval Workflow + History + Remarks (when request selected) ── */}
        {selectedRequest && (
          <div className="order-3 xl:col-start-1 xl:row-start-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 min-w-0">

            {/* Approval Workflow */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h4 className="text-xs font-extrabold text-slate-700 mb-4">Approval Workflow</h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-[10px] before:top-3 before:bottom-0 before:w-px before:bg-slate-200">
                {getWorkflowSteps(selectedRequest).map((step) => (
                  <div key={step.n} className={`relative flex gap-3 items-start ${step.active ? '' : 'opacity-50'}`}>
                    <div className={`absolute left-[-24px] w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 border-white shadow ${step.active ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {step.n}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold leading-tight ${step.active ? 'text-[#0F172A]' : 'text-slate-600'}`}>{step.label}{step.active && ' (Current)'}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${getStatusBadge(step.statusLabel)}`}>{step.statusLabel}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.name}</p>
                      {step.date && <p className="text-[9px] text-slate-300">{step.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h4 className="text-xs font-extrabold text-slate-700 mb-4">Approval History</h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-[10px] before:top-3 before:bottom-0 before:w-px before:bg-slate-200">
                {getHistoryEvents(selectedRequest).map((ev) => (
                  <div key={ev.n} className="relative flex gap-3 items-start">
                    <div className="absolute left-[-24px] w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 border-white shadow text-white" style={{ backgroundColor: ev.dot }}>
                      {ev.n}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-extrabold text-slate-700 leading-tight">{ev.label}</span>
                        {ev.tag && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{ev.tag}</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{ev.sub}</p>
                      <p className="text-[9px] text-slate-400">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisor Remarks + Next Action */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between gap-3 min-w-0 overflow-hidden">
              <div>
                <h4 className="text-xs font-extrabold text-slate-700 mb-1.5">Advisor Remarks</h4>
                <p className="text-[10px] text-slate-400 mb-2">Add your remarks (optional)</p>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col">
                  <textarea
                    value={remarks}
                    onChange={e => { if (e.target.value.length <= 500) { setRemarks(e.target.value); setActionError(''); } }}
                    placeholder="Enter remarks about this request..."
                    className="w-full min-h-[70px] text-[11px] text-slate-700 outline-none resize-none bg-transparent placeholder-slate-400"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[9px] text-slate-400">{remarks.length} / 500</span>
                  </div>
                </div>
              </div>
              {actionError && (
                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {actionError}
                </div>
              )}
              {selectedRequest.rawStatus === 'returned_for_edit' ? (
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2">Next Action</p>
                  <p className="text-[10px] text-slate-500 mb-2">This request was returned for edit. Revise the details and resubmit it to re-enter your review queue.</p>
                  <button onClick={() => setShowResubmitModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer min-w-0">
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Revise &amp; Resubmit</span>
                  </button>
                </div>
              ) : isActionable(selectedRequest.status) ? (
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2">Next Action</p>
                  <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
                    <button onClick={() => handleResolveAction(true)} disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Approve</span>
                    </button>
                    <button onClick={() => handleResolveAction(false)} disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer min-w-0">
                      <X className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Reject</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-[11px] font-bold text-slate-500">This request has already been processed.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── RIGHT COLUMN: Detail Panel ── */}
        {selectedRequest && (
          <div id="details-panel" className="order-2 xl:col-start-2 xl:row-start-1 xl:row-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-0">

            {/* Student Header */}
            <div className="p-5 bg-white border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold border-2 border-white shadow shrink-0"
                    style={{ backgroundColor: getAvatarColor(selectedRequest.studentName).bg, color: getAvatarColor(selectedRequest.studentName).text }}>
                    {getInitials(selectedRequest.studentName)}
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">{selectedRequest.studentName}</h2>
                    <p className="text-[11px] font-bold text-blue-600 mt-0.5">{selectedRequest.rollNo}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Computer Science | BSCS-2022 | Semester 6<br />(Batch: 2023 Spring)</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CGPA</p>
                  <p className="text-xl font-extrabold text-green-500 mt-0.5">{cgpa.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">

              <div className="space-y-2">
                {[
                  ['Request Type', selectedRequest.type?.toLowerCase().includes('add') ? 'Course Registration' : (selectedRequest.type || '')],
                  ['Course / Section', `${selectedRequest.courseCode} - ${selectedRequest.courseName}\nSection B (Fall 2026)`],
                  ['Requested On', 'May 22, 2026, 10:15 AM'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="w-28 text-[11px] font-bold text-slate-500 shrink-0">{k}</span>
                    <span className="text-[11px] font-extrabold text-slate-800 whitespace-pre-line">{v}</span>
                  </div>
                ))}
                <div className="flex gap-3">
                  <span className="w-28 text-[11px] font-bold text-slate-500 shrink-0">Priority</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> High
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-extrabold text-slate-700 mb-2">Request Description</p>
                <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
                  {selectedRequest.justification || `Requesting permission to register for ${selectedRequest.courseCode} (${selectedRequest.courseName}) as I have fulfilled all the prerequisites and required courses.`}
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* Prerequisite Validation */}
              <div>
                <p className="text-[11px] font-extrabold text-slate-700 mb-3">Prerequisite Validation</p>
                <PrerequisiteCheck prerequisites={selectedRequest.validations?.prerequisites || []} cgpa={selectedRequest.cgpa} />
              </div>



              {/* Routing Information */}
              <div>
                <p className="text-[11px] font-extrabold text-slate-700 mb-3">Routing Information</p>
                <div className="space-y-2">
                  {[
                    ['Current Level', 'Advisor Level', 'text-blue-600 font-bold'],
                    ['Next Level', 'HOD Approval', 'text-slate-800 font-bold'],
                    ['Escalated To', '—', 'text-slate-400'],
                    ['Expected Resolution', '2 - 3 Working Days', 'text-slate-800 font-bold'],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{k}</span>
                      <span className={`text-[11px] ${cls}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Log Course Request</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Advisor routing request submission</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[11px] font-bold text-slate-600">Search Student *</label>
                {selectedStudent ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-emerald-800">{selectedStudent.name}</p>
                        <p className="text-[10px] text-emerald-600">{selectedStudent.rollNumber} · CGPA: {parseFloat(selectedStudent.cgpa || 0).toFixed(2)} · Sem: {selectedStudent.currentSemester}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedStudent(null)} className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">Change</button>
                    </div>

                    {/* Live Credit Hour Meter & Fulfillment Indicator */}
                    {(() => {
                      const activeEnrolled = (eligibleCourses.enrolledCourses || []).filter(c =>
                        c.status === 'enrolled' || c.enrollmentStatus === 'enrolled' || c.grade === 'IP' || c.semester === selectedStudent.currentSemester
                      );
                      const currentEnrolled = activeEnrolled.reduce((sum, c) => sum + (c.creditHours || 3), 0);
                      const maxLimit = selectedStudent.cgpa >= 3.5 ? 21 : (selectedStudent.cgpa < 2.0 && selectedStudent.currentSemester > 1) ? 12 : 18;
                      const addedCH = (requestType === 'add' || requestType === 'special_permission') ? (creditHours || 0) : -(creditHours || 0);
                      const projectedCH = Math.max(0, currentEnrolled + (selectedCourseId ? addedCH : 0));
                      const isFulfilled = projectedCH === maxLimit;
                      const isExceeded = projectedCH > maxLimit;

                      return (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-700">Credit Hour Meter</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isExceeded ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                              isFulfilled ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                              {isExceeded ? '🛑 Exceeds Max Limit' : isFulfilled ? '⚠️ Limit Fulfilled (100%)' : '✅ Within Credit Limit'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${isExceeded ? 'bg-rose-500' : isFulfilled ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (projectedCH / maxLimit) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                            <span>Enrolled: <b>{currentEnrolled} CH</b> {selectedCourseId && <span>({addedCH > 0 ? `+${addedCH}` : addedCH} CH = <b>{projectedCH} CH</b>)</span>}</span>
                            <span>Max Allowed: <b>{maxLimit} CH</b></span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    <input type="text" placeholder="Type student name or ID..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50" />
                    {searchingStudents && <div className="absolute right-3 top-8"><CircularProgress size={10} /></div>}
                    {studentsList.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-32 overflow-y-auto mt-1">
                        {studentsList.map(s => (
                          <div key={s._id} onClick={() => { setSelectedStudent(s); setStudentSearch(''); setStudentsList([]); }}
                            className="px-3 py-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors">
                            <p className="text-xs font-bold text-slate-800">{s.name}</p>
                            <p className="text-[10px] text-slate-400">{s.rollNumber} · CGPA: {s.cgpa} · Sem: {s.currentSemester}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-600">Request Type *</label>
                <ResponsiveSelect
                  value={requestType}
                  onChange={e => setRequestType(e.target.value)}
                  options={[
                    { value: 'add', label: 'Course Registration' },
                    { value: 'drop', label: 'Course Drop' },
                    { value: 'withdrawal', label: 'Course Withdrawal' },
                    { value: 'special_permission', label: 'Special Permission' }
                  ]}
                />
              </div>
              {selectedStudent && (
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[11px] font-bold text-slate-600">Choose Subject *</label>
                  {loadingCourses ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500"><CircularProgress size={10} /> Loading courses...</div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-left flex justify-between items-center cursor-pointer outline-none hover:border-blue-400 transition-colors"
                      >
                        <span className={courseCode ? "font-bold text-slate-800" : "text-slate-400"}>
                          {courseCode ? `${courseCode} – ${courseTitle} (${creditHours} CH)` : '-- Choose Subject --'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {showSubjectDropdown && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[180px] overflow-y-auto divide-y divide-slate-100">
                          {((requestType === 'add' || requestType === 'special_permission') ? eligibleCourses.curriculumCourses : eligibleCourses.enrolledCourses).length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">No available subjects found</div>
                          ) : (
                            ((requestType === 'add' || requestType === 'special_permission') ? eligibleCourses.curriculumCourses : eligibleCourses.enrolledCourses).map(c => {
                              const id = c._id || c.code || c.courseCode;
                              const code = c.courseCode || c.code;
                              const title = c.courseTitle || c.title;
                              const ch = c.creditHours || 3;
                              return (
                                <div
                                  key={id}
                                  onClick={() => {
                                    setSelectedCourseId(id);
                                    setCourseCode(code);
                                    setCourseTitle(title);
                                    setCreditHours(ch);
                                    setShowSubjectDropdown(false);
                                  }}
                                  className="p-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                  <p className="text-xs font-bold text-slate-800">{code} – {title}</p>
                                  <p className="text-[10px] font-semibold text-blue-600">{ch} Credit Hours</p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {courseCode && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <p>Code: <b>{courseCode}</b></p><p>Title: <b>{courseTitle}</b></p><p>Credits: <b>{creditHours} CH</b></p>
                </div>
              )}
              {courseCode && (requestType === 'add' || requestType === 'special_permission') && selectedStudent && (() => {
                const activeEnrolled = (eligibleCourses.enrolledCourses || []).filter(c =>
                  c.status === 'enrolled' || c.enrollmentStatus === 'enrolled' || c.grade === 'IP' || c.semester === selectedStudent.currentSemester
                );
                const hasDuplicate = activeEnrolled.some(c => (c.courseCode || c.code || '').toUpperCase() === courseCode.toUpperCase());
                return <DuplicateWarning hasDuplicate={hasDuplicate} courseCode={courseCode} />;
              })()}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-600">Justification Remarks{requestType === 'special_permission' ? ' *' : ''}</label>
                <textarea placeholder={requestType === 'special_permission' ? 'Required: explain why this override should be granted...' : 'Enter academic justification...'} value={justification} onChange={e => setJustification(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none resize-y min-h-[50px] bg-slate-50" />
              </div>
              {submitError && <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-[11px] font-bold"><AlertCircle className="w-3.5 h-3.5" /> {submitError}</div>}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitLoading} className="px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {submitLoading ? <CircularProgress size={10} color="inherit" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResubmitModal && selectedRequest && (
        <EditRequestModal
          request={selectedRequest}
          mode="advisor"
          onClose={() => setShowResubmitModal(false)}
          onSuccess={() => { setShowResubmitModal(false); setSelectedRequest(null); setEvalStudent(null); fetchRequests(); }}
        />
      )}

    </div>
  );
}