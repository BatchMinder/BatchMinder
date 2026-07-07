// src/components/intelligentScheduling/ConflictPanel.jsx
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ConflictPanel({ slots = [] }) {
    const activeConflicts = slots.filter(slot => slot.hasConflict);

    if (activeConflicts.length === 0) {
        return (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>Schedule Integrity Verified</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803D' }}>Zero overlapping matrices, faculty clashes, or space capacity violations detected.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <AlertTriangle size={20} color="#D97706" />
                <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400E' }}>System Scheduling Anomalies ({activeConflicts.length})</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B45309' }}>The calculation engine flagged structural conflicts violating active constraints.</p>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #FCD34D', paddingTop: 12 }}>
                {activeConflicts.map((conflict, idx) => (
                    <div key={conflict.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #FEF3C7' }}>
                        <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', display: 'block', textTransform: 'uppercase' }}>
                                {conflict.conflictType === 'CAPACITY_VIOLATION' ? '⚠️ Capacity Overflow' : '⚠️ Double Booking'}
                            </span>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>{conflict.conflictDetails}</p>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#78350F', backgroundColor: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                            {conflict.room} | {conflict.timeSlot}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}