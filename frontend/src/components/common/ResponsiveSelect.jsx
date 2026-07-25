import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function ResponsiveSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  label = '',
  className = '',
  style = {},
  disabled = false,
  searchable = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Normalize options array into [{ value, label }]
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : opt.name || String(opt.value)
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(
    opt => String(opt.value) === String(value)
  ) || (value === '' || value === 'all' ? normalizedOptions.find(opt => opt.value === '' || opt.value === 'all') : null);

  const displayLabel = selectedOption ? selectedOption.label : (normalizedOptions.length > 0 && (value === '' || value === 'all' || !value) ? normalizedOptions[0].label : placeholder);

  // Filter options if search is enabled
  const filteredOptions = (searchable || normalizedOptions.length > 7) && searchTerm.trim()
    ? normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange({ target: { value: optionValue } });
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative inline-block ${className}`} style={{ minWidth: '130px', ...style }} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          fontFamily: 'inherit'
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Inline Dropdown Menu (Universal for Desktop & Mobile) */}
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1 min-w-full w-max max-w-[280px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-scaleIn overflow-hidden"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Optional Search */}
          {(searchable || normalizedOptions.length > 7) && (
            <div className="px-2 pb-1.5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500 bg-slate-50"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Scrollable Options List */}
          <div className="max-h-56 overflow-y-auto thin-scrollbar p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
