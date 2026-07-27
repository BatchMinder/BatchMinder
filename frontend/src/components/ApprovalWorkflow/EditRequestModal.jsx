import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, ChevronDown } from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';

export default function EditRequestModal({ request, onClose, onSuccess, mode = 'hod' }) {
  const [studentName, setStudentName] = useState(request.studentId?.name || '');
  const [rollNumber, setRollNumber] = useState(request.studentId?.rollNumber || '');
  const [justification, setJustification] = useState(request.justification || '');

  const [courseCode, setCourseCode] = useState(request.courseCode || '');
  const [courseTitle, setCourseTitle] = useState(request.courseTitle || '');
  const [creditHours, setCreditHours] = useState(request.creditHours || 3);
  const [requestType, setRequestType] = useState(request.requestType || 'add');

  const [curriculumCourses, setCurriculumCourses] = useState([]);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const studentFieldsOk = mode === 'advisor' || (studentName.trim() && rollNumber.trim());
    if (!studentFieldsOk || !courseCode.trim() || !courseTitle.trim() || !creditHours) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const endpoint = mode === 'advisor'
        ? `/api/advisor/requests/${request._id}/resubmit`
        : `/api/hod/requests/${request._id}/edit`;

      const body = mode === 'advisor'
        ? {
          justification: justification.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          creditHours: Number(creditHours),
          requestType
        }
        : {
          studentName: studentName.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          justification: justification.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          creditHours: Number(creditHours),
          requestType
        };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccessMsg('Request updated successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(data.data.request);
        }, 1500);
      } else {
        setError(data.message || 'Failed to update request.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      padding: '16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          backgroundColor: '#FFFFFF',
          zIndex: 10
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            {mode === 'advisor' ? 'Revise & Resubmit Request' : 'Edit Request Details'}
          </h2>
          <button
            type="button"
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {mode !== 'advisor' && (
            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Student Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Roll Number</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Request Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                <option value="add">Add Course</option>
                <option value="drop">Drop Course</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="special_permission">Special Permission</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Credit Hours</label>
              <input
                type="number"
                min="1" max="6"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Course Selection</label>
            <button
              type="button"
              onClick={() => setShowCourseDropdown(!showCourseDropdown)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1',
                fontSize: '13.5px', outline: 'none', backgroundColor: '#FFFFFF', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                minWidth: 0
              }}
            >
              <span style={{
                fontWeight: courseCode ? 700 : 400,
                color: courseCode ? '#0F172A' : '#94A3B8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                paddingRight: '8px'
              }}>
                {courseCode ? `${courseCode} – ${courseTitle || courseCode}` : '-- Select Curriculum Course --'}
              </span>
              <ChevronDown size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
            </button>

            {showCourseDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px',
                borderRadius: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto'
              }}>
                {curriculumCourses.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>No courses found in curriculum</div>
                ) : (
                  curriculumCourses.map(c => {
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
                        style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{displayCode} – {displayTitle}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                          Semester {c.semester} &bull; {c.creditHours || 3} CH
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Manual Course Details (Optional Override)</label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '12px' }}>
              <input
                type="text"
                placeholder="Course Code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                required
              />
              <input
                type="text"
                placeholder="Course Title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Student Justification</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Enter student's justification for the request..."
              rows={3}
              style={{
                padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1',
                fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'inherit'
              }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || !!successMsg}
              style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!successMsg}
              style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}
            >
              {loading ? <CircularProgress size={16} color="inherit" /> : <Check size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}