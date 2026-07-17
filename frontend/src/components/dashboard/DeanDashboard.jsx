import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';
import DepartmentManagement from './DepartmentManagement';
import BatchAllocation from './BatchAllocation';
import RolesPermissions from './RolesPermissions';
import NotificationsPage from './NotificationsPage';
import AuditLogsPage from './AuditLogsPage';
import Header from './Header';
import {
  Layers,
  GraduationCap,
  Users,
  Home,
  BookOpen,
  Shield,
  Bell,
  LogOut,
  FolderOpen,
  Calendar,
  Activity,
  Clock,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Plus,
  BarChart2,
  ExternalLink,
  TrendingUp,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export default function DeanDashboard({ onLogout }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState('');
  const [activeNav, setActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard/')) {
      const subPage = path.substring('/dashboard/'.length);
      const validPages = ['users', 'departments', 'batches', 'roles', 'notifications', 'audits'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [managementExpanded, setManagementExpanded] = useState(true);
  const [systemExpanded, setSystemExpanded] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setSidebarOpen(o => !o);
    };
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle);
  }, []);

  const handleNavigate = (pageId) => {
    setActiveNav(pageId);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Live stats & notifications states
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setDashboardData(data.data);
      } else {
        setStatsError(data.message || 'Failed to fetch dashboard statistics.');
      }

      // Fetch dynamic batches list for summary table
      const batchesRes = await fetch('/api/batches');
      const batchesData = await batchesRes.json();
      if (batchesRes.ok && batchesData.status === 'success') {
        setBatchesList(batchesData.data);
      }
    } catch (err) {
      setStatsError('Connection error: Failed to retrieve server metrics.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHeaderNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setNotifications(data.data.slice(0, 5)); // show top 5
      }
    } catch (err) {
      console.error('Failed to load header alerts:', err);
    }
  };

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-US', options));
  }, []);

  // Listen to popstate event (browser back/forward) & set initial activeNav
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path === '/dashboard' || path === '/dashboard/') {
        setActiveNav('dashboard');
      } else if (path.startsWith('/dashboard/')) {
        const subPage = path.substring('/dashboard/'.length);
        const validPages = ['users', 'departments', 'batches', 'roles', 'notifications', 'audits'];
        if (validPages.includes(subPage)) {
          setActiveNav(subPage);
        } else {
          setActiveNav('dashboard');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Sync state changes to browser URL path
  useEffect(() => {
    const currentPath = window.location.pathname;
    const targetPath = activeNav === 'dashboard' ? '/dashboard' : `/dashboard/${activeNav}`;
    if (currentPath !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeNav]);

  useEffect(() => {
    fetchDashboardStats();
    fetchHeaderNotifications();
  }, [activeNav]);

  const totalStudents = dashboardData ? (dashboardData.totalStudents || dashboardData.students?.total || 0) : 0;
  const activeUsersVal = dashboardData ? (dashboardData.activeStudents || dashboardData.users?.active || 0) : 0;
  const activeDeptsVal = dashboardData ? (dashboardData.departments?.length || 0) : 0;
  const activeBatchesVal = dashboardData ? (dashboardData.totalBatches || dashboardData.batches?.total || 0) : 0;
  const atRiskStudents = dashboardData ? (dashboardData.atRiskStudents || (dashboardData.students?.warning || 0) + (dashboardData.students?.critical || 0)) : 0;

  const metrics = [
    {
      title: 'Total Registered Students',
      value: statsLoading ? '...' : totalStudents.toLocaleString(),
      footer: 'Live MongoDB count',
      footerColor: '#15803D',
      icon: Users,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB'
    },
    {
      title: 'Active System Users',
      value: statsLoading ? '...' : activeUsersVal,
      footer: 'Staff & admin log-ins',
      footerColor: '#64748B',
      icon: Activity,
      iconBg: '#FFFBEB',
      iconColor: '#D97706'
    },
    {
      title: 'Active Departments',
      value: statsLoading ? '...' : activeDeptsVal,
      footer: 'Managed campuses & depts',
      footerColor: '#15803D',
      icon: Home,
      iconBg: '#F8FAFC',
      iconColor: '#475569'
    },
    {
      title: 'Active Batches',
      value: statsLoading ? '...' : activeBatchesVal,
      footer: 'Across all departments',
      footerColor: '#64748B',
      icon: FolderOpen,
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5'
    },
    {
      title: 'System Uptime (30 Days)',
      value: '99.9%',
      footer: 'All microservices active',
      footerColor: '#15803D',
      icon: CheckCircle,
      iconBg: '#F0FDF4',
      iconColor: '#16A34A'
    },
    {
      title: 'Pending Broadcasts',
      value: '0',
      footer: 'No alerts in queue',
      footerColor: '#64748B',
      icon: Clock,
      iconBg: '#FFFBEB',
      iconColor: '#D97706'
    },
    {
      title: 'Migration Requests',
      value: statsLoading ? '...' : (dashboardData?.pendingMigrations || 0),
      footer: 'Awaiting sync confirmation',
      footerColor: '#64748B',
      icon: ArrowRightLeft,
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5'
    },
    {
      title: 'At-Risk Students',
      value: statsLoading ? '...' : atRiskStudents,
      footer: 'Academic warnings active',
      footerColor: atRiskStudents > 0 ? '#B91C1C' : '#15803D',
      icon: AlertTriangle,
      iconBg: '#FFF1F2',
      iconColor: '#E11D48'
    }
  ];

  const depts = dashboardData?.departments || [];

  const quickActions = [
    { title: 'Add New User', icon: Plus, iconColor: '#2563EB', bg: '#EFF6FF', navId: 'users' },
    { title: 'Add Department', icon: Home, iconColor: '#4F46E5', bg: '#EEF2FF', navId: 'departments' },
    { title: 'Create Batch', icon: FolderOpen, iconColor: '#475569', bg: '#F1F5F9', navId: 'batches' },
    { title: 'System Broadcast', icon: Bell, iconColor: '#16A34A', bg: '#F0FDF4', navId: 'notifications' },
    { title: 'Assign Roles', icon: Shield, iconColor: '#7C3AED', bg: '#F5F3FF', navId: 'roles' },
    { title: 'View Logs', icon: BarChart2, iconColor: '#0F172A', bg: '#F8FAFC', navId: 'notifications' }
  ];

  const navItems = {
    overview: [
      { id: 'dashboard', label: 'Dashboard', icon: Activity }
    ],
    management: [
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'departments', label: 'Departments', icon: Home },
      { id: 'batches', label: 'Batch Allocation', icon: Layers }
    ],
    system: [
      { id: 'roles', label: 'Roles & Permissions', icon: Shield },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'audits', label: 'Audit Logs', icon: BarChart2 }
    ]
  };

  const displayName = user?.name || 'Dean';
  const displayEmail = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SA';

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', fontFamily: "'Inter', 'Liberation Sans', -apple-system, sans-serif", position: 'relative' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        @media (min-width: 1024px) {
          ${sidebarOpen ? '.global-header-menu-btn { display: none !important; }' : ''}
        }
      `}</style>
      {/* Mobile Backdrop Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className="no-scrollbar" style={{
        width: sidebarOpen ? '256px' : '0px',
        minWidth: sidebarOpen ? '256px' : '0px',
        backgroundColor: '#0F172A',
        display: sidebarOpen ? 'flex' : 'none',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'hidden',
        flexShrink: 0,
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, zIndex: 999,
        boxShadow: (isMobile && sidebarOpen) ? '4px 0 20px rgba(0,0,0,0.4)' : 'none',
        transition: 'width 0.3s ease, min-width 0.3s ease'
      }}>

        {/* Logo */}
        <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)', flexShrink: 0
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              BatchMinder
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94A3B8', flexShrink: 0,
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '20px', padding: '3px 10px', marginBottom: '6px', alignSelf: 'flex-start'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#F59E0B', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Dean
            </span>
          </div>

          {/* User Card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            justifyContent: 'flex-start'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="no-scrollbar" style={{ flex: 1, padding: '4px 12px 0', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {/* Overview */}
          <div style={{ marginBottom: '6px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 4px 8px' }}>
              Overview
            </p>
            {navItems.overview.map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '9px',
                    backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                    color: isActive ? '#60A5FA' : '#94A3B8',
                    fontSize: '13px', fontWeight: isActive ? 700 : 500,
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
          </div>

          {/* Management */}
          <div style={{ marginBottom: '6px' }}>
            <div
              onClick={() => setManagementExpanded(!managementExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 8px', marginBottom: '2px', borderRadius: '6px', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: 0 }}>
                Management
              </p>
              {managementExpanded ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
            </div>
            {managementExpanded && navItems.management.map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '9px',
                    backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                    color: isActive ? '#60A5FA' : '#94A3B8',
                    fontSize: '13px', fontWeight: isActive ? 700 : 500,
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
          </div>

          {/* System */}
          <div style={{ marginBottom: '6px' }}>
            <div
              onClick={() => setSystemExpanded(!systemExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 8px', marginBottom: '2px', borderRadius: '6px', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: 0 }}>
                System
              </p>
              {systemExpanded ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
            </div>
            {systemExpanded && navItems.system.map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '9px',
                    backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                    color: isActive ? '#60A5FA' : '#94A3B8',
                    fontSize: '13px', fontWeight: isActive ? 700 : 500,
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
          </div>
        </nav>

        {/* Sidebar Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              justifyContent: 'flex-start',
              width: '100%', padding: '10px 14px', borderRadius: '9px',
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#F87171', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171'; }}
          >
            <LogOut size={15} />
            <span>Log Out Portal</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden'
      }}>
        {activeNav === 'users' ? (
          <UserManagement setActiveNav={setActiveNav} />
        ) : activeNav === 'departments' ? (
          <DepartmentManagement setActiveNav={setActiveNav} />
        ) : activeNav === 'batches' ? (
          <BatchAllocation setActiveNav={setActiveNav} />
        ) : activeNav === 'roles' ? (
          <RolesPermissions setActiveNav={setActiveNav} />
        ) : activeNav === 'notifications' ? (
          <NotificationsPage setActiveNav={setActiveNav} />
        ) : activeNav === 'audits' ? (
          <AuditLogsPage setActiveNav={setActiveNav} />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
            <Header
              title="Dean Dashboard"
              subtitle="BatchMinder ERP • Dashboard"
              setActiveNav={setActiveNav}
            />

            {/* Scrollable Content */}
            <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

              {/* 8-Card Metrics Grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'box-shadow 0.2s',
                        cursor: 'default'
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '9px',
                          backgroundColor: m.iconBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={17} color={m.iconColor} />
                        </div>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          {m.title}
                        </p>
                        <h3 style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>
                          {m.value}
                        </h3>
                      </div>
                      <div style={{
                        fontSize: '11px', fontWeight: 600, color: m.footerColor,
                        paddingTop: '10px', borderTop: '1px solid #F1F5F9'
                      }}>
                        {m.footer}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top Row: Department Overview + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 mb-6">

                {/* Department Overview */}
                <div style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '14px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Home size={17} color="#64748B" />
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Department Overview</h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {depts.map((d, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{d.name}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>{d.students} Students</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{
                            height: '100%', borderRadius: '4px',
                            backgroundColor: d.color,
                            width: `${d.pct}%`,
                            transition: 'width 0.8s ease'
                          }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {d.stats}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '14px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action, i) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => { if (action.navId) setActiveNav(action.navId); }}
                          style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '10px',
                            padding: '16px 10px', borderRadius: '11px',
                            backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            backgroundColor: action.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <ActionIcon size={18} color={action.iconColor} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                            {action.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Row: Recent System Activity + Batch Allocation Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Recent System Activity */}
                <div style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '14px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={17} color="#64748B" />
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Recent System Activity</h3>
                    </div>
                    <button
                      onClick={() => setActiveNav('audits')}
                      style={{
                        border: 'none', backgroundColor: 'transparent',
                        color: '#2563EB', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      View All Logs &rarr;
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                    {!dashboardData?.activityLogs || dashboardData.activityLogs.length === 0 ? (
                      <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                        No system activity logged
                      </div>
                    ) : (
                      dashboardData.activityLogs.slice(0, 6).map((log, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0, color: '#2563EB'
                          }}>
                            <Clock size={12} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', fontWeight: 500, lineHeight: 1.3 }}>
                              {log.details || log.action}
                            </p>
                            <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginTop: '2px' }}>
                              {new Date(log.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} &bull; by {log.user}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Batch Allocation Summary */}
                <div style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '14px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={17} color="#64748B" />
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Batch Allocation Summary</h3>
                    </div>
                    <button
                      onClick={() => setActiveNav('batches')}
                      style={{
                        border: 'none', backgroundColor: 'transparent',
                        color: '#2563EB', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Manage &rarr;
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {batchesList.length === 0 ? (
                      <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                        No batch allocations defined
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            {['Batch', 'Dept', 'Advisor', 'Students', 'Status'].map(h => (
                              <th key={h} style={{
                                textAlign: 'left', padding: '8px 10px', fontSize: '10px',
                                fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px'
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {batchesList.slice(0, 6).map((b, i) => {
                            const statusColors = b.status === 'Allocated'
                              ? { bg: '#EBF5FF', text: '#2563EB' }
                              : b.status === 'New'
                                ? { bg: '#F0FDF4', text: '#16A34A' }
                                : { bg: '#FFF7ED', text: '#EA580C' };
                            return (
                              <tr key={i} style={{ borderBottom: i < 5 ? '1px solid #F8FAFC' : 'none' }}>
                                <td style={{ padding: '10px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{b.code}</td>
                                <td style={{ padding: '10px', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                  {b.dept ? (b.dept.includes('Computer Science') ? 'CS' : b.dept.includes('Software') ? 'SE' : b.dept.includes('Electrical') ? 'EE' : b.dept) : 'N/A'}
                                </td>
                                <td style={{ padding: '10px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                                  {b.advisor && b.advisor !== 'Unassigned' ? b.advisor : '—'}
                                </td>
                                <td style={{ padding: '10px', fontSize: '12px', color: '#1E293B', fontWeight: 700 }}>{b.studentCount || b.students || 0}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                                    backgroundColor: statusColors.bg, color: statusColors.text
                                  }}>{b.status}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
