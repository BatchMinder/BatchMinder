import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Eye, EyeOff, RefreshCw, Menu } from 'lucide-react';

export default function Header({ title, subtitle, setActiveNav, children }) {
  const [currentDate, setCurrentDate] = useState('');
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const formatCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-US', options));
  };

  const fetchHeaderNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        // Only keep the most recent 5
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
        if (alert.deepLinkUrl.includes('migrations') && setActiveNav) {
          setActiveNav('migrations');
        } else if ((alert.deepLinkUrl.includes('csv-upload') || alert.deepLinkUrl.includes('upload')) && setActiveNav) {
          setActiveNav('upload');
        } else if (alert.deepLinkUrl.includes('students') && setActiveNav) {
          setActiveNav('students');
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
    formatCurrentDate();
    fetchHeaderNotifications();
    const interval = setInterval(fetchHeaderNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <div style={{
      backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
      padding: isMobile ? '12px 16px' : '18px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '8px' : '0px',
      flexShrink: 0
    }}>
      {/* Main / Top Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}>
        {/* Left Side: Hamburger (All) + Title (All) + Subtitle (Desktop only) */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            style={{
              marginRight: '12px',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              flexShrink: 0
            }}
          >
            <Menu size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h1>
            {!isMobile && (
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
                {subtitle || 'BatchMinder ERP \u2022 Super Admin'}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Children + Bell + Date (Desktop) + Live System (Desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {children}

          {/* Date (Desktop only) */}
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
              fontSize: '12px', fontWeight: 600, color: '#475569'
            }}>
              <Calendar size={14} color="#94A3B8" />
              {currentDate}
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
                    onClick={() => {
                      if (setActiveNav) setActiveNav('notifications');
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

          {/* Live System Indicator (Desktop only) */}
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#16A34A', fontSize: '11px',
              fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live System
            </div>
          )}
        </div>
      </div>

      {/* Date Row (Mobile only) */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          borderRadius: '10px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          fontSize: '12px',
          fontWeight: 600,
          color: '#475569',
          width: '100%',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <Calendar size={14} color="#94A3B8" />
          {currentDate}
        </div>
      )}
    </div>
  );
}
