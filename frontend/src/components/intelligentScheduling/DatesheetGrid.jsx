// src/components/intelligentScheduling/DatesheetGrid.jsx
import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function DatesheetGrid({ exams = [] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {exams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13, backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                    No examination blocks scheduled in the active framework array.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {exams.map((exam) => (
                        <div key={exam.id} style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1B3A6B' }}>
                                    <Calendar size={14} /> <span>{exam.date} ({exam.day})</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: 5 }}>
                                    {exam.id}
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{exam.courseCode}: {exam.courseName}</h4>
                            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#64748B' }}>Target Batch: {exam.batch}</p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: 6, color: '#475569' }}>
                                    <Clock size={12} /> <span>{exam.session}</span>
                                </div>
                                <div style={{ fontSize: 11, backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: 6, color: '#475569 font-medium' }}>
                                    🏛 Hall: <b>{exam.room}</b>
                                </div>
                                <div style={{ fontSize: 11, backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: 6, color: '#475569' }}>
                                    👁 Staff: {exam.invigilator}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}