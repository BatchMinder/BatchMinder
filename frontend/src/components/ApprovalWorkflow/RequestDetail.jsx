import React from 'react';
import { X, Calendar, AlertTriangle, ShieldCheck, User, Info, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ApprovalActions from './ApprovalActions';

export default function RequestDetail({ request, userRole = 'hod', onClose, onActionSuccess }) {
  if (!request) return null;

  const student = request.studentId || {};
  const advisor = request.advisorId || {};
  const isPendingHODDecision = request.status === 'advisor_approved' && userRole === 'hod';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {request.requestType}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Request Review &bull; {request.courseCode}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: '#F8FAFC',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Student Profile Overview */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Student Name</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{student.name || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Roll Number</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{student.rollNumber || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Current CGPA</span>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: student.cgpaStatus === 'critical' ? '#EF4444' : student.cgpaStatus === 'warning' ? '#F59E0B' : '#10B981',
                }}
              >
                {student.cgpa !== undefined ? student.cgpa.toFixed(2) : 'N/A'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Semester</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{student.currentSemester || 'N/A'}</p>
            </div>
          </div>

          {/* Requested Course Information */}
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Requested Course
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  height: '42px',
                  width: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4F46E5',
                  flexShrink: 0,
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                  {request.courseTitle} ({request.courseCode})
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Credit Hours: <span style={{ fontWeight: 700 }}>{request.creditHours}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Warnings and Verifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Prerequisite Check */}
            {request.prereqCheck && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: request.prereqCheck.includes('Pass') || request.prereqCheck.includes('Met') ? '#ECFDF5' : '#FFFBEB',
                  border: `1px solid ${request.prereqCheck.includes('Pass') || request.prereqCheck.includes('Met') ? '#A7F3D0' : '#FDE68A'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {request.prereqCheck.includes('Pass') || request.prereqCheck.includes('Met') ? (
                  <ShieldCheck size={16} color="#10B981" />
                ) : (
                  <AlertTriangle size={16} color="#F59E0B" />
                )}
                <span style={{ fontSize: '12px', color: request.prereqCheck.includes('Pass') || request.prereqCheck.includes('Met') ? '#065F46' : '#92400E', fontWeight: 600 }}>
                  Prerequisite status: {request.prereqCheck}
                </span>
              </div>
            )}

            {/* Duplicate Warning */}
            {request.duplicateWarning && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECDD3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={16} color="#EF4444" />
                <span style={{ fontSize: '12px', color: '#9F1239', fontWeight: 600 }}>
                  Warning: {request.duplicateWarning}
                </span>
              </div>
            )}
          </div>

          {/* Student Justification */}
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Student Justification
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#475569',
                backgroundColor: '#FAFAFA',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #F1F5F9',
                lineHeight: '1.5',
              }}
            >
              {request.justification}
            </p>
          </div>

          {/* Advisor Remarks */}
          {userRole === 'hod' && request.advisorRemarks && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Advisor Recommendation Comments
              </h3>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  fontSize: '13px',
                  color: '#1E3A8A',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px' }}>{advisor.name || 'Batch Advisor'}</span>
                  <span style={{ fontSize: '11px', color: '#3B82F6' }}>{advisor.email}</span>
                </div>
                <p style={{ margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{request.advisorRemarks}"
                </p>
              </div>
            </div>
          )}

          {/* HOD Remarks (if already decided) */}
          {request.hodRemarks && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HOD Decision Remarks
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#4F46E5',
                  backgroundColor: '#EEF2FF',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #E0E7FF',
                  lineHeight: '1.5',
                }}
              >
                {request.hodRemarks}
              </p>
            </div>
          )}

          {/* Render Action Buttons for HOD approval */}
          {isPendingHODDecision && (
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '20px', marginTop: '4px' }}>
              <ApprovalActions
                requestId={request._id}
                mode="hod"
                onSuccess={onActionSuccess}
                onCancel={onClose}
              />
            </div>
          )}
        </div>

        {/* Default Footer for read-only viewing */}
        {!isPendingHODDecision && (
          <div
            style={{
              padding: '16px 28px',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              justifyContent: 'flex-end',
              borderBottomLeftRadius: '24px',
              borderBottomRightRadius: '24px',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Close Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
