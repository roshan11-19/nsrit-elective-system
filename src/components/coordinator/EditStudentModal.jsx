import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { UserCheck, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
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

export default function EditStudentModal({ isOpen, onClose, onUpdate, student, coordinatorBranch = 'CSE' }) {
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

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        roll_number: student.roll_number || '',
        regulation: student.regulation || 'AR23',
        branch: student.branch || coordinatorBranch || 'CSE',
        section: student.section || 'A',
        admitted_batch: student.admitted_batch || '',
        semester: Number(student.semester || 5)
      });
      setError('');
    }
  }, [student, coordinatorBranch, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.name.trim();
    const cleanRoll = formData.roll_number.toUpperCase().replace(/\s+/g, '');
    const cleanRegulation = (formData.regulation || 'AR23').toUpperCase().replace(/\s+/g, '');
    const cleanSection = (formData.section || 'A').toUpperCase().replace(/\s+/g, '');
    const cleanBatch = (formData.admitted_batch || '').trim();

    if (!cleanName) {
      setError('Please enter the student\'s full name.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!cleanRoll) {
      setError('Please enter the student\'s Roll / Hall Ticket Number.');
      return;
    }

    if (!cleanRegulation) {
      setError('Please enter the academic Regulation.');
      return;
    }

    if (!cleanSection) {
      setError('Please enter the Class Section.');
      return;
    }

    try {
      setLoading(true);

      // Check unique email in Supabase if changed
      if (isSupabaseConfigured && supabase && cleanEmail !== student?.email?.toLowerCase()) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('email', cleanEmail)
          .neq('id', student.id)
          .maybeSingle();

        if (existingEmail) {
          throw new Error(`Email "${cleanEmail}" is already registered for ${existingEmail.name} (${existingEmail.roll_number || 'No Roll Number'}). Email must be unique.`);
        }
      }

      // Check unique roll number in Supabase if changed
      if (isSupabaseConfigured && supabase && cleanRoll !== student?.roll_number) {
        const { data: existingRoll } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('roll_number', cleanRoll)
          .neq('id', student.id)
          .maybeSingle();

        if (existingRoll) {
          throw new Error(`Roll Number "${cleanRoll}" is already assigned to ${existingRoll.name} (${existingRoll.email}). Roll Number must be unique.`);
        }
      }

      await onUpdate(student.id, {
        ...formData,
        name: cleanName,
        email: cleanEmail,
        roll_number: cleanRoll,
        regulation: cleanRegulation,
        section: cleanSection,
        admitted_batch: cleanBatch,
        semester: Number(formData.semester)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update student details.');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student Details"
      subtitle={`Modify academic details for ${student.name} (${student.email}).`}
      maxWidth="max-w-lg"
    >
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
            <p className="text-[10px] text-gray-500 mt-1">Capital letters, no spaces, unique</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Branch Department
            </label>
            <input
              type="text"
              disabled
              value={formData.branch}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold text-gray-700 cursor-not-allowed uppercase font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            College / Personal Email *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="e.g. student@college.edu or name@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600"
            />
          </div>
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
            <UserCheck className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Update Student Details'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
