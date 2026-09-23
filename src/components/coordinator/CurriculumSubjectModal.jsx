import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { BookOpen, Globe, Layers, AlertCircle } from 'lucide-react';
import { normalizeBatch, parseOfferedBranches, normalizeBranchName } from '../../lib/storage';
import { coordinatorService } from '../../services/coordinatorService';

export default function CurriculumSubjectModal({
  isOpen,
  onClose,
  onSave,
  editingSubject = null,
  coordinatorBranch = 'CSE',
  registeredBranches = [],
  defaultBatch = ''
}) {
  const currentBranch = coordinatorBranch || 'CSE';
  const [dbBranches, setDbBranches] = useState([]);

  useEffect(() => {
    async function loadBranches() {
      if (!isOpen) return;
      try {
        const branches = await coordinatorService.getDepartments();
        if (branches && branches.length > 0) {
          setDbBranches(branches);
        }
      } catch (e) {
        console.warn('Load branches note:', e);
      }
    }
    loadBranches();
  }, [isOpen]);

  const availableTargetBranches = useMemo(() => {
    const merged = Array.from(new Set([
      ...(registeredBranches || []),
      ...(dbBranches || [])
    ]));
    return merged.filter(b => normalizeBranchName(b) !== normalizeBranchName(currentBranch));
  }, [registeredBranches, dbBranches, currentBranch]);

  const [formData, setFormData] = useState({
    batch: '',
    branch: currentBranch,
    regulation: '',
    semester: '',
    elective_type: 'PE',
    elective_number: 1,
    subject_code: '',
    subject_name: '',
    offered_branches: [currentBranch]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const currBranch = coordinatorBranch || 'CSE';
    if (editingSubject) {
      const eType = editingSubject.elective_type || 'PE';
      setFormData({
        batch: normalizeBatch(editingSubject.batch || defaultBatch || ''),
        branch: editingSubject.branch || currBranch,
        regulation: editingSubject.regulation || '',
        semester: editingSubject.semester !== undefined && editingSubject.semester !== '' ? Number(editingSubject.semester) : '',
        elective_type: eType,
        elective_number: Number(editingSubject.elective_number || 1),
        subject_code: editingSubject.subject_code || '',
        subject_name: editingSubject.subject_name || '',
        offered_branches: parseOfferedBranches(editingSubject.offered_branches, eType === 'OE' ? ['ALL'] : [currBranch])
      });
    } else {
      setFormData({
        batch: '',
        branch: currBranch,
        regulation: '',
        semester: '',
        elective_type: 'PE',
        elective_number: 1,
        subject_code: '',
        subject_name: '',
        offered_branches: [currBranch]
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
    const cleanRegulation = String(formData.regulation || '').trim().toUpperCase();

    if (!cleanBatch) {
      setError('Please provide the Target Academic Batch.');
      return;
    }

    if (!cleanRegulation) {
      setError('Please enter the Regulation (e.g. AR23).');
      return;
    }

    if (formData.semester === '' || isNaN(Number(formData.semester))) {
      setError('Please select the Target Semester.');
      return;
    }

    if (!cleanCode || !cleanName) {
      setError('Please provide both Subject Code and Subject Name.');
      return;
    }

    try {
      setLoading(true);
      const cleanOfferingBranch = coordinatorBranch || formData.branch || 'CSE';
      await onSave({
        ...formData,
        batch: cleanBatch,
        branch: cleanOfferingBranch,
        regulation: cleanRegulation,
        subject_code: cleanCode,
        subject_name: cleanName,
        semester: Number(formData.semester),
        elective_number: Number(formData.elective_number),
        offered_branches: parseOfferedBranches(
          formData.offered_branches,
          formData.elective_type === 'OE' ? ['ALL'] : [cleanOfferingBranch]
        )
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save curriculum subject.');
    } finally {
      setLoading(false);
    }
  };

  const isOE = formData.elective_type === 'OE';

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
              placeholder="e.g. 2025-2029"
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
              onChange={(e) => setFormData({ ...formData, semester: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
            >
              <option value="">Select Semester...</option>
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
              onChange={(e) => {
                const nextType = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  elective_type: nextType,
                  offered_branches: nextType === 'OE' ? ['ALL'] : [coordinatorBranch || 'CSE']
                }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900 focus:ring-2 focus:ring-crimson-600"
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

        {isOE && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-blue-900 block">Eligible Target Departments:</span>
            <div className="flex flex-wrap gap-2">
              {['ALL', ...availableTargetBranches].map(b => {
                const isSelected = Array.isArray(formData.offered_branches) && formData.offered_branches.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      if (b === 'ALL') {
                        setFormData(prev => ({ ...prev, offered_branches: ['ALL'] }));
                      } else {
                        const cur = (prev => {
                          const base = (prev.offered_branches || []).filter(x => x !== 'ALL');
                          return base.includes(b) ? base.filter(x => x !== b) : [...base, b];
                        })(formData);
                        setFormData(prev => ({ ...prev, offered_branches: cur.length > 0 ? cur : ['ALL'] }));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      isSelected ? 'bg-blue-700 text-white border-blue-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {b === 'ALL' ? 'All Departments' : b}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
