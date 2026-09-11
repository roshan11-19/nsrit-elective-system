import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight, Eye, EyeOff, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { establishRecoverySession, extractAuthParams } from '../lib/authRecovery';

export default function ResetPasswordPage() {
  const { completePasswordReset, showToast } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    async function checkRecoverySession() {
      try {
        const params = extractAuthParams();

        // 1. Check if Supabase returned an explicit error in the URL (e.g. otp_expired)
        if (params.error || params.error_description) {
          const errorDesc = decodeURIComponent(params.error_description || params.error || 'This password reset link is invalid or has expired. Please request a new link.').replace(/\+/g, ' ');

          if (mounted) {
            setTokenExpired(true);
            setError(errorDesc);
            setSessionChecking(false);
          }
          return;
        }

        // 2. Safely establish recovery session
        const session = await establishRecoverySession();
        if (mounted) {
          if (session?.user?.email) {
            setUserEmail(session.user.email);
            setTokenExpired(false);
            setError('');
            setSessionChecking(false);
          } else {
            // Check if there are active recovery tokens or stored tokens
            const hasTokens = Boolean(params.access_token || params.code || params.token_hash || sessionStorage.getItem('nsrit_recovery_tokens'));
            if (!hasTokens) {
              setTokenExpired(true);
              setError('No active password recovery session found. Please click the reset link sent to your email or request a new reset link.');
            }
            setSessionChecking(false);
          }
        }

        // 3. Listen for any subsequent auth state changes
        if (isSupabaseConfigured && supabase) {
          const { data } = supabase.auth.onAuthStateChange((event, s) => {
            if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user?.email && mounted) {
              setUserEmail(s.user.email);
              setTokenExpired(false);
              setError('');
              setSessionChecking(false);
            }
          });
          subscription = data?.subscription;
        }
      } catch (e) {
        console.warn('Recovery session check note:', e);
        if (mounted) {
          setTokenExpired(true);
          setError(e.message || 'Unable to establish password recovery session.');
          setSessionChecking(false);
        }
      }
    }

    checkRecoverySession();

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter carefully.');
      return;
    }

    try {
      setLoading(true);
      await completePasswordReset(newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset submit error:', err);
      const msg = err.message || 'Failed to update password. Your recovery link may have expired.';
      if (msg.toLowerCase().includes('session missing') || msg.toLowerCase().includes('expired')) {
        setTokenExpired(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-50">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm inline-block">
              <img 
                src="/nsrit-logo.png" 
                alt="NSRIT Logo" 
                className="h-14 w-auto object-contain max-w-[220px]"
              />
            </div>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 font-display">
              Set New Password
            </h2>
            <p className="text-xs text-gray-600 max-w-xs mx-auto mt-1 font-medium">
              Create a new secure password for your NSRIT Elective Portal account.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-5">
          
          {sessionChecking ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-crimson-200 border-t-crimson-700 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Verifying password recovery session...</p>
            </div>
          ) : tokenExpired ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-gray-900">Reset Link Expired or Invalid</h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {error || 'This reset link has expired or has already been used once. Please request a fresh password reset link.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Request New Reset Link</span>
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Password Reset Successful!</h3>
                <p className="text-xs text-gray-600">
                  Your new password is now active in Supabase Auth. You can now sign in to your portal.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center justify-center gap-2 shadow-md shadow-crimson-700/20 mt-4"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {userEmail && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center gap-2">
                  <Mail className="w-4 h-4 text-crimson-700 flex-shrink-0" />
                  <span className="text-gray-700">Resetting password for: <strong className="text-gray-900">{userEmail}</strong></span>
                </div>
              )}

              {error && (
                <div className="p-3.5 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    New Secure Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white crimson-gradient-btn flex items-center justify-center gap-2 shadow-md shadow-crimson-700/20 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Save New Password & Log In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

        </div>

        <div className="text-center">
          <Link to="/login" className="text-xs font-bold text-crimson-700 hover:underline">
            ← Back to Portal Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
