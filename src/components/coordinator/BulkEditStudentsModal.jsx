import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Layers, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function BulkEditStudentsModal({ isOpen, onClose, onBulkUpdate, selectedCount = 0 }) {
  const [updateType, setUpdateType] = useState('SEMESTER'); // 'SEMESTER' | 'SECTION' | 'REGULATION'
  const [semesterValue, setSemesterValue] = useState(5);
  const [sectionValue, setSectionValue] = useState('A');
  const [regulationValue, setRegulationValue] = useState('AR23');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let payload = {};
    if (updateType === 'SEMESTER') {
      payload = { semester: Number(semesterValue) };
    } else if (updateType === 'SECTION') {
      payload = { section: sectionValue };
    } else if (updateType === 'REGULATION') {
      payload = { regulation: regulationValue };
    }

    try {
      setLoading(true);
      await onBulkUpdate(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to perform bulk update.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batch Update ${selectedCount} Selected Students`}
      subtitle="Quickly modify semester, section, or regulation for all selected student records simultaneously."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Select Field to Update in Bulk
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setUpdateType('SEMESTER')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                updateType === 'SEMESTER'
                  ? 'bg-crimson-50 border-crimson-600 text-crimson-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Semester
            </button>
            <button
              type="button"
              onClick={() => setUpdateType('SECTION')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                updateType === 'SECTION'
                  ? 'bg-crimson-50 border-crimson-600 text-crimson-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Section
            </button>
            <button
              type="button"
              onClick={() => setUpdateType('REGULATION')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                updateType === 'REGULATION'
                  ? 'bg-crimson-50 border-crimson-600 text-crimson-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Regulation
            </button>
          </div>
        </div>

        {updateType === 'SEMESTER' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              New Semester for {selectedCount} Students
            </label>
            <select
              value={semesterValue}
              onChange={(e) => setSemesterValue(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        )}

        {updateType === 'SECTION' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              New Class Section for {selectedCount} Students
            </label>
            <select
              value={sectionValue}
              onChange={(e) => setSectionValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold bg-white text-crimson-800"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
              <option value="E">Section E</option>
            </select>
          </div>
        )}

        {updateType === 'REGULATION' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              New Regulation Scheme for {selectedCount} Students
            </label>
            <select
              value={regulationValue}
              onChange={(e) => setRegulationValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold bg-white"
            >
              <option value="AR23">AR23</option>
              <option value="AR26">AR26</option>
              <option value="AR20">AR20</option>
              <option value="AR21">AR21</option>
              <option value="Autonomous">Autonomous</option>
            </select>
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
            className="px-6 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Layers className="w-4 h-4" />
            <span>{loading ? 'Applying Batch Changes...' : `Apply to ${selectedCount} Students`}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
