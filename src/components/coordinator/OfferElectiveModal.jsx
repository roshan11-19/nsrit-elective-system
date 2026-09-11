import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { 
  BookOpen, 
  Globe, 
  Check, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { normalizeBatch } from '../../lib/storage';

export default function OfferElectiveModal({
  isOpen,
  onClose,
  electiveType = 'PE',
  coordinatorBranch = 'CSE',
  registeredBranches = [],
  curriculumList = [],
  peDrives = [],
  adminWindows = [],
  onActivate,
  onOpenCustomSubjectModal,
  onOpenEstablishDriveModal,
  initialBatch = '',
  initialSemester = 5,
  initialElectiveNumber = 1
}) {
  const [selectedBatch, setSelectedBatch] = useState(initialBatch || '');
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || 5);
  const [selectedElectiveNumber, setSelectedElectiveNumber] = useState(initialElectiveNumber || 1);
  const [selectedCurriculumIds, setSelectedCurriculumIds] = useState([]);
  const [curriculumSeatMap, setCurriculumSeatMap] = useState({});
  const [curriculumBranchesMap, setCurriculumBranchesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Available curriculum batches for this elective type
  const availableBatches = useMemo(() => {
    return Array.from(new Set(
      curriculumList
        .filter(c => c.elective_type === electiveType)
        .map(c => normalizeBatch(c.batch))
        .filter(Boolean)
    )).sort();
  }, [curriculumList, electiveType]);

  // Available semesters for selected batch and elective type
  const availableSemesters = useMemo(() => {
    return Array.from(new Set(
      curriculumList
        .filter(c => c.elective_type === electiveType && (!selectedBatch || normalizeBatch(c.batch) === normalizeBatch(selectedBatch)))
        .map(c => Number(c.semester))
        .filter(Boolean)
    )).sort((a, b) => a - b);
  }, [curriculumList, electiveType, selectedBatch]);

  // Available elective numbers
  const availableElectiveNumbers = useMemo(() => {
    return Array.from(new Set(
      curriculumList
        .filter(c => 
          c.elective_type === electiveType && 
          (!selectedBatch || normalizeBatch(c.batch) === normalizeBatch(selectedBatch)) &&
          Number(c.semester) === Number(selectedSemester)
        )
        .map(c => Number(c.elective_number || 1))
        .filter(Boolean)
    )).sort((a, b) => a - b);
  }, [curriculumList, electiveType, selectedBatch, selectedSemester]);

  // Reset and sync selections when opening modal
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSelectedCurriculumIds([]);
    setCurriculumSeatMap({});
    setCurriculumBranchesMap({});

    if (initialBatch && availableBatches.includes(initialBatch)) {
      setSelectedBatch(initialBatch);
    } else if (availableBatches.length > 0) {
      setSelectedBatch(availableBatches[0]);
    } else {
      setSelectedBatch('');
    }
  }, [isOpen, initialBatch, availableBatches]);

  useEffect(() => {
    if (availableSemesters.length > 0) {
      if (!availableSemesters.includes(Number(selectedSemester))) {
        setSelectedSemester(availableSemesters[0]);
      }
    } else {
      setSelectedSemester(5);
    }
  }, [selectedBatch, availableSemesters]);

  useEffect(() => {
    if (availableElectiveNumbers.length > 0) {
      if (!availableElectiveNumbers.includes(Number(selectedElectiveNumber))) {
        setSelectedElectiveNumber(availableElectiveNumbers[0]);
      }
    } else {
      setSelectedElectiveNumber(1);
    }
  }, [selectedBatch, selectedSemester, availableElectiveNumbers]);

  // Filter matching curriculum subjects
  const availableCourses = useMemo(() => {
    return curriculumList.filter(c => {
      if (selectedBatch && normalizeBatch(c.batch) !== normalizeBatch(selectedBatch)) return false;
      if (Number(c.semester) !== Number(selectedSemester)) return false;
      if (c.elective_type !== electiveType) return false;
      if (Number(c.elective_number || 1) !== Number(selectedElectiveNumber)) return false;
      return true;
    });
  }, [curriculumList, selectedBatch, selectedSemester, selectedElectiveNumber, electiveType]);

  // Check Drive / Batch Control status:
  // PE -> Department PE Selection Drive configured by Coordinator in Tab 2
  // OE -> Institution OE Selection Drive configured by Central Admin
  const matchingDrive = useMemo(() => {
    if (electiveType === 'PE') {
      return peDrives.find(d => 
        normalizeBatch(d.batch) === normalizeBatch(selectedBatch) && 
        Number(d.semester) === Number(selectedSemester)
      );
    } else {
      return adminWindows.find(w => 
        normalizeBatch(w.batch) === normalizeBatch(selectedBatch) && 
        Number(w.semester) === Number(selectedSemester)
      );
    }
  }, [electiveType, peDrives, adminWindows, selectedBatch, selectedSemester]);

  const isDriveEstablished = !!matchingDrive;
  const isDriveActive = matchingDrive?.status === 'ACTIVE';

  // Toggle subject selection
  const handleToggleSelect = (currId) => {
    setSelectedCurriculumIds(prev => 
      prev.includes(currId) ? prev.filter(id => id !== currId) : [...prev, currId]
    );
  };

  // Toggle all available subjects
  const handleSelectAll = () => {
    if (selectedCurriculumIds.length === availableCourses.length) {
      setSelectedCurriculumIds([]);
    } else {
      setSelectedCurriculumIds(availableCourses.map(c => c.id));
    }
  };

  // Seat capacity change
  const handleSeatChange = (currId, seats) => {
    setCurriculumSeatMap(prev => ({ ...prev, [currId]: seats }));
  };

  // Target branches toggle for OE
  const handleBranchToggle = (currId, branchCode) => {
    const curr = availableCourses.find(c => c.id === currId);
    const defaultBranches = Array.isArray(curr?.offered_branches) ? curr.offered_branches : ['ALL'];
    const currentList = curriculumBranchesMap[currId] || defaultBranches;

    if (branchCode === 'ALL') {
      setCurriculumBranchesMap(prev => ({ ...prev, [currId]: ['ALL'] }));
      return;
    }

    let nextList = currentList.filter(b => b !== 'ALL');
    if (nextList.includes(branchCode)) {
      nextList = nextList.filter(b => b !== branchCode);
      if (nextList.length === 0) nextList = ['ALL'];
    } else {
      nextList.push(branchCode);
    }
    setCurriculumBranchesMap(prev => ({ ...prev, [currId]: nextList }));
  };

  const otherBranches = useMemo(() => {
    return registeredBranches.length > 0
      ? registeredBranches.filter(b => b.toUpperCase() !== String(coordinatorBranch).toUpperCase())
      : ['ECE', 'MECH', 'CIVIL', 'EEE', 'AIML', 'IT'];
  }, [registeredBranches, coordinatorBranch]);

  // Submit and offer selected subjects
  const handleSubmit = async () => {
    setError('');
    if (!selectedBatch) {
      setError('Please select an Academic Batch.');
      return;
    }

    if (!isDriveEstablished) {
      if (electiveType === 'PE') {
        setError(`Cannot offer PE subjects. Please establish a PE Selection Drive for Batch ${selectedBatch} (Semester ${selectedSemester}) in Tab 2 first.`);
      } else {
        setError(`Cannot offer OE subjects. Central Administrator must first configure an Open Elective Selection Drive for Batch ${selectedBatch} (Semester ${selectedSemester}) in the Admin Portal.`);
      }
      return;
    }

    if (isDriveActive) {
      setError(`Cannot offer or modify subjects while ${electiveType === 'PE' ? 'PE' : 'Institution OE'} Selection Drive is ACTIVE for Batch ${selectedBatch} (Semester ${selectedSemester}). Please pause the drive first.`);
      return;
    }

    if (selectedCurriculumIds.length === 0) {
      setError('Please select at least one curriculum course to offer.');
      return;
    }

    try {
      setLoading(true);
      const itemsToActivate = selectedCurriculumIds.map(currId => {
        const curr = availableCourses.find(c => c.id === currId);
        const rawSeat = curriculumSeatMap[currId];
        const seatVal = (rawSeat !== undefined && rawSeat !== '' && !isNaN(Number(rawSeat)))
          ? Math.max(1, parseInt(rawSeat, 10))
          : 60;
        
        const targetBranches = electiveType === 'PE'
          ? [coordinatorBranch]
          : (curriculumBranchesMap[currId] || (curr?.offered_branches || ['ALL']));

        return {
          subject_code: curr.subject_code,
          subject_name: curr.subject_name,
          regulation: curr.regulation || 'AR23',
          seats: seatVal,
          offered_branches: targetBranches
        };
      });

      await onActivate({
        batch: normalizeBatch(selectedBatch),
        branch: coordinatorBranch,
        semester: Number(selectedSemester),
        elective_type: electiveType,
        elective_number: Number(selectedElectiveNumber),
        curriculumSubjects: itemsToActivate
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to activate offerings.');
    } finally {
      setLoading(false);
    }
  };

  const isPE = electiveType === 'PE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPE ? 'Offer Professional Electives from Curriculum' : 'Offer Open Electives from Curriculum'}
      subtitle={`Select syllabus courses to activate for ${isPE ? `${coordinatorBranch} students` : 'cross-department student selection'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3.5 text-xs bg-crimson-50 text-crimson-800 border border-crimson-200 rounded-2xl flex items-start gap-2.5 font-medium shadow-2xs">
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Cascading Toolbar (Batch, Semester, Elective Number) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Target Academic Batch *
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(normalizeBatch(e.target.value));
                setSelectedCurriculumIds([]);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-bold focus:ring-2 focus:ring-crimson-600 font-mono"
            >
              <option value="">-- Select Batch --</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Semester *
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(Number(e.target.value));
                setSelectedCurriculumIds([]);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-bold focus:ring-2 focus:ring-crimson-600"
            >
              {availableSemesters.length > 0 ? (
                availableSemesters.map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))
              ) : (
                [5, 6, 7, 8, 1, 2, 3, 4].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              {isPE ? 'Professional Elective (PE) No.' : 'Open Elective (OE) No.'} *
            </label>
            <select
              value={selectedElectiveNumber}
              onChange={(e) => {
                setSelectedElectiveNumber(Number(e.target.value));
                setSelectedCurriculumIds([]);
              }}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:ring-2 ${
                isPE 
                  ? 'border-blue-300 bg-blue-50 text-blue-900 focus:ring-blue-600' 
                  : 'border-purple-300 bg-purple-50 text-purple-900 focus:ring-purple-600'
              }`}
            >
              {availableElectiveNumbers.length > 0 ? (
                availableElectiveNumbers.map(n => (
                  <option key={n} value={n}>
                    {isPE ? `Professional Elective ${n} (PE-${n})` : `Open Elective ${n} (OE-${n})`}
                  </option>
                ))
              ) : (
                [1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>
                    {isPE ? `Professional Elective ${n} (PE-${n})` : `Open Elective ${n} (OE-${n})`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* 2. Drive / Batch Control Status Banner (Applies to both PE and OE) */}
        <div>
          {!isDriveEstablished ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {isPE ? 'PE Selection Drive Not Established' : 'Admin OE Batch Control Not Established'}
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {isPE ? (
                      <>
                        You must establish a PE Drive for <strong>Batch {selectedBatch || '(Select Batch)'} (Sem {selectedSemester})</strong> in Tab 2 before activating offerings.
                      </>
                    ) : (
                      <>
                        Central Administrator must first configure an <strong>Open Elective (OE) Selection Drive</strong> for <strong>Batch {selectedBatch || '(Select Batch)'} (Sem {selectedSemester})</strong> in the Admin Portal before department coordinators can offer Open Electives.
                      </>
                    )}
                  </p>
                </div>
              </div>
              {isPE && onOpenEstablishDriveModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEstablishDriveModal({ 
                      batch: selectedBatch, 
                      semester: selectedSemester, 
                      elective_number: selectedElectiveNumber 
                    });
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Establish PE Drive Now</span>
                </button>
              )}
            </div>
          ) : isDriveActive ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-300 rounded-2xl flex items-start sm:items-center gap-3 shadow-2xs">
              <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0 animate-pulse">
                <Lock className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                    Student Selection Active • Offerings Frozen
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {isPE ? (
                    <>
                      PE Selection Drive for <strong>Batch {selectedBatch} (Sem {selectedSemester})</strong> is actively running. Offerings cannot be modified while live. Pause the drive in Tab 2 to make changes.
                    </>
                  ) : (
                    <>
                      Institution OE Selection Drive for <strong>Batch {selectedBatch} (Sem {selectedSemester})</strong> is actively running. Offerings cannot be modified while live. Contact Central Administrator to pause the drive to make changes.
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-blue-900">
                  {isPE ? 'PE Drive Configured & Ready (Selection Paused)' : 'Admin OE Batch Control Active & Ready'}
                </span>
                <p className="text-[11px] text-blue-700">
                  {isPE 
                    ? `Drive for Batch ${selectedBatch} (Sem ${selectedSemester}) is configured. Offerings can be freely added or edited.` 
                    : `Admin OE Drive for Batch ${selectedBatch} (Sem ${selectedSemester}) is established. Coordinators can freely offer subjects.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Matching Curriculum Courses List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 font-display">
                Curriculum Courses for {isPE ? `PE-${selectedElectiveNumber}` : `OE-${selectedElectiveNumber}`} ({selectedBatch ? `Batch ${selectedBatch}, ` : ''}Sem {selectedSemester}):
              </span>
              <span className="text-xs text-gray-500">
                ({availableCourses.length} available)
              </span>
            </div>

            {availableCourses.length > 0 && (
              <button
                type="button"
                disabled={!isDriveEstablished || isDriveActive}
                onClick={handleSelectAll}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedCurriculumIds.length === availableCourses.length ? 'Deselect All' : 'Select All Courses'}
              </button>
            )}
          </div>

          {availableCourses.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {availableCourses.map(curr => {
                const isSelected = selectedCurriculumIds.includes(curr.id);
                const seatCount = curriculumSeatMap[curr.id] !== undefined ? curriculumSeatMap[curr.id] : 60;
                const isDisabled = !isDriveEstablished || isDriveActive;

                const defaultBranches = Array.isArray(curr.offered_branches) ? curr.offered_branches : ['ALL'];
                const selectedBranches = curriculumBranchesMap[curr.id] || defaultBranches;

                return (
                  <div
                    key={curr.id}
                    className={`p-4 transition-colors space-y-3 ${
                      isDisabled 
                        ? 'bg-gray-50/60 opacity-60' 
                        : isSelected 
                        ? (isPE ? 'bg-blue-50/60' : 'bg-purple-50/60') 
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => handleToggleSelect(curr.id)}
                          className={`w-5 h-5 rounded mt-0.5 cursor-pointer disabled:cursor-not-allowed ${
                            isPE 
                              ? 'text-blue-600 focus:ring-blue-500 border-gray-300' 
                              : 'text-purple-600 focus:ring-purple-500 border-gray-300'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-sm ${isPE ? 'text-blue-700' : 'text-purple-700'}`}>
                              {curr.subject_code}
                            </span>
                            <span className="text-xs font-bold text-gray-900 font-display">
                              {curr.subject_name}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            Regulation: {curr.regulation || 'AR23'} • {isPE ? `PE-${curr.elective_number || 1}` : `OE-${curr.elective_number || 1}`} • Department of {coordinatorBranch}
                          </span>
                        </div>
                      </div>

                      {/* Seat Capacity */}
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                          Seat Capacity:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          disabled={isDisabled}
                          value={seatCount}
                          onChange={(e) => handleSeatChange(curr.id, e.target.value)}
                          className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-bold text-center text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* VIBRANT TARGET BRANCHES SELECTOR (ONLY FOR OE) */}
                    {!isPE && (
                      <div className="pl-8 pt-2 border-t border-purple-100/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-purple-700" />
                            <span>Select Eligible Student Branches:</span>
                          </span>
                          <span className="text-[11px] font-bold text-purple-700">
                            {selectedBranches.includes('ALL') 
                              ? 'Offered to All Registered Branches' 
                              : `${selectedBranches.length} Branch(es) Selected`}
                          </span>
                        </div>

                        {/* High-Contrast Interactive Branch Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBranchToggle(curr.id, 'ALL')}
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold font-mono transition-all flex items-center gap-1.5 shadow-2xs ${
                              selectedBranches.includes('ALL')
                                ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-400'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                            }`}
                          >
                            {selectedBranches.includes('ALL') && <Check className="w-3.5 h-3.5 text-white" />}
                            <span>ALL BRANCHES</span>
                          </button>

                          {otherBranches.map(b => {
                            const isSelected = selectedBranches.includes('ALL') || selectedBranches.includes(b);
                            return (
                              <button
                                key={b}
                                type="button"
                                onClick={() => handleBranchToggle(curr.id, b)}
                                className={`px-3 py-1 rounded-xl text-xs font-extrabold font-mono transition-all flex items-center gap-1.5 shadow-2xs ${
                                  isSelected
                                    ? 'bg-purple-100 text-purple-900 border-2 border-purple-600 shadow-xs'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:border-purple-300 hover:bg-purple-50/50'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-700" />}
                                <span>{b}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-700 font-bold">
                No curriculum courses found for {isPE ? `PE-${selectedElectiveNumber}` : `OE-${selectedElectiveNumber}`} ({selectedBatch ? `Batch ${selectedBatch}, ` : ''}Sem {selectedSemester}).
              </p>
              <p className="text-[11px] text-gray-500">
                Ensure subjects are uploaded in <strong>1. Upload Curriculum</strong>, or add a manual custom subject below.
              </p>
            </div>
          )}
        </div>

        {/* 4. Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCustomSubjectModal) {
                onOpenCustomSubjectModal({
                  type: electiveType,
                  batch: selectedBatch,
                  semester: Number(selectedSemester),
                  elective_number: Number(selectedElectiveNumber),
                  regulation: 'AR23'
                });
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Custom Manual Subject</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                selectedCurriculumIds.length === 0 || 
                loading || 
                !isDriveEstablished || 
                isDriveActive
              }
              onClick={handleSubmit}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all ${
                isPE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-700 hover:bg-purple-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Activating Offerings...' 
                  : `Offer & Activate Selected Courses (${selectedCurriculumIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
