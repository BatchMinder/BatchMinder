// DegreeProgress.jsx
// Main view for completed vs. remaining requirements and missing core courses (FR-6.3)

import React, { useState, useEffect } from 'react';
import DegreeProgressBar from '../../components/reporting/DegreeProgressBar';
import { Layers, CheckCircle2, Clock, AlertTriangle, BookOpen, Search } from 'lucide-react';

export default function DegreeProgress({ student }) {
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'completed', 'enrolled', 'missing'
  const [searchQuery, setSearchQuery] = useState('');

  const batchId = student?.batchId?._id || student?.batchId;

  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!batchId) return;
      setLoading(true);
      try {
        let res = await fetch(`/api/curriculums/batch/${batchId}`);
        let data = await res.json();
        if (res.ok && data.status === 'success' && (data.data.curriculum || data.data)) {
          setCurriculum(data.data.curriculum || data.data);
        } else {
          // Fallback to HEC curriculum
          res = await fetch('/api/curriculums/hec');
          data = await res.json();
          if (res.ok && data.data) {
            setCurriculum(data.data.curriculum || data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch curriculum map:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, [batchId]);

  const studentCourses = student?.courses || [];

  // Parse curriculum courses
  const curriculumCourses = React.useMemo(() => {
    if (!curriculum) return [];
    
    // In curriculum, courses might be grouped in semesters or flat
    let list = [];
    if (Array.isArray(curriculum)) {
      curriculum.forEach(sem => {
        if (sem.courses) list = list.concat(sem.courses);
      });
    } else if (curriculum.courses) {
      list = curriculum.courses;
    }
    
    return list.map(c => {
      const code = c.code || c.courseCode || '';
      const type = c.type || (code.toLowerCase().includes('el') ? 'Elective' : code.toLowerCase().includes('ge') ? 'General Ed' : 'Core');
      return {
        courseCode: code,
        courseTitle: c.title || c.courseTitle || '',
        creditHours: c.creditHours || c.credits || 3,
        type
      };
    });
  }, [curriculum]);

  // Compute status mappings
  const analyzedCourses = React.useMemo(() => {
    // Merge student course records with curriculum records
    const studentCodes = studentCourses.reduce((acc, c) => {
      acc[c.courseCode] = c;
      return acc;
    }, {});

    const list = [];
    
    // 1. Process all curriculum courses
    curriculumCourses.forEach(cc => {
      const match = studentCodes[cc.courseCode];
      let status = 'missing';
      let grade = '—';
      let creditEarned = 0;

      if (match) {
        if (match.status === 'completed' || match.enrollmentStatus === 'completed') {
          status = 'completed';
          grade = match.grade || 'A';
          creditEarned = cc.creditHours;
        } else if (match.status === 'enrolled' || match.status === 'in_progress' || match.enrollmentStatus === 'enrolled') {
          status = 'enrolled';
          grade = 'IP';
        } else if (match.status === 'failed' || match.enrollmentStatus === 'failed') {
          status = 'failed';
          grade = 'F';
        }
      }

      list.push({
        ...cc,
        status,
        grade,
        creditEarned
      });
    });

    // 2. Add student courses that are not in the curriculum (e.g. transfer equivalents or extra electives)
    const curriCodes = new Set(curriculumCourses.map(cc => cc.courseCode));
    studentCourses.forEach(sc => {
      const scCode = sc.courseCode || '';
      if (!curriCodes.has(scCode)) {
        let status = 'enrolled';
        let creditEarned = 0;
        
        if (sc.status === 'completed' || sc.enrollmentStatus === 'completed') {
          status = 'completed';
          creditEarned = sc.creditHours || 3;
        } else if (sc.status === 'failed' || sc.enrollmentStatus === 'failed') {
          status = 'failed';
        }

        list.push({
          courseCode: scCode,
          courseTitle: sc.courseTitle || scCode,
          creditHours: sc.creditHours || 3,
          type: scCode.toLowerCase().includes('el') ? 'Elective' : 'Core',
          status,
          grade: sc.grade || '—',
          creditEarned
        });
      }
    });

    return list;
  }, [curriculumCourses, studentCourses]);

  // Totals calculations
  const totals = React.useMemo(() => {
    const core = { completed: 0, total: 0 };
    const electives = { completed: 0, total: 0 };
    const genEd = { completed: 0, total: 0 };
    let completed = 0;

    analyzedCourses.forEach(c => {
      const cr = Number(c.creditHours || 0);
      if (c.type === 'Core') {
        core.total += cr;
        if (c.status === 'completed') core.completed += cr;
      } else if (c.type === 'Elective') {
        electives.total += cr;
        if (c.status === 'completed') electives.completed += cr;
      } else {
        genEd.total += cr;
        if (c.status === 'completed') genEd.completed += cr;
      }

      if (c.status === 'completed') {
        completed += cr;
      }
    });

    return {
      completed,
      total: Math.max(130, core.total + electives.total + genEd.total),
      core,
      electives: { completed: electives.completed, total: Math.max(30, electives.total) },
      genEd: { completed: genEd.completed, total: Math.max(34, genEd.total) }
    };
  }, [analyzedCourses]);

  // Filtering logic
  const filteredCourses = React.useMemo(() => {
    return analyzedCourses.filter(c => {
      const matchSearch = (c.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterTab === 'all') return true;
      if (filterTab === 'completed') return c.status === 'completed';
      if (filterTab === 'enrolled') return c.status === 'enrolled';
      if (filterTab === 'missing') return c.status === 'missing' || c.status === 'failed';
      return true;
    });
  }, [analyzedCourses, filterTab, searchQuery]);

  const missingCoreCount = analyzedCourses.filter(c => c.status === 'missing' && c.type === 'Core').length;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading degree progress plan...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        No student profile selected. Select a student from the directory to review degree progress.
      </div>
    );
  }

  try {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
        
        {/* Degree Progress Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Progress Card left */}
          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
            padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <DegreeProgressBar
              completedCredits={totals.completed}
              totalCredits={totals.total}
              coreCompleted={totals.core.completed}
              coreTotal={totals.core.total}
              electivesCompleted={totals.electives.completed}
              electivesTotal={totals.electives.total}
              genEdCompleted={totals.genEd.completed}
              genEdTotal={totals.genEd.total}
              cgpaStatus={student.cgpaStatus || (student.cgpa >= 2.5 ? 'good' : student.cgpa >= 2.0 ? 'warning' : 'critical')}
            />
          </div>

          {/* Missing Core Alert Card right */}
          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <Layers size={16} color="#4F46E5" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Core Requirements Audit
              </h4>
            </div>

            {missingCoreCount > 0 ? (
              <div style={{
                display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px',
                backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', color: '#991B1B'
              }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '14px', display: 'block', fontWeight: 700 }}>Core Courses Missing ({missingCoreCount})</strong>
                  <span style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.4, display: 'block', marginTop: '2px' }}>
                    This student has not completed {missingCoreCount} mandatory core courses required by the department curriculum. Enrollment in these sessions should be prioritized.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px',
                backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5', color: '#065F46'
              }}>
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '14px', display: 'block', fontWeight: 700 }}>All Core Requirements Met!</strong>
                  <span style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4, display: 'block', marginTop: '2px' }}>
                    Student has successfully cleared or registered for all curriculum-defined core modules.
                  </span>
                </div>
              </div>
            )}

            {/* Mini missing list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '180px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Missing Core Modules Checklist
              </span>
              {analyzedCourses.filter(c => c.status === 'missing' && c.type === 'Core').length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>Zero missing core modules.</span>
              ) : (
                analyzedCourses.filter(c => c.status === 'missing' && c.type === 'Core').map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', border: '1px solid #F1F5F9', borderRadius: '8px',
                    backgroundColor: '#FAFAFA', fontSize: '12px'
                  }}>
                    <div>
                      <strong style={{ color: '#334155' }}>{c.courseCode}</strong>
                      <span style={{ color: '#64748B', marginLeft: '6px' }}>{c.courseTitle}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>{c.creditHours} CH</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Filter and Tab Section */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          
          {/* Controls block */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
            gap: '15px', borderBottom: '1px solid #F1F5F9', paddingBottom: '15px', marginBottom: '15px'
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'all', label: 'All Syllabus', count: analyzedCourses.length },
                { id: 'completed', label: 'Completed', count: analyzedCourses.filter(c => c.status === 'completed').length },
                { id: 'enrolled', label: 'In Progress', count: analyzedCourses.filter(c => c.status === 'enrolled').length },
                { id: 'missing', label: 'Missing / Failed', count: analyzedCourses.filter(c => c.status === 'missing' || c.status === 'failed').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 750,
                    backgroundColor: filterTab === tab.id ? '#EFF6FF' : '#ffffff',
                    color: filterTab === tab.id ? '#2563EB' : '#64748B',
                    border: filterTab === tab.id ? '1px solid rgba(37,99,235,0.25)' : '1px solid #E2E8F0',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                  <span style={{
                    fontSize: '10.5px', padding: '1px 6px', borderRadius: '6px',
                    backgroundColor: filterTab === tab.id ? '#2563EB' : '#F1F5F9',
                    color: filterTab === tab.id ? '#ffffff' : '#64748B',
                    fontWeight: 700
                  }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                placeholder="Search syllabus courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px',
                  border: '1px solid #E2E8F0', fontSize: '12.5px', outline: 'none',
                  color: '#334155', fontFamily: 'inherit'
                }}
              />
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px' }}>CODE</th>
                  <th style={{ padding: '12px' }}>COURSE TITLE</th>
                  <th style={{ padding: '12px' }}>CATEGORY</th>
                  <th style={{ padding: '12px' }}>CR. HRS</th>
                  <th style={{ padding: '12px' }}>GRADE</th>
                  <th style={{ padding: '12px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontWeight: 500 }}>
                      No courses found matching selection query filters.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>{c.courseCode}</td>
                      <td style={{ padding: '12px', color: '#334155', fontWeight: 500 }}>{c.courseTitle}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                          color: c.type === 'Core' ? '#2563EB' : c.type === 'Elective' ? '#7C3AED' : '#D97706',
                          backgroundColor: c.type === 'Core' ? '#EFF6FF' : c.type === 'Elective' ? '#F5F3FF' : '#FFFBEB'
                        }}>{c.type}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>{c.creditHours} CH</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: c.status === 'failed' ? '#EF4444' : '#0F172A' }}>{c.grade}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                          color: c.status === 'completed' ? '#047857' : c.status === 'enrolled' ? '#1E40AF' : c.status === 'failed' ? '#B91C1C' : '#475569',
                          backgroundColor: c.status === 'completed' ? '#D1FAE5' : c.status === 'enrolled' ? '#DBEAFE' : c.status === 'failed' ? '#FEE2E2' : '#F1F5F9'
                        }}>
                          {c.status === 'completed' && <CheckCircle2 size={10} />}
                          {c.status === 'enrolled' && <Clock size={10} />}
                          {c.status === 'missing' && <BookOpen size={10} />}
                          {c.status === 'failed' && <AlertTriangle size={10} />}
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (renderError) {
    console.error("DegreeProgress render error:", renderError);
    return (
      <div style={{ padding: '24px', border: '1px solid #FEE2E2', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#EF4444', margin: '20px' }}>
        <h4 style={{ margin: 0, fontWeight: 700 }}>Degree Progress Plan rendering failed:</h4>
        <p style={{ margin: '8px 0 0', fontSize: '12px', fontFamily: 'monospace' }}>{renderError.message}</p>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#7f1d1d' }}>Please check console logs for the full stack trace.</p>
      </div>
    );
  }
}
