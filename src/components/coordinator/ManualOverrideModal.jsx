import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { AlertCircle, User, BookOpen, Layers, Info } from 'lucide-react';

export default function ManualOverrideModal({ isOpen, onClose, onSave, allotmentRecord, eligibleSubjects = [] }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (allotmentRecord) {
      setSelectedSubjectId(allotmentRecord.subject_id || allotmentRecord.subjectId || '');
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
        studentId: allotmentRecord.student_id || allotmentRecord.studentId,
        electiveType: allotmentRecord.elective_type || (allotmentRecord.is_pe ? 'PE' : 'OE'),
        electiveNumber: Number(allotmentRecord.elective_number || 1),
        semester: Number(allotmentRecord.semester || 5),
        newSubjectId: selectedSubjectId || null,
        reason: reason.trim(),
        allotmentRecord
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update allotment.');
    } finally {
      setLoading(false);
    }
  };

  if (!allotmentRecord) return null;

  const displayName = allotmentRecord.studentName || allotmentRecord.student_name || 'Student';
  const displayRoll = allotmentRecord.rollNumber || allotmentRecord.roll_number || allotmentRecord.student_roll || 'N/A';
  const displayBranch = allotmentRecord.branch || allotmentRecord.student_branch || 'N/A';
  const displaySec = allotmentRecord.section || 'A';
  const electiveType = allotmentRecord.elective_type || (allotmentRecord.is_pe ? 'PE' : 'OE');
  const electiveNumber = Number(allotmentRecord.elective_number || 1);
  const currentStatus = allotmentRecord.status || 'WAITLISTED';
  const currentSubjectName = allotmentRecord.subjectName || allotmentRecord.subject_name || (currentStatus === 'WAITLISTED' ? 'WAITLISTED (No Subject)' : 'Not Assigned');

  const filteredSubjects = eligibleSubjects.filter(s => {
    if (electiveType && s.elective_type && s.elective_type !== electiveType) return false;
    if (electiveNumber && s.elective_number && Number(s.elective_number) !== electiveNumber) return false;
    if (allotmentRecord.semester && s.semester && Number(s.semester) !== Number(allotmentRecord.semester)) return false;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={electiveType === 'OE' ? 'Open Elective (OE) Allotment Override' : 'Manual Allotment Override'}
      subtitle="Modify a student's allotted course or waitlist status with official audit trail logging."
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
              <span>{displayName}</span>
            </span>
            <span className="font-mono text-crimson-700">{displayRoll}</span>
          </div>
          <div className="text-gray-500">
            Branch: <strong className="text-gray-800">{displayBranch}</strong> • Section: <strong className="text-gray-800">{displaySec}</strong> • Category: <strong className="text-gray-800">{electiveType}-{electiveNumber}</strong>
          </div>
          <div className="text-gray-500 flex items-center gap-2">
            <span>Current Status:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              currentStatus === 'ALLOTTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {currentStatus}
            </span>
            <span className="text-gray-700 font-medium truncate max-w-[200px]" title={currentSubjectName}>
              ({currentSubjectName})
            </span>
          </div>
        </div>

        {/* New Subject Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            New Assigned {electiveType === 'PE' ? `Professional Elective (PE-${electiveNumber})` : `Open Elective (OE-${electiveNumber})`} Course *
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent bg-white font-medium"
          >
            <option value="">-- Mark as WAITLISTED (No Subject Assigned) --</option>
            {filteredSubjects.map(s => {
              const isOwnBranch = electiveType === 'OE' && String(s.branch || '').toUpperCase() === String(displayBranch).toUpperCase();
              const isFull = Number(s.available_seats || 0) <= 0;
              return (
                <option key={s.id} value={s.id}>
                  {s.subject_code} - {s.subject_name} ({s.branch} Dept){isOwnBranch ? ' [Home Dept]' : ''} • Seats: {s.available_seats}/{s.seats}{isFull ? ' [CAPACITY REACHED]' : ''}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Select a course to confirm allocation, or choose Waitlisted to keep in queue.</span>
          </p>
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
            placeholder="e.g. Waitlist manual clearance / Special accommodation approved by Dean / Seat reallocation"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 focus:border-transparent"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            This reason will be permanently archived in the institution audit logs.
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
            {loading ? 'Recording...' : 'Apply & Save Override'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
