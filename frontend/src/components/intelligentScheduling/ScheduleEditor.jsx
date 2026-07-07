// src/components/intelligentScheduling/ScheduleEditor.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ScheduleEditor({ slot, isOpen, onClose, onSave }) {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [selectedInstructor, setSelectedInstructor] = useState('');

    useEffect(() => {
        if (slot) {
            setSelectedRoom(slot.room);
            setSelectedInstructor(slot.instructor);
        }
    }, [slot]);

    if (!isOpen || !slot) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave?.({
            ...slot,
            room: selectedRoom,
            instructor: selectedInstructor
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: 16, maxWidth: 440, width: '90%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Manual Schedule Override</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Modifying slot: {slot.id}</p>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 8, color: '#334155' }}>
                        <strong>Course:</strong> {slot.courseCode} — {slot.courseName}<br />
                        <strong>Timeline:</strong> {slot.day}, {slot.timeSlot}<br />
                        <strong>Batch Strength:</strong> {slot.studentCount} Enrolled Students
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Reassign Room Location</label>
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, backgroundColor: '#FFF' }}
                        >
                            <option value="Room 102">Room 102 (Cap: 50 Seats)</option>
                            <option value="Room 204">Room 204 (Cap: 60 Seats)</option>
                            <option value="Lab 3 (Block B)">Lab 3 (Block B) (Cap: 50 Seats)</option>
                            <option value="Main Auditorium">Main Auditorium (Cap: 150 Seats)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Reassign Assigned Faculty Member</label>
                        <select
                            value={selectedInstructor}
                            onChange={(e) => setSelectedInstructor(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, backgroundColor: '#FFF' }}
                        >
                            <option value="Dr. Arshad Ali">Dr. Arshad Ali</option>
                            <option value="Dr. Naseer Ahmed">Dr. Naseer Ahmed</option>
                            <option value="Prof. Tehmima Ismail">Prof. Tehmima Ismail</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#1B3A6B', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            Commit System Override
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}