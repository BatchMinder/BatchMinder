import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Check, Calendar, Info, ShieldAlert, RefreshCw, X
} from 'lucide-react';
import Header from './Header';

const SEVERITY_OPTIONS = ['All Severities', 'Critical', 'Warning', 'Info'];

const SEVERITY_STYLE = {
  Critical: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', icon: ShieldAlert },
  Warning:  { bg: '#FEF9C3', color: '#A16207', border: '#FDE68A', icon: AlertTriangle },
  Info:     { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: Info },
};

const toFeSeverity = (dbType) => {
  const map = {
    'info': 'Info',
    'warning': 'Warning',
    'critical': 'Critical'
  };
  return map[dbType] || 'Info';
};

const toDbType = (feSeverity) => {
  const map = {
    'Info': 'info',
    'Warning': 'warning',
    'Critical': 'critical'
  };
  return map[feSeverity] || 'info';
};

function Dropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 11px', borderRadius: '7px',
          border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
          fontSize: '12px', fontWeight: 500, color: '#374151',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
        }}
      >
        {value} <ChevronDown size={12} color="#94A3B8" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          marginTop: '4px', borderRadius: '9px',
          backgroundColor: '#fff', border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '150px', overflow: 'hidden'
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 13px',
                textAlign: 'left', fontSize: '12px',
                fontWeight: opt === value ? 600 : 400,
                color: opt === value ? '#2563EB' : '#374151',
                backgroundColor: opt === value ? '#EFF6FF' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit'
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage({ setActiveNav }) {
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search, setSearch]         = useState('');
  const [severityFilter, setSeverity] = useState('All Severities');
  const [selected, setSelected]     = useState([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentPage, setPage]      = useState(1);

  // Form State
  const [form, setForm] = useState({
    title: '',
    severity: 'Info',
    target: 'All Users',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        const mapped = data.data.map(n => ({
          id: n.id || n._id,
          title: n.title || n.message || 'Notification Alert',
          severity: toFeSeverity(n.type),
          target: n.target || (n.recipientRole ? `Role: ${n.recipientRole}${n.departmentId ? ` (${n.departmentId})` : ''}` : 'All Users'),
          time: n.createdAt || n.time ? new Date(n.createdAt || n.time).toLocaleTimeString() : '—',
          date: n.createdAt || n.time ? new Date(n.createdAt || n.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
          status: n.status || (n.isRead ? 'Read' : 'Unread')
        }));
        setAlerts(mapped);
      } else {
        setError(data.message || 'Failed to fetch logs.');
      }
    } catch (err) {
      setError('Connection failure: Unable to load notification logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.title) {
      setFormError('Alert Title is required.');
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          type: toDbType(form.severity),
          target: form.target
        })
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setFormSuccess('System broadcast sent successfully!');
        setForm({ title: '', severity: 'Info', target: 'All Users' });
        fetchNotifications();
      } else {
        setFormError(data.message || 'Broadcast failed.');
      }
    } catch (err) {
      setFormError('Failed to communicate with notification gateway.');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selected.length === 0) return;
    try {
      const response = await fetch('/api/notifications/bulk-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected })
      });
      if (response.ok) {
        setSelected([]);
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed bulk update:', err);
    }
  };

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const titleVal = a.title ? a.title.toLowerCase() : '';
    const targetVal = a.target ? a.target.toLowerCase() : '';
    return (
      (!q || titleVal.includes(q) || targetVal.includes(q)) &&
      (severityFilter === 'All Severities' || a.severity === severityFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const unreadAlerts = alerts.filter(a => a.status === 'Unread').length;

  const stats = [
    { label: 'Total Logs',      value: alerts.length, icon: Bell,           iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Unread Alerts',   value: unreadAlerts,  icon: AlertTriangle,  iconColor: '#7C3AED', iconBg: '#F5F3FF', highlight: unreadAlerts > 0 },
    { label: 'Critical Errors', value: alerts.filter(a => a.severity === 'Critical').length, icon: ShieldAlert,    iconColor: '#EF4444', iconBg: '#FEE2E2' },
    { label: 'System Warnings', value: alerts.filter(a => a.severity === 'Warning').length, icon: AlertTriangle,  iconColor: '#D97706', iconBg: '#FFFBEB' },
  ];

  const severitySplit = [
    { label: 'Critical Severity', count: alerts.filter(a => a.severity === 'Critical').length, color: '#EF4444' },
    { label: 'Warning Severity',  count: alerts.filter(a => a.severity === 'Warning').length, color: '#F59E0B' },
    { label: 'Info Severity',     count: alerts.filter(a => a.severity === 'Info').length, color: '#3B82F6' },
  ];

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '7px',
    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    backgroundColor: '#FFFFFF'
  };
  const selectStyle = { ...inputStyle, paddingRight: '28px', appearance: 'none', cursor: 'pointer' };
  const labelStyle  = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    color: '#94A3B8', letterSpacing: '0.7px',
    textTransform: 'uppercase', marginBottom: '4px'
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minWidth: 0, height: '100%', overflow: 'hidden',
      fontFamily: "'Inter','Liberation Sans',-apple-system,sans-serif"
    }}>

      <Header title="Notifications & Broadcasts" subtitle="BatchMinder ERP • Super Admin • Notifications" setActiveNav={setActiveNav} />

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '18px 24px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-[18px]">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '11px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '9px',
                  backgroundColor: s.iconBg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={17} color={s.iconColor} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: s.highlight ? '#EF4444' : '#0F172A', lineHeight: 1.1 }}>
                    {loading ? '...' : s.value}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-stretch flex-1">

          {/* ── Left Side: Logs Table ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '13px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>

            {/* Filter Bar */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '10px',
              backgroundColor: '#FAFAFA'
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notifications by title keywords or targets..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px',
                    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dropdown value={severityFilter} options={SEVERITY_OPTIONS} onChange={setSeverity} />
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/notifications/mark-all-read', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      if (response.ok) {
                        fetchNotifications();
                      }
                    } catch (err) {
                      console.error('Failed to mark all read:', err);
                    }
                  }}
                  style={{
                    padding: '7px 12px', borderRadius: '7px', border: '1px solid #CBD5E1',
                    backgroundColor: '#fff', color: '#374151', fontSize: '11px',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  Mark All Read
                </button>
                {selected.length > 0 && (
                  <button
                    onClick={handleBulkMarkRead}
                    style={{
                      padding: '7px 12px', borderRadius: '7px', border: 'none',
                      backgroundColor: '#1E293B', color: '#fff', fontSize: '11px',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Check size={11} /> Mark ({selected.length}) Read
                  </button>
                )}
              </div>
            </div>

            {/* Table or States */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Loading system logs...</span>
                </div>
              ) : error ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <AlertTriangle size={28} color="#EF4444" />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{error}</p>
                    <button
                      onClick={fetchNotifications}
                      style={{
                        marginTop: '10px', padding: '6px 14px', borderRadius: '6px',
                        border: 'none', backgroundColor: '#2563EB', color: '#fff',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#94A3B8' }}>
                  <Bell size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>No alerts logged.</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ width: '34px', padding: '9px 13px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </th>
                      {['SEVERITY','NOTIFICATION MESSAGE','TARGET TARGET','TIMESTAMP','STATUS'].map(col => (
                        <th key={col} style={{
                          padding: '9px 10px', textAlign: 'left',
                          fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                          letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage-1)*12, currentPage*12).map((a, i) => {
                      const isSel = selected.includes(a.id);
                      const ss = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.Info;
                      const Icon = ss.icon;
                      return (
                        <tr
                          key={a.id}
                          onDoubleClick={() => handleMarkAsRead(a.id)}
                          style={{
                            borderTop: '1px solid #F1F5F9',
                            backgroundColor: isSel ? '#EFF6FF' : (a.status === 'Unread' ? 'rgba(37,99,235,0.02)' : '#FFFFFF'),
                            cursor: 'pointer',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = a.status === 'Unread' ? 'rgba(37,99,235,0.02)' : '#FFFFFF'; }}
                        >
                          <td style={{ padding: '9px 13px' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleRow(a.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '2px 8px', borderRadius: '5px',
                              backgroundColor: ss.bg, border: `1px solid ${ss.border}`,
                              color: ss.color, fontSize: '10px', fontWeight: 700,
                              width: 'fit-content', textTransform: 'uppercase'
                            }}>
                              <Icon size={10} />
                              {a.severity}
                            </div>
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '12px', fontWeight: a.status === 'Unread' ? 700 : 500, color: '#1E293B' }}>
                            {a.title}
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '11.5px', color: '#475569' }}>
                            {a.target}
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {a.date}
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              padding: '2px 7px', borderRadius: '10px',
                              fontSize: '9.5px', fontWeight: 800,
                              backgroundColor: a.status === 'Read' ? '#F1F5F9' : '#FEF2F2',
                              color: a.status === 'Read' ? '#64748B' : '#EF4444',
                              border: a.status === 'Read' ? '1px solid #E2E8F0' : '1px solid #FCA5A5'
                            }}>{a.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              padding: '11px 16px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Showing {filtered.length === 0 ? 0 : (currentPage-1)*12 + 1}–{Math.min(currentPage*12, filtered.length)} of {filtered.length} logs
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'inherit' }}>←</button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)} style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: '1px solid',
                    borderColor: currentPage===n ? '#2563EB' : '#E2E8F0',
                    backgroundColor: currentPage===n ? '#2563EB' : '#fff',
                    color: currentPage===n ? '#fff' : '#374151',
                    fontSize: '11px', fontWeight: currentPage===n ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'inherit' }}>→</button>
              </div>
            </div>
          </div>

          {/* ── Right panel: Broadcast Alert Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>

            {/* Broadcast Form */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={13} color="#2563EB" /> System-wide Broadcast
              </h3>

              {formError && (
                <div style={{
                  padding: '8px 10px', marginBottom: '12px', borderRadius: '6px',
                  backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5',
                  color: '#B91C1C', fontSize: '11px', fontWeight: 600
                }}>
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div style={{
                  padding: '8px 10px', marginBottom: '12px', borderRadius: '6px',
                  backgroundColor: '#DCFCE7', border: '1px solid #86EFAC',
                  color: '#15803D', fontSize: '11px', fontWeight: 600
                }}>
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div>
                  <label style={labelStyle}>Alert Title / Heading</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Critical security update applied..."
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Severity Level</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.severity}
                      onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                      style={selectStyle}
                    >
                      {SEVERITY_OPTIONS.slice(1).map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Broadcast Recipient Target</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.target}
                      onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="All Users">All Users</option>
                      <option value="Advisors">Batch Advisors</option>
                      <option value="HODs">HODs / Chairpersons</option>
                      <option value="Admins">Administrators</option>
                      <option value="Super Admin">Super Admins Only</option>
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', marginTop: '6px', padding: '9px',
                    borderRadius: '8px', border: 'none',
                    backgroundColor: '#EF4444', color: '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
                >
                  <Bell size={13} /> Broadcast Alert
                </button>
              </form>
            </div>

            {/* Severity Distribution */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                Logs Severity Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1, overflowY: 'auto' }}>
                {severitySplit.map((r, i) => {
                  const pct = alerts.length > 0 ? (r.count / alerts.length) * 100 : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{r.label}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>{r.count} / {alerts.length}</span>
                      </div>
                      <div style={{ height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          backgroundColor: r.color,
                          width: `${pct}%`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
