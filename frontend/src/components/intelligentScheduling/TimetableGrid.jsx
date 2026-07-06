// src/components/intelligentScheduling/TimetableGrid.jsx
import React from 'react';
import ScheduleCell from './ScheduleCell';

export default function TimetableGrid({ slots = [], onSlotEdit }) {
    const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
            {WEEKDAYS.map((day) => {
                const slotsForDay = slots.filter(s => s.day.toLowerCase() === day.toLowerCase());

                return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
                        <div style={{ backgroundColor: '#1B3A6B', padding: '10px 14px', borderRadius: 8, textAlign: 'center', shadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF', tracking: '0.05em' }}>{day}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300, backgroundColor: '#F8FAFC/40', border: '1px dashed #E2E8F0', borderRadius: 10, padding: 8 }}>
                            {slotsForDay.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 120, color: '#94A3B8', fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                                    No classes scheduled
                                </div>
                            ) : (
                                slotsForDay.map(slot => (
                                    <ScheduleCell key={slot.id} slot={slot} onEditClick={onSlotEdit} />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}