import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Play, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { normalizeBatch } from '../../lib/storage';

export default function PESelectionDriveModal({
  isOpen,
  onClose,
  onSave,
  coordinatorBranch = 'CSE',
  availableBatches = [],
  initialBatch = '',
  initialSemester = 5
}) {
  const cleanInitBatch = typeof initialBatch === 'string' ? initialBatch : (initialBatch?.batch || '');
  const cleanInitSem = typeof initialSemester === 'number' ? initialSemester : (Number(initialSemester) || 5);

  const [formData, setFormData] = useState({
    batch: cleanInitBatch || availableBatches[0] || '',
    semester: cleanInitSem || 5,
    status: 'LOCKED'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const batchOptions = Array.from(new Set([
    ...availableBatches,
    cleanInitBatch,
    formData.batch
  ].map(b => normalizeBatch(b)).filter(Boolean))).sort();

  useEffect(() => {
    if (isOpen) {
      const initB = typeof initialBatch === 'string' ? initialBatch : (initialBatch?.batch || '');
      const initS = typeof initialSemester === 'number' ? initialSemester : (Number(initialSemester) || 5);
      setFormData({
        batch: initB || availableBatches[0] || '',
        semester: Number(initS || 5),
        status: 'LOCKED'
      });
      setError('');
    }
  }, [isOpen, initialBatch, initialSemester, availableBatches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBatch = normalizeBatch(formData.batch);
    const cleanSem = Number(formData.semester);

    if (!cleanBatch) {
      setError('Please provide the Target Academic Batch.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        batch: cleanBatch,
        branch: coordinatorBranch,
        semester: cleanSem,
        status: formData.status || 'LOCKED',
        title: `Batch ${cleanBatch} • Semester ${cleanSem} Professional Elective (${coordinatorBranch})`
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
      subtitle={`Configure batch student selection window for Department of ${coordinatorBranch}`}
      maxWidth="max-w-md"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800 focus:ring-2 focus:ring-crimson-600"
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
          <span className="text-[10px] text-gray-400 mt-0.5 block">Only batches configured in curriculum can run PE drives.</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Drive Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
            >
              <option value="LOCKED">LOCKED (PENDING SETUP)</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
          <p className="font-bold">Initial Drive Status:</p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            The PE Selection Drive is created in <strong>LOCKED (PENDING SETUP)</strong> status. Add & configure your offered PE subjects with seat capacities in <strong>3. Elective Offerings</strong>, then start the drive from here to open selection for students.
          </p>
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
            {loading ? 'Configuring...' : 'Establish PE Drive'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
