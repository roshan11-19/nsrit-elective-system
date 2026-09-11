import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Edit, 
  Edit3,
  Trash2, 
  BarChart3, 
  Users, 
  BookOpen, 
  Globe,
  Layers, 
  ShieldCheck, 
  Sliders, 
  UserPlus,
  RefreshCw,
  Sparkles,
  Unlock,
  RotateCcw,
  FileSpreadsheet,
  Mail,
  CheckSquare,
  Square,
  UserCheck,
  Calendar,
  Play,
  Pause,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  UploadCloud,
  Check,
  Info,
  Lock,
  Copy,
  Grid,
  Table as TableIcon,
  Award,
  TrendingUp,
  Send,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { normalizeBatch } from '../../lib/storage';
import { coordinatorService } from '../../services/coordinatorService';
import { adminService } from '../../services/adminService';

// Modals
import CurriculumUploadModal from '../../components/coordinator/CurriculumUploadModal';
import CurriculumSubjectModal from '../../components/coordinator/CurriculumSubjectModal';
import PESelectionDriveModal from '../../components/coordinator/PESelectionDriveModal';
import OfferElectiveModal from '../../components/coordinator/OfferElectiveModal';
import SubjectModal from '../../components/coordinator/SubjectModal';
import AddStudentModal from '../../components/coordinator/AddStudentModal';
import EditStudentModal from '../../components/coordinator/EditStudentModal';
import BulkEditStudentsModal from '../../components/coordinator/BulkEditStudentsModal';
import ImportStudentsModal from '../../components/coordinator/ImportStudentsModal';
import ManualOverrideModal from '../../components/coordinator/ManualOverrideModal';
import PrintAllotmentView from '../../components/coordinator/PrintAllotmentView';

