import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option',
  className = '',
  minWidth = '180px'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue) => {
    onChange({ target: { value: optValue } });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-left px-3 py-2 rounded-lg transition-all hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      >
        <span className={`text-sm truncate ${selectedOption ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <Icon 
          icon="mdi:chevron-down" 
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
          className="absolute z-[100] w-full min-w-max mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fadeIn"
          style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
        >
          <div className="py-2 max-h-60 overflow-y-auto">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors text-sm ${
                  value === option.value
                    ? 'bg-[#3b82f6] text-white'
                    : 'text-[var(--color-text)] hover:bg-[#3b82f6] hover:text-white'
                }`}
                style={{ animation: `fadeSlideIn 0.2s ease-out ${index * 0.03}s both` }}
              >
                {option.icon && <Icon icon={option.icon} className="w-4 h-4 shrink-0" />}
                <span className="whitespace-nowrap">{option.label}</span>
                {value === option.value && (
                  <Icon icon="mdi:check" className="w-4 h-4 ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
