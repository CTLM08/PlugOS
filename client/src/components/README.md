# PlugOS UI Component Library

This document provides usage examples and API documentation for the reusable UI components available in the PlugOS client application.

---

## Table of Contents

1. [DatePicker](#datepicker)
2. [CustomSelect](#customselect)
3. [ConfirmModal](#confirmmodal)
4. [useBodyScrollLock](#usebodyscrolllock-hook)

---

## DatePicker

A beautiful, animated calendar date picker component with portal rendering for proper z-index handling.

### Import

```jsx
import DatePicker from '../components/DatePicker';
```

### Basic Usage

```jsx
const [selectedDate, setSelectedDate] = useState('');

<DatePicker
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  placeholder="Select date"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Selected date in `YYYY-MM-DD` format |
| `onChange` | `function` | required | Callback when date changes. Receives `{ target: { value } }` |
| `placeholder` | `string` | `'Select date'` | Placeholder text when no date selected |
| `label` | `string` | - | Optional label above the picker |
| `className` | `string` | `''` | Additional CSS classes |

### Features

- ✅ Calendar popup with month navigation
- ✅ "Today" quick action button
- ✅ "Clear" button to reset selection
- ✅ Highlights current day and selected date
- ✅ Auto-positions to stay within viewport
- ✅ Portal rendering (renders outside normal DOM flow)
- ✅ Closes on outside click

### Example with Form

```jsx
function LeaveForm() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="flex gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Start Date</label>
        <DatePicker
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start date"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">End Date</label>
        <DatePicker
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End date"
        />
      </div>
    </div>
  );
}
```

---

## CustomSelect

A styled dropdown select component with icons, animations, and proper keyboard/click handling.

### Import

```jsx
import CustomSelect from '../components/CustomSelect';
```

### Basic Usage

```jsx
const [role, setRole] = useState('employee');

<CustomSelect
  value={role}
  onChange={(e) => setRole(e.target.value)}
  placeholder="Select role"
  options={[
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' }
  ]}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Currently selected value |
| `onChange` | `function` | required | Callback when selection changes. Receives `{ target: { value } }` |
| `options` | `array` | required | Array of option objects |
| `placeholder` | `string` | `'Select an option'` | Placeholder when no value selected |
| `className` | `string` | `''` | Additional CSS classes |
| `minWidth` | `string` | `'180px'` | Minimum width of the select |

### Option Object Structure

```js
{
  value: 'unique-value',   // Required: The value to store
  label: 'Display Text',   // Required: The text to display
  icon: 'mdi:icon-name'    // Optional: Iconify icon to show
}
```

### Example with Icons

```jsx
const [status, setStatus] = useState('');

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
  { value: 'approved', label: 'Approved', icon: 'mdi:check-circle' },
  { value: 'rejected', label: 'Rejected', icon: 'mdi:close-circle' }
];

<CustomSelect
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={statusOptions}
  placeholder="Select status"
/>
```

### Features

- ✅ Animated dropdown with staggered option animations
- ✅ Optional icons for each option
- ✅ Checkmark indicator for selected item
- ✅ Closes on outside click
- ✅ Scrollable when many options
- ✅ Customizable minimum width

---

## ConfirmModal

A reusable confirmation dialog with multiple style variants.

### Import

```jsx
import ConfirmModal from '../components/ConfirmModal';
```

### Basic Usage

```jsx
const [showConfirm, setShowConfirm] = useState(false);

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={() => {
    // Handle confirm action
    handleDelete();
    setShowConfirm(false);
  }}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  variant="danger"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls modal visibility |
| `onClose` | `function` | required | Called when cancel/close is clicked |
| `onConfirm` | `function` | required | Called when confirm button is clicked |
| `title` | `string` | `'Confirm Action'` | Modal title |
| `message` | `string` | required | Message to display |
| `confirmText` | `string` | `'Confirm'` | Confirm button text |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `variant` | `string` | `'danger'` | Style variant: `'danger'`, `'warning'`, or `'info'` |
| `loading` | `boolean` | `false` | Shows loading spinner and disables buttons |

### Variants

| Variant | Color | Icon | Use Case |
|---------|-------|------|----------|
| `danger` | Red | Alert circle | Destructive actions (delete, remove) |
| `warning` | Amber | Alert triangle | Caution actions (finalize, reset) |
| `info` | Indigo | Information | Informational confirmations |

### Example with Loading State

```jsx
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  loading: false
});

const handleDelete = async () => {
  setConfirmModal(prev => ({ ...prev, loading: true }));
  try {
    await api.delete('/items/123');
    setConfirmModal({ isOpen: false, loading: false });
  } catch (error) {
    console.error(error);
    setConfirmModal(prev => ({ ...prev, loading: false }));
  }
};

<ConfirmModal
  isOpen={confirmModal.isOpen}
  loading={confirmModal.loading}
  onClose={() => setConfirmModal({ isOpen: false, loading: false })}
  onConfirm={handleDelete}
  title="Delete Record"
  message="This will permanently delete the record."
  confirmText="Delete"
  variant="danger"
/>
```

### Features

- ✅ Three visual variants (danger, warning, info)
- ✅ Loading state with spinner
- ✅ Backdrop blur effect
- ✅ Smooth animations
- ✅ Auto scroll-lock (prevents background scrolling)

---

## useBodyScrollLock Hook

A custom hook to prevent background scrolling when modals are open.

### Import

```jsx
import useBodyScrollLock from '../hooks/useBodyScrollLock';
```

### Basic Usage

```jsx
function MyModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 ...">
      {/* Modal content */}
    </div>
  );
}
```

### API

```js
useBodyScrollLock(enabled?: boolean)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether scroll lock is active |

### Features

- ✅ Prevents background page scrolling
- ✅ Handles scrollbar width compensation (no layout shift)
- ✅ Automatically restores original overflow on unmount
- ✅ Conditional enabling via parameter

### Example: Always Lock (Component Mount)

```jsx
function FullModal() {
  useBodyScrollLock(); // Locks on mount, unlocks on unmount

  return <div>...</div>;
}
```

### Example: Conditional Lock

```jsx
function ConditionalModal({ isVisible }) {
  useBodyScrollLock(isVisible); // Only locks when isVisible is true

  return isVisible ? <div>...</div> : null;
}
```

---

## CSS Variables Required

These components rely on CSS variables defined in your theme. Ensure these are set:

```css
:root {
  --color-bg-card: #1a1a2e;
  --color-bg-elevated: #252540;
  --color-bg-dark: #0f0f1a;
  --color-border: #2a2a4a;
  --color-text: #ffffff;
  --color-text-muted: #6b7280;
  --color-primary: #6366f1;
}
```

---

## Animation Classes Required

Add these keyframes to your `index.css`:

```css
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-scaleIn {
  animation: scaleIn 0.2s ease-out;
}

.animate-fadeIn {
  animation: fadeSlideIn 0.2s ease-out;
}
```

---

## Quick Reference

| Component | Import Path | Primary Use |
|-----------|-------------|-------------|
| DatePicker | `components/DatePicker` | Date selection with calendar |
| CustomSelect | `components/CustomSelect` | Styled dropdown with icons |
| ConfirmModal | `components/ConfirmModal` | Confirmation dialogs |
| useBodyScrollLock | `hooks/useBodyScrollLock` | Prevent background scroll |
