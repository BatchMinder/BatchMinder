// DegreeProgressBar.jsx
// Circular/linear visual completion graph (FR-6.3)

import React from 'react';

export default function DegreeProgressBar({ 
  completedCredits = 0, 
  totalCredits = 130, 
  coreCompleted = 0, 
  coreTotal = 66,
  electivesCompleted = 0,
  electivesTotal = 30,
  genEdCompleted = 0,
  genEdTotal = 34,
  cgpaStatus = 'good' 
}) {
  const percentage = Math.min(100, Math.round((completedCredits / totalCredits) * 100));

  // Determine dynamic color systems
  const getStatusColor = () => {
    if (cgpaStatus === 'critical') return { stroke: '#EF4444', bg: 'bg-red-50', text: 'text-red-600' };
    if (cgpaStatus === 'warning') return { stroke: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' };
    return { stroke: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600' };
  };

  const statusColor = getStatusColor();
  
  // Radial SVG math
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const categories = [
    { name: 'Core Curriculum', completed: coreCompleted, total: coreTotal, color: '#3b82f6' },
    { name: 'Elective Specialization', completed: electivesCompleted, total: electivesTotal, color: '#a855f7' },
    { name: 'General Education Requirements', completed: genEdCompleted, total: genEdTotal, color: '#f59e0b' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Circle + Big Counter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '10px 0' }}>
        
        {/* Radial Circular SVG */}
        <div style={{ position: 'relative', width: '140px', height: '140px' }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            {/* Background track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {/* Active track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke={statusColor.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '26px', fontWeight: 850, color: '#0F172A', lineHeight: 1 }}>{percentage}%</span>
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Done</span>
          </div>
        </div>

        {/* Info Grid next to Circle */}
        <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Academic Completion Status
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#1E293B' }}>
              {completedCredits} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>/ {totalCredits} Credit Hours</span>
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
              backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE'
            }}>
              {totalCredits - completedCredits} CH Remaining
            </div>
            <div style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
              backgroundColor: statusColor.stroke + '1A', color: statusColor.stroke, border: `1px solid ${statusColor.stroke}4D`
            }}>
              Standing: {cgpaStatus.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Categorized Linear Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Degree Syllabus Breakdown
        </h4>
        
        {categories.map((cat, idx) => {
          const catPct = Math.min(100, Math.round((cat.completed / cat.total) * 100));
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>{cat.name}</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  {cat.completed} / {cat.total} CH <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>({catPct}%)</span>
                </span>
              </div>
              <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${catPct}%`, height: '100%', backgroundColor: cat.color,
                  borderRadius: '4px', transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
