import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function CustomDatePicker({ value, onChange, placeholder = 'Select date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef(null);

  // Parse current value or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [currentYear, setCurrentYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth());

  // Close on click outside & dynamically calculate dropdown alignment
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.left + 110 > window.innerWidth) { // 110 is half of 220px popup width
          setAlignRight(true);
        } else if (rect.left + 220 > window.innerWidth) {
          setAlignRight(true);
        } else {
          setAlignRight(false);
        }
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (day) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    if (onChange) {
      onChange({ target: { value: dateStr } });
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    setIsOpen(false);
  };

  // Generate calendar days grid
  const daysGrid = [];
  // Empty slots for days before the first of the month
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i);
  }

  // Format displaying value
  const displayValue = value ? (() => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  })() : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input Field wrapper */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '32px',
          boxSizing: 'border-box',
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '11px',
          fontWeight: 600,
          color: '#1E293B',
          backgroundColor: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
        }}
      >
        <span style={{ color: value ? '#1E293B' : '#94A3B8', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {displayValue || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && (
            <X 
              size={12} 
              color="#94A3B8" 
              onClick={handleClear}
              style={{ cursor: 'pointer', padding: '2px', borderRadius: '50%' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            />
          )}
          <CalendarIcon size={12} color="#64748B" />
        </div>
      </div>

      {/* Custom Calendar Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: alignRight ? 'auto' : 0,
          right: alignRight ? 0 : 'auto',
          marginTop: '4px',
          width: '220px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          zIndex: 9999,
          padding: '10px',
          fontFamily: 'inherit'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button 
              type="button"
              onClick={handlePrevMonth}
              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={14} color="#64748B" />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B' }}>
              {months[currentMonth]} {currentYear}
            </span>
            <button 
              type="button"
              onClick={handleNextMonth}
              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={14} color="#64748B" />
            </button>
          </div>

          {/* Weekday Names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '4px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <span key={day} style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8' }}>{day}</span>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const formattedMonth = String(currentMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const cellDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
              const isSelected = value === cellDateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  style={{
                    border: 'none',
                    borderRadius: '6px',
                    height: '24px',
                    fontSize: '10px',
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? '#2563EB' : 'transparent',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
