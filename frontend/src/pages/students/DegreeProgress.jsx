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
        const res = await fetch(`/api/curriculums/batch/${batchId}`);
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          // If response wraps multiple semesters, average/combine them
          setCurriculum(data.data.curriculum || data.data);
        }
      } catch (err) {
        console.error('Failed to fetch curriculum map:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, [batchId]);

  if (!student) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        No student profile selected. Select a student from the directory to review degree progress.
      </div>
    );
  }

  const studentCourses = student.courses || [];

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
    
    return list.map(c => ({
      courseCode: c.code || c.courseCode,
      courseTitle: c.title || c.courseTitle,
      creditHours: c.creditHours || c.credits || 3,
      type: c.type || (c.code?.toLowerCase().includes('el') ? 'Elective' : c.code?.toLowerCase().includes('ge') ? 'General Ed' : 'Core')
    }));
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
      if (!curriCodes.has(sc.courseCode)) {
        let status = 'enrolled';
        let creditEarned = 0;
        
        if (sc.status === 'completed' || sc.enrollmentStatus === 'completed') {
          status = 'completed';
          creditEarned = sc.creditHours || 3;
        } else if (sc.status === 'failed' || sc.enrollmentStatus === 'failed') {
          status = 'failed';
        }

        list.push({
          courseCode: sc.courseCode,
          courseTitle: sc.courseTitle || sc.courseCode,
          creditHours: sc.creditHours || 3,
          type: sc.courseCode.toLowerCase().includes('el') ? 'Elective' : 'Core',
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
      const cr = c.creditHours;
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
      const matchSearch = c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterTab === 'all') return true;
      if (filterTab === 'completed') return c.status === 'completed';
      if (filterTab === 'enrolled') return c.status === 'enrolled';
      if (filterTab === 'missing') return c.status === 'missing' || c.status === 'failed';
      return true;
    });
  }, [analyzedCourses, filterTab, searchQuery]);

  const missingCoreCount = analyzedCourses.filter(c => c.status === 'missing' && c.type === 'Core').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      
      {/* Degree Progress Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">
        
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
                  padding: '6px 12px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: filterTab === tab.id ? '#EFF6FF' : 'transparent',
                  color: filterTab === tab.id ? '#2563EB' : '#64748B',
                  transition: 'all 0.15s'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: '20px', fontSize: '10px',
                  backgroundColor: filterTab === tab.id ? '#DBEAFE' : '#F1F5F9',
                  color: filterTab === tab.id ? '#1E40AF' : '#64748B'
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <span style={{ position: 'absolute', insetY: 0, left: 0, paddingLeft: '10px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#94A3B8' }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search syllabus courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #E2E8F0',
                borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Catalog Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px 12px' }}>Code</th>
                <th style={{ padding: '8px 12px' }}>Course Title</th>
                <th style={{ padding: '8px 12px' }}>Category</th>
                <th style={{ padding: '8px 12px' }}>Cr. Hrs</th>
                <th style={{ padding: '8px 12px' }}>Grade</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Loading curriculum progress...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                    No matching course records found.
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
}
