import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, SlidersHorizontal, Plus, RefreshCw,
  FileText, Clock, AlertCircle, ArrowRight
} from 'lucide-react';
import { CircularProgress } from '@mui/material';
import RequestDetail from '../../components/ApprovalWorkflow/RequestDetail';
import SpecialPermissionForm from '../../components/ApprovalWorkflow/SpecialPermissionForm';

import EditRequestModal from '../../components/ApprovalWorkflow/EditRequestModal';

export default function HODQueue() {
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State variables
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');

  // Split-pane selection state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  // Fetch pending requests
  const fetchRequests = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    try {
      const res = await fetch('/api/hod/requests');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const list = data.data.requests || [];
        setRequests(list);
        if (list.length > 0 && !selectedRequest) {
          setSelectedRequest(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch HOD pending requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Poll for updates every 10 seconds (FR-4.1 requirement)
  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleReviewSuccess = (updatedRequest) => {
    setSelectedRequest(null);
    fetchRequests();
  };

  // Filter requests locally by search query and type
  const filteredRequests = requests.filter((r) => {
    const student = r.studentId || {};
    const matchesSearch =
      (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = requestTypeFilter === '' || r.requestType === requestTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px', fontFamily: "'Inter', sans-serif" }}>

      {/* Overview Stats & Quick Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px' }}>
            Approvals Queue
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
              Pending Course Requests
            </h2>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                fontWeight: 700,
                fontSize: '13px',
                padding: '4px 10px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {requests.length} Pending
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Refresh Action */}
          <button
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Queue</span>
          </button>

          {/* Special Permission Bypass Toggle Button (FR-4.3 requirement) */}
          <button
            onClick={() => setShowSpecialForm(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
          >
            <Plus size={16} />
            <span>Grant Special Permission</span>
          </button>
        </div>
      </div>

      {/* Split-pane Workspace Layout */}
      <div className={`grid grid-cols-1 ${selectedRequest ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)]' : ''} gap-5 transition-all duration-200 items-start`}>

        {/* Left Column: Requests List Table Card */}
        <div
          style={{
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Table Filters header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Search bar */}
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search student, ID, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  width: '240px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Dropdown Filter by request type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={14} color="#64748B" />
              <select
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#475569',
                  backgroundColor: '#FFFFFF',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">All Request Types</option>
                <option value="Prerequisite Bypass">Prerequisite Bypass</option>
                <option value="Credit Limit Extension">Credit Limit Extension</option>
                <option value="Duplicate Course">Duplicate Course</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Roll Number</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Student</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Requested Course</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Request Type</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Advisor Recommendation</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '50px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <CircularProgress size={24} />
                        <span style={{ fontSize: '13px', color: '#64748B' }}>Loading request queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '50px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Clock size={36} color="#94A3B8" />
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#475569' }}>Queue is Clear</h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#94A3B8' }}>No requests are currently waiting for HOD approval.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => {
                    const student = r.studentId || {};
                    const advisor = r.advisorId || {};
                    return (
                      <tr key={r._id} style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: selectedRequest?._id === r._id ? '#EFF6FF' : 'transparent'
                      }}>
                        <td style={{ padding: '14px 24px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                          {student.rollNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>{student.name || 'N/A'}</span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>CGPA: {student.cgpa !== undefined ? student.cgpa.toFixed(2) : 'N/A'} &bull; Sem: {student.currentSemester}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>{r.courseCode}</span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>{r.courseTitle} &bull; {r.creditHours} Cr. Hr.</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '3px 8px', borderRadius: '6px' }}>
                            {r.requestType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>Approved by {advisor.name || 'Advisor'}</span>
                            {r.advisorRemarks && (
                              <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.advisorRemarks}>
                                "{r.advisorRemarks}"
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingRequest(r); }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid #F59E0B',
                                backgroundColor: '#FFFFFF',
                                color: '#F59E0B',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F59E0B'; e.currentTarget.style.color = '#FFFFFF'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#F59E0B'; }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedRequest(r); }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid #2563EB',
                                backgroundColor: '#FFFFFF',
                                color: '#2563EB',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.color = '#FFFFFF'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#2563EB'; }}
                            >
                              <span>Review</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Request Detail Inline Panel */}
        {selectedRequest && (
          !isMobile ? (
            <div className="sticky top-6 thin-scrollbar" style={{ minWidth: 0, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              <RequestDetail
                request={selectedRequest}
                userRole="hod"
                onClose={() => setSelectedRequest(null)}
                onActionSuccess={handleReviewSuccess}
                inline={true}
              />
            </div>
          ) : (
            <RequestDetail
              request={selectedRequest}
              userRole="hod"
              onClose={() => setSelectedRequest(null)}
              onActionSuccess={handleReviewSuccess}
              inline={false}
            />
          )
        )}
      </div>

      {/* Special Permission Bypass Form Modal Dialog */}
      {showSpecialForm && (
        <SpecialPermissionForm
          onClose={() => setShowSpecialForm(false)}
          onSuccess={() => {
            fetchRequests();
          }}
        />
      )}

      {/* Edit Request Modal */}
      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSuccess={(updatedRequest) => {
            setEditingRequest(null);
            fetchRequests();
            if (selectedRequest && selectedRequest._id === updatedRequest._id) {
              setSelectedRequest(updatedRequest);
            }
          }}
        />
      )}
    </div>
  );
}
