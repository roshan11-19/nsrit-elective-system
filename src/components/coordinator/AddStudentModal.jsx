import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { UserPlus, Mail, AlertCircle, CheckCircle2, Copy, Send, ExternalLink, ShieldCheck } from 'lucide-react';
import { isValidEmail } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const DEFAULT_BATCHES = [
  '2021-2025',
  '2022-2026',
  '2023-2027',
  '2024-2028',
  '2025-2029',
  '2026-2030'
];

export default function AddStudentModal({ isOpen, onClose, onSave, coordinatorBranch = 'CSE' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_number: '',
    regulation: 'AR23',
    branch: coordinatorBranch || 'CSE',
    section: 'A',
    admitted_batch: '',
    semester: 5
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrolledStudent, setEnrolledStudent] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branch: coordinatorBranch || 'CSE'
    }));
  }, [coordinatorBranch, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.name.trim();
    const cleanRoll = formData.roll_number.toUpperCase().replace(/\s+/g, '');
    const cleanRegulation = (formData.regulation || 'AR23').toUpperCase().replace(/\s+/g, '');
    const cleanSection = (formData.section || 'A').toUpperCase().replace(/\s+/g, '');
    const cleanBatch = formData.admitted_batch.trim();

    if (!cleanBatch) {
      setError('Please select or specify an Academic Batch.');
      return;
    }

    if (!cleanName) {
      setError('Please enter the student\'s full name.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please provide a valid college email address (e.g. name@college.edu or student@gmail.com).');
      return;
    }

    if (!cleanRoll) {
      setError('Please enter the student\'s Roll / Hall Ticket Number.');
      return;
    }

    if (!cleanRegulation) {
      setError('Please enter the academic Regulation (e.g. AR23).');
      return;
    }

    if (!cleanSection) {
      setError('Please enter the Class Section (e.g. A, B, C).');
      return;
    }

    try {
      setLoading(true);

      // Check unique email and roll number in Supabase
      if (isSupabaseConfigured && supabase) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (existingEmail) {
          throw new Error(`Email "${cleanEmail}" is already registered for ${existingEmail.name} (${existingEmail.roll_number || 'No Roll Number'}). Email must be unique.`);
        }

        const { data: existingRoll } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('roll_number', cleanRoll)
          .maybeSingle();

        if (existingRoll) {
          throw new Error(`Roll Number "${cleanRoll}" is already registered for ${existingRoll.name} (${existingRoll.email}). Roll Number must be unique.`);
        }
      }

      const payload = {
        ...formData,
        name: cleanName,
        email: cleanEmail,
        roll_number: cleanRoll,
        regulation: cleanRegulation,
        section: cleanSection,
        admitted_batch: cleanBatch,
        branch: coordinatorBranch || formData.branch || 'CSE',
        semester: Number(formData.semester)
      };

      await onSave(payload);

      setEnrolledStudent({
        name: cleanName,
        email: cleanEmail,
        roll_number: cleanRoll,
        regulation: cleanRegulation,
        branch: coordinatorBranch || formData.branch || 'CSE',
        section: cleanSection,
        admitted_batch: cleanBatch,
        semester: formData.semester
      });

    } catch (err) {
      setError(err.message || 'Failed to enroll student.');
    } finally {
      setLoading(false);
    }
  };

  const getInviteLink = () => {
    if (!enrolledStudent) return '';
    return `${window.location.origin}${window.location.pathname}#/login?role=student&email=${encodeURIComponent(enrolledStudent.email)}`;
  };

  const handleCopyLink = () => {
    const link = getInviteLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendEmailClient = () => {
    if (!enrolledStudent) return;
    const link = getInviteLink();
    const subject = encodeURIComponent(`Invitation to Autonomous Elective Subject Selection — NSRIT Portal`);
    const body = encodeURIComponent(
`Dear ${enrolledStudent.name},

You have been enrolled in the Autonomous Elective Portal (${enrolledStudent.regulation} • ${enrolledStudent.branch} - Section ${enrolledStudent.section}, Semester ${enrolledStudent.semester} • Batch ${enrolledStudent.admitted_batch}).

Please click the invitation link below to log in and rank your Professional Electives (PE) and Open Electives (OE):
${link}

Important Login & Selection Instructions:
1. Login ID: Your registered email (${enrolledStudent.email}) or Roll Number (${enrolledStudent.roll_number})
2. Default Password: Your Roll Number (${enrolledStudent.roll_number})
3. Prioritize your subjects in order of choice (Priority 1 = Top Choice).
4. Allotments are calculated immediately upon submission in strict First-In, First-Out (FIFO) timestamp order.
5. Once submitted, your choices will be permanently locked.

Best regards,
Office of the Academic Coordinator & Dean of Academics
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)`
    );
    window.open(`mailto:${enrolledStudent.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleResetAndEnrollAnother = () => {
    setEnrolledStudent(null);
    setFormData({
      name: '',
      email: '',
      roll_number: '',
      regulation: formData.regulation || 'AR23',
      branch: coordinatorBranch || 'CSE',
      section: formData.section || 'A',
      admitted_batch: formData.admitted_batch || '',
      semester: formData.semester || 5
    });
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={enrolledStudent ? "Student Successfully Enrolled!" : `Enroll ${coordinatorBranch || 'Department'} Student`}
      subtitle={enrolledStudent 
        ? "The student profile has been registered in the database and can now log in." 
        : `Add individual student to ${coordinatorBranch || 'Department'} list. Roll number and Email must be unique.`}
      maxWidth="max-w-xl"
    >
      {enrolledStudent ? (
        <div className="space-y-5 py-2">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                {enrolledStudent.name} ({enrolledStudent.roll_number})
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                Registered under <strong>{enrolledStudent.regulation}</strong> • <strong>{enrolledStudent.branch} - Sec {enrolledStudent.section}</strong> (Sem {enrolledStudent.semester} • Batch {enrolledStudent.admitted_batch}).
              </p>
              <div className="mt-2 text-xs bg-white/80 p-2 rounded-lg border border-emerald-300 font-medium text-emerald-900">
                🔑 Default Login Password: <code className="font-bold font-mono text-crimson-700">{enrolledStudent.roll_number}</code>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Student Direct Login / Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getInviteLink()}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono bg-white text-gray-600 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleSendEmailClient}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4 text-emerald-700" />
              <span>Send Invitation Email</span>
            </button>

            <button
              type="button"
              onClick={handleResetAndEnrollAnother}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Another</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Roll / Hall Ticket No *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 24NU1A0501"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-crimson-600"
              />
              <p className="text-[10px] text-gray-500 mt-1">Capital letters, no spaces, must be unique</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Branch Department
              </label>
              <input
                type="text"
                readOnly
                value={coordinatorBranch || 'CSE'}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold text-gray-700 cursor-not-allowed uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              College Email (Login ID) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. student@college.edu or aarav@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600 font-medium"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Email must be unique. Only students enrolled with this exact email will be authorized to log in.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Batch *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2024-2028"
                value={formData.admitted_batch}
                onChange={(e) => setFormData({ ...formData, admitted_batch: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold font-mono uppercase bg-white text-gray-900 focus:ring-2 focus:ring-crimson-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Section *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Semester *
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Sem {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Regulation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AR23"
                value={formData.regulation}
                onChange={(e) => setFormData({ ...formData, regulation: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Enrolling...' : 'Enroll Student'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
