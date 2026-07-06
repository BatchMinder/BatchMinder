import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, AlertTriangle, ShieldCheck, ShieldAlert, 
  Search, ChevronLeft, ChevronRight, BarChart2
} from 'lucide-react';

export default function AdvisorDashboard({ selectedBatch }) {
  const { user } = useAuth();
  
  // State
  const [stats, setStats] = useState({ total: 0, good: 0, warning: 0, critical: 0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const assignedBatches = user?.assignedBatchIds || [];
  const hasNoBatches = assignedBatches.length === 0;

  // Fetch Dashboard Stats
  const fetchSummary = async () => {
    if (hasNoBatches) return;
    try {
      const url = selectedBatch && selectedBatch !== 'all'
        ? `/api/advisor/dashboard-summary?batchId=${selectedBatch}`
        : '/api/advisor/dashboard-summary';
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    }
  };

  // Fetch Students List
  const fetchStudents = async () => {
    if (hasNoBatches) return;
    setStudentsLoading(true);
    try {
      let url = `/api/advisor/students?page=${page}&limit=10`;
      if (selectedBatch && selectedBatch !== 'all') {
        url += `&batchId=${selectedBatch}`;
      }
      if (statusFilter) {
        url += `&cgpaStatus=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStudents(data.data.students);
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error('Error fetching advisor students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedBatch]);

  useEffect(() => {
    fetchStudents();
  }, [selectedBatch, statusFilter, searchQuery, page]);

  // Reset page when switching filters
  useEffect(() => {
    setPage(1);
  }, [selectedBatch, statusFilter, searchQuery]);

  if (hasNoBatches) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center', backgroundColor: '#FFFFFF',
        borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
          No Batches Assigned
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
          Contact your Super Admin to get assigned to your academic batches.
        </p>
      </div>
    );
  }

  // Separate critical list for callouts (FR-3.4)
  const criticalStudents = students.filter(s => s.cgpaStatus === 'critical');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      
      {/* Overview Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Total Students Card */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '10px', backgroundColor: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={22} color="#2563EB" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Total Students</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#1E293B' }}>{stats.total}</h2>
          </div>
        </div>

        {/* Good Standing Card */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '10px', backgroundColor: '#ECFDF5',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={22} color="#10B981" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Good Standing</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{stats.good}</h2>
          </div>
        </div>

        {/* Warning Standing Card */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '10px', backgroundColor: '#FFFBEB',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={22} color="#F59E0B" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Warning Status</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>{stats.warning}</h2>
          </div>
        </div>

        {/* Critical Standing Card */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '10px', backgroundColor: '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldAlert size={22} color="#EF4444" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Critical Status</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>{stats.critical}</h2>
          </div>
        </div>
      </div>

      {/* Critical Students Alert Box (FR-3.4: Higher dashboard visibility) */}
      {stats.critical > 0 && (
        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: '#FFF1F2', border: '1px solid #FECDD3',
          display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#E11D48" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#9F1239' }}>
              Academic Standing Alert: {stats.critical} Critical Student(s) Detected
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#BE123C', lineHeight: '1.5' }}>
            These students have a CGPA under 2.0. Immediate academic advisory is required. You can search for their records below or visit the Student Profiles directory to evaluate performance details.
          </p>
        </div>
      )}

      {/* Student List and Table */}
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Table Filters Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
            Assigned Batch Students
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '13px', outline: 'none', width: '200px', transition: 'all 0.15s',
                  backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1',
                fontSize: '13px', outline: 'none', color: '#475569', cursor: 'pointer',
                backgroundColor: '#FFFFFF', fontFamily: 'inherit'
              }}
            >
              <option value="">All Standings</option>
              <option value="good">Good (&gt; 2.1)</option>
              <option value="warning">Warning (2.0 - 2.1)</option>
              <option value="critical">Critical (&lt; 2.0)</option>
            </select>
          </div>
        </div>

        {/* Table body */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Roll Number</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Student Name</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Semester</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>CGPA</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                students.map(s => {
                  const statusColors = {
                    good: { text: '#047857', bg: '#D1FAE5', label: 'Good' },
                    warning: { text: '#B45309', bg: '#FEF3C7', label: 'Warning' },
                    critical: { text: '#B91C1C', bg: '#FEE2E2', label: 'Critical' }
                  };
                  const config = statusColors[s.cgpaStatus] || { text: '#475569', bg: '#F1F5F9', label: s.cgpaStatus };

                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                        {s.rollNumber}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>
                        {s.batchId?.code || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>
                        {s.currentSemester}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                        {s.cgpa.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                          color: config.text, backgroundColor: config.bg,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              Showing page {page} of {totalPages} &bull; ({totalCount} total students)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '6px',
                  backgroundColor: '#FFFFFF', color: '#475569', fontSize: '12px', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', opacity: page === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '6px',
                  backgroundColor: '#FFFFFF', color: '#475569', fontSize: '12px', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', opacity: page === totalPages ? 0.5 : 1
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
