import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, RefreshCw, AlertTriangle,
  CheckCircle, Activity, ShieldAlert, Users
} from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';

export default function AdvisorRiskDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStanding, setFilterStanding] = useState('all');
  const [filterIntake, setFilterIntake] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/advisor/students?limit=200');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStudents(data.data.students || []);
      }
    } catch (e) {
      console.error('Failed to fetch advisor students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSelectStudent = (studentId) => {
    const student = students.find(s => s._id === studentId || s.id === studentId);
    if (student) setSelectedStudent(student);
  };

  // Filter students based on search and standing
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const standing = (s.cgpaStatus || 'good').toLowerCase();

    const matchesFilter =
      filterStanding === 'all' ||
      (filterStanding === 'good' && standing === 'good') ||
      (filterStanding === 'warning' && standing === 'warning') ||
      (filterStanding === 'critical' && standing === 'critical');

    const matchesIntake =
      filterIntake === 'all' ||
      (s.intakeSession === filterIntake);

    return matchesSearch && matchesFilter && matchesIntake;
  });

  // Recommendation builder
  const getAdvisorRecommendations = (riskLevel) => {
    if (riskLevel === 'CRITICAL') {
      return [
        'Mandatory weekly academic advising check-ins.',
        'Cap next semester registration load to a maximum of 12 credit hours.',
        'Direct referral to peer tutoring and department helpdesk for core courses.',
        'Formal advisory contract with student specifying performance thresholds.'
      ];
    } else if (riskLevel === 'WARNING') {
      return [
        'Advise student to restrict enrollment to 15 credit hours next semester.',
        'Recommend scheduling bi-weekly meetings to review quiz/assignment marks.',
        'Encourage attending faculty office hours for guidance on difficult topics.'
      ];
    }
    return [
      'Student is performing within safe boundaries.',
      'Maintain standard 18 credit hours registration allowance.',
      'Continue general supervision.'
    ];
  };

  // Metrics summary
  const totalStudents = students.length;
  const criticalCount = students.filter(s => s.cgpaStatus === 'critical').length;
  const warningCount = students.filter(s => s.cgpaStatus === 'warning').length;
  const goodCount = students.filter(s => s.cgpaStatus === 'good' || !s.cgpaStatus).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px' }}>
            System Monitoring
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={24} color="#2563EB" /> Academic Risk Monitoring
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Monitor academically at-risk students based on systematic CGPA thresholds and advising guidelines.
          </p>
        </div>
        <button
          onClick={fetchStudents}
          style={{
            padding: '10px 16px', borderRadius: '12px', border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Reload Batch</span>
        </button>
      </div>

      {/* Metrics Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Batch Size', value: totalStudents, bg: '#EFF6FF', color: '#2563EB', icon: Users },
          { label: 'Good Standing', value: goodCount, bg: '#F0FDF4', color: '#16A34A', icon: CheckCircle },
          { label: 'Critical Standings', value: criticalCount, bg: '#FEF2F2', color: '#EF4444', icon: ShieldAlert },
          { label: 'Warning Standings', value: warningCount, bg: '#FFFBEB', color: '#D97706', icon: AlertTriangle }
        ].map(({ label, value, bg, color, icon: Icon }) => (
          <div key={label} style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px',
            padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#1F2937' }}>
              {loading ? '...' : value}
            </h3>
          </div>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className={`grid grid-cols-1 ${selectedStudent ? 'lg:grid-cols-[1.2fr_0.8fr]' : ''} gap-5 transition-all duration-200`}>

        {/* Left Side: Directory Table */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column'
        }}>
          {/* Table Toolbar */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search name or roll number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #CBD5E1',
                  fontSize: '13px', outline: 'none', width: '240px', color: '#1E293B', fontFamily: 'inherit'
                }}
              />
            </div>

            <ResponsiveSelect
              value={filterStanding}
              onChange={e => setFilterStanding(e.target.value)}
              options={[
                { value: 'all', label: 'All Standings' },
                { value: 'good', label: 'Good Standing' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical Risk' }
              ]}
            />

            <ResponsiveSelect
              value={filterIntake}
              onChange={e => setFilterIntake(e.target.value)}
              options={[
                { value: 'all', label: 'All Intakes' },
                { value: 'Fall', label: 'Fall' },
                { value: 'Spring', label: 'Spring' }
              ]}
            />
          </div>

          {/* Student Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Roll Number</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Semester</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>CGPA</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Standing</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      <CircularProgress size={20} style={{ marginRight: '8px' }} /> Loading student directory...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      No student records match search filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => {
                    const standing = (s.currentSemester === 1 ? 'GOOD' : (s.cgpaStatus || 'good').toUpperCase());

                    const config = {
                      'GOOD': { text: '#059669', bg: '#E6F4EA', label: 'Good Standing' },
                      'GOOD STANDING': { text: '#059669', bg: '#E6F4EA', label: 'Good Standing' },
                      'WARNING': { text: '#D97706', bg: '#FEF7E0', label: 'Warning' },
                      'CRITICAL': { text: '#DC2626', bg: '#FCE8E6', label: 'Critical' }
                    }[standing] || { text: '#475569', bg: '#F1F3F4', label: standing };

                    return (
                      <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: selectedStudent?._id === s._id ? '#EFF6FF' : 'transparent' }}>
                        <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 700, color: '#1B3A6B' }}>
                          {s.rollNumber}
                        </td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#475569' }}>
                          Semester {s.currentSemester}
                        </td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                          {s.currentSemester === 1 ? 'N/A' : s.cgpa.toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                            color: config.text, backgroundColor: config.bg, display: 'inline-block'
                          }}>
                            {config.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleSelectStudent(s._id)}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12px',
                              fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', gap: '4px'
                            }}
                          >
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Status Report Panel */}
        {selectedStudent && (
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', height: 'fit-content'
          }}>
            {/* Report Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>System Risk Profile</h3>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>{selectedStudent.name} &bull; {selectedStudent.rollNumber}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>

            {/* Report Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Score Indicator & Level Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Academic Standing</span>
                  <h4 style={{
                    margin: 0, fontSize: '24px', fontWeight: 800,
                    color: (selectedStudent.cgpaStatus || 'good').toUpperCase() === 'CRITICAL' ? '#DC2626' : (selectedStudent.cgpaStatus || 'good').toUpperCase() === 'WARNING' ? '#D97706' : '#059669'
                  }}>
                    {(selectedStudent.cgpaStatus || 'Good').toUpperCase()}
                  </h4>
                </div>
              </div>

              {/* Advisor recommendations */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Advising Guidelines
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.4 }}>
                  {getAdvisorRecommendations((selectedStudent.cgpaStatus || 'good').toUpperCase()).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}