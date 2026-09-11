import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  GraduationCap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    currentUser, 
    loginStudent, 
    loginCoordinator, 
    loginAdmin,
    loginWithGoogle, 
    sendPasswordResetEmail,
    resolveProfile,
    showToast 
  } = useAuth();

  const [activeTab, setActiveTab] = useState(
    searchParams.get('role') === 'admin' 
      ? 'admin' 
      : searchParams.get('role') === 'coordinator' 
        ? 'coordinator' 
        : 'student'
  );
  
  // Login form state (strictly blank initial values)
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState(null);

  // Check URL parameters for roles and error descriptions
  useEffect(() => {
    if (searchParams.get('role') === 'admin') {
      setActiveTab('admin');
    } else if (searchParams.get('role') === 'coordinator') {
      setActiveTab('coordinator');
    } else if (searchParams.get('role') === 'student') {
      setActiveTab('student');
    }

    if (searchParams.get('email')) {
      setEmail(searchParams.get('email'));
    }

    const errDesc = searchParams.get('error_description') || searchParams.get('error');
    if (errDesc) {
      if (errDesc.includes('redirect_uri_mismatch')) {
        setError('Google OAuth Error: Callback URI mismatch. Please add https://eaejfodetzwgxmebqqor.supabase.co/auth/v1/callback to Authorized Redirect URIs in Google Cloud Console.');
      } else if (errDesc.includes('access_denied')) {
        setError('Google Sign-In was cancelled or access denied.');
      } else {
        setError(`Authentication error: ${errDesc}`);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/admin');
      } else if (currentUser.role === 'coordinator') {
        navigate('/coordinator');
      } else {
        navigate('/student');
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanInput = String(email || '').trim().toLowerCase();

    if (!cleanInput) {
      setError(
        activeTab === 'admin' 
          ? 'Please enter your administrator email.' 
          : activeTab === 'coordinator' 
            ? 'Please enter your coordinator email.' 
            : 'Please enter your registered student email.'
      );
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      if (activeTab === 'admin') {
        await loginAdmin(cleanInput, password);
        navigate('/');
      } else if (activeTab === 'coordinator') {
        await loginCoordinator(cleanInput, password);
        navigate('/');
      } else {
        await loginStudent(cleanInput, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const cleanInput = String(email || '').trim().toLowerCase();
      if (cleanInput) {
        const profile = await resolveProfile(cleanInput);
        if (!profile) {
          setError(`Email "${cleanInput}" is not registered in the NSRIT database. Only enrolled students and staff can access the portal.`);
          return;
        }
      }

      await loginWithGoogle(activeTab, email);
      navigate('/');
    } catch (err) {
      const msg = err.message || 'Google authentication failed.';
      if (msg.includes('redirect_uri_mismatch')) {
        setError('Google OAuth Error: Callback URI mismatch. Please add https://eaejfodetzwgxmebqqor.supabase.co/auth/v1/callback to Google Cloud Console Authorized Redirect URIs.');
      } else if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
        setError('Google OAuth is not enabled in your Supabase project. Go to Supabase Dashboard -> Authentication -> Providers -> Google, enable it, and paste your Google Client ID & Secret.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Send Supabase Password Reset Email
  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setResetError('');
    const clean = String(resetEmail || '').trim().toLowerCase();

    if (!clean) {
      setResetError('Please enter your registered college email.');
      return;
    }

    try {
      setResetLoading(true);
      const profile = await sendPasswordResetEmail(clean);
      setVerifiedProfile(profile);
      setResetSuccess(true);
      showToast(`Password reset link sent to ${profile.email}!`);
    } catch (err) {
      setResetError(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseResetModal = () => {
    setForgotModalOpen(false);
    setVerifiedProfile(null);
    setResetSuccess(false);
    setResetEmail('');
    setResetError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-50">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header Branding with Official NSRIT Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm inline-block hover:shadow-md transition-shadow">
              <img 
                src="/nsrit-logo.png" 
                alt="NSRIT Logo" 
                className="h-16 w-auto object-contain max-w-[240px]"
              />
            </div>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
              Autonomous Elective Portal
            </h2>
            <p className="text-xs text-gray-600 max-w-xs mx-auto mt-1 font-medium">
              Nadimpalli Satyanarayana Raju Institute of Technology
            </p>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-5">
          
          {/* 3-Way Role Switcher */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-gray-100 border border-gray-200 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeTab === 'student'
                  ? 'bg-white text-crimson-700 shadow-sm font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('coordinator');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeTab === 'coordinator'
                  ? 'bg-white text-crimson-700 shadow-sm font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Coordinator</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeTab === 'admin'
                  ? 'bg-white text-crimson-700 shadow-sm font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>College Admin</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-200 text-xs text-crimson-700 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Registered Email Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {activeTab === 'admin' 
                  ? 'Administrator Email *' 
                  : activeTab === 'coordinator' 
                    ? 'Coordinator Email *' 
                    : 'Registered Student Email *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder={
                    activeTab === 'admin' 
                      ? 'nsritelectivesystem@gmail.com' 
                      : activeTab === 'coordinator' 
                        ? 'coordinator@nsrit.edu.in' 
                        : 'student@nsrit.edu.in'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setVerifiedProfile(null);
                    setResetSuccess(false);
                    setResetError('');
                    setForgotModalOpen(true);
                  }}
                  className="text-xs font-semibold text-crimson-700 hover:text-crimson-800 hover:underline"
                >
                  Forgot / Set Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white crimson-gradient-btn flex items-center justify-center gap-2 shadow-md shadow-crimson-700/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    Sign In as {activeTab === 'admin' ? 'Institution Admin' : activeTab === 'coordinator' ? 'Branch Coordinator' : 'Student'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Or
              </span>
              <div className="border-t border-gray-200 w-full"></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Login with Google Account</span>
            </button>

          </form>

        </div>

      </div>

      {/* Supabase Password Reset Email Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">
                  Reset Account Password
                </h3>
                <p className="text-xs text-gray-500">
                  Enter your registered college email to receive a password recovery link.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseResetModal}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-gray-900">Password Reset Link Sent!</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We have dispatched a password recovery email to <strong className="text-gray-900">{verifiedProfile?.email}</strong>.
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 text-left space-y-1">
                    <p className="font-bold flex items-center gap-1 text-blue-950">
                      <Mail className="w-3.5 h-3.5 text-blue-700" />
                      <span>Next Steps:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-800">
                      <li>Check your email inbox (and Spam folder).</li>
                      <li>Click on the <strong>"Reset Password"</strong> link in the email.</li>
                      <li>Choose your new password to complete the reset.</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={handleCloseResetModal}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm"
                >
                  Done / Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                {resetError && (
                  <div className="p-3.5 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Registered College Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={activeTab === 'coordinator' ? 'coordinator@nsrit.edu.in' : activeTab === 'admin' ? 'nsritelectivesystem@gmail.com' : 'student@nsrit.edu.in'}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{resetLoading ? 'Sending...' : 'Send Password Reset Link'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

