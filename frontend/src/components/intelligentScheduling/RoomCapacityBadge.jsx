// src/components/intelligentScheduling/RoomCapacityBadge.jsx
import React from 'react';

export default function RoomCapacityBadge({ studentCount = 0, roomCapacity = 0 }) {
    const isOverCapacity = studentCount > roomCapacity;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: isOverCapacity ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${isOverCapacity ? '#FEE2E2' : '#DCFCE7'}`,
            color: isOverCapacity ? '#991B1B' : '#166534'
        }}>
            <span style={{
                height: 6,
                width: 6,
                borderRadius: '50%',
                backgroundColor: isOverCapacity ? '#EF4444' : '#22C55E'
            }} />
            <span>Cap: {studentCount} / {roomCapacity}</span>
            {isOverCapacity && (
                <span style={{ backgroundColor: '#EF4444', color: '#FFF', fontSize: 9, padding: '1px 4px', borderRadius: 4, fontWeight: 800 }}>
                    OVERFLOW
                </span>
            )}
        </div>
    );
}