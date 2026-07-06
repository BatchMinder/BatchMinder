import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Users, AlertTriangle, BookOpen, Activity } from 'lucide-react';

const COLORS = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };

export default function Dashboard({ departments, selectedDept }) {
  const [stats, setStats] = useState(null);
  const [cgpaDist, setCgpaDist] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, cgpaRes, batchRes, trendRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/cgpa-distribution'),
        fetch('/api/dashboard/students-by-batch'),
        fetch('/api/dashboard/at-risk-trend'),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
      if (cgpaRes.ok) {
        const d = await cgpaRes.json();
        setCgpaDist(d.data);
      }
      if (batchRes.ok) {
        const d = await batchRes.json();
        setBatchData(d.data);
      }
      if (trendRes.ok) {
        const d = await trendRes.json();
        setTrendData(d.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDept]);

  if (loading && !stats) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading dashboard...</div>;
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Active Students', value: stats?.activeStudents || 0, icon: Activity, color: '#10B981', bg: '#F0FDF4' },
    { label: 'At-Risk Students', value: stats?.atRiskStudents || 0, icon: AlertTriangle, color: '#EF4444', bg: '#FFF1F2' },
    { label: 'Total Batches', value: stats?.totalBatches || 0, icon: BookOpen, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  const pieData = cgpaDist
    ? cgpaDist.labels.map((label, i) => ({ name: label.charAt(0).toUpperCase() + label.slice(1), value: cgpaDist.counts[i] }))
    : [];

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20,
              display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={card.color} />
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {card.label}
                </p>
                <h3 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>
                  {card.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* CGPA Distribution Donut */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>CGPA Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 13 }}>No data available</div>
          )}
        </div>

        {/* Students by Batch Bar */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Students by Batch</h3>
          {batchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={batchData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="batchCode" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" name="Active" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="atRisk" name="At Risk" fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 13 }}>No data available</div>
          )}
        </div>
      </div>

      {/* At-Risk Trend Line */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>At-Risk Trend (12 Months)</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="warning" name="Warning" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="critical" name="Critical" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 13 }}>No trend data available yet</div>
        )}
      </div>
    </div>
  );
}