const COLORS = ['#C8191E', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#4B5563'];

export default function CoordinatorDashboard() {
  const { currentUser, showToast } = useAuth();
  const coordinatorBranch = currentUser?.branch || 'CSE';
  
  // 5 Main Navigation Tabs:
  // 1. Curriculum & Students ('CURRICULUM')
  // 2. PE Drive Control ('PE_DRIVES')
  // 3. Elective Offerings ('OFFERINGS')
  // 4. Live Analytics ('ANALYZE')
  // 5. Allotments & Printing ('CHANGE_PRINT')
  const [activeTab, setActiveTab] = useState('CURRICULUM');

  const [loading, setLoading] = useState(true);

  // Tab 1 Sub-tab switcher: 'CURRICULUM_CATALOG' | 'STUDENTS_DIRECTORY'
  const [curriculumSubTab, setCurriculumSubTab] = useState('CURRICULUM_CATALOG');

  // Tab 3 Sub-tab switcher: 'PE_CONFIG' | 'OE_CONFIG'
  const [configSubTab, setConfigSubTab] = useState('PE_CONFIG');

  // Tab 1 Student Drilldown Navigation State:
  const [drilldownBatch, setDrilldownBatch] = useState(null);
  const [drilldownSection, setDrilldownSection] = useState(null);

  // Data states
  const [curriculumList, setCurriculumList] = useState([]);
  const [curriculumSummaries, setCurriculumSummaries] = useState([]);
  const [peDrives, setPeDrives] = useState([]);
  const [peSubjects, setPeSubjects] = useState([]);
  const [oeSubjects, setOeSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [allotments, setAllotments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [registeredBranches, setRegisteredBranches] = useState([]);
  const [adminWindows, setAdminWindows] = useState([]);

  // Modals state
  const [curriculumUploadModalOpen, setCurriculumUploadModalOpen] = useState(false);
  const [curriculumSubjectModalOpen, setCurriculumSubjectModalOpen] = useState(false);
  const [editingCurriculumSubject, setEditingCurriculumSubject] = useState(null);

  const [peDriveModalOpen, setPeDriveModalOpen] = useState(false);
  const [peDriveModalDefaults, setPeDriveModalDefaults] = useState({ batch: '', semester: 5 });
  const [resumeOfferingAfterDrive, setResumeOfferingAfterDrive] = useState(null);

  const [offerElectiveModalOpen, setOfferElectiveModalOpen] = useState(false);
  const [offerElectiveType, setOfferElectiveType] = useState('PE');
  const [offerElectiveDefaults, setOfferElectiveDefaults] = useState({ batch: '', semester: 5, elective_number: 1 });

  // Tab 1: Batch Cards Accordion & In-Card Filters State (Collapsed by default)
  const [expandedCurriculumBatchKeys, setExpandedCurriculumBatchKeys] = useState({});

  const toggleCurriculumBatchKey = (batch) => {
    setExpandedCurriculumBatchKeys(prev => ({
      ...prev,
      [batch]: !prev[batch]
    }));
  };

  const [batchFiltersMap, setBatchFiltersMap] = useState({});
  const getBatchFilters = (batch) => {
    return batchFiltersMap[batch] || {
      semester: 'ALL',
      elective_type: 'ALL',
      elective_number: 'ALL',
      search: ''
    };
  };
  const setBatchFilter = (batch, key, value) => {
    setBatchFiltersMap(prev => ({
      ...prev,
      [batch]: {
        ...(prev[batch] || { semester: 'ALL', elective_type: 'ALL', elective_number: 'ALL', search: '' }),
        [key]: value,
        ...(key === 'elective_type' ? { elective_number: 'ALL' } : {})
      }
    }));
  };

  const [curriculumBatch, setCurriculumBatch] = useState('');

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalType, setSubjectModalType] = useState('PE');
  const [editingSubject, setEditingSubject] = useState(null);

  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [importStudentsModalOpen, setImportStudentsModalOpen] = useState(false);

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedAllotmentForOverride, setSelectedAllotmentForOverride] = useState(null);

  // -------------------------------------------------------------
  // TAB 3: PROFESSIONAL ELECTIVES (PE) OFFERING PIPELINE STATE
  // -------------------------------------------------------------
  const [peOfferingBatch, setPeOfferingBatch] = useState('');
  const [peOfferingSemester, setPeOfferingSemester] = useState(5);
  const [peOfferingNumber, setPeOfferingNumber] = useState(1);
  const [peSelectedCurriculumIds, setPeSelectedCurriculumIds] = useState([]);
  const [peCurriculumSeatMap, setPeCurriculumSeatMap] = useState({});
  const [peActivatingLoading, setPeActivatingLoading] = useState(false);
  const [peSubjectFilters, setPeSubjectFilters] = useState({
    batch: 'ALL',
    semester: 'ALL',
    elective_number: 'ALL',
    search: ''
  });

  // -------------------------------------------------------------
  // TAB 3: OPEN ELECTIVES (OE) OFFERING PIPELINE STATE
  // -------------------------------------------------------------
  const [oeOfferingBatch, setOeOfferingBatch] = useState('');
  const [oeOfferingSemester, setOeOfferingSemester] = useState(5);
  const [oeOfferingNumber, setOeOfferingNumber] = useState(1);
  const [oeSelectedCurriculumIds, setOeSelectedCurriculumIds] = useState([]);
  const [oeCurriculumSeatMap, setOeCurriculumSeatMap] = useState({});
  const [oeCurriculumBranchesMap, setOeCurriculumBranchesMap] = useState({});
  const [oeActivatingLoading, setOeActivatingLoading] = useState(false);
  const [oeSubjectFilters, setOeSubjectFilters] = useState({
    batch: 'ALL',
    semester: 'ALL',
    elective_number: 'ALL',
    search: ''
  });

  // Offering card accordion expansion states
  const [expandedPEOfferingKeys, setExpandedPEOfferingKeys] = useState({});
  const [expandedOEOfferingKeys, setExpandedOEOfferingKeys] = useState({});
  const [subjectModalDefaults, setSubjectModalDefaults] = useState({
    batch: '',
    semester: 5,
    elective_number: 1,
    regulation: 'AR23'
  });

  const togglePEOfferingKey = (key) => {
    setExpandedPEOfferingKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleOEOfferingKey = (key) => {
    setExpandedOEOfferingKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // -------------------------------------------------------------
  // TAB 3 (Students) Search & Regulation Filter
  // -------------------------------------------------------------
  const [studentDirectorySearch, setStudentDirectorySearch] = useState('');
  const [studentDirectoryRegulation, setStudentDirectoryRegulation] = useState('ALL');

  // -------------------------------------------------------------
  // TAB 4 (Live Analytics) Filters & Controls
  // -------------------------------------------------------------
  const [analyticsElectiveType, setAnalyticsElectiveType] = useState('PE');
  const [analyticsBatch, setAnalyticsBatch] = useState('ALL');
  const [analyticsSemester, setAnalyticsSemester] = useState('ALL');
  const [analyticsElectiveNumber, setAnalyticsElectiveNumber] = useState('ALL');
  const [analyticsSection, setAnalyticsSection] = useState('ALL');
  const [analyticsBranch, setAnalyticsBranch] = useState('ALL');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsViewMode, setAnalyticsViewMode] = useState('CARDS'); // 'CARDS' | 'TABLE' | 'MATRIX'
  const [expandedSubjectAnalyticsId, setExpandedSubjectAnalyticsId] = useState(null);
  const [expandedSectionAnalyticsKey, setExpandedSectionAnalyticsKey] = useState(null);
  const [copiedAnalyticsNotice, setCopiedAnalyticsNotice] = useState('');

  // -------------------------------------------------------------
  // TAB 5 (Allotments) Filters
  // -------------------------------------------------------------
  const [filters, setFilters] = useState({
    elective_type: 'ALL',
    elective_number: 'ALL',
    batch: 'ALL',
    coordinatorBranch: coordinatorBranch,
    student_branch: 'ALL',
    section: 'ALL',
    status: 'ALL',
    subject_id: 'ALL',
    search: ''
  });

  // Print state
  const [printConfig, setPrintConfig] = useState({
    reportType: 'COMPLETE',
    title: 'Professional Elective (PE) Allotment Sheet',
    subtitle: 'Academic Year Allotment Report',
    filters: {},
    records: []
  });

  // -------------------------------------------------------------
  // DATA LOADER
  // -------------------------------------------------------------
  const loadAllData = async () => {
    try {
      setLoading(true);
      const coordBranch = currentUser?.branch || 'CSE';
      const [
        curricula,
        drivesList,
        peList,
        oeList,
        studentList,
        logsList,
        coordsList,
        winList,
        batchSummaries
      ] = await Promise.all([
        coordinatorService.getCurriculum('ALL', coordBranch),
        coordinatorService.getPESelectionWindows(coordBranch),
        coordinatorService.getSubjects('PE', coordBranch),
        coordinatorService.getSubjects('OE', coordBranch),
        coordinatorService.getStudents(coordBranch),
        coordinatorService.getAuditLogs(),
        adminService.getCoordinators(),
        adminService.getSelectionWindows(),
        coordinatorService.getCurriculumBatchSummaries(coordBranch)
      ]);

      setCurriculumList(curricula || []);
      setPeDrives(drivesList || []);
      setPeSubjects(peList || []);
      setOeSubjects(oeList || []);
      setStudents(studentList || []);
      setAuditLogs(logsList || []);
      const regBranches = Array.from(new Set((coordsList || []).map(c => c.branch).filter(Boolean))).sort();
      setRegisteredBranches(regBranches);
      setAdminWindows(winList || []);
      setCurriculumSummaries(batchSummaries || []);

      const [analyticsData, allotmentList] = await Promise.all([
        coordinatorService.getAnalyticsSummary(analyticsElectiveType, coordBranch),
        coordinatorService.getAllotmentRecords({ ...filters, coordinatorBranch: coordBranch })
      ]);

      setAnalytics(analyticsData);
      setAllotments(allotmentList || []);
    } catch (err) {
      console.error('Error loading coordinator dashboard:', err);
      showToast('Error refreshing coordinator data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [analyticsElectiveType, currentUser?.branch]);

  useEffect(() => {
    async function filterAllotments() {
      const coordBranch = currentUser?.branch || 'CSE';
      const records = await coordinatorService.getAllotmentRecords({
        ...filters,
        coordinatorBranch: coordBranch
      });
      setAllotments(records);
    }
    filterAllotments();
  }, [filters, currentUser?.branch]);

  // Derived Batches Pool (from curriculum, drives, profiles, and subjects)
  const availableBatches = Array.from(new Set([
    ...curriculumList.map(c => normalizeBatch(c.batch)),
    ...peDrives.map(d => normalizeBatch(d.batch)),
    ...students.map(s => normalizeBatch(s.admitted_batch)),
    ...peSubjects.map(s => normalizeBatch(s.admitted_batch)),
    ...oeSubjects.map(s => normalizeBatch(s.admitted_batch)),
    ...allotments.map(a => normalizeBatch(a.admitted_batch || a.batch)),
    ...(adminWindows || []).map(w => normalizeBatch(w.batch))
  ].filter(Boolean))).sort();

  // Sorted PE Selection Drives (ordered by Batch ascending, then Semester ascending)
  const sortedPeDrives = useMemo(() => {
    return [...peDrives].sort((a, b) => {
      const batchA = normalizeBatch(a.batch || '');
      const batchB = normalizeBatch(b.batch || '');
      const batchCompare = batchA.localeCompare(batchB, undefined, { numeric: true, sensitivity: 'base' });
      if (batchCompare !== 0) return batchCompare;
      return (Number(a.semester) || 0) - (Number(b.semester) || 0);
    });
  }, [peDrives]);

  // Dynamic Cascading Selectors for PE in Tab 3
  const peCurriculumBatches = Array.from(new Set(
    curriculumList
      .filter(c => c.elective_type === 'PE')
      .map(c => normalizeBatch(c.batch))
      .filter(Boolean)
  )).sort();

  const peCurriculumSemesters = Array.from(new Set(
    curriculumList
      .filter(c => c.elective_type === 'PE' && normalizeBatch(c.batch) === normalizeBatch(peOfferingBatch))
      .map(c => Number(c.semester))
      .filter(Boolean)
  )).sort((a, b) => a - b);

  const peCurriculumElectiveNumbers = Array.from(new Set(
    curriculumList
      .filter(c => 
        c.elective_type === 'PE' && 
        normalizeBatch(c.batch) === normalizeBatch(peOfferingBatch) && 
        Number(c.semester) === Number(peOfferingSemester)
      )
      .map(c => Number(c.elective_number || 1))
      .filter(Boolean)
  )).sort((a, b) => a - b);

  // Dynamic Cascading Selectors for OE in Tab 3
  const oeCurriculumBatches = Array.from(new Set(
    curriculumList
      .filter(c => c.elective_type === 'OE')
      .map(c => normalizeBatch(c.batch))
      .filter(Boolean)
  )).sort();

  const oeCurriculumSemesters = Array.from(new Set(
    curriculumList
      .filter(c => c.elective_type === 'OE' && normalizeBatch(c.batch) === normalizeBatch(oeOfferingBatch))
      .map(c => Number(c.semester))
      .filter(Boolean)
  )).sort((a, b) => a - b);

  const oeCurriculumElectiveNumbers = Array.from(new Set(
    curriculumList
      .filter(c => 
        c.elective_type === 'OE' && 
        normalizeBatch(c.batch) === normalizeBatch(oeOfferingBatch) && 
        Number(c.semester) === Number(oeOfferingSemester)
      )
      .map(c => Number(c.elective_number || 1))
      .filter(Boolean)
  )).sort((a, b) => a - b);

  // Auto-sync initial batch selection
  useEffect(() => {
    if (availableBatches.length > 0) {
      if (!curriculumBatch || !availableBatches.includes(curriculumBatch)) {
        setCurriculumBatch(availableBatches[0]);
      }
    }
  }, [availableBatches.join(',')]);

  // Auto-sync PE cascading selections
  useEffect(() => {
    if (peCurriculumBatches.length > 0) {
      if (!peOfferingBatch || !peCurriculumBatches.includes(peOfferingBatch)) {
        setPeOfferingBatch(peCurriculumBatches[0]);
      }
    } else {
      setPeOfferingBatch('');
    }
  }, [peCurriculumBatches.join(',')]);

  useEffect(() => {
    if (peCurriculumSemesters.length > 0) {
      if (!peCurriculumSemesters.includes(Number(peOfferingSemester))) {
        setPeOfferingSemester(peCurriculumSemesters[0]);
      }
    } else {
      setPeOfferingSemester(5);
    }
  }, [peOfferingBatch, peCurriculumSemesters.join(',')]);

  useEffect(() => {
    if (peCurriculumElectiveNumbers.length > 0) {
      if (!peCurriculumElectiveNumbers.includes(Number(peOfferingNumber))) {
        setPeOfferingNumber(peCurriculumElectiveNumbers[0]);
      }
    } else {
      setPeOfferingNumber(1);
    }
  }, [peOfferingBatch, peOfferingSemester, peCurriculumElectiveNumbers.join(',')]);

  // Auto-sync OE cascading selections
  useEffect(() => {
    if (oeCurriculumBatches.length > 0) {
      if (!oeOfferingBatch || !oeCurriculumBatches.includes(oeOfferingBatch)) {
        setOeOfferingBatch(oeCurriculumBatches[0]);
      }
    } else {
      setOeOfferingBatch('');
    }
  }, [oeCurriculumBatches.join(',')]);

  useEffect(() => {
    if (oeCurriculumSemesters.length > 0) {
      if (!oeCurriculumSemesters.includes(Number(oeOfferingSemester))) {
        setOeOfferingSemester(oeCurriculumSemesters[0]);
      }
    } else {
      setOeOfferingSemester(5);
    }
  }, [oeOfferingBatch, oeCurriculumSemesters.join(',')]);

  useEffect(() => {
    if (oeCurriculumElectiveNumbers.length > 0) {
      if (!oeCurriculumElectiveNumbers.includes(Number(oeOfferingNumber))) {
        setOeOfferingNumber(oeCurriculumElectiveNumbers[0]);
      }
    } else {
      setOeOfferingNumber(1);
    }
  }, [oeOfferingBatch, oeCurriculumSemesters.join(',')]);

  // Grouped active offered PE batches for Tab 3 cards
  const peOfferingGroups = useMemo(() => {
    const groups = {};
    peSubjects.forEach(s => {
      const b = normalizeBatch(s.admitted_batch);
      const sem = Number(s.semester || 5);
      const eNum = Number(s.elective_number || 1);
      const key = `${b}__${sem}__${eNum}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          batch: s.admitted_batch,
          semester: sem,
          elective_number: eNum,
          regulation: s.regulation || 'AR23',
          subjects: []
        };
      }
      groups[key].subjects.push(s);
    });
    let list = Object.values(groups);
    if (peSubjectFilters.batch && peSubjectFilters.batch !== 'ALL') {
      list = list.filter(g => normalizeBatch(g.batch) === normalizeBatch(peSubjectFilters.batch));
    }
    if (peSubjectFilters.semester && peSubjectFilters.semester !== 'ALL') {
      list = list.filter(g => Number(g.semester) === Number(peSubjectFilters.semester));
    }
    if (peSubjectFilters.elective_number && peSubjectFilters.elective_number !== 'ALL') {
      list = list.filter(g => Number(g.elective_number) === Number(peSubjectFilters.elective_number));
    }
    if (peSubjectFilters.search && peSubjectFilters.search.trim()) {
      const query = peSubjectFilters.search.toLowerCase().trim();
      list = list.filter(g => 
        g.batch?.toLowerCase().includes(query) ||
        g.subjects.some(s => s.subject_code?.toLowerCase().includes(query) || s.subject_name?.toLowerCase().includes(query))
      );
    }
    return list;
  }, [peSubjects, peSubjectFilters]);

  // Grouped active offered OE batches for Tab 3 cards
  const oeOfferingGroups = useMemo(() => {
    const groups = {};
    oeSubjects.forEach(s => {
      const b = normalizeBatch(s.admitted_batch);
      const sem = Number(s.semester || 5);
      const eNum = Number(s.elective_number || 1);
      const key = `${b}__${sem}__${eNum}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          batch: s.admitted_batch,
          semester: sem,
          elective_number: eNum,
          regulation: s.regulation || 'AR23',
          subjects: []
        };
      }
      groups[key].subjects.push(s);
    });
    let list = Object.values(groups);
    if (oeSubjectFilters.batch && oeSubjectFilters.batch !== 'ALL') {
      list = list.filter(g => normalizeBatch(g.batch) === normalizeBatch(oeSubjectFilters.batch));
    }
    if (oeSubjectFilters.semester && oeSubjectFilters.semester !== 'ALL') {
      list = list.filter(g => Number(g.semester) === Number(oeSubjectFilters.semester));
    }
    if (oeSubjectFilters.elective_number && oeSubjectFilters.elective_number !== 'ALL') {
      list = list.filter(g => Number(g.elective_number) === Number(oeSubjectFilters.elective_number));
    }
    if (oeSubjectFilters.search && oeSubjectFilters.search.trim()) {
      const query = oeSubjectFilters.search.toLowerCase().trim();
      list = list.filter(g => 
        g.batch?.toLowerCase().includes(query) ||
        g.subjects.some(s => s.subject_code?.toLowerCase().includes(query) || s.subject_name?.toLowerCase().includes(query))
      );
    }
    return list;
  }, [oeSubjects, oeSubjectFilters]);

  // Check if PE Selection Drive is established & active for current selected batch + semester
  const currentPEDrive = useMemo(() => {
    return peDrives.find(d => 
      normalizeBatch(d.batch) === normalizeBatch(peOfferingBatch) && 
      Number(d.semester) === Number(peOfferingSemester)
    );
  }, [peDrives, peOfferingBatch, peOfferingSemester]);

  const isPEDriveEstablished = !!currentPEDrive;
  const isPEDriveActive = currentPEDrive?.status === 'ACTIVE';

  // -------------------------------------------------------------
  // TAB 1: CURRICULUM HANDLERS
  // -------------------------------------------------------------
  const handleSaveCurriculumBatchExcel = async (batch, branch, parsedRows) => {
    try {
      const result = await coordinatorService.uploadCurriculumExcel(
        batch,
        branch,
        parsedRows
      );
      showToast(`Uploaded ${result.length || parsedRows.length} curriculum subjects for Batch ${batch}!`, 'success');
      setCurriculumUploadModalOpen(false);
      setCurriculumBatch(batch);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save curriculum excel.', 'error');
    }
  };

  const handleSaveCurriculumSingleSubject = async (subjectData) => {
    try {
      if (editingCurriculumSubject) {
        await coordinatorService.updateCurriculumSubject(editingCurriculumSubject.id, subjectData);
        showToast(`Updated curriculum subject ${subjectData.subject_code}.`, 'success');
      } else {
        await coordinatorService.addCurriculumSubject(subjectData);
        showToast(`Added ${subjectData.subject_code} to Batch ${subjectData.batch} curriculum.`, 'success');
      }
      setCurriculumSubjectModalOpen(false);
      setEditingCurriculumSubject(null);
      setCurriculumBatch(subjectData.batch);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save curriculum subject.', 'error');
    }
  };

  const handleDeleteCurriculumSubject = async (id, code, title) => {
    if (window.confirm(`Delete curriculum subject ${code} (${title})? This will not affect historical allotments.`)) {
      try {
        await coordinatorService.deleteCurriculumSubject(id);
        showToast(`Deleted ${code} from curriculum.`);
        loadAllData();
      } catch (err) {
        showToast(err.message || 'Failed to delete curriculum subject.', 'error');
      }
    }
  };


  // -------------------------------------------------------------
  // TAB 2: PE SELECTION DRIVE HANDLERS
  // -------------------------------------------------------------
  const handleSavePEDrive = async (driveData) => {
    try {
      await coordinatorService.createPESelectionWindow(driveData, coordinatorBranch);
      showToast(`PE Selection Drive configured in ${driveData.status} status!`, 'success');
      setPeDriveModalOpen(false);
      await loadAllData();

      if (resumeOfferingAfterDrive) {
        setOfferElectiveType('PE');
        setOfferElectiveDefaults({
          batch: driveData.batch || resumeOfferingAfterDrive.batch,
          semester: Number(driveData.semester || resumeOfferingAfterDrive.semester),
          elective_number: Number(resumeOfferingAfterDrive.elective_number || 1)
        });
        setOfferElectiveModalOpen(true);
        setResumeOfferingAfterDrive(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create PE Selection Drive.', 'error');
    }
  };

  const handleStartPEDrive = async (drive) => {
    const matchingSubjects = peSubjects.filter(s => 
      normalizeBatch(s.admitted_batch) === normalizeBatch(drive.batch) &&
      Number(s.semester) === Number(drive.semester)
    );

    if (matchingSubjects.length === 0) {
      showToast(`Cannot start PE Selection Drive for Batch ${drive.batch} (Sem ${drive.semester}). Please configure and offer subjects in Tab 3 (Add Subjects & Students) first.`, 'error');
      return;
    }

    try {
      await coordinatorService.startPESelectionWindow(drive.id);
      showToast(`PE Selection Drive STARTED and is now OPEN for students.`, 'success');
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to start drive.', 'error');
    }
  };

  const handleStopPEDrive = async (id, title) => {
    try {
      await coordinatorService.stopPESelectionWindow(id);
      showToast(`PE Selection Drive STOPPED / LOCKED for students.`);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to stop drive.', 'error');
    }
  };

  const handleDeletePEDrive = async (id, title) => {
    if (window.confirm(`Permanently delete this PE Selection Drive (${title})?`)) {
      try {
        await coordinatorService.deletePESelectionWindow(id);
        showToast('PE Selection Drive deleted successfully.');
        loadAllData();
      } catch (err) {
        showToast(err.message || 'Failed to delete drive.', 'error');
      }
    }
  };

  // -------------------------------------------------------------
  // TAB 3.1: PE OFFERING PIPELINE HANDLERS
  // -------------------------------------------------------------
  const availablePECurriculum = curriculumList.filter(c => {
    if (peOfferingBatch && normalizeBatch(c.batch) !== normalizeBatch(peOfferingBatch)) return false;
    if (Number(c.semester) !== Number(peOfferingSemester)) return false;
    if (c.elective_type !== 'PE') return false;
    if (Number(c.elective_number || 1) !== Number(peOfferingNumber)) return false;
    return true;
  });

  const handleTogglePECurriculumSelect = (currId) => {
    setPeSelectedCurriculumIds(prev =>
      prev.includes(currId) ? prev.filter(id => id !== currId) : [...prev, currId]
    );
  };

  const handlePESeatChange = (currId, seats) => {
    setPeCurriculumSeatMap(prev => ({ ...prev, [currId]: seats }));
  };

  const handleActivateSelectedPECurriculum = async () => {
    if (!isPEDriveEstablished) {
      showToast(`Cannot offer PE subjects. Please establish a PE Selection Drive for Batch ${peOfferingBatch} (Semester ${peOfferingSemester}) in Tab 2 first.`, 'error');
      return;
    }

    if (isPEDriveActive) {
      showToast(`Cannot offer or modify subjects while PE Selection Drive is ACTIVE for Batch ${peOfferingBatch} (Semester ${peOfferingSemester}). Please pause the drive in Tab 2 first.`, 'error');
      return;
    }

    if (peSelectedCurriculumIds.length === 0) {
      showToast('Please select at least one PE curriculum subject to offer.', 'error');
      return;
    }

    try {
      setPeActivatingLoading(true);
      const itemsToActivate = peSelectedCurriculumIds.map(currId => {
        const curr = curriculumList.find(c => c.id === currId);
        const rawSeat = peCurriculumSeatMap[currId];
        const seatVal = (rawSeat !== undefined && rawSeat !== '' && !isNaN(Number(rawSeat))) 
          ? Math.max(1, parseInt(rawSeat, 10)) 
          : 60;
        return {
          subject_code: curr.subject_code,
          subject_name: curr.subject_name,
          regulation: curr.regulation || 'AR23',
          seats: seatVal,
          offered_branches: [coordinatorBranch]
        };
      });

      await coordinatorService.activateSubjectsFromCurriculum({
        batch: normalizeBatch(peOfferingBatch),
        branch: coordinatorBranch,
        semester: Number(peOfferingSemester),
        elective_type: 'PE',
        elective_number: Number(peOfferingNumber),
        curriculumSubjects: itemsToActivate
      });

      showToast(`Activated ${itemsToActivate.length} subjects for Professional Elective ${peOfferingNumber} (PE-${peOfferingNumber})!`, 'success');
      setPeSelectedCurriculumIds([]);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to activate PE curriculum subjects.', 'error');
    } finally {
      setPeActivatingLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3.2: OE OFFERING PIPELINE HANDLERS
  // -------------------------------------------------------------
  const availableOECurriculum = curriculumList.filter(c => {
    if (oeOfferingBatch && normalizeBatch(c.batch) !== normalizeBatch(oeOfferingBatch)) return false;
    if (Number(c.semester) !== Number(oeOfferingSemester)) return false;
    if (c.elective_type !== 'OE') return false;
    if (Number(c.elective_number || 1) !== Number(oeOfferingNumber)) return false;
    return true;
  });

  const handleToggleOECurriculumSelect = (currId) => {
    setOeSelectedCurriculumIds(prev =>
      prev.includes(currId) ? prev.filter(id => id !== currId) : [...prev, currId]
    );
  };

  const handleOESeatChange = (currId, seats) => {
    setOeCurriculumSeatMap(prev => ({ ...prev, [currId]: seats }));
  };

  const handleOEBranchToggle = (currId, branch) => {
    setOeCurriculumBranchesMap(prev => {
      const currSubject = curriculumList.find(c => c.id === currId);
      const defaultBranches = Array.isArray(currSubject?.offered_branches) ? currSubject.offered_branches : ['ALL'];
      const current = prev[currId] || defaultBranches;
      let updated;
      if (branch === 'ALL') {
        updated = current.includes('ALL') ? [] : ['ALL'];
      } else {
        const withoutAll = current.filter(b => b !== 'ALL');
        updated = withoutAll.includes(branch)
          ? withoutAll.filter(b => b !== branch)
          : [...withoutAll, branch];
      }
      return { ...prev, [currId]: updated.length > 0 ? updated : ['ALL'] };
    });
  };

  const handleActivateSelectedOECurriculum = async () => {
    if (oeSelectedCurriculumIds.length === 0) {
      showToast('Please select at least one OE curriculum subject to offer.', 'error');
      return;
    }

    try {
      setOeActivatingLoading(true);
      const itemsToActivate = oeSelectedCurriculumIds.map(currId => {
        const curr = curriculumList.find(c => c.id === currId);
        const targetBranches = oeCurriculumBranchesMap[currId] || (curr?.offered_branches || ['ALL']);
        const rawSeat = oeCurriculumSeatMap[currId];
        const seatVal = (rawSeat !== undefined && rawSeat !== '' && !isNaN(Number(rawSeat))) 
          ? Math.max(1, parseInt(rawSeat, 10)) 
          : 60;
        return {
          subject_code: curr.subject_code,
          subject_name: curr.subject_name,
          regulation: curr.regulation || 'AR23',
          seats: seatVal,
          offered_branches: targetBranches
        };
      });

      await coordinatorService.activateSubjectsFromCurriculum({
        batch: normalizeBatch(oeOfferingBatch),
        branch: coordinatorBranch,
        semester: Number(oeOfferingSemester),
        elective_type: 'OE',
        elective_number: Number(oeOfferingNumber),
        curriculumSubjects: itemsToActivate
      });

      showToast(`Activated ${itemsToActivate.length} subjects for Open Elective ${oeOfferingNumber} (OE-${oeOfferingNumber})!`, 'success');
      setOeSelectedCurriculumIds([]);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to activate OE curriculum subjects.', 'error');
    } finally {
      setOeActivatingLoading(false);
    }
  };

  const handleActivateOfferingsFromModal = async (payload) => {
    try {
      await coordinatorService.activateSubjectsFromCurriculum({
        batch: normalizeBatch(payload.batch),
        branch: coordinatorBranch,
        semester: Number(payload.semester),
        elective_type: payload.elective_type,
        elective_number: Number(payload.elective_number),
        curriculumSubjects: payload.curriculumSubjects
      });

      showToast(`Activated ${payload.curriculumSubjects.length} subjects for ${payload.elective_type === 'PE' ? 'Professional' : 'Open'} Elective ${payload.elective_number} (Batch ${payload.batch}, Sem ${payload.semester})!`, 'success');
      setOfferElectiveModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to activate offerings.', 'error');
      throw err;
    }
  };

  const handleSaveSubject = async (subjectData) => {
    try {
      if (editingSubject) {
        const res = await coordinatorService.updateSubject(editingSubject.id, subjectData);
        if (res?.promotionsCount > 0) {
          showToast(`Subject updated! ${res.promotionsCount} student(s) automatically allotted / promoted in FIFO order.`, 'success');
        } else {
          showToast('Subject updated successfully.');
        }
      } else {
        await coordinatorService.addSubject(subjectData);
        showToast(`New ${subjectData.elective_type} subject added with ${subjectData.seats} seats.`);
      }
      setSubjectModalOpen(false);
      setEditingSubject(null);
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save subject.', 'error');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm('Are you sure you want to delete this offered subject? All associated student allotments will be cancelled.')) {
      await coordinatorService.deleteSubject(id);
      showToast('Offered subject deleted.');
      loadAllData();
    }
  };

  // Filtered active offered PE subjects
  const filteredPESubjects = peSubjects.filter(s => {
    if (peSubjectFilters.batch !== 'ALL' && normalizeBatch(s.admitted_batch) !== normalizeBatch(peSubjectFilters.batch)) return false;
    if (peSubjectFilters.semester !== 'ALL' && Number(s.semester) !== Number(peSubjectFilters.semester)) return false;
    if (peSubjectFilters.elective_number !== 'ALL' && Number(s.elective_number || 1) !== Number(peSubjectFilters.elective_number)) return false;
    if (peSubjectFilters.search) {
      const q = peSubjectFilters.search.toLowerCase().trim();
      const matchCode = s.subject_code?.toLowerCase().includes(q);
      const matchName = s.subject_name?.toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  // Filtered active offered OE subjects
  const filteredOESubjects = oeSubjects.filter(s => {
    if (oeSubjectFilters.batch !== 'ALL' && normalizeBatch(s.admitted_batch) !== normalizeBatch(oeSubjectFilters.batch)) return false;
    if (oeSubjectFilters.semester !== 'ALL' && Number(s.semester) !== Number(oeSubjectFilters.semester)) return false;
    if (oeSubjectFilters.elective_number !== 'ALL' && Number(s.elective_number || 1) !== Number(oeSubjectFilters.elective_number)) return false;
    if (oeSubjectFilters.search) {
      const q = oeSubjectFilters.search.toLowerCase().trim();
      const matchCode = s.subject_code?.toLowerCase().includes(q);
      const matchName = s.subject_name?.toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  // -------------------------------------------------------------
  // TAB 3: STUDENTS DRILLDOWN & CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveStudent = async (studentData) => {
    const result = await coordinatorService.addStudent({
      ...studentData,
      branch: coordinatorBranch
    });
    showToast(`Student ${studentData.name} enrolled successfully in Section ${studentData.section}.`);
    loadAllData();
    return result;
  };

  const handleBulkImportStudents = async (studentList) => {
    const result = await coordinatorService.bulkAddStudents(studentList);
    showToast(`Successfully enrolled ${studentList.length} students.`);
    loadAllData();
    return result;
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to remove this student? All preferences and allotments will be permanently deleted.')) {
      await coordinatorService.deleteStudent(id);
      setSelectedStudentIds(prev => prev.filter(sId => sId !== id));
      showToast('Student record deleted.');
      loadAllData();
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setEditStudentModalOpen(true);
  };

  const handleSaveEditStudent = async (studentId, updates) => {
    await coordinatorService.updateStudent(studentId, updates);
    showToast('Student details updated successfully.');
    loadAllData();
  };

  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllFiltered = (filteredList) => {
    const allIds = filteredList.map(s => s.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkUpdate = async (updates) => {
    if (selectedStudentIds.length === 0) return;
    await coordinatorService.bulkUpdateStudents(selectedStudentIds, updates);
    showToast(`Updated ${selectedStudentIds.length} student records.`);
    setSelectedStudentIds([]);
    loadAllData();
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    if (window.confirm(`Permanently delete all ${selectedStudentIds.length} selected student profiles and their records?`)) {
      await coordinatorService.bulkDeleteStudents(selectedStudentIds);
      showToast(`Deleted ${selectedStudentIds.length} student profiles.`);
      setSelectedStudentIds([]);
      loadAllData();
    }
  };

  const handleBulkInviteEmail = () => {
    if (selectedStudentIds.length === 0) return;
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    const emails = selectedStudents.map(s => s.email).filter(Boolean);
    const link = `${window.location.origin}${window.location.pathname}#/login?role=student`;
    navigator.clipboard.writeText(link);
    const subject = encodeURIComponent(`Invitation to Autonomous Elective Subject Selection — NSRIT Portal`);
    const body = encodeURIComponent(
`Dear Students,

You have been enrolled for Autonomous Elective Subject Selection (${coordinatorBranch} Department).

Please click the link below to sign in and prioritize your elective choices:
${link}

Important Login & Selection Instructions:
1. Login ID: Your registered email or Roll Number (e.g. 24NU1A0501)
2. Default Password: Your Roll Number (case-insensitive)
3. Allotments are calculated INSTANTLY upon submission in First-In, First-Out (FIFO) timestamp order.
4. Once submitted, your choices will be permanently locked.

Best regards,
Office of the Academic Coordinator (${coordinatorBranch})
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)`
    );
    window.open(`mailto:${emails[0] || ''}?bcc=${emails.slice(1).join(',')}&subject=${subject}&body=${body}`, '_blank');
    showToast(`Invitation memo opened for ${emails.length} students & login link copied!`);
  };

  const handleUnlockSelection = async (studentId, electiveType) => {
    const student = students.find(s => s.id === studentId);
    const studentEmail = student?.email || 'this student';

    if (window.confirm(`Reset and unlock ${electiveType || 'PE & OE'} selection for ${studentEmail}? The student will be able to log in and select preferences again.`)) {
      await coordinatorService.unlockStudentSelection(studentId, electiveType);
      showToast(`Selection unlocked for ${studentEmail}. Student can now re-select.`);
      loadAllData();
    }
  };

  // -------------------------------------------------------------
  // TAB 5: MANUAL OVERRIDE & PRINTING HANDLERS
  // -------------------------------------------------------------
  const handleSaveOverride = async ({ allotmentId, newSubjectId, reason }) => {
    await coordinatorService.manualUpdateAllotment({
      allotmentId,
      newSubjectId,
      reason,
      coordinatorId: currentUser?.id
    });
    showToast('Allotment override recorded with official audit log.');
    loadAllData();
  };

  const triggerPrint = async (type, customTitle, customSubtitle, specificFilters = null) => {
    const coordBranch = currentUser?.branch || 'CSE';
    let printFilters = {
      ...filters,
      coordinatorBranch: coordBranch,
      ...(specificFilters || {})
    };

    if (type === 'PE') {
      printFilters.elective_type = 'PE';
    } else if (type === 'OE') {
      printFilters.elective_type = 'OE';
    } else if (type === 'COMPLETE') {
      printFilters.elective_type = 'ALL';
    }

    const recordsToPrint = await coordinatorService.getAllotmentRecords(printFilters);

    setPrintConfig({
      reportType: type,
      title: customTitle,
      subtitle: customSubtitle,
      filters: printFilters,
      records: recordsToPrint
    });

    setTimeout(() => {
      window.print();
    }, 200);
  };

  const triggerSectionPrint = async () => {
    const coordBranch = currentUser?.branch || 'CSE';
    const selectedSubject = [...peSubjects, ...oeSubjects].find(s => s.id === filters.subject_id);
    const subjectText = selectedSubject ? ` — ${selectedSubject.subject_code} (${selectedSubject.subject_name})` : '';
    const secText = filters.section !== 'ALL' ? `Section ${filters.section}` : 'All Sections';
    const typeText = filters.elective_type !== 'ALL' 
      ? (filters.elective_type === 'PE' ? 'Professional Elective (PE)' : 'Open Elective (OE)')
      : 'Consolidated Electives (PE & OE)';
    
    await triggerPrint(
      filters.elective_type === 'ALL' ? 'COMPLETE' : filters.elective_type,
      `${coordBranch} Department ${typeText}${subjectText} Allotment Sheet`,
      `Offering Department: ${coordBranch} | ${secText}`,
      { ...filters, coordinatorBranch: coordBranch }
    );
  };

  // Derived sections for Tab 5 Allotments
  const availableAllotmentSections = Array.from(new Set([
    ...allotments
      .filter(a => {
        if (filters.batch !== 'ALL' && (a.admitted_batch || a.batch) && normalizeBatch(a.admitted_batch || a.batch) !== normalizeBatch(filters.batch)) return false;
        if (filters.student_branch !== 'ALL' && a.branch && a.branch !== filters.student_branch) return false;
        return true;
      })
      .map(a => a.section),
    ...students
      .filter(s => {
        if (filters.batch !== 'ALL' && s.admitted_batch && normalizeBatch(s.admitted_batch) !== normalizeBatch(filters.batch)) return false;
        if (filters.student_branch !== 'ALL' && s.branch && s.branch !== filters.student_branch) return false;
        return true;
      })
      .map(s => s.section)
  ].filter(Boolean))).sort();

  // -------------------------------------------------------------
  // TAB 4: ADVANCED REACTIVE LIVE ANALYTICS ENGINE
  // -------------------------------------------------------------
  const rawAnalyticsStudents = analytics?.rawStudents || students || [];
  const rawAnalyticsSubjects = useMemo(() => {
    const list = analytics?.rawSubjects || (analyticsElectiveType === 'PE' ? peSubjects : oeSubjects) || [];
    return list.filter(s => s.elective_type === analyticsElectiveType);
  }, [analytics, analyticsElectiveType, peSubjects, oeSubjects]);

  const rawAnalyticsPreferences = useMemo(() => {
    return (analytics?.rawPreferences || []).filter(p => p.elective_type === analyticsElectiveType);
  }, [analytics, analyticsElectiveType]);

  const rawAnalyticsAllotments = useMemo(() => {
    return (analytics?.rawAllotments || allotments || []).filter(a => a.elective_type === analyticsElectiveType);
  }, [analytics, allotments, analyticsElectiveType]);

  // Dynamic available sections & branches for Tab 4 filters
  const availableAnalyticsSections = useMemo(() => {
    const pool = rawAnalyticsStudents.filter(st => {
      if (analyticsElectiveType === 'PE' && st.branch && String(st.branch).trim().toUpperCase() !== String(coordinatorBranch).trim().toUpperCase()) return false;
      if (analyticsBatch !== 'ALL' && st.admitted_batch && normalizeBatch(st.admitted_batch) !== normalizeBatch(analyticsBatch)) return false;
      if (analyticsSemester !== 'ALL' && Number(st.semester) !== Number(analyticsSemester)) return false;
      return true;
    });
    const set = Array.from(new Set(pool.map(s => String(s.section || 'A').trim().toUpperCase()).filter(Boolean))).sort();
    return set.length > 0 ? set : ['A', 'B', 'C'];
  }, [rawAnalyticsStudents, analyticsElectiveType, coordinatorBranch, analyticsBatch, analyticsSemester]);

  const availableAnalyticsBranches = useMemo(() => {
    const pool = rawAnalyticsStudents.filter(st => {
      if (analyticsBatch !== 'ALL' && st.admitted_batch && normalizeBatch(st.admitted_batch) !== normalizeBatch(analyticsBatch)) return false;
      return true;
    });
    const set = Array.from(new Set(pool.map(s => String(s.branch || '').trim().toUpperCase()).filter(Boolean))).sort();
    return set.length > 0 ? set : ['ECE', 'MECH', 'CIVIL', 'EEE', 'AIML', 'IT'];
  }, [rawAnalyticsStudents, analyticsBatch]);

  // Filtered subjects
  const filteredAnalyticsSubjects = useMemo(() => {
    return rawAnalyticsSubjects.filter(sub => {
      if (analyticsBatch !== 'ALL' && sub.admitted_batch && normalizeBatch(sub.admitted_batch) !== normalizeBatch(analyticsBatch)) return false;
      if (analyticsSemester !== 'ALL' && Number(sub.semester) !== Number(analyticsSemester)) return false;
      if (analyticsElectiveNumber !== 'ALL' && Number(sub.elective_number) !== Number(analyticsElectiveNumber)) return false;
      if (analyticsSearch) {
        const q = analyticsSearch.toLowerCase().trim();
        const mCode = (sub.subject_code || '').toLowerCase().includes(q);
        const mName = (sub.subject_name || '').toLowerCase().includes(q);
        if (!mCode && !mName) return false;
      }
      return true;
    });
  }, [rawAnalyticsSubjects, analyticsBatch, analyticsSemester, analyticsElectiveNumber, analyticsSearch]);

  const activeSubjectIdSet = useMemo(() => new Set(filteredAnalyticsSubjects.map(s => s.id)), [filteredAnalyticsSubjects]);

  // Filtered student candidates pool
  const filteredAnalyticsStudents = useMemo(() => {
    return rawAnalyticsStudents.filter(st => {
      if (analyticsElectiveType === 'PE') {
        if (st.branch && String(st.branch).trim().toUpperCase() !== String(coordinatorBranch).trim().toUpperCase()) return false;
        if (analyticsSection !== 'ALL' && String(st.section || 'A').trim().toUpperCase() !== analyticsSection) return false;
      } else {
        if (analyticsBranch !== 'ALL' && String(st.branch || '').trim().toUpperCase() !== analyticsBranch) return false;
      }
      if (analyticsBatch !== 'ALL' && st.admitted_batch && normalizeBatch(st.admitted_batch) !== normalizeBatch(analyticsBatch)) return false;
      if (analyticsSemester !== 'ALL' && Number(st.semester) !== Number(analyticsSemester)) return false;
      return true;
    });
  }, [rawAnalyticsStudents, analyticsElectiveType, coordinatorBranch, analyticsSection, analyticsBranch, analyticsBatch, analyticsSemester]);

  const activeStudentIdSet = useMemo(() => new Set(filteredAnalyticsStudents.map(s => s.id)), [filteredAnalyticsStudents]);

  // Filtered preferences
  const filteredAnalyticsPreferences = useMemo(() => {
    return rawAnalyticsPreferences.filter(p => {
      if (!activeSubjectIdSet.has(p.subject_id)) return false;
      if (activeStudentIdSet.size > 0 && !activeStudentIdSet.has(p.student_id)) return false;
      return true;
    });
  }, [rawAnalyticsPreferences, activeSubjectIdSet, activeStudentIdSet]);

  // Filtered allotments
  const filteredAnalyticsAllotments = useMemo(() => {
    return rawAnalyticsAllotments.filter(a => {
      if (!activeSubjectIdSet.has(a.subject_id)) return false;
      if (activeStudentIdSet.size > 0 && !activeStudentIdSet.has(a.student_id)) return false;
      return true;
    });
  }, [rawAnalyticsAllotments, activeSubjectIdSet, activeStudentIdSet]);

  // High-level KPI metrics
  const totalTargetStudents = filteredAnalyticsStudents.length;
  const submittedStudentIds = useMemo(() => new Set(filteredAnalyticsPreferences.map(p => p.student_id)), [filteredAnalyticsPreferences]);
  const submittedStudentsCount = submittedStudentIds.size;
  const pendingStudentsCount = Math.max(0, totalTargetStudents - submittedStudentsCount);
  const totalConfiguredSeats = filteredAnalyticsSubjects.reduce((acc, s) => acc + Number(s.seats || 0), 0);
  const totalAllottedSeats = filteredAnalyticsAllotments.filter(a => a.status === 'ALLOTTED').length;
  const totalWaitlistedSeats = filteredAnalyticsAllotments.filter(a => a.status === 'WAITLISTED').length;
  const totalVacanciesRemaining = Math.max(0, totalConfiguredSeats - totalAllottedSeats);
  const overallSubmissionRate = totalTargetStudents > 0 ? Math.round((submittedStudentsCount / totalTargetStudents) * 100) : 0;
  const overallOccupancyRate = totalConfiguredSeats > 0 ? Math.round((totalAllottedSeats / totalConfiguredSeats) * 100) : 0;

  // Active Section-Wise Submission Tracker Data
  const sectionTrackerData = useMemo(() => {
    return availableAnalyticsSections.map(sec => {
      const secStudents = filteredAnalyticsStudents.filter(s => String(s.section || 'A').trim().toUpperCase() === sec);
      const secStudentIds = new Set(secStudents.map(s => s.id));
      const secSubmitted = secStudents.filter(s => submittedStudentIds.has(s.id));
      const secPending = secStudents.filter(s => !submittedStudentIds.has(s.id));
      
      const secAllots = filteredAnalyticsAllotments.filter(a => secStudentIds.has(a.student_id) || String(a.section || 'A').trim().toUpperCase() === sec);
      const allottedCount = secAllots.filter(a => a.status === 'ALLOTTED').length;
      const waitlistedCount = secAllots.filter(a => a.status === 'WAITLISTED').length;
      const rate = secStudents.length > 0 ? Math.round((secSubmitted.length / secStudents.length) * 100) : 0;

      return {
        section: sec,
        name: `Section ${sec}`,
        enrolled: secStudents.length,
        submitted: secSubmitted.length,
        pending: secPending.length,
        allotted: allottedCount,
        waitlisted: waitlistedCount,
        rate,
        pendingList: secPending,
        submittedList: secSubmitted
      };
    });
  }, [availableAnalyticsSections, filteredAnalyticsStudents, submittedStudentIds, filteredAnalyticsAllotments]);

  // Open Elective Outside Participating Branch Tracker Data (for OE)
  const oeBranchTrackerData = useMemo(() => {
    return availableAnalyticsBranches.map(br => {
      const brStudents = filteredAnalyticsStudents.filter(s => String(s.branch || '').trim().toUpperCase() === br);
      const brStudentIds = new Set(brStudents.map(s => s.id));
      const brPrefs = filteredAnalyticsPreferences.filter(p => brStudentIds.has(p.student_id) || String(p.branch || '').trim().toUpperCase() === br);
      const applicantIds = new Set(brPrefs.map(p => p.student_id));
      const p1Count = brPrefs.filter(p => p.priority === 1).length;

      const brAllots = filteredAnalyticsAllotments.filter(a => brStudentIds.has(a.student_id) || String(a.branch || '').trim().toUpperCase() === br);
      const allottedCount = brAllots.filter(a => a.status === 'ALLOTTED').length;
      const waitlistedCount = brAllots.filter(a => a.status === 'WAITLISTED').length;
      const rate = brStudents.length > 0 ? Math.round((applicantIds.size / brStudents.length) * 100) : 0;

      return {
        branch: br,
        name: br,
        enrolled: brStudents.length,
        applicants: applicantIds.size,
        p1Choices: p1Count,
        allotted: allottedCount,
        waitlisted: waitlistedCount,
        rate
      };
    }).filter(b => b.enrolled > 0 || b.applicants > 0 || b.allotted > 0);
  }, [availableAnalyticsBranches, filteredAnalyticsStudents, filteredAnalyticsPreferences, filteredAnalyticsAllotments]);

  // Subject Intelligence with Section Breakdown
  const subjectAnalyticsData = useMemo(() => {
    return filteredAnalyticsSubjects.map(subj => {
      const subjPrefs = filteredAnalyticsPreferences.filter(p => p.subject_id === subj.id);
      const p1Count = subjPrefs.filter(p => p.priority === 1).length;
      const p2Count = subjPrefs.filter(p => p.priority === 2).length;
      const p3Count = subjPrefs.filter(p => p.priority === 3).length;
      const pOtherCount = subjPrefs.filter(p => p.priority > 3).length;
      const totalDemand = subjPrefs.length;

      const subjAllots = filteredAnalyticsAllotments.filter(a => a.subject_id === subj.id);
      const allotted = subjAllots.filter(a => a.status === 'ALLOTTED').length;
      const waitlisted = subjAllots.filter(a => a.status === 'WAITLISTED').length;
      const seats = Number(subj.seats || 0);
      const remaining = Math.max(0, seats - allotted);
      const occupancy = seats > 0 ? Math.round((allotted / seats) * 100) : 0;

      // Section breakdown
      const sectionStats = {};
      availableAnalyticsSections.forEach(sec => {
        sectionStats[sec] = { section: sec, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
      });

      subjPrefs.forEach(p => {
        const sec = String(p.section || 'A').trim().toUpperCase();
        if (!sectionStats[sec]) {
          sectionStats[sec] = { section: sec, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
        }
        sectionStats[sec].total += 1;
        if (p.priority === 1) sectionStats[sec].p1 += 1;
        else if (p.priority === 2) sectionStats[sec].p2 += 1;
        else if (p.priority === 3) sectionStats[sec].p3 += 1;
        else sectionStats[sec].pOther += 1;

        sectionStats[sec].students.push(p);
      });

      subjAllots.forEach(a => {
        const sec = String(a.section || 'A').trim().toUpperCase();
        if (!sectionStats[sec]) {
          sectionStats[sec] = { section: sec, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
        }
        if (a.status === 'ALLOTTED') sectionStats[sec].allotted += 1;
        if (a.status === 'WAITLISTED') sectionStats[sec].waitlisted += 1;
      });

      // Branch breakdown (for OE)
      const branchStats = {};
      availableAnalyticsBranches.forEach(br => {
        branchStats[br] = { branch: br, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
      });

      subjPrefs.forEach(p => {
        const br = String(p.branch || 'OTHER').trim().toUpperCase();
        if (!branchStats[br]) {
          branchStats[br] = { branch: br, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
        }
        branchStats[br].total += 1;
        if (p.priority === 1) branchStats[br].p1 += 1;
        else if (p.priority === 2) branchStats[br].p2 += 1;
        else if (p.priority === 3) branchStats[br].p3 += 1;
        else branchStats[br].pOther += 1;
        branchStats[br].students.push(p);
      });

      subjAllots.forEach(a => {
        const br = String(a.branch || 'OTHER').trim().toUpperCase();
        if (!branchStats[br]) {
          branchStats[br] = { branch: br, total: 0, p1: 0, p2: 0, p3: 0, pOther: 0, allotted: 0, waitlisted: 0, students: [] };
        }
        if (a.status === 'ALLOTTED') branchStats[br].allotted += 1;
        if (a.status === 'WAITLISTED') branchStats[br].waitlisted += 1;
      });

      // Full applicant roster
      const applicantsRoster = subjPrefs.map(p => {
        const allot = subjAllots.find(a => a.student_id === p.student_id);
        return {
          student_id: p.student_id,
          name: p.student_name,
          roll_number: p.roll_number,
          email: p.student_email,
          branch: p.branch,
          section: p.section,
          priority: p.priority,
          submitted_at: p.submitted_at,
          status: allot?.status || 'PENDING'
        };
      }).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
      });

      return {
        id: subj.id,
        code: subj.subject_code,
        name: subj.subject_name,
        branch: subj.branch,
        semester: subj.semester,
        admitted_batch: subj.admitted_batch,
        elective_number: subj.elective_number,
        seats,
        allotted,
        waitlisted,
        remaining,
        occupancy,
        p1Count,
        p2Count,
        p3Count,
        pOtherCount,
        totalDemand,
        sectionStats,
        branchStats,
        applicantsRoster
      };
    });
  }, [filteredAnalyticsSubjects, filteredAnalyticsPreferences, filteredAnalyticsAllotments, availableAnalyticsSections, availableAnalyticsBranches]);

  // Chart 1: Subject Demand vs Capacity Comparison Data
  const subjectChartData = useMemo(() => {
    return subjectAnalyticsData.map(s => ({
      name: s.code,
      fullName: s.name,
      seats: s.seats,
      p1: s.p1Count,
      totalDemand: s.totalDemand,
      allotted: s.allotted
    }));
  }, [subjectAnalyticsData]);

  // Chart 2: Section/Branch Choice Distribution Data
  const comparativeStatsData = useMemo(() => {
    if (analyticsElectiveType === 'PE') {
      return sectionTrackerData.map(sec => ({
        branch: `Sec ${sec.section}`,
        enrolled: sec.enrolled,
        submitted: sec.submitted,
        allotted: sec.allotted,
        waitlisted: sec.waitlisted
      }));
    } else {
      return oeBranchTrackerData.map(br => ({
        branch: br.branch,
        enrolled: br.enrolled,
        submitted: br.applicants,
        allotted: br.allotted,
        waitlisted: br.waitlisted
      }));
    }
  }, [analyticsElectiveType, sectionTrackerData, oeBranchTrackerData]);

  // Chart 3: Candidate Pool Share
  const candidatePoolData = useMemo(() => {
    if (analyticsElectiveType === 'PE') {
      const data = sectionTrackerData.map(sec => ({
        name: `Section ${sec.section}`,
        value: sec.enrolled
      })).filter(s => s.value > 0);
      return data.length > 0 ? data : [{ name: 'Section A', value: 0 }];
    } else {
      const data = oeBranchTrackerData.map(br => ({
        name: br.branch,
        value: br.applicants || br.enrolled
      })).filter(b => b.value > 0);
      return data.length > 0 ? data : [{ name: 'All Branches', value: 0 }];
    }
  }, [analyticsElectiveType, sectionTrackerData, oeBranchTrackerData]);

  // Copy helper
  const copyToClipboard = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAnalyticsNotice(`Copied ${label} to clipboard!`);
      setTimeout(() => setCopiedAnalyticsNotice(''), 3000);
      showToast(`Copied ${label} to clipboard!`, 'success');
    }
  };

  // CSV Export for Live Analytics Summary
  const exportAnalyticsCSV = () => {
    try {
      const headers = ['Subject Code', 'Subject Title', 'Elective Type', 'Elective No', 'Offered Sem', 'Batch', 'Configured Seats', 'Allotted Seats', 'Remaining Vacancies', 'Total Demand', 'P1 Choices', 'P2 Choices', 'P3 Choices'];
      availableAnalyticsSections.forEach(sec => {
        headers.push(`Sec ${sec} Choices`, `Sec ${sec} Allotted`);
      });
      if (analyticsElectiveType === 'OE') {
        availableAnalyticsBranches.forEach(br => {
          headers.push(`${br} Choices`, `${br} Allotted`);
        });
      }

      const rows = subjectAnalyticsData.map(s => {
        const row = [
          `"${s.code}"`,
          `"${s.name}"`,
          s.branch,
          s.elective_number,
          s.semester,
          s.admitted_batch,
          s.seats,
          s.allotted,
          s.remaining,
          s.totalDemand,
          s.p1Count,
          s.p2Count,
          s.p3Count
        ];
        availableAnalyticsSections.forEach(sec => {
          const st = s.sectionStats[sec] || { total: 0, allotted: 0 };
          row.push(st.total, st.allotted);
        });
        if (analyticsElectiveType === 'OE') {
          availableAnalyticsBranches.forEach(br => {
            const bt = s.branchStats[br] || { total: 0, allotted: 0 };
            row.push(bt.total, bt.allotted);
          });
        }
        return row.join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${coordinatorBranch}_${analyticsElectiveType}_Analytics_${analyticsBatch}_Sem${analyticsSemester}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Analytics CSV exported successfully!', 'success');
    } catch (e) {
      console.error('Export CSV error:', e);
      showToast('Failed to export CSV', 'error');
    }
  };

  // Student Directory filtered list for Tab 3 Step 3
  const activeDirectoryStudents = students.filter(st => {
    if (drilldownBatch && normalizeBatch(st.admitted_batch) !== normalizeBatch(drilldownBatch)) return false;
    if (drilldownSection && (st.section || 'A') !== drilldownSection) return false;
    if (studentDirectoryRegulation !== 'ALL' && (st.regulation || 'AR23') !== studentDirectoryRegulation) return false;
    if (studentDirectorySearch) {
      const q = studentDirectorySearch.toLowerCase().trim();
      return st.name?.toLowerCase().includes(q) || 
             st.email?.toLowerCase().includes(q) || 
             st.roll_number?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* ========================================================================= */}
      {/* 1. PORTAL HEADER: FULL WIDTH LEFT-TO-RIGHT BANNER WITH 5 TABS BELOW */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6 no-print">
        {/* Left-to-right title banner */}
        <div className="border-b border-gray-100 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Office • {coordinatorBranch} Department Coordinator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display tracking-tight">
            Elective System Management & Allotment
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
            Manage batch curriculum catalogs, student directories, PE & OE offerings, and monitor real-time FIFO allotments.
          </p>
        </div>

        {/* 5 Distinct Navigation Tabs Horizontally Placed Below Header */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Tab 1: Curriculum & Students */}
          <button
            onClick={() => setActiveTab('CURRICULUM')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CURRICULUM'
                ? 'bg-crimson-700 text-white shadow-md shadow-crimson-700/20 font-extrabold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Curriculum & Students</span>
          </button>

          {/* Tab 2: PE Drive Control */}
          <button
            onClick={() => setActiveTab('PE_DRIVES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PE_DRIVES'
                ? 'bg-crimson-700 text-white shadow-md shadow-crimson-700/20 font-extrabold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. PE Drive Control ({peDrives.length})</span>
          </button>

          {/* Tab 3: Elective Offerings */}
          <button
            onClick={() => setActiveTab('OFFERINGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'OFFERINGS' || activeTab === 'SUBJECTS_STUDENTS'
                ? 'bg-crimson-700 text-white shadow-md shadow-crimson-700/20 font-extrabold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>3. Elective Offerings ({peSubjects.length + oeSubjects.length})</span>
          </button>

          {/* Tab 4: Live Analytics */}
          <button
            onClick={() => setActiveTab('ANALYZE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ANALYZE'
                ? 'bg-crimson-700 text-white shadow-md shadow-crimson-700/20 font-extrabold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>4. Live Analytics</span>
          </button>

          {/* Tab 5: Allotments & Printing */}
          <button
            onClick={() => setActiveTab('CHANGE_PRINT')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CHANGE_PRINT'
                ? 'bg-crimson-700 text-white shadow-md shadow-crimson-700/20 font-extrabold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>5. Allotments & Printing ({allotments.length})</span>
          </button>

          {/* Live Refresh */}
          <button
            onClick={loadAllData}
            className="ml-auto p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
            title="Refresh Portal Data"
          >
            <RefreshCw className={`w-4 h-4 text-crimson-700 ${loading ? 'animate-spin' : ''}`} />
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CURRICULUM & STUDENTS */}
      {/* ========================================================================= */}
      {activeTab === 'CURRICULUM' && (
        <div className="space-y-6 no-print">
          
          {/* Sub Navigation Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCurriculumSubTab('CURRICULUM_CATALOG')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  curriculumSubTab === 'CURRICULUM_CATALOG' 
                    ? 'bg-crimson-700 text-white shadow-sm font-extrabold' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>1. Master Curriculum Catalog ({curriculumList.length})</span>
              </button>

              <button
                onClick={() => setCurriculumSubTab('STUDENTS_DIRECTORY')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  curriculumSubTab === 'STUDENTS_DIRECTORY' 
                    ? 'bg-crimson-700 text-white shadow-sm font-extrabold' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>2. Students Directory & Enrollment ({students.length})</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SUB-TAB 1.1: MASTER CURRICULUM CATALOG */}
          {/* ------------------------------------------------------------- */}
          {curriculumSubTab === 'CURRICULUM_CATALOG' && (
            <div className="space-y-6">
              
              {/* Top Curriculum Toolbar */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson-50 text-crimson-800 border border-crimson-200">
                      {coordinatorBranch} Academic Curriculum
                    </span>
                    <span className="text-xs text-gray-500">• Semester 5 to 8 Master Course Catalog</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 font-display mt-1">
                    Batch Curriculum Master Catalog
                  </h2>
                  <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
                    Upload the official batch curriculum once via Excel. When offering subjects in Tab 3, simply pick the elective course and select from this master syllabus.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                  {/* Download Template */}
                  <button
                    onClick={() => coordinatorService.exportCurriculumTemplate(curriculumBatch || 'BATCH-TEMPLATE', coordinatorBranch)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Download formatted Excel template for curriculum"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Download Sample Template</span>
                  </button>

                  {/* Upload Excel */}
                  <button
                    onClick={() => setCurriculumUploadModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Curriculum Excel</span>
                  </button>

                  {/* Add Single Subject */}
                  <button
                    onClick={() => {
                      setEditingCurriculumSubject(null);
                      setCurriculumSubjectModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-purple-300 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-700" />
                    <span>Add Single Subject</span>
                  </button>
                </div>
              </div>

              {/* Batch Curriculum Summary Cards Grid with Interactive Accordion */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 font-display flex items-center gap-2">
                    <Layers className="w-4 h-4 text-crimson-700" />
                    <span>Registered Academic Batches ({curriculumSummaries.length})</span>
                  </h3>
                  <span className="text-[11px] text-gray-500">Click any batch card to expand syllabus courses, search, or edit subjects</span>
                </div>

                {curriculumSummaries.length > 0 ? (
                  <div className="space-y-4">
                    {curriculumSummaries.map((sum) => {
                      const isExpanded = !!expandedCurriculumBatchKeys[sum.batch];
                      const allBatchSubjects = (sum.subjects && sum.subjects.length > 0)
                        ? sum.subjects
                        : curriculumList.filter(c => normalizeBatch(c.batch) === normalizeBatch(sum.batch));
                      
                      const bFilters = getBatchFilters(sum.batch);
                      const filteredBatchSubjects = allBatchSubjects.filter(c => {
                        if (bFilters.semester !== 'ALL' && Number(c.semester) !== Number(bFilters.semester)) return false;
                        if (bFilters.elective_type !== 'ALL' && c.elective_type !== bFilters.elective_type) return false;
                        if (bFilters.elective_number !== 'ALL' && Number(c.elective_number || 1) !== Number(bFilters.elective_number)) return false;
                        if (bFilters.search) {
                          const q = bFilters.search.toLowerCase().trim();
                          const matchCode = c.subject_code?.toLowerCase().includes(q);
                          const matchName = c.subject_name?.toLowerCase().includes(q);
                          return matchCode || matchName;
                        }
                        return true;
                      });

                      return (
                        <div
                          key={sum.batch}
                          className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-2xs ${
                            isExpanded 
                              ? 'border-crimson-600 ring-2 ring-crimson-600/20 shadow-md' 
                              : 'border-gray-200 hover:border-crimson-300'
                          }`}
                        >
                          {/* Card Header (Clickable Accordion) */}
                          <div
                            onClick={() => {
                              setCurriculumBatch(sum.batch);
                              toggleCurriculumBatchKey(sum.batch);
                            }}
                            className="p-5 bg-gradient-to-r from-gray-50 via-white to-gray-50/50 hover:from-crimson-50/30 hover:via-white cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 rounded-xl bg-crimson-700 text-white font-mono font-black text-xs shadow-xs">
                                {sum.regulation || 'AR23'}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-base font-black text-gray-900 font-mono">
                                    Batch {sum.batch} Curriculum
                                  </h4>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-crimson-50 text-crimson-800 border border-crimson-200">
                                    {allBatchSubjects.length} Syllabus Courses
                                  </span>
                                </div>
                                <span className="text-[11px] text-gray-500">
                                  Department of {coordinatorBranch} • Semesters: {sum.semesters.map(s => `Sem ${s}`).join(', ') || 'N/A'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800">
                                {sum.peCount} Professional (PE)
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
                                {sum.oeCount} Open (OE)
                              </span>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurriculumBatch(sum.batch);
                                  toggleCurriculumBatchKey(sum.batch);
                                }}
                                className="ml-1 px-3 py-1.5 rounded-xl bg-white hover:bg-crimson-50 border border-gray-300 text-xs font-bold text-gray-700 hover:text-crimson-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <span>{isExpanded ? 'Hide Courses' : `View & Edit Courses (${allBatchSubjects.length})`}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-crimson-700" /> : <ChevronDown className="w-4 h-4 text-crimson-700" />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable In-Card Filter Bar & Courses Table */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-white">
                              
                              {/* In-Card Search & Filter Bar */}
                              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-700">Filter Batch {sum.batch} Courses:</span>
                                  <span className="text-[11px] text-gray-500">
                                    ({filteredBatchSubjects.length} of {allBatchSubjects.length} visible)
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="relative w-44">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      placeholder="Search code / name..."
                                      value={bFilters.search}
                                      onChange={(e) => setBatchFilter(sum.batch, 'search', e.target.value)}
                                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-300 text-xs bg-white"
                                    />
                                  </div>

                                  <select
                                    value={bFilters.semester}
                                    onChange={(e) => setBatchFilter(sum.batch, 'semester', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold bg-white text-gray-800"
                                  >
                                    <option value="ALL">All Semesters</option>
                                    {[5, 6, 7, 8, 1, 2, 3, 4].map(s => (
                                      <option key={s} value={s}>Semester {s}</option>
                                    ))}
                                  </select>

                                  <select
                                    value={bFilters.elective_type}
                                    onChange={(e) => setBatchFilter(sum.batch, 'elective_type', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800"
                                  >
                                    <option value="ALL">All Types (PE & OE)</option>
                                    <option value="PE">Professional Elective (PE)</option>
                                    <option value="OE">Open Elective (OE)</option>
                                  </select>

                                  <select
                                    value={bFilters.elective_number}
                                    onChange={(e) => setBatchFilter(sum.batch, 'elective_number', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900"
                                  >
                                    <option value="ALL">All Elective Numbers</option>
                                    {bFilters.elective_type === 'PE' ? (
                                      <>
                                        <option value="1">PE-1</option>
                                        <option value="2">PE-2</option>
                                        <option value="3">PE-3</option>
                                        <option value="4">PE-4</option>
                                        <option value="5">PE-5</option>
                                        <option value="6">PE-6</option>
                                        <option value="7">PE-7</option>
                                        <option value="8">PE-8</option>
                                      </>
                                    ) : bFilters.elective_type === 'OE' ? (
                                      <>
                                        <option value="1">OE-1</option>
                                        <option value="2">OE-2</option>
                                        <option value="3">OE-3</option>
                                        <option value="4">OE-4</option>
                                        <option value="5">OE-5</option>
                                        <option value="6">OE-6</option>
                                        <option value="7">OE-7</option>
                                        <option value="8">OE-8</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="1">Elective 1</option>
                                        <option value="2">Elective 2</option>
                                        <option value="3">Elective 3</option>
                                        <option value="4">Elective 4</option>
                                        <option value="5">Elective 5</option>
                                        <option value="6">Elective 6</option>
                                        <option value="7">Elective 7</option>
                                        <option value="8">Elective 8</option>
                                      </>
                                    )}
                                  </select>

                                  {(bFilters.search || bFilters.semester !== 'ALL' || bFilters.elective_type !== 'ALL' || bFilters.elective_number !== 'ALL') && (
                                    <button
                                      type="button"
                                      onClick={() => setBatchFiltersMap(prev => ({
                                        ...prev,
                                        [sum.batch]: { semester: 'ALL', elective_type: 'ALL', elective_number: 'ALL', search: '' }
                                      }))}
                                      className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
                                      title="Reset Filters"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Reset Filters</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                                    <tr>
                                      <th className="px-5 py-3">Elective</th>
                                      <th className="px-5 py-3">Subject Code</th>
                                      <th className="px-5 py-3">Subject Title</th>
                                      <th className="px-5 py-3 text-center">Semester</th>
                                      <th className="px-5 py-3 text-center">Category</th>
                                      <th className="px-5 py-3 text-center">Regulation</th>
                                      <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {filteredBatchSubjects.map((c) => (
                                      <tr key={c.id} className="hover:bg-crimson-50/20 transition-colors">
                                        <td className="px-5 py-3.5">
                                          <span className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-[10px] ${
                                            c.elective_type === 'PE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                          }`}>
                                            {c.elective_type}-{c.elective_number || 1}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono font-bold text-crimson-700">{c.subject_code}</td>
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">{c.subject_name}</td>
                                        <td className="px-5 py-3.5 text-center font-bold text-gray-700">Semester {c.semester}</td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            c.elective_type === 'PE' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                          }`}>
                                            {c.elective_type === 'PE' ? 'Professional (PE)' : 'Open (OE)'}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center font-mono font-bold text-gray-600">
                                          {c.regulation || 'AR23'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right space-x-1.5">
                                          <button
                                            onClick={() => {
                                              setCurriculumBatch(sum.batch);
                                              setEditingCurriculumSubject(c);
                                              setCurriculumSubjectModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 text-xs font-bold text-crimson-700 bg-crimson-50 hover:bg-crimson-100 border border-crimson-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                                            title="Edit Curriculum Subject"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteCurriculumSubject(c.id, c.subject_code, c.subject_name)}
                                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Subject from Curriculum"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}

                                    {filteredBatchSubjects.length === 0 && (
                                      <tr>
                                        <td colSpan="7" className="py-8 text-center text-gray-400">
                                          No subjects match the selected filters for Batch {sum.batch}.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Batch Card Footer with Quick Add */}
                              <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[11px] text-gray-500 font-medium">
                                  Syllabus Catalog for Batch {sum.batch} ({filteredBatchSubjects.length} of {allBatchSubjects.length} Courses shown)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurriculumBatch(sum.batch);
                                    setEditingCurriculumSubject(null);
                                    setCurriculumSubjectModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-crimson-50 border border-gray-300 text-crimson-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Course to Batch {sum.batch}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-1">
                    <p className="text-xs font-bold text-gray-700">No Batches Added to Curriculum Yet</p>
                    <p className="text-[11px] text-gray-500">Upload a curriculum Excel file above to register academic batches.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUB-TAB 1.2: STUDENTS DIRECTORY (BATCH -> SECTION DRILLDOWN CARDS) */}
          {/* ------------------------------------------------------------- */}
          {curriculumSubTab === 'STUDENTS_DIRECTORY' && (
            <div className="space-y-6">
              
              {/* Breadcrumbs Toolbar */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <button
                    onClick={() => {
                      setDrilldownBatch(null);
                      setDrilldownSection(null);
                    }}
                    className={`font-bold transition-colors ${
                      !drilldownBatch ? 'text-crimson-700 font-display' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    All Batches ({students.length} Students)
                  </button>

                  {drilldownBatch && (
                    <>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <button
                        onClick={() => setDrilldownSection(null)}
                        className={`font-bold transition-colors ${
                          !drilldownSection ? 'text-crimson-700 font-display' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Batch {drilldownBatch}
                      </button>
                    </>
                  )}

                  {drilldownSection && (
                    <>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <span className="font-bold text-crimson-700 font-display">
                        Section {drilldownSection}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportStudentsModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Import Excel / CSV Roster</span>
                  </button>
                  <button
                    onClick={() => setAddStudentModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Enroll Single Student</span>
                  </button>
                </div>
              </div>

              {/* STEP 1: BATCH CARDS GRID */}
              {!drilldownBatch && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 font-display">
                      Select an Academic Batch to View Sections ({coordinatorBranch})
                    </h3>
                    <span className="text-xs text-gray-500">
                      {availableBatches.length} Batches Active
                    </span>
                  </div>

                  {availableBatches.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {availableBatches.map(b => {
                        const batchStudents = students.filter(s => normalizeBatch(s.admitted_batch) === normalizeBatch(b));
                        const sections = Array.from(new Set(batchStudents.map(s => s.section || 'A'))).sort();
                        const peSubmitted = batchStudents.filter(s => s.hasSubmittedPE).length;

                        return (
                          <div
                            key={b}
                            onClick={() => setDrilldownBatch(b)}
                            className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card hover:shadow-xl hover:border-crimson-300 transition-all cursor-pointer group space-y-4 relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-crimson-50 text-crimson-800 border border-crimson-200 font-mono">
                                Batch {b}
                              </span>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-crimson-600 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div>
                              <div className="text-3xl font-black text-gray-900 font-display">
                                {batchStudents.length}
                              </div>
                              <span className="text-xs text-gray-500">Enrolled {coordinatorBranch} Students</span>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">
                                {sections.length} Section{sections.length > 1 ? 's' : ''} ({sections.map(s => `Sec ${s}`).join(', ') || 'None'})
                              </span>
                              <span className="text-emerald-700 font-bold">
                                {peSubmitted} / {batchStudents.length} Submitted
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
                      <Users className="w-12 h-12 text-gray-300 mx-auto" />
                      <h4 className="text-base font-bold text-gray-800">No Batches or Students Added Yet</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Click <strong>Import Excel / CSV Roster</strong> to upload your student enrollment list, or click <strong>Enroll Single Student</strong> to add individual students.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SECTION CARDS GRID */}
              {drilldownBatch && !drilldownSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 font-display">
                        Sections for Batch {drilldownBatch} ({coordinatorBranch})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Click on a class section to view or manage enrolled student profiles.
                      </p>
                    </div>
                    <button
                      onClick={() => setDrilldownBatch(null)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Batches</span>
                    </button>
                  </div>

                  {(() => {
                    const batchStudents = students.filter(s => normalizeBatch(s.admitted_batch) === normalizeBatch(drilldownBatch));
                    const sections = Array.from(new Set(batchStudents.map(s => s.section || 'A'))).sort();

                    return (
                      <>
                        {sections.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {sections.map(sec => {
                              const secStudents = batchStudents.filter(s => (s.section || 'A') === sec);
                              const peSubmitted = secStudents.filter(s => s.hasSubmittedPE).length;

                              return (
                                <div
                                  key={sec}
                                  onClick={() => setDrilldownSection(sec)}
                                  className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer group space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                      Section {sec}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                                  </div>

                                  <div>
                                    <div className="text-3xl font-black text-gray-900 font-display">
                                      {secStudents.length}
                                    </div>
                                    <span className="text-xs text-gray-500">Enrolled Students</span>
                                  </div>

                                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Batch {drilldownBatch}</span>
                                    <span className="text-emerald-700 font-bold">
                                      {peSubmitted} Submitted
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
                            <Users className="w-12 h-12 text-gray-300 mx-auto" />
                            <h4 className="text-base font-bold text-gray-800">No Students Enrolled in Batch {drilldownBatch}</h4>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                              Click <strong>Import Excel / CSV Roster</strong> above to add student records for this batch.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* STEP 3: ENROLLED STUDENT ROSTER FOR BATCH & SECTION */}
              {drilldownBatch && drilldownSection && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden space-y-4">
                  
                  {/* Table Toolbar */}
                  <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDrilldownSection(null)}
                          className="text-xs font-bold text-crimson-700 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Sections</span>
                        </button>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-bold text-gray-700">
                          Batch {drilldownBatch} • Section {drilldownSection}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 font-display mt-1">
                        Students List — Section {drilldownSection} ({activeDirectoryStudents.length} Students)
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative w-48">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search name, roll, email..."
                          value={studentDirectorySearch}
                          onChange={(e) => setStudentDirectorySearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-300 text-xs"
                        />
                      </div>

                      <select
                        value={studentDirectoryRegulation}
                        onChange={(e) => setStudentDirectoryRegulation(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                      >
                        <option value="ALL">All Regulations</option>
                        <option value="AR23">AR23</option>
                        <option value="AR26">AR26</option>
                        <option value="AR20">AR20</option>
                        <option value="AR21">AR21</option>
                      </select>

                      {(studentDirectorySearch || studentDirectoryRegulation !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentDirectorySearch('');
                            setStudentDirectoryRegulation('ALL');
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
                          title="Reset Filters"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sticky Bulk Actions Bar */}
                  {selectedStudentIds.length > 0 && (
                    <div className="mx-5 my-2 p-4 bg-gray-900 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-gray-800 animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-crimson-600 text-white font-black text-xs flex items-center justify-center">
                          {selectedStudentIds.length}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
                          </h4>
                          <p className="text-[10px] text-gray-400">
                            Apply bulk operations across selected profiles
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setBulkEditModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
                        >
                          <Layers className="w-3.5 h-3.5 text-crimson-400" />
                          <span>Bulk Edit (Sem / Sec / Reg)</span>
                        </button>

                        <button
                          onClick={handleBulkInviteEmail}
                          className="px-3.5 py-1.5 rounded-xl bg-crimson-700 hover:bg-crimson-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Invite via Email ({selectedStudentIds.length})</span>
                        </button>

                        <button
                          onClick={handleBulkDelete}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Selected</span>
                        </button>

                        <button
                          onClick={() => setSelectedStudentIds([])}
                          className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Student Roster Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-3 py-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={activeDirectoryStudents.length > 0 && activeDirectoryStudents.every(s => selectedStudentIds.includes(s.id))}
                              onChange={() => handleSelectAllFiltered(activeDirectoryStudents)}
                              className="w-4 h-4 rounded border-gray-300 text-crimson-600 focus:ring-crimson-500 cursor-pointer"
                              title="Select / Deselect all filtered students"
                            />
                          </th>
                          <th className="px-4 py-3">College Email (Login ID)</th>
                          <th className="px-4 py-3">Roll Number</th>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Regulation</th>
                          <th className="px-4 py-3">Branch & Sec</th>
                          <th className="px-4 py-3">Semester</th>
                          <th className="px-4 py-3 text-center">PE Status</th>
                          <th className="px-4 py-3 text-center">OE Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeDirectoryStudents.map((st) => {
                          const isSelected = selectedStudentIds.includes(st.id);
                          return (
                            <tr 
                              key={st.id} 
                              className={`transition-colors ${isSelected ? 'bg-crimson-50/50 hover:bg-crimson-50/70' : 'hover:bg-gray-50/80'}`}
                            >
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectStudent(st.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-crimson-600 focus:ring-crimson-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 font-semibold text-crimson-800">{st.email}</td>
                              <td className="px-4 py-3 font-mono font-bold text-gray-800">{st.roll_number || 'N/A'}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{st.name}</td>
                              <td className="px-4 py-3 font-bold text-gray-600">{st.regulation || 'AR23'}</td>
                              <td className="px-4 py-3 font-medium text-gray-700">{st.branch} - Sec {st.section || 'A'}</td>
                              <td className="px-4 py-3 text-gray-600">Semester {st.semester}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  st.hasSubmittedPE ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {st.hasSubmittedPE ? 'Locked' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  st.hasSubmittedOE ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {st.hasSubmittedOE ? 'Locked' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-1.5">
                                <button
                                  onClick={() => handleEditStudent(st)}
                                  className="px-2 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 border border-blue-200"
                                  title="Edit student details"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}${window.location.pathname}#/login?role=student&email=${encodeURIComponent(st.email)}`;
                                    navigator.clipboard.writeText(link);
                                    const subject = encodeURIComponent(`Invitation to Autonomous Elective Subject Selection — NSRIT Portal`);
                                    const body = encodeURIComponent(
`Dear ${st.name},

You have been enrolled in the Autonomous Elective Portal (${st.regulation || 'AR23'} • ${st.branch} - Section ${st.section || 'A'}, Semester ${st.semester}).

Please click the invitation link below to log in and rank your Professional Electives (PE) and Open Electives (OE):
${link}

Important Login & Selection Instructions:
1. Login ID: Your registered email (${st.email}) or Roll Number (${st.roll_number})
2. Default Password: Your Roll Number (${st.roll_number})
3. Prioritize your subjects in order of choice (Priority 1 = Top Choice).
4. Allotments are calculated immediately upon submission in strict First-In, First-Out (FIFO) timestamp order.
5. Once submitted, your choices will be permanently locked.

Best regards,
Office of the Academic Coordinator (${coordinatorBranch})
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)`
                                    );
                                    window.open(`mailto:${st.email}?subject=${subject}&body=${body}`, '_blank');
                                    showToast(`Invitation memo opened and link copied for ${st.email}!`);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-crimson-700 bg-crimson-50 hover:bg-crimson-100 rounded-lg transition-colors inline-flex items-center gap-1 border border-crimson-200"
                                  title="Send invitation link via email"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Invite</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(st.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove Student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {activeDirectoryStudents.length === 0 && (
                          <tr>
                            <td colSpan="10" className="py-12 text-center text-gray-400">
                              No students found in Section {drilldownSection} for Batch {drilldownBatch}. Click "Import Excel / CSV Roster" or "Enroll Single Student" above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BATCH ALLOTMENT CONTROL (PE DRIVES EXCLUSIVELY) */}
      {/* ========================================================================= */}
      {activeTab === 'PE_DRIVES' && (
        <div className="space-y-6 no-print">
          
          {/* PE Selection Drives Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">
                  Active & Scheduled PE Selection Windows ({coordinatorBranch})
                </h3>
                <p className="text-xs text-gray-500">
                  {sortedPeDrives.length} {sortedPeDrives.length === 1 ? 'drive' : 'drives'} registered for {coordinatorBranch} department.
                </p>
              </div>

              <button
                onClick={() => setPeDriveModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-2 shadow-sm flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Configure New PE Selection Drive</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Academic Batch</th>
                    <th className="px-4 py-3.5">Semester</th>
                    <th className="px-4 py-3.5">Elective Category</th>
                    <th className="px-4 py-3.5">Drive Title</th>
                    <th className="px-4 py-3.5 text-center">Student Portal Status</th>
                    <th className="px-4 py-3.5 text-right">Actions (Start / Stop / Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPeDrives.map((win) => {
                    const isActive = win.status === 'ACTIVE';
                    return (
                      <tr key={win.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-gray-900 text-sm">
                          {win.batch}
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-700">
                          Semester {win.semester}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
                            Professional Elective (PE)
                          </span>
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-800">
                          {win.title}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                            <span>{isActive ? 'SELECTION OPEN (ACTIVE)' : 'LOCKED (PENDING SETUP)'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          {!isActive ? (
                            <button
                              onClick={() => handleStartPEDrive(win)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 shadow-sm"
                              title="Open selection for students in this batch"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Selection</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStopPEDrive(win.id, win.title)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs"
                              title="Stop/pause selection for students"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Stop / Pause Selection</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePEDrive(win.id, win.title)}
                            className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold"
                            title="Delete Drive"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {sortedPeDrives.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        No PE selection drives configured for {coordinatorBranch}. Click <strong>Configure New PE Selection Drive</strong> above to establish one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 3: ELECTIVE OFFERINGS */}
      {/* ========================================================================= */}
      {(activeTab === 'OFFERINGS' || activeTab === 'SUBJECTS_STUDENTS') && (
        <div className="space-y-6 no-print">
          
          {/* Sub Navigation Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConfigSubTab('PE_CONFIG')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  configSubTab === 'PE_CONFIG' 
                    ? 'bg-crimson-700 text-white shadow-sm font-extrabold' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>1. Professional Electives (PE) ({peSubjects.length})</span>
              </button>

              <button
                onClick={() => setConfigSubTab('OE_CONFIG')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  configSubTab === 'OE_CONFIG' 
                    ? 'bg-crimson-700 text-white shadow-sm font-extrabold' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>2. Open Electives (OE) ({oeSubjects.length})</span>
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SUB-TAB 3.1: PROFESSIONAL ELECTIVES (PE) CONFIGURATION & OFFERING */}
          {/* ===================================================================== */}
          {configSubTab === 'PE_CONFIG' && (
            <div className="space-y-6">
              {/* Top Action Header Bar for Professional Electives */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Professional Elective (PE) Management • {coordinatorBranch}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-display">
                    Department Professional Elective Offerings
                  </h3>
                  <p className="text-xs text-gray-500 max-w-2xl mt-1">
                    Offer syllabus courses from your curriculum catalog or add custom electives. Students of {coordinatorBranch} will choose from active offerings once PE Selection Drive is active.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOfferElectiveType('PE');
                      setOfferElectiveDefaults({
                        batch: peCurriculumBatches[0] || (peSubjectFilters.batch !== 'ALL' ? peSubjectFilters.batch : ''),
                        semester: 5,
                        elective_number: 1
                      });
                      setOfferElectiveModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>+ Offer PE from Curriculum</span>
                  </button>
                </div>
              </div>

              {/* Active Offered PE Subjects Section (Batch-Wise Cards) */}
              <div className="space-y-4">
                {/* Filter Toolbar for PE Offerings */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-card flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search code / course..."
                        value={peSubjectFilters.search}
                        onChange={(e) => setPeSubjectFilters({ ...peSubjectFilters, search: e.target.value })}
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>

                    <select
                      value={peSubjectFilters.batch}
                      onChange={(e) => setPeSubjectFilters({ ...peSubjectFilters, batch: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Batches</option>
                      {peCurriculumBatches.map(b => (
                        <option key={b} value={b}>Batch {b}</option>
                      ))}
                    </select>

                    <select
                      value={peSubjectFilters.semester}
                      onChange={(e) => setPeSubjectFilters({ ...peSubjectFilters, semester: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Semesters</option>
                      {[5, 6, 7, 8, 1, 2, 3, 4].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>

                    <select
                      value={peSubjectFilters.elective_number}
                      onChange={(e) => setPeSubjectFilters({ ...peSubjectFilters, elective_number: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-blue-300 text-xs font-bold bg-blue-50 text-blue-900"
                    >
                      <option value="ALL">All Elective Numbers</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>PE-{n}</option>
                      ))}
                    </select>

                    {(peSubjectFilters.search || peSubjectFilters.batch !== 'ALL' || peSubjectFilters.semester !== 'ALL' || peSubjectFilters.elective_number !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => setPeSubjectFilters({ batch: 'ALL', semester: 'ALL', elective_number: 'ALL', search: '' })}
                        className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
                        title="Reset Filters"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                {peOfferingGroups.length > 0 ? (
                  <div className="space-y-4">
                    {peOfferingGroups.map((group) => {
                      const totalSeats = group.subjects.reduce((sum, s) => sum + (Number(s.seats) || 0), 0);
                      const totalVacancies = group.subjects.reduce((sum, s) => sum + (Number(s.available_seats) || 0), 0);
                      const totalAllotted = totalSeats - totalVacancies;
                      const isExpanded = !!expandedPEOfferingKeys[group.key];

                      const groupDrive = peDrives.find(d => 
                        normalizeBatch(d.batch) === normalizeBatch(group.batch) && 
                        Number(d.semester) === Number(group.semester)
                      );
                      const isGroupDriveActive = groupDrive?.status === 'ACTIVE';
                      const isGroupDriveEstablished = !!groupDrive;

                      return (
                        <div 
                          key={group.key}
                          className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden transition-all duration-200"
                        >
                          {/* Group Card Header (Clickable Accordion) */}
                          <div 
                            onClick={() => togglePEOfferingKey(group.key)}
                            className="p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white hover:from-blue-100/70 hover:via-indigo-100/40 cursor-pointer border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-black text-xs shadow-sm flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                PE-{group.elective_number}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm sm:text-base font-black text-gray-900 font-display">
                                    Batch {group.batch} • Semester {group.semester} • Professional Elective {group.elective_number}
                                  </h4>
                                  {isGroupDriveActive ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                      <Lock className="w-3 h-3 text-amber-700" />
                                      SELECTION ACTIVE (FROZEN)
                                    </span>
                                  ) : isGroupDriveEstablished ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      DRIVE PAUSED / READY
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-300 text-gray-700 font-bold text-[10px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-gray-500" />
                                      NO DRIVE ESTABLISHED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-500">
                                  Offered to {coordinatorBranch} Students • <strong className="text-blue-700">{group.subjects.length} Course Options Configured</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs">
                                {totalSeats} Total Seats
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                                {totalVacancies} Vacant
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800">
                                {totalAllotted} Allotted
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePEOfferingKey(group.key);
                                }}
                                className="ml-1 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-gray-200 text-xs font-bold text-gray-700 hover:text-blue-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <span>{isExpanded ? 'Hide Courses' : `View & Edit Courses (${group.subjects.length})`}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                              </button>
                            </div>
                          </div>

                          {/* Group Subjects Table */}
                          {isExpanded && (
                            <div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                      <th className="px-5 py-3">Subject Code</th>
                                      <th className="px-5 py-3">Subject Title</th>
                                      <th className="px-5 py-3 text-center">Regulation</th>
                                      <th className="px-5 py-3 text-center">Seat Capacity</th>
                                      <th className="px-5 py-3 text-center">Vacancies Remaining</th>
                                      <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {group.subjects.map((s) => (
                                      <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                                        <td className="px-5 py-3.5 font-mono font-bold text-blue-700">{s.subject_code}</td>
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">{s.subject_name}</td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px] font-bold">
                                            {s.regulation || 'AR23'}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-bold text-xs">
                                            {s.seats} seats
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                            s.available_seats === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                                          }`}>
                                            {s.available_seats} of {s.seats} vacant
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              disabled={isGroupDriveActive}
                                              onClick={() => {
                                                if (isGroupDriveActive) return;
                                                setEditingSubject(s);
                                                setSubjectModalType('PE');
                                                setSubjectModalOpen(true);
                                              }}
                                              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                                                isGroupDriveActive
                                                  ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60'
                                                  : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                                              }`}
                                              title={
                                                isGroupDriveActive
                                                  ? "Student selection is active. Pause drive in Tab 2 to edit subjects."
                                                  : "Edit Subject & Seats"
                                              }
                                            >
                                              {isGroupDriveActive ? <Lock className="w-3.5 h-3.5 text-gray-400" /> : <Edit className="w-3.5 h-3.5" />}
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              disabled={isGroupDriveActive}
                                              onClick={() => {
                                                if (isGroupDriveActive) return;
                                                handleDeleteSubject(s.id);
                                              }}
                                              className={`p-1.5 rounded-lg transition-colors ${
                                                isGroupDriveActive
                                                  ? 'text-gray-300 cursor-not-allowed opacity-40'
                                                  : 'text-gray-400 hover:text-red-700 hover:bg-red-50'
                                              }`}
                                              title={
                                                isGroupDriveActive
                                                  ? "Student selection is active. Pause drive in Tab 2 to delete subjects."
                                                  : "Delete Subject"
                                              }
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Card Footer with Quick Add Subject or Active Freeze Notice */}
                              <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-[11px] text-gray-500 font-medium">
                                  Configured for Batch {group.batch} (Sem {group.semester})
                                </span>
                                {isGroupDriveActive ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                                      Offering frozen during active selection.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab('PE_DRIVES')}
                                      className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                                    >
                                      Pause Drive in Tab 2 &rarr;
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubject(null);
                                      setSubjectModalType('PE');
                                      setSubjectModalDefaults({
                                        batch: group.batch,
                                        semester: group.semester,
                                        elective_number: group.elective_number,
                                        regulation: group.regulation || 'AR23'
                                      });
                                      setSubjectModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-300 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add Course to this Offering</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-700">No Professional Electives Offered Yet</p>
                    <p className="text-xs text-gray-500">
                      Select a batch, semester, and PE number from the syllabus pipeline above, choose courses, and click "Offer & Activate Selected PE Subjects".
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===================================================================== */}
          {/* SUB-TAB 3.2: OPEN ELECTIVES (OE) CONFIGURATION & OFFERING */}
          {/* ===================================================================== */}
          {configSubTab === 'OE_CONFIG' && (
            <div className="space-y-6">
              
              {/* Top Action Header Bar for Open Electives */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800 uppercase tracking-wider mb-2">
                    <Globe className="w-3.5 h-3.5 text-purple-600" />
                    <span>Open Elective (OE) Management • Offered by {coordinatorBranch}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-display">
                    Inter-Department Open Elective Offerings
                  </h3>
                  <p className="text-xs text-gray-500 max-w-2xl mt-1">
                    Offer courses from your curriculum catalog or add custom open electives. Configure cross-department target branch eligibility so students of other engineering departments can enroll.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOfferElectiveType('OE');
                      setOfferElectiveDefaults({
                        batch: oeCurriculumBatches[0] || (oeSubjectFilters.batch !== 'ALL' ? oeSubjectFilters.batch : ''),
                        semester: 5,
                        elective_number: 1
                      });
                      setOfferElectiveModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 flex items-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>+ Offer OE from Curriculum</span>
                  </button>


                </div>
              </div>

              {/* Active Offered OE Subjects Section (Batch-Wise Cards) */}
              <div className="space-y-4">
                {/* Filter Toolbar for OE Offerings */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-card flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search code / course..."
                        value={oeSubjectFilters.search}
                        onChange={(e) => setOeSubjectFilters({ ...oeSubjectFilters, search: e.target.value })}
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>

                    <select
                      value={oeSubjectFilters.batch}
                      onChange={(e) => setOeSubjectFilters({ ...oeSubjectFilters, batch: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Batches</option>
                      {oeCurriculumBatches.map(b => (
                        <option key={b} value={b}>Batch {b}</option>
                      ))}
                    </select>

                    <select
                      value={oeSubjectFilters.semester}
                      onChange={(e) => setOeSubjectFilters({ ...oeSubjectFilters, semester: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Semesters</option>
                      {[5, 6, 7, 8, 1, 2, 3, 4].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>

                    <select
                      value={oeSubjectFilters.elective_number}
                      onChange={(e) => setOeSubjectFilters({ ...oeSubjectFilters, elective_number: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900"
                    >
                      <option value="ALL">All Elective Numbers</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>OE-{n}</option>
                      ))}
                    </select>

                    {(oeSubjectFilters.search || oeSubjectFilters.batch !== 'ALL' || oeSubjectFilters.semester !== 'ALL' || oeSubjectFilters.elective_number !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => setOeSubjectFilters({ batch: 'ALL', semester: 'ALL', elective_number: 'ALL', search: '' })}
                        className="px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
                        title="Reset Filters"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                {oeOfferingGroups.length > 0 ? (
                  <div className="space-y-4">
                    {oeOfferingGroups.map((group) => {
                      const totalSeats = group.subjects.reduce((sum, s) => sum + (Number(s.seats) || 0), 0);
                      const totalVacancies = group.subjects.reduce((sum, s) => sum + (Number(s.available_seats) || 0), 0);
                      const totalAllotted = totalSeats - totalVacancies;
                      const isExpanded = !!expandedOEOfferingKeys[group.key];

                      const groupAdminWindow = adminWindows.find(w => 
                        normalizeBatch(w.batch) === normalizeBatch(group.batch) && 
                        Number(w.semester) === Number(group.semester)
                      );
                      const isGroupAdminActive = groupAdminWindow?.status === 'ACTIVE';
                      const isGroupAdminEstablished = !!groupAdminWindow;

                      return (
                        <div 
                          key={group.key}
                          className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden transition-all duration-200"
                        >
                          {/* Group Card Header (Clickable Accordion) */}
                          <div 
                            onClick={() => toggleOEOfferingKey(group.key)}
                            className="p-5 bg-gradient-to-r from-purple-50/80 via-pink-50/40 to-white hover:from-purple-100/70 hover:via-pink-100/40 cursor-pointer border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 rounded-xl bg-purple-700 text-white font-mono font-black text-xs shadow-sm flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                OE-{group.elective_number}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm sm:text-base font-black text-gray-900 font-display">
                                    Batch {group.batch} • Semester {group.semester} • Open Elective {group.elective_number}
                                  </h4>
                                  {isGroupAdminActive ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                      <Lock className="w-3 h-3 text-amber-700" />
                                      SELECTION ACTIVE (FROZEN)
                                    </span>
                                  ) : isGroupAdminEstablished ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      ADMIN DRIVE READY
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-600" />
                                      ADMIN DRIVE REQUIRED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-500">
                                  Offered by {coordinatorBranch} Department • <strong className="text-purple-700">{group.subjects.length} Course Options Configured</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs">
                                {totalSeats} Total Seats
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                                {totalVacancies} Vacant
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
                                {totalAllotted} Allotted
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOEOfferingKey(group.key);
                                }}
                                className="ml-1 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 text-xs font-bold text-gray-700 hover:text-purple-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <span>{isExpanded ? 'Hide Courses' : `View & Edit Courses (${group.subjects.length})`}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-700" /> : <ChevronDown className="w-4 h-4 text-purple-700" />}
                              </button>
                            </div>
                          </div>

                          {/* Group Subjects Table */}
                          {isExpanded && (
                            <div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                      <th className="px-5 py-3">Subject Code</th>
                                      <th className="px-5 py-3">Subject Title</th>
                                      <th className="px-5 py-3">Target Branches</th>
                                      <th className="px-5 py-3 text-center">Regulation</th>
                                      <th className="px-5 py-3 text-center">Seat Capacity</th>
                                      <th className="px-5 py-3 text-center">Vacancies Remaining</th>
                                      <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {group.subjects.map((s) => (
                                      <tr key={s.id} className="hover:bg-purple-50/40 transition-colors">
                                        <td className="px-5 py-3.5 font-mono font-bold text-purple-700">{s.subject_code}</td>
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">{s.subject_name}</td>
                                        <td className="px-5 py-3.5">
                                          <div className="flex flex-wrap items-center gap-1">
                                            {(Array.isArray(s.offered_branches) ? s.offered_branches : ['ALL']).map(b => (
                                              <span key={b} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                                                {b}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px] font-bold">
                                            {s.regulation || 'AR23'}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-bold text-xs">
                                            {s.seats} seats
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                            s.available_seats === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                                          }`}>
                                            {s.available_seats} of {s.seats} vacant
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              disabled={!isGroupAdminEstablished || isGroupAdminActive}
                                              onClick={() => {
                                                setEditingSubject(s);
                                                setSubjectModalType('OE');
                                                setSubjectModalOpen(true);
                                              }}
                                              className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                              title={
                                                !isGroupAdminEstablished
                                                  ? "Admin must configure OE drive in Admin Portal first"
                                                  : isGroupAdminActive
                                                  ? "Student selection is active. Contact Admin to pause drive before editing."
                                                  : "Edit Subject & Seats"
                                              }
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              disabled={!isGroupAdminEstablished || isGroupAdminActive}
                                              onClick={() => handleDeleteSubject(s.id)}
                                              className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                              title={
                                                !isGroupAdminEstablished
                                                  ? "Admin must configure OE drive in Admin Portal first"
                                                  : isGroupAdminActive
                                                  ? "Student selection is active. Contact Admin to pause drive before deleting."
                                                  : "Delete Subject"
                                              }
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Card Footer with Quick Add Subject */}
                              <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[11px] text-gray-500 font-medium">
                                  Configured for Batch {group.batch} (Sem {group.semester})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubject(null);
                                    setSubjectModalType('OE');
                                    setSubjectModalDefaults({
                                      batch: group.batch,
                                      semester: group.semester,
                                      elective_number: group.elective_number,
                                      regulation: group.regulation || 'AR23'
                                    });
                                    setSubjectModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-gray-300 hover:border-purple-300 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Course to this Offering</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center space-y-2">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-700">No Open Electives Offered Yet</p>
                    <p className="text-xs text-gray-500">
                      Select a batch, semester, and OE number from the syllabus pipeline above, choose courses, select eligible student branches, and click "Offer & Activate Selected OE Subjects".
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE ANALYTICS */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 4: LIVE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'ANALYZE' && (
        <div className="space-y-8 no-print">
          
          {/* Analytics Multi-Dimensional Control & Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-card space-y-4">
            
            {/* Row 1: Elective Switcher, Cascading Selectors & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Elective Type Toggle */}
                <div className="flex p-1 rounded-2xl bg-gray-100 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAnalyticsElectiveType('PE');
                      setAnalyticsSection('ALL');
                      setAnalyticsBranch('ALL');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      analyticsElectiveType === 'PE'
                        ? 'bg-white text-crimson-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Professional Electives (PE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnalyticsElectiveType('OE');
                      setAnalyticsSection('ALL');
                      setAnalyticsBranch('ALL');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      analyticsElectiveType === 'OE'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Open Electives (OE)</span>
                  </button>
                </div>

                {/* Batch Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-2xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Batch:</span>
                  <select
                    value={analyticsBatch}
                    onChange={(e) => {
                      setAnalyticsBatch(e.target.value);
                      setAnalyticsSection('ALL');
                      setAnalyticsBranch('ALL');
                    }}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Batches</option>
                    {availableBatches.map(b => (
                      <option key={b} value={b}>Batch {b}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-2xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Sem:</span>
                  <select
                    value={analyticsSemester}
                    onChange={(e) => setAnalyticsSemester(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                {/* Elective Number Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-2xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Elective No:</span>
                  <select
                    value={analyticsElectiveNumber}
                    onChange={(e) => setAnalyticsElectiveNumber(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Elective Numbers</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {analyticsElectiveType === 'PE' ? `PE-${num}` : `OE-${num}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Section Filter (for PE) or Student Branch Filter (for OE) */}
                {analyticsElectiveType === 'PE' ? (
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-2xl px-3 py-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section:</span>
                    <select
                      value={analyticsSection}
                      onChange={(e) => setAnalyticsSection(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Sections</option>
                      {availableAnalyticsSections.map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-2xl px-3 py-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Outside Branch:</span>
                    <select
                      value={analyticsBranch}
                      onChange={(e) => setAnalyticsBranch(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Outside Branches</option>
                      {availableAnalyticsBranches.map(br => (
                        <option key={br} value={br}>{br} Department</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Actions & Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportAnalyticsCSV}
                  className="px-3.5 py-2 rounded-2xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-2xs flex items-center gap-1.5 transition-colors"
                  title="Export complete analytics dataset to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={loadAllData}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-crimson-700 hover:bg-crimson-800 shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Live Refresh</span>
                </button>
              </div>
            </div>

            {/* Row 2: Search Box & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter subjects by code, title, or keywords..."
                  value={analyticsSearch}
                  onChange={(e) => setAnalyticsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl border border-gray-200 bg-gray-50/50 text-xs focus:bg-white focus:ring-2 focus:ring-crimson-600"
                />
                {analyticsSearch && (
                  <button
                    type="button"
                    onClick={() => setAnalyticsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* View Switcher: Cards vs Table vs Matrix */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setAnalyticsViewMode('CARDS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    analyticsViewMode === 'CARDS'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Subject Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsViewMode('TABLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    analyticsViewMode === 'TABLE'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Audit Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsViewMode('MATRIX')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    analyticsViewMode === 'MATRIX'
                      ? 'bg-white text-crimson-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{analyticsElectiveType === 'PE' ? 'Section Matrix' : 'Branch Matrix'}</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Status Indicator */}
            {(analyticsBatch !== 'ALL' || analyticsSemester !== 'ALL' || analyticsElectiveNumber !== 'ALL' || analyticsSection !== 'ALL' || analyticsBranch !== 'ALL' || analyticsSearch) && (
              <div className="flex items-center justify-between text-xs text-gray-600 bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-amber-600" />
                  <span>Active Filters:</span>
                  {analyticsBatch !== 'ALL' && <span className="font-bold text-gray-900">Batch {analyticsBatch}</span>}
                  {analyticsSemester !== 'ALL' && <span className="font-bold text-gray-900">Sem {analyticsSemester}</span>}
                  {analyticsElectiveNumber !== 'ALL' && <span className="font-bold text-gray-900">{analyticsElectiveType}-{analyticsElectiveNumber}</span>}
                  {analyticsSection !== 'ALL' && <span className="font-bold text-gray-900">Sec {analyticsSection}</span>}
                  {analyticsBranch !== 'ALL' && <span className="font-bold text-gray-900">Branch {analyticsBranch}</span>}
                  {analyticsSearch && <span className="font-bold text-gray-900">"{analyticsSearch}"</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsBatch('ALL');
                    setAnalyticsSemester('ALL');
                    setAnalyticsElectiveNumber('ALL');
                    setAnalyticsSection('ALL');
                    setAnalyticsBranch('ALL');
                    setAnalyticsSearch('');
                  }}
                  className="text-amber-800 hover:text-amber-950 font-bold underline text-[11px]"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Copied Notice Banner */}
          {copiedAnalyticsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{copiedAnalyticsNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCopiedAnalyticsNotice('')}
                className="text-emerald-700 hover:text-emerald-950 font-black"
              >
                ×
              </button>
            </div>
          )}

          {/* Top KPI Metrics Banner (7 Stat Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Pool</span>
              <span className="text-2xl font-black text-gray-900 block font-display">{totalTargetStudents}</span>
              <span className="text-[10px] text-gray-500 block">Eligible students</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Submitted</span>
              <span className="text-2xl font-black text-blue-700 block font-display">{submittedStudentsCount}</span>
              <span className="text-[10px] font-bold text-blue-600 block">{overallSubmissionRate}% Submission Rate</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Pending</span>
              <span className="text-2xl font-black text-rose-700 block font-display">{pendingStudentsCount}</span>
              <span className="text-[10px] text-rose-600 block">Need to submit</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Seats</span>
              <span className="text-2xl font-black text-gray-900 block font-display">{totalConfiguredSeats}</span>
              <span className="text-[10px] text-gray-500 block">Configured capacity</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Seats Allotted</span>
              <span className="text-2xl font-black text-emerald-700 block font-display">{totalAllottedSeats}</span>
              <span className="text-[10px] font-bold text-emerald-600 block">{overallOccupancyRate}% Seat Fill</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vacancies</span>
              <span className="text-2xl font-black text-emerald-600 block font-display">{totalVacanciesRemaining}</span>
              <span className="text-[10px] text-gray-500 block">Seats remaining</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Waitlisted</span>
              <span className="text-2xl font-black text-amber-700 block font-display">{totalWaitlistedSeats}</span>
              <span className="text-[10px] text-amber-600 block">In FIFO queue</span>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* SECTION 1: ACTIVE DRIVE SECTION-WISE SUBMISSION TRACKER */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    {analyticsElectiveType === 'PE'
                      ? `Class Section Submission & Tracker (${coordinatorBranch} Department)`
                      : 'Participating Outside Department Applications Tracker (Open Electives)'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-crimson-50 text-crimson-700 font-bold text-[10px]">
                    Live Status
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {analyticsElectiveType === 'PE'
                    ? 'Section-by-section breakdown of submitted priorities, pending students, and allotment fulfillment.'
                    : 'Breakdown of applicants, choices, and allotments across all participating college departments.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Batch Selector for Section Cards */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Batch:</span>
                  <select
                    value={analyticsBatch}
                    onChange={(e) => {
                      setAnalyticsBatch(e.target.value);
                      setAnalyticsSection('ALL');
                    }}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Batches</option>
                    {availableBatches.map(b => (
                      <option key={b} value={b}>Batch {b}</option>
                    ))}
                  </select>
                </div>

                {analyticsElectiveType === 'PE' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">
                      Total: <strong className="text-gray-900">{submittedStudentsCount}</strong> / {totalTargetStudents} submitted
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid of Section Submission Cards */}
            {analyticsElectiveType === 'PE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sectionTrackerData.map((sec) => {
                  const isExpanded = expandedSectionAnalyticsKey === sec.section;
                  return (
                    <div
                      key={sec.section}
                      className="bg-gray-50/70 rounded-2xl border border-gray-200 p-4 space-y-3.5 transition-all hover:shadow-2xs"
                    >
                      {/* Section Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-crimson-100 text-crimson-800 font-bold text-xs flex items-center justify-center font-display">
                            {sec.section}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-gray-900 text-sm">{sec.name}</h4>
                              {analyticsBatch !== 'ALL' && (
                                <span className="px-1.5 py-0.5 rounded bg-crimson-50 text-crimson-700 font-mono text-[9px] font-bold border border-crimson-100">
                                  Batch {analyticsBatch}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {sec.enrolled} Enrolled Students
                            </span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          sec.rate === 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : sec.rate >= 75
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sec.rate}% Done
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                          <span>Submissions</span>
                          <span>{sec.submitted} of {sec.enrolled}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              sec.rate === 100 ? 'bg-emerald-500' : 'bg-crimson-600'
                            }`}
                            style={{ width: `${Math.min(100, sec.rate)}%` }}
                          />
                        </div>
                      </div>

                      {/* Stat Badges */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="p-1.5 rounded-xl bg-white border border-gray-200">
                          <span className="text-gray-400 block font-semibold">Allotted</span>
                          <span className="font-extrabold text-emerald-700 text-xs">{sec.allotted}</span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-white border border-gray-200">
                          <span className="text-gray-400 block font-semibold">Waitlist</span>
                          <span className="font-extrabold text-amber-700 text-xs">{sec.waitlisted}</span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-white border border-gray-200">
                          <span className="text-gray-400 block font-semibold">Pending</span>
                          <span className="font-extrabold text-rose-700 text-xs">{sec.pending}</span>
                        </div>
                      </div>

                      {/* Pending Action Footer */}
                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                        {sec.pending > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedSectionAnalyticsKey(isExpanded ? null : sec.section)}
                            className="text-rose-700 hover:text-rose-900 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>{sec.pending} Pending Students</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>All Submitted</span>
                          </span>
                        )}

                        {sec.pending > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const rollList = sec.pendingList.map(s => s.roll_number).filter(Boolean).join(', ');
                              copyToClipboard(rollList, `Section ${sec.section} Pending Roll Numbers`);
                            }}
                            className="p-1.5 bg-white hover:bg-rose-50 border border-gray-200 text-gray-600 hover:text-rose-700 rounded-lg transition-colors"
                            title={`Copy Section ${sec.section} pending roll numbers`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Expandable Pending Roster Drawer */}
                      {isExpanded && sec.pendingList.length > 0 && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 space-y-2 text-xs animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-[11px]">
                              Pending Roster ({sec.pendingList.length}):
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const rolls = sec.pendingList.map(s => s.roll_number).filter(Boolean).join(', ');
                                  copyToClipboard(rolls, `Section ${sec.section} Roll Numbers`);
                                }}
                                className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] rounded hover:bg-rose-100"
                              >
                                Copy Rolls
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const emails = sec.pendingList.map(s => s.email).filter(Boolean).join(', ');
                                  copyToClipboard(emails, `Section ${sec.section} Emails`);
                                }}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold text-[10px] rounded hover:bg-gray-200"
                              >
                                Copy Emails
                              </button>
                            </div>
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-gray-100 pr-1">
                            {sec.pendingList.map(st => (
                              <div key={st.id} className="pt-1 flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-bold text-gray-800">{st.roll_number}</span>
                                  <span className="text-gray-500 ml-1.5">{st.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">{st.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* OE Participating Department Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {oeBranchTrackerData.map((br, idx) => (
                  <div
                    key={br.branch}
                    className="bg-gray-50/70 rounded-2xl border border-gray-200 p-4 space-y-3 transition-all hover:shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <h4 className="font-bold text-gray-900 text-sm font-display">{br.branch} Department</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                        {br.applicants} Applicants
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-2 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-400 block font-semibold">1st Priority</span>
                        <span className="font-extrabold text-crimson-700 text-xs">{br.p1Choices}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-400 block font-semibold">Allotted</span>
                        <span className="font-extrabold text-emerald-700 text-xs">{br.allotted}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-400 block font-semibold">Waitlisted</span>
                        <span className="font-extrabold text-amber-700 text-xs">{br.waitlisted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================================= */}
          {/* SECTION 2: RECHARTS VISUAL ANALYTICS DASHBOARD */}
          {/* ======================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Subject Demand vs Configured Seat Capacity */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    Subject Demand vs. Configured Capacity
                  </h3>
                  <p className="text-xs text-gray-500">
                    Comparing seats configured, Priority 1 demand, total choices, and allotted seats.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-crimson-50 text-crimson-700 font-bold text-[10px] uppercase tracking-wider">
                  {analyticsElectiveType} Subjects
                </span>
              </div>

              <div className="h-72 w-full">
                {subjectChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="seats" name="Configured Quota" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="p1" name="Priority 1 Demand" fill="#C8191E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalDemand" name="Total Preference Choices" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="allotted" name="Seats Allotted" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                    No subject data matching current filters
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Section / Branch Candidate Pool Share */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    {analyticsElectiveType === 'PE'
                      ? `Candidate Pool Share by Class Section (${coordinatorBranch})`
                      : 'Candidate Pool Share by Outside Department (OE)'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {analyticsElectiveType === 'PE'
                      ? `Distribution of ${coordinatorBranch} student candidates across class sections`
                      : 'Proportion of student applicants across external departments'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[10px] uppercase tracking-wider">
                  {candidatePoolData.length} Groups
                </span>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {candidatePoolData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={candidatePoolData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {candidatePoolData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} Students (${Math.round((value / Math.max(1, totalTargetStudents || 1)) * 100)}%)`,
                          name
                        ]}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 text-xs">No distribution data available</div>
                )}
              </div>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* SECTION 3: SUBJECT-WISE IN-DEPTH SECTION & BRANCH ANALYSIS */}
          {/* ======================================================================= */}
          
          {/* VIEW MODE 1: SUBJECT INTELLIGENCE CARDS */}
          {analyticsViewMode === 'CARDS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    Subject-Wise Analysis & Choice Breakdown
                  </h3>
                  <p className="text-xs text-gray-500">
                    Comprehensive breakdown showing which class sections or departments chose each subject, priority distribution, and FIFO allotment fulfillment.
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Showing {subjectAnalyticsData.length} Subjects
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {subjectAnalyticsData.map((subj) => {
                  const isRosterExpanded = expandedSubjectAnalyticsId === subj.id;
                  const demandRatio = subj.seats > 0 ? Math.round((subj.totalDemand / subj.seats) * 100) : 0;

                  return (
                    <div
                      key={subj.id}
                      className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden hover:border-gray-300 transition-all"
                    >
                      {/* Subject Card Header */}
                      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-gray-50/70 to-white">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-crimson-50 text-crimson-700 font-mono font-bold text-xs border border-crimson-200/60">
                              {subj.code}
                            </span>
                            <h4 className="text-base font-bold text-gray-900 font-display">
                              {subj.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                              {analyticsElectiveType}-{subj.elective_number || 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                              Sem {subj.semester}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[10px]">
                              Batch {subj.admitted_batch}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Offered by <strong>{subj.branch} Department</strong> • FIFO Priority Seat Allocation Engine
                          </p>
                        </div>

                        {/* Top Metrics Chips */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Configured</span>
                            <span className="text-sm font-extrabold text-gray-900">{subj.seats} Seats</span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Allotted</span>
                            <span className="text-sm font-extrabold text-emerald-700">{subj.allotted}</span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Vacant</span>
                            <span className={`text-sm font-extrabold ${subj.remaining === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {subj.remaining}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-blue-600 block uppercase">Demand</span>
                            <span className="text-sm font-extrabold text-blue-700">{subj.totalDemand} ({demandRatio}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Subject Card Body: Priority Demand Bar & Section Breakdown Grid */}
                      <div className="p-5 space-y-5">
                        
                        {/* Priority Breakdown Stacked Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-crimson-600" />
                              <span>Priority Demand Spread</span>
                            </span>
                            <div className="flex items-center gap-3 text-[11px] font-semibold">
                              <span className="text-crimson-700">🥇 P1: {subj.p1Count}</span>
                              <span className="text-blue-700">🥈 P2: {subj.p2Count}</span>
                              <span className="text-amber-700">🥉 P3: {subj.p3Count}</span>
                              {subj.pOtherCount > 0 && <span className="text-gray-500">P4+: {subj.pOtherCount}</span>}
                            </div>
                          </div>

                          {/* Colored Segments */}
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                            {subj.totalDemand > 0 ? (
                              <>
                                <div
                                  className="bg-crimson-600 h-full transition-all"
                                  style={{ width: `${(subj.p1Count / subj.totalDemand) * 100}%` }}
                                  title={`Priority 1: ${subj.p1Count} choices`}
                                />
                                <div
                                  className="bg-blue-600 h-full transition-all"
                                  style={{ width: `${(subj.p2Count / subj.totalDemand) * 100}%` }}
                                  title={`Priority 2: ${subj.p2Count} choices`}
                                />
                                <div
                                  className="bg-amber-500 h-full transition-all"
                                  style={{ width: `${(subj.p3Count / subj.totalDemand) * 100}%` }}
                                  title={`Priority 3: ${subj.p3Count} choices`}
                                />
                                <div
                                  className="bg-gray-400 h-full transition-all"
                                  style={{ width: `${(subj.pOtherCount / subj.totalDemand) * 100}%` }}
                                  title={`Other Priorities: ${subj.pOtherCount} choices`}
                                />
                              </>
                            ) : (
                              <div className="bg-gray-200 w-full h-full" />
                            )}
                          </div>
                        </div>

                        {/* SECTION CHOICE BREAKDOWN (Which section chose this subject) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              {analyticsElectiveType === 'PE'
                                ? `Section-Wise Student Choices for this Subject:`
                                : `Outside Department Choices for this OE Course:`}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              Breakdown of which class sections / branches chose this course
                            </span>
                          </div>

                          {analyticsElectiveType === 'PE' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {availableAnalyticsSections.map(sec => {
                                const st = subj.sectionStats[sec] || { total: 0, p1: 0, p2: 0, p3: 0, allotted: 0, waitlisted: 0 };
                                return (
                                  <div
                                    key={sec}
                                    className={`p-3.5 rounded-2xl border transition-all ${
                                      st.total > 0
                                        ? 'bg-gray-50/80 border-gray-200'
                                        : 'bg-white border-dashed border-gray-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-lg bg-white border border-gray-200 text-gray-800 font-bold text-[10px] flex items-center justify-center">
                                          {sec}
                                        </span>
                                        <span>Section {sec}</span>
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                        st.total > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {st.total} Chosen
                                      </span>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                                      <span className="text-gray-500">
                                        🥇 P1: <strong className="text-crimson-700">{st.p1}</strong> • 🥈 P2: <strong>{st.p2}</strong>
                                      </span>
                                      <span className="text-emerald-700 font-extrabold">
                                        {st.allotted} Allotted
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* OE Outside Branch Choice Grid */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {availableAnalyticsBranches.map(br => {
                                const bt = subj.branchStats[br] || { total: 0, p1: 0, p2: 0, p3: 0, allotted: 0, waitlisted: 0 };
                                return (
                                  <div
                                    key={br}
                                    className={`p-3.5 rounded-2xl border transition-all ${
                                      bt.total > 0
                                        ? 'bg-purple-50/40 border-purple-200'
                                        : 'bg-white border-dashed border-gray-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-900 text-xs font-display">
                                        {br} Department
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[11px]">
                                        {bt.total} Choices
                                      </span>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px]">
                                      <span className="text-gray-500">
                                        🥇 P1: <strong className="text-crimson-700">{bt.p1}</strong>
                                      </span>
                                      <span className="text-emerald-700 font-extrabold">
                                        {bt.allotted} Allotted
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Expandable Applicants Roster Button */}
                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedSubjectAnalyticsId(isRosterExpanded ? null : subj.id)}
                            className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-2 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-gray-600" />
                            <span>
                              {isRosterExpanded
                                ? 'Hide Student Applicants Roster'
                                : `View Student Applicants Roster (${subj.applicantsRoster.length} Students)`}
                            </span>
                            {isRosterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <span className="text-xs text-gray-500">
                            Seat Occupancy: <strong className="text-gray-900">{subj.occupancy}%</strong>
                          </span>
                        </div>

                        {/* Detailed Applicants Roster Accordion */}
                        {isRosterExpanded && (
                          <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 text-xs">
                                Student Applicants for {subj.code} (Ordered by Priority & Timestamp):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const rolls = subj.applicantsRoster.map(s => s.roll_number).filter(Boolean).join(', ');
                                  copyToClipboard(rolls, `${subj.code} Applicant Roll Numbers`);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Rolls</span>
                              </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                  <tr>
                                    <th className="px-3 py-2">Priority</th>
                                    <th className="px-3 py-2">Roll Number</th>
                                    <th className="px-3 py-2">Student Name</th>
                                    <th className="px-3 py-2">Branch / Sec</th>
                                    <th className="px-3 py-2">Submitted At</th>
                                    <th className="px-3 py-2 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {subj.applicantsRoster.map((app, appIdx) => (
                                    <tr key={`${app.student_id}-${appIdx}`} className="hover:bg-gray-50/80">
                                      <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          app.priority === 1
                                            ? 'bg-crimson-100 text-crimson-800'
                                            : app.priority === 2
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          P{app.priority}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{app.roll_number}</td>
                                      <td className="px-3 py-2 text-gray-700">{app.name}</td>
                                      <td className="px-3 py-2 text-gray-600 font-medium">
                                        {app.branch} (Sec {app.section || 'A'})
                                      </td>
                                      <td className="px-3 py-2 text-gray-400 text-[10px] font-mono">
                                        {app.submitted_at ? new Date(app.submitted_at).toLocaleString() : 'N/A'}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          app.status === 'ALLOTTED'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : app.status === 'WAITLISTED'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {app.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {subj.applicantsRoster.length === 0 && (
                                    <tr>
                                      <td colSpan="6" className="py-6 text-center text-gray-400">
                                        No students have submitted preferences for this subject yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}

                {subjectAnalyticsData.length === 0 && (
                  <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-700">No Subjects Match Filter Criteria</p>
                    <p className="text-xs text-gray-500">
                      Try selecting "All Batches" or clearing your search term to see full analytics.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: DETAILED AUDIT TABLE */}
          {analyticsViewMode === 'TABLE' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    {analyticsElectiveType === 'PE' ? 'Professional' : 'Open'} Elective Quota & Section Audit Table
                  </h3>
                  <p className="text-xs text-gray-500">
                    Dense view of seat capacity, priority distribution, and section choices.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Subject Code & Title</th>
                      <th className="px-4 py-3 text-center">Elective</th>
                      <th className="px-4 py-3 text-center">Seats</th>
                      <th className="px-4 py-3 text-center text-crimson-700">🥇 P1</th>
                      <th className="px-4 py-3 text-center text-blue-700">🥈 P2</th>
                      <th className="px-4 py-3 text-center text-amber-700">🥉 P3</th>
                      <th className="px-4 py-3 text-center">Total Demand</th>
                      <th className="px-4 py-3 text-center text-emerald-700">Allotted</th>
                      <th className="px-4 py-3 text-center text-amber-700">Waitlisted</th>
                      <th className="px-4 py-3 text-center">Vacancies</th>
                      <th className="px-4 py-3">Section Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectAnalyticsData.map((subj) => (
                      <tr key={subj.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{subj.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{subj.code} • Sem {subj.semester}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-purple-700">
                          {analyticsElectiveType}-{subj.elective_number || 1}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{subj.seats}</td>
                        <td className="px-4 py-3 text-center font-bold text-crimson-700">{subj.p1Count}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-700">{subj.p2Count}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-700">{subj.p3Count}</td>
                        <td className="px-4 py-3 text-center font-extrabold text-gray-800">{subj.totalDemand}</td>
                        <td className="px-4 py-3 text-center font-extrabold text-emerald-600">{subj.allotted}</td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600">{subj.waitlisted}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            subj.remaining === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {subj.remaining} vacant
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {analyticsElectiveType === 'PE' ? (
                              availableAnalyticsSections.map(sec => {
                                const st = subj.sectionStats[sec] || { total: 0, allotted: 0 };
                                if (st.total === 0) return null;
                                return (
                                  <span key={sec} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-700 font-medium">
                                    <strong>Sec {sec}:</strong> {st.total} ({st.allotted} alloted)
                                  </span>
                                );
                              })
                            ) : (
                              availableAnalyticsBranches.map(br => {
                                const bt = subj.branchStats[br] || { total: 0, allotted: 0 };
                                if (bt.total === 0) return null;
                                return (
                                  <span key={br} className="px-2 py-0.5 rounded bg-purple-50 text-[10px] text-purple-800 font-medium">
                                    <strong>{br}:</strong> {bt.total}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subjectAnalyticsData.length === 0 && (
                      <tr>
                        <td colSpan="11" className="py-12 text-center text-gray-400">
                          No subjects match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: SECTION × SUBJECT CROSS-TABULATION MATRIX */}
          {analyticsViewMode === 'MATRIX' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    {analyticsElectiveType === 'PE'
                      ? 'Section × Subject Cross-Tabulation Matrix'
                      : 'Outside Department × Subject Demand Matrix'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    2D Grid showing the exact choice count and allotment distribution from every class section / branch.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 sticky left-0 bg-gray-50 z-10">Subject Course</th>
                      <th className="px-3 py-3.5 text-center">Quota</th>
                      {analyticsElectiveType === 'PE' ? (
                        availableAnalyticsSections.map(sec => (
                          <th key={sec} className="px-3 py-3.5 text-center text-crimson-800">
                            Sec {sec} Choices
                          </th>
                        ))
                      ) : (
                        availableAnalyticsBranches.map(br => (
                          <th key={br} className="px-3 py-3.5 text-center text-purple-800">
                            {br} Choices
                          </th>
                        ))
                      )}
                      <th className="px-3 py-3.5 text-center font-black text-blue-800">Total Demand</th>
                      <th className="px-3 py-3.5 text-center font-black text-emerald-800">Allotted</th>
                      <th className="px-3 py-3.5 text-center">Vacancies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectAnalyticsData.map((subj) => (
                      <tr key={subj.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 sticky left-0 bg-white font-bold text-gray-900 z-10 border-r border-gray-100">
                          <div>{subj.name}</div>
                          <span className="text-[10px] text-gray-400 font-mono font-normal">
                            {subj.code} • {analyticsElectiveType}-{subj.elective_number || 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-gray-800">{subj.seats}</td>
                        {analyticsElectiveType === 'PE' ? (
                          availableAnalyticsSections.map(sec => {
                            const st = subj.sectionStats[sec] || { total: 0, p1: 0, allotted: 0 };
                            return (
                              <td key={sec} className="px-3 py-3 text-center">
                                {st.total > 0 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2 py-0.5 rounded-md bg-crimson-50 text-crimson-800 font-bold text-xs">
                                      {st.total}
                                    </span>
                                    <span className="text-[9px] text-gray-400 mt-0.5 font-medium">
                                      {st.allotted} allotted
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono">-</span>
                                )}
                              </td>
                            );
                          })
                        ) : (
                          availableAnalyticsBranches.map(br => {
                            const bt = subj.branchStats[br] || { total: 0, p1: 0, allotted: 0 };
                            return (
                              <td key={br} className="px-3 py-3 text-center">
                                {bt.total > 0 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-xs">
                                      {bt.total}
                                    </span>
                                    <span className="text-[9px] text-gray-400 mt-0.5 font-medium">
                                      {bt.allotted} allotted
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono">-</span>
                                )}
                              </td>
                            );
                          })
                        )}
                        <td className="px-3 py-3 text-center font-extrabold text-blue-700 text-sm">
                          {subj.totalDemand}
                        </td>
                        <td className="px-3 py-3 text-center font-extrabold text-emerald-600 text-sm">
                          {subj.allotted}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            subj.remaining === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {subj.remaining}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ALLOTMENTS, OVERRIDES & SECTION-WISE PRINTING */}
      {/* ========================================================================= */}
      {activeTab === 'CHANGE_PRINT' && (
        <div className="space-y-6 no-print">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Filtered</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block font-display">{allotments.length}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">PE Allotted</span>
              <span className="text-2xl font-black text-crimson-700 mt-1 block font-display">
                {allotments.filter(a => a.elective_type === 'PE' && a.status === 'ALLOTTED').length}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">OE Allotted</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block font-display">
                {allotments.filter(a => a.elective_type === 'OE' && a.status === 'ALLOTTED').length}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Waitlisted</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block font-display">
                {allotments.filter(a => a.status === 'WAITLISTED').length}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Enrolled</span>
              <span className="text-2xl font-black text-gray-800 mt-1 block font-display">{students.length}</span>
            </div>
          </div>

          {/* Action Toolbar with Filters */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search email, roll no, name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-crimson-600"
                />
              </div>

              <select
                value={filters.elective_type}
                onChange={(e) => setFilters({ ...filters, elective_type: e.target.value, elective_number: 'ALL', subject_id: 'ALL' })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800"
              >
                <option value="ALL">All Electives (PE & OE)</option>
                <option value="PE">Professional Elective (PE)</option>
                <option value="OE">Open Elective (OE)</option>
              </select>

              <select
                value={filters.elective_number}
                onChange={(e) => setFilters({ ...filters, elective_number: e.target.value })}
                className="px-3 py-2 rounded-xl border border-purple-300 text-xs font-bold bg-purple-50 text-purple-900"
              >
                <option value="ALL">All Elective Numbers</option>
                {filters.elective_type === 'PE' ? (
                  <>
                    <option value="1">Professional Elective 1 (PE-1)</option>
                    <option value="2">Professional Elective 2 (PE-2)</option>
                    <option value="3">Professional Elective 3 (PE-3)</option>
                    <option value="4">Professional Elective 4 (PE-4)</option>
                    <option value="5">Professional Elective 5 (PE-5)</option>
                    <option value="6">Professional Elective 6 (PE-6)</option>
                    <option value="7">Professional Elective 7 (PE-7)</option>
                    <option value="8">Professional Elective 8 (PE-8)</option>
                  </>
                ) : filters.elective_type === 'OE' ? (
                  <>
                    <option value="1">Open Elective 1 (OE-1)</option>
                    <option value="2">Open Elective 2 (OE-2)</option>
                    <option value="3">Open Elective 3 (OE-3)</option>
                    <option value="4">Open Elective 4 (OE-4)</option>
                    <option value="5">Open Elective 5 (OE-5)</option>
                    <option value="6">Open Elective 6 (OE-6)</option>
                    <option value="7">Open Elective 7 (OE-7)</option>
                    <option value="8">Open Elective 8 (OE-8)</option>
                  </>
                ) : (
                  <>
                    <option value="1">Elective 1 (PE-1 / OE-1)</option>
                    <option value="2">Elective 2 (PE-2 / OE-2)</option>
                    <option value="3">Elective 3 (PE-3 / OE-3)</option>
                    <option value="4">Elective 4 (PE-4 / OE-4)</option>
                    <option value="5">Elective 5 (PE-5 / OE-5)</option>
                    <option value="6">Elective 6 (PE-6 / OE-6)</option>
                    <option value="7">Elective 7 (PE-7 / OE-7)</option>
                    <option value="8">Elective 8 (PE-8 / OE-8)</option>
                  </>
                )}
              </select>

              <select
                value={filters.batch}
                onChange={(e) => setFilters({ ...filters, batch: e.target.value, section: 'ALL' })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-800"
              >
                <option value="ALL">All Batches</option>
                {availableBatches.map(b => (
                  <option key={b} value={b}>Batch {b}</option>
                ))}
              </select>

              {/* Subject-Wise Filter Dropdown */}
              <select
                value={filters.subject_id}
                onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white max-w-[220px] truncate"
              >
                <option value="ALL">All Subjects</option>
                {(filters.elective_type === 'PE'
                  ? peSubjects
                  : filters.elective_type === 'OE'
                    ? oeSubjects
                    : [...peSubjects, ...oeSubjects]
                ).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>

              {/* Student Branch Filter */}
              <select
                value={filters.student_branch || 'ALL'}
                onChange={(e) => setFilters({ ...filters, student_branch: e.target.value, section: 'ALL' })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white"
              >
                <option value="ALL">All Registered Branches</option>
                {registeredBranches.map(b => (
                  <option key={b} value={b}>{b} Students</option>
                ))}
              </select>

              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-800"
              >
                <option value="ALL">All Sections</option>
                {availableAllotmentSections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="ALLOTTED">ALLOTTED</option>
                <option value="WAITLISTED">WAITLISTED</option>
              </select>

              {(filters.search || filters.elective_type !== 'ALL' || filters.elective_number !== 'ALL' || filters.batch !== 'ALL' || filters.subject_id !== 'ALL' || filters.student_branch !== 'ALL' || filters.section !== 'ALL' || filters.status !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => setFilters({
                    elective_type: 'ALL',
                    elective_number: 'ALL',
                    batch: 'ALL',
                    coordinatorBranch: coordinatorBranch,
                    student_branch: 'ALL',
                    section: 'ALL',
                    status: 'ALL',
                    subject_id: 'ALL',
                    search: ''
                  })}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Print & Export Options */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => coordinatorService.exportAllotmentsCSV(allotments, 'elective_allotments_export.csv')}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={triggerSectionPrint}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Filtered List ({allotments.length})</span>
              </button>
            </div>

          </div>

          {/* Allotment Records Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">
                  Official Allotment Master List
                </h3>
                <p className="text-xs text-gray-500">
                  Showing {allotments.length} processed student records. Click "Modify" to re-assign or "Reset" to unlock selection for student.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Elective</th>
                    <th className="px-4 py-3">Student Email</th>
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Branch & Sec</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Allotted Subject</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allotments.map((item) => {
                    const subjectDisplay = item.status === 'ALLOTTED'
                      ? (item.subjectCode && item.subjectCode !== 'N/A' ? `${item.subjectCode} - ${item.subjectName}` : (item.subjectName || 'Allotted'))
                      : (item.status === 'WAITLISTED' ? 'WAITLISTED (No Vacancy)' : (item.subjectName || '—'));

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold font-mono text-[10px] border border-purple-200">
                            {item.elective_type}-{item.elective_number || 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.studentEmail}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-800">{item.rollNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.studentName}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{item.branch} - Sec {item.section} (Sem {item.semester})</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.elective_type === 'PE' ? 'bg-crimson-100 text-crimson-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.elective_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {item.status === 'WAITLISTED' ? (
                            <span className="text-amber-700 font-semibold italic">WAITLISTED (No Vacancy)</span>
                          ) : (
                            subjectDisplay
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.priority_selected ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                              Priority {item.priority_selected}
                            </span>
                          ) : item.status === 'ALLOTTED' ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Manual</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            item.status === 'ALLOTTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-[11px]">
                          {item.allotted_at ? new Date(item.allotted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          {item.elective_type === 'PE' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAllotmentForOverride(item);
                                  setOverrideModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-crimson-700 bg-crimson-50 hover:bg-crimson-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Manually modify PE allotted subject"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Modify</span>
                              </button>
                              <button
                                onClick={() => handleUnlockSelection(item.student_id, item.elective_type)}
                                className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Reset choice and unlock preference form for this student"
                              >
                                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reset</span>
                              </button>
                            </>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold text-[10px] inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-gray-400" />
                              <span>OE (Admin Managed)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allotments.length === 0 && (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-gray-400">
                        No allotment records found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">
                  Coordinator Action Audit Trail
                </h3>
                <p className="text-xs text-gray-500">
                  Immutable log of manual allotment overrides, resets, and batch enrollments.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target Student / Entity</th>
                    <th className="px-4 py-3">Previous Value</th>
                    <th className="px-4 py-3">New Value</th>
                    <th className="px-4 py-3">Reason / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-crimson-700">{log.studentEmail}</td>
                      <td className="px-4 py-3 text-gray-500">{log.old_value || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{log.new_value || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 italic">{log.reason}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Upload Curriculum Excel Modal */}
      <CurriculumUploadModal
        isOpen={curriculumUploadModalOpen}
        onClose={() => setCurriculumUploadModalOpen(false)}
        onSaveBatch={handleSaveCurriculumBatchExcel}
        coordinatorBranch={coordinatorBranch}
        initialBatch={curriculumBatch}
      />

      {/* 2. Add / Edit Single Curriculum Subject Modal */}
      <CurriculumSubjectModal
        isOpen={curriculumSubjectModalOpen}
        onClose={() => {
          setCurriculumSubjectModalOpen(false);
          setEditingCurriculumSubject(null);
        }}
        onSave={handleSaveCurriculumSingleSubject}
        editingSubject={editingCurriculumSubject}
        coordinatorBranch={coordinatorBranch}
        registeredBranches={registeredBranches}
        defaultBatch={curriculumBatch}
      />

      {/* 3. Configure PE Selection Drive Modal */}
      <PESelectionDriveModal
        isOpen={peDriveModalOpen}
        onClose={() => setPeDriveModalOpen(false)}
        onSave={handleSavePEDrive}
        coordinatorBranch={coordinatorBranch}
        availableBatches={availableBatches}
        initialBatch={peDriveModalDefaults.batch}
        initialSemester={peDriveModalDefaults.semester}
      />

      {/* 3.5 Offer Elective from Curriculum Modal */}
      <OfferElectiveModal
        isOpen={offerElectiveModalOpen}
        onClose={() => setOfferElectiveModalOpen(false)}
        electiveType={offerElectiveType}
        coordinatorBranch={coordinatorBranch}
        registeredBranches={registeredBranches}
        curriculumList={curriculumList}
        peDrives={peDrives}
        adminWindows={adminWindows}
        onActivate={handleActivateOfferingsFromModal}
        onOpenCustomSubjectModal={(type, batch, sem, elNum) => {
          setEditingSubject(null);
          setSubjectModalType(type);
          setSubjectModalDefaults({
            batch: batch || '',
            semester: Number(sem || 5),
            elective_number: Number(elNum || 1),
            regulation: 'AR23'
          });
          setSubjectModalOpen(true);
        }}
        onOpenEstablishDriveModal={(batchOrObj, sem) => {
          const batchVal = (typeof batchOrObj === 'object' ? batchOrObj?.batch : batchOrObj) || '';
          const semVal = (typeof batchOrObj === 'object' ? batchOrObj?.semester : sem) || 5;
          const elNumVal = (typeof batchOrObj === 'object' ? batchOrObj?.elective_number : 1) || 1;
          setPeDriveModalDefaults({
            batch: normalizeBatch(batchVal),
            semester: Number(semVal)
          });
          setResumeOfferingAfterDrive({
            batch: normalizeBatch(batchVal),
            semester: Number(semVal),
            elective_number: Number(elNumVal),
            type: 'PE'
          });
          setPeDriveModalOpen(true);
        }}
        initialBatch={offerElectiveDefaults.batch}
        initialSemester={offerElectiveDefaults.semester}
        initialElectiveNumber={offerElectiveDefaults.elective_number}
      />

      {/* 4. Subject Create/Edit Modal (Custom/Manual) */}
      <SubjectModal
        isOpen={subjectModalOpen}
        onClose={() => {
          setSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        onSave={handleSaveSubject}
        editingSubject={editingSubject}
        defaultType={subjectModalType}
        defaultBatch={subjectModalDefaults.batch}
        defaultSemester={subjectModalDefaults.semester}
        defaultElectiveNumber={subjectModalDefaults.elective_number}
        defaultRegulation={subjectModalDefaults.regulation}
        coordinatorBranch={coordinatorBranch}
        registeredBranches={registeredBranches}
      />

      {/* 5. Enroll Single Student Modal */}
      <AddStudentModal
        isOpen={addStudentModalOpen}
        onClose={() => setAddStudentModalOpen(false)}
        onSave={handleSaveStudent}
        coordinatorBranch={coordinatorBranch}
      />

      {/* 6. Edit Student Details Modal */}
      <EditStudentModal
        isOpen={editStudentModalOpen}
        onClose={() => {
          setEditStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onUpdate={handleSaveEditStudent}
        student={editingStudent}
        coordinatorBranch={coordinatorBranch}
      />

      {/* 7. Batch / Bulk Edit Students Modal */}
      <BulkEditStudentsModal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        onBulkUpdate={handleBulkUpdate}
        selectedCount={selectedStudentIds.length}
      />

      {/* 8. Bulk Excel/CSV Import Modal */}
      <ImportStudentsModal
        isOpen={importStudentsModalOpen}
        onClose={() => setImportStudentsModalOpen(false)}
        onImportSuccess={handleBulkImportStudents}
        coordinatorBranch={coordinatorBranch}
      />

      {/* 9. Manual Override Modal */}
      <ManualOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onSave={handleSaveOverride}
        allotmentRecord={selectedAllotmentForOverride}
        eligibleSubjects={selectedAllotmentForOverride?.elective_type === 'OE' ? oeSubjects : peSubjects}
      />

      {/* 10. PRINT-ONLY COMPONENT */}
      <PrintAllotmentView
        records={printConfig.records && printConfig.records.length > 0 ? printConfig.records : allotments}
        reportType={printConfig.reportType}
        title={printConfig.title}
        subtitle={printConfig.subtitle}
        filters={printConfig.filters || filters}
      />

    </div>
  );
}
