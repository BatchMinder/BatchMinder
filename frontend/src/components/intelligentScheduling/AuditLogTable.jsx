// src/components/intelligentScheduling/AuditLogTable.jsx
import React from 'react';

export default function AuditLogTable({ logs = [] }) {
    return (
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Timestamp</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Action</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Logged Detail Parameters</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Operator</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>No override mutations logged.</td>
                        </tr>
                    ) : (
                        logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                        {log.actionType}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>{log.details}</td>
                                <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>{log.user}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}