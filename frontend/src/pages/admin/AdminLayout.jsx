import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, Upload, ArrowRightLeft, BookOpen, Layers,
  LogOut, GraduationCap, ChevronDown, Building2, Calendar,
  BarChart2, Settings, Bell, Clock
} from 'lucide-react';

const CORE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Student Records', icon: Users },
  { id: 'upload', label: 'CSV / Excel Upload', icon: Upload },
  { id: 'migrations', label: 'Migration Records', icon: ArrowRightLeft },
  { id: 'curriculum', label: 'Curriculum Setup', icon: BookOpen },
  { id: 'batches', label: 'Batches', icon: Layers },

  // 🗓️ MODULE 5 CORE SCHEDULING ITEMS ADDED HERE PERMANENTLY
  { id: 'timetable_generator', label: 'Timetable Generator', icon: Calendar },
  { id: 'datesheet_generator', label: 'Datesheet Generator', icon: BookOpen },
];

const SYSTEM_NAV_ITEMS = [
  // 🗓️ MODULE 5 OVERRIDE OPERATION CONFIG LINK ADDED HERE
  { id: 'schedule_override', label: 'Schedule Override', icon: Clock },
  { id: 'audit_logs', label: 'System Audit Logs', icon: BarChart2 },
  { id: 'settings', label: 'Profile Settings', icon: Settings },
];

