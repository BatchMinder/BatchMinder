import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDepartments } from '../../hooks/useDepartments';
import {
  Calendar, Clock, Shield, Search, RefreshCw, BarChart2,
  ChevronDown, AlertTriangle, User, Layers, Info, X
} from 'lucide-react';
import Header from './Header';

// Pretty-print metadata changes or general key-values
const renderMetadataDetails = (meta, fallbackDescription = '') => {
  const metaObj = meta || {};
  const description = fallbackDescription || metaObj.description;
  const rest = { ...metaObj };
  delete rest.description;

  if (!description && Object.keys(rest).length === 0) {
    return <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>No additional metadata.</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {description && (
        <div style={{
          padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
          borderRadius: '8px', fontStyle: 'italic', fontSize: '12px', color: '#334155'
        }}>
          "{description}"
        </div>
      )}
      {Object.keys(rest).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Technical Payload</span>
          <pre style={{
            margin: 0, padding: '10px 14px', backgroundColor: '#0F172A',
            color: '#38BDF8', borderRadius: '8px', fontSize: '11px',
            overflowX: 'auto', fontFamily: 'monospace', lineHeight: '1.4'
          }}>
            {JSON.stringify(rest, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default function AuditLogsPage({ setActiveNav }) {
  const { user } = useAuth();
  const { departments } = useDepartments();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Filters
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [batchFilter, setBatchFilter] = useState('All Batches');
  const [batches, setBatches] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const itemsPerPage = 25;

  // Load batches for dropdown filter (SuperAdmin only)
  const fetchBatches = async () => {
    if (user?.role !== 'super_admin') return;
    try {
      const response = await fetch('/api/batches');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setBatches(data.data);
      }
    } catch (err) {
      console.error('Failed to retrieve batch filters:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/audit-logs';
      const params = new URLSearchParams();

      if (user?.role === 'super_admin') {
        if (deptFilter !== 'All Departments') {
          params.append('departmentId', deptFilter);
        }
        if (batchFilter !== 'All Batches') {
          params.append('batchId', batchFilter);
        }
      }

      if (actionFilter) {
        params.append('action', actionFilter);
      }
      if (startDateFilter) {
        params.append('startDate', startDateFilter);
      }
      if (endDateFilter) {
        params.append('endDate', endDateFilter);
      }

      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const queryStr = params.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setLogs(data.data.logs || []);
        setTotalLogs(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.message || 'Failed to retrieve system logs.');
      }
    } catch (err) {
      setError('Connection failure: Unable to communicate with logging server.');
    } finally {
      setLoading(false);
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, deptFilter, batchFilter, actionFilter, startDateFilter, endDateFilter]);

  const currentLogs = logs;
  const isSuperAdmin = user?.role === 'super_admin';

  // Styling helper
  const cellStyle = { padding: '10px 14px', fontSize: '12px', color: '#334155' };

  return (
    <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      <Header
        title="System Audit Logs"
        subtitle={isSuperAdmin ? 'BatchMinder ERP • Dean • Audit Logs' : 'BatchMinder ERP • Audit Logs'}
        setActiveNav={setActiveNav}
      >
        <button
          onClick={fetchLogs}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px', border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF', fontSize: '11px', fontWeight: 700, color: '#374151',
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </Header>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: isMobile ? '12px 16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

        {/* Filters Panel */}
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '12px', padding: isMobile ? '10px 14px' : '14px 20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div
            onClick={() => isMobile && setShowFiltersMobile(!showFiltersMobile)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isMobile ? 'pointer' : 'default',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Filters:
              </span>
              {isMobile && (
                <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>
                  ({showFiltersMobile ? 'Tap to hide' : 'Tap to show & edit'})
                </span>
              )}
            </div>
            {isMobile && (
              <ChevronDown
                size={14}
                color="#64748B"
                style={{
                  transform: showFiltersMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            )}
          </div>

          {(!isMobile || showFiltersMobile) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '16px',
              borderTop: isMobile ? '1px solid #F1F5F9' : 'none',
              paddingTop: isMobile ? '12px' : 0
            }}>

          {isSuperAdmin && (
            <>
              {/* Department Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>Department:</span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={deptFilter}
                    onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                    style={{
                      padding: '5px 24px 5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                      fontSize: '11.5px', fontWeight: 600, color: '#1E293B', outline: 'none',
                      backgroundColor: '#FAFAFA', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <option value="All Departments">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Batch Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>Batch:</span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={batchFilter}
                    onChange={e => { setBatchFilter(e.target.value); setCurrentPage(1); }}
                    style={{
                      padding: '5px 24px 5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                      fontSize: '11.5px', fontWeight: 600, color: '#1E293B', outline: 'none',
                      backgroundColor: '#FAFAFA', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <option value="All Batches">All Batches</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.code}>{b.code}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            </>
          )}

          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>Action:</span>
            <div style={{ position: 'relative' }}>
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '5px 24px 5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  fontSize: '11.5px', fontWeight: 600, color: '#1E293B', outline: 'none',
                  backgroundColor: '#FAFAFA', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                <option value="">All Actions</option>
                <option value="STUDENT_CREATED">Student Created</option>
                <option value="STUDENT_UPDATED">Student Updated</option>
                <option value="STUDENT_DELETED">Student Deleted</option>
                <option value="UPLOAD_VALIDATED">CSV Upload Validated</option>
                <option value="UPLOAD_IMPORTED">CSV Upload Imported</option>
                <option value="CURRICULUM_UPDATED">Curriculum Updated</option>
                <option value="MIGRATION_CREATED">Migration Created</option>
                <option value="MIGRATION_DECIDED">Migration Decided</option>
                <option value="BATCH_CREATED">Batch Created</option>
                <option value="BATCH_UPDATED">Batch Updated</option>
                <option value="PROFILE_UPDATED">Profile Updated</option>
                <option value="PROFILE_PICTURE_UPLOADED">Profile Picture Uploaded</option>
                <option value="PROFILE_PICTURE_DELETED">Profile Picture Deleted</option>
              </select>
              <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Date Range Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>Start Date:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                fontSize: '11.5px', color: '#1E293B', outline: 'none',
                backgroundColor: '#FAFAFA', fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>End Date:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                fontSize: '11.5px', color: '#1E293B', outline: 'none',
                backgroundColor: '#FAFAFA', fontFamily: 'inherit'
              }}
            />
          </div>
            </div>
          )}
        </div>

        {/* Table Box */}
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: 0
        }}>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                <RefreshCw size={24} color="#2563EB" className="animate-spin" />
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Retrieving system events...</span>
              </div>
            ) : error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', padding: '20px' }}>
                <AlertTriangle size={24} color="#EF4444" />
                <span style={{ fontSize: '12.5px', color: '#EF4444', fontWeight: 600, textAlign: 'center' }}>{error}</span>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                <Info size={24} color="#94A3B8" />
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>No audit logs recorded for this scope.</span>
              </div>
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                {currentLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString('en-US', {
                    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                  });
                  const actorName = log.actorId?.name || log.userId?.name || log.userEmail || log.metadata?.email || 'System';
                  const actionLabel = log.action || 'EVENT';
                  const rColors = {
                    'super_admin': { bg: '#FEE2E2', color: '#991B1B' },
                    'academic_admin': { bg: '#D1FAE5', color: '#065F46' },
                    'admin': { bg: '#F5F3FF', color: '#5B21B6' },
                    'advisor': { bg: '#EFF6FF', color: '#1E40AF' }
                  };
                  const roleStyle = rColors[log.actorRole] || { bg: '#F1F5F9', color: '#334155' };

                  return (
                    <div
                      key={log._id}
                      onClick={() => setSelectedAudit(log)}
                      className="hover:bg-slate-50 transition-colors"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {actionLabel}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={10} />
                          {dateStr}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>{actorName}</span>
                        <span style={{
                          padding: '1px 4px', borderRadius: '3px',
                          fontSize: '8px', fontWeight: 800,
                          backgroundColor: roleStyle.bg, color: roleStyle.color,
                          textTransform: 'uppercase'
                        }}>
                          {log.actorRole || 'System'}
                        </span>
                      </div>

                      {(log.description || log.metadata?.description) && (
                        <p style={{ margin: 0, fontSize: '11px', color: '#475569', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          "{log.description || log.metadata?.description}"
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          Target: <span style={{ fontWeight: 600, color: '#334155' }}>{log.targetType || 'Global'}</span>
                        </span>
                        <span style={{ fontSize: '9.5px', color: '#2563EB', fontWeight: 700 }}>Details →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actor</th>
                    <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                    <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                    <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log, index) => {
                    const dateStr = new Date(log.timestamp).toLocaleString('en-US', {
                      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    const actorName = log.actorId?.name || log.userId?.name || log.userEmail || log.metadata?.email || 'System';
                    const actorEmail = log.actorId?.email || log.userId?.email || log.userEmail || (log.actorId ? '' : log.metadata?.email) || '';
                    const actionLabel = log.action || 'EVENT';

                    // role colors
                    const rColors = {
                      'super_admin': { bg: '#FEE2E2', color: '#991B1B' },
                      'academic_admin': { bg: '#D1FAE5', color: '#065F46' },
                      'admin': { bg: '#F5F3FF', color: '#5B21B6' },
                      'advisor': { bg: '#EFF6FF', color: '#1E40AF' }
                    };
                    const roleStyle = rColors[log.actorRole] || { bg: '#F1F5F9', color: '#334155' };

                    return (
                      <tr
                        key={log._id}
                        onClick={() => setSelectedAudit(log)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                            <Clock size={11} />
                            {dateStr}
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: '#1E293B' }}>{actorName}</p>
                            {actorEmail && <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>{actorEmail}</p>}
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '5px',
                            fontSize: '9.5px', fontWeight: 800,
                            backgroundColor: roleStyle.bg, color: roleStyle.color,
                            textTransform: 'uppercase', letterSpacing: '0.3px'
                          }}>
                            {log.actorRole || 'System'}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '#1E293B',
                            fontSize: '11px', fontWeight: 700,
                            color: '#1E293B'
                          }}>
                            {actionLabel}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <div style={{ maxWidth: '420px', wordBreak: 'break-all' }}>
                            <span style={{ fontWeight: 600, color: '#475569' }}>
                              {log.targetType || 'Global'}
                            </span>
                            {log.targetId && (
                              <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>
                                (ID: {log.targetId})
                              </span>
                            )}
                            {(log.description || log.metadata?.description) && (
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                                "{log.description || log.metadata.description}"
                              </p>
                            )}
                            {(log.departmentId || log.batchId) && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                {log.departmentId && <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 5px', borderRadius: '4px' }}>Dept: {log.departmentId}</span>}
                                {log.batchId && <span style={{ fontSize: '9px', fontWeight: 700, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '1px 5px', borderRadius: '4px' }}>Batch: {log.batchId}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && totalLogs > 0 && (
            <div style={{
              padding: '11px 16px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '12px'
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalLogs)} of {totalLogs} logs
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0',
                    backgroundColor: currentPage === 1 ? '#FAFAFA' : '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px', color: currentPage === 1 ? '#CBD5E1' : '#64748B', fontFamily: 'inherit'
                  }}
                >
                  ←
                </button>
                {(() => {
                  const buttons = [];
                  const maxVisible = 5;
                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) buttons.push(i);
                  } else {
                    buttons.push(1);
                    let start = Math.max(2, currentPage - 1);
                    let end = Math.min(totalPages - 1, currentPage + 1);
                    if (currentPage <= 2) end = 3;
                    if (currentPage >= totalPages - 1) start = totalPages - 2;
                    if (start > 2) buttons.push('...');
                    for (let i = start; i <= end; i++) buttons.push(i);
                    if (end < totalPages - 1) buttons.push('...');
                    buttons.push(totalPages);
                  }
                  return buttons.map((n, idx) => {
                    if (n === '...') {
                      return <span key={`ellipsis-${idx}`} style={{ fontSize: '11px', color: '#94A3B8', padding: '0 4px' }}>...</span>;
                    }
                    return (
                      <button
                        key={n}
                        onClick={() => setCurrentPage(n)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: '1px solid',
                          borderColor: currentPage === n ? '#2563EB' : '#E2E8F0',
                          backgroundColor: currentPage === n ? '#2563EB' : '#fff',
                          color: currentPage === n ? '#fff' : '#374151',
                          fontSize: '11px', fontWeight: currentPage === n ? 700 : 400,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        {n}
                      </button>
                    );
                  });
                })()}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0',
                    backgroundColor: currentPage === totalPages ? '#FAFAFA' : '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '12px', color: currentPage === totalPages ? '#CBD5E1' : '#64748B', fontFamily: 'inherit'
                  }}
                >
                  →
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Modal Dialog */}
      {selectedAudit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, transition: 'all 0.2s'
        }}
          onClick={() => setSelectedAudit(null)}
        >
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '20px', padding: '24px', maxWidth: '580px',
            width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px',
            fontFamily: 'inherit'
          }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Audit Log Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                style={{
                  border: 'none', backgroundColor: '#F1F5F9', color: '#64748B',
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Action */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action Triggered</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 750, color: '#1E293B' }}>{selectedAudit.action}</p>
                </div>
                {/* Timestamp */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Execution Time</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                    {new Date(selectedAudit.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                {/* Actor Info */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Triggered By</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                    {selectedAudit.actorId?.name || selectedAudit.metadata?.email || 'System'}
                  </p>
                  {(selectedAudit.actorId?.email || selectedAudit.metadata?.email) && (
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      {selectedAudit.actorId?.email || selectedAudit.metadata?.email}
                    </p>
                  )}
                </div>
                {/* Actor Role */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actor Role</span>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '5px',
                      fontSize: '10px', fontWeight: 800,
                      backgroundColor: selectedAudit.actorRole === 'super_admin' ? '#FEE2E2' : selectedAudit.actorRole === 'academic_admin' ? '#D1FAE5' : selectedAudit.actorRole === 'admin' ? '#F5F3FF' : '#EFF6FF',
                      color: selectedAudit.actorRole === 'super_admin' ? '#991B1B' : selectedAudit.actorRole === 'academic_admin' ? '#065F46' : selectedAudit.actorRole === 'admin' ? '#5B21B6' : '#1E40AF',
                      textTransform: 'uppercase', letterSpacing: '0.3px'
                    }}>
                      {selectedAudit.actorRole || 'System'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                {/* Target */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Subject</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {selectedAudit.targetType || 'Global Settings'}
                    {selectedAudit.targetId && (
                      <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>(ID: {selectedAudit.targetId})</span>
                    )}
                  </p>
                </div>
                {/* Scopes */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entity Scopes</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {selectedAudit.departmentId ? (
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                        Dept: {selectedAudit.departmentId}
                      </span>
                    ) : (
                      <span style={{ fontSize: '9.5px', color: '#94A3B8', fontStyle: 'italic' }}>No Scope</span>
                    )}
                    {selectedAudit.batchId && (
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '2px 6px', borderRadius: '4px' }}>
                        Batch: {selectedAudit.batchId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Details */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detailed Metadata Logs</span>
                {renderMetadataDetails(selectedAudit.metadata, selectedAudit.description)}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAudit(null)}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF', color: '#374151', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
