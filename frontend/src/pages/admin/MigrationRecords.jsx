import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, CheckCircle, Clock, AlertCircle, FileText, ArrowRightLeft, Eye, Check, X, Building2, User, Search, RefreshCw, Plus, BookOpen, Layers, Trash2, Upload, Download, ChevronDown, ChevronUp, Calculator, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { CircularProgress } from '@mui/material';
import Select from 'react-select';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';
import MigrationAudit from '../migration/MigrationAudit';
import STMUGradingScaleTable from '../../components/migration/STMUGradingScaleTable';

// Uploaded transcripts/decision sheets are stored as full Cloudinary URLs
// (e.g. https://res.cloudinary.com/...). Only prefix with the API host for
// legacy records that still hold an old relative local-disk path.
const resolveDocUrl = (url) => {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `http://localhost:5000${url}`;
};

export default function MigrationRecords() {
  const [migrations, setMigrations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [targetSemester, setTargetSemester] = useState('');

  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReq, setNewReq] = useState({ studentName: '', studentEmail: '', studentPhone: '', sourceInstitution: '', departmentId: '', batchId: '', fromSemester: '' });
  const [departmentsList, setDepartmentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newReqError, setNewReqError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  // Custom Modal & Pagination States
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempCourses, setTempCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ courseName: '', mappedCourseName: '', credits: 3, equivalencyStatus: 'pending' });
  const [isUpdatingCourses, setIsUpdatingCourses] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Curriculum State for comparison
  const [curriculum, setCurriculum] = useState(null);
  const [hecCurriculum, setHecCurriculum] = useState(null);

  // Transcript upload state
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const transcriptInputRef = useRef(null);

  // Migration Committee decision sheet upload state — the second required
  // document, separate from the transcript.
  const [decisionSheetFile, setDecisionSheetFile] = useState(null);
  const [isUploadingDecisionSheet, setIsUploadingDecisionSheet] = useState(false);
  const decisionSheetInputRef = useRef(null);

  // HEC panel + remarks state
  const [showHecPanel, setShowHecPanel] = useState(false);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [isParsingTranscript, setIsParsingTranscript] = useState(false);
  const [parseError, setParseError] = useState('');

  const fetchMigrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/migrations');
      const data = await res.json();
      if (data.status === 'success') {
        setMigrations(data.data.migrations);
        if (data.data.migrations.length > 0) {
          setSelected(prevSelected => {
            if (!prevSelected) return data.data.migrations[0];
            const updated = data.data.migrations.find(m => m._id === prevSelected._id);
            return updated || prevSelected;
          });
        }
      } else {
        setError(data.message || 'Failed to fetch migrations');
      }
    } catch (err) {
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMigrations();
  }, []);

  const fetchHecCurriculum = async (deptCode) => {
    if (!deptCode) {
      setHecCurriculum(null);
      return;
    }
    try {
      const res = await fetch(`/api/curriculums/hec?code=${encodeURIComponent(deptCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setHecCurriculum(data.data.curriculum);
        }
      } else {
        setHecCurriculum(null);
      }
    } catch (e) {
      console.error('Failed to fetch HEC curriculum', e);
      setHecCurriculum(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const openCoursesModal = (m) => {
    setSelected(m);
    setTempCourses(m.transferredCourses || []);
    setShowCoursesModal(true);
  };

  const saveTransferredCourses = async (silent = false) => {
    if (!selected) return;
    setIsUpdatingCourses(true);
    try {
      const res = await fetch(`/api/migrations/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferredCourses: tempCourses })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchMigrations();
        if (silent !== true) {
          alert('Transferred courses saved successfully!');
        }
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save courses');
    } finally {
      setIsUpdatingCourses(false);
    }
  };

  useEffect(() => {
    const batchId = selected?.studentId?.batchId?._id || selected?.studentId?.batchId;
    if (batchId) {
      fetchCurriculum(batchId);
    } else {
      setCurriculum(null);
    }
    fetchHecCurriculum(selected?.departmentId?.code);
  }, [selected]);

  const fetchCurriculum = async (batchId) => {
    try {
      const res = await fetch(`/api/curriculums/batch/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(data.data?.curriculum || null);
      } else {
        setCurriculum(null);
      }
    } catch (e) {
      console.error(e);
      setCurriculum(null);
    }
  };

  const openNewRequestModal = async () => {
    setShowNewModal(true);
    try {
      const [deptRes, stuRes, batchRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/students'),
        fetch('/api/batches')
      ]);
      const deptData = await deptRes.json();
      const stuData = await stuRes.json();
      const batchData = await batchRes.json();
      if (deptData.status === 'success') {
        setDepartmentsList(deptData.data || []);
      }
      if (stuData.status === 'success') {
        setStudentsList(stuData.data.students || []);
      }
      if (batchData.status === 'success') {
        setBatchesList(batchData.data || []);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  };

  const submitNewRequest = async () => {
    setNewReqError('');
    if (!newReq.studentName || !newReq.studentEmail || !newReq.studentPhone || !newReq.departmentId || !newReq.batchId || !newReq.sourceInstitution) {
      setNewReqError('Please fill in all required fields (Name, Email, Phone, Target Department, Target Batch, Source Institution)');
      return;
    }

    if (!transcriptFile) {
      setNewReqError('HEC-Verified Transcript is mandatory. Please upload the student transcript file before submitting the request.');
      return;
    }

    if (!decisionSheetFile) {
      setNewReqError("The Migration Committee's signed decision sheet is mandatory. Please upload it before submitting the request.");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: newReq.studentName,
          studentEmail: newReq.studentEmail,
          studentPhone: newReq.studentPhone,
          departmentId: newReq.departmentId,
          batchId: newReq.batchId,
          sourceInstitution: newReq.sourceInstitution,
          fromProgram: newReq.fromSemester ? `Semester ${newReq.fromSemester}` : '',
          currentSemester: newReq.fromSemester || 1,
          intakeSession: newReq.intakeSession || 'Spring',
          transferredCourses: []
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Upload both required documents
        const createdId = data.data?.migration?._id;
        if (createdId && transcriptFile) {
          await uploadTranscriptFile(createdId, transcriptFile);
        }
        if (createdId && decisionSheetFile) {
          await uploadDecisionSheetFile(createdId, decisionSheetFile);
        }
        setShowNewModal(false);
        setNewReq({ studentName: '', studentEmail: '', studentPhone: '', sourceInstitution: '', departmentId: '', batchId: '', fromSemester: '' });
        setTranscriptFile(null);
        setDecisionSheetFile(null);
        fetchMigrations();
      } else {
        setNewReqError(data.message || 'Failed to create request');
      }
    } catch (err) {
      setNewReqError('An error occurred. Please try again.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const uploadTranscriptFile = async (migrationId, file) => {
    setIsUploadingTranscript(true);
    try {
      const formData = new FormData();
      formData.append('transcript', file);
      const res = await fetch(`/api/migrations/${migrationId}/transcript`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        return data.data.transcriptUrl;
      }
    } catch (err) {
      console.error('Transcript upload failed:', err);
    } finally {
      setIsUploadingTranscript(false);
    }
    return null;
  };

  const uploadDecisionSheetFile = async (migrationId, file) => {
    setIsUploadingDecisionSheet(true);
    try {
      const formData = new FormData();
      formData.append('decisionSheet', file);
      const res = await fetch(`/api/migrations/${migrationId}/decision-sheet`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        return data.data.decisionSheetUrl;
      }
    } catch (err) {
      console.error('Decision sheet upload failed:', err);
    } finally {
      setIsUploadingDecisionSheet(false);
    }
    return null;
  };

  const handleDecision = async (status, remarksOverride) => {
    if (!selected) return;

    if (status === 'approved' && !selected.transcriptUrl && !transcriptFile) {
      setActionError('Migration request cannot be approved without an uploaded HEC-Verified Transcript.');
      return;
    }

    if (status === 'approved' && !selected.decisionSheetUrl && !decisionSheetFile) {
      setActionError("Migration request cannot be approved without the Migration Committee's signed decision sheet on file.");
      return;
    }

    const sourceCourses = tempCourses.length > 0 ? tempCourses : (selected.transferredCourses || []);
    if (sourceCourses.length === 0) {
      setActionError('This migration record has no transferred courses to decide on.');
      return;
    }

    let courseDecisions;
    if (status === 'approved') {
      // Every course must have an explicit accept/reject decision — a course
      // left "pending" must never be silently treated as accepted just
      // because the overall request was approved.
      const stillPending = sourceCourses.filter(c => c.equivalencyStatus !== 'accepted' && c.equivalencyStatus !== 'rejected');
      if (stillPending.length > 0) {
        setActionError(`Cannot approve: ${stillPending.length} course(s) still need an accept/reject decision (${stillPending.map(c => c.courseName).join(', ')}). Mark every course before approving.`);
        return;
      }
      const missingReasons = sourceCourses.filter(c => c.equivalencyStatus === 'rejected' && !(c.decisionRemark || '').trim());
      if (missingReasons.length > 0) {
        setActionError(`Please enter the Migration Committee's reason for rejecting: ${missingReasons.map(c => c.courseName).join(', ')}.`);
        return;
      }
      courseDecisions = sourceCourses.map(c => ({
        courseName: c.courseName,
        equivalencyStatus: c.equivalencyStatus,
        remark: c.equivalencyStatus === 'rejected' ? (c.decisionRemark || '').trim() : undefined
      }));
    } else {
      // Rejecting/returning the whole case — every course becomes rejected.
      // Use each course's own reason if already entered, otherwise fall back
      // to the overall remarks field so the backend's per-course reason
      // requirement is still satisfied.
      const overallRemark = (remarksOverride || decisionRemarks || '').trim();
      const missingReasons = sourceCourses.filter(c => !(c.decisionRemark || '').trim() && !overallRemark);
      if (missingReasons.length > 0) {
        setActionError('Please provide a reason for rejection — either per course, or in the overall remarks box below.');
        return;
      }
      courseDecisions = sourceCourses.map(c => ({
        courseName: c.courseName,
        equivalencyStatus: 'rejected',
        remark: (c.decisionRemark || '').trim() || overallRemark
      }));
    }

    setActioning(true);
    setActionError('');

    const decisionPayload = {
      status: status,
      courseDecisions,
      remarks: remarksOverride || decisionRemarks || `Migration ${status} by admin.`
    };

    // Add target semester if approving and one was explicitly chosen;
    // otherwise the backend auto-places the student using the credit-based
    // semester rule (calculateMigratedStudentSemester).
    if (status === 'approved' && targetSemester) {
      decisionPayload.targetSemester = parseInt(targetSemester);
    }

    try {
      const res = await fetch(`/api/migrations/${selected._id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionPayload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchMigrations();
      } else {
        setActionError(data.message || 'Failed to process decision');
      }
    } catch (err) {
      setActionError('An error occurred. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  if (loading && migrations.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Loading migration records...</div>;
  }

  // Calculate Metrics
  const totalRequests = migrations.length;
  const approved = migrations.filter(m => m.status === 'approved').length;
  const pending = migrations.filter(m => m.status === 'pending').length;
  const rejected = migrations.filter(m => m.status === 'rejected' || m.status === 'returned').length;
  let totalCreditsTransferred = 0;
  migrations.forEach(m => {
    if (m.status === 'approved') {
      m.transferredCourses.forEach(c => {
        if (c.equivalencyStatus === 'accepted') totalCreditsTransferred += c.credits;
      });
    }
  });

  const getPercentage = (num) => totalRequests > 0 ? ((num / totalRequests) * 100).toFixed(1) : '0.0';

  const statCards = [
    { label: 'Total Migration Requests', value: totalRequests, subtitle: 'This Semester', icon: FileSpreadsheet, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Approved Migrations', value: approved, subtitle: `${getPercentage(approved)}% of total`, icon: CheckCircle, color: '#10B981', bg: '#F0FDF4' },
    { label: 'Pending Review', value: pending, subtitle: `${getPercentage(pending)}% of total`, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Rejected / Returned', value: rejected, subtitle: `${getPercentage(rejected)}% of total`, icon: AlertCircle, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Credit Hours Transferred', value: totalCreditsTransferred.toLocaleString(), subtitle: 'Total This Semester', icon: ArrowRightLeft, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  const filteredMigrations = migrations.filter(m => {
    const sMatch = m.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.studentId?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'all' || m.status === statusFilter;
    const deptMatch = deptFilter === 'all' || m.departmentId?.code === deptFilter;
    return sMatch && statusMatch && deptMatch;
  });

  const totalPages = Math.ceil(filteredMigrations.length / itemsPerPage);
  const paginatedMigrations = filteredMigrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selected Student Logic
  let selectedSummary = {
    totalSubmitted: 0,
    accepted: 0,
    rejected: 0,
    inProgress: 0,
    creditsSubmitted: 0,
    creditsAccepted: 0,
  };

  if (selected) {
    selected.transferredCourses.forEach(c => {
      selectedSummary.totalSubmitted++;
      selectedSummary.creditsSubmitted += c.credits;
      if (c.equivalencyStatus === 'accepted') {
        selectedSummary.accepted++;
        selectedSummary.creditsAccepted += c.credits;
      } else if (c.equivalencyStatus === 'rejected') {
        selectedSummary.rejected++;
      } else {
        selectedSummary.inProgress++;
      }
    });
  }

  const transferPercentage = selectedSummary.creditsSubmitted > 0 ? Math.round((selectedSummary.creditsAccepted / selectedSummary.creditsSubmitted) * 100) : 0;

  let totalRequiredCredits = 0;
  if (curriculum && curriculum.courses) {
    totalRequiredCredits = curriculum.courses.reduce((sum, c) => sum + c.creditHours, 0);
  }

  const remainingCredits = Math.max(0, totalRequiredCredits - selectedSummary.creditsAccepted);
  const degreeProgress = totalRequiredCredits > 0 ? Math.round((selectedSummary.creditsAccepted / totalRequiredCredits) * 100) : 0;

  const currentSemPlacement = selected?.studentId?.currentSemester || Math.min(8, Math.max(1, Math.floor((selectedSummary.creditsAccepted || 0) / 16) + 1));
  let gradYear = new Date().getFullYear();
  let gradSeason = selected?.intakeSession || (new Date().getMonth() >= 6 ? 'Fall' : 'Spring');
  const remainingSems = Math.max(0, 8 - currentSemPlacement);

  for (let i = 0; i < remainingSems; i++) {
    if (gradSeason === 'Fall') {
      gradSeason = 'Spring';
      gradYear++;
    } else {
      gradSeason = 'Fall';
    }
  }
  const expectedGraduation = `${gradSeason} ${gradYear}`;

  return (
    <div style={{ padding: '0 0 40px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={card.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#64748B', lineHeight: 1.2 }}>{card.label}</p>
                </div>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{card.value}</h3>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: card.color }}>{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs navigation for migrations */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '24px', paddingBottom: '2px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 14px',
            border: 'none', background: 'none', borderBottom: activeTab === 'requests' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'requests' ? '#2563EB' : '#64748B', fontWeight: activeTab === 'requests' ? 800 : 500, fontSize: '13.5px',
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          Active Transfer Requests
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 14px',
            border: 'none', background: 'none', borderBottom: activeTab === 'audit' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'audit' ? '#2563EB' : '#64748B', fontWeight: activeTab === 'audit' ? 800 : 500, fontSize: '13.5px',
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          Migration Audit Log
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="flex flex-col xl:grid xl:grid-cols-[1.5fr_1fr] gap-5">

          {/* LEFT COLUMN */}
          <div className="contents xl:flex xl:flex-col" style={{ gap: '20px' }}>

            {/* Main List Table */}
            <div className="order-1 xl:order-none" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-5">
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Migrated Students List</h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} color="#64748B" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: '10px 16px 10px 40px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        fontWeight: 500,
                        outline: 'none',
                        width: '200px',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                        e.target.style.backgroundColor = '#FFF';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.backgroundColor = '#F8FAFC';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <ResponsiveSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' }
                    ]}
                  />
                  <button
                    onClick={openNewRequestModal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#fff', border: 'none', borderRadius: '10px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
                  >
                    <Plus size={16} /> New Migration Request
                  </button>
                </div>
              </div>


              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ padding: '12px 8px' }}>STUDENT ID (Formal)</th>
                      <th style={{ padding: '12px 8px' }}>STUDENT NAME</th>
                      <th style={{ padding: '12px 8px' }}>FROM INSTITUTION</th>
                      <th style={{ padding: '12px 8px' }}>DEPARTMENT</th>
                      <th style={{ padding: '12px 8px' }}>BATCH</th>
                      <th style={{ padding: '12px 8px' }}>REQUEST DATE</th>
                      <th style={{ padding: '12px 8px' }}>STATUS</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMigrations.map(m => {
                      const isSelected = selected && selected._id === m._id;
                      let sColor = '#F59E0B'; let sBg = '#FFFBEB';
                      if (m.status === 'approved') { sColor = '#059669'; sBg = '#D1FAE5'; }
                      if (m.status === 'rejected') { sColor = '#DC2626'; sBg = '#FEE2E2'; }

                      return (
                        <tr key={m._id} onClick={() => { setSelected(m); setTargetSemester(''); }} style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', backgroundColor: isSelected ? '#EFF6FF' : 'transparent', transition: 'all 0.2s' }}>
                          <td style={{ padding: '12px 8px', color: '#2563EB', fontWeight: 600 }}>{m.studentId?.rollNumber}</td>
                          <td style={{ padding: '12px 8px', color: '#0F172A', fontWeight: 500 }}>{m.studentId?.name}</td>
                          <td style={{ padding: '12px 8px', color: '#64748B' }}>{m.sourceInstitution}</td>
                          <td style={{ padding: '12px 8px', color: '#64748B' }}>{m.departmentId?.name}</td>
                          <td style={{ padding: '12px 8px', color: '#64748B' }}>{m.studentId?.batchId?.code || 'N/A'}</td>
                          <td style={{ padding: '12px 8px', color: '#64748B' }}>{format(new Date(m.createdAt), 'MMM d, yyyy')}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, backgroundColor: sBg, color: sColor }}>
                              {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openCoursesModal(m); }}
                              style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedMigrations.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>No migration records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', color: '#64748B', fontSize: '12px' }}>
                <span>Showing {paginatedMigrations.length} of {filteredMigrations.length} requests</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                    <span
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: currentPage === p ? '#2563EB' : '#fff',
                        color: currentPage === p ? '#fff' : '#64748B',
                        border: currentPage === p ? 'none' : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Curriculum Comparison & Course Equivalency (Bottom Left area matching screenshot) */}
            <div className="order-3 xl:order-none grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-5">

              {/* Curriculum Comparison */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', alignSelf: 'start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={14} color="#2563EB" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Curriculum Comparison</h3>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  From: {selected?.sourceInstitution || 'N/A'} <br /> To: {selected?.studentId?.batchId?.code || 'Current Curriculum'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Total Required Credits</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{totalRequiredCredits || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Completed Credits</span>
                    <span style={{ fontWeight: 600, color: '#10B981' }}>{selectedSummary.creditsAccepted} <span style={{ color: '#94A3B8', fontSize: '10px', fontWeight: 400 }}>(Transferred)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Remaining Credits</span>
                    <span style={{ fontWeight: 600, color: '#EF4444' }}>{remainingCredits || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#2563EB', fontWeight: 700 }}>STMU Current Sem Placement</span>
                    <span style={{ fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                      Semester {currentSemPlacement}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Degree Progress After Transfer</p>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${degreeProgress}%`, backgroundColor: '#2563EB' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                    <span>Expected Completion: {expectedGraduation}</span>
                    <span>{degreeProgress}% Completed</span>
                  </div>
                </div>
              </div>

              {/* Course Equivalency Mapping */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowRightLeft size={14} color="#10B981" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Course Equivalency Mapping</h3>
                  </div>
                  <button onClick={() => openCoursesModal(selected)} style={{ fontSize: '12px', color: '#2563EB', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>View Full Mapping</button>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></div> Accepted ({selectedSummary.accepted})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></div> In Progress ({selectedSummary.inProgress})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }}></div> Credit Loss ({selectedSummary.rejected})</span>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#94A3B8', textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>FROM COURSE</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>TO COURSE (TARGET)</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>CREDITS</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected?.transferredCourses?.map((c, i) => {
                        let sColor = '#F59E0B'; let sText = 'In Progress';
                        if (c.equivalencyStatus === 'accepted') { sColor = '#10B981'; sText = 'Accepted'; }
                        if (c.equivalencyStatus === 'rejected') { sColor = '#EF4444'; sText = 'Credit Loss'; }
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                            <td style={{ padding: '10px 4px', color: '#475569' }}>{c.courseName}</td>
                            <td style={{ padding: '10px 4px', color: '#475569' }}>{c.courseName}</td>
                            <td style={{ padding: '10px 4px', color: '#475569', textAlign: 'center' }}>{c.credits}</td>
                            <td style={{ padding: '10px 4px', color: sColor, fontWeight: 600 }}>{sText}</td>
                          </tr>
                        )
                      })}
                      {(!selected?.transferredCourses || selected.transferredCourses.length === 0) && (
                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No courses attached.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="contents xl:flex xl:flex-col" style={{ gap: '20px' }}>

            {/* Selected Student Details */}
            <div className="order-2 xl:order-none" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Selected Student Details</h3>
                <button onClick={() => setShowProfileModal(true)} style={{ fontSize: '12px', color: '#2563EB', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>View Full Profile</button>
              </div>

              {selected ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                      {selected.studentId?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{selected.studentId?.name || 'Unknown'}</h4>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748B' }}>{selected.studentId?.rollNumber}</p>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, backgroundColor: selected.status === 'approved' ? '#D1FAE5' : (selected.status === 'pending' ? '#FFFBEB' : '#FEE2E2'), color: selected.status === 'approved' ? '#059669' : (selected.status === 'pending' ? '#D97706' : '#DC2626') }}>
                        {selected.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={12} /> From Institution</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.sourceInstitution}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={12} /> From Program</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.sourceInstitution} (CS)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={12} /> To Program</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>BS Computer Science (STMU)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> Request Date</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>{format(new Date(selected.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12} /> Reviewed By</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.decidedBy?.name || 'Pending'}</span>
                    </div>
                    {selected.decidedAt && (
                      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start">
                        <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> Reviewed Date</span>
                        <span style={{ color: '#0F172A', fontWeight: 500 }}>{format(new Date(selected.decidedAt), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: '13px' }}>Select a student to view details</div>
              )}
            </div>

            {/* Migration Summary */}
            <div className="order-4 xl:order-none" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Migration Summary</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Courses Submitted</span>
                  <span style={{ fontWeight: 600, color: '#2563EB' }}>{selectedSummary.totalSubmitted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Courses Accepted</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{selectedSummary.accepted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Courses Rejected</span>
                  <span style={{ fontWeight: 600, color: '#EF4444' }}>{selectedSummary.rejected}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Courses In-Progress</span>
                  <span style={{ fontWeight: 600, color: '#F59E0B' }}>{selectedSummary.inProgress}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Credits Submitted</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedSummary.creditsSubmitted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Credits Accepted</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{selectedSummary.creditsAccepted}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Credit Transfer Percentage</span>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#2563EB', backgroundColor: '#fff' }}>
                  {transferPercentage}%
                </div>
              </div>
            </div>

            {/* Degree Progress Adjustment & Academic Plan Realignment
                (Scope Doc FE-13/FE-14/FE-37) — the backend already computes
                this on approval (missingCourses, curriculumComparison); this
                just surfaces it. */}
            {selected && selected.status === 'approved' && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Missing / Remaining Courses</h3>
                <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#94A3B8' }}>
                  Core courses from semesters before the assigned semester that this student hadn't completed — automatically scheduled into their next semester as a make-up requirement.
                </p>

                {(selected.missingCourses || []).length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, margin: '0 0 20px' }}>No backlog — all earlier-semester core requirements are satisfied.</p>
                ) : (
                  <div style={{ marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>COURSE CODE</th>
                          <th style={{ padding: '6px 8px' }}>COURSE TITLE</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>CH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.missingCourses.map((mc, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0F172A' }}>{mc.courseCode}</td>
                            <td style={{ padding: '6px 8px', color: '#475569' }}>{mc.courseTitle}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#64748B' }}>{mc.creditHours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>
                      Total backlog: {selected.missingCourses.reduce((s, mc) => s + (mc.creditHours || 0), 0)} CH across {selected.missingCourses.length} course(s) — already added to the student's next-semester course plan.
                    </p>
                  </div>
                )}

                {selected.curriculumComparison && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Degree Required Credits</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{selected.curriculumComparison.toRequiredCredits ?? '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Completed (incl. transferred)</span>
                      <span style={{ fontWeight: 600, color: '#10B981' }}>{selected.curriculumComparison.toCompletedCredits ?? '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Remaining Credits</span>
                      <span style={{ fontWeight: 600, color: '#F59E0B' }}>{selected.curriculumComparison.toRemainingCredits ?? '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Expected Completion</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{selected.curriculumComparison.expectedCompletion || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advisor Review Panel */}
            {selected && selected.status === 'pending' && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Advisor Review Panel</h3>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Advisor Remarks:</p>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#0F172A', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontStyle: 'italic' }}>
                  All accepted courses meet the curriculum equivalency criteria. Student is eligible for credit transfer.
                </p>

                {/* Target Semester Selection */}
                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F0F9FF', border: '1px solid #BFDBFE', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Assign Target Semester:
                  </label>
                  <select
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '13px', fontWeight: 600, color: '#1E40AF', backgroundColor: '#fff' }}>
                    <option value="">-- Select Target Semester --</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>

                {actionError && <p style={{ color: '#EF4444', fontSize: '12px', marginBottom: '12px' }}>{actionError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={actioning}
                    style={{
                      padding: '10px 14px', backgroundColor: '#F8FAFC', color: '#64748B',
                      border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      cursor: actioning ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                  >
                    Return Request
                  </button>
                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={actioning}
                    style={{
                      padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#DC2626',
                      border: '1px solid #FEE2E2', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      cursor: actioning ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={actioning}
                    style={{
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                      cursor: actioning ? 'not-allowed' : 'pointer', opacity: actioning ? 0.7 : 1,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
                  >
                    {actioning ? 'Processing...' : 'Approve'}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      ) : (
        <MigrationAudit />
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#2563EB" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>Add Migrated Student Request</h2>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Create credit transfer & equivalency audit application</p>
                </div>
              </div>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {newReqError && (
              <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '18px' }}>
                {newReqError}
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Student Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Faisal Raza"
                  value={newReq.studentName}
                  onChange={(e) => setNewReq({ ...newReq, studentName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Email <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. name@example.com"
                    value={newReq.studentEmail}
                    onChange={(e) => setNewReq({ ...newReq, studentEmail: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Phone <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={newReq.studentPhone}
                    onChange={(e) => setNewReq({ ...newReq, studentPhone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Department <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <ResponsiveSelect
                    value={newReq.departmentId}
                    onChange={(e) => setNewReq({ ...newReq, departmentId: e.target.value, batchId: '' })}
                    placeholder="Select Department"
                    className="w-full"
                    options={departmentsList.filter(d => ['CS', 'AI', 'SE', 'CY'].includes(d.code)).map(d => ({ value: d._id, label: `${d.name} (${d.code})` }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Batch <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <ResponsiveSelect
                    value={newReq.batchId}
                    onChange={(e) => setNewReq({ ...newReq, batchId: e.target.value })}
                    placeholder="Select Batch"
                    className="w-full"
                    options={batchesList.filter(b => {
                      const bDeptId = b.departmentId?._id || b.departmentId;
                      if (bDeptId && String(bDeptId) === String(newReq.departmentId)) return true;
                      // Fallback for legacy batches that only have a `dept` name string
                      // instead of a populated departmentId (same fallback the backend
                      // getAllBatches filter already uses).
                      const selectedDept = departmentsList.find(d => String(d._id) === String(newReq.departmentId));
                      return !!(selectedDept && b.dept && b.dept === selectedDept.name);
                    }).map(b => ({ value: b._id, label: b.code }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Source Institution <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. NUST UNIVERSITY"
                  value={newReq.sourceInstitution}
                  onChange={(e) => setNewReq({ ...newReq, sourceInstitution: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Semester at Source Institution
                  </label>
                  <ResponsiveSelect
                    value={newReq.fromSemester}
                    onChange={(e) => setNewReq({ ...newReq, fromSemester: e.target.value })}
                    placeholder="Select semester completed"
                    className="w-full"
                    options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    STMU Intake Session
                  </label>
                  <ResponsiveSelect
                    value={newReq.intakeSession || 'Spring'}
                    onChange={(e) => setNewReq({ ...newReq, intakeSession: e.target.value })}
                    className="w-full"
                    options={[
                      { value: 'Spring', label: '🌸 Spring Intake' },
                      { value: 'Fall', label: '🍂 Fall Intake' }
                    ]}
                  />
                </div>
              </div>

              {/* STMU Semester Placement Notice */}
              <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px 14px', borderRadius: '10px', fontSize: '11.5px', color: '#0369A1' }}>
                <strong style={{ color: '#0284C7' }}>💡 STMU Semester Placement Rule:</strong> Student's Current Semester in STMU is automatically calculated based on accepted transferred credit hours upon approval (16-32 CH = Sem 2, 33-49 CH = Sem 3, etc.).
              </div>

              {/* Transcript Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  HEC-Verified Transcript <span style={{ color: '#EF4444' }}>*</span> <span style={{ color: '#94A3B8', fontWeight: 400 }}>(PDF or Image, max 15MB)</span>
                </label>
                <input
                  ref={transcriptInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setTranscriptFile(e.target.files[0] || null)}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => transcriptInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${transcriptFile ? '#2563EB' : '#CBD5E1'}`,
                    borderRadius: '12px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: transcriptFile ? '#EFF6FF' : '#F8FAFC',
                    transition: 'all 0.2s'
                  }}
                >
                  {transcriptFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 700 }}>
                      <FileText size={18} />
                      {transcriptFile.name}
                      <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 500 }}>({(transcriptFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div style={{ color: '#64748B', fontSize: '12.5px' }}>
                      <Upload size={22} style={{ color: '#3B82F6', marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                      Click to upload HEC transcript (PDF or Image)
                    </div>
                  )}
                </div>
              </div>

              {/* Migration Committee Decision Sheet Upload — separate from
                  the transcript. The transcript is the student's raw course
                  history (proof); this is the committee's actual signed
                  verdict, which the admin transcribes course decisions from. */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Migration Committee Decision Sheet <span style={{ color: '#EF4444' }}>*</span> <span style={{ color: '#94A3B8', fontWeight: 400 }}>(PDF or Image, max 15MB)</span>
                </label>
                <input
                  ref={decisionSheetInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDecisionSheetFile(e.target.files[0] || null)}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => decisionSheetInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${decisionSheetFile ? '#2563EB' : '#CBD5E1'}`,
                    borderRadius: '12px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: decisionSheetFile ? '#EFF6FF' : '#F8FAFC',
                    transition: 'all 0.2s'
                  }}
                >
                  {decisionSheetFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 700 }}>
                      <FileText size={18} />
                      {decisionSheetFile.name}
                      <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 500 }}>({(decisionSheetFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div style={{ color: '#64748B', fontSize: '12.5px' }}>
                      <Upload size={22} style={{ color: '#3B82F6', marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                      Click to upload the committee's signed decision sheet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons Inline */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#64748B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={submitNewRequest}
                disabled={isSubmittingNew}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', backgroundColor: '#2563EB', border: 'none', cursor: isSubmittingNew ? 'not-allowed' : 'pointer', opacity: isSubmittingNew ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}
              >
                {isSubmittingNew ? <CircularProgress size={14} style={{ color: '#fff' }} /> : <CheckCircle size={16} />}
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Transferred Courses Equivalency Editor Modal */}
      {showCoursesModal && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '850px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Transferred Courses & Equivalency Mapping</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>{selected.studentId?.name} ({selected.studentId?.rollNumber}) • {selected.sourceInstitution}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selected.transcriptUrl && (
                  <a href={resolveDocUrl(selected.transcriptUrl)} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid #BFDBFE' }}>
                    <Download size={12} /> Transcript
                  </a>
                )}
                {selected.decisionSheetUrl ? (
                  <a href={resolveDocUrl(selected.decisionSheetUrl)} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, backgroundColor: '#F0FDF4', color: '#059669', fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid #A7F3D0' }}>
                    <Download size={12} /> Decision Sheet
                  </a>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, border: '1px solid #FEE2E2' }}>
                    No decision sheet on file
                  </span>
                )}
                {selected.transcriptUrl && selected.status === 'pending' && (
                  <button
                    onClick={async () => {
                      setIsParsingTranscript(true);
                      setParseError('');
                      try {
                        const res = await fetch(`/api/migrations/${selected._id}/parse-transcript`);
                        const data = await res.json();
                        if (data.status === 'success' && data.data.courses.length > 0) {
                          setTempCourses(prev => {
                            const existingNames = new Set(prev.map(c => c.courseName));
                            const newOnes = data.data.courses.filter(c => !existingNames.has(c.courseName));
                            return [...prev, ...newOnes];
                          });
                        } else {
                          setParseError(data.message || 'No courses could be extracted from the transcript.');
                        }
                      } catch (e) {
                        setParseError('Parse failed: ' + e.message);
                      } finally {
                        setIsParsingTranscript(false);
                      }
                    }}
                    disabled={isParsingTranscript}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: isParsingTranscript ? 'not-allowed' : 'pointer', opacity: isParsingTranscript ? 0.7 : 1 }}
                  >
                    <FileText size={14} />
                    {isParsingTranscript ? 'Parsing...' : 'Import from Transcript'}
                  </button>
                )}
                <button onClick={() => setShowCoursesModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px', paddingBottom: '160px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Parse error */}
              {parseError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} /> {parseError}
                </div>
              )}

              {/* Transcript import hint */}
              {selected.transcriptUrl && tempCourses.length === 0 && !parseError && selected.status === 'pending' && (
                <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '10px', fontSize: '13px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color="#059669" />
                  <span>A transcript is attached. Click <strong>Import from Transcript</strong> above to auto-fill courses from the uploaded PDF.</span>
                </div>
              )}

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', flexShrink: 0 }}>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px', width: '35%' }}>SOURCE COURSE NAME</th>
                      <th style={{ padding: '12px 16px', width: '40%', minWidth: '240px' }}>TARGET EQUIVALENT COURSE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '10%' }}>CREDITS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '10%' }}>TYPE</th>
                      <th style={{ padding: '12px 16px', width: '10%' }}>STATUS</th>
                      {selected.status === 'pending' && <th style={{ padding: '12px 16px', textAlign: 'right', width: '5%' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tempCourses.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{c.courseName}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {selected.status === 'pending' ? (
                            (() => {
                              const deptCodes = new Set(curriculum?.courses?.map(course => course.code) || []);
                              const uniqueHec = (hecCurriculum?.courses || []).filter(course => !deptCodes.has(course.code));

                              const options = [];
                              if (uniqueHec.length > 0) {
                                options.push({
                                  label: "HEC Standard Curriculum (2025)",
                                  options: uniqueHec.map(c => ({ value: c.code, label: `${c.code} - ${c.title} (${c.creditHours} CH)`, credits: c.creditHours }))
                                });
                              }
                              if (curriculum?.courses?.length > 0) {
                                options.push({
                                  label: "Department Curriculum",
                                  options: curriculum.courses.map(c => ({ value: c.code, label: `${c.code} - ${c.title} (${c.creditHours} CH)`, credits: c.creditHours }))
                                });
                              }

                              const allOpts = options.flatMap(g => g.options);
                              const selectedOption = allOpts.find(o => o.value === c.mappedCourseName) || null;

                              return (
                                <Select
                                  options={options}
                                  value={selectedOption}
                                  onChange={(selectedOpt) => {
                                    const selectedCode = selectedOpt ? selectedOpt.value : '';
                                    setTempCourses(prev => {
                                      const updated = [...prev];
                                      updated[idx] = {
                                        ...updated[idx],
                                        mappedCourseName: selectedCode,
                                        credits: selectedOpt ? selectedOpt.credits : updated[idx].credits
                                      };
                                      return updated;
                                    });
                                  }}
                                  isClearable
                                  placeholder="Select target course..."
                                  closeMenuOnScroll={false}
                                  menuPlacement="auto"
                                  maxMenuHeight={220}
                                  styles={{
                                    control: (base, state) => ({
                                      ...base,
                                      borderRadius: '8px',
                                      borderColor: state.isFocused ? '#3B82F6' : '#CBD5E1',
                                      boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : '0 1px 2px 0 rgba(0,0,0,0.05)',
                                      fontSize: '13px',
                                      minHeight: '36px',
                                      minWidth: '220px',
                                      cursor: 'pointer'
                                    }),
                                    menu: base => ({
                                      ...base,
                                      fontSize: '13px',
                                      zIndex: 9999
                                    }),
                                    option: (base, state) => ({ ...base, cursor: 'pointer' })
                                  }}
                                />
                              );
                            })()
                          ) : (
                            c.mappedCourseName || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unmapped</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{c.credits}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {selected.status === 'pending' ? (
                            <select
                              value={c.courseType || 'CORE'}
                              onChange={e => {
                                const updated = [...tempCourses];
                                updated[idx].courseType = e.target.value;
                                setTempCourses(updated);
                              }}
                              style={{
                                padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', fontWeight: 600, fontFamily: 'inherit', color: '#334155', backgroundColor: '#F8FAFC'
                              }}
                            >
                              <option value="CORE">Core</option>
                              <option value="ELECTIVE">Elective</option>
                              <option value="LAB">Lab</option>
                              <option value="GENERAL">General</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>{(c.courseType || 'CORE')}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {selected.status === 'pending' ? (
                            <>
                              <select
                                value={c.equivalencyStatus}
                                onChange={e => {
                                  const updated = [...tempCourses];
                                  updated[idx].equivalencyStatus = e.target.value;
                                  setTempCourses(updated);
                                }}
                                style={{
                                  padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontWeight: 600, fontFamily: 'inherit',
                                  color: c.equivalencyStatus === 'accepted' ? '#059669' : (c.equivalencyStatus === 'rejected' ? '#DC2626' : '#D97706'),
                                  backgroundColor: c.equivalencyStatus === 'accepted' ? '#D1FAE5' : (c.equivalencyStatus === 'rejected' ? '#FEE2E2' : '#FFFBEB'),
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Credit Loss</option>
                              </select>
                              {c.equivalencyStatus === 'rejected' && (
                                <input
                                  type="text"
                                  value={c.decisionRemark || ''}
                                  onChange={e => {
                                    const updated = [...tempCourses];
                                    updated[idx].decisionRemark = e.target.value;
                                    setTempCourses(updated);
                                  }}
                                  placeholder="Committee's reason (required)"
                                  style={{
                                    display: 'block', marginTop: '6px', width: '160px', padding: '5px 8px',
                                    borderRadius: '6px', border: `1px solid ${c.decisionRemark ? '#CBD5E1' : '#FCA5A5'}`,
                                    fontSize: '11px', outline: 'none', fontFamily: 'inherit', color: '#475569'
                                  }}
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <span style={{
                                padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                backgroundColor: c.equivalencyStatus === 'accepted' ? '#D1FAE5' : (c.equivalencyStatus === 'rejected' ? '#FEE2E2' : '#FFFBEB'),
                                color: c.equivalencyStatus === 'accepted' ? '#059669' : (c.equivalencyStatus === 'rejected' ? '#DC2626' : '#D97706')
                              }}>
                                {c.equivalencyStatus === 'rejected' ? 'CREDIT LOSS' : c.equivalencyStatus.toUpperCase()}
                              </span>
                              {c.equivalencyStatus === 'rejected' && c.decisionRemark && (
                                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94A3B8', maxWidth: '160px', fontStyle: 'italic' }}>"{c.decisionRemark}"</p>
                              )}
                            </>
                          )}
                        </td>
                        {selected.status === 'pending' && (
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setTempCourses(tempCourses.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {tempCourses.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No transferred courses attached yet. Add a course below.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HEC Curriculum Reference Panel */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                <button
                  onClick={() => setShowHecPanel(!showHecPanel)}
                  style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#065F46' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GraduationCap size={16} />
                    HEC Standard Curriculum Reference (2025) — {hecCurriculum?.courses?.length || 0} courses
                  </span>
                  {showHecPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showHecPanel && hecCurriculum?.courses && (
                  <div style={{ maxHeight: '280px', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ position: 'sticky', top: 0 }}>
                        <tr style={{ backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700 }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>CODE</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>COURSE TITLE</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>SEM</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>CH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hecCurriculum.courses.map((c, i) => (
                          <tr key={i}
                            style={{ borderBottom: '1px solid #F0FDF4', backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB' }}
                          >
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{c.code}</td>
                            <td style={{ padding: '8px 12px', color: '#374151' }}>{c.title}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>{c.semester}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#2563EB' }}>{c.creditHours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Remarks removed */}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowCoursesModal(false); setShowHecPanel(false); }}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              {selected.status === 'pending' && (
                <button
                  onClick={() => saveTransferredCourses(false)}
                  disabled={isUpdatingCourses}
                  style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isUpdatingCourses ? 'not-allowed' : 'pointer', opacity: isUpdatingCourses ? 0.7 : 1 }}
                >
                  {isUpdatingCourses ? 'Saving...' : 'Save Mappings'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 4. Student Full Profile Modal */}
      {showProfileModal && selected && selected.studentId && (() => {
        const stu = selected.studentId;
        const allCourses = stu.courses || [];
        const gradePoints = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0, 'IP': null };

        // Group by semester
        const bySemester = {};
        allCourses.forEach(c => {
          const sem = c.semester || 1;
          if (!bySemester[sem]) bySemester[sem] = [];
          bySemester[sem].push(c);
        });

        const computeSGPA = (courses) => {
          const graded = courses.filter(c => gradePoints[c.grade] !== null && gradePoints[c.grade] !== undefined);
          if (!graded.length) return null;
          const totalPoints = graded.reduce((s, c) => s + gradePoints[c.grade] * (c.creditHours || 0), 0);
          const totalCH = graded.reduce((s, c) => s + (c.creditHours || 0), 0);
          return totalCH > 0 ? (totalPoints / totalCH).toFixed(2) : null;
        };

        const cgpa = typeof stu.cgpa === 'number' ? stu.cgpa.toFixed(2) : '—';
        const cgpaColor = parseFloat(cgpa) >= 3.0 ? '#10B981' : parseFloat(cgpa) >= 2.0 ? '#F59E0B' : '#EF4444';
        const completedCredits = allCourses.filter(c => c.enrollmentStatus === 'completed' || c.status === 'completed').reduce((s, c) => s + (c.creditHours || 0), 0);

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: 24, maxWidth: 860, width: '100%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: '250px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff' }}>
                    {stu.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>{stu.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>{stu.rollNumber} • {selected.departmentId?.name || 'N/A'} • Batch {stu.batchId?.code || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {selected.transcriptUrl && (
                    <a href={resolveDocUrl(selected.transcriptUrl)} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid #BFDBFE' }}>
                      <Download size={14} /> View Transcript
                    </a>
                  )}
                  <button onClick={() => setShowProfileModal(false)} style={{ padding: 8, border: 'none', backgroundColor: '#E2E8F0', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={16} /></button>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 0, borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { label: 'CGPA', value: cgpa, color: cgpaColor },
                  { label: 'Semester', value: `Sem ${stu.currentSemester || '—'}` },
                  { label: 'Completed Credits', value: completedCredits },
                  { label: 'Total Courses', value: allCourses.length },
                ].map((stat, i) => (
                  <div key={i} style={{ padding: '16px 10px', textAlign: 'center', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94A3B8', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color || '#0F172A' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Source Institution & Transcript Badge */}
              <div style={{ padding: '12px 24px', backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={14} color="#F97316" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Migrating from: {selected.sourceInstitution}</span>
                {selected.transcriptOriginalName && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A3412', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: 6 }}>
                    <FileText size={10} style={{ display: 'inline', marginRight: 4 }} />{selected.transcriptOriginalName}
                  </span>
                )}
              </div>

              {/* Transcript by Semester */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {Object.keys(bySemester).sort((a, b) => Number(a) - Number(b)).map(sem => {
                  const semCourses = bySemester[sem];
                  const sgpa = computeSGPA(semCourses);
                  const sgpaColor = sgpa ? (parseFloat(sgpa) >= 3.0 ? '#10B981' : parseFloat(sgpa) >= 2.0 ? '#F59E0B' : '#EF4444') : '#94A3B8';
                  return (
                    <div key={sem} style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
                      <div style={{ padding: '10px 16px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>Semester {sem}</span>
                        {sgpa && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: sgpaColor, backgroundColor: sgpaColor + '15', padding: '2px 10px', borderRadius: 20 }}>
                            SGPA: {sgpa}
                          </span>
                        )}
                      </div>
                      <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 700 }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>CODE</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>TITLE</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>CH</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>GRADE</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {semCourses.map((c, idx) => {
                            const gradeColor = c.grade === 'F' ? '#EF4444' : (c.grade === 'IP' || c.grade === 'A' ? '#2563EB' : '#374151');
                            const statusColor = c.enrollmentStatus === 'completed' ? '#10B981' : c.enrollmentStatus === 'failed' ? '#EF4444' : '#F59E0B';
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{c.courseCode}</td>
                                <td style={{ padding: '8px 12px', color: '#374151' }}>{c.courseTitle}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>{c.creditHours}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: gradeColor }}>{c.grade || '—'}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: statusColor, backgroundColor: statusColor + '15', padding: '2px 8px', borderRadius: 10 }}>
                                    {c.enrollmentStatus || c.status || 'Enrolled'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                {allCourses.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: 13 }}>
                    No course records available for this student.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowProfileModal(false)}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}



    </div>
  );
}