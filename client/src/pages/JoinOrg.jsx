import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function JoinOrg() {
  const [step, setStep] = useState(1); // 1: email check, 2: registration
  const [email, setEmail] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinOrg } = useAuth();
  const navigate = useNavigate();

  const handleEmailCheck = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.get(`/invites/check/${encodeURIComponent(email)}`);
      
      if (!data.invited) {
        setError('No invitation found for this email. Please contact your organization administrator.');
        setLoading(false);
        return;
      }
      
      setInviteInfo(data);
      setStep(2);
    } catch (err) {
      setError('Failed to check invitation status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await joinOrg(email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Plug<span className="text-indigo-500">OS</span>
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {step === 1 ? 'Join your organization' : 'Complete your registration'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)]">
          {step === 1 ? (
            // Step 1: Email Check
            <form onSubmit={handleEmailCheck} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Enter the email your organization invited you with
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Invitation'
                )}
              </button>
            </form>
          ) : (
            // Step 2: Registration Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Invite Info Display */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Icon icon="mdi:check-circle" className="w-5 h-5" />
                  <span className="font-medium">Invitation Found!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[var(--color-text-muted)]">Organization:</span>
                    <p className="font-medium">{inviteInfo?.organization}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Role:</span>
                    <p className="font-medium capitalize">{inviteInfo?.role}</p>
                  </div>
                  {inviteInfo?.department && (
                    <div className="col-span-2">
                      <span className="text-[var(--color-text-muted)]">Department:</span>
                      <p className="font-medium">{inviteInfo.department}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setInviteInfo(null);
                    setError('');
                  }}
                  className="flex-1 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-muted)]">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
            <p className="mt-2">
              Need to create an organization?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
