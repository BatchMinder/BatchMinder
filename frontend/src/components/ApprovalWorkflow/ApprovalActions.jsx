import React, { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';

export default function ApprovalActions({ requestId, mode = 'hod', onSuccess, onCancel }) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAction = async (isApprove) => {
    if (!isApprove && (!remarks || remarks.trim() === '')) {
      setError('Remarks are required when rejecting a request.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isApprove
        ? `/api/${mode}/approve/${requestId}`
        : `/api/${mode}/reject/${requestId}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarks.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        if (onSuccess) onSuccess(data.data.request);
      } else {
        setError(data.message || `Failed to ${isApprove ? 'approve' : 'reject'} the request.`);
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          style={{
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: '#94A3B8',
            letterSpacing: '0.5px',
          }}
        >
          Approval/Rejection Remarks
        </label>
        <textarea
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value);
            if (error) setError('');
          }}
          placeholder={
            mode === 'hod'
              ? 'Enter HOD decision comments here... (Required for rejection)'
              : 'Enter Advisor recommendation comments here... (Required for rejection)'
          }
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
            color: '#1E293B',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'vertical',
            transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
          onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: '10px', 
        justifyContent: 'flex-end', 
        alignItems: 'stretch' 
      }}>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
              width: isMobile ? '100%' : 'auto',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            Cancel
          </button>
        )}

        <button
          onClick={() => handleAction(false)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(239,68,68,0.1)',
            width: isMobile ? '100%' : 'auto',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
        >
          <X size={15} />
          <span>Reject</span>
        </button>

        <button
          onClick={() => handleAction(true)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(16,185,129,0.1)',
            width: isMobile ? '100%' : 'auto',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
        >
          {loading ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <Check size={15} />
          )}
          <span>Approve</span>
        </button>
      </div>
    </div>
  );
}
