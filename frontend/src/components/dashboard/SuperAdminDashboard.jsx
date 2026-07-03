import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  ExternalLink
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function SuperAdminDashboard({ onLogout }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Set formatted date matching "Friday, May 22, 2026"
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-US', options));
  }, []);

  const metrics = [
    {
      title: 'TOTAL REGISTERED STUDENTS',
      value: '2,847',
      footer: '↑ +143 this semester',
      footerColor: 'text-emerald-600',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'ACTIVE SYSTEM USERS',
      value: '38',
      footer: 'Advisors, HODs, Admins',
      footerColor: 'text-slate-500',
      icon: Users,
      iconBg: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'ACTIVE DEPARTMENTS',
      value: '6',
      footer: '↑ 1 added this year',
      footerColor: 'text-emerald-600',
      icon: Home,
      iconBg: 'bg-slate-100 text-slate-700'
    },
    {
      title: 'ACTIVE BATCHES',
      value: '24',
      footer: 'Across all departments',
      footerColor: 'text-slate-500',
      icon: FolderOpen,
      iconBg: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'SYSTEM UPTIME (30 DAYS)',
      value: '94.2%',
      footer: 'All services operational',
      footerColor: 'text-emerald-600',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'PENDING APPROVALS',
      value: '47',
      footer: '↑ +12 requires attention',
      footerColor: 'text-amber-600',
      icon: Clock,
      iconBg: 'bg-amber-50/70 text-amber-600'
    },
    {
      title: 'MIGRATION REQUESTS',
      value: '18',
      footer: 'Awaiting processing',
      footerColor: 'text-slate-500',
      icon: ArrowRightLeft,
      iconBg: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'AT-RISK STUDENTS',
      value: '63',
      footer: '↑ +8 from last month',
      footerColor: 'text-rose-600',
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600'
    }
  ];

  const depts = [
    {
      name: 'Computer Science (CS)',
      students: '847',
      stats: '8 Batches • 12 Advisors • 4 HODs',
      color: 'bg-blue-600',
      width: 'w-full'
    },
    {
      name: 'Software Engineering (SE)',
      students: '634',
      stats: '6 Batches • 9 Advisors • 3 HODs',
      color: 'bg-emerald-500',
      width: 'w-[75%]'
    },
    {
      name: 'Electrical Engineering (EE)',
      students: '512',
      stats: '5 Batches • 8 Advisors • 3 HODs',
      color: 'bg-indigo-500',
      width: 'w-[60%]'
    }
  ];

  const quickActions = [
    { title: 'Add New User', icon: Plus, iconColor: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Add Department', icon: Home, iconColor: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Create Batch', icon: FolderOpen, iconColor: 'text-slate-700', bg: 'bg-slate-100' },
    { title: 'Setup Curriculum', icon: BookOpen, iconColor: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Assign Roles', icon: Shield, iconColor: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'View Reports', icon: BarChart2, iconColor: 'text-slate-800', bg: 'bg-slate-150' }
  ];

  return (
    <div className="flex-grow flex font-sans bg-slate-50 text-slate-800 overflow-x-hidden min-h-[calc(100vh-73px)]">
      
      {/* Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shrink-0 justify-between select-none">
        
        {/* Top Section */}
        <div className="p-6 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-display">
              BatchMinder
            </span>
          </div>

          {/* Super Administrator Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            Super Administrator
          </div>

          {/* User Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm tracking-wider text-white">
              SA
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Dr. Syed Arif Shah</h4>
              <p className="text-xs text-slate-400 truncate">s.arif@stmu.edu.pk</p>
            </div>
          </div>

          {/* Nav Categories */}
          <nav className="space-y-6 pt-4">
            {/* Overview */}
            <div className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Overview</span>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold transition-all duration-150">
                <Activity className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
            </div>

            {/* Management */}
            <div className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Management</span>
              <div className="space-y-1">
                {[
                  { label: 'User Management', icon: Users },
                  { label: 'Departments', icon: Home },
                  { label: 'Batch Allocation', icon: Layers },
                  { label: 'Curriculum Setup', icon: BookOpen }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all duration-150 text-left">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System */}
            <div className="space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">System</span>
              <div className="space-y-1">
                {[
                  { label: 'Roles & Permissions', icon: Shield },
                  { label: 'Notifications', icon: Bell }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all duration-150 text-left">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-sm font-bold transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-10 space-y-8 min-w-0">
        
        {/* Top Navbar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 font-display">Super Admin Dashboard</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">
              BatchMinder ERP &bull; <span className="text-slate-600">Dashboard</span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-start">
            {/* Date Pill */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-600 text-xs font-bold shadow-sm">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{currentDate || 'Loading date...'}</span>
            </div>

            {/* Notifications Alert Pill */}
            <button className="h-10 w-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-sm relative transition-colors focus:outline-none">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-5 w-5 bg-rose-500 border border-white text-white text-[10px] font-black rounded-full flex items-center justify-center">
                7
              </span>
            </button>

            {/* Live Indicator Pill */}
            <div className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl bg-emerald-550 bg-emerald-600 text-white text-xs font-bold tracking-wider uppercase shadow-md shadow-emerald-600/10">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Live System
            </div>

            {/* Logout (Visible on mobile/tablet where sidebar is hidden) */}
            <button 
              onClick={onLogout}
              className="lg:hidden h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center focus:outline-none hover:bg-rose-100 transition-colors"
              title="Log Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* 8 Grid Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between h-[145px]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{m.title}</span>
                    <h3 className="text-3xl font-extrabold text-slate-800 mt-2 font-display">{m.value}</h3>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${m.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className={`text-xs font-bold ${m.footerColor} pt-2 border-t border-slate-50 mt-auto`}>
                  {m.footer}
                </div>
              </div>
            );
          })}
        </section>

        {/* Bottom Widgets layout */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Department Overview Widget */}
          <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-900">Department Overview</h3>
              </div>
              <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus:outline-none">
                <span>Manage Depts</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-6 flex-1 justify-center flex flex-col">
              {depts.map((d, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-800">{d.name}</span>
                    <span className="text-slate-500 font-bold">{d.students} Students</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.color} ${d.width}`} />
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
                    {d.stats}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Widget */}
          <div className="xl:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, i) => {
                const ActionIcon = action.icon;
                return (
                  <button 
                    key={i} 
                    className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-350 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all text-center focus:outline-none shadow-sm group"
                  >
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${action.bg} group-hover:scale-105 transition-transform`}>
                      <ActionIcon className={`h-5.5 w-5.5 ${action.iconColor}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 tracking-tight">{action.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}
