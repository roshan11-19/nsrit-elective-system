import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  User, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  BarChart3, 
  BookOpen, 
  Globe, 
  Users,
  Building,
  BadgeCheck,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { coordinatorService } from '../../services/coordinatorService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function CoordinatorProfilePage() {
  const { currentUser, logout, showToast, changePasswordWithVerification } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
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
        const [students, pe, oe, allotments] = await Promise.all([
          coordinatorService.getStudents(),
          coordinatorService.getSubjects('PE'),
          coordinatorService.getSubjects('OE'),
          coordinatorService.getAllotmentRecords()
        ]);
        setStats({
          totalStudents: students.length,
          totalSubjects: pe.length + oe.length,
          totalAllotments: allotments.length
        });
      } catch (e) {
        console.warn(e);
      }
    }
    loadStats();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your existing (current) coordinator password.');
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
      showToast('Coordinator administrative password updated and verified successfully!');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
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
          to="/coordinator"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-crimson-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Control Panel</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-100/50 via-crimson-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          
          {/* Badge Icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-800 via-crimson-700 to-crimson-900 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-purple-900/25 flex-shrink-0">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          {/* Identity Details */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5 text-purple-700" />
                <span>Academic Coordinator & Controller</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                Full Administrative Scope
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display">
              {currentUser?.name || 'Academic Coordinator'}
            </h1>

            <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-crimson-700" />
              <span>{currentUser?.email || ''}</span>
            </p>
          </div>

        </div>
      </div>

      {/* Grid: Administration Particulars & Portal Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Official Particulars */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Administrative Particulars
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Official Staff ID</span>
              <span className="font-mono font-extrabold text-gray-900 text-sm mt-0.5 block">{currentUser?.roll_number || 'N/A'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Jurisdiction Department</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">
                {currentUser?.branch ? `${currentUser.branch} Department` : 'Academic Cell'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Role Permissions</span>
              <span className="font-extrabold text-purple-700 text-xs mt-0.5 block">Curriculum, Students & Allotments</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Academic Year</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">2024–2025</span>
            </div>
          </div>
        </div>

        {/* Card 2: System Summary Statistics */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <BarChart3 className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Managed Curriculum Overview
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-crimson-50 border border-crimson-100">
              <Users className="w-5 h-5 text-crimson-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalStudents}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Students</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <BookOpen className="w-5 h-5 text-blue-700 mx-auto mb-1" />
              <span className="text-xl font-black text-gray-900 block font-display">{stats.totalSubjects}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Subjects</span>
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
              Coordinator Account Security
            </h3>
            <p className="text-xs text-gray-500">
              To update your administrative password, enter your existing password first for verification.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">Coordinator administrative password verified and updated in Supabase Auth!</span>
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
              Existing Coordinator Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                placeholder="Enter current password (default: Staff Roll Number)"
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
            <p className="text-[11px] text-gray-500 mt-1">
              Default password for coordinator accounts is your <strong>Staff ID / Roll Number</strong> (e.g. <code>{currentUser?.roll_number || 'COORD-CSE-01'}</code>).
            </p>
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
