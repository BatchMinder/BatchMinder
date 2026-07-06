import React, { useState, useEffect } from 'react';
import {
  Search, ChevronRight, ChevronDown, Check, X, ShieldAlert,
  ShieldCheck, Lock, Activity, Users, Shield, Bell, Calendar
} from 'lucide-react';
import Header from './Header';

const INITIAL_ROLES = [
  { id: 1, name: 'Super Admin',      scope: 'System-wide',     status: 'Active', color: '#E11D48', permissions: ['manage_users', 'manage_depts', 'manage_batches', 'view_audits', 'approve_migrations', 'edit_curriculum', 'view_students'] },
  { id: 2, name: 'Academic Admin',   scope: 'Institution-wide',status: 'Active', color: '#10B981', permissions: ['manage_depts', 'manage_batches', 'view_audits', 'view_students', 'edit_curriculum'] },
  { id: 3, name: 'HOD / Admin',      scope: 'Department-wide', status: 'Active', color: '#7C3AED', permissions: ['manage_batches', 'view_students', 'approve_migrations', 'view_audits'] },
  { id: 4, name: 'Batch Advisor',    scope: 'Batch-specific',  status: 'Active', color: '#2563EB', permissions: ['view_students', 'view_audits'] }
];

const PERMISSIONS_LIST = [
  { key: 'manage_users',       label: 'User Account CRUD',      group: 'System Access' },
  { key: 'manage_depts',       label: 'Create & Manage Depts',  group: 'System Access' },
  { key: 'manage_batches',     label: 'Academic Batch Control', group: 'System Access' },
  { key: 'view_audits',        label: 'View System Audit Logs',  group: 'Auditing & Logs' },
  { key: 'approve_migrations', label: 'Approve Student Transfers', group: 'Academic Flows' },
  { key: 'edit_curriculum',    label: 'Modify Core Curriculum',  group: 'Academic Flows' },
  { key: 'view_students',      label: 'Read Student Records',    group: 'Academic Flows' }
];

const INITIAL_USERS = [
  { id: 1, name: 'Dr. Ahmed Raza',     email: 'a.raza@stmu.edu.pk',    role: 'Batch Advisor', dept: 'Computer Science',       status: 'Active' },
  { id: 2, name: 'Dr. Fatima Malik',   email: 'f.malik@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Computer Science',       status: 'Active' },
  { id: 3, name: 'Mr. Usman Ahmed',    email: 'u.ahmed@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Software Engineering',   status: 'Active' },
  { id: 4, name: 'Prof. Zainab Khan',  email: 'z.khan@stmu.edu.pk',    role: 'HOD / Admin',   dept: 'Computer Science',       status: 'Active' },
  { id: 5, name: 'Mr. Tariq Hussain',  email: 't.hussain@stmu.edu.pk', role: 'Batch Advisor', dept: 'Electrical Engineering',   status: 'Active' },
  { id: 6, name: 'Dr. Sara Riaz',      email: 's.riaz@stmu.edu.pk',    role: 'HOD / Admin',   dept: 'Software Engineering',   status: 'Active' },
  { id: 7, name: 'Mr. Mohammad Kamil', email: 'm.kamil@stmu.edu.pk',   role: 'Academic Admin',dept: 'All Departments',        status: 'Active' },
  { id: 8, name: 'Ms. Nadia Baig',     email: 'n.baig@stmu.edu.pk',    role: 'Batch Advisor', dept: 'Electrical Engineering',   status: 'Active' },
  { id: 9, name: 'Dr. Bob Brown',      email: 'b.brown@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Information Technology',  status: 'Active' },
  { id: 10, name: 'Dr. Alice Green',   email: 'a.green@stmu.edu.pk',   role: 'Batch Advisor', dept: 'Management Sciences',     status: 'Active' },
  { id: 11, name: 'Super Admin User',  email: 'superadmin@stmu.edu.pk', role: 'Super Admin',   dept: 'System Controls',        status: 'Active' },
];

