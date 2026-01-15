import { useState } from 'react';
import { Icon } from '@iconify/react';
import api from '../utils/api';

export default function PasswordChangeModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 animate-scaleIn text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:check" className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Password Changed!</h3>
          <p className="text-[var(--color-text-muted)] mb-6">
            Your password has been successfully updated.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Icon icon="mdi:lock" className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold">Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
          >
            <Icon icon="mdi:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-4 py-3 pr-12"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
              >
                <Icon icon={showCurrentPassword ? 'mdi:eye-off' : 'mdi:eye'} className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-4 py-3 pr-12"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
              >
                <Icon icon={showNewPassword ? 'mdi:eye-off' : 'mdi:eye'} className="w-5 h-5" />
              </button>
            </div>
            
            {/* Password Requirements */}
            <div className="mt-3 space-y-1.5">
              <Requirement met={hasMinLength}>At least 8 characters</Requirement>
              <Requirement met={hasUpperCase}>One uppercase letter</Requirement>
              <Requirement met={hasLowerCase}>One lowercase letter</Requirement>
              <Requirement met={hasNumber}>One number</Requirement>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-4 py-3"
              placeholder="Confirm new password"
              required
            />
            {confirmPassword.length > 0 && (
              <Requirement met={passwordsMatch} className="mt-2">
                Passwords match
              </Requirement>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] text-white font-medium py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Icon icon="mdi:lock-check" className="w-5 h-5" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Requirement({ met, children, className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Icon 
        icon={met ? 'mdi:check-circle' : 'mdi:circle-outline'} 
        className={`w-4 h-4 ${met ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`}
      />
      <span className={met ? 'text-green-400' : 'text-[var(--color-text-muted)]'}>{children}</span>
    </div>
  );
}
