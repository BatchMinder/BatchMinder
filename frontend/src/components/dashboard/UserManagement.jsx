import React, { useState } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Users, UserCheck, Shield, Check
} from 'lucide-react';

// ─── Sample Data ──────────────────────────────────────────────
const SAMPLE_USERS = [
  { id: 1, initials: 'DA', color: '#6366F1', name: 'Dr. Ahmed Raza',     email: 'a.raza@stmu.edu.pk',    role: 'Batch Advisor', dept: 'Computer Science',     batches: 'BSCS-2021, BSCS-2022', lastLogin: 'Today, 9:15 AM',  status: 'Active'   },
  { id: 2, initials: 'FM', color: '#7C3AED', name: 'Dr. Fatima Malik',   email: 'f.malik@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Computer Science',     batches: 'BSCS-2023',            lastLogin: 'Today, 8:42 AM',  status: 'Pending'  },
  { id: 3, initials: 'UA', color: '#059669', name: 'Mr. Usman Ahmed',    email: 'u.ahmed@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Software Engineering', batches: 'BSSE-2021, BSSE-2022', lastLogin: 'Yesterday',        status: 'Active'   },
  { id: 4, initials: 'ZK', color: '#D97706', name: 'Prof. Zainab Khan',  email: 'z.khan@stmu.edu.pk',    role: 'HOD',           dept: 'Computer Science',     batches: 'All CS Batches',       lastLogin: 'Today, 11:00 AM', status: 'Active'   },
  { id: 5, initials: 'TH', color: '#6366F1', name: 'Mr. Tariq Hussain',  email: 't.hussain@stmu.edu.pk', role: 'Batch Advisor', dept: 'Electrical Eng.',      batches: 'BSEE-2022',            lastLogin: '3 days ago',       status: 'Inactive' },
  { id: 6, initials: 'SR', color: '#2563EB', name: 'Dr. Sara Riaz',      email: 's.riaz@stmu.edu.pk',    role: 'HOD',           dept: 'Software Engineering', batches: 'All SE Batches',       lastLogin: 'Today, 7:30 AM',  status: 'Active'   },
  { id: 7, initials: 'MK', color: '#DC2626', name: 'Mr. Mohammad Kamil', email: 'm.kamil@stmu.edu.pk',   role: 'Administrator', dept: 'All Departments',      batches: '—',                    lastLogin: '2 days ago',       status: 'Active'   },
  { id: 8, initials: 'NB', color: '#0891B2', name: 'Ms. Nadia Baig',     email: 'n.baig@stmu.edu.pk',    role: 'Batch Advisor', dept: 'Electrical Eng.',      batches: 'BSEE-2021',            lastLogin: '5 days ago',       status: 'Inactive' },
];

const ROLE_OPTIONS   = ['All Roles', 'Batch Advisor', 'HOD', 'Administrator'];
const DEPT_OPTIONS   = ['All Departments', 'Computer Science', 'Software Engineering', 'Electrical Eng.'];
const STATUS_OPTIONS = ['All Status', 'Active', 'Pending', 'Inactive'];

