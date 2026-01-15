import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

export default function DatePicker({ 
  value, 
  onChange, 
  label,
  placeholder = 'Select date',
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        // Check if clicking inside the portal dropdown
        const dropdown = document.getElementById('date-picker-dropdown');
        if (dropdown && dropdown.contains(e.target)) return;
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (isOpen) updatePosition();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.right - 288, window.innerWidth - 300) // 288 = dropdown width, align right
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(!isOpen);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formatDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
    });
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formatted = selectedDate.toISOString().split('T')[0];
    onChange({ target: { value: formatted } });
    setIsOpen(false);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSelected = (day) => {
    if (!day || !value) return false;
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
    return dateStr === value;
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const dropdown = isOpen && createPortal(
    <div 
      id="date-picker-dropdown"
      className="fixed w-72 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scaleIn"
      style={{ top: position.top, left: position.left, zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
        >
          <Icon icon="mdi:chevron-left" className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
        >
          <Icon icon="mdi:chevron-right" className="w-5 h-5" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 text-center text-xs text-[var(--color-text-muted)] py-2 border-b border-[var(--color-border)]">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="py-1 font-medium">{day}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {days.map((day, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleDayClick(day)}
            disabled={!day}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              !day 
                ? '' 
                : isSelected(day)
                  ? 'bg-indigo-600 text-white'
                  : isToday(day)
                    ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                    : 'hover:bg-[var(--color-bg-elevated)] text-[var(--color-text)]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="p-2 border-t border-[var(--color-border)] flex gap-2">
        <button
          type="button"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            onChange({ target: { value: today } });
            setIsOpen(false);
          }}
          className="flex-1 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            onChange({ target: { value: '' } });
            setIsOpen(false);
          }}
          className="flex-1 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="min-w-[130px] flex items-center justify-between gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-left px-3 py-2 rounded-lg transition-all hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      >
        <div className="flex items-center gap-2">
          <Icon icon="mdi:calendar" className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className={`text-sm whitespace-nowrap ${value ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        <Icon 
          icon="mdi:chevron-down" 
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      {dropdown}
    </div>
  );
}
