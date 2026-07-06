// src/components/intelligentScheduling/GenerateButton.jsx
import React from 'react';
import { Cpu } from 'lucide-react';

export default function GenerateButton({ onClick, loading }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#FFF',
                backgroundColor: loading ? '#94A3B8' : '#1B3A6B',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}
        >
            <Cpu size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Generating Matrix...' : 'Generate Schedule Matrix'}</span>
        </button>
    );
}