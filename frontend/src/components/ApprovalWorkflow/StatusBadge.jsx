import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, Award } from 'lucide-react';

export default function StatusBadge({ status }) {
  const getBadgeStyle = (statusStr) => {
    switch (statusStr?.toLowerCase()) {
      case 'approved':
      case 'hod_approved':
        return {
          text: '#047857',
          bg: '#E6F4EA',
          border: '1px solid rgba(4,120,87,0.15)',
          label: 'HOD Approved',
          icon: CheckCircle2,
        };
      case 'advisor_approved':
        return {
          text: '#0284C7',
          bg: '#E0F2FE',
          border: '1px solid rgba(2,132,199,0.15)',
          label: 'Advisor Approved',
          icon: Clock,
        };
      case 'rejected':
      case 'hod_rejected':
        return {
          text: '#B91C1C',
          bg: '#FCE8E6',
          border: '1px solid rgba(185,28,28,0.15)',
          label: 'HOD Rejected',
          icon: XCircle,
        };
      case 'advisor_rejected':
        return {
          text: '#D97706',
          bg: '#FEF3C7',
          border: '1px solid rgba(217,119,6,0.15)',
          label: 'Advisor Rejected',
          icon: AlertCircle,
        };
      case 'special_granted':
        return {
          text: '#7C3AED',
          bg: '#F3E8FF',
          border: '1px solid rgba(124,58,237,0.15)',
          label: 'Special Granted',
          icon: Award,
        };
      case 'pending':
      default:
        return {
          text: '#475569',
          bg: '#F1F5F9',
          border: '1px solid rgba(71,85,105,0.15)',
          label: 'Pending Advisor',
          icon: Clock,
        };
    }
  };

  const config = getBadgeStyle(status);
  const IconComponent = config.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: config.text,
        backgroundColor: config.bg,
        border: config.border,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <IconComponent size={12} />
      {config.label}
    </span>
  );
}
