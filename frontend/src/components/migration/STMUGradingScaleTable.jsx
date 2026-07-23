import React from 'react';

export const STMU_GRADING_SCALE = [
  { grade: 'A',  percentage: '85 - 100%', points: 4.0 },
  { grade: 'A-', percentage: '80 - 84%',  points: 3.7 },
  { grade: 'B+', percentage: '75 - 79%',  points: 3.3 },
  { grade: 'B',  percentage: '71 - 74%',  points: 3.0 },
  { grade: 'B-', percentage: '68 - 70%',  points: 2.7 },
  { grade: 'C+', percentage: '64 - 67%',  points: 2.3 },
  { grade: 'C',  percentage: '61 - 63%',  points: 2.0 },
  { grade: 'C-', percentage: '58 - 60%',  points: 1.7 },
  { grade: 'D',  percentage: '50 - 57%',  points: 1.0 },
  { grade: 'F',  percentage: 'Below 50%', points: 0.0 },
];

export default function STMUGradingScaleTable({ compact = false }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: compact ? '12px' : '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>
          Official STMU Grading System & Formula
        </h4>
        <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap', marginTop: '2px' }}>
          STMU Standard
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #F1F5F9', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '6px 8px' }}>Grade</th>
              <th style={{ padding: '6px 8px' }}>Percentage (typical)</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>GPA Points</th>
            </tr>
          </thead>
          <tbody>
            {STMU_GRADING_SCALE.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #F8FAFC', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <td style={{ padding: '6px 8px', fontWeight: 800, color: item.grade === 'F' ? '#EF4444' : '#0F172A' }}>{item.grade}</td>
                <td style={{ padding: '6px 8px', color: '#64748B' }}>{item.percentage}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>{item.points.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '10.5px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <strong style={{ color: '#0F172A' }}>STMU GPA Formula:</strong>{' '}
          <span style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
            CGPA = ∑(GPA Points × Credit Hours) / ∑(Credit Hours)
          </span>
        </div>
        <div>
          <strong style={{ color: '#0F172A' }}>Migrated Placement:</strong> Current Semester in STMU ={' '}
          <span style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
            floor(Transferred Credits / 16) + 1
          </span>
        </div>
      </div>
    </div>
  );
}
