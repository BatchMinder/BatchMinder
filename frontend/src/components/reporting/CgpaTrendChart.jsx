// CgpaTrendChart.jsx
// Renders CGPA history lines using Recharts (FR-6.2)

import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const gradePoints = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'F': 0.0
};

export default function CgpaTrendChart({ courses = [], currentCgpa }) {
  const chartData = useMemo(() => {
    if (!courses || courses.length === 0) return [];

    // Group courses by semester
    const semesters = {};
    courses.forEach(c => {
      const sem = c.semester || 1;
      if (!semesters[sem]) semesters[sem] = [];
      semesters[sem].push(c);
    });

    const sortedSemesters = Object.keys(semesters).sort((a, b) => Number(a) - Number(b));

    let cumulativePoints = 0;
    let cumulativeCredits = 0;
    const history = [];

    sortedSemesters.forEach(sem => {
      const semCourses = semesters[sem];
      let semPoints = 0;
      let semCredits = 0;
      let hasGraded = false;

      semCourses.forEach(c => {
        const cr = c.creditHours || c.credits || 3;
        if (c.grade && gradePoints[c.grade] !== undefined) {
          semPoints += cr * gradePoints[c.grade];
          semCredits += cr;
          hasGraded = true;
        }
      });

      const sgpa = hasGraded && semCredits > 0 ? (semPoints / semCredits) : null;
      
      // Update cumulative values
      cumulativePoints += semPoints;
      cumulativeCredits += semCredits;
      const cgpa = cumulativeCredits > 0 ? parseFloat((cumulativePoints / cumulativeCredits).toFixed(2)) : 0.0;

      history.push({
        name: `Semester ${sem}`,
        SGPA: sgpa ? parseFloat(sgpa.toFixed(2)) : null,
        CGPA: cgpa,
      });
    });

    // If there is only 1 semester, mock a starting point so the line has length
    if (history.length === 1) {
      return [
        { name: 'Enrollment', SGPA: 0.0, CGPA: 0.0 },
        ...history
      ];
    }

    return history;
  }, [courses]);

  // Custom tooltips with premium typography and glassmorphic look
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px 14px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          color: '#f8fafc',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#94a3b8' }}>{label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {payload.map((item, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: item.name === 'CGPA' ? '#3b82f6' : '#10b981',
                  display: 'inline-block'
                }} />
                <span style={{ fontWeight: 500 }}>{item.name}:</span>
                <strong style={{ fontSize: '13px', color: item.name === 'CGPA' ? '#60a5fa' : '#34d399' }}>
                  {item.value !== null ? item.value.toFixed(2) : 'N/A'}
                </strong>
              </span>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div style={{
        height: '240px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#94A3B8', fontSize: '13px', fontStyle: 'italic'
      }}>
        No CGPA trend history available.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '240px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
          <defs>
            <linearGradient id="cgpaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sgpaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
            dy={8}
          />
          <YAxis
            domain={[0.0, 4.0]}
            tickCount={5}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference line for probation warning at 2.0 */}
          <ReferenceLine
            y={2.0}
            stroke="#EF4444"
            strokeDasharray="4 4"
            label={{
              value: 'Probation Line (2.00)',
              fill: '#EF4444',
              fontSize: 9,
              fontWeight: 700,
              position: 'top'
            }}
          />

          <Line
            type="monotone"
            dataKey="SGPA"
            name="SGPA"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, strokeWidth: 1, fill: '#ffffff' }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="CGPA"
            name="CGPA"
            stroke="#2563EB"
            strokeWidth={3.5}
            dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }}
            activeDot={{ r: 7, stroke: '#2563EB', strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
