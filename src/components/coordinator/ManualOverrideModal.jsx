import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { AlertCircle, User, BookOpen } from 'lucide-react';

export default function ManualOverrideModal({ isOpen, onClose, onSave, allotmentRecord, eligibleSubjects = [] }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (allotmentRecord) {
      setSelectedSubjectId(allotmentRecord.subject_id || '');
      setReason('');
      setError('');
    }
  }, [allotmentRecord, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory justification / reason for this manual change (required for audit trail).');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        allotmentId: allotmentRecord.id,
        newSubjectId: selectedSubjectId || null,
        reason: reason.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update allotment.');
    } finally {
      setLoading(false);
    }
  };

  if (!allotmentRecord) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Allotment Override"
      subtitle="Modify a student's allotted subject with official audit log recording."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Student Summary */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-bold text-gray-900">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-500" />
              <span>{allotmentRecord.studentName}</span>
            </span>
            <span className="font-mono text-crimson-700">{allotmentRecord.rollNumber}</span>
          </div>
          <div className="text-gray-500">
            Branch: <strong className="text-gray-800">{allotmentRecord.branch}</strong> • Section: <strong className="text-gray-800">{allotmentRecord.section}</strong> • {allotmentRecord.elective_type}
          </div>
          <div className="text-gray-500">
            Current Allotment: <strong className="text-gray-800">{allotmentRecord.subjectName}</strong> ({allotmentRecord.status})
          </div>
        </div>

        {/* New Subject Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            New Assigned {allotmentRecord.elective_type === 'PE' ? 'Professional (PE)' : 'Open (OE)'} Subject *
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent bg-white font-medium"
          >
            <option value="">-- Mark as WAITLISTED (No Subject) --</option>
            {eligibleSubjects
              .filter(s => !allotmentRecord.elective_type || s.elective_type === allotmentRecord.elective_type)
              .map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_code} - {s.subject_name} ({s.branch}) (Seats Left: {s.available_seats}/{s.seats})
                </option>
            ))}
          </select>
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Reason / Justification for Override *
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Special accommodation approved by Dean / Medical leave consideration / Course prerequisite resolution"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            This reason will be permanently archived in the coordinator audit logs.
          </p>
        </div>

        {/* Actions */}
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
            {loading ? 'Recording...' : 'Apply & Log Override'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
