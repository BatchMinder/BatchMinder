import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, ShieldAlert, ShieldCheck, AlertTriangle, 
  X, Eye, BookOpen, Clock, Mail, Calendar, GraduationCap
} from 'lucide-react';

export default function AdvisorStudents({ selectedBatch }) {
  const { user } = useAuth();
  
  // States
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
    try {
      const res = await fetch(`/api/advisor/students/${studentId}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSelectedStudent(data.data.student);
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
  }, [selectedBatch, statusFilter, searchQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedBatch, statusFilter, searchQuery]);

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
          Contact your Super Admin to get assigned to your academic batches.
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
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

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1',
              fontSize: '13px', outline: 'none', color: '#475569', cursor: 'pointer',
              backgroundColor: '#FFFFFF', fontFamily: 'inherit'
            }}
          >
            <option value="">All Academic Standings</option>
            <option value="good">Good Standing</option>
            <option value="warning">Warning Standing</option>
            <option value="critical">Critical Standing</option>
          </select>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
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
                    {s.cgpa.toFixed(2)} CGPA
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
            border: '1px solid #E2E8F0', width: '100%', maxWidth: '640px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh'
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

              {/* Stats highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Academic Standing</span>
                  <p style={{
                    margin: '4px 0 0', fontSize: '13px', fontWeight: 800,
                    color: selectedStudent.cgpaStatus === 'good' ? '#10B981' : selectedStudent.cgpaStatus === 'warning' ? '#F59E0B' : '#EF4444'
                  }}>
                    {selectedStudent.cgpaStatus.toUpperCase()}
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Cumulative CGPA</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                    {selectedStudent.cgpa.toFixed(2)}
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

              {/* Courses Enrollments Grouped by Semester */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h5 style={{ margin: '0', fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} color="#64748B" /> Academic History & Semester Results
                </h5>
                {(!selectedStudent.courses || selectedStudent.courses.length === 0) ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                    No course records registered for this student.
                  </p>
                ) : (() => {
                  const gradePointsMap = {
                    'A': 4.0,
                    'B+': 3.5,
                    'B': 3.0,
                    'C+': 2.5,
                    'C': 2.0,
                    'F': 0.0
                  };

                  const calculateGPA = (semesterCourses) => {
                    let totalCredits = 0;
                    let totalGradePoints = 0;
                    let hasGradedCourse = false;

                    semesterCourses.forEach(c => {
                      if (c.enrollmentStatus === 'completed' && gradePointsMap[c.grade] !== undefined) {
                        totalCredits += c.creditHours;
                        totalGradePoints += c.creditHours * gradePointsMap[c.grade];
                        hasGradedCourse = true;
                      } else if (c.enrollmentStatus === 'failed') {
                        totalCredits += c.creditHours;
                        totalGradePoints += c.creditHours * 0.0;
                        hasGradedCourse = true;
                      }
                    });

                    if (!hasGradedCourse || totalCredits === 0) return 'N/A';
                    return (totalGradePoints / totalCredits).toFixed(2);
                  };

                  const coursesBySemester = {};
                  selectedStudent.courses.forEach(c => {
                    const sem = c.semester || 1;
                    if (!coursesBySemester[sem]) {
                      coursesBySemester[sem] = [];
                    }
                    coursesBySemester[sem].push(c);
                  });

                  return Object.keys(coursesBySemester)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(sem => {
                      const semCourses = coursesBySemester[sem];
                      const semGpa = calculateGPA(semCourses);
                      
                      return (
                        <div key={sem} style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                          {/* Semester Subheader */}
                          <div style={{
                            padding: '10px 16px',
                            backgroundColor: '#F8FAFC',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1B3A6B' }}>
                              SEMESTER {sem}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              backgroundColor: semGpa === 'N/A' ? '#F1F5F9' : '#EFF6FF',
                              color: semGpa === 'N/A' ? '#64748B' : '#1E40AF',
                              border: `1px solid ${semGpa === 'N/A' ? '#E2E8F0' : '#BFDBFE'}`
                            }}>
                              GPA: {semGpa}
                            </span>
                          </div>

                          {/* Semester Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA' }}>
                                <th style={{ padding: '6px 16px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Code</th>
                                <th style={{ padding: '6px 16px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Course Title</th>
                                <th style={{ padding: '6px 16px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Credits</th>
                                <th style={{ padding: '6px 16px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Grade</th>
                                <th style={{ padding: '6px 16px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semCourses.map((c, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < semCourses.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                  <td style={{ padding: '8px 16px', fontWeight: 600, color: '#1E293B' }}>{c.courseCode}</td>
                                  <td style={{ padding: '8px 16px', color: '#334155' }}>{c.courseTitle}</td>
                                  <td style={{ padding: '8px 16px', color: '#64748B' }}>{c.creditHours} Hrs</td>
                                  <td style={{ padding: '8px 16px', fontWeight: 700, color: c.grade === 'F' ? '#EF4444' : '#1E293B' }}>{c.grade}</td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      color: c.enrollmentStatus === 'completed' ? '#047857' : c.enrollmentStatus === 'failed' ? '#B91C1C' : '#1E40AF',
                                      backgroundColor: c.enrollmentStatus === 'completed' ? '#D1FAE5' : c.enrollmentStatus === 'failed' ? '#FEE2E2' : '#DBEAFE'
                                    }}>
                                      {c.enrollmentStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    });
                })()}
              </div>
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
