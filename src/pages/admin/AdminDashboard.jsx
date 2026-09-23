import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserPlus, 
  User,
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ShieldCheck, 
  Edit, 
  Edit3,
  Sliders,
  Trash2, 
  KeyRound, 
  Sparkles, 
  Layers, 
  BarChart3, 
  GraduationCap, 
  RefreshCw, 
  Mail, 
  ChevronLeft,
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Send, 
  Eye, 
  EyeOff, 
  Calendar, 
  Play, 
  Pause, 
  Lock, 
  Plus, 
  RotateCcw, 
  RotateCw,
  Wand2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  Info 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { coordinatorService } from '../../services/coordinatorService';
import { notificationService } from '../../services/notificationService';
import { normalizeBatch } from '../../lib/storage';
import Modal from '../../components/common/Modal';
import SubjectModal from '../../components/coordinator/SubjectModal';
import ManualOverrideModal from '../../components/coordinator/ManualOverrideModal';
import PrintAllotmentView from '../../components/coordinator/PrintAllotmentView';

export default function AdminDashboard() {
  const { currentUser, showToast, verifyCurrentPassword } = useAuth();

  const [activeTab, setActiveTab] = useState('COORDINATORS'); // 'COORDINATORS' | 'ALLOTMENTS' | 'BATCH_SCHEDULE' | 'ANALYTICS'

  // Coordinators State
  const [coordinators, setCoordinators] = useState([]);
  const [coordSearch, setCoordSearch] = useState('');
  const [coordModalOpen, setCoordModalOpen] = useState(false);
  const [editingCoord, setEditingCoord] = useState(null);
  const [coordFormData, setCoordFormData] = useState({
    name: '',
    email: '',
    branch: 'CSE',
    roll_number: ''
  });
  const [coordModalLoading, setCoordModalLoading] = useState(false);
  const [coordModalError, setCoordModalError] = useState('');

  // Selection Drives / Batch Windows State (Admin controls Institution OE Selection Windows)
  const [selectionWindows, setSelectionWindows] = useState([]);
  const [curriculumBatches, setCurriculumBatches] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [students, setStudents] = useState([]);
  const [oeSubjects, setOeSubjects] = useState([]);
  const [peSubjects, setPeSubjects] = useState([]);
  const [expandedOEDriveKeys, setExpandedOEDriveKeys] = useState({});
  const [activeOEDriveSubTab, setActiveOEDriveSubTab] = useState({});
  const [oeDriveStudentPages, setOeDriveStudentPages] = useState({});
  const OE_STUDENT_PAGE_SIZE = 50;

  // Manual Override & Allotment Modification State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedAllotmentForOverride, setSelectedAllotmentForOverride] = useState(null);

  const getOEStudentPage = (driveId, subTab) => oeDriveStudentPages[`${driveId}_${subTab}`] || 1;
  const setOEStudentPage = (driveId, subTab, page) => {
    setOeDriveStudentPages(prev => ({
      ...prev,
      [`${driveId}_${subTab}`]: page
    }));
  };

  const [oeDriveFilters, setOeDriveFilters] = useState({
    batch: 'ALL',
    semester: 'ALL',
    status: 'ALL',
    search: ''
  });

  const toggleOEDriveKey = (id) => {
    setExpandedOEDriveKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveActionLoading, setDriveActionLoading] = useState(false);
  const [driveFormData, setDriveFormData] = useState({
    batch: '',
    semester: 5,
    elective_number: 1,
    elective_type: 'OE',
    status: 'LOCKED',
    due_date: ''
  });

  // OE Subject Modal State (For adding/editing OE course offerings in Setup Phase)
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectModalDefaults, setSubjectModalDefaults] = useState({
    batch: '',
    semester: 5,
    elective_number: 1,
    elective_type: 'OE',
    branch: 'CSE'
  });

  // Reveal Allotments Modal State
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [selectedDriveForReveal, setSelectedDriveForReveal] = useState(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState('');

  // Due Date Modal State
  const [dueDateModalOpen, setDueDateModalOpen] = useState(false);
  const [selectedDriveForDueDate, setSelectedDriveForDueDate] = useState(null);
  const [newDriveDueDate, setNewDriveDueDate] = useState('');
  const [dueDateLoading, setDueDateLoading] = useState(false);
  const [dueDateError, setDueDateError] = useState('');

  // Auto Allocate Modal State
  const [autoAllocateModalOpen, setAutoAllocateModalOpen] = useState(false);
  const [selectedDriveForAutoAllocate, setSelectedDriveForAutoAllocate] = useState(null);
  const [branchPriorityOrder, setBranchPriorityOrder] = useState([]);
  const [autoAllocatePassword, setAutoAllocatePassword] = useState('');
  const [autoAllocateLoading, setAutoAllocateLoading] = useState(false);
  const [autoAllocateError, setAutoAllocateError] = useState('');
  const [autoAllocateProgress, setAutoAllocateProgress] = useState(0);
  const [autoAllocatePhase, setAutoAllocatePhase] = useState('');

  // Allotments State with 100-Row Pagination
  const [allotments, setAllotments] = useState([]);
  const [allotmentPage, setAllotmentPage] = useState(1);
  const ALLOTMENT_PAGE_SIZE = 100;
  const [allotmentFilters, setAllotmentFilters] = useState({
    batch: 'ALL',
    elective_type: 'ALL',
    branch: 'ALL',
    section: 'ALL',
    status: 'ALL',
    search: ''
  });

  // Analytics & Summary State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Print Config State
  const [printConfig, setPrintConfig] = useState({
    reportType: 'COMPLETE',
    title: 'Institution-Wide Master Allotment Report',
    subtitle: 'Consolidated Academic Elective Allotments',
    records: []
  });

  // Batches pool in Descending order (strictly from real data without dummy batches)
  const availableBatches = Array.from(new Set([
    ...curriculumBatches.map(b => normalizeBatch(b)),
    ...selectionWindows.map(w => normalizeBatch(w.batch)),
    ...students.map(s => normalizeBatch(s.admitted_batch || s.batch)),
    ...allotments.map(a => normalizeBatch(a.admitted_batch || a.batch))
  ].filter(Boolean))).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));

  const studentBatches = useMemo(() => {
    return Array.from(new Set(
      students
        .map(s => normalizeBatch(s.admitted_batch || s.batch || ''))
        .filter(Boolean)
    )).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  const adminDriveBatches = availableBatches;

  // Filtered Selection Drives
  const filteredOEDrives = useMemo(() => {
    return selectionWindows.filter(win => {
      if (oeDriveFilters.batch !== 'ALL' && normalizeBatch(win.batch) !== normalizeBatch(oeDriveFilters.batch)) {
        return false;
      }
      if (oeDriveFilters.semester !== 'ALL' && Number(win.semester) !== Number(oeDriveFilters.semester)) {
        return false;
      }
      if (oeDriveFilters.status !== 'ALL') {
        const isPastDue = Boolean(win.due_date && new Date() > new Date(win.due_date));
        if (oeDriveFilters.status === 'ACTIVE' && (win.status !== 'ACTIVE' || isPastDue)) return false;
        if (oeDriveFilters.status === 'LOCKED' && win.status === 'ACTIVE') return false;
        if (oeDriveFilters.status === 'EXPIRED' && !isPastDue) return false;
      }
      if (oeDriveFilters.search && oeDriveFilters.search.trim()) {
        const q = oeDriveFilters.search.toLowerCase().trim();
        const titleMatch = win.title?.toLowerCase().includes(q);
        const batchMatch = win.batch?.toLowerCase().includes(q);
        const numMatch = `oe-${win.elective_number}`.includes(q) || `oe ${win.elective_number}`.includes(q);
        if (!titleMatch && !batchMatch && !numMatch) return false;
      }
      return true;
    });
  }, [selectionWindows, oeDriveFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coordList, allotList, stats, windows, currBatches, currList, studentList, oeSubList, peSubList] = await Promise.all([
        adminService.getCoordinators(),
        adminService.getInstitutionAllotments(allotmentFilters),
        adminService.getInstitutionAnalytics(),
        adminService.getSelectionWindows(),
        coordinatorService.getCurriculumBatches(),
        coordinatorService.getCurriculum(),
        coordinatorService.getStudents(),
        coordinatorService.getSubjects('OE'),
        coordinatorService.getSubjects('PE')
      ]);
      setCoordinators(coordList || []);
      setAllotments(allotList || []);
      setAnalytics(stats);
      setSelectionWindows(windows || []);
      setCurriculumBatches(currBatches || []);
      setCurriculumList(currList || []);
      setStudents(studentList || []);
      setOeSubjects(oeSubList || []);
      setPeSubjects(peSubList || []);
      if (currBatches.length > 0 && !driveFormData.batch) {
        setDriveFormData(prev => ({ ...prev, batch: currBatches[0] }));
      }
    } catch (e) {
      console.warn('Admin load data error:', e);
      showToast('Failed to load institution data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOverrideModal = (record, drive = null) => {
    if (record.elective_type === 'PE' || record.is_pe) {
      showToast('Professional Elective (PE) allotments are managed by Department Coordinators. Admin can only modify Open Electives (OE).', 'error');
      return;
    }

    const student = students.find(s => 
      s.id === record.student_id || 
      (s.email && record.student_email && s.email.toLowerCase() === record.student_email.toLowerCase()) ||
      (s.roll_number && (record.roll_number || record.student_roll || record.rollNumber) && s.roll_number.toUpperCase() === String(record.roll_number || record.student_roll || record.rollNumber).toUpperCase())
    );

    const allSubs = oeSubjects || [];
    const matchedSubject = (record.subject_id ? allSubs.find(s => s.id === record.subject_id) : null) ||
      (record.subject_code ? allSubs.find(s => s.subject_code === record.subject_code) : null) ||
      (record.subjectCode ? allSubs.find(s => s.subject_code === record.subjectCode) : null);

    const targetElectiveType = record.elective_type || (drive ? 'OE' : 'OE');
    const targetElectiveNum = Number(record.elective_number || drive?.elective_number || 1);
    const targetSemester = Number(record.semester || drive?.semester || student?.semester || 5);

    const formatted = {
      id: record.id,
      student_id: record.student_id || student?.id,
      studentId: record.student_id || student?.id,
      studentName: record.studentName || record.student_name || student?.name || 'Student',
      rollNumber: record.rollNumber || record.roll_number || record.student_roll || student?.roll_number || 'N/A',
      branch: record.branch || record.studentBranch || record.student_branch || student?.branch || 'N/A',
      section: record.section || student?.section || 'A',
      semester: targetSemester,
      elective_type: targetElectiveType,
      elective_number: targetElectiveNum,
      subject_id: record.subject_id || matchedSubject?.id || null,
      subjectName: record.subjectName || record.subject_name || matchedSubject?.subject_name || (record.status === 'WAITLISTED' ? 'WAITLISTED (No Subject)' : 'Not Allotted'),
      status: record.status || 'WAITLISTED',
      priority_selected: record.priority_selected || record.preference_rank || null
    };

    setSelectedAllotmentForOverride(formatted);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async ({ allotmentId, studentId, electiveType, electiveNumber, semester, newSubjectId, reason }) => {
    try {
      await adminService.manualUpdateAllotment({
        allotmentId,
        studentId,
        electiveType: electiveType || 'OE',
        electiveNumber: Number(electiveNumber || 1),
        semester: Number(semester || 5),
        newSubjectId,
        reason,
        adminId: currentUser?.id
      });
      showToast('Student Open Elective allotment override recorded with permanent audit log.', 'success');
      loadData();
    } catch (err) {
      console.error('Error saving override:', err);
      showToast(err.message || 'Failed to update student allotment.', 'error');
      throw err;
    }
  };

  const handleResetStudentOEAllotment = async (record, drive = null) => {
    if (record.elective_type === 'PE' || record.is_pe) {
      showToast('Professional Elective (PE) allotments are managed by Department Coordinators. Admin can only reset Open Electives (OE).', 'error');
      return;
    }

    const student = students.find(s => 
      s.id === record.student_id || 
      (s.email && record.student_email && s.email.toLowerCase() === record.student_email.toLowerCase()) ||
      (s.roll_number && (record.roll_number || record.student_roll || record.rollNumber) && s.roll_number.toUpperCase() === String(record.roll_number || record.student_roll || record.rollNumber).toUpperCase())
    );
    const targetStudentId = record.student_id || student?.id;
    const studentName = record.studentName || record.student_name || student?.name || record.rollNumber || 'this student';
    const electiveType = record.elective_type || (drive ? 'OE' : 'OE');
    const electiveNum = Number(record.elective_number || drive?.elective_number || 1);

    if (!targetStudentId) {
      showToast('Could not identify student record to reset.', 'error');
      return;
    }

    if (window.confirm(`Reset and unlock ${electiveType}-${electiveNum} Open Elective selection for ${studentName}? Any current allotment or waitlist entry will be cleared and the student can submit fresh choices.`)) {
      try {
        await adminService.resetStudentAllotment(targetStudentId, electiveType, electiveNum, currentUser?.id);
        showToast(`Open Elective selection & allotment reset for ${studentName}. Student can now re-select.`, 'success');
        loadData();
      } catch (err) {
        console.error('Error resetting allotment:', err);
        showToast(err.message || 'Failed to reset student selection.', 'error');
      }
    }
  };

  const handleStartWindow = async (windowId, windowObj = null) => {
    try {
      setDriveActionLoading(true);
      const win = windowObj || selectionWindows.find(w => w.id === windowId);
      const updated = await adminService.startSelectionWindow(windowId, win);
      setSelectionWindows(updated);
      showToast('Batch Selection Drive has been STARTED and is now OPEN for students.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to start selection window.', 'error');
    } finally {
      setDriveActionLoading(false);
    }
  };

  const handleStopWindow = async (windowId) => {
    try {
      setDriveActionLoading(true);
      const updated = await adminService.stopSelectionWindow(windowId);
      setSelectionWindows(updated);
      showToast('Batch Selection Drive has been STOPPED / PAUSED for students.');
    } catch (err) {
      showToast(err.message || 'Failed to pause selection window.', 'error');
    } finally {
      setDriveActionLoading(false);
    }
  };

  const handleDeleteWindow = async (windowId, title) => {
    if (!window.confirm(`Are you sure you want to delete this batch window (${title})?`)) return;
    try {
      setDriveActionLoading(true);
      const updated = await adminService.deleteSelectionWindow(windowId);
      setSelectionWindows(updated);
      showToast('Batch Selection Drive deleted successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to delete selection window.', 'error');
    } finally {
      setDriveActionLoading(false);
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    if (!driveFormData.batch) {
      showToast('Please select a curriculum batch for the drive.', 'error');
      return;
    }
    try {
      setDriveActionLoading(true);
      const electiveNo = Number(driveFormData.elective_number || 1);
      const updated = await adminService.createSelectionWindow({
        ...driveFormData,
        elective_number: electiveNo,
        title: driveFormData.title || `Batch ${driveFormData.batch} • Sem ${driveFormData.semester} • OE-${electiveNo}`,
        elective_type: 'OE',
        status: driveFormData.status || 'LOCKED'
      });
      setSelectionWindows(updated);
      setDriveModalOpen(false);
      showToast(`Open Elective (OE-${electiveNo}) Selection Drive for Batch ${driveFormData.batch} configured in Setup Phase (Paused/Locked).`);
    } catch (err) {
      showToast(err.message || 'Failed to configure selection drive.', 'error');
    } finally {
      setDriveActionLoading(false);
    }
  };

  // OE Subject Offerings Handlers (Setup Phase)
  const handleOpenAddOESubject = (drive) => {
    setEditingSubject(null);
    setSubjectModalDefaults({
      batch: drive.batch,
      semester: Number(drive.semester || 5),
      elective_number: Number(drive.elective_number || 1),
      elective_type: 'OE',
      branch: coordinators[0]?.branch || 'CSE'
    });
    setSubjectModalOpen(true);
  };

  const handleOpenEditOESubject = (subject) => {
    setEditingSubject(subject);
    setSubjectModalDefaults({
      batch: subject.admitted_batch || subject.batch || '',
      semester: Number(subject.semester || 5),
      elective_number: Number(subject.elective_number || 1),
      elective_type: 'OE',
      branch: subject.branch || 'CSE'
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (subjectData) => {
    try {
      if (editingSubject) {
        await coordinatorService.updateSubject(editingSubject.id, subjectData);
        showToast(`Subject "${subjectData.subject_name}" updated successfully.`);
      } else {
        await coordinatorService.addSubject({ ...subjectData, elective_type: 'OE' });
        showToast(`Open Elective subject "${subjectData.subject_name}" added successfully.`);
      }
      setSubjectModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save subject.', 'error');
    }
  };

  const handleDeleteOESubject = async (subjectId, subjectName) => {
    if (window.confirm(`Are you sure you want to delete Open Elective subject "${subjectName}"?`)) {
      try {
        await coordinatorService.deleteSubject(subjectId);
        showToast(`Subject "${subjectName}" deleted successfully.`);
        loadData();
      } catch (err) {
        showToast(err.message || 'Failed to delete subject.', 'error');
      }
    }
  };

  // 1. Reveal / Hide Allotments Handler
  const handleOpenRevealModal = (drive) => {
    setSelectedDriveForReveal(drive);
    setRevealPassword('');
    setRevealError('');
    setRevealModalOpen(true);
  };

  const handleConfirmReveal = async (e) => {
    e.preventDefault();
    if (!selectedDriveForReveal) return;
    setRevealError('');

    try {
      setRevealLoading(true);
      await verifyCurrentPassword(revealPassword);

      const willReveal = !selectedDriveForReveal.allotment_revealed;
      await adminService.toggleRevealOEAllotment(selectedDriveForReveal.id, willReveal);

      showToast(
        willReveal 
          ? `Open Elective (OE) allotments for ${selectedDriveForReveal.title || selectedDriveForReveal.batch} are now REVEALED to students.` 
          : `Open Elective (OE) allotments for ${selectedDriveForReveal.title || selectedDriveForReveal.batch} are now HIDDEN from students.`,
        'success'
      );

      setRevealModalOpen(false);
      loadData();
    } catch (err) {
      setRevealError(err.message || 'Failed to update allotment visibility.');
    } finally {
      setRevealLoading(false);
    }
  };

  // 2. Set / Edit Due Date Handler
  const handleOpenDueDateModal = (drive) => {
    setSelectedDriveForDueDate(drive);
    setNewDriveDueDate(drive.due_date ? new Date(drive.due_date).toISOString().slice(0, 16) : '');
    setDueDateError('');
    setDueDateModalOpen(true);
  };

  const handleSaveDueDate = async (e) => {
    e.preventDefault();
    if (!selectedDriveForDueDate) return;
    setDueDateError('');

    try {
      setDueDateLoading(true);
      const isoDueDate = newDriveDueDate ? new Date(newDriveDueDate).toISOString() : null;
      await adminService.updateOEDriveDueDate(selectedDriveForDueDate.id, isoDueDate);

      showToast(
        isoDueDate 
          ? `OE Selection deadline set to ${new Date(isoDueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.` 
          : 'OE Selection deadline cleared (No expiration).',
        'success'
      );

      setDueDateModalOpen(false);
      loadData();
    } catch (err) {
      setDueDateError(err.message || 'Failed to update selection due date.');
    } finally {
      setDueDateLoading(false);
    }
  };

  // 3. Auto Allocate Handler with Branch Priority Order (Only Registered Coordinator Branches)
  const handleOpenAutoAllocateModal = (drive) => {
    setSelectedDriveForAutoAllocate(drive);
    const registered = Array.from(
      new Set(
        coordinators
          .map(c => c.branch ? String(c.branch).trim().toUpperCase() : null)
          .filter(Boolean)
      )
    ).sort();
    setBranchPriorityOrder(registered);
    setAutoAllocatePassword('');
    setAutoAllocateError('');
    setAutoAllocateModalOpen(true);
  };

  const moveBranchUp = (index) => {
    if (index === 0) return;
    setBranchPriorityOrder(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveBranchDown = (index) => {
    if (index === branchPriorityOrder.length - 1) return;
    setBranchPriorityOrder(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleConfirmAutoAllocate = async (e) => {
    e.preventDefault();
    if (!selectedDriveForAutoAllocate) return;
    setAutoAllocateError('');

    try {
      setAutoAllocateLoading(true);
      setAutoAllocateProgress(0);
      setAutoAllocatePhase('Verifying administrator credentials (0%)...');

      await verifyCurrentPassword(autoAllocatePassword);

      let currentProgress = 0;
      let isTaskFinished = false;
      let taskResult = null;
      let taskError = null;

      // Execute backend allocation in background
      const allocationPromise = (async () => {
        try {
          taskResult = await adminService.autoAllocateOEStudents(selectedDriveForAutoAllocate, branchPriorityOrder);
        } catch (err) {
          taskError = err;
        } finally {
          isTaskFinished = true;
        }
      })();

      // Smooth step-by-step progress ticker without missing any number (0 -> 98)
      while (!isTaskFinished && currentProgress < 98) {
        currentProgress += 1;
        setAutoAllocateProgress(currentProgress);

        if (currentProgress <= 25) {
          setAutoAllocatePhase(`Analyzing enrolled institutional students & waitlist queues (${currentProgress}%)...`);
        } else if (currentProgress <= 55) {
          setAutoAllocatePhase(`Reallocating waitlisted students across preferred OE electives (${currentProgress}%)...`);
        } else if (currentProgress <= 75) {
          setAutoAllocatePhase(`Applying branch priority sequence & section quotas (${currentProgress}%)...`);
        } else {
          setAutoAllocatePhase(`Finalizing institutional allotments & synchronizing live seats (${currentProgress}%)...`);
        }

        const delay = currentProgress <= 20 ? 40
          : currentProgress <= 45 ? 55
          : currentProgress <= 70 ? 75
          : currentProgress <= 85 ? 110
          : currentProgress <= 94 ? 160
          : 240;

        await new Promise(r => setTimeout(r, delay));
      }

      // Wait for backend completion
      await allocationPromise;

      if (taskError) {
        throw taskError;
      }

      // Smoothly tick every single remaining number up to 100 without skipping any integer
      while (currentProgress < 100) {
        currentProgress += 1;
        setAutoAllocateProgress(currentProgress);
        setAutoAllocatePhase(`Finalizing institutional allotments & synchronizing seats (${currentProgress}%)...`);
        await new Promise(r => setTimeout(r, 15));
      }

      setAutoAllocatePhase('Institutional OE allocation completed successfully (100%)!');
      await new Promise(r => setTimeout(r, 400));

      if (taskResult?.count > 0) {
        showToast(`Successfully auto-allocated / reallocated ${taskResult.count} student(s) with branch priority order!`, 'success');
      } else {
        showToast(taskResult?.message || 'All eligible students are already allotted.', 'info');
      }

      setAutoAllocateModalOpen(false);
      setAutoAllocatePassword('');
      setAutoAllocateProgress(0);
      setAutoAllocatePhase('');
      loadData();
    } catch (err) {
      setAutoAllocateError(err.message || 'Failed to execute auto allocation / reallocation.');
    } finally {
      setAutoAllocateLoading(false);
    }
  };

  const handleUndoAutoAllocate = async (drive) => {
    const eNum = Number(drive?.elective_number || 1);
    const confirmed = window.confirm(`Are you sure you want to undo auto-allocated assignments for OE-${eNum}?\n\nAuto-assigned student allotments will be cleared so you can increase subject seats and reallocate. Submitted student priority choices are 100% safe and preserved.`);
    if (!confirmed) return;

    try {
      showToast(`Reverting automated allocations for OE-${eNum}...`, 'info');
      const res = await adminService.undoAutoAllocateOE(drive);
      showToast(res.message || `Reverted ${res.revertedCount || 0} auto-allocated assignments.`, 'success');
      loadData();
    } catch (err) {
      console.error('Undo auto-allocate error:', err);
      showToast(err.message || 'Failed to undo auto-allocation.', 'error');
    }
  };

  const handleSendDeadlineReminderOE = async (win) => {
    try {
      const allProfiles = await coordinatorService.getStudents();
      const cleanBatch = normalizeBatch(win.batch || '');
      const cleanSem = Number(win.semester || 5);
      const eNum = Number(win.elective_number || 1);

      const driveObj = {
        ...win,
        batch: cleanBatch,
        semester: cleanSem,
        elective_number: eNum
      };

      const batchStudents = (allProfiles || []).filter(s => {
        if (s.role && s.role !== 'student') return false;
        const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
        const matchBatch = !cleanBatch || sBatch === cleanBatch;
        return matchBatch;
      });

      const result = await notificationService.sendDeadlineReminderEmail({
        driveType: 'OE',
        drive: driveObj,
        students: batchStudents,
        pendingOnly: true
      });

      if (result.count > 0) {
        window.open(result.mailtoUrl, '_blank');
        showToast(`24-Hour Reminder email prepared for ${result.count} pending student(s) in Batch ${cleanBatch} (OE-${eNum})!`, 'success');
      } else {
        showToast(result.message || `All eligible students in Batch ${cleanBatch} have already submitted choices for OE-${eNum}!`, 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch deadline reminders.', 'error');
    }
  };

  const handleRedoAutoAllocate = async (driveId) => {
    try {
      const result = await adminService.redoAutoAllocateOE(driveId);
      showToast(`Redone auto-allocation: ${result.reappliedCount} student allotment(s) restored.`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to redo auto allocation.', 'error');
    }
  };

  useEffect(() => {
    setAllotmentPage(1);
    loadData();
  }, [allotmentFilters]);

  // Derived 100-Row Pagination for Admin Allotments Table
  const totalAllotmentPages = Math.max(1, Math.ceil((allotments.length || 0) / ALLOTMENT_PAGE_SIZE));
  const currentAllotmentPage = Math.min(Math.max(1, allotmentPage), totalAllotmentPages);
  const paginatedAllotments = (allotments || []).slice(
    (currentAllotmentPage - 1) * ALLOTMENT_PAGE_SIZE,
    currentAllotmentPage * ALLOTMENT_PAGE_SIZE
  );

  // Coordinator Modal Handlers
  const handleOpenAddCoord = () => {
    setEditingCoord(null);
    setCoordFormData({
      name: '',
      email: '',
      branch: 'CSE',
      roll_number: 'COORD-CSE'
    });
    setCoordModalError('');
    setCoordModalOpen(true);
  };

  const handleOpenEditCoord = (coord) => {
    setEditingCoord(coord);
    setCoordFormData({
      name: coord.name || '',
      email: coord.email || '',
      branch: coord.branch || 'CSE',
      roll_number: coord.roll_number || `COORD-${coord.branch || 'CSE'}`
    });
    setCoordModalError('');
    setCoordModalOpen(true);
  };

  const handleSaveCoordinator = async (e) => {
    e.preventDefault();
    setCoordModalError('');

    const cleanName = coordFormData.name.trim();
    const cleanEmail = coordFormData.email.trim().toLowerCase();
    const cleanBranch = coordFormData.branch.trim().toUpperCase();
    const cleanRoll = coordFormData.roll_number.trim().toUpperCase();

    if (!cleanName || !cleanEmail) {
      setCoordModalError('Please enter coordinator Name and Email.');
      return;
    }

    if (!cleanBranch) {
      setCoordModalError('Please enter Assigned Branch in capital letters (e.g. CSE).');
      return;
    }

    if (!cleanRoll) {
      setCoordModalError('Please enter a unique Staff Roll ID (e.g. COORD-CSE).');
      return;
    }

    // Check duplicate roll number locally before making network call
    const dupRoll = coordinators.find(c => 
      c.roll_number?.toUpperCase().trim() === cleanRoll && c.id !== editingCoord?.id
    );
    if (dupRoll) {
      setCoordModalError(`Staff Roll Number "${cleanRoll}" is already assigned to ${dupRoll.name} (${dupRoll.email}). Roll Number must be unique.`);
      return;
    }

    try {
      setCoordModalLoading(true);
      if (editingCoord) {
        await adminService.updateCoordinator(editingCoord.id, {
          ...coordFormData,
          name: cleanName,
          email: cleanEmail,
          branch: cleanBranch,
          roll_number: cleanRoll
        });
        showToast(`Coordinator ${cleanName} updated successfully.`);
      } else {
        await adminService.addCoordinator({
          ...coordFormData,
          name: cleanName,
          email: cleanEmail,
          branch: cleanBranch,
          roll_number: cleanRoll
        });
        showToast(`Department Coordinator registered for ${cleanBranch} (${cleanEmail}).`);
      }
      setCoordModalOpen(false);
      loadData();
    } catch (err) {
      setCoordModalError(err.message || 'Failed to save coordinator.');
    } finally {
      setCoordModalLoading(false);
    }
  };

  const handleDeleteCoordinator = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove Coordinator "${name}"? They will no longer be able to log in.`)) {
      await adminService.deleteCoordinator(id);
      showToast('Coordinator removed.');
      loadData();
    }
  };

  // CSV Export
  const handleExportMasterCSV = () => {
    adminService.exportInstitutionCSV(allotments, `institution_allotments_${allotmentFilters.branch}_${allotmentFilters.elective_type}.csv`);
    showToast('Institution master allotment CSV downloaded.');
  };

  // Derived available sections for filtering
  const availableAdminSections = Array.from(new Set(
    allotments
      .filter(a => {
        if (allotmentFilters.branch !== 'ALL' && a.branch && a.branch !== allotmentFilters.branch) return false;
        if (allotmentFilters.batch !== 'ALL' && (a.admitted_batch || a.batch) && (a.admitted_batch || a.batch) !== allotmentFilters.batch) return false;
        return true;
      })
      .map(a => a.section)
      .filter(Boolean)
  )).sort();

  // Print Report Trigger
  const triggerInstitutionPrint = () => {
    const batchPart = allotmentFilters.batch && allotmentFilters.batch !== 'ALL' ? ` • Batch ${allotmentFilters.batch}` : '';
    setPrintConfig({
      reportType: allotmentFilters.elective_type === 'ALL' ? 'COMPLETE' : allotmentFilters.elective_type,
      title: 'Autonomous Elective Portal — Institutional Master Allotment Register',
      subtitle: `Filtered by: ${allotmentFilters.branch === 'ALL' ? 'All Registered Departments' : `${allotmentFilters.branch} Department`} • ${allotmentFilters.section === 'ALL' ? 'All Sections' : `Section ${allotmentFilters.section}`}${batchPart}`,
      filters: allotmentFilters,
      records: allotments
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtered Coordinators List
  const filteredCoordinators = coordinators.filter(c => {
    const q = coordSearch.toLowerCase().trim();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || 
           c.email?.toLowerCase().includes(q) || 
           c.branch?.toLowerCase().includes(q) ||
           c.roll_number?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-crimson-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-crimson-600/20 via-coral/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-crimson-700/80 text-white border border-crimson-500/30 flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5" />
                <span>Institution Level Administrator</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white">
              Autonomous College Master Control
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Register Branch Coordinators, monitor institution-wide student electives, and oversee automated FIFO allotment across all departments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <Link
              to="/admin/profile"
              className="px-4 py-3 rounded-xl text-xs font-bold text-gray-200 bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-2 transition-all shadow-sm"
            >
              <User className="w-4 h-4 text-crimson-400" />
              <span>Admin Profile</span>
            </Link>
            <button
              onClick={handleOpenAddCoord}
              className="px-5 py-3 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-2 shadow-lg shadow-crimson-700/30 hover:scale-102 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Coordinator</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      {loading && !analytics ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-crimson-600" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Institutional Analytics...</p>
        </div>
      ) : analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
              <Users className="w-4 h-4 text-crimson-700" />
            </div>
            <div className="text-2xl font-black text-gray-900 font-display">{analytics.totalStudents}</div>
            <span className="text-[10px] text-gray-400 font-medium">Across all branches</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Coordinators</span>
              <ShieldCheck className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-2xl font-black text-gray-900 font-display">{analytics.totalCoordinators}</div>
            <span className="text-[10px] text-purple-700 font-semibold">{coordinators.length} Departments Active</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Offerings</span>
              <BookOpen className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-black text-gray-900 font-display">{analytics.totalSubjects}</div>
            <span className="text-[10px] text-blue-700 font-semibold">{analytics.peCount} PE • {analytics.oeCount} OE</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Seats</span>
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-black text-gray-900 font-display">{analytics.totalSeats}</div>
            <span className="text-[10px] text-gray-400 font-medium">{analytics.peSeatsTotal || 0} PE • {analytics.oeSeatsTotal || 0} OE</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Allotted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-display">{analytics.allottedCount}</div>
            <span className="text-[10px] text-emerald-800 font-semibold">{analytics.peAllottedTotal || 0} PE • {analytics.oeAllottedTotal || 0} OE</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending / Wait</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-display">{analytics.pendingCount + analytics.waitlistedCount}</div>
            <span className="text-[10px] text-amber-800 font-bold block">
              {analytics.waitlistedCount} Waitlisted
            </span>
          </div>
        </div>
      )}

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('COORDINATORS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'COORDINATORS'
              ? 'bg-crimson-700 text-white shadow-sm font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Department Coordinators ({coordinators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ALLOTMENTS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'ALLOTMENTS'
              ? 'bg-crimson-700 text-white shadow-sm font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Institution Master Allotments ({allotments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCH_SCHEDULE')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'BATCH_SCHEDULE'
              ? 'bg-crimson-700 text-white shadow-sm font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>OE Batch Allotment Control ({selectionWindows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'ANALYTICS'
              ? 'bg-crimson-700 text-white shadow-sm font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Department Matrix</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: COORDINATORS DIRECTORY & REGISTRATION */}
      {/* ===================================================================== */}
      {activeTab === 'COORDINATORS' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 font-display">Branch Coordinators Directory</h2>
                <p className="text-xs text-gray-500">Authorized department coordinators managing academic electives and student allotments.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-72">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search coordinator by name, email, branch..."
                    value={coordSearch}
                    onChange={(e) => setCoordSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-crimson-600"
                  />
                  {coordSearch && (
                    <button
                      type="button"
                      onClick={() => setCoordSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold text-xs"
                      title="Clear Search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Coordinator Name</th>
                    <th className="px-4 py-3">Official Email</th>
                    <th className="px-4 py-3">Assigned Branch</th>
                    <th className="px-4 py-3">Staff / Roll ID</th>
                    <th className="px-4 py-3 text-center">Assigned Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoordinators.map((c) => (
                    <tr key={c.id || c.email} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-crimson-50 text-crimson-700 flex items-center justify-center font-bold font-mono text-xs">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 font-mono">
                        {c.email}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-crimson-50 text-crimson-800 border border-crimson-200">
                          {c.branch} Department
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-700 font-bold">
                        {c.roll_number || `COORD-${c.branch}`}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          COORDINATOR
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditCoord(c)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Edit Coordinator"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCoordinator(c.id, c.name)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Remove Coordinator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredCoordinators.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        No coordinators registered matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: INSTITUTION MASTER ALLOTMENT DIRECTORY & FILTERS */}
      {/* ===================================================================== */}
      {activeTab === 'ALLOTMENTS' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-crimson-700" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Institution Allotment Filter Matrix</h3>
              </div>

              <div className="flex items-center gap-2">
                {(allotmentFilters.batch !== 'ALL' || allotmentFilters.elective_type !== 'ALL' || allotmentFilters.branch !== 'ALL' || allotmentFilters.section !== 'ALL' || allotmentFilters.status !== 'ALL' || allotmentFilters.search) && (
                  <button
                    onClick={() => setAllotmentFilters({
                      batch: 'ALL',
                      elective_type: 'ALL',
                      branch: 'ALL',
                      section: 'ALL',
                      status: 'ALL',
                      search: ''
                    })}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-crimson-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
                <button
                  onClick={handleExportMasterCSV}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  <span>Export Master CSV</span>
                </button>
                <button
                  onClick={triggerInstitutionPrint}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-600" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Academic Batch Filter */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Academic Batch</label>
                <select
                  value={allotmentFilters.batch}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, batch: e.target.value, section: 'ALL' })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Batches</option>
                  {(studentBatches.length > 0 ? studentBatches : availableBatches).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Elective Type Filter (PE-1..PE-8, OE-1..OE-8) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Elective Type</label>
                <select
                  value={allotmentFilters.elective_type}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, elective_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Elective Types</option>
                  <optgroup label="Professional Electives (PE)">
                    <option value="PE">All Professional Electives (PE)</option>
                    <option value="PE-1">Professional Elective 1 (PE-1)</option>
                    <option value="PE-2">Professional Elective 2 (PE-2)</option>
                    <option value="PE-3">Professional Elective 3 (PE-3)</option>
                    <option value="PE-4">Professional Elective 4 (PE-4)</option>
                    <option value="PE-5">Professional Elective 5 (PE-5)</option>
                    <option value="PE-6">Professional Elective 6 (PE-6)</option>
                    <option value="PE-7">Professional Elective 7 (PE-7)</option>
                    <option value="PE-8">Professional Elective 8 (PE-8)</option>
                  </optgroup>
                  <optgroup label="Open Electives (OE)">
                    <option value="OE">All Open Electives (OE)</option>
                    <option value="OE-1">Open Elective 1 (OE-1)</option>
                    <option value="OE-2">Open Elective 2 (OE-2)</option>
                    <option value="OE-3">Open Elective 3 (OE-3)</option>
                    <option value="OE-4">Open Elective 4 (OE-4)</option>
                    <option value="OE-5">Open Elective 5 (OE-5)</option>
                    <option value="OE-6">Open Elective 6 (OE-6)</option>
                    <option value="OE-7">Open Elective 7 (OE-7)</option>
                    <option value="OE-8">Open Elective 8 (OE-8)</option>
                  </optgroup>
                </select>
              </div>

              {/* Branch Filter (Only registered coordinator branches) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Branch Department</label>
                <select
                  value={allotmentFilters.branch}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, branch: e.target.value, section: 'ALL' })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Registered Departments</option>
                  {Array.from(new Set(coordinators.map(c => c.branch).filter(Boolean))).sort().map(b => (
                    <option key={b} value={b}>{b} Department</option>
                  ))}
                </select>
              </div>

              {/* Section Filter (Only available sections from matching data) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Class Section</label>
                <select
                  value={allotmentFilters.section}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, section: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Sections</option>
                  {availableAdminSections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Status</label>
                <select
                  value={allotmentFilters.status}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ALLOTTED">Confirmed (ALLOTTED)</option>
                  <option value="WAITLISTED">Waitlisted</option>
                </select>
              </div>

              {/* Search Bar */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Search Student / Code</label>
                <input
                  type="text"
                  placeholder="Roll, Email, Subject..."
                  value={allotmentFilters.search}
                  onChange={(e) => setAllotmentFilters({ ...allotmentFilters, search: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Master Table with 100-Row Pagination */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            {/* Top Pagination Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-gray-600 font-medium">
                Showing <strong className="text-gray-900">{allotments.length > 0 ? (currentAllotmentPage - 1) * ALLOTMENT_PAGE_SIZE + 1 : 0}</strong> to <strong className="text-gray-900">{Math.min(currentAllotmentPage * ALLOTMENT_PAGE_SIZE, allotments.length)}</strong> of <strong className="text-gray-900">{allotments.length}</strong> master records (100 per page)
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAllotmentPage(p => Math.max(1, p - 1))}
                  disabled={currentAllotmentPage <= 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                  title="View Previous 100 rows"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous 100</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-crimson-50 text-crimson-800 font-bold text-xs border border-crimson-200">
                  Page {currentAllotmentPage} of {totalAllotmentPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAllotmentPage(p => Math.min(totalAllotmentPages, p + 1))}
                  disabled={currentAllotmentPage >= totalAllotmentPages}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                  title="View Next 100 rows"
                >
                  <span>Next 100</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-center w-12">S.No</th>
                    <th className="px-4 py-3">Student Particulars</th>
                    <th className="px-4 py-3">Branch & Section</th>
                    <th className="px-4 py-3">Elective Category</th>
                    <th className="px-4 py-3">Allotted Subject</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Allotment Timestamp</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedAllotments.map((a, idx) => {
                    const rowNumber = (currentAllotmentPage - 1) * ALLOTMENT_PAGE_SIZE + idx + 1;
                    return (
                      <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-3.5 text-center font-mono font-bold text-gray-500">{rowNumber}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{a.studentName || 'Student'}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{a.rollNumber || 'N/A'} • {a.studentEmail}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-gray-800">{a.branch}</span>
                          <span className="text-gray-500 text-[11px] block">Sec {a.section || 'A'} • Sem {a.semester || 5}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.elective_type === 'PE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {a.elective_type === 'PE' ? `PE-${a.elective_number || 1}` : `OE-${a.elective_number || 1}`}
                          </span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            {a.elective_type === 'PE' ? 'Professional Elective' : 'Open Elective'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{a.subjectName}</div>
                          <div className="text-[11px] font-mono text-crimson-700">{a.subjectCode}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {a.is_auto_allocated ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px] border border-indigo-200 inline-flex items-center gap-1 shadow-sm">
                              <Wand2 className="w-3 h-3 text-indigo-600" />
                              Auto Allocated
                            </span>
                          ) : a.priority_selected ? (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold text-[11px]">
                              Priority {a.priority_selected}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            a.status === 'ALLOTTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-gray-500">
                          {a.allotted_at ? new Date(a.allotted_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {a.elective_type === 'PE' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold text-[10px] inline-flex items-center gap-1" title="PE electives are managed by Department Coordinators">
                              <ShieldCheck className="w-3 h-3 text-gray-400" />
                              <span>PE (Coordinator Managed)</span>
                            </span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => handleOpenOverrideModal(a)}
                                className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Modify / Override student Open Elective allotment"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Modify</span>
                              </button>
                              <button
                                onClick={() => handleResetStudentOEAllotment(a)}
                                className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Reset OE choice and unlock preference form for this student"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Reset</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {allotments.length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-gray-400">
                        No allotment records found matching the active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Bar */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-gray-600 font-medium">
                Showing <strong className="text-gray-900">{allotments.length > 0 ? (currentAllotmentPage - 1) * ALLOTMENT_PAGE_SIZE + 1 : 0}</strong> to <strong className="text-gray-900">{Math.min(currentAllotmentPage * ALLOTMENT_PAGE_SIZE, allotments.length)}</strong> of <strong className="text-gray-900">{allotments.length}</strong> allotments
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAllotmentPage(p => Math.max(1, p - 1))}
                  disabled={currentAllotmentPage <= 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous 100</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-crimson-50 text-crimson-800 font-bold text-xs border border-crimson-200">
                  Page {currentAllotmentPage} of {totalAllotmentPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAllotmentPage(p => Math.min(totalAllotmentPages, p + 1))}
                  disabled={currentAllotmentPage >= totalAllotmentPages}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span>Next 100</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DEPARTMENT MATRIX & ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 font-display">
              Department-Wise Elective Matrix
            </h3>
            <p className="text-xs text-gray-500">
              Overview of student strength, coordinator assignments, PE & OE capacities, and confirmed seat allotments across all college branches.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Assigned Coordinator</th>
                  <th className="px-4 py-3 text-center">Enrolled Students</th>
                  <th className="px-4 py-3 text-center text-blue-800 bg-blue-50/50">PE Capacity</th>
                  <th className="px-4 py-3 text-center text-blue-800 bg-blue-50/50">PE Allotted</th>
                  <th className="px-4 py-3 text-center text-purple-800 bg-purple-50/50">OE Capacity</th>
                  <th className="px-4 py-3 text-center text-purple-800 bg-purple-50/50">OE Allotted</th>
                  <th className="px-4 py-3 text-center font-black">Total Capacity</th>
                  <th className="px-4 py-3 text-center font-black">Total Allotted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.departmentStats.map((d) => (
                  <tr key={d.branch} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-gray-900 text-sm">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-mono">
                        {d.branch}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-700">
                      {d.coordinatorName}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-gray-900">
                      {d.studentsCount}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-blue-700 bg-blue-50/30">
                      {d.peSeats || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-blue-800 bg-blue-50/30">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900">
                        {d.peAllotted || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-purple-700 bg-purple-50/30">
                      {d.oeSeats || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-purple-800 bg-purple-50/30">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900">
                        {d.oeAllotted || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-gray-900">
                      {d.totalSeats}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {d.allottedCount}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!analytics.departmentStats || analytics.departmentStats.length === 0) && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-gray-400">
                      No department data available. Please register coordinators or enroll students to populate the matrix.
                    </td>
                  </tr>
                )}
              </tbody>
              {analytics.departmentStats && analytics.departmentStats.length > 0 && (
                <tfoot className="bg-gray-50/90 font-black text-gray-900 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3">INSTITUTION TOTAL</td>
                    <td className="px-4 py-3 text-gray-500 font-semibold">{analytics.totalCoordinators} Active Coordinators</td>
                    <td className="px-4 py-3 text-center">{analytics.totalStudents}</td>
                    <td className="px-4 py-3 text-center text-blue-700 bg-blue-50/40">{analytics.peSeatsTotal || 0}</td>
                    <td className="px-4 py-3 text-center text-blue-800 bg-blue-50/40">{analytics.peAllottedTotal || 0}</td>
                    <td className="px-4 py-3 text-center text-purple-700 bg-purple-50/40">{analytics.oeSeatsTotal || 0}</td>
                    <td className="px-4 py-3 text-center text-purple-800 bg-purple-50/40">{analytics.oeAllottedTotal || 0}</td>
                    <td className="px-4 py-3 text-center">{analytics.totalSeats}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {analytics.allottedCount}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: OE BATCH ALLOTMENT CONTROL */}
      {/* ===================================================================== */}
      {activeTab === 'BATCH_SCHEDULE' && (
        <div className="space-y-8 no-print">
          
          {/* 1. Header Toolbar */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Institution Open Elective (OE) Drive Control • Central Admin
                </span>
                <span className="text-xs text-gray-500">• {filteredOEDrives.length} {filteredOEDrives.length === 1 ? 'drive' : 'drives'} configured</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 font-display mt-1">
                OE Batch Allotment Control & Automation
              </h2>
              <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
                Manage institution-wide Open Elective drives, set selection schedules, toggle allotment publication visibility, and run branch-priority automated allocations. Click on any drive card below to expand its full operational control panel.
              </p>
            </div>

            <button
              onClick={() => {
                setDriveFormData({
                  batch: adminDriveBatches[0] || availableBatches[0] || '',
                  semester: 5,
                  elective_number: 1,
                  elective_type: 'OE',
                  status: 'LOCKED',
                  due_date: ''
                });
                setDriveModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-2 shadow-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Configure New OE Batch Drive</span>
            </button>
          </div>

          {/* 2. Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-card flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search drive title / batch / OE..."
                  value={oeDriveFilters.search}
                  onChange={(e) => setOeDriveFilters({ ...oeDriveFilters, search: e.target.value })}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-300 text-xs"
                />
              </div>

              <select
                value={oeDriveFilters.batch}
                onChange={(e) => setOeDriveFilters({ ...oeDriveFilters, batch: e.target.value })}
                className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
              >
                <option value="ALL">All Batches</option>
                {availableBatches.map(b => (
                  <option key={b} value={b}>Batch {b}</option>
                ))}
              </select>

              <select
                value={oeDriveFilters.semester}
                onChange={(e) => setOeDriveFilters({ ...oeDriveFilters, semester: e.target.value })}
                className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
              >
                <option value="ALL">All Semesters</option>
                {[5, 6, 7, 8, 1, 2, 3, 4].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>

              <select
                value={oeDriveFilters.status}
                onChange={(e) => setOeDriveFilters({ ...oeDriveFilters, status: e.target.value })}
                className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Selection Open (Active)</option>
                <option value="LOCKED">Paused / Locked</option>
                <option value="EXPIRED">Expired Deadline</option>
              </select>

              {(oeDriveFilters.search || oeDriveFilters.batch !== 'ALL' || oeDriveFilters.semester !== 'ALL' || oeDriveFilters.status !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => setOeDriveFilters({ batch: 'ALL', semester: 'ALL', status: 'ALL', search: '' })}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing <strong>{filteredOEDrives.length}</strong> of <strong>{selectionWindows.length}</strong> drive{selectionWindows.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* 3. Selection Drive Cards List (Accordion style matching PE Drive) */}
          {filteredOEDrives.length > 0 ? (
            <div className="space-y-6">
              {filteredOEDrives.map((win) => {
                const isActive = win.status === 'ACTIVE';
                const isRevealed = Boolean(win.allotment_revealed);
                const isPastDue = Boolean(win.due_date && new Date() > new Date(win.due_date));
                const isExpanded = expandedOEDriveKeys[win.id] !== undefined 
                  ? expandedOEDriveKeys[win.id] 
                  : filteredOEDrives.length === 1;

                const matchingCourses = oeSubjects.filter(s => 
                  normalizeBatch(s.admitted_batch) === normalizeBatch(win.batch) &&
                  Number(s.semester) === Number(win.semester) &&
                  Number(s.elective_number || 1) === Number(win.elective_number || 1)
                );
                const totalSeats = matchingCourses.reduce((sum, s) => sum + (Number(s.seats) || 0), 0);
                const totalVacancies = matchingCourses.reduce((sum, s) => sum + (Number(s.available_seats) || 0), 0);
                const totalAllottedSeats = totalSeats - totalVacancies;

                const cleanBatch = normalizeBatch(win.batch);
                const cleanSem = Number(win.semester || 5);
                const targetElectiveNum = Number(win.elective_number || 1);

                const eligible = students.filter(st => {
                  const matchBatch = !st.admitted_batch || normalizeBatch(st.admitted_batch) === cleanBatch;
                  const matchSem = Number(st.semester) === cleanSem;
                  return matchBatch && matchSem;
                }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));

                const eligibleIds = new Set(eligible.map(st => st.id));
                const eligibleEmails = new Set(eligible.map(st => st.email?.toLowerCase().trim()).filter(Boolean));

                const allots = allotments.filter(a => {
                  const matchElective = (a.elective_type === 'OE' || (!a.elective_type && !a.is_pe)) && Number(a.elective_number || 1) === targetElectiveNum;
                  const matchStudent = eligibleIds.has(a.student_id) || (a.student_email && eligibleEmails.has(a.student_email.toLowerCase().trim()));
                  return matchElective && matchStudent;
                });

                const allotted = allots.filter(a => a.status === 'ALLOTTED')
                  .sort((a, b) => (a.student_roll || a.roll_number || '').localeCompare(b.student_roll || b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));
                const waitlisted = allots.filter(a => a.status === 'WAITLISTED')
                  .sort((a, b) => (a.student_roll || a.roll_number || '').localeCompare(b.student_roll || b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));
                const submittedStudentIds = new Set(allots.map(a => a.student_id || a.student_email));

                const pending = eligible.filter(st => {
                  return !submittedStudentIds.has(st.id) && !(st.email && submittedStudentIds.has(st.email.toLowerCase().trim()));
                }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));

                const currentSubTab = activeOEDriveSubTab[win.id] || 'ALLOTTED';

                const allottedPage = getOEStudentPage(win.id, 'ALLOTTED');
                const totalAllottedPages = Math.max(1, Math.ceil(allotted.length / OE_STUDENT_PAGE_SIZE));
                const currentAllottedPage = Math.min(allottedPage, totalAllottedPages);
                const paginatedAllotted = allotted.slice((currentAllottedPage - 1) * OE_STUDENT_PAGE_SIZE, currentAllottedPage * OE_STUDENT_PAGE_SIZE);

                const waitlistedPage = getOEStudentPage(win.id, 'WAITLISTED');
                const totalWaitlistedPages = Math.max(1, Math.ceil(waitlisted.length / OE_STUDENT_PAGE_SIZE));
                const currentWaitlistedPage = Math.min(waitlistedPage, totalWaitlistedPages);
                const paginatedWaitlisted = waitlisted.slice((currentWaitlistedPage - 1) * OE_STUDENT_PAGE_SIZE, currentWaitlistedPage * OE_STUDENT_PAGE_SIZE);

                const pendingPage = getOEStudentPage(win.id, 'PENDING');
                const totalPendingPages = Math.max(1, Math.ceil(pending.length / OE_STUDENT_PAGE_SIZE));
                const currentPendingPage = Math.min(pendingPage, totalPendingPages);
                const paginatedPending = pending.slice((currentPendingPage - 1) * OE_STUDENT_PAGE_SIZE, currentPendingPage * OE_STUDENT_PAGE_SIZE);

                return (
                  <div
                    key={win.id}
                    className={`bg-white rounded-3xl border-2 transition-all duration-200 overflow-hidden shadow-card ${
                      isActive ? 'border-purple-300' : 'border-gray-200'
                    }`}
                  >
                    {/* Card Header (Accordion style matching PE drives) */}
                    <div
                      onClick={() => toggleOEDriveKey(win.id)}
                      className="p-5 sm:p-6 bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white hover:from-purple-100/80 hover:via-indigo-100/50 cursor-pointer border-b border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 select-none transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="px-3.5 py-2 rounded-2xl bg-purple-700 text-white font-mono font-black text-sm shadow-sm flex items-center gap-1.5 flex-shrink-0">
                          <Layers className="w-4 h-4" />
                          OE-{win.elective_number || 1}
                        </span>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base sm:text-lg font-black text-gray-900 font-display">
                              Batch {win.batch} • Semester {win.semester} • Open Elective {win.elective_number || 1}
                            </h4>

                            {/* Status badges */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isPastDue
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isActive 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isPastDue ? 'bg-rose-500' : isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                              <span>
                                {isPastDue 
                                  ? 'EXPIRED' 
                                  : isActive 
                                    ? 'SELECTION ACTIVE' 
                                    : 'PAUSED / SETUP'}
                              </span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isRevealed 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {isRevealed ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                              <span>{isRevealed ? 'Results Public' : 'Results Hidden'}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{win.title}</span>
                            <span>•</span>
                            <span className="text-purple-700 font-semibold">{matchingCourses.length} OE Courses Across Depts</span>
                            <span>•</span>
                            <span>Deadline: <strong className="text-gray-700">{win.due_date ? new Date(win.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No Deadline'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Header Quick Controls */}
                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleStartWindow(win.id, win)}
                            disabled={driveActionLoading}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Start or resume selection for this batch"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Drive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStopWindow(win.id)}
                            disabled={driveActionLoading}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                            title="Pause selection for students"
                          >
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause Drive</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenAddOESubject(win)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs inline-flex items-center gap-1 transition-colors"
                          title="Add or offer Open Elective course across branches"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add OE Course</span>
                        </button>

                        <span className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs">
                          {totalSeats} Seats
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                          {totalVacancies} Vacant
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
                          {totalAllottedSeats} Filled
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteWindow(win.id, win.title)}
                          disabled={driveActionLoading}
                          className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-gray-200 disabled:opacity-50"
                          title="Delete Drive"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleOEDriveKey(win.id)}
                          className="ml-1 px-3.5 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-gray-300 text-xs font-bold text-gray-800 hover:text-purple-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Options' : 'View Options & Controls'}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Options & Tables for this Drive */}
                    {isExpanded && (
                      <div className="p-6 sm:p-8 space-y-8 bg-surface-50/40 animate-fadeIn">
                        
                        {/* Setup Phase Notice Banner (When Not Active) */}
                        {!isActive && (
                          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-2xl border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-start sm:items-center gap-2.5">
                              <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5 sm:mt-0" />
                              <div>
                                <div className="font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                                  <span>Setup Phase (Paused / Locked)</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                    {matchingCourses.length} Subject{matchingCourses.length !== 1 ? 's' : ''} Configured
                                  </span>
                                </div>
                                <p className="text-amber-800 text-[11px] mt-0.5">
                                  Add all Open Elective courses across branches. Once all subjects are added, click <strong>"Start Selection"</strong> to open choice submission for students.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartWindow(win.id, win)}
                              disabled={driveActionLoading}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 shadow-sm flex-shrink-0 transition-all disabled:opacity-50"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Selection Now</span>
                            </button>
                          </div>
                        )}

                        {/* 1. Operational Parameters & Actions Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden space-y-3 p-5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 font-display flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-crimson-700" />
                              <span>1. Operational Drive Controls & Automation</span>
                            </h4>
                            <span className="text-[11px] text-gray-400">Settings and control options for this institution OE drive</span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold text-[10px] tracking-wider">
                                <tr>
                                  <th className="px-4 py-3 w-1/4">Control Parameter</th>
                                  <th className="px-4 py-3 w-2/5">Current Configuration</th>
                                  <th className="px-4 py-3 text-right">Actions / Options</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                
                                {/* Status */}
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900">
                                    Selection Window Status
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {isActive ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>SELECTION OPEN (ACTIVE FOR STUDENTS)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        <span>PAUSED / LOCKED (SETUP PHASE)</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    {!isActive ? (
                                      <button
                                        onClick={() => handleStartWindow(win.id, win)}
                                        disabled={driveActionLoading}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Start Selection</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleStopWindow(win.id)}
                                        disabled={driveActionLoading}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                      >
                                        <Pause className="w-3 h-3 fill-current" />
                                        <span>Pause Selection</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {/* Deadline */}
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900">
                                    Selection Deadline
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <Clock className={`w-4 h-4 ${win.due_date ? 'text-crimson-600' : 'text-gray-400'}`} />
                                      <span className="font-semibold text-gray-800">
                                        {win.due_date 
                                          ? new Date(win.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) 
                                          : 'No Deadline Configured (Continuous)'}
                                      </span>
                                      {win.due_date && new Date() > new Date(win.due_date) && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                                          Expired
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-right space-x-2">
                                    <button
                                      onClick={() => handleOpenDueDateModal(win)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 inline-flex items-center gap-1 shadow-2xs"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>{win.due_date ? 'Edit Deadline' : 'Set Deadline'}</span>
                                    </button>

                                    {isActive && win.due_date && new Date() <= new Date(win.due_date) && (
                                      <button
                                        onClick={() => handleSendDeadlineReminderOE(win)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1"
                                        title="Send 24-Hour Reminder Email to pending students"
                                      >
                                        <Mail className="w-3 h-3 text-amber-700" />
                                        <span>Send 24h Reminder</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {/* Visibility */}
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900">
                                    Student Result Visibility
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                      win.allotment_revealed 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}>
                                      {win.allotment_revealed ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                                      <span>{win.allotment_revealed ? 'Published (Allotments Visible to Students)' : 'Hidden (Confidential / Pending Publication)'}</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    <button
                                      onClick={() => handleOpenRevealModal(win)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 shadow-2xs ${
                                        win.allotment_revealed 
                                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300' 
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                                      }`}
                                      title="Confirm password to publish / hide allotments"
                                    >
                                      {win.allotment_revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      <span>{win.allotment_revealed ? 'Hide Results' : 'Publish Results to Students'}</span>
                                    </button>
                                  </td>
                                </tr>

                                {/* Auto Allocation */}
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900">
                                    Automated Allocation Engine
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="text-gray-600 text-xs">
                                      Instant FIFO seat allocation with branch priority sequence & automated waitlist reallocation across Open Electives.
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                                      <button
                                        onClick={() => handleUndoAutoAllocate(win)}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs inline-flex items-center gap-1.5 transition-transform hover:scale-102 cursor-pointer"
                                        title="Undo auto-allocated assignments for this OE drive to adjust seats and reallocate"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                        <span>Undo Auto-Allocate</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenAutoAllocateModal(win)}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm shadow-purple-600/20 inline-flex items-center gap-1.5 transition-transform hover:scale-102"
                                      >
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span>Auto Allocate / Reallocate</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 2. KPI Summary Stat Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Capacity</span>
                            <div className="text-xl font-black text-gray-900 mt-1">{totalSeats} Seats</div>
                            <span className="text-[10px] text-purple-700 font-semibold">{matchingCourses.length} Courses</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Eligible Students</span>
                            <div className="text-xl font-black text-gray-900 mt-1">{eligible.length}</div>
                            <span className="text-[10px] text-gray-400 font-medium">Batch {win.batch}</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Submission Rate</span>
                            <div className="text-xl font-black text-indigo-900 mt-1">
                              {eligible.length > 0 ? Math.round((submittedStudentIds.size / eligible.length) * 100) : 0}%
                            </div>
                            <span className="text-[10px] text-indigo-700 font-semibold">{submittedStudentIds.size} submitted</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Allotted</span>
                            <div className="text-xl font-black text-emerald-700 mt-1">{allotted.length}</div>
                            <span className="text-[10px] text-emerald-700 font-semibold">Confirmed seats</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Waitlisted</span>
                            <div className="text-xl font-black text-amber-700 mt-1">{waitlisted.length}</div>
                            <span className="text-[10px] text-amber-700 font-semibold">In queue</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pending</span>
                            <div className="text-xl font-black text-rose-700 mt-1">{pending.length}</div>
                            <span className="text-[10px] text-rose-700 font-semibold">Not submitted</span>
                          </div>
                        </div>

                        {/* 3. Cross-Department Open Elective Offerings */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 font-display flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-purple-700" />
                                <span>2. Offered Open Elective (OE) Courses Across All Branches</span>
                              </h4>
                              <p className="text-[11px] text-gray-500">{matchingCourses.length} course{matchingCourses.length !== 1 ? 's' : ''} configured across departments</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAddOESubject(win)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add / Offer OE Course</span>
                            </button>
                          </div>

                          {matchingCourses.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold text-[10px] tracking-wider">
                                  <tr>
                                    <th className="px-4 py-3">Offering Branch</th>
                                    <th className="px-4 py-3">Course Code</th>
                                    <th className="px-4 py-3">Course Title</th>
                                    <th className="px-4 py-3 text-center">Total Seats</th>
                                    <th className="px-4 py-3 text-center">Available</th>
                                    <th className="px-4 py-3 text-center">Allotted</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {matchingCourses.map(course => {
                                    const cSeats = Number(course.seats) || 0;
                                    const cAvail = Number(course.available_seats) || 0;
                                    const cFilled = cSeats - cAvail;
                                    return (
                                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                            {course.department || course.branch || 'INSTITUTION'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                          {course.subject_code}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                          {course.subject_name}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                                          {cSeats}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                            {cAvail}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                                            {cFilled}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            cAvail === 0 
                                              ? 'bg-red-100 text-red-800' 
                                              : 'bg-emerald-50 text-emerald-700'
                                          }`}>
                                            {cAvail === 0 ? 'Full' : 'Available'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditOESubject(course)}
                                            className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors inline-block"
                                            title="Edit Subject"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteOESubject(course.id, course.subject_name)}
                                            className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                            title="Delete Subject"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
                              <p>No Open Elective subjects configured yet for Batch {win.batch} • Sem {win.semester} • OE-{win.elective_number || 1}.</p>
                              <p className="text-[11px] text-gray-500">You can click <strong>"+ Add / Offer OE Course"</strong> above to add subjects directly, or department coordinators can add them from their respective branch portals.</p>
                            </div>
                          )}
                        </div>

                        {/* 4. Student Enrollment & Allotment Status Tabs */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <h4 className="text-sm font-bold text-gray-900 font-display flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-700" />
                              <span>3. Student Enrolment Progress & Allotments</span>
                            </h4>

                            {/* Sub Tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                              <button
                                onClick={() => setActiveOEDriveSubTab(prev => ({ ...prev, [win.id]: 'ALLOTTED' }))}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentSubTab === 'ALLOTTED'
                                    ? 'bg-white text-emerald-800 shadow-2xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Allotted ({allotted.length})
                              </button>
                              <button
                                onClick={() => setActiveOEDriveSubTab(prev => ({ ...prev, [win.id]: 'WAITLISTED' }))}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentSubTab === 'WAITLISTED'
                                    ? 'bg-white text-amber-800 shadow-2xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Waitlisted ({waitlisted.length})
                              </button>
                              <button
                                onClick={() => setActiveOEDriveSubTab(prev => ({ ...prev, [win.id]: 'PENDING' }))}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentSubTab === 'PENDING'
                                    ? 'bg-white text-rose-800 shadow-2xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Pending Choice ({pending.length})
                              </button>
                            </div>
                          </div>

                          {/* Tab Content */}
                          {currentSubTab === 'ALLOTTED' && (
                            <div>
                              {allotted.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold text-[10px] tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3">Roll Number</th>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Branch & Sec</th>
                                        <th className="px-4 py-3">Allotted Course</th>
                                        <th className="px-4 py-3">Preference</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {paginatedAllotted.map(alt => {
                                        const matchedSubject = oeSubjects.find(s => 
                                          s.id === alt.subject_id || 
                                          (alt.subject_code && s.subject_code === alt.subject_code) ||
                                          (alt.subjectCode && s.subject_code === alt.subjectCode)
                                        );
                                        const displaySubjectName = alt.subject_name || alt.subjectName || matchedSubject?.subject_name || alt.subject_code || alt.subjectCode || 'Allotted Subject';
                                        const displaySubjectCode = alt.subject_code || alt.subjectCode || matchedSubject?.subject_code || '';
                                        const displayStudentRoll = alt.student_roll || alt.roll_number || alt.rollNumber || '—';
                                        const displayStudentName = alt.student_name || alt.studentName || '—';
                                        const displayBranch = alt.branch || alt.student_branch || '—';
                                        const displayPriority = alt.preference_rank || alt.priority_selected || 1;
                                        const isAutoAllocated = Boolean(alt.is_auto_allocated || alt.priority_selected === 'AUTO' || alt.preference_rank === 'AUTO');

                                        return (
                                          <tr key={alt.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                                              {displayStudentRoll}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-800">
                                              {displayStudentName}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600">
                                              {displayBranch} {alt.section ? `• Sec ${alt.section}` : ''}
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <span className="font-bold text-purple-900">
                                                {displaySubjectName}
                                              </span>
                                              {displaySubjectCode && displaySubjectName !== displaySubjectCode && (
                                                <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                                                  ({displaySubjectCode})
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                              {isAutoAllocated ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 inline-flex items-center gap-1 shadow-sm">
                                                  <Wand2 className="w-3 h-3 text-indigo-600" />
                                                  Auto Allocated
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                  Priority #{displayPriority}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                CONFIRMED
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                              <div className="flex flex-col items-end gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenOverrideModal(alt, win)}
                                                  className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                  title="Modify student OE course allotment"
                                                >
                                                  <Edit3 className="w-3 h-3" />
                                                  <span>Modify</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleResetStudentOEAllotment(alt, win)}
                                                  className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                  title="Reset student choice and unlock preference form"
                                                >
                                                  <RotateCcw className="w-3 h-3 text-amber-600" />
                                                  <span>Reset</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {/* Pagination Footer */}
                                  <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="text-gray-600 font-medium">
                                      Showing <strong className="text-gray-900">{(currentAllottedPage - 1) * OE_STUDENT_PAGE_SIZE + 1}</strong> to <strong className="text-gray-900">{Math.min(currentAllottedPage * OE_STUDENT_PAGE_SIZE, allotted.length)}</strong> of <strong className="text-gray-900">{allotted.length}</strong> students
                                    </div>
                                    {totalAllottedPages > 1 && (
                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'ALLOTTED', Math.max(1, currentAllottedPage - 1))}
                                          disabled={currentAllottedPage <= 1}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                          <span>Previous 50</span>
                                        </button>
                                        <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 font-bold text-xs border border-purple-200">
                                          Page {currentAllottedPage} of {totalAllottedPages}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'ALLOTTED', Math.min(totalAllottedPages, currentAllottedPage + 1))}
                                          disabled={currentAllottedPage >= totalAllottedPages}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <span>Next 50</span>
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  No students have confirmed allotments yet for this drive.
                                </div>
                              )}
                            </div>
                          )}

                          {currentSubTab === 'WAITLISTED' && (
                            <div className="space-y-3">
                              {waitlisted.length > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <span><strong>{waitlisted.length} waitlisted student(s)</strong> could not be allotted automatically due to elective capacity limits. Use <strong>Modify</strong> to assign an available course or override capacity, or <strong>Reset</strong> to unlock their preference submission.</span>
                                  </div>
                                </div>
                              )}

                              {waitlisted.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold text-[10px] tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3">Roll Number</th>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Branch & Sec</th>
                                        <th className="px-4 py-3">Requested Subject</th>
                                        <th className="px-4 py-3 text-center">Queue Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {paginatedWaitlisted.map(alt => {
                                        const matchedSubject = oeSubjects.find(s => 
                                          s.id === alt.subject_id || 
                                          (alt.subject_code && s.subject_code === alt.subject_code) ||
                                          (alt.subjectCode && s.subject_code === alt.subjectCode)
                                        );
                                        const displaySubjectName = alt.subject_name || alt.subjectName || matchedSubject?.subject_name || alt.subject_code || alt.subjectCode || 'Waitlisted Subject';
                                        const displayStudentRoll = alt.student_roll || alt.roll_number || alt.rollNumber || '—';
                                        const displayStudentName = alt.student_name || alt.studentName || '—';
                                        const displayBranch = alt.branch || alt.student_branch || '—';

                                        return (
                                          <tr key={alt.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                                              {displayStudentRoll}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-800">
                                              {displayStudentName}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600">
                                              {displayBranch} {alt.section ? `• Sec ${alt.section}` : ''}
                                            </td>
                                            <td className="px-4 py-2.5 text-amber-900 font-medium">
                                              {displaySubjectName}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                WAITLISTED
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                              <div className="flex flex-col items-end gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenOverrideModal(alt, win)}
                                                  className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                  title="Modify / Assign student to an available Open Elective"
                                                >
                                                  <Edit3 className="w-3 h-3" />
                                                  <span>Modify</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleResetStudentOEAllotment(alt, win)}
                                                  className="w-20 justify-center px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                  title="Reset waitlist status and unlock preference submission"
                                                >
                                                  <RotateCcw className="w-3 h-3 text-amber-600" />
                                                  <span>Reset</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {/* Pagination Footer */}
                                  <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="text-gray-600 font-medium">
                                      Showing <strong className="text-gray-900">{(currentWaitlistedPage - 1) * OE_STUDENT_PAGE_SIZE + 1}</strong> to <strong className="text-gray-900">{Math.min(currentWaitlistedPage * OE_STUDENT_PAGE_SIZE, waitlisted.length)}</strong> of <strong className="text-gray-900">{waitlisted.length}</strong> students
                                    </div>
                                    {totalWaitlistedPages > 1 && (
                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'WAITLISTED', Math.max(1, currentWaitlistedPage - 1))}
                                          disabled={currentWaitlistedPage <= 1}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                          <span>Previous 50</span>
                                        </button>
                                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                                          Page {currentWaitlistedPage} of {totalWaitlistedPages}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'WAITLISTED', Math.min(totalWaitlistedPages, currentWaitlistedPage + 1))}
                                          disabled={currentWaitlistedPage >= totalWaitlistedPages}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <span>Next 50</span>
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  No students in waitlist for this drive.
                                </div>
                              )}
                            </div>
                          )}

                          {currentSubTab === 'PENDING' && (
                            <div>
                              {pending.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold text-[10px] tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3">Roll Number</th>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Branch & Sec</th>
                                        <th className="px-4 py-3">Email Address</th>
                                        <th className="px-4 py-3 text-right">Quick Reminder</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {paginatedPending.map(st => (
                                        <tr key={st.id || st.roll_number} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                                            {st.roll_number || '—'}
                                          </td>
                                          <td className="px-4 py-2.5 font-medium text-gray-800">
                                            {st.name || '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-gray-600">
                                            {st.branch || '—'} {st.section ? `• Sec ${st.section}` : ''}
                                          </td>
                                          <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">
                                            {st.email || '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            {st.email ? (
                                              <a
                                                href={`mailto:${st.email}?subject=Reminder: Open Elective (OE-${win.elective_number || 1}) Selection Window Open&body=Dear ${st.name || 'Student'},%0D%0A%0D%0APlease submit your Open Elective preferences on the Autonomous Elective Portal before the deadline.%0D%0A%0D%0ARegards,%0D%0AAdmin Office`}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 transition-colors"
                                                title="Send reminder email to student"
                                              >
                                                <Mail className="w-3 h-3 text-amber-700" />
                                                <span>Remind</span>
                                              </a>
                                            ) : (
                                              <span className="text-gray-400 text-[10px]">No email</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>

                                  {/* Pagination Footer */}
                                  <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="text-gray-600 font-medium">
                                      Showing <strong className="text-gray-900">{(currentPendingPage - 1) * OE_STUDENT_PAGE_SIZE + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPendingPage * OE_STUDENT_PAGE_SIZE, pending.length)}</strong> of <strong className="text-gray-900">{pending.length}</strong> students
                                    </div>
                                    {totalPendingPages > 1 && (
                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'PENDING', Math.max(1, currentPendingPage - 1))}
                                          disabled={currentPendingPage <= 1}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                          <span>Previous 50</span>
                                        </button>
                                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200">
                                          Page {currentPendingPage} of {totalPendingPages}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setOEStudentPage(win.id, 'PENDING', Math.min(totalPendingPages, currentPendingPage + 1))}
                                          disabled={currentPendingPage >= totalPendingPages}
                                          className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <span>Next 50</span>
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  All eligible students have submitted their Open Elective choices!
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-card space-y-3">
              <Calendar className="w-10 h-10 text-gray-400 mx-auto" />
              <h4 className="text-base font-bold text-gray-900">No Open Elective (OE) Selection Drives Found</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                No selection drives match your current search or filter criteria. Click <strong>Configure New OE Batch Drive</strong> above to establish one.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* ADD / EDIT COORDINATOR MODAL */}
      {/* ===================================================================== */}
      <Modal
        isOpen={coordModalOpen}
        onClose={() => setCoordModalOpen(false)}
        title={editingCoord ? "Edit Department Coordinator" : "Register Department Coordinator"}
        subtitle="Authorize an official branch coordinator to manage department electives and enroll students."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCoordinator} className="space-y-4">
          {coordModalError && (
            <div className="p-3 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{coordModalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Coordinator Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. K. Ramesh"
              value={coordFormData.name}
              onChange={(e) => setCoordFormData({ ...coordFormData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. cse.coord@college.edu or ramesh@gmail.com"
              value={coordFormData.email}
              onChange={(e) => setCoordFormData({ ...coordFormData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-600 font-medium"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Only coordinators registered with this email can sign into the Coordinator Portal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Assigned Branch *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE"
                value={coordFormData.branch}
                onChange={(e) => {
                  const b = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                  setCoordFormData({ 
                    ...coordFormData, 
                    branch: b,
                    roll_number: coordFormData.roll_number || (b ? `COORD-${b}` : '')
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold uppercase focus:ring-2 focus:ring-crimson-600 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Capital letters only (e.g. CSE, ECE, AIML)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Staff / Roll ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. COORD-CSE"
                value={coordFormData.roll_number}
                onChange={(e) => setCoordFormData({ ...coordFormData, roll_number: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-crimson-600"
              />
              <p className="text-[10px] text-gray-500 mt-1">Must be unique</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCoordModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={coordModalLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{coordModalLoading ? 'Saving...' : editingCoord ? 'Update Coordinator' : 'Register Coordinator'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIGURE BATCH SELECTION DRIVE MODAL (OE ONLY FOR CENTRAL ADMIN) */}
      <Modal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        title="Configure Batch Open Elective (OE) Drive"
        subtitle="Establish an official institution-wide Open Elective selection drive for an academic batch."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateDrive} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Target Academic Batch *
            </label>
            {adminDriveBatches.length > 0 ? (
              <select
                value={driveFormData.batch}
                onChange={(e) => setDriveFormData({ ...driveFormData, batch: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800"
              >
                <option value="">Select Batch...</option>
                {adminDriveBatches.map(b => (
                  <option key={b} value={b}>Batch {b}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="e.g. 2024-2028"
                value={driveFormData.batch}
                onChange={(e) => setDriveFormData({ ...driveFormData, batch: e.target.value })}
                onBlur={(e) => setDriveFormData({ ...driveFormData, batch: normalizeBatch(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:ring-2 focus:ring-crimson-600"
              />
            )}
            <p className="text-[10px] text-gray-500 mt-1">Batches ordered in descending academic progression.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Semester *
              </label>
              <select
                value={driveFormData.semester}
                onChange={(e) => setDriveFormData({ ...driveFormData, semester: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-crimson-600"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Sem {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Elective No. *
              </label>
              <select
                value={driveFormData.elective_number || 1}
                onChange={(e) => setDriveFormData({ ...driveFormData, elective_number: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900 focus:ring-2 focus:ring-purple-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                  const count = oeSubjects.filter(s =>
                    normalizeBatch(s.admitted_batch) === normalizeBatch(driveFormData.batch) &&
                    Number(s.semester) === Number(driveFormData.semester) &&
                    Number(s.elective_number || 1) === num
                  ).length;
                  return (
                    <option key={num} value={num}>
                      OE-{num} {count > 0 ? `(${count} course${count > 1 ? 's' : ''})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <div className="px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-900 flex items-center justify-center">
                <span>OE</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Initial Selection Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={driveFormData.due_date || ''}
              onChange={(e) => setDriveFormData({ ...driveFormData, due_date: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium bg-white focus:ring-2 focus:ring-crimson-600"
            />
            <p className="text-[10px] text-gray-500 mt-1">Can also be configured or extended anytime after drive creation.</p>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cross-Department Open Elective Architecture</p>
              <p className="text-purple-800 text-[10px] mt-0.5">
                Each academic department offers its own distinct Open Elective curriculum for students of other branches. All OE slots (OE-1 through OE-8) are available for central drive creation.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                Initial Drive Status: PAUSED / LOCKED (Setup Phase)
              </p>
              <p className="text-amber-800 text-[10px] mt-0.5">
                This drive will initially be in <strong>Paused / Locked (Setup Phase)</strong>. You and department coordinators can add/offer all OE courses across branches. Once all subjects are finalized, click <strong>"Start Drive"</strong> to open selection to students.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDriveModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={driveActionLoading || !driveFormData.batch}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{driveActionLoading ? 'Configuring...' : 'Establish OE Drive'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* REVEAL / HIDE OE ALLOTMENTS MODAL */}
      <Modal
        isOpen={revealModalOpen}
        onClose={() => {
          if (!revealLoading) {
            setRevealModalOpen(false);
            setRevealPassword('');
            setRevealError('');
          }
        }}
        title={selectedDriveForReveal?.allotment_revealed ? "Hide Open Elective (OE) Allotments" : "Reveal Open Elective (OE) Allotments"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReveal} className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${selectedDriveForReveal?.allotment_revealed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {selectedDriveForReveal?.allotment_revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selectedDriveForReveal?.title || `Batch ${selectedDriveForReveal?.batch} OE Drive`}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Batch {selectedDriveForReveal?.batch} • Semester {selectedDriveForReveal?.semester} • Open Elective (OE)
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {selectedDriveForReveal?.allotment_revealed 
                    ? "Hiding allotments will immediately mask subject details and memos on the student portal for all departments in this batch. Students will see 'Pending Publication'."
                    : "Revealing allotments will immediately publish all OE allotted subjects and memos to students across all departments in this batch."}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-crimson-600" />
              <span>Confirm Administrator Password</span>
            </label>
            <input
              type="password"
              required
              value={revealPassword}
              onChange={(e) => setRevealPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none"
              autoFocus
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Admin security verification is required to publish or hide results college-wide.
            </p>
          </div>

          {revealError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{revealError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={revealLoading}
              onClick={() => setRevealModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={revealLoading || !revealPassword}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                selectedDriveForReveal?.allotment_revealed
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300'
              }`}
            >
              {revealLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  {selectedDriveForReveal?.allotment_revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{selectedDriveForReveal?.allotment_revealed ? "Confirm & Hide" : "Confirm & Reveal"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT DUE DATE MODAL */}
      <Modal
        isOpen={dueDateModalOpen}
        onClose={() => {
          if (!dueDateLoading) {
            setDueDateModalOpen(false);
            setDueDateError('');
          }
        }}
        title="Set OE Selection Due Date & Schedule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveDueDate} className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <h4 className="text-sm font-bold text-gray-900">{selectedDriveForDueDate?.title || `Batch ${selectedDriveForDueDate?.batch} OE Drive`}</h4>
            <p className="text-xs text-gray-500 mt-1">
              Batch {selectedDriveForDueDate?.batch} • Semester {selectedDriveForDueDate?.semester}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Set an institutional deadline for students across all departments to submit their Open Elective preferences. After this time, OE preference submission will automatically close.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-crimson-600" />
              <span>Selection Deadline (Due Date & Time)</span>
            </label>
            <input
              type="datetime-local"
              value={newDriveDueDate}
              onChange={(e) => setNewDriveDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none"
            />
            <div className="flex justify-between items-center mt-1.5">
              <p className="text-[11px] text-gray-500">
                Leave blank for no deadline.
              </p>
              {newDriveDueDate && (
                <button
                  type="button"
                  onClick={() => setNewDriveDueDate('')}
                  className="text-[11px] text-crimson-600 hover:underline font-semibold"
                >
                  Clear Deadline
                </button>
              )}
            </div>
          </div>

          {dueDateError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{dueDateError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={dueDateLoading}
              onClick={() => setDueDateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dueDateLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-crimson-600 hover:bg-crimson-700 disabled:bg-gray-300 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {dueDateLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* AUTO-ALLOCATE OE STUDENTS MODAL */}
      <Modal
        isOpen={autoAllocateModalOpen}
        onClose={() => {
          if (!autoAllocateLoading) {
            setAutoAllocateModalOpen(false);
            setAutoAllocatePassword('');
            setAutoAllocateError('');
            setAutoAllocateProgress(0);
            setAutoAllocatePhase('');
          }
        }}
        title="OE Automated Allocation & Reallocation Engine"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmAutoAllocate} className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900">{selectedDriveForAutoAllocate?.title || `Batch ${selectedDriveForAutoAllocate?.batch} OE Drive`}</h4>
                <p className="text-xs text-indigo-700 mt-1">
                  Batch {selectedDriveForAutoAllocate?.batch} • Semester {selectedDriveForAutoAllocate?.semester} • Institutional Open Elective
                </p>
                <div className="text-xs text-indigo-800 mt-2 space-y-1">
                  <p>• <strong>Waitlist Reallocation:</strong> Previously waitlisted students will be reallocated if elective seat capacities were expanded.</p>
                  <p>• <strong>Branch Priority Order:</strong> Students are processed in the sequence defined below, then section-wise.</p>
                  <p>• <strong>Interdisciplinary Integrity:</strong> Cross-departmental eligibility is strictly enforced.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Branch Priority Reordering Widget - ONLY Registered Coordinator Branches */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Registered Branch Priority Sequence ({branchPriorityOrder.length} {branchPriorityOrder.length === 1 ? 'Department' : 'Departments'})</span>
              </label>
              <span className="text-[10px] text-gray-500">First in order gets allocated first</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
              {branchPriorityOrder.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                  <p className="font-semibold text-gray-700">No Coordinator Branches Registered</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Please register department coordinators under the Coordinators tab first.</p>
                </div>
              ) : (
                branchPriorityOrder.map((branchName, idx) => (
                  <div 
                    key={branchName}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 shadow-2xs text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-900 font-mono">{branchName} Department</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBranchUp(idx)}
                        disabled={idx === 0 || autoAllocateLoading}
                        className="p-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBranchDown(idx)}
                        disabled={idx === branchPriorityOrder.length - 1 || autoAllocateLoading}
                        className="p-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {autoAllocateLoading ? (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 animate-spin text-amber-700" />
                  <span>Processing: {autoAllocateProgress}% Completed</span>
                </span>
                <span className="text-xs font-bold text-amber-800">{autoAllocateProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-600 via-indigo-600 to-emerald-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${autoAllocateProgress}%` }}
                />
              </div>

              <p className="text-xs text-amber-900 font-semibold italic text-center">
                {autoAllocatePhase || 'Allocating and reallocating OE quotas...'}
              </p>

              {/* Critical Warning Notice */}
              <div className="p-3.5 bg-red-100 border border-red-300 rounded-xl text-red-900 text-xs font-bold flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-black uppercase text-[11px] text-red-800">Critical Notice — Please Do Not Exit!</span>
                  <span>Automated allocation and reallocation is processing. Please <strong>DO NOT close the website, cancel, refresh, or exit this browser tab</strong> while processing.</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-crimson-600" />
                <span>Confirm Administrator Password</span>
              </label>
              <input
                type="password"
                required
                value={autoAllocatePassword}
                onChange={(e) => setAutoAllocatePassword(e.target.value)}
                placeholder="Enter your account password to authorize"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none"
                autoFocus
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Administrator authorization is required to run automated allocation & reallocation.
              </p>
            </div>
          )}

          {autoAllocateError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{autoAllocateError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={autoAllocateLoading}
              onClick={() => setAutoAllocateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={autoAllocateLoading || !autoAllocatePassword}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {autoAllocateLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing ({autoAllocateProgress}%)...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Execute Auto Allocate / Reallocate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* OE SUBJECT OFFERINGS MODAL (SETUP PHASE / EDIT) */}
      <SubjectModal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSave={handleSaveSubject}
        editingSubject={editingSubject}
        defaultType="OE"
        defaultBatch={subjectModalDefaults.batch}
        defaultSemester={subjectModalDefaults.semester}
        defaultElectiveNumber={subjectModalDefaults.elective_number}
        coordinatorBranch={subjectModalDefaults.branch || 'CSE'}
        registeredBranches={Array.from(new Set(coordinators.map(c => c.branch).filter(Boolean))).sort()}
      />

      {/* MANUAL ALLOTMENT OVERRIDE MODAL */}
      <ManualOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onSave={handleSaveOverride}
        allotmentRecord={selectedAllotmentForOverride}
        eligibleSubjects={oeSubjects}
      />

      {/* PRINT-ONLY COMPONENT */}
      <PrintAllotmentView
        records={printConfig.records && printConfig.records.length > 0 ? printConfig.records : (paginatedAllotments.length > 0 ? paginatedAllotments : allotments)}
        reportType={printConfig.reportType}
        title={printConfig.title}
        subtitle={printConfig.subtitle}
        filters={allotmentFilters}
        currentPage={printConfig.currentPage || currentAllotmentPage}
        pageSize={ALLOTMENT_PAGE_SIZE}
        totalRecords={printConfig.records ? printConfig.records.length : allotments.length}
      />

    </div>
  );
}
