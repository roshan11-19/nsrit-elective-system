import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { Play, Calendar, AlertCircle, Sparkles, BookOpen, Layers, CheckCircle2, Clock } from 'lucide-react';
import { normalizeBatch } from '../../lib/storage';

export default function PESelectionDriveModal({
  isOpen,
  onClose,
  onSave,
  coordinatorBranch = 'CSE',
  availableBatches = [],
  curriculumList = [],
  initialBatch = '',
  initialSemester = '',
  initialElectiveNumber = ''
}) {
  const cleanInitBatch = typeof initialBatch === 'string' ? initialBatch : (initialBatch?.batch || '');
  const cleanInitSem = (initialSemester !== undefined && initialSemester !== '' && !isNaN(Number(initialSemester))) ? Number(initialSemester) : '';
  const cleanInitElective = (initialElectiveNumber !== undefined && initialElectiveNumber !== '' && !isNaN(Number(initialElectiveNumber))) ? Number(initialElectiveNumber) : '';

  const [formData, setFormData] = useState({
    batch: cleanInitBatch || '',
    semester: cleanInitSem || '',
    elective_number: cleanInitElective || '',
    status: 'LOCKED',
    due_date: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Dynamic Batches available in curriculum for this department / PE
  const batchOptions = useMemo(() => {
    const fromCurr = curriculumList
      .filter(c => 
        (c.elective_type === 'PE' || c.elective_type === 'Professional Elective') && 
        (!coordinatorBranch || !c.branch || c.branch === coordinatorBranch || c.branch === 'ALL')
      )
      .map(c => normalizeBatch(c.batch))
      .filter(Boolean);

    const allBatches = Array.from(new Set([
      ...fromCurr,
      ...availableBatches.map(b => normalizeBatch(b)),
      cleanInitBatch ? normalizeBatch(cleanInitBatch) : null
    ].filter(Boolean))).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));

    return allBatches;
  }, [curriculumList, coordinatorBranch, availableBatches, cleanInitBatch]);

  // 2. Dynamic Semesters configured for the selected batch in curriculum
  const availableSemesters = useMemo(() => {
    if (!formData.batch) return [1, 2, 3, 4, 5, 6, 7, 8];
    const sems = Array.from(new Set(
      curriculumList
        .filter(c => 
          (c.elective_type === 'PE' || c.elective_type === 'Professional Elective') &&
          (!coordinatorBranch || !c.branch || c.branch === coordinatorBranch || c.branch === 'ALL') &&
          normalizeBatch(c.batch) === normalizeBatch(formData.batch)
        )
        .map(c => Number(c.semester))
        .filter(Boolean)
    )).sort((a, b) => a - b);

    return sems.length > 0 ? sems : [1, 2, 3, 4, 5, 6, 7, 8];
  }, [curriculumList, coordinatorBranch, formData.batch]);

  // 3. Dynamic PE Electives present in curriculum ONLY for the selected Batch and Semester
  const peCurriculumElectives = useMemo(() => {
    if (!formData.batch || !formData.semester) return [];
    const cleanBatch = normalizeBatch(formData.batch);
    const cleanSem = Number(formData.semester);

    const matching = curriculumList.filter(c => 
      (c.elective_type === 'PE' || c.elective_type === 'Professional Elective') &&
      (!coordinatorBranch || !c.branch || c.branch === coordinatorBranch || c.branch === 'ALL') &&
      normalizeBatch(c.batch) === cleanBatch &&
      Number(c.semester) === cleanSem
    );

    const map = new Map();
    matching.forEach(c => {
      const num = Number(c.elective_number || 1);
      if (!map.has(num)) {
        map.set(num, {
          number: num,
          subjects: [],
          regulation: c.regulation || 'AR23'
        });
      }
      map.get(num).subjects.push(c);
    });

    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  }, [curriculumList, coordinatorBranch, formData.batch, formData.semester]);

  const availableElectiveNumbers = useMemo(() => {
    if (peCurriculumElectives.length > 0) {
      return peCurriculumElectives.map(e => e.number);
    }
    return [1, 2, 3, 4, 5, 6];
  }, [peCurriculumElectives]);

  // Reset and initialize when opening
  useEffect(() => {
    if (isOpen) {
      const initB = typeof initialBatch === 'string' ? initialBatch : (initialBatch?.batch || '');
      const initS = (initialSemester !== undefined && initialSemester !== '' && !isNaN(Number(initialSemester))) ? Number(initialSemester) : '';
      const initE = (initialElectiveNumber !== undefined && initialElectiveNumber !== '' && !isNaN(Number(initialElectiveNumber))) ? Number(initialElectiveNumber) : '';

      setFormData({
        batch: initB ? normalizeBatch(initB) : '',
        semester: initS !== '' ? Number(initS) : '',
        elective_number: initE !== '' ? Number(initE) : '',
        status: 'LOCKED',
        due_date: ''
      });
      setError('');
    }
  }, [isOpen, initialBatch, initialSemester, initialElectiveNumber]);

  // Auto-sync elective number only if one was previously selected and is no longer valid
  useEffect(() => {
    if (formData.elective_number && availableElectiveNumbers.length > 0) {
      if (!availableElectiveNumbers.includes(Number(formData.elective_number))) {
        setFormData(prev => ({ ...prev, elective_number: '' }));
      }
    }
  }, [availableElectiveNumbers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBatch = normalizeBatch(formData.batch);
    const cleanSem = formData.semester !== '' ? Number(formData.semester) : null;
    const cleanElectiveNum = formData.elective_number !== '' ? Number(formData.elective_number) : null;

    if (!cleanBatch) {
      setError('Please select or provide the Target Academic Batch.');
      return;
    }

    if (!cleanSem) {
      setError('Please select the Target Semester.');
      return;
    }

    if (!cleanElectiveNum) {
      setError('Please select the Professional Elective (PE) Slot.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        batch: cleanBatch,
        branch: coordinatorBranch,
        semester: cleanSem,
        elective_type: 'PE',
        elective_number: cleanElectiveNum,
        status: formData.status || 'LOCKED',
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        title: `Batch ${cleanBatch} • Semester ${cleanSem} • Professional Elective ${cleanElectiveNum} (${coordinatorBranch})`
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to configure PE Selection Drive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Professional Elective (PE) Selection Drive"
      subtitle={`Configure student elective window for Department of ${coordinatorBranch}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Target Academic Batch *
          </label>
          {batchOptions.length > 0 ? (
            <select
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800 focus:ring-2 focus:ring-crimson-600 shadow-2xs"
            >
              <option value="">Select Batch...</option>
              {batchOptions.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, batch: normalizeBatch(e.target.value) })}
              placeholder="e.g. 2024-2028"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:ring-2 focus:ring-crimson-600"
            />
          )}
          <span className="text-[10px] text-gray-500 mt-0.5 block">Select the student cohort batch to open elective selections for.</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600 shadow-2xs"
            >
              <option value="">Select Semester...</option>
              {availableSemesters.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Select target semester.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Elective Slot (PE for Sem {formData.semester || '...'}) *
            </label>
            <select
              value={formData.elective_number}
              onChange={(e) => setFormData({ ...formData, elective_number: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 text-xs font-bold bg-blue-50 text-blue-900 focus:ring-2 focus:ring-blue-600 shadow-2xs"
            >
              <option value="">Select PE Slot...</option>
              {peCurriculumElectives.length > 0 ? (
                peCurriculumElectives.map(item => (
                  <option key={item.number} value={item.number}>
                    PE-{item.number} ({item.subjects.length} course{item.subjects.length > 1 ? 's' : ''} in curriculum)
                  </option>
                ))
              ) : (
                [1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    PE-{n}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Selection Due Date & Time (Optional)
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-crimson-600 shadow-2xs"
            />
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Students will see this deadline on their portal. You can adjust this deadline anytime.
          </span>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Initial Drive Status: LOCKED (Setup Phase)</span>
          </p>
          <p className="text-[11px] text-amber-800 mt-1">
            The PE Drive will be established in <strong>LOCKED</strong> status. You can activate offerings in <strong>Tab 3 (Elective Offerings)</strong>, and click <strong>Start Selection</strong> when ready.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Configuring Drive...' : (formData.elective_number ? `Establish PE-${formData.elective_number} Drive` : 'Establish PE Drive')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