const STATUS_STYLE = {
  Active:   { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  Pending:  { bg: '#FEF9C3', color: '#A16207', border: '#FDE68A' },
  Inactive: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
};

const ROLE_DIST = [
  { label: 'Batch Advisors', count: 18, total: 38, color: '#2563EB' },
  { label: 'HODs',           count: 9,  total: 38, color: '#7C3AED' },
  { label: 'Administrators', count: 8,  total: 38, color: '#059669' },
  { label: 'Inactive',       count: 3,  total: 38, color: '#D97706' },
];

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

export default function UserManagement() {
  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('All Roles');
  const [deptFilter, setDept]     = useState('All Departments');
  const [statusFilter, setStatus] = useState('All Status');
  const [selected, setSelected]   = useState([]);
  const [currentPage, setPage]    = useState(1);

  const [form, setForm] = useState({
    fullName:   'Dr. Fatima Malik',
    email:      'f.malik@stmu.edu.pk',
    employeeId: 'STMU-2024-ADV-047',
    phone:      '+92 300 1234567',
    role:       'Batch Advisor',
    department: 'Computer Science',
    batch:      'BSCS-2023 (Unassigned)',
  });

  const filtered = SAMPLE_USERS.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter   === 'All Roles'       || u.role   === roleFilter) &&
      (deptFilter   === 'All Departments' || u.dept   === deptFilter) &&
      (statusFilter === 'All Status'      || u.status === statusFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 8));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const stats = [
    { label: 'Total Users',    value: 38, icon: Users,         iconColor: '#2563EB', iconBg: '#EFF6FF', highlight: false },
    { label: 'Batch Advisors', value: 18, icon: UserCheck,     iconColor: '#7C3AED', iconBg: '#F5F3FF', highlight: false },
    { label: 'HODs',           value: 9,  icon: Shield,        iconColor: '#0891B2', iconBg: '#ECFEFF', highlight: false },
    { label: 'Administrators', value: 8,  icon: Shield,        iconColor: '#059669', iconBg: '#F0FDF4', highlight: false },
    { label: 'Inactive Users', value: 3,  icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FFFBEB', highlight: true  },
  ];

  // Compact input/label styles for the right panel form
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
    // Full-height flex column — fills the main panel completely
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minWidth: 0, height: '100%', overflow: 'hidden',
      fontFamily: "'Inter','Liberation Sans',-apple-system,sans-serif"
    }}>

      {/* ── Header ── */}
      <div style={{
        backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        padding: '14px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
            User Management
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
            BatchMinder &rsaquo; <span style={{ color: '#64748B' }}>Super Admin</span> &rsaquo; <span style={{ color: '#64748B' }}>Users</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '9px',
              backgroundColor: '#2563EB', border: 'none',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
          >
            <Plus size={14} /> Add New User
          </button>
          <button style={{
            position: 'relative', width: '36px', height: '36px', borderRadius: '9px',
            backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Bell size={16} color="#64748B" />
            <span style={{
              position: 'absolute', top: '3px', right: '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              backgroundColor: '#EF4444', border: '2px solid #fff',
              fontSize: '8px', fontWeight: 800, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>7</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', backgroundColor: '#F8FAFC' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '18px' }}>
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                backgroundColor: s.highlight ? '#FFFBEB' : '#FFFFFF',
                border: s.highlight ? '1px solid #FDE68A' : '1px solid #E2E8F0',
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
                  <p style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: s.highlight ? '#D97706' : '#0F172A', lineHeight: 1.1 }}>
                    {s.value}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Two-column layout: table (left) + right panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '16px', alignItems: 'start' }}>

          {/* ── Table card ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '13px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Search + filters */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search users..."
                  style={{ ...inputStyle, paddingLeft: '30px' }}
                />
              </div>
              <Dropdown value={roleFilter}   options={ROLE_OPTIONS}   onChange={setRole} />
              <Dropdown value={deptFilter}   options={DEPT_OPTIONS}   onChange={setDept} />
              <Dropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatus} />
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  <th style={{ width: '34px', padding: '9px 13px' }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </th>
                  {['USER','ROLE','DEPARTMENT','ASSIGNED BATCH(ES)','LAST LOGIN','STATUS'].map(col => (
                    <th key={col} style={{
                      padding: '9px 10px', textAlign: 'left',
                      fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                      letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      No users match your filters.
                    </td>
                  </tr>
                ) : filtered.map((u, i) => {
                  const isSel = selected.includes(u.id);
                  const ss    = STATUS_STYLE[u.status] || STATUS_STYLE.Active;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderTop: '1px solid #F1F5F9',
                        backgroundColor: isSel ? '#EFF6FF' : (i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'; }}
                    >
                      <td style={{ padding: '9px 13px' }}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleRow(u.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '7px',
                            backgroundColor: u.color, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px'
                          }}>{u.initials}</div>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{u.name}</p>
                            <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '5px',
                          backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0',
                          fontSize: '10px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap'
                        }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: '11px', color: '#374151' }}>{u.dept}</td>
                      <td style={{ padding: '9px 10px', fontSize: '11px', color: '#374151' }}>{u.batches}</td>
                      <td style={{ padding: '9px 10px', fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>{u.lastLogin}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{
                          padding: '2px 9px', borderRadius: '18px',
                          fontSize: '10px', fontWeight: 700,
                          backgroundColor: ss.bg, color: ss.color,
                          border: `1px solid ${ss.border}`, whiteSpace: 'nowrap'
                        }}>{u.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{
              padding: '11px 16px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Showing 1–{Math.min(8, filtered.length)} of {filtered.length} users
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'inherit' }}>←</button>
                {[1,2,3,4,5].map(n => (
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

          {/* ── Right panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Add New User form — compact */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={13} color="#2563EB" /> Add New User
              </h3>

              {/* Text inputs */}
              {[
                { key: 'fullName',   label: 'Full Name',          type: 'text'  },
                { key: 'email',      label: 'Institutional Email', type: 'email' },
                { key: 'employeeId', label: 'Employee ID',         type: 'text'  },
                { key: 'phone',      label: 'Phone',               type: 'tel'   },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}

              {/* Select inputs */}
              {[
                { key: 'role',       label: 'Role',         options: ['Batch Advisor','HOD','Administrator'] },
                { key: 'department', label: 'Department',   options: ['Computer Science','Software Engineering','Electrical Eng.'] },
                { key: 'batch',      label: 'Assign Batch', options: ['BSCS-2023 (Unassigned)','BSCS-2022','BSSE-2021','BSEE-2022'] },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={selectStyle}
                    >
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              ))}

              <button
                style={{
                  width: '100%', marginTop: '4px', padding: '9px',
                  borderRadius: '8px', border: 'none',
                  backgroundColor: '#2563EB', color: '#fff',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontFamily: 'inherit', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
              >
                <Check size={13} /> Create User Account
              </button>
            </div>

            {/* Role Distribution */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Role Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {ROLE_DIST.map((r, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{r.label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>{r.count} / {r.total}</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        backgroundColor: r.color,
                        width: `${(r.count / r.total) * 100}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
