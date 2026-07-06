import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Calendar, ArrowRight, BookOpen } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import StatusBadge from '../../components/ApprovalWorkflow/StatusBadge';
import RequestDetail from '../../components/ApprovalWorkflow/RequestDetail';

export default function RequestHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchHistory = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    try {
      const res = await fetch('/api/hod/history');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setHistory(data.data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch HOD request history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((r) => {
    const student = r.studentId || {};
    const matchesSearch =
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.courseCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'approved' && r.status === 'approved') ||
      (statusFilter === 'rejected' && r.status === 'rejected') ||
      (statusFilter === 'special_granted' && r.status === 'special_granted');

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header and Sync buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px' }}>
            Decision Records
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            Request Decision History
          </h2>
        </div>

        <button
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Sync History</span>
        </button>
      </div>

      {/* Main Table Card Layout */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Table Filters header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search student or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                width: '240px',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Decision Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#475569',
              backgroundColor: '#FFFFFF',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="special_granted">Special Granted</option>
          </select>
        </div>

        {/* Requests History Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Roll Number</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Student Name</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Course</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Decision Date</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Decision</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Remarks</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '50px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <CircularProgress size={24} />
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Loading decision history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '50px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={36} color="#94A3B8" />
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#475569' }}>No Decisions Found</h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#94A3B8' }}>No requests have been finalized by you yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((r) => {
                  const student = r.studentId || {};
                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {student.rollNumber || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>
                        {student.name || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{r.courseCode}</span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{r.courseTitle}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '2px 6px', borderRadius: '5px' }}>
                          {r.requestType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#94A3B8" />
                          <span>{r.decidedAt ? new Date(r.decidedAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '12.5px', color: '#64748B', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.hodRemarks}>
                        {r.hodRemarks || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No remarks</span>}
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedRequest(r)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                        >
                          <span>Details</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only Details Dialog */}
      {selectedRequest && (
        <RequestDetail
          request={selectedRequest}
          userRole="hod"
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
