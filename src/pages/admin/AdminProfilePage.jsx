import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  User, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  BarChart3, 
  BookOpen, 
  Layers, 
  Users,
  ShieldCheck,
  BadgeCheck,
  LogOut,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function AdminProfilePage() {
  const { currentUser, logout, showToast, changePasswordWithVerification } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCoordinators: 0,
    totalSubjects: 0,
    totalAllotments: 0
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const analytics = await adminService.getInstitutionAnalytics();
        if (analytics) {
          setStats({
            totalStudents: analytics.totalStudents || 0,
            totalCoordinators: analytics.totalCoordinators || 0,
            totalSubjects: analytics.totalSubjects || 0,
            totalAllotments: analytics.allottedCount || 0
          });
        }
      } catch (e) {
        console.warn('Failed to load admin profile stats:', e);
      }
    }
    loadStats();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your existing administrator password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password cannot be the same as your existing password.');
      return;
    }

    try {
      setPasswordLoading(true);
      await changePasswordWithVerification(currentPassword, newPassword);

      if (isSupabaseConfigured && supabase && currentUser?.id) {
        try {
          await supabase.from('profiles').update({ password_changed: true }).eq('id', currentUser.id);
        } catch (e) {
          console.warn('Supabase profile note:', e);
        }
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      showToast('Administrator password verified and updated successfully in Supabase Auth!');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update administrator password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Breadcrumb & Sign Out */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-crimson-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Master Control Panel</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Header Hero */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-gray-900/10 via-crimson-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          
          {/* Avatar Icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-crimson-800 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-gray-900/25 flex-shrink-0">
            <Building2 className="w-10 h-10 text-white" />
          </div>

          {/* Identity Details */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-gray-900 text-white border border-gray-700 flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5 text-crimson-400" />
                <span>Institution Master Administrator</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-crimson-50 text-crimson-700 border border-crimson-200">
                Full Master Access Scope
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display">
              {currentUser?.name || 'Institution Master Administrator'}
            </h1>

            <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-crimson-700" />
              <span>{currentUser?.email || 'nsritelectivesystem@gmail.com'}</span>
            </p>
          </div>

        </div>
      </div>

      {/* Grid: Administration Particulars & System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Official Particulars */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Administrative Particulars
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Admin Roll / Staff ID</span>
              <span className="font-mono font-extrabold text-gray-900 text-sm mt-0.5 block">{currentUser?.roll_number || 'ADMIN-01'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Jurisdiction Scope</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">
                Institution-Wide (All Branches)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">System Role</span>
              <span className="font-extrabold text-crimson-700 text-xs mt-0.5 block">Controller of Electives</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Academic System</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">NSRIT Autonomous 2024–25</span>
            </div>
          </div>
        </div>

        {/* Card 2: System Summary Statistics */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <BarChart3 className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Institution Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
              <ShieldCheck className="w-5 h-5 text-purple-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalCoordinators}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Coordinators</span>
            </div>

            <div className="p-4 rounded-xl bg-crimson-50 border border-crimson-100">
              <Users className="w-5 h-5 text-crimson-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalStudents}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Students</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <BookOpen className="w-5 h-5 text-blue-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalSubjects}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Elective Offerings</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalAllotments}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Allotments</span>
            </div>
          </div>
        </div>

      </div>

      {/* Card 3: Security & Password Update */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <KeyRound className="w-5 h-5 text-crimson-700" />
          <div>
            <h3 className="text-base font-bold text-gray-900 font-display">
              Administrator Account Security
            </h3>
            <p className="text-xs text-gray-500">
              To update your master administrator password, enter your existing password first for verification.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">Master Administrator password verified and updated in Supabase Auth!</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
          {/* Existing Password Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Existing Administrator Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                placeholder="Enter current administrator password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                New Admin Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Confirm Admin Password *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600 font-medium"
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
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{passwordLoading ? 'Verifying & Updating...' : 'Verify Existing & Update Password'}</span>
          </button>
        </form>
      </div>

    </div>
  );
}
