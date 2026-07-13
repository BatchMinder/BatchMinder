import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, CheckCircle, Clock, AlertCircle, FileText, ArrowRightLeft, Eye, Check, X, Building2, User, Search, RefreshCw, Plus, BookOpen, Layers, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { CircularProgress } from '@mui/material';

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

  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReq, setNewReq] = useState({ rollNumber: '', sourceInstitution: '', departmentId: '' });
  const [departmentsList, setDepartmentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newReqError, setNewReqError] = useState('');
  
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

  const fetchMigrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/migrations');
      const data = await res.json();
      if (data.status === 'success') {
        setMigrations(data.data.migrations);
        if (data.data.migrations.length > 0 && !selected) {
          setSelected(data.data.migrations[0]);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const openCoursesModal = (m) => {
    setSelected(m);
    setTempCourses(m.transferredCourses || []);
    setShowCoursesModal(true);
  };

  const saveTransferredCourses = async () => {
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
        setShowCoursesModal(false);
        fetchMigrations();
        alert('Transferred courses saved successfully!');
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
  }, [selected]);

  const fetchCurriculum = async (batchId) => {
    try {
      const res = await fetch(`/api/curriculums/batch/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(data.data.curriculum);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openNewRequestModal = async () => {
    setShowNewModal(true);
    try {
      const [deptRes, stuRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/students')
      ]);
      const deptData = await deptRes.json();
      const stuData = await stuRes.json();
      if (deptData.status === 'success') {
        setDepartmentsList(deptData.data || []);
      }
      if (stuData.status === 'success') {
        setStudentsList(stuData.data.students || []);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  };

  const submitNewRequest = async () => {
    setNewReqError('');
    if (!newReq.rollNumber || !newReq.departmentId || !newReq.sourceInstitution) {
      setNewReqError('Please fill in all fields');
      return;
    }
    
    const student = studentsList.find(s => s.rollNumber.toLowerCase() === newReq.rollNumber.toLowerCase());
    if (!student) {
      setNewReqError('Student with this roll number not found');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id,
          departmentId: newReq.departmentId,
          sourceInstitution: newReq.sourceInstitution,
          transferredCourses: []
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowNewModal(false);
        setNewReq({ rollNumber: '', sourceInstitution: '', departmentId: '' });
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

  const handleDecision = async (status) => {
    if (!selected) return;
    setActioning(true);
    setActionError('');
    
    const decisionPayload = {
      courseDecisions: selected.transferredCourses.map(c => ({
        courseName: c.courseName,
        equivalencyStatus: status === 'approved' ? 'accepted' : 'rejected'
      })),
      remarks: `Automatically ${status} all courses via quick action.`
    };

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

  return (
    <div style={{ padding: '0 0 40px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. TOP STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main List Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Migrated Students List</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} color="#64748B" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name or ID..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    style={{ 
                      padding: '10px 16px 10px 40px', 
                      borderRadius: '12px', 
                      border: '1px solid #E2E8F0', 
                      fontSize: '13px', 
                      fontWeight: 500,
                      outline: 'none', 
                      width: '260px',
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
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={openNewRequestModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={14} /> New Migration Request
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
                      <tr key={m._id} onClick={() => setSelected(m)} style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', backgroundColor: isSelected ? '#EFF6FF' : 'transparent', transition: 'all 0.2s' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
            
            {/* Curriculum Comparison */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={14} color="#2563EB" />
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Curriculum Comparison</h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                From: {selected?.sourceInstitution || 'N/A'} <br/> To: {selected?.studentId?.batchId?.code || 'Current Curriculum'}
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
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Degree Progress After Transfer</p>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: `${degreeProgress}%`, backgroundColor: '#2563EB' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                  <span>Expected Completion: Spring 2028</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Selected Student Details */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={12} /> From Institution</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.sourceInstitution}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={12} /> From Program</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.sourceInstitution} (CS)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={12} /> To Program</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>BS Computer Science (STMU)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> Request Date</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{format(new Date(selected.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12} /> Reviewed By</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{selected.decidedBy?.name || 'Pending'}</span>
                  </div>
                  {selected.decidedAt && (
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start' }}>
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
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
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

          {/* Advisor Review Panel */}
          {selected && selected.status === 'pending' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Advisor Review Panel</h3>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Advisor Remarks:</p>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#0F172A', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontStyle: 'italic' }}>
                All accepted courses meet the curriculum equivalency criteria. Student is eligible for credit transfer.
              </p>
              {actionError && <p style={{ color: '#EF4444', fontSize: '12px', marginBottom: '12px' }}>{actionError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '8px' }}>
                <button 
                  onClick={() => handleDecision('rejected')} 
                  disabled={actioning}
                  style={{ padding: '10px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Return Request
                </button>
                <button 
                  onClick={() => handleDecision('rejected')} 
                  disabled={actioning}
                  style={{ padding: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Reject
                </button>
                <button 
                  onClick={() => handleDecision('approved')} 
                  disabled={actioning}
                  style={{ padding: '10px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {actioning ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* New Request Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>Create Migration Request</h2>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {newReqError && (
                <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                  {newReqError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Student Roll Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. F22-BCS-001"
                    value={newReq.rollNumber}
                    onChange={(e) => setNewReq({...newReq, rollNumber: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Source Institution</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ABC University"
                    value={newReq.sourceInstitution}
                    onChange={(e) => setNewReq({...newReq, sourceInstitution: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Target Department</label>
                  <select 
                    value={newReq.departmentId}
                    onChange={(e) => setNewReq({...newReq, departmentId: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="">Select a Department</option>
                    {departmentsList.map(d => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowNewModal(false)}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#64748B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={submitNewRequest}
                disabled={isSubmittingNew}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', backgroundColor: '#2563EB', border: 'none', cursor: isSubmittingNew ? 'not-allowed' : 'pointer', opacity: isSubmittingNew ? 0.7 : 1 }}
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
              <button onClick={() => setShowCoursesModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>SOURCE COURSE NAME</th>
                      <th style={{ padding: '12px 16px' }}>TARGET EQUIVALENT COURSE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>CREDITS</th>
                      <th style={{ padding: '12px 16px' }}>STATUS</th>
                      {selected.status === 'pending' && <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tempCourses.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{c.courseName}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {selected.status === 'pending' ? (
                            <select
                              value={c.mappedCourseName}
                              onChange={e => {
                                const updated = [...tempCourses];
                                updated[idx].mappedCourseName = e.target.value;
                                setTempCourses(updated);
                              }}
                              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#fff', width: '100%', fontFamily: 'inherit' }}
                            >
                              <option value="">Select target course...</option>
                              {curriculum?.courses?.map(course => (
                                <option key={course.code} value={course.title}>{course.code} - {course.title}</option>
                              ))}
                            </select>
                          ) : (
                            c.mappedCourseName || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unmapped</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{c.credits}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {selected.status === 'pending' ? (
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
                          ) : (
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                              backgroundColor: c.equivalencyStatus === 'accepted' ? '#D1FAE5' : (c.equivalencyStatus === 'rejected' ? '#FEE2E2' : '#FFFBEB'),
                              color: c.equivalencyStatus === 'accepted' ? '#059669' : (c.equivalencyStatus === 'rejected' ? '#DC2626' : '#D97706')
                            }}>
                              {c.equivalencyStatus === 'rejected' ? 'CREDIT LOSS' : c.equivalencyStatus.toUpperCase()}
                            </span>
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
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No transferred courses attached yet. Add a course below.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selected.status === 'pending' && (
                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>Add Transferred Course & Map Equivalency</h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="Source Course (e.g. CS-101 Programming Fund.)"
                      value={newCourse.courseName}
                      onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })}
                      style={{ flex: 2, minWidth: '200px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                    />
                    <select 
                      value={newCourse.mappedCourseName}
                      onChange={e => setNewCourse({ ...newCourse, mappedCourseName: e.target.value })}
                      style={{ flex: 2, minWidth: '200px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="">Map Target Course (Prerequisite)</option>
                      {curriculum?.courses?.map(c => (
                        <option key={c.code} value={c.title}>{c.code} - {c.title}</option>
                      ))}
                    </select>
                    <select 
                      value={newCourse.credits}
                      onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      {[1,2,3,4].map(c => <option key={c} value={c}>{c} Credits</option>)}
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!newCourse.courseName) {
                          alert('Please fill in Source Course Name');
                          return;
                        }
                        setTempCourses([...tempCourses, newCourse]);
                        setNewCourse({ courseName: '', mappedCourseName: '', credits: 3, equivalencyStatus: 'pending' });
                      }}
                      style={{ padding: '10px 20px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Add Course
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowCoursesModal(false)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              {selected.status === 'pending' && (
                <button 
                  onClick={saveTransferredCourses}
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
      {showProfileModal && selected && selected.studentId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={18} /> Student Full Profile
              </h3>
              <button onClick={() => setShowProfileModal(false)} style={{ padding: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#2563EB' }}>
                {selected.studentId.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{selected.studentId.name}</div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{selected.studentId.rollNumber}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.departmentId?.name || 'Computer Science'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.studentId.batchId?.code || 'N/A'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>Semester {selected.studentId.currentSemester}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Phone</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.studentId.phone || 'N/A'}</div>
              </div>
            </div>
            <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source University / Institution</div>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.sourceInstitution}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
