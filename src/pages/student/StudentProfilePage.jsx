import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Award, 
  BookOpen, 
  Globe, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  Layers,
  GraduationCap,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function StudentProfilePage() {
  const { currentUser, logout, showToast, changePasswordWithVerification } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [peAllotment, setPeAllotment] = useState(null);
  const [oeAllotment, setOeAllotment] = useState(null);

  // Change password inside profile
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
    async function loadProfileAllotments() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const [pe, oe] = await Promise.all([
          studentService.getAllotment(currentUser.id, 'PE'),
          studentService.getAllotment(currentUser.id, 'OE')
        ]);
        setPeAllotment(pe);
        setOeAllotment(oe);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfileAllotments();
  }, [currentUser]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your existing (current) password.');
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

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      showToast('Account password updated and verified successfully!');
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

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Breadcrumb & Sign Out */}
      <div className="flex items-center justify-between">
        <Link
          to="/student"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-crimson-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-crimson-100/50 via-coral-light/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          
          {/* Avatar Initials Badge */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-crimson-800 via-crimson-600 to-coral flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-crimson-700/25 flex-shrink-0">
            {getInitials(currentUser?.name)}
          </div>

          {/* Identity Details */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified Student Account
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                {currentUser?.regulation || 'AR23'} Regulation
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display">
              {currentUser?.name}
            </h1>

            <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-crimson-700" />
              <span>{currentUser?.email}</span>
            </p>
          </div>

        </div>
      </div>

      {/* Grid: Academic Particulars & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Academic Particulars */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <GraduationCap className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Academic Particulars
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">College Roll Number</span>
              <span className="font-mono font-extrabold text-gray-900 text-sm mt-0.5 block">{currentUser?.roll_number || 'N/A'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Branch / Department</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">{currentUser?.branch}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Section</span>
              <span className="font-extrabold text-crimson-700 text-sm mt-0.5 block">Section {currentUser?.section || 'A'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Current Semester</span>
              <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">Semester {currentUser?.semester}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Regulation</span>
              <span className="font-bold text-gray-900 text-xs mt-0.5 block">{currentUser?.regulation || 'AR23'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-gray-100">
              <span className="text-gray-400 font-semibold uppercase text-[10px] block">Admitted Batch</span>
              <span className="font-bold text-gray-900 text-xs mt-0.5 block">{currentUser?.admitted_batch || '2022-2026'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Electives Allotment Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Award className="w-5 h-5 text-crimson-700" />
            <h3 className="text-base font-bold text-gray-900 font-display">
              Elective Allotment Status
            </h3>
          </div>

          <div className="space-y-3">
            {/* Professional Elective (PE) */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-surface-50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-900">
                  <BookOpen className="w-4 h-4 text-crimson-700" />
                  <span>Professional Elective (PE)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  peAllotment?.status === 'ALLOTTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {peAllotment?.status || 'Pending Selection'}
                </span>
              </div>
              {peAllotment?.subject ? (
                <div className="text-xs font-semibold text-gray-800 pl-5">
                  {peAllotment.subject.subject_code} — {peAllotment.subject.subject_name}
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 pl-5">No subject allotted yet.</div>
              )}
            </div>

            {/* Open Elective (OE) */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-surface-50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-900">
                  <Globe className="w-4 h-4 text-crimson-700" />
                  <span>Open Elective (OE)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  oeAllotment?.status === 'ALLOTTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {oeAllotment?.status || 'Pending Selection'}
                </span>
              </div>
              {oeAllotment?.subject ? (
                <div className="text-xs font-semibold text-gray-800 pl-5">
                  {oeAllotment.subject.subject_code} — {oeAllotment.subject.subject_name}
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 pl-5">No subject allotted yet.</div>
              )}
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
              Account Security & Password Management
            </h3>
            <p className="text-xs text-gray-500">
              To update your password, enter your existing password first for security verification.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">Your password has been updated and verified in Supabase Auth!</span>
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
              Existing (Current) Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                placeholder="Enter current password (default: Roll Number)"
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
              If this is your first time, your existing password is your <strong>Roll Number</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                New Password *
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
                Confirm New Password *
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
