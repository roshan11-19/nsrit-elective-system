import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Layers, CheckSquare, Square, Info, Calendar } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { coordinatorService } from '../../services/coordinatorService';
import { normalizeBatch } from '../../lib/storage';

export default function SubjectModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingSubject = null, 
  defaultType = 'PE',
  defaultBatch = '',
  defaultSemester = 5,
  defaultElectiveNumber = 1,
  defaultRegulation = 'AR23',
  coordinatorBranch = 'CSE',
  registeredBranches = []
}) {
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    elective_type: defaultType,
    elective_number: defaultElectiveNumber || 1,
    branch: coordinatorBranch,
    offered_branches: [],
    admitted_batch: defaultBatch || '',
    regulation: defaultRegulation || 'AR23',
    semester: defaultSemester || 5,
    seats: 60,
    active: true
  });

  const [availableBranches, setAvailableBranches] = useState([]);
  const [adminBatches, setAdminBatches] = useState([]);
  const [adminWindows, setAdminWindows] = useState([]);
  const [peWindows, setPeWindows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load registered coordinator branches and selection windows
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [coords, windows, peWins] = await Promise.all([
          registeredBranches && registeredBranches.length > 0 
            ? Promise.resolve([]) 
            : adminService.getCoordinators(),
          adminService.getSelectionWindows(),
          coordinatorService.getPESelectionWindows(coordinatorBranch)
        ]);

        if (registeredBranches && registeredBranches.length > 0) {
          setAvailableBranches(registeredBranches.filter(b => b.toUpperCase() !== String(coordinatorBranch).toUpperCase()));
        } else if (coords && coords.length > 0) {
          const branches = Array.from(new Set(coords.map(c => c.branch).filter(Boolean)))
            .filter(b => b.toUpperCase() !== String(coordinatorBranch).toUpperCase());
          setAvailableBranches(branches);
        }

        const winList = windows || [];
        setAdminWindows(winList);
        setPeWindows(peWins || []);

        const batches = Array.from(new Set([
          ...winList.map(w => normalizeBatch(w.batch)),
          ...(peWins || []).map(w => normalizeBatch(w.batch))
        ].filter(Boolean)));
        
        setAdminBatches(batches);
      } catch (err) {
        console.warn('Metadata load note in SubjectModal:', err);
      }
    }
    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen, coordinatorBranch, registeredBranches]);

  useEffect(() => {
    if (!isOpen) return;

    const currentBranch = coordinatorBranch || 'CSE';
    if (editingSubject) {
      let offered = editingSubject.offered_branches;
      if (typeof offered === 'string') {
        try { offered = JSON.parse(offered); } catch { offered = [offered]; }
      }
      setFormData({
        subject_code: editingSubject.subject_code || '',
        subject_name: editingSubject.subject_name || '',
        elective_type: editingSubject.elective_type || defaultType,
        elective_number: Number(editingSubject.elective_number || 1),
        branch: editingSubject.branch || currentBranch,
        offered_branches: Array.isArray(offered) ? offered : [],
        admitted_batch: normalizeBatch(editingSubject.admitted_batch || ''),
        regulation: editingSubject.regulation || defaultRegulation || 'AR23',
        semester: Number(editingSubject.semester || defaultSemester || 5),
        seats: editingSubject.seats !== undefined && editingSubject.seats !== null ? editingSubject.seats : 60,
        active: editingSubject.active ?? true
      });
    } else {
      setFormData({
        subject_code: '',
        subject_name: '',
        elective_type: defaultType,
        elective_number: Number(defaultElectiveNumber || 1),
        branch: currentBranch,
        offered_branches: defaultType === 'OE' ? availableBranches : [currentBranch],
        admitted_batch: defaultBatch || adminBatches[0] || '',
        regulation: defaultRegulation || 'AR23',
        semester: Number(defaultSemester || 5),
        seats: 60,
        active: true
      });
    }
    setError('');
  }, [isOpen, editingSubject, defaultType, defaultBatch, defaultSemester, defaultElectiveNumber, defaultRegulation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanBatch = normalizeBatch(formData.admitted_batch);
    if (!cleanBatch) {
      setError('Please specify the Target Academic Batch.');
      return;
    }

    if (!formData.subject_code.trim() || !formData.subject_name.trim()) {
      setError('Please fill in both Subject Code and Subject Title.');
      return;
    }

    const seatsNum = formData.seats === '' ? 60 : Number(formData.seats);
    if (seatsNum <= 0 || isNaN(seatsNum)) {
      setError('Seat capacity must be greater than 0.');
      return;
    }

    if (formData.elective_type === 'PE') {
      const matchingDrive = peWindows.find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === Number(formData.semester)
      );
      if (!matchingDrive) {
        setError(`No PE Selection Drive established for Batch ${cleanBatch} (Semester ${formData.semester}). Please establish the drive in Tab 2 before adding offerings.`);
        return;
      }
      if (matchingDrive.status === 'ACTIVE') {
        setError(`Cannot add or edit subjects while the PE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${formData.semester}). Please pause the drive in Tab 2 first.`);
        return;
      }
    }

    if (formData.elective_type === 'OE') {
      const matchingAdminDrive = adminWindows.find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === Number(formData.semester)
      );
      if (!matchingAdminDrive) {
        setError(`No Admin OE Selection Drive configured for Batch ${cleanBatch} (Semester ${formData.semester}). Central Administrator must first configure this drive in the Admin Portal before Open Electives can be offered.`);
        return;
      }
      if (matchingAdminDrive.status === 'ACTIVE') {
        setError(`Cannot add or edit subjects while the Institution OE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${formData.semester}). Contact Central Administrator to pause the drive first.`);
        return;
      }
    }

    if (formData.elective_type === 'OE' && (!formData.offered_branches || formData.offered_branches.length === 0)) {
      setError('Please select at least one branch to offer this Open Elective to.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        subject_code: formData.subject_code.trim().toUpperCase().replace(/\s+/g, ''),
        subject_name: formData.subject_name.trim(),
        elective_number: Number(formData.elective_number || 1),
        branch: coordinatorBranch || formData.branch || 'CSE',
        admitted_batch: cleanBatch,
        regulation: (formData.regulation || 'AR23').trim().toUpperCase().replace(/\s+/g, ''),
        seats: Number(formData.seats),
        semester: Number(formData.semester),
        offered_branches: formData.elective_type === 'PE' 
          ? [coordinatorBranch || formData.branch || 'CSE'] 
          : formData.offered_branches
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save subject.');
    } finally {
      setLoading(false);
    }
  };

  const cleanBatchVal = normalizeBatch(formData.admitted_batch);
  const matchingPEDriveVal = peWindows.find(w => 
    normalizeBatch(w.batch) === cleanBatchVal && Number(w.semester) === Number(formData.semester)
  );
  const matchingOEDriveVal = adminWindows.find(w => 
    normalizeBatch(w.batch) === cleanBatchVal && Number(w.semester) === Number(formData.semester)
  );
  const activeDrive = formData.elective_type === 'PE' ? matchingPEDriveVal : matchingOEDriveVal;
  const isDriveConfigured = !!activeDrive;
  const isDriveLive = activeDrive?.status === 'ACTIVE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSubject 
        ? `Edit ${formData.elective_type === 'PE' ? 'Professional' : 'Open'} Elective` 
        : `Add ${formData.elective_type === 'PE' ? 'Professional' : 'Open'} Elective Subject`}
      subtitle={`Offered by Department of ${coordinatorBranch || 'Department'}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Drive Status Notice */}
        {!isDriveConfigured ? (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {formData.elective_type === 'PE' ? 'PE Selection Drive Not Established' : 'Admin OE Batch Drive Not Configured'}
              </span>
              <span className="text-[11px] text-amber-800">
                {formData.elective_type === 'PE'
                  ? `Establish a PE Selection Drive for Batch ${cleanBatchVal || '—'} (Sem ${formData.semester}) in Tab 2 before saving offerings.`
                  : `Admin must configure an OE Selection Drive for Batch ${cleanBatchVal || '—'} (Sem ${formData.semester}) in the Admin Portal first.`}
              </span>
            </div>
          </div>
        ) : isDriveLive ? (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Student Selection Active (Editing Frozen)</span>
              <span className="text-[11px] text-amber-800">
                {formData.elective_type === 'PE' 
                  ? 'Pause the PE drive in Tab 2 to make subject changes.'
                  : 'Contact Central Admin to pause the OE drive before making subject changes.'}
              </span>
            </div>
          </div>
        ) : null}

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
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/\s+/g, '');
                setFormData(prev => ({ ...prev, subject_code: val }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-mono font-bold uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Elective Category *
            </label>
            <select
              value={formData.elective_type}
              onChange={(e) => {
                const type = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  elective_type: type,
                  offered_branches: type === 'PE' ? [coordinatorBranch] : availableBranches
                }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 bg-white font-semibold"
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
              onChange={(e) => setFormData(prev => ({ ...prev, elective_number: Number(e.target.value) }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 text-sm focus:ring-2 focus:ring-purple-600 bg-purple-50 text-purple-900 font-bold"
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

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Subject Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Deep Learning & Neural Networks"
            value={formData.subject_name}
            onChange={(e) => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, subject_name: val }));
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Target Batch *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2024-2028"
              value={formData.admitted_batch}
              onChange={(e) => setFormData({ ...formData, admitted_batch: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, admitted_batch: normalizeBatch(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFormData(prev => ({ ...prev, semester: val }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
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
              onChange={(e) => setFormData(prev => ({ ...prev, regulation: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Seat Capacity *
            </label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={formData.seats}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                setFormData(prev => ({ ...prev, seats: val }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-center"
            />
          </div>
        </div>

        {formData.elective_type === 'OE' && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-blue-900 block">Eligible Target Departments:</span>
            <div className="flex flex-wrap gap-2">
              {['ALL', ...availableBranches].map(b => {
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
            {loading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
