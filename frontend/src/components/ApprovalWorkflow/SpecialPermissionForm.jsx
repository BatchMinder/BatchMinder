import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import ResponsiveSelect from '../common/ResponsiveSelect';

export default function SpecialPermissionForm({ onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [batches, setBatches] = useState([]);
  const [curriculumCourses, setCurriculumCourses] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);

  const [requestType, setRequestType] = useState('add');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [justification, setJustification] = useState('');
  const [remarks, setRemarks] = useState('');

  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingStudentCourses, setLoadingStudentCourses] = useState(false);

  // Fetch Batches and HEC Curriculum on Mount
  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data) {
          setBatches(d.data);
          if (d.data.length > 0) setSelectedBatch(d.data[0].code || d.data[0]._id);
        }
      })
      .catch(err => console.error('Error fetching batches:', err));

    fetch('/api/curriculums/hec')
      .then(r => r.json())
      .then(d => {
        const curr = d.data?.curriculum || d.data;
        if (curr && curr.courses) {
          setCurriculumCourses(curr.courses);
        }
      })
      .catch(err => console.error('Error fetching curriculum courses:', err));
  }, []);

  // Fetch student's enrolled courses when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setEnrolledCourses([]);
      return;
    }
    const fetchCourses = async () => {
      setLoadingStudentCourses(true);
      try {
        const res = await fetch(`/api/advisor/students/${selectedStudent._id}/eligible-courses`);
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setEnrolledCourses(data.data.enrolledCourses || []);
        } else {
          setEnrolledCourses(selectedStudent.courses || []);
        }
      } catch (err) {
        setEnrolledCourses(selectedStudent.courses || []);
      } finally {
        setLoadingStudentCourses(false);
      }
    };
    fetchCourses();
  }, [selectedStudent]);

  // Filter courses by request type and selected semester
  const filteredCourses = useMemo(() => {
    if (requestType === 'drop' || requestType === 'withdrawal') {
      const active = (enrolledCourses || []).filter(c =>
        c.status === 'enrolled' || c.enrollmentStatus === 'enrolled' || c.grade === 'IP' || c.semester === selectedStudent?.currentSemester
      );
      return active.length > 0 ? active : (enrolledCourses || []);
    }
    if (!curriculumCourses || curriculumCourses.length === 0) return [];
    const semCourses = curriculumCourses.filter(c => c.semester === Number(selectedSemester));
    return semCourses.length > 0 ? semCourses : curriculumCourses;
  }, [curriculumCourses, selectedSemester, requestType, enrolledCourses, selectedStudent]);

  // Fetch students based on search query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setStudents([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setStudents(data.data.students || []);
        }
      } catch (err) {
        console.error('Failed to search students:', err);
      } finally {
        setSearchingStudents(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Auto-sync batch & semester when student is selected
  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setSearchQuery('');
    setStudents([]);
    if (s.batchId?.code) setSelectedBatch(s.batchId.code);
    if (s.currentSemester) setSelectedSemester(s.currentSemester);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      setError('Please select a student first.');
      return;
    }
    if (!courseCode.trim() || !justification.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/hod/special-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent._id,
          requestType: requestType,
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim() || courseCode.trim().toUpperCase(),
          creditHours: Number(creditHours),
          justification: justification.trim(),
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        if (onSuccess) onSuccess(data.data.request);
        onClose();
      } else {
        setError(data.message || 'Failed to submit special permission.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '550px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Grant Special Permission
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Directly authorize course registration bypassing advisor approvals
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: '#F8FAFC',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Student Search & Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              1. Search Student <span style={{ color: '#EF4444' }}>*</span>
            </label>

            {selectedStudent ? (
              <div className="flex flex-col gap-2">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '12px',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#065F46' }}>
                      {selectedStudent.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#047857' }}>
                      {selectedStudent.rollNumber} &bull; CGPA: {selectedStudent.currentSemester === 1 ? 'N/A' : selectedStudent.cgpa.toFixed(2)} &bull; Sem: {selectedStudent.currentSemester}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#065F46',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Change
                  </button>
                </div>

                {/* Live Credit Hour Meter & Fulfillment Indicator */}
                {(() => {
                  const activeEnrolled = (enrolledCourses || []).filter(c =>
                    c.status === 'enrolled' || c.enrollmentStatus === 'enrolled' || c.grade === 'IP' || c.semester === selectedStudent.currentSemester
                  );
                  const currentEnrolled = activeEnrolled.reduce((sum, c) => sum + (c.creditHours || 3), 0);
                  const maxLimit = selectedStudent.cgpa >= 3.5 ? 21 : (selectedStudent.cgpa < 2.0 && selectedStudent.currentSemester > 1) ? 12 : 18;
                  const addedCH = requestType === 'add' ? (creditHours || 0) : -(creditHours || 0);
                  const projectedCH = Math.max(0, currentEnrolled + (courseCode ? addedCH : 0));
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
                        <span>Enrolled: <b>{currentEnrolled} CH</b> {courseCode && <span>({addedCH > 0 ? `+${addedCH}` : addedCH} CH = <b>{projectedCH} CH</b>)</span>}</span>
                        <span>Max Allowed: <b>{maxLimit} CH</b></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Type Student Name or Roll Number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  {searchingStudents && (
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                      <CircularProgress size={14} />
                    </div>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchQuery.trim().length >= 2 && students.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      marginTop: '4px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      maxHeight: '160px',
                      overflowY: 'auto',
                    }}
                  >
                    {students.map((s) => (
                      <div
                        key={s._id}
                        onClick={() => handleSelectStudent(s)}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{s.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>
                          {s.rollNumber} &bull; CGPA: {s.currentSemester === 1 ? 'N/A' : s.cgpa.toFixed(2)} &bull; Semester: {s.currentSemester}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length >= 2 && students.length === 0 && !searchingStudents && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      marginTop: '4px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      padding: '12px',
                      fontSize: '12.5px',
                      color: '#64748B',
                      textAlign: 'center',
                    }}
                  >
                    No matching students found
                  </div>
                )}
              </>
            )}
          </div>

          {/* Batch & Semester Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                Batch <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <ResponsiveSelect
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full"
                options={batches.length > 0 ? batches.map(b => ({ value: b.code, label: b.code })) : [{ value: 'BSCS-2024', label: 'BSCS-2024' }]}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                Target Semester <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <ResponsiveSelect
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full"
                options={[1, 2, 3, 4, 5, 6, 7, 8].map(sem => ({ value: sem, label: `Semester ${sem}` }))}
              />
            </div>
          </div>

          {/* Request Type Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              Request Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <ResponsiveSelect
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full"
              options={[
                { value: 'add', label: 'Course Registration (Add)' },
                { value: 'drop', label: 'Course Drop' },
                { value: 'withdrawal', label: 'Course Withdrawal' }
              ]}
            />
          </div>

          {/* HEC Course Dropdown Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              Choose HEC Subject / Course <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <span style={{ fontWeight: courseCode ? 700 : 400, color: courseCode ? '#0F172A' : '#94A3B8' }}>
                  {courseCode ? `${courseCode} – ${courseTitle || courseCode} (${creditHours} CH)` : '-- Select HEC Course --'}
                </span>
                <ChevronDown size={15} color="#94A3B8" />
              </button>

              {showCourseDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '4px',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {filteredCourses.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>No courses found</div>
                  ) : (
                    filteredCourses.map(c => {
                      const displayCode = c.code || c.courseCode;
                      const displayTitle = c.title || c.courseTitle;
                      return (
                        <div
                          key={displayCode || c._id}
                          onClick={() => {
                            setCourseCode(displayCode);
                            setCourseTitle(displayTitle);
                            setCreditHours(c.creditHours || 3);
                            setShowCourseDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        >
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{displayCode} – {displayTitle}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                            Semester {c.semester || selectedSemester} &bull; {c.creditHours || 3} Credit Hours
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Course Details Grid (Auto-Filled or Editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                Course Code <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CS302"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                Credit Hours <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={creditHours}
                onChange={(e) => setCreditHours(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value={1}>1 Credit Hour</option>
                <option value={2}>2 Credit Hours</option>
                <option value={3}>3 Credit Hours</option>
                <option value={4}>4 Credit Hours</option>
              </select>
            </div>
          </div>

          {/* Justification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              Justification / Reason <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              placeholder="Provide a detailed justification for granting this registration bypass..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              required
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Remarks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              HOD Official Remarks / Comments
            </label>
            <textarea
              placeholder="Enter official HOD decision remarks (optional)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Triggers */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '18px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
            >
              {loading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Check size={15} />
              )}
              <span>Grant Permission</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}