export default function AdminLayout({
  activeNav,
  onNavigate,
  children,
  departments = [],
  selectedDept,
  onDeptChange = () => { },
  batches = [],
  selectedBatch = 'all',
  onBatchChange = () => { }
}) {
  const { user, logout } = useAuth();
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Notification states in Layout
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const isAdvisor = user?.role === 'advisor';

  const fetchHeaderNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setNotifications(data.data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch header alerts:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        fetchHeaderNotifications();
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (alert) => {
    try {
      if (alert.status === 'Unread') {
        const response = await fetch(`/api/notifications/${alert.id}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          fetchHeaderNotifications();
        }
      }
      if (alert.deepLinkUrl) {
        if (alert.deepLinkUrl.includes('migrations')) {
          onNavigate('migrations');
        } else if (alert.deepLinkUrl.includes('csv-upload') || alert.deepLinkUrl.includes('upload')) {
          onNavigate('upload');
        } else if (alert.deepLinkUrl.includes('students')) {
          onNavigate('students');
        } else {
          window.location.href = alert.deepLinkUrl;
        }
      }
      setShowBellDropdown(false);
    } catch (err) {
      console.error('Failed to handle notification click:', err);
    }
  };

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-US', options));

    fetchHeaderNotifications();
    const interval = setInterval(fetchHeaderNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const deptName = selectedDept === 'all'
    ? 'All Departments'
    : departments.find(d => d._id === selectedDept)?.name || 'Select Department';

  const advisorNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Profiles', icon: Users },
  ];

  const currentCoreNavItems = isAdvisor ? advisorNavItems : CORE_NAV_ITEMS;
  const currentSystemNavItems = isAdvisor
    ? [{ id: 'settings', label: 'Profile Settings', icon: Settings }]
    : SYSTEM_NAV_ITEMS;

  const activeNavItem = [...currentCoreNavItems, ...currentSystemNavItems].find(item => item.id === activeNav);
  const activeNavLabel = activeNavItem ? activeNavItem.label : 'Dashboard';
  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", width: '100vw' }}>
      {/* Sidebar */}
      <aside style={{
        width: 256, minWidth: 256, backgroundColor: '#0F172A',
        display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
              BatchMinder
            </span>
          </div>
        </div>

        {/* User badge */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            backgroundColor: isAdvisor ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
            border: isAdvisor ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(16,185,129,0.25)',
            borderRadius: 20, padding: '3px 10px', marginBottom: 12
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isAdvisor ? '#3B82F6' : '#10B981' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: isAdvisor ? '#3B82F6' : '#10B981', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {isAdvisor ? 'Batch Advisor' : 'Administrator'}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)'
          }}>
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  objectFit: 'cover', flexShrink: 0
                }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Administrator'}
              </p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Department Switcher */}
        {departments.length > 0 && !isAdvisor && (
          <div style={{ padding: '0 12px 8px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', borderRadius: 9,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#CBD5E1', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <Building2 size={14} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deptName}
                </span>
                <ChevronDown size={14} />
              </button>

              {showDeptDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
                  borderRadius: 9, backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)', overflow: 'hidden'
                }}>
                  {departments.length >= 2 && (
                    <button
                      onClick={() => { onDeptChange('all'); setShowDeptDropdown(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                        backgroundColor: selectedDept === 'all' ? 'rgba(37,99,235,0.15)' : 'transparent',
                        color: selectedDept === 'all' ? '#60A5FA' : '#CBD5E1',
                        fontSize: 12, fontWeight: selectedDept === 'all' ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedDept === 'all' ? 'rgba(37,99,235,0.15)' : 'transparent'}
                    >
                      All Departments
                    </button>
                  )}
                  {departments.map(d => (
                    <button
                      key={d._id}
                      onClick={() => { onDeptChange(d._id); setShowDeptDropdown(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                        backgroundColor: selectedDept === d._id ? 'rgba(37,99,235,0.15)' : 'transparent',
                        color: selectedDept === d._id ? '#60A5FA' : '#CBD5E1',
                        fontSize: 12, fontWeight: selectedDept === d._id ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedDept === d._id ? 'rgba(37,99,235,0.15)' : 'transparent'}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '4px 12px 0', overflowY: 'auto' }}>
          {currentCoreNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 9, marginBottom: 2,
                  backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                  color: isActive ? '#60A5FA' : '#94A3B8',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{
            fontSize: '10px', fontWeight: 800, color: '#475569',
            letterSpacing: '1px', textTransform: 'uppercase',
            padding: '16px 12px 8px'
          }}>
            System Settings
          </div>

          {currentSystemNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 9, marginBottom: 2,
                  backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                  color: isActive ? '#60A5FA' : '#94A3B8',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px' }}>
          <button
            onClick={() => setShowLogoutModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', borderRadius: 9,
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#F87171', fontSize: 13, fontWeight: 600,
              cursor: 'pointer'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171'; }}
          >
            <LogOut size={15} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>

        {/* Top Header */}
        <div style={{
          backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
          padding: '18px 32px', display: 'flex', alignItems: 'center', justifycontent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {activeNavLabel}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              BatchMinder ERP &bull; <span style={{ color: '#64748B' }}>{activeNavLabel}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Advisor Batch Switcher */}
            {isAdvisor && batches.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Batch:</span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedBatch}
                    onChange={e => onBatchChange(e.target.value)}
                    style={{
                      padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '12px', fontWeight: 700, color: '#1E293B', outline: 'none',
                      backgroundColor: '#FAFAFA', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <option value="all">All Assigned Batches</option>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>{b.code}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} color="#64748B" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            {isAdvisor && batches.length === 1 && (
              <div style={{
                padding: '8px 14px', borderRadius: '10px',
                backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                fontSize: '12px', fontWeight: 700, color: '#475569'
              }}>
                Batch: <span style={{ color: '#2563EB' }}>{batches[0]?.code}</span>
              </div>
            )}

            {/* Date */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
              fontSize: '12px', fontWeight: 600, color: '#475569'
            }}>
              <Calendar size={14} color="#94A3B8" />
              {currentDate}
            </div>

            {/* Bell Button & Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowBellDropdown(o => !o);
                  fetchHeaderNotifications();
                }}
                style={{
                  position: 'relative', width: '38px', height: '38px', borderRadius: '10px',
                  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                  display: 'flex', alignItems: 'center', justifycontent: 'center',
                  cursor: 'pointer', color: '#64748B', fontFamily: 'inherit'
                }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: '#EF4444', border: '2px solid #fff',
                    fontSize: '9px', fontWeight: 800, color: '#fff',
                    display: 'flex', alignItems: 'center', justifycontent: 'center'
                  }}>{unreadCount}</span>
                )}
              </button>

              {showBellDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 100,
                  marginTop: '8px', width: '280px', borderRadius: '12px',
                  backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden',
                  textAlign: 'left'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Recent Alerts</span>
                    {unreadCount > 0 ? (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          border: 'none', backgroundColor: 'transparent',
                          fontSize: '10px', fontWeight: 700, color: '#2563EB',
                          cursor: 'pointer', fontFamily: 'inherit', padding: 0
                        }}
                      >
                        Mark all as read
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8' }}>0 Unread</span>
                    )}
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(alert => (
                        <div key={alert.id}
                          onClick={() => handleNotificationClick(alert)}
                          style={{
                            padding: '10px 16px', borderBottom: '1px solid #F1F5F9',
                            display: 'flex', flexDirection: 'column', gap: '2px',
                            cursor: 'pointer',
                            backgroundColor: alert.status === 'Unread' ? 'rgba(37,99,235,0.02)' : '#FFFFFF'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = alert.status === 'Unread' ? 'rgba(37,99,235,0.02)' : '#FFFFFF'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              backgroundColor: alert.type === 'critical' ? '#EF4444' : alert.type === 'warning' ? '#F59E0B' : '#3B82F6',
                              flexShrink: 0
                            }} />
                            <span style={{ fontSize: '11px', fontWeight: alert.status === 'Unread' ? 700 : 500, color: '#1E293B', whiteSpace: 'normal' }}>
                              {alert.title}
                            </span>
                          </div>
                          <span style={{ fontSize: '9.5px', color: '#94A3B8', marginLeft: '12px' }}>
                            {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: '8px', textAlign: 'center', backgroundColor: '#FAFAFA' }}>
                    <button
                      onClick={() => {
                        onNavigate('notifications');
                        setShowBellDropdown(false);
                      }}
                      style={{ border: 'none', backgroundColor: 'transparent', fontSize: '11px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live System */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#16A34A', fontSize: '11px',
              fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live System
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifycontent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 380, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1B3A6B' }}>Confirm Log Out</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748B' }}>Are you sure you want to end your session?</p>
            <div style={{ display: 'flex', gap: 8, justifycontent: 'flex-end' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{ padding: '8px 20px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); logout(); }}
                style={{ padding: '8px 20px', borderRadius: 12, border: 'none', backgroundColor: '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}