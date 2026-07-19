// AcademicSummary.jsx
// Individual view containing grade grid and CGPA history (FR-6.2)

import React, { useMemo } from 'react';
import CgpaTrendChart from '../../components/reporting/CgpaTrendChart';
import { downloadSingleTranscript } from '../../services/transcriptService';
import { Award, Download, Clock, FileText, ChevronRight, User } from 'lucide-react';

const gradePoints = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'F': 0.0
};

export default function AcademicSummary({ student }) {
  if (!student) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        No student profile selected. Select a student from the directory to view academic records.
      </div>
    );
  }

  const courses = student.courses || [];

  // Group courses by semester
  const semestersData = useMemo(() => {
    const semMap = {};
    courses.forEach(c => {
      const sem = c.semester || 1;
      if (!semMap[sem]) semMap[sem] = [];
      semMap[sem].push(c);
    });

    const sortedSemesters = Object.keys(semMap).sort((a, b) => Number(a) - Number(b));
    
    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    const result = sortedSemesters.map(sem => {
      const semCourses = semMap[sem];
      let semPoints = 0;
      let semCredits = 0;
      let completedCount = 0;
      let enrolledCount = 0;

      semCourses.forEach(c => {
        const cr = c.creditHours || c.credits || 3;
        if (c.grade && gradePoints[c.grade] !== undefined) {
          semPoints += cr * gradePoints[c.grade];
          semCredits += cr;
          completedCount++;
        } else {
          enrolledCount++;
        }
      });

      const sgpa = semCredits > 0 ? (semPoints / semCredits) : 0;
      
      cumulativePoints += semPoints;
      cumulativeCredits += semCredits;
      const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : 0;

      return {
        semesterNumber: sem,
        courses: semCourses,
        sgpa: sgpa.toFixed(2),
        cumulativeCgpa: cgpa.toFixed(2),
        completedCount,
        enrolledCount,
        credits: semCredits
      };
    });

    return result.reverse();
  }, [courses]);

  const totalCredits = useMemo(() => {
    return courses
      .filter(c => c.status === 'completed' || c.enrollmentStatus === 'completed')
      .reduce((sum, c) => sum + (c.creditHours || 3), 0);
  }, [courses]);

  const handlePrintTranscript = () => {
    downloadSingleTranscript(student._id || student.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      
      {/* Action Header Card */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px', backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)', gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
          }}>
            <User size={20} color="#2563EB" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{student.name}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              Roll Number: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{student.rollNumber || student.studentID}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintTranscript}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            border: 'none', borderRadius: '12px', backgroundColor: '#2563EB',
            color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
        >
          <Download size={14} /> Official Transcript PDF
        </button>
      </div>

      {/* Grid: Charts & Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5">
        
        {/* CGPA Trend Chart Card */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <Award size={16} color="#3b82f6" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Academic standing progression trend
            </h4>
          </div>
          <CgpaTrendChart courses={courses} currentCgpa={student.cgpa} />
        </div>

        {/* Quick Stats Panel */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <FileText size={16} color="#10b981" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CGPA standing summary
            </h4>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Cumulative CGPA', value: student.currentSemester === 1 ? 'N/A' : (student.cgpa || 0.00).toFixed(2), desc: 'Out of 4.00 max scaling', color: '#2563EB' },
              { label: 'Completed Credit Hours', value: `${totalCredits} CH`, desc: 'Of 130 minimum required', color: '#10B981' },
              { label: 'Academic Standing', value: student.currentSemester === 1 ? 'Good Standing' : (student.cgpa >= 2.0 ? 'Good Standing' : 'On Probation'), desc: 'Required limit >= 2.0', color: student.currentSemester === 1 || student.cgpa >= 2.0 ? '#10B981' : '#EF4444' }
            ].map((stat, i) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid #F1F5F9', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 850, color: stat.color }}>{stat.value}</span>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>{stat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Semester Grids List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '4px' }}>
          Semester academic course grids
        </h4>

        {semestersData.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
            No enrolled courses found on this student's profile records.
          </div>
        ) : (
          semestersData.map((sem) => (
            <div key={sem.semesterNumber} style={{
              backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
              overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
            }}>
              {/* Semester Subheader */}
              <div style={{
                padding: '12px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1B3A6B' }}>SEMESTER {sem.semesterNumber}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>({sem.courses.length} Course entries)</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    fontSize: '11.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                    backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE'
                  }}>
                    SGPA: {sem.sgpa}
                  </span>
                  <span style={{
                    fontSize: '11.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                    backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0'
                  }}>
                    CGPA: {sem.cumulativeCgpa}
                  </span>
                </div>
              </div>

              {/* Course details table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA' }}>
                      <th style={{ padding: '10px 20px', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Code</th>
                      <th style={{ padding: '10px 20px', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Course Title</th>
                      <th style={{ padding: '10px 20px', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Credit Hours</th>
                      <th style={{ padding: '10px 20px', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Grade</th>
                      <th style={{ padding: '10px 20px', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ divideY: '1px solid #F1F5F9' }}>
                    {sem.courses.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < sem.courses.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '10px 20px', fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>{c.courseCode}</td>
                        <td style={{ padding: '10px 20px', color: '#334155', fontWeight: 500 }}>{c.courseTitle}</td>
                        <td style={{ padding: '10px 20px', color: '#64748B', fontWeight: 600 }}>{c.creditHours || c.credits || 3} CH</td>
                        <td style={{ padding: '10px 20px', fontWeight: 800, color: c.grade === 'F' ? '#EF4444' : '#0F172A' }}>{c.grade || '—'}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            color: c.status === 'completed' || c.enrollmentStatus === 'completed' ? '#047857' : c.status === 'failed' || c.enrollmentStatus === 'failed' ? '#B91C1C' : '#1E40AF',
                            backgroundColor: c.status === 'completed' || c.enrollmentStatus === 'completed' ? '#D1FAE5' : c.status === 'failed' || c.enrollmentStatus === 'failed' ? '#FEE2E2' : '#DBEAFE'
                          }}>
                            {c.status || c.enrollmentStatus || 'enrolled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
