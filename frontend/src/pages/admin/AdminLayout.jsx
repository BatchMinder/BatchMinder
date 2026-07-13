import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, Upload, ArrowRightLeft, BookOpen, Layers,
  LogOut, GraduationCap, ChevronDown, ChevronUp, Building2, Calendar,
  BarChart2, Settings, Bell, Clock, Plus, Search, CalendarCheck, FileText,
  AlertTriangle, HelpCircle, CheckCircle, Menu
} from 'lucide-react';

const CORE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
];

const advisorGroups = {
  overview: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'My Batch', icon: Users },
    { id: 'notifications', label: 'Alerts & Notifications', icon: Bell }
  ],
  student_management: [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'at_risk_monitoring', label: 'At-Risk Monitoring', icon: AlertTriangle },
    { id: 'student_performance', label: 'Student Performance', icon: BarChart2 },
    { id: 'workflowQueue', label: 'Approval Requests', icon: Clock }
  ],
  academic_management: [
    { id: 'course_advising', label: 'Course Advising', icon: BookOpen },
    { id: 'schedule', label: 'Schedule & Timetable', icon: Calendar },
    { id: 'degree_plan', label: 'Degree Plan', icon: Layers }
  ],
  reports: [
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart2 },
    { id: 'advising_reports', label: 'Advising Reports', icon: FileText }
  ],
  system: [
    { id: 'settings', label: 'Profile Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ]
};

const SYSTEM_NAV_ITEMS = [
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
  const [showAcademicTools, setShowAcademicTools] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  // Notification states in Layout
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const isAdvisor = user?.role === 'advisor';

  const fetchHeaderNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
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
          handleNavigate('migrations');
        } else if (alert.deepLinkUrl.includes('csv-upload') || alert.deepLinkUrl.includes('upload')) {
          handleNavigate('upload');
        } else if (alert.deepLinkUrl.includes('students')) {
          handleNavigate('students');
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

  const isHOD = user?.role === 'admin';

  const advisorNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Profiles', icon: Users },
    { id: 'workflowQueue', label: 'Workflow Queue', icon: Clock },
  ];

  const hodNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Request History', icon: Clock },
    { id: 'reporting', label: 'Reporting Dashboard', icon: BarChart2 },
  ];

  const currentCoreNavItems = isAdvisor
    ? advisorNavItems
    : isHOD
      ? hodNavItems
      : CORE_NAV_ITEMS;

  const currentSystemNavItems = isAdvisor
    ? [{ id: 'settings', label: 'Profile Settings', icon: Settings }]
    : isHOD
      ? [{ id: 'settings', label: 'Profile Settings', icon: Settings }]
      : SYSTEM_NAV_ITEMS;


  const advancedAcademicNavItems = [
    { id: 'upload', label: 'CSV / Excel Upload', icon: Upload },
    { id: 'migrations', label: 'Migration Records', icon: ArrowRightLeft },
    { id: 'curriculum', label: 'Curriculum Setup', icon: BookOpen },
    { id: 'timetable_generator', label: 'Timetable Generator', icon: Calendar },
    { id: 'datesheet_generator', label: 'Datesheet Generator', icon: BookOpen },
    { id: 'schedule_override', label: 'Schedule Override', icon: Clock },
    { id: 'audit_logs', label: 'System Audit Logs', icon: BarChart2 },
  ];

  const activeNavItem = [
    ...currentCoreNavItems,
    ...currentSystemNavItems,
    ...advancedAcademicNavItems
  ].find(item => item.id === activeNav);
  const activeNavLabel = activeNavItem ? activeNavItem.label : 'Dashboard';
  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  const badgeConfig = isAdvisor
    ? { color: '#3B82F6', label: 'Batch Advisor', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' }
    : (isHOD
      ? { color: '#7C3AED', label: 'HOD', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)' }
      : { color: '#10B981', label: 'Administrator', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' }
    );

  const displayName = user?.name === 'Admin CS Only' || user?.name === 'Admin CS+SE' ? 'Dr. Adrian Vance' : (user?.name || 'Academic Admin');
  const isFemale = /fatima|ayesha|zainab|sana/i.test(displayName || '');
  const profilePic = user?.name === 'Admin CS Only' || user?.name === 'Admin CS+SE'
    ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    : (user?.profilePictureUrl || (isFemale
      ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
      : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'));

  const portalLabel = isAdvisor
    ? 'Advisory Portal'
    : isHOD
      ? 'HOD Portal'
      : 'Academic Portal';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", width: '100vw', position: 'relative' }}>
      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 256, minWidth: 256, backgroundColor: '#0B0F19',
        display: (!isMobile || mobileSidebarOpen) ? 'flex' : 'none',
        flexDirection: 'column', height: '100%', overflowY: 'auto', flexShrink: 0,
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, zIndex: 999,
        boxShadow: isMobile ? '4px 0 20px rgba(0,0,0,0.4)' : 'none'
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
              BatchMinder
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div style={{ padding: '16px 20px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: badgeConfig.bg, border: `1px solid ${badgeConfig.border}`,
            borderRadius: '20px', padding: '3px 10px', marginBottom: '12px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badgeConfig.color }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: badgeConfig.color, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {badgeConfig.label}
            </span>
          </div>

          {/* User Card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px', borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar" style={{ flex: 1, padding: '16px 12px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {isAdvisor ? (
            <>
              {/* OVERVIEW */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Overview
                </p>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'myBatch', label: 'My Batch', icon: Users }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* STUDENT MANAGEMENT */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Student Management
                </p>
                {[
                  { id: 'students', label: 'Students', icon: Users },
                  { id: 'at_risk_monitoring', label: 'At-Risk Monitoring', icon: AlertTriangle },
                  { id: 'workflowQueue', label: 'Approval Requests', icon: Clock }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ACADEMIC & REPORTS */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Academic
                </p>
                {[
                  { id: 'timetable', label: 'Timetable Management', icon: Calendar },
                  { id: 'reporting', label: 'Reporting Dashboard', icon: BarChart2 }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SYSTEM */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  System
                </p>
                {[
                  { id: 'settings', label: 'Profile Settings', icon: Settings }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : isHOD ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  HOD Actions
                </p>
                {hodNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Overview
                </p>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* STUDENT MANAGEMENT */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Student Management
                </p>
                {[
                  { id: 'students', label: 'Student Records', icon: Users },
                  { id: 'upload', label: 'CSV/Excel Upload', icon: Upload },
                  { id: 'migrations', label: 'Migration Records', icon: ArrowRightLeft }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ACADEMIC MANAGEMENT */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Academic Management
                </p>
                {[
                  { id: 'curriculum', label: 'Curriculum Management', icon: BookOpen }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SCHEDULING */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  Scheduling
                </p>
                {[
                  { id: 'timetable_generator', label: 'Timetable Management', icon: Calendar },
                  { id: 'datesheet_generator', label: 'Exam Schedule', icon: CalendarCheck },
                  { id: 'schedule_override', label: 'Schedule Override', icon: Clock }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>



              {/* SYSTEM */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 6px 8px' }}>
                  System
                </p>
                {[
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'settings', label: 'System Settings', icon: Settings },
                  { id: 'audit_logs', label: 'Audit Logs', icon: FileText }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button key={item.id} onClick={() => onNavigate(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        color: isActive ? '#60A5FA' : '#94A3B8',
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
                    >
                      <Icon size={15} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
              cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171'; }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>

        {/* Top Header */}
        <div style={{
          backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
          padding: isMobile ? '12px 16px' : '18px 32px', display: 'flex', alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          flexShrink: 0, gap: '12px'
        }}>
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(o => !o)}
              style={{
                marginRight: 'auto',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <Menu size={18} />
            </button>
          )}

          {/* Advisor Batch Switcher — multi-batch */}
          {isAdvisor && batches.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0'
            }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Batch:</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedBatch}
                  onChange={e => onBatchChange(e.target.value)}
                  style={{
                    padding: '2px 28px 2px 4px', border: 'none', outline: 'none',
                    fontSize: '12px', fontWeight: 700, color: '#2563EB',
                    backgroundColor: 'transparent', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  <option value="all">All Batches</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.code}</option>
                  ))}
                </select>
                <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* Advisor Batch — single batch */}
          {isAdvisor && batches.length === 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
              fontSize: '12px', fontWeight: 700, color: '#475569'
            }}>
              Batch: <span style={{ color: '#2563EB' }}>{batches[0]?.code}</span>
            </div>
          )}

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
                display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    onClick={() => { handleNavigate('notifications'); setShowBellDropdown(false); }}
                    style={{ border: 'none', backgroundColor: 'transparent', fontSize: '11px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

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

          {/* Live System Badge */}
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

        {/* Content Wrapper */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px 32px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 380, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1B3A6B' }}>Confirm Log Out</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748B' }}>Are you sure you want to end your session?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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