export default function RolesPermissions({ setActiveNav }) {
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [usersList, setUsersList] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('policies'); // 'policies' or 'assignments'
  const [selectedRoleId, setSelectedRoleId] = useState(4); // Default to Batch Advisor
  const [selectedUserId, setSelectedUserId] = useState(null); // Default to empty
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setUsersList(data.data);
        if (data.data.length > 0 && !selectedUserId) {
          setSelectedUserId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to retrieve user list:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Selected elements
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const selectedUser = usersList.find(u => u.id === selectedUserId) || usersList[0] || { name: 'None', role: 'Batch Advisor' };
  const userMappedRole = roles.find(r => r.name === selectedUser.role) || roles[3];

  const handlePermissionToggle = (permissionKey) => {
    setRoles(prevRoles => prevRoles.map(r => {
      if (r.id === selectedRoleId) {
        const hasIt = r.permissions.includes(permissionKey);
        const newPerms = hasIt
          ? r.permissions.filter(p => p !== permissionKey)
          : [...r.permissions, permissionKey];
        return { ...r, permissions: newPerms };
      }
      return r;
    }));
  };

  const handleUserRoleChange = async (userId, newRoleName) => {
    setUsersList(prevList => prevList.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRoleName };
      }
      return u;
    }));

    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleName })
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update role on backend:', err);
    }
  };

  const handleSavePolicies = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAssignmentSuccess(true);
    setTimeout(() => setAssignmentSuccess(false), 3000);

    try {
      await fetch(`/api/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedUser.role })
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to assign role on backend:', err);
    }
  };

  // Helper to count users per role
  const getRoleUserCount = (roleName) => {
    return usersList.filter(u => u.role === roleName).length;
  };

  // Stats computation
  const totalAssignedUsers = usersList.length;

  const stats = [
    { label: 'System Roles',       value: roles.length,        icon: Shield,   iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Permissions Items',  value: PERMISSIONS_LIST.length, icon: Lock,     iconColor: '#10B981', iconBg: '#F0FDF4' },
    { label: 'Assigned Users',     value: totalAssignedUsers,  icon: Check,    iconColor: '#7C3AED', iconBg: '#F5F3FF' },
    { label: 'Security Standard',  value: 'A+',                icon: Shield,   iconColor: '#0891B2', iconBg: '#ECFEFF' },
  ];

  // Group permission definitions
  const groupedPerms = PERMISSIONS_LIST.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    return !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.dept || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
  });

  const labelStyle  = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    color: '#94A3B8', letterSpacing: '0.7px',
    textTransform: 'uppercase', marginBottom: '4px'
  };

  const tabStyle = (isActive) => ({
    padding: '10px 18px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '12.5px',
    fontWeight: 700,
    color: isActive ? '#2563EB' : '#64748B',
    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s'
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minWidth: 0, height: '100%', overflow: 'hidden',
      fontFamily: "'Inter','Liberation Sans',-apple-system,sans-serif"
    }}>

      <Header title="Roles & Permissions" subtitle="BatchMinder ERP • Super Admin • Roles & Permissions" setActiveNav={setActiveNav} />

      {/* ── Body Container ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '18px 24px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '18px' }}>
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
                  <p style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
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

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'stretch', flex: 1 }}>

          {/* ── Left Side: Tab Card ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '13px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>
            {/* Tab Toggles */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#FAFAFA', padding: '0 12px'
            }}>
              <button
                onClick={() => setActiveSubTab('policies')}
                style={tabStyle(activeSubTab === 'policies')}
              >
                Roles & Policies
              </button>
              <button
                onClick={() => setActiveSubTab('assignments')}
                style={tabStyle(activeSubTab === 'assignments')}
              >
                User Role Assignments
              </button>
            </div>

            {/* TAB 1: Roles Policies */}
            {activeSubTab === 'policies' ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#94A3B8' }}>Select a system role to view or edit policy privileges in the right panel.</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC' }}>
                        {['ROLE NAME','SCOPE OF CONTROL','ASSIGNED USERS','PERMISSIONS GRANTED','STATUS'].map(col => (
                          <th key={col} style={{
                            padding: '11px 16px', textAlign: 'left',
                            fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                            letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                          }}>{col}</th>
                        ))}
                        <th style={{ width: '40px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r) => {
                        const isSel = r.id === selectedRoleId;
                        const userCount = getRoleUserCount(r.name);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedRoleId(r.id)}
                            style={{
                              borderTop: '1px solid #F1F5F9',
                              backgroundColor: isSel ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                          >
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: r.color }} />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{r.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569' }}>{r.scope}</td>
                            <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{userCount} {userCount === 1 ? 'User' : 'Users'}</td>
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '6px',
                                backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0',
                                fontSize: '11px', fontWeight: 600, color: '#334155'
                              }}>{r.permissions.length} items</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '18px',
                                fontSize: '10px', fontWeight: 700,
                                backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0'
                              }}>{r.status}</span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94A3B8' }}>
                              <ChevronRight size={14} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* TAB 2: User Role Assignments */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Search Bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search users by name, email, department, or role..."
                      style={{
                        width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px',
                        border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC' }}>
                        {['NAME','DEPARTMENT','ROLE ASSIGNMENT','STATUS'].map(col => (
                          <th key={col} style={{
                            padding: '11px 16px', textAlign: 'left',
                            fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                            letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                          }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSel = u.id === selectedUserId;
                        const userRoleColor = roles.find(r => r.name === u.role)?.color || '#64748B';
                        return (
                          <tr
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            style={{
                              borderTop: '1px solid #F1F5F9',
                              backgroundColor: isSel ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                          >
                            <td style={{ padding: '10px 16px' }}>
                              <div>
                                <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>{u.name}</p>
                                <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>{u.email}</p>
                              </div>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: '11.5px', color: '#475569' }}>{u.dept}</td>
                            <td style={{ padding: '6px 16px' }} onClick={e => e.stopPropagation()}>
                              {/* Direct role allocation dropdown */}
                              <div style={{ position: 'relative', width: '160px' }}>
                                <select
                                  value={u.role}
                                  onChange={e => handleUserRoleChange(u.id, e.target.value)}
                                  style={{
                                    width: '100%', padding: '5px 22px 5px 8px', borderRadius: '6px',
                                    border: '1px solid #CBD5E1', fontSize: '11.5px', color: '#1E293B',
                                    appearance: 'none', cursor: 'pointer', outline: 'none',
                                    fontFamily: 'inherit', fontWeight: 600,
                                    backgroundColor: 'rgba(37,99,235,0.03)'
                                  }}
                                >
                                  {roles.map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                  ))}
                                </select>
                                <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                              </div>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '18px',
                                fontSize: '9.5px', fontWeight: 700,
                                backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0'
                              }}>{u.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Side: Config Editor ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>

            {/* TAB 1 SIDEBAR: Policy Config Panel */}
            {activeSubTab === 'policies' ? (
              <div style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: '13px', padding: '18px',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                flex: 2
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                  <Shield size={16} color={selectedRole.color} />
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Policy: <span style={{ color: selectedRole.color }}>{selectedRole.name}</span>
                  </h3>
                </div>

                {saveSuccess && (
                  <div style={{
                    padding: '8px 12px', marginBottom: '12px', borderRadius: '8px',
                    backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0',
                    color: '#15803D', fontSize: '11.5px', fontWeight: 600
                  }}>
                    ✓ Policy updates saved successfully.
                  </div>
                )}

                {/* Checkbox Groups */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '14px' }}>
                  {Object.entries(groupedPerms).map(([groupName, items]) => (
                    <div key={groupName} style={{ marginBottom: '16px' }}>
                      <span style={labelStyle}>{groupName}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        {items.map(item => {
                          const checked = selectedRole.permissions.includes(item.key);
                          return (
                            <label
                              key={item.key}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 10px', borderRadius: '8px',
                                border: '1px solid #E2E8F0', backgroundColor: checked ? '#F8FAFC' : '#FFFFFF',
                                cursor: 'pointer', fontSize: '12px', color: '#1E293B',
                                transition: 'background 0.15s'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handlePermissionToggle(item.key)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSavePolicies}
                  style={{
                    width: '100%', padding: '9px',
                    borderRadius: '8px', border: 'none',
                    backgroundColor: selectedRole.color, color: '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'filter 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(90%)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(100%)'}
                >
                  <Check size={13} /> Save Permissions Policy
                </button>
              </div>
            ) : (
              /* TAB 2 SIDEBAR: User Allocations Panel */
              <div style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: '13px', padding: '18px',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                flex: 2
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                  <Users size={16} color="#2563EB" />
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    User: <span style={{ color: '#2563EB' }}>{selectedUser.name}</span>
                  </h3>
                </div>

                {assignmentSuccess && (
                  <div style={{
                    padding: '8px 12px', marginBottom: '12px', borderRadius: '8px',
                    backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0',
                    color: '#15803D', fontSize: '11.5px', fontWeight: 600
                  }}>
                    ✓ User role updated successfully.
                  </div>
                )}

                {/* Profile detail */}
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Selected User Details</p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{selectedUser.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>{selectedUser.email}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>Dept: {selectedUser.dept}</p>
                </div>

                {/* Form assign role */}
                <form onSubmit={handleSaveAssignment} style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Assign New Role</label>
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <select
                      value={selectedUser.role}
                      onChange={e => handleUserRoleChange(selectedUser.id, e.target.value)}
                      style={{
                        width: '100%', padding: '7px 28px 7px 10px', borderRadius: '7px',
                        border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                        appearance: 'none', cursor: 'pointer', backgroundColor: '#FFFFFF'
                      }}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '9px',
                      borderRadius: '8px', border: 'none',
                      backgroundColor: '#2563EB', color: '#fff',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontFamily: 'inherit', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
                  >
                    <Check size={13} /> Update Role Assignment
                  </button>
                </form>

                {/* Active policies list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <span style={labelStyle}>Effective Privileges ({userMappedRole.name})</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {PERMISSIONS_LIST.map(p => {
                      const active = userMappedRole.permissions.includes(p.key);
                      return (
                        <div
                          key={p.key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyBetween: 'space-between',
                            padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid #F1F5F9', backgroundColor: active ? '#F0FDF4' : '#FAFAFA',
                            opacity: active ? 1 : 0.45
                          }}
                        >
                          <span style={{ fontSize: '11.5px', color: '#334155', flex: 1 }}>{p.label}</span>
                          {active ? (
                            <Check size={12} color="#15803D" style={{ strokeWidth: 3 }} />
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Revoked</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Assignments Split Chart (Shared) */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                User Assignments split
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                {roles.map((r, i) => {
                  const userCount = getRoleUserCount(r.name);
                  const pct = totalAssignedUsers > 0 ? (userCount / totalAssignedUsers) * 100 : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{r.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
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
