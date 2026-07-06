// src/components/intelligentScheduling/ScheduleCell.jsx
import React from 'react';
import RoomCapacityBadge from './RoomCapacityBadge';
import { User, MapPin, Clock } from 'lucide-react';

export default function ScheduleCell({ slot, onEditClick }) {
    if (!slot) return null;

    return (
        <div
            onClick={() => onEditClick?.(slot)}
            style={{
                backgroundColor: slot.hasConflict ? '#FFF5F5' : '#F8FAFC',
                border: `1px solid ${slot.hasConflict ? '#FCA5A5' : '#E2E8F0'}`,
                borderLeft: `4px solid ${slot.hasConflict ? '#EF4444' : '#1B3A6B'}`,
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {slot.timeSlot}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#E2E8F0', padding: '2px 4px', borderRadius: 4, color: '#334155' }}>{slot.batch}</span>
            </div>
            <h4 style={{ margin: '4px 0', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {slot.courseCode}: {slot.courseName}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6, fontSize: 12, color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {slot.instructor}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> Room: {slot.room}</div>
            </div>
            <RoomCapacityBadge studentCount={slot.studentCount} roomCapacity={slot.roomCapacity} />
        </div>
    );
}