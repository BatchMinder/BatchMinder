import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, ShieldAlert, ShieldCheck, AlertTriangle, 
  X, Eye, BookOpen, Clock, Mail, Calendar, GraduationCap, Award
} from 'lucide-react';
import { CircularProgress } from '@mui/material';
import AcademicSummary from '../../pages/students/AcademicSummary';
import DegreeProgress from '../../pages/students/DegreeProgress';
import ResponsiveSelect from '../common/ResponsiveSelect';

export default function AdvisorStudents({ selectedBatch }) {
  const { user } = useAuth();
  
  // States
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [intakeFilter, setIntakeFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [degreeProgress, setDegreeProgress] = useState(null);
  const [detailTab, setDetailTab] = useState('profile');



  const assignedBatches = user?.assignedBatchIds || [];
  const hasNoBatches = assignedBatches.length === 0;

  const fetchStudentsList = async () => {
    if (hasNoBatches) return;
    setLoading(true);
    try {
      let url = `/api/advisor/students?page=${page}&limit=12`;
      if (selectedBatch && selectedBatch !== 'all') {
        url += `&batchId=${selectedBatch}`;
      }
      if (statusFilter) {
        url += `&cgpaStatus=${statusFilter}`;
      }
      if (intakeFilter) {
        url += `&intakeSession=${intakeFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStudents(data.data.students);
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error('Error fetching students catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (studentId) => {
    setStudentDetailsLoading(true);
    setDegreeProgress(null);
    setDetailTab('profile');
    try {
      const res = await fetch(`/api/advisor/students/${studentId}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSelectedStudent(data.data.student);
        
        // Fetch student degree completion progress
        const progRes = await fetch(`/api/students/${studentId}/degree-progress`);
        const progData = await progRes.json();
        if (progRes.ok && progData.status === 'success') {
          setDegreeProgress(progData.data.progress);
        }
      } else {
        alert(data.message || 'Failed to fetch student details.');
      }
    } catch (err) {
      console.error('Error loading student profile detail:', err);
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsList();
  }, [selectedBatch, statusFilter, intakeFilter, searchQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedBatch, statusFilter, intakeFilter, searchQuery]);

  if (hasNoBatches) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center', backgroundColor: '#FFFFFF',
        borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
          No Batches Assigned
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
          Contact your Dean to get assigned to your academic batches.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      
      {/* Search and Filters */}
      <div style={{
        padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search name, email, or roll number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
          </div>

          <ResponsiveSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Academic Standings' },
              { value: 'good', label: 'Good Standing' },
              { value: 'warning', label: 'Warning Standing' },
              { value: 'critical', label: 'Critical Standing' }
            ]}
          />
          
          <ResponsiveSelect
            value={intakeFilter}
            onChange={e => setIntakeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Intakes' },
              { value: 'Fall', label: 'Fall' },
              { value: 'Spring', label: 'Spring' }
            ]}
          />
        </div>

        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
          Found <b>{totalCount}</b> Student record(s)
        </span>
      </div>

      {/* Grid of Student Cards */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
          Loading Student profiles...
        </div>
      ) : students.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '14px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          No student records found under these parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map(s => {
            const statusConfig = {
              good: { text: '#059669', bg: '#EFFDF5', border: '#A7F3D0', label: 'Good Standing' },
              warning: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Warning' },
              critical: { text: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: 'Critical Alert' }
            };
            const config = statusConfig[s.cgpaStatus] || { text: '#475569', bg: '#F8FAFC', border: '#E2E8F0', label: s.cgpaStatus };
            const initials = s.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'ST';

            return (
              <div
                key={s._id}
                style={{
                  backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
                  padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)', position: 'relative'
                }}
              >
                {/* Header Profile Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', backgroundColor: '#EFF6FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 800, color: '#2563EB', flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{s.rollNumber}</span>
                  </div>
                </div>

                {/* Standing & CGPA details */}
                <div style={{
                  padding: '10px 12px', borderRadius: '8px', border: `1px solid ${config.border}`,
                  backgroundColor: config.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: config.text }}>
                    {config.label}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                    {s.currentSemester === 1 ? 'N/A' : `${s.cgpa.toFixed(2)} CGPA`}
                  </span>
                </div>

                {/* Sub details info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Batch Code</span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{s.batchId?.code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active Semester</span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Semester {s.currentSemester}</span>
                  </div>
                </div>

                {/* View detail button */}
                <button
                  onClick={() => handleOpenDetails(s._id)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
                    color: '#475569', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '6px', transition: 'all 0.15s',
                    marginTop: '8px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#1E293B'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                >
                  <Eye size={14} /> Inspect Profile
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile detail modal (Read only) */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px',
            border: '1px solid #E2E8F0', width: '100%', maxWidth: detailTab === 'profile' ? '640px' : '900px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh',
            transition: 'max-width 0.2s ease-in-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GraduationCap size={20} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Student Advising Profile
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                  color: '#94A3B8', display: 'flex', padding: 4
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header profile cards */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 800, color: '#2563EB'
                }}>
                  {selectedStudent.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>
                    {selectedStudent.name}
                  </h4>
                  <span style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedStudent.rollNumber} &bull; {selectedStudent.departmentId?.name}
                  </span>
                </div>
              </div>

              {/* Detail Navigation Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '20px', paddingBottom: '2px', marginBottom: '5px' }}>
                {[
                  { id: 'profile', label: 'Advising Profile' },
                  { id: 'academic', label: 'Academic Summary' },
                  { id: 'degree', label: 'Degree Progress Plan' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    style={{
                      padding: '8px 4px 10px', border: 'none', background: 'none',
                      borderBottom: detailTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                      color: detailTab === tab.id ? '#2563EB' : '#64748B',
                      fontWeight: detailTab === tab.id ? 700 : 500,
                      fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {detailTab === 'profile' && (
                <>
                  {/* Stats highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Academic Standing</span>
                      <p style={{
                        margin: '4px 0 0', fontSize: '13px', fontWeight: 800,
                        color: selectedStudent.cgpaStatus === 'good' ? '#10B981' : selectedStudent.cgpaStatus === 'warning' ? '#F59E0B' : '#EF4444'
                      }}>
                        {(selectedStudent.cgpaStatus || 'GOOD').toUpperCase()}
                      </p>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Cumulative CGPA</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                        {selectedStudent.currentSemester === 1 ? 'N/A' : (selectedStudent.cgpa || 0).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Current Semester</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                        Semester {selectedStudent.currentSemester}
                      </p>
                    </div>
                  </div>

                  {/* Extra Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} color="#94A3B8" />
                      <span>Email: <b>{selectedStudent.email || 'No email attached'}</b></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} color="#94A3B8" />
                      <span>Enrollment Date: <b>{new Date(selectedStudent.enrolledAt).toLocaleDateString()}</b></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} color="#94A3B8" />
                      <span>Account Status: <b style={{ color: selectedStudent.status === 'active' ? '#10B981' : '#64748B' }}>{selectedStudent.status.toUpperCase()}</b></span>
                    </div>
                  </div>

                  {/* Degree Progress Section */}
                  {degreeProgress && (
                    <div style={{
                      padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '10px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GraduationCap size={16} color="#10B981" />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>Degree Completion Progress</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3" style={{ marginTop: '4px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Completed Credits:</span>
                          <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{degreeProgress.completedCredits} CH</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Remaining Credits:</span>
                          <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>{degreeProgress.remainingCredits} CH</p>
                        </div>
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Completion Ratio</span>
                          <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 800 }}>{degreeProgress.completionPercentage}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${degreeProgress.completionPercentage}%`, height: '100%',
                            backgroundColor: '#10B981', borderRadius: '4px', transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'academic' && (
                <AcademicSummary student={selectedStudent} />
              )}

              {detailTab === 'degree' && (
                <DegreeProgress student={selectedStudent} />
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #F1F5F9',
              display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC'
            }}>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
