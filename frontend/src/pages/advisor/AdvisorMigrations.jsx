import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Search, X, Download, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';

// Uploaded transcripts/decision sheets are stored as full Cloudinary URLs
// (e.g. https://res.cloudinary.com/...). Only prefix with the API host for
// legacy records that still hold an old relative local-disk path — mirrors
// the same helper in admin/MigrationRecords.jsx so downloads work here too.
const resolveDocUrl = (url) => {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `http://localhost:5000${url}`;
};

// Read-only migration review for Batch Advisors. Per the Design Document's
// GUI description for the Migration & Credit Transfer Management Interface:
// "Advisors and administrators can review accepted/rejected courses and
// monitor updated degree progress after migration processing." Advisors
// cannot create, edit, or decide on migration requests — that stays with
// the department admin — this page is purely for review/monitoring.
export default function AdvisorMigrations({ selectedBatch }) {
    const [migrations, setMigrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selected, setSelected] = useState(null);

    const fetchMigrations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/migrations');
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setMigrations(data.data.migrations || []);
            }
        } catch (err) {
            console.error('Failed to fetch migrations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMigrations(); }, []);

    const filtered = migrations.filter(m => {
        if (selectedBatch && selectedBatch !== 'all') {
            const batchId = m.studentId?.batchId?._id || m.studentId?.batchId;
            if (batchId !== selectedBatch) return false;
        }
        if (statusFilter && m.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const name = (m.studentId?.name || '').toLowerCase();
            const roll = (m.studentId?.rollNumber || '').toLowerCase();
            if (!name.includes(q) && !roll.includes(q)) return false;
        }
        return true;
    });

    const statusBadge = (status) => {
        const map = {
            approved: { bg: '#D1FAE5', color: '#059669', icon: CheckCircle, label: 'Approved' },
            rejected: { bg: '#FEE2E2', color: '#DC2626', icon: XCircle, label: 'Rejected' },
            returned: { bg: '#FFFBEB', color: '#D97706', icon: Clock, label: 'Returned' },
            pending: { bg: '#FFFBEB', color: '#D97706', icon: Clock, label: 'Pending' },
        };
        const s = map[status] || map.pending;
        const Icon = s.icon;
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, backgroundColor: s.bg, color: s.color }}>
                <Icon size={11} /> {s.label}
            </span>
        );
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowRightLeft size={20} /> Migration Records
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                        Review migrated students in your batch(es) — accepted/rejected courses, credit loss, and degree progress. Decisions are made by department admins; this view is read-only.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by student name or roll number..."
                        style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                    />
                </div>
                <ResponsiveSelect
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    options={[
                        { value: '', label: 'All Statuses' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'returned', label: 'Returned' }
                    ]}
                />
            </div>

            {/* List */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Loading migration records...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>No migration records found for your batch(es).</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                                <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: 11 }}>STUDENT</th>
                                <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: 11 }}>SOURCE INSTITUTION</th>
                                <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: 11 }}>STATUS</th>
                                <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: 11, textAlign: 'right' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(m => (
                                <tr key={m._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{m.studentId?.name || 'Unknown'}</div>
                                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{m.studentId?.rollNumber}</div>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#475569' }}>{m.sourceInstitution}</td>
                                    <td style={{ padding: '10px 16px' }}>{statusBadge(m.status)}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => setSelected(m)}
                                            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Read-only detail modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, backgroundColor: '#F8FAFC', zIndex: 1 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{selected.studentId?.name}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>{selected.studentId?.rollNumber} • From {selected.sourceInstitution}</p>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {statusBadge(selected.status)}
                                {selected.transcriptUrl && (
                                    <a
                                        href={resolveDocUrl(selected.transcriptUrl)}
                                        download={selected.transcriptOriginalName || 'transcript.pdf'}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                        <Download size={11} /> Transcript
                                    </a>
                                )}
                                {selected.decisionSheetUrl && (
                                    <a
                                        href={resolveDocUrl(selected.decisionSheetUrl)}
                                        download={selected.decisionSheetOriginalName || 'decision-sheet.pdf'}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, backgroundColor: '#F0FDF4', color: '#059669', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                        <Download size={11} /> Decision Sheet
                                    </a>
                                )}
                            </div>

                            {/* Course equivalency breakdown */}
                            <div>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Course Equivalency Decisions</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, textAlign: 'left' }}>
                                            <th style={{ padding: '6px 8px' }}>COURSE</th>
                                            <th style={{ padding: '6px 8px' }}>CH</th>
                                            <th style={{ padding: '6px 8px' }}>DECISION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selected.transferredCourses || []).map((c, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                <td style={{ padding: '6px 8px', color: '#0F172A' }}>
                                                    {c.courseName}
                                                    {c.decisionRemark && <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginTop: 2 }}>"{c.decisionRemark}"</div>}
                                                </td>
                                                <td style={{ padding: '6px 8px', color: '#64748B' }}>{c.credits}</td>
                                                <td style={{ padding: '6px 8px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                                        backgroundColor: c.equivalencyStatus === 'accepted' ? '#D1FAE5' : (c.equivalencyStatus === 'rejected' ? '#FEE2E2' : '#FFFBEB'),
                                                        color: c.equivalencyStatus === 'accepted' ? '#059669' : (c.equivalencyStatus === 'rejected' ? '#DC2626' : '#D97706')
                                                    }}>
                                                        {c.equivalencyStatus === 'rejected' ? 'CREDIT LOSS' : c.equivalencyStatus.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Backlog / degree progress */}
                            {selected.status === 'approved' && (
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Backlog / Make-up Requirements</h4>
                                    {(selected.missingCourses || []).length === 0 ? (
                                        <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, margin: 0 }}>No backlog — all earlier-semester core requirements satisfied.</p>
                                    ) : (
                                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569' }}>
                                            {selected.missingCourses.map((mc, i) => (
                                                <li key={i}>{mc.courseCode} — {mc.courseTitle} ({mc.creditHours} CH) — scheduled into next semester</li>
                                            ))}
                                        </ul>
                                    )}

                                    {selected.curriculumComparison && (
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '12px' }}>
                                            <div><span style={{ color: '#64748B' }}>Placed Semester: </span><strong style={{ color: '#2563EB' }}>{selected.studentId?.currentSemester || '—'}</strong></div>
                                            <div><span style={{ color: '#64748B' }}>Required: </span><strong>{selected.curriculumComparison.toRequiredCredits}</strong></div>
                                            <div><span style={{ color: '#64748B' }}>Completed: </span><strong style={{ color: '#10B981' }}>{selected.curriculumComparison.toCompletedCredits}</strong></div>
                                            <div><span style={{ color: '#64748B' }}>Remaining: </span><strong style={{ color: '#F59E0B' }}>{selected.curriculumComparison.toRemainingCredits}</strong></div>
                                            <div><span style={{ color: '#64748B' }}>Credit Loss: </span><strong style={{ color: '#EF4444' }}>{(selected.transferredCourses || []).filter(c => c.equivalencyStatus === 'rejected').reduce((s, c) => s + (c.credits || 0), 0)}</strong></div>
                                            <div><span style={{ color: '#64748B' }}>Expected Completion: </span><strong>{selected.curriculumComparison.expectedCompletion || '—'}</strong></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}