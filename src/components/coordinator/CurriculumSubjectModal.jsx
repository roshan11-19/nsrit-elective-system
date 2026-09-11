import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { BookOpen, Globe, Layers, AlertCircle } from 'lucide-react';
import { normalizeBatch } from '../../lib/storage';

export default function CurriculumSubjectModal({
  isOpen,
  onClose,
  onSave,
  editingSubject = null,
  coordinatorBranch = 'CSE',
  registeredBranches = [],
  defaultBatch = ''
}) {
  const [formData, setFormData] = useState({
    batch: defaultBatch || '',
    branch: coordinatorBranch,
    regulation: 'AR23',
    semester: 5,
    elective_type: 'PE',
    elective_number: 1,
    subject_code: '',
    subject_name: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingSubject) {
      setFormData({
        batch: normalizeBatch(editingSubject.batch || defaultBatch || ''),
        branch: editingSubject.branch || coordinatorBranch,
        regulation: editingSubject.regulation || 'AR23',
        semester: Number(editingSubject.semester || 5),
        elective_type: editingSubject.elective_type || 'PE',
        elective_number: Number(editingSubject.elective_number || 1),
        subject_code: editingSubject.subject_code || '',
        subject_name: editingSubject.subject_name || ''
      });
    } else {
      setFormData({
        batch: defaultBatch || '',
        branch: coordinatorBranch,
        regulation: 'AR23',
        semester: 5,
        elective_type: 'PE',
        elective_number: 1,
        subject_code: '',
        subject_name: ''
      });
    }
    setError('');
  }, [isOpen, editingSubject, coordinatorBranch, defaultBatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = String(formData.subject_code || '').trim().toUpperCase().replace(/\s+/g, '');
    const cleanName = String(formData.subject_name || '').trim();
    const cleanBatch = normalizeBatch(formData.batch);

    if (!cleanBatch) {
      setError('Please provide the Target Academic Batch.');
      return;
    }

    if (!cleanCode || !cleanName) {
      setError('Please provide both Subject Code and Subject Name.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        batch: cleanBatch,
        subject_code: cleanCode,
        subject_name: cleanName,
        semester: Number(formData.semester),
        elective_number: Number(formData.elective_number)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save curriculum subject.');
    } finally {
      setLoading(false);
    }
  };

  const isOE = formData.elective_type === 'OE';
  const availableTargetBranches = (registeredBranches && registeredBranches.length > 0)
    ? registeredBranches.filter(b => b.toUpperCase() !== String(coordinatorBranch).toUpperCase())
    : ['ECE', 'MECH', 'CIVIL', 'EEE', 'AIML', 'IT'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSubject ? 'Edit Curriculum Subject' : 'Add Subject to Curriculum'}
      subtitle={`Official Syllabus Master for Department of ${coordinatorBranch}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Target Academic Batch *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2024-2028"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, batch: normalizeBatch(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:ring-2 focus:ring-crimson-600"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">Format: YYYY-YYYY</span>
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
              onChange={(e) => setFormData({ ...formData, regulation: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:ring-2 focus:ring-crimson-600 uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Elective Category *
            </label>
            <select
              value={formData.elective_type}
              onChange={(e) => setFormData({ ...formData, elective_type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
            >
              <option value="PE">Professional Elective (PE)</option>
              <option value="OE">Open Elective (OE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Elective Number *
            </label>
            <select
              value={formData.elective_number}
              onChange={(e) => setFormData({ ...formData, elective_number: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900 focus:ring-2 focus:ring-crimson-600"
            >
              {formData.elective_type === 'PE' ? (
                <>
                  <option value={1}>Professional Elective 1 (PE-1)</option>
                  <option value={2}>Professional Elective 2 (PE-2)</option>
                  <option value={3}>Professional Elective 3 (PE-3)</option>
                  <option value={4}>Professional Elective 4 (PE-4)</option>
                  <option value={5}>Professional Elective 5 (PE-5)</option>
                  <option value={6}>Professional Elective 6 (PE-6)</option>
                  <option value={7}>Professional Elective 7 (PE-7)</option>
                  <option value={8}>Professional Elective 8 (PE-8)</option>
                </>
              ) : (
                <>
                  <option value={1}>Open Elective 1 (OE-1)</option>
                  <option value={2}>Open Elective 2 (OE-2)</option>
                  <option value={3}>Open Elective 3 (OE-3)</option>
                  <option value={4}>Open Elective 4 (OE-4)</option>
                  <option value={5}>Open Elective 5 (OE-5)</option>
                  <option value={6}>Open Elective 6 (OE-6)</option>
                  <option value={7}>Open Elective 7 (OE-7)</option>
                  <option value={8}>Open Elective 8 (OE-8)</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Subject Code *
            </label>
            <input
              type="text"
              required
              placeholder={formData.elective_type === 'PE' ? 'e.g. CS501PE' : 'e.g. CS501OE'}
              value={formData.subject_code}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-crimson-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Subject Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Software Testing Methodologies"
              value={formData.subject_name}
              onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:ring-2 focus:ring-crimson-600"
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
            className="px-5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Add to Curriculum'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
