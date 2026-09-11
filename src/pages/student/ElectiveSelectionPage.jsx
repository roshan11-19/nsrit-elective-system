import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  BookOpen, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Award, 
  FileCheck, 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  Grid,
  Check,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import PrioritySelector from '../../components/student/PrioritySelector';
import Modal from '../../components/common/Modal';

export default function ElectiveSelectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, showToast } = useAuth();

  const currentType = searchParams.get('type') === 'OE' ? 'OE' : 'PE';
  const initialSem = Number(searchParams.get('semester')) || Number(currentUser?.semester) || 5;
  const initialElective = searchParams.get('elective') ? Number(searchParams.get('elective')) : null;

  const [selectedSemester, setSelectedSemester] = useState(initialSem);
  const [selectedElectiveNumber, setSelectedElectiveNumber] = useState(initialElective);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibleSubjects, setEligibleSubjects] = useState([]);
  const [prioritiesByElective, setPrioritiesByElective] = useState({});
  const [submittedElectives, setSubmittedElectives] = useState(new Set());
  const [allotmentRecords, setAllotmentRecords] = useState([]);
  const [selectionClosedReason, setSelectionClosedReason] = useState(null);

  // Single Elective Confirmation Modal
  const [singleConfirmElective, setSingleConfirmElective] = useState(null);

  useEffect(() => {
    const semParam = Number(searchParams.get('semester'));
    if (semParam && semParam !== selectedSemester) {
      setSelectedSemester(semParam);
      setSelectedElectiveNumber(null);
    }
  }, [searchParams]);

  // Group eligible subjects into unique elective numbers (PE-1..PE-8, OE-1..OE-8)
  const electiveNumbers = useMemo(() => {
    if (!eligibleSubjects || eligibleSubjects.length === 0) return [];
    const nums = Array.from(new Set(eligibleSubjects.map(s => Number(s.elective_number || 1)))).sort((a, b) => a - b);
    return nums;
  }, [eligibleSubjects]);

  const activeElectiveNumber = selectedElectiveNumber || electiveNumbers[0] || 1;

  const currentElectiveSubjects = useMemo(() => {
    return eligibleSubjects.filter(s => Number(s.elective_number || 1) === activeElectiveNumber);
  }, [eligibleSubjects, activeElectiveNumber]);

  const isPastSem = selectedSemester < Number(currentUser?.semester || 5);

  const isElectiveLocked = (eNum) => {
    if (isPastSem) return true;
    const num = Number(eNum);
    if (submittedElectives.has(num)) return true;
    const hasAllot = allotmentRecords.some(a => Number(a.elective_number || a.subjects?.elective_number || 1) === num);
    return Boolean(hasAllot);
  };

  const allElectivesLocked = useMemo(() => {
    if (electiveNumbers.length === 0) return false;
    return electiveNumbers.every(n => isElectiveLocked(n));
  }, [electiveNumbers, submittedElectives, allotmentRecords, isPastSem]);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        setLoading(true);
        setSelectionClosedReason(null);

        const studentProfile = {
          ...currentUser,
          semester: selectedSemester
        };

        // 1. Check if selection window is open for this batch & semester
        const windowCheck = await studentService.isSelectionOpen(studentProfile, currentType, selectedSemester);
        if (!windowCheck.isOpen) {
          setSelectionClosedReason(windowCheck.reason);
        }

        // 2. Fetch eligible subjects for this batch and selected semester
        const subjects = await studentService.getEligibleSubjects(studentProfile, currentType, selectedSemester);
        setEligibleSubjects(subjects);

        // 3. Check existing allotments & preferences strictly for this selected semester
        const existingAllots = await studentService.getAllotments(currentUser.id, currentType, currentUser.email, selectedSemester);
        const existingPrefs = await studentService.getSubmittedPreferences(currentUser.id, currentType, selectedSemester);

        setAllotmentRecords(existingAllots || []);

        const submittedSet = new Set();
        const electiveMap = {};

        // Group subjects by elective numbers
        const nums = Array.from(new Set(subjects.map(s => Number(s.elective_number || 1)))).sort((a, b) => a - b);
        const activeNums = nums.length > 0 ? nums : [1];

        // Initialize default priorities for each elective
        activeNums.forEach(eNum => {
          const eSubs = subjects.filter(s => Number(s.elective_number || 1) === eNum);
          electiveMap[eNum] = eSubs.map((s, idx) => ({
            subject_id: s.id,
            priority: idx + 1,
            elective_number: eNum
          }));
        });

        // Overlay submitted preferences per elective
        if (existingPrefs && existingPrefs.length > 0) {
          existingPrefs.forEach(p => {
            const eNum = Number(p.elective_number || p.subjects?.elective_number || 1);
            submittedSet.add(eNum);
            if (!electiveMap[eNum]) electiveMap[eNum] = [];
            
            const existingIdx = electiveMap[eNum].findIndex(item => item.subject_id === p.subject_id);
            if (existingIdx >= 0) {
              electiveMap[eNum][existingIdx].priority = p.priority;
            } else {
              electiveMap[eNum].push({
                subject_id: p.subject_id,
                priority: p.priority,
                elective_number: eNum
              });
            }
          });

          // Sort each elective list by priority
          Object.keys(electiveMap).forEach(eNum => {
            electiveMap[eNum].sort((a, b) => (a.priority || 0) - (b.priority || 0));
          });
        }

        if (existingAllots && existingAllots.length > 0) {
          existingAllots.forEach(a => {
            const eNum = Number(a.elective_number || a.subjects?.elective_number || 1);
            submittedSet.add(eNum);
          });
        }

        setSubmittedElectives(submittedSet);
        setPrioritiesByElective(electiveMap);
      } catch (err) {
        console.error('Error loading subjects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser, currentType, selectedSemester]);

  const handleTypeChange = (type) => {
    setSelectedElectiveNumber(null);
    setSearchParams({ type, semester: selectedSemester });
  };

  const handleSemesterChange = (newSem) => {
    setSelectedSemester(newSem);
    setSelectedElectiveNumber(null);
    setSearchParams({ type: currentType, semester: newSem });
  };

  const handleElectivePriorityChange = (eNum, newPriorities) => {
    setPrioritiesByElective(prev => ({
      ...prev,
      [eNum]: newPriorities.map((p, idx) => ({
        ...p,
        priority: idx + 1,
        elective_number: Number(eNum)
      }))
    }));
  };

  // Submit SINGLE elective priorities
  const handleSubmitSingleElective = async (eNum) => {
    const num = Number(eNum);
    try {
      setSubmitting(true);
      const items = prioritiesByElective[num] || [];
      if (items.length === 0) {
        showToast(`Please arrange your subject choices for ${currentType}-${num}.`, 'error');
        return;
      }

      const payload = items.map((p, idx) => ({
        subject_id: p.subject_id,
        priority: p.priority || (idx + 1),
        elective_number: num
      }));

      await studentService.submitPreferences(
        currentUser.id,
        currentType,
        payload,
        selectedSemester
      );

      setSubmittedElectives(prev => new Set([...prev, num]));
      setSingleConfirmElective(null);

      // Trigger celebratory confetti
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast(`Your ${currentType === 'PE' ? 'Professional' : 'Open'} Elective ${num} (${currentType}-${num}) choices have been locked and allotted!`);
      
      // Reload allotment records for this semester
      const freshAllotments = await studentService.getAllotments(currentUser.id, currentType, currentUser.email, selectedSemester);
      setAllotmentRecords(freshAllotments || []);
    } catch (err) {
      showToast(err.message || `Failed to submit ${currentType}-${num} priorities.`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getElectiveTitle = (eNum) => {
    return currentType === 'PE' 
      ? `Professional Elective ${eNum} (PE-${eNum})` 
      : `Open Elective ${eNum} (OE-${eNum})`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/student"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-crimson-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-semibold text-gray-400">
          Autonomous Elective Selection
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6">
        
        {/* Type Toggle Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-crimson-700">
              Elective Preference Selection
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display mt-0.5">
              {currentType === 'PE' ? 'Professional Elective (PE)' : 'Open Elective (OE)'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {allElectivesLocked
                ? `All ${currentType} choices for Semester ${selectedSemester} are permanently locked & allotted.` 
                : `Select any elective card below to rank subject priorities. Each elective (${currentType}-1, ${currentType}-2, etc.) is saved and locked individually.`}
            </p>
          </div>

          <div className="flex p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              onClick={() => handleTypeChange('PE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentType === 'PE'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Professional (PE)</span>
            </button>
            <button
              onClick={() => handleTypeChange('OE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentType === 'OE'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Elective (OE)</span>
            </button>
          </div>
        </div>

        {/* Student Academic Details & Semester Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-50 border border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">College Email</span>
            <span className="font-bold text-gray-900 truncate block">{currentUser?.email}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Roll Number</span>
            <span className="font-extrabold text-gray-900 font-mono">{currentUser?.roll_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Branch & Admitted Batch</span>
            <span className="font-bold text-gray-900">{currentUser?.branch || 'N/A'} • {currentUser?.admitted_batch ? `Batch ${currentUser.admitted_batch}` : 'Batch N/A'}</span>
          </div>
          <div>
            <label className="text-gray-500 block font-bold mb-1">Target Semester *</label>
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white text-crimson-800 shadow-2xs focus:ring-2 focus:ring-crimson-600"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>
                  Semester {s} {s === Number(currentUser?.semester) ? '(Current)' : s < Number(currentUser?.semester) ? '(Past)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Locked / Status Banner Notification */}
        {allElectivesLocked ? (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 font-bold">
              <Lock className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <div>
                <span className="text-amber-900 text-sm block">
                  {isPastSem
                    ? `Semester ${selectedSemester} Electives (Completed & Archived)`
                    : `Semester ${selectedSemester} All Electives Locked`}
                </span>
                <span className="font-normal text-amber-800 text-[11px]">
                  {isPastSem
                    ? `This is a completed past semester. Past elective choices are permanently preserved and view-only.`
                    : `Your priority choices across all ${electiveNumbers.length} electives for Semester ${selectedSemester} have been registered and allotted.`}
                </span>
              </div>
            </div>

            <Link
              to={`/student/allotment?type=${currentType}&semester=${selectedSemester}`}
              className="px-4 py-2 rounded-lg bg-white text-crimson-800 font-bold border border-amber-200 shadow-2xs hover:bg-amber-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <FileCheck className="w-4 h-4" />
              <span>View Allotment Memo (Sem {selectedSemester})</span>
            </Link>
          </div>
        ) : submittedElectives.size > 0 ? (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong>{submittedElectives.size} of {electiveNumbers.length}</strong> electives submitted & locked. You can configure and save your remaining electives below one by one.
              </span>
            </div>
          </div>
        ) : null}

      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-card">
          <div className="w-10 h-10 border-4 border-crimson-200 border-t-crimson-700 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs text-gray-500 font-medium">Loading eligible elective subjects...</p>
        </div>
      ) : selectionClosedReason ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-4">
            <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 flex-shrink-0 mt-0.5">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-black text-amber-900 font-display">
                    Elective Selection Drive is Not Yet Active
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    {selectionClosedReason}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block mb-1">Preview of Elective Subjects Added for Your Batch:</span>
                {eligibleSubjects.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                    {eligibleSubjects.map(s => (
                      <li key={s.id}>
                        <span className="font-mono font-bold text-crimson-800">
                          [{s.elective_type}-{s.elective_number || 1}] {s.subject_code}
                        </span>: {s.subject_name} ({s.seats} seats)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No subjects uploaded by your department coordinator yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : selectedElectiveNumber === null ? (
        /* ===================================================================== */
        /* STAGE 1: ELECTIVE CARDS OVERVIEW (PE-1, PE-2, ... OR OE-1, OE-2)      */
        /* ===================================================================== */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 font-display">
                  Semester {selectedSemester} Elective Offerings
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson-50 text-crimson-700 border border-crimson-200">
                  {electiveNumbers.length} {currentType === 'PE' ? 'Professional' : 'Open'} Elective{electiveNumbers.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click on any elective card below to rank subject priorities and save choices individually.
              </p>
            </div>
          </div>

          {electiveNumbers.length === 0 || eligibleSubjects.length === 0 ? (
            <div className="p-10 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
              <h4 className="text-sm font-bold text-gray-800">No Electives Configured</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                There are no {currentType === 'PE' ? 'Professional Elective' : 'Open Elective'} subjects configured for Semester {selectedSemester} yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {electiveNumbers.map((eNum) => {
                const isLockedThis = isElectiveLocked(eNum);
                const eSubs = eligibleSubjects.filter(s => Number(s.elective_number || 1) === eNum);
                const ePrefs = prioritiesByElective[eNum] || [];
                const eAllot = allotmentRecords.find(a => Number(a.elective_number || a.subjects?.elective_number || 1) === eNum);
                const isAllotted = eAllot && eAllot.status === 'ALLOTTED';
                const isWaitlisted = eAllot && eAllot.status === 'WAITLISTED';

                return (
                  <div
                    key={eNum}
                    onClick={() => setSelectedElectiveNumber(eNum)}
                    className={`bg-white rounded-2xl border-2 transition-all duration-200 p-6 flex flex-col justify-between space-y-5 cursor-pointer group relative overflow-hidden ${
                      isLockedThis
                        ? 'border-emerald-200 bg-emerald-50/10 hover:border-emerald-400 hover:shadow-card-hover'
                        : 'border-gray-200 hover:border-crimson-400 hover:shadow-card-hover'
                    }`}
                  >
                    {/* Top row */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-xl bg-crimson-50 text-crimson-700 font-mono font-black text-xs border border-crimson-200 flex items-center gap-1.5">
                          {currentType === 'PE' ? <BookOpen className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          {currentType}-{eNum}
                        </span>

                        {isLockedThis ? (
                          isAllotted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Seat Allotted</span>
                            </span>
                          ) : isWaitlisted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Waitlisted
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                              Locked
                            </span>
                          )
                        ) : ePrefs.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>{ePrefs.length} Choices Arranged</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson-50 text-crimson-700 border border-crimson-200">
                            Ready to Select
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-gray-900 font-display group-hover:text-crimson-700 transition-colors">
                          {currentType === 'PE' ? `Professional Elective ${eNum}` : `Open Elective ${eNum}`}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {currentType === 'PE' 
                            ? `Department specialized elective for ${currentUser?.branch || 'CSE'} students.`
                            : `Interdisciplinary elective offered across college departments.`}
                        </p>
                      </div>

                      {/* Subject choices summary */}
                      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                          <span>Offered Subject Choices</span>
                          <span className="text-crimson-700 font-mono font-bold">{eSubs.length} Subjects</span>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {eSubs.map((s) => {
                            const isThisAllotted = eAllot?.subject_id === s.id;
                            const prefRank = ePrefs.findIndex(p => p.subject_id === s.id);

                            return (
                              <div
                                key={s.id}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                                  isThisAllotted
                                    ? 'bg-emerald-50 border border-emerald-300 font-bold text-emerald-900'
                                    : 'bg-white border border-gray-100 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-mono text-[10px] font-bold text-crimson-700 bg-crimson-50 px-1.5 py-0.5 rounded">
                                    {s.subject_code}
                                  </span>
                                  <span className="truncate">{s.subject_name}</span>
                                </div>
                                
                                {isThisAllotted ? (
                                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Allotted
                                  </span>
                                ) : prefRank >= 0 ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    Choice #{prefRank + 1}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400">
                                    {s.seats} seats
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom action button */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                        Semester {selectedSemester}
                      </span>
                      
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-crimson-700 group-hover:translate-x-1 transition-transform">
                        <span>{isLockedThis ? 'View Choices & Allotment' : 'Show Subjects & Prioritize'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* STAGE 2: SUBJECTS LIST & PRIORITY ORDERING FOR SELECTED ELECTIVE      */
        /* ===================================================================== */
        <div className="space-y-6">
          {/* Back Navigation Bar & Quick Elective Switcher */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedElectiveNumber(null)}
                className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-crimson-700" />
                <span>Back to Electives List</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-crimson-100 text-crimson-800 font-bold font-mono text-[10px]">
                    {currentType}-{activeElectiveNumber}
                  </span>
                  <h3 className="text-base font-black text-gray-900 font-display">
                    {getElectiveTitle(activeElectiveNumber)}
                  </h3>
                </div>
                <span className="text-xs text-gray-500">
                  Semester {selectedSemester} • {currentElectiveSubjects.length} subjects offered
                </span>
              </div>
            </div>

            {/* Quick Elective Switcher Tabs */}
            {electiveNumbers.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
                {electiveNumbers.map(n => {
                  const locked = isElectiveLocked(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedElectiveNumber(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        activeElectiveNumber === n
                          ? 'bg-white text-crimson-700 shadow-2xs font-extrabold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span>{currentType}-{n}</span>
                      {locked && <Lock className="w-3 h-3 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* If Locked, render locked list for this elective; otherwise render PrioritySelector */}
          {isElectiveLocked(activeElectiveNumber) ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-display">
                    Official Submitted Priorities & Allotment ({currentType}-{activeElectiveNumber})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Your elective preferences for {getElectiveTitle(activeElectiveNumber)} have been processed by the FIFO engine.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Allotment Processed</span>
                </span>
              </div>

              {(() => {
                const ePrefs = prioritiesByElective[activeElectiveNumber] || [];
                const eAllot = allotmentRecords.find(a => Number(a.elective_number || a.subjects?.elective_number || 1) === activeElectiveNumber);

                return (
                  <div className="space-y-3">
                    {ePrefs.map((item, idx) => {
                      const subj = currentElectiveSubjects.find(s => s.id === item.subject_id) || eligibleSubjects.find(s => s.id === item.subject_id);
                      if (!subj) return null;
                      const isAllottedThis = eAllot?.subject_id === subj.id;

                      return (
                        <div
                          key={subj.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isAllottedThis 
                              ? 'border-emerald-400 bg-emerald-50 shadow-xs ring-1 ring-emerald-400' 
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                  {subj.subject_code}
                                </span>
                                <span className="text-xs font-bold text-gray-600">Priority {idx + 1}</span>
                              </div>
                              <h5 className="text-sm font-bold text-gray-900 mt-0.5">{subj.subject_name}</h5>
                            </div>
                          </div>

                          {isAllottedThis && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                              <Award className="w-3.5 h-3.5" />
                              <span>Allotted</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedElectiveNumber(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back to All Elective Cards</span>
                </button>

                <Link
                  to={`/student/allotment?type=${currentType}&semester=${selectedSemester}`}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>View Official Memo</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-crimson-50/60 to-purple-50/40 p-4 rounded-xl border border-crimson-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-crimson-700 text-white font-bold font-mono text-[10px]">
                      {currentType}-{activeElectiveNumber}
                    </span>
                    <h3 className="text-base font-black text-gray-900 font-display">
                      {getElectiveTitle(activeElectiveNumber)}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600">
                    Drag items or use the up/down arrows to position your top preferred subject first. You can save and lock this elective individually.
                  </p>
                </div>
              </div>

              {/* Priority Selector for the Active Elective */}
              <PrioritySelector
                subjects={currentElectiveSubjects}
                priorities={prioritiesByElective[activeElectiveNumber] || []}
                onChange={(updated) => handleElectivePriorityChange(activeElectiveNumber, updated)}
              />

              {/* Navigation Controls & Single Elective Submit Action Bar */}
              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedElectiveNumber(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Electives List</span>
                  </button>

                  {(() => {
                    const currentIndex = electiveNumbers.indexOf(activeElectiveNumber);
                    const nextNum = electiveNumbers[currentIndex + 1];
                    if (!nextNum) return null;

                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedElectiveNumber(nextNum)}
                        className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <span>Next: {currentType}-{nextNum}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    );
                  })()}
                </div>

                {/* Individual Save & Lock Button */}
                <button
                  type="button"
                  onClick={() => setSingleConfirmElective(activeElectiveNumber)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white crimson-gradient-btn flex items-center justify-center gap-2 shadow-md shadow-crimson-700/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Save & Lock {currentType}-{activeElectiveNumber} Priorities</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Elective Confirmation Modal */}
      {singleConfirmElective !== null && (
        <Modal
          isOpen={singleConfirmElective !== null}
          onClose={() => setSingleConfirmElective(null)}
          title={`Lock Your ${getElectiveTitle(singleConfirmElective)} Preferences`}
          subtitle={`Review your priority order for ${getElectiveTitle(singleConfirmElective)}. Other electives remain unaffected.`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {(() => {
              const eSubs = eligibleSubjects.filter(s => Number(s.elective_number || 1) === singleConfirmElective);
              const ePrefs = prioritiesByElective[singleConfirmElective] || [];

              return (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-crimson-100 text-crimson-800 font-bold font-mono text-[10px]">
                      {currentType}-{singleConfirmElective}
                    </span>
                    <span className="text-xs font-bold text-gray-900 font-display">
                      {getElectiveTitle(singleConfirmElective)}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {ePrefs.map((item, idx) => {
                      const subj = eSubs.find(s => s.id === item.subject_id);
                      if (!subj) return null;
                      return (
                        <div key={item.subject_id} className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded bg-crimson-100 text-crimson-800 flex items-center justify-center font-bold text-[10px]">
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-900 block">{subj.subject_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{subj.subject_code}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                            Choice {idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Locking Policy:</span>
                <p className="mt-0.5 leading-relaxed text-amber-800 text-[11px]">
                  Once locked, your priority ranking for <strong>{getElectiveTitle(singleConfirmElective)}</strong> will be permanently saved and submitted to the instant FIFO allotment engine. Other electives will not be locked until you submit them.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSingleConfirmElective(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitSingleElective(singleConfirmElective)}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Lock {currentType}-{singleConfirmElective}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
