import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, SlidersHorizontal, Brain, Play, RefreshCw, AlertTriangle,
  CheckCircle, ChevronRight, Activity, Calendar, ShieldAlert, AlertCircle, Sparkles, Users
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function AdvisorRiskDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [predictions, setPredictions] = useState({}); // studentId -> prediction result
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStanding, setFilterStanding] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [predictingId, setPredictingId] = useState(null);

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

  const handlePredictRisk = async (studentId) => {
    setPredictingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const result = data.data;
        setPredictions(prev => ({ ...prev, [studentId]: result }));
        
        // Find student details and set as currently selected prediction report
        const student = students.find(s => s._id === studentId);
        if (student) {
          setSelectedStudent(student);
          setSelectedPrediction(result);
        }
      } else {
        alert(data.message || 'Risk prediction request failed.');
      }
    } catch (e) {
      console.error('Error triggering AI prediction:', e);
      alert('Network error analyzing academic risk.');
    } finally {
      setPredictingId(null);
    }
  };

  // Filter students based on search and standing standing
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const pred = predictions[s._id];
    const standing = pred ? pred.riskLevel.toLowerCase() : (s.cgpaStatus || 'good').toLowerCase();

    const matchesFilter =
      filterStanding === 'all' ||
      (filterStanding === 'good' && standing === 'good standing' || standing === 'good') ||
      (filterStanding === 'warning' && standing === 'warning') ||
      (filterStanding === 'critical' && standing === 'critical') ||
      (filterStanding === 'unpredicted' && !pred);

    return matchesSearch && matchesFilter;
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
  const criticalCount = students.filter(s => {
    const pred = predictions[s._id];
    return pred ? pred.riskLevel === 'CRITICAL' : s.cgpaStatus === 'critical';
  }).length;
  const warningCount = students.filter(s => {
    const pred = predictions[s._id];
    return pred ? pred.riskLevel === 'WARNING' : s.cgpaStatus === 'warning';
  }).length;
  const predictedCount = Object.keys(predictions).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px' }}>
            AI Assistant Center
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={24} color="#2563EB" /> AI Academic Risk Forecaster
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Predict academically at-risk students, examine performance trends, and retrieve dynamic advising recommendations.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Batch Size', value: totalStudents, bg: '#EFF6FF', color: '#2563EB', icon: Users },
          { label: 'AI Predictions Run', value: predictedCount, bg: '#F5F3FF', color: '#7C3AED', icon: Activity },
          { label: 'AI Critical Risk Standings', value: criticalCount, bg: '#FEF2F2', color: '#EF4444', icon: ShieldAlert },
          { label: 'AI Warning Standings', value: warningCount, bg: '#FFFBEB', color: '#D97706', icon: AlertTriangle }
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
      <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1.2fr 0.8fr' : '1fr', gap: '20px', transition: 'all 0.2s' }}>
        
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

            <select
              value={filterStanding}
              onChange={e => setFilterStanding(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1',
                fontSize: '13px', color: '#475569', backgroundColor: '#FFFFFF', cursor: 'pointer', outline: 'none', fontFamily: 'inherit'
              }}
            >
              <option value="all">All Standings</option>
              <option value="good">AI Good Standing</option>
              <option value="warning">AI Warning</option>
              <option value="critical">AI Critical Risk</option>
              <option value="unpredicted">Not Predicted Yet</option>
            </select>
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
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>AI Forecasting Status</th>
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
                    const pred = predictions[s._id];
                    const standing = pred ? pred.riskLevel : (s.cgpaStatus || 'good').toUpperCase();

                    const config = {
                      'GOOD': { text: '#059669', bg: '#E6F4EA', label: 'Good Standing' },
                      'GOOD STANDING': { text: '#059669', bg: '#E6F4EA', label: 'Good Standing' },
                      'WARNING': { text: '#D97706', bg: '#FEF7E0', label: 'Warning' },
                      'CRITICAL': { text: '#DC2626', bg: '#FCE8E6', label: 'Critical' }
                    }[standing] || { text: '#475569', bg: '#F1F3F4', label: standing };

                    const isPredicting = predictingId === s._id;

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
                          {s.cgpa.toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                            color: config.text, backgroundColor: config.bg, display: 'inline-block'
                          }}>
                            {config.label}
                          </span>
                          {pred && (
                            <span style={{ display: 'block', fontSize: '9px', color: '#94A3B8', marginTop: '2px' }}>
                              Score: {Math.round(pred.riskScore * 100)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <button
                            onClick={() => handlePredictRisk(s._id)}
                            disabled={isPredicting || predictingId !== null}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12px',
                              fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', gap: '4px', opacity: (isPredicting || predictingId !== null) ? 0.6 : 1
                            }}
                          >
                            {isPredicting ? (
                              <CircularProgress size={12} color="inherit" />
                            ) : (
                              <Play size={12} fill="#FFF" />
                            )}
                            <span>Analyze</span>
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

        {/* Right Side: Prediction Report Panel */}
        {selectedStudent && selectedPrediction && (
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', height: 'fit-content'
          }}>
            {/* Report Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>AI Diagnostic Profile</h3>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>{selectedStudent.name} &bull; {selectedStudent.rollNumber}</p>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setSelectedPrediction(null); }}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>

            {/* Report Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Prediction Limitation Check (Alternative Flow 4.1 & 4.2) */}
              {selectedPrediction.message === 'Insufficient data for prediction' || (selectedPrediction.historicalCGPA && selectedPrediction.historicalCGPA.length < 2) ? (
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', gap: '10px' }}>
                  <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#92400E' }}>Prediction Limitation Notice</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B45309', lineHeight: 1.4 }}>
                      Historical academic data points: <b>{selectedPrediction.historicalCGPA?.length || 1}</b>.<br />
                      AI forecaster models require at least 2 historical semesters of academic progression data to run. Standing is currently advisory based on static standing.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Score Indicator & Level Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Academic Risk Score</span>
                      <h4 style={{
                        margin: 0, fontSize: '24px', fontWeight: 800,
                        color: selectedPrediction.riskLevel === 'CRITICAL' ? '#DC2626' : selectedPrediction.riskLevel === 'WARNING' ? '#D97706' : '#059669'
                      }}>
                        {Math.round(selectedPrediction.riskScore * 100)}% Risk
                      </h4>
                      <span style={{
                        alignSelf: 'flex-start', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800,
                        color: selectedPrediction.riskLevel === 'CRITICAL' ? '#DC2626' : selectedPrediction.riskLevel === 'WARNING' ? '#D97706' : '#059669',
                        backgroundColor: selectedPrediction.riskLevel === 'CRITICAL' ? '#FCE8E6' : selectedPrediction.riskLevel === 'WARNING' ? '#FEF7E0' : '#E6F4EA',
                        marginTop: '4px'
                      }}>
                        {selectedPrediction.riskLevel}
                      </span>
                    </div>
                    {/* Ring Visualization */}
                    <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="60" height="60" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="#E2E8F0" strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={selectedPrediction.riskLevel === 'CRITICAL' ? '#DC2626' : selectedPrediction.riskLevel === 'WARNING' ? '#D97706' : '#059669'}
                          strokeWidth="3.2"
                          strokeDasharray={`${Math.round(selectedPrediction.riskScore * 100)}, 100`}
                        />
                      </svg>
                      <Brain size={16} style={{ position: 'absolute' }} color="#94A3B8" />
                    </div>
                  </div>

                  {/* Engine Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', color: '#64748B', backgroundColor: '#FAFAFA', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>AI Model Service</span>
                      <span style={{
                        fontWeight: 700,
                        color: selectedPrediction.serviceStatus === 'ONLINE' ? '#059669' : '#D97706'
                      }}>
                        {selectedPrediction.serviceStatus === 'ONLINE' ? 'ONLINE (ML Cluster)' : 'LOCAL FALLBACK'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Diagnostic Time</span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>
                        {selectedPrediction.predictedAt ? new Date(selectedPrediction.predictedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Advisor recommendations */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={13} color="#2563EB" /> Advisor Advisory Guidance
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.4 }}>
                      {getAdvisorRecommendations(selectedPrediction.riskLevel).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
