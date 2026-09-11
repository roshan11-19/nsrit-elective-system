import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

export default function SelectionPeriodModal({ isOpen, onClose, onSave, editingPeriod = null }) {
  const [formData, setFormData] = useState({
    academic_year: '2024-2025',
    regulation: 'AR23',
    semester: 5,
    elective_type: 'PE',
    start_time: '',
    end_time: '',
    status: 'Active'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPeriod) {
      setFormData({
        academic_year: editingPeriod.academic_year || '2024-2025',
        regulation: editingPeriod.regulation || 'AR23',
        semester: editingPeriod.semester || 5,
        elective_type: editingPeriod.elective_type || 'PE',
        start_time: editingPeriod.start_time ? editingPeriod.start_time.slice(0, 16) : '',
        end_time: editingPeriod.end_time ? editingPeriod.end_time.slice(0, 16) : '',
        status: editingPeriod.status || 'Active'
      });
    } else {
      const now = new Date();
      const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setFormData({
        academic_year: '2024-2025',
        regulation: 'AR23',
        semester: 5,
        elective_type: 'PE',
        start_time: now.toISOString().slice(0, 16),
        end_time: inOneWeek.toISOString().slice(0, 16),
        status: 'Active'
      });
    }
    setError('');
  }, [editingPeriod, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      setError('End Date & Time must be strictly after Start Date & Time.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        semester: Number(formData.semester),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save selection period.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPeriod ? 'Edit Selection Period' : 'Create New Selection Period'}
      subtitle="Define election windows, semester targets, and elective types."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Academic Year *
            </label>
            <input
              type="text"
              required
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
              placeholder="e.g. 2024-2025"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Regulation *
            </label>
            <input
              type="text"
              required
              value={formData.regulation}
              onChange={(e) => setFormData({ ...formData, regulation: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
              placeholder="e.g. AR23"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Elective Type *
            </label>
            <select
              value={formData.elective_type}
              onChange={(e) => setFormData({ ...formData, elective_type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent bg-white"
            >
              <option value="PE">Professional Elective (PE)</option>
              <option value="OE">Open Elective (OE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Period Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent bg-white font-semibold"
            >
              <option value="Active">Active (Open)</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white crimson-gradient-btn disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingPeriod ? 'Update Period' : 'Create Period'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
