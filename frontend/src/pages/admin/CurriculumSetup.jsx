import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Save, Trash2, AlertTriangle } from 'lucide-react';
import Select from 'react-select';

// Helper to generate a 24-character hexadecimal MongoDB ObjectId
const generateId = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  return timestamp + 'x'.repeat(16).replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16));
};

export default function CurriculumSetup() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setBatches(d.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBatch) { setCurriculum(null); setCourses([]); return; }
    setLoading(true);
    fetch(`/api/curriculum/batch/${selectedBatch}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data?.curriculum) {
          const curr = d.data.curriculum;
          setCurriculum(curr);
          
          // Map backend subdocuments to frontend editable format
          const formatted = (curr.courses || []).map(c => {
            const prereqCodes = (c.prerequisiteCourseIds || []).map(pid => {
              const match = curr.courses.find(x => x._id === pid);
              return match ? match.code : null;
            }).filter(Boolean);

            return {
              _id: c._id,
              code: c.code,
              title: c.title,
              creditHours: c.creditHours,
              semester: c.semester,
              prerequisites: prereqCodes
            };
          });
          setCourses(formatted);
        } else {
          setCurriculum(null);
          setCourses([]);
        }
      })
      .catch(() => {
        setCurriculum(null);
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }, [selectedBatch]);

  const addCourse = () => {
    setCourses(c => [...c, {
      _id: generateId(),
      code: '',
      title: '',
      creditHours: 3,
      semester: 1,
      prerequisites: []
    }]);
  };

  const removeCourse = (i) => {
    setCourses(c => c.filter((_, idx) => idx !== i));
  };

  const updateCourse = (i, field, value) => {
    setCourses(c => c.map((course, idx) => idx === i ? { ...course, [field]: value } : course));
  };

  const totalCredits = courses.reduce((sum, c) => sum + (Number(c.creditHours) || 0), 0);

  const validate = () => {
    const errs = {};
    const codes = courses.map(c => c.code.trim().toUpperCase()).filter(Boolean);
    const duplicateCodes = codes.filter((code, i) => codes.indexOf(code) !== i);
    if (duplicateCodes.length > 0) errs.duplicateCodes = duplicateCodes;

    // Check credits per semester
    const semesterCreditMap = {};
    courses.forEach((c) => {
      const sem = c.semester || 1;
      semesterCreditMap[sem] = (semesterCreditMap[sem] || 0) + (Number(c.creditHours) || 0);
    });

    Object.entries(semesterCreditMap).forEach(([sem, val]) => {
      if (val > 21) {
        errs[`creditOverflow_sem_${sem}`] = `Semester ${sem} total credits (${val}) exceeds maximum 21`;
      }
    });

    courses.forEach((c, i) => {
      if (!c.code.trim()) errs[`code_${i}`] = 'Required';
      if (!c.title.trim()) errs[`title_${i}`] = 'Required';
      if (!c.creditHours || c.creditHours < 1 || c.creditHours > 6) errs[`creditHours_${i}`] = 'Range 1-6';
      if (!c.semester || c.semester < 1 || c.semester > 12) errs[`semester_${i}`] = 'Range 1-12';
      
      (c.prerequisites || []).forEach(p => {
        if (!codes.includes(p.trim().toUpperCase())) {
          errs[`prereq_${i}`] = `Prerequisite "${p}" not found in current course list`;
        }
      });
    });
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSuccess(false);

    const batch = batches.find(b => b._id === selectedBatch);
    const departmentId = batch?.departmentId?._id || batch?.departmentId;

    if (!departmentId) {
      alert('Could not resolve department for this batch.');
      setSaving(false);
      return;
    }

    // Map frontend codes back to subdocument ObjectIds
    const processedCourses = courses.map(c => ({
      _id: c._id || generateId(),
      code: c.code.toUpperCase().trim(),
      title: c.title.trim(),
      creditHours: Number(c.creditHours),
      semester: Number(c.semester || 1),
      prerequisites: c.prerequisites
    }));

    processedCourses.forEach(c => {
      c.prerequisiteCourseIds = (c.prerequisites || []).map(code => {
        const match = processedCourses.find(pc => pc.code.toUpperCase() === code.toUpperCase());
        return match ? match._id : null;
      }).filter(Boolean);
    });

    try {
      const res = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch,
          departmentId,
          version: curriculum?.version || '1.0',
          courses: processedCourses
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        
        // Refresh curriculum data
        if (data.data?.curriculum) {
          setCurriculum(data.data.curriculum);
        }
      } else {
        alert(data.message || 'Save failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const batchOpts = batches.map(b => ({ value: b._id, label: `${b.code} (${b.dept || 'N/A'})` }));

  return (
    <div>

      {success && (
        <div style={{ padding: 12, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#166534' }}>
          <Save size={16} /> Curriculum saved successfully.
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Select Batch</label>
          <Select
            options={batchOpts}
            value={batchOpts.find(o => o.value === selectedBatch) || null}
            onChange={o => setSelectedBatch(o?.value || null)}
            placeholder="Search batches..."
            isClearable
            styles={{
              control: (base) => ({ ...base, borderRadius: 8, borderColor: '#E2E8F0', minHeight: 40 }),
            }}
          />
        </div>

        {selectedBatch && loading && <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 13 }}>Loading curriculum...</div>}

        {selectedBatch && !loading && (
          <>
            {/* Credit Summary */}
            <div style={{
              padding: 16, borderRadius: 8, marginBottom: 20,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total Degree Credit Hours</span>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{totalCredits}</span>
                  <span style={{ fontSize: 13, color: '#94A3B8', marginLeft: 4 }}>CH Total</span>
                </div>
              </div>

              {Object.keys(errors).some(k => k.startsWith('creditOverflow_sem_')) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {Object.entries(errors).filter(([k]) => k.startsWith('creditOverflow_sem_')).map(([k, val]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#EF4444' }}>
                      <AlertTriangle size={14} /> {val}
                    </div>
                  ))}
                </div>
              )}
              {errors.duplicateCodes?.length > 0 && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Duplicate course codes: {errors.duplicateCodes.join(', ')}</div>
              )}
            </div>

            {/* Courses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {courses.map((course, i) => (
                <div key={course._id || i} style={{
                  padding: 16, borderRadius: 8, border: '1px solid #E2E8F0',
                  backgroundColor: errors[`code_${i}`] || errors[`title_${i}`] || errors[`semester_${i}`] ? '#FFF1F2' : '#FAFAFA'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1.5fr 1.2fr auto', gap: 12, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code</label>
                      <input
                        value={course.code}
                        onChange={e => updateCourse(i, 'code', e.target.value)}
                        placeholder="e.g. CS-401"
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${errors[`code_${i}`] ? '#EF4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course Name</label>
                      <input
                        value={course.title}
                        onChange={e => updateCourse(i, 'title', e.target.value)}
                        placeholder="e.g. Data Structures"
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${errors[`title_${i}`] ? '#EF4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credits</label>
                      <input
                        type="number"
                        value={course.creditHours}
                        onChange={e => updateCourse(i, 'creditHours', Number(e.target.value))}
                        min={1}
                        max={6}
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${errors[`creditHours_${i}`] ? '#EF4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</label>
                      <input
                        type="number"
                        value={course.semester}
                        onChange={e => updateCourse(i, 'semester', Number(e.target.value))}
                        min={1}
                        max={12}
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${errors[`semester_${i}`] ? '#EF4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <button onClick={() => removeCourse(i)} style={{ alignSelf: 'flex-end', padding: '6px 10px', borderRadius: 6, border: '1px solid #FECACA', backgroundColor: '#FFF1F2', cursor: 'pointer', color: '#EF4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prerequisites (comma-separated course codes)</label>
                    <input
                      value={course.prerequisites.join(', ')}
                      onChange={e => updateCourse(i, 'prerequisites', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. CS-301, CS-302"
                      style={{ width: '100%', padding: '6px 10px', border: `1px solid ${errors[`prereq_${i}`] ? '#EF4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                    />
                    {errors[`prereq_${i}`] && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{errors[`prereq_${i}`]}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={addCourse} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#fff',
                color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}>
                <Plus size={14} /> Add Course
              </button>
              <button onClick={handleSave} disabled={saving || courses.length === 0} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 24px',
                borderRadius: 8, border: 'none', backgroundColor: '#0F172A',
                color: '#fff', fontWeight: 600, fontSize: 13, cursor: saving || courses.length === 0 ? 'not-allowed' : 'pointer',
                opacity: saving || courses.length === 0 ? 0.5 : 1
              }}>
                <Save size={14} /> {saving ? 'Saving...' : curriculum ? 'Update Curriculum' : 'Create Curriculum'}
              </button>
            </div>

            {/* Existing Curriculum Preview */}
            {curriculum && curriculum._id && (
              <div style={{ marginTop: 24, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, color: '#64748B' }}>
                <strong>Last updated:</strong> {new Date(curriculum.createdAt).toLocaleString()} | <strong>Version:</strong> {curriculum.version}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
