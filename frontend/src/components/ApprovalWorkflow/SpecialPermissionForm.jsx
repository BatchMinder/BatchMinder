import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function SpecialPermissionForm({ onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [justification, setJustification] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      setError('Please select a student first.');
      return;
    }
    if (!courseCode.trim() || !courseTitle.trim() || !justification.trim()) {
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
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
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
                    {selectedStudent.rollNumber} &bull; CGPA: {selectedStudent.cgpa.toFixed(2)}
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
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchQuery('');
                          setStudents([]);
                        }}
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
                          {s.rollNumber} &bull; CGPA: {s.cgpa.toFixed(2)} &bull; Semester: {s.currentSemester}
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

          {/* Course Details Grid */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              Course Title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineering"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
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
