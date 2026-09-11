import React, { useState, useEffect } from 'react';
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
  Trash2, 
  KeyRound, 
  Sparkles, 
  Layers, 
  BarChart3, 
  GraduationCap, 
  RefreshCw, 
  Mail, 
  ChevronRight, 
  Send, 
  Eye, 
  EyeOff, 
  Calendar, 
  Play, 
  Pause, 
  Lock, 
  Plus, 
  RotateCcw, 
  Info 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { coordinatorService } from '../../services/coordinatorService';
import Modal from '../../components/common/Modal';
import PrintAllotmentView from '../../components/coordinator/PrintAllotmentView';

export default function AdminDashboard() {
  const { currentUser, showToast } = useAuth();

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
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveActionLoading, setDriveActionLoading] = useState(false);
  const [driveFormData, setDriveFormData] = useState({
    batch: '',
    semester: 5,
    elective_type: 'OE',
    status: 'ACTIVE'
  });

  // Allotments State
  const [allotments, setAllotments] = useState([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [coordList, allotList, stats, windows, currBatches] = await Promise.all([
        adminService.getCoordinators(),
        adminService.getInstitutionAllotments(allotmentFilters),
        adminService.getInstitutionAnalytics(),
        adminService.getSelectionWindows(),
        coordinatorService.getCurriculumBatches()
      ]);
      setCoordinators(coordList);
      setAllotments(allotList);
      setAnalytics(stats);
      setSelectionWindows(windows);
      setCurriculumBatches(currBatches);
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

  const handleStartWindow = async (windowId) => {
    try {
      setDriveActionLoading(true);
      const updated = await adminService.startSelectionWindow(windowId);
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
      const updated = await adminService.createSelectionWindow({
        ...driveFormData,
        elective_type: 'OE'
      });
      setSelectionWindows(updated);
      setDriveModalOpen(false);
      showToast(`Open Elective (OE) Selection Drive for Batch ${driveFormData.batch} configured.`);
    } catch (err) {
      showToast(err.message || 'Failed to configure selection drive.', 'error');
    } finally {
      setDriveActionLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [allotmentFilters]);

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

  // Derived available batches & sections for filtering
  const availableBatches = Array.from(new Set([
    ...curriculumBatches,
    ...selectionWindows.map(w => w.batch),
    ...allotments.map(a => a.admitted_batch || a.batch)
  ].filter(Boolean))).sort();

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
          <span>Batch Allotment Control ({selectionWindows.length})</span>
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
                  {availableBatches.map(b => (
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

          {/* Master Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Student Particulars</th>
                    <th className="px-4 py-3">Branch & Section</th>
                    <th className="px-4 py-3">Elective Category</th>
                    <th className="px-4 py-3">Allotted Subject</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Allotment Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allotments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
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
                        {a.priority_selected ? (
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
                    </tr>
                  ))}

                  {allotments.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-400">
                        No allotment records found matching the active filters.
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
      {/* TAB 4: BATCH-WISE ALLOTMENT START / SELECTION WINDOWS (OE INSTITUTION) */}
      {/* ===================================================================== */}
      {activeTab === 'BATCH_SCHEDULE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  Institution Open Elective (OE) Drive Control
                </span>
                <span className="text-xs text-gray-500">• Central Administrator Control</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 font-display mt-1">
                Batch-Wise Open Elective (OE) Selection Windows
              </h3>
              <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
                Students across all departments choose Open Electives during institutional drives established here. (Department Professional Elective drives are managed individually by Branch Coordinators).
              </p>
            </div>

            <button
              onClick={() => {
                setDriveFormData({
                  batch: curriculumBatches[0] || availableBatches[0] || '',
                  semester: 5,
                  elective_type: 'OE',
                  status: 'ACTIVE'
                });
                setDriveModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-2 shadow-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Configure New OE Batch Drive</span>
            </button>
          </div>

          {/* Drives Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Academic Batch</th>
                    <th className="px-4 py-3.5">Semester</th>
                    <th className="px-4 py-3.5">Elective Category</th>
                    <th className="px-4 py-3.5">Drive Title</th>
                    <th className="px-4 py-3.5 text-center">Portal Status</th>
                    <th className="px-4 py-3.5 text-right">Actions (Start / Pause / Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectionWindows.map((win) => {
                    const isActive = win.status === 'ACTIVE';
                    return (
                      <tr key={win.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-gray-900 text-sm">
                          {win.batch}
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-700">
                          Semester {win.semester}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800">
                            Open Elective (OE)
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
                            <span>{isActive ? 'SELECTION OPEN (ACTIVE)' : 'PAUSED / LOCKED'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          {!isActive ? (
                            <button
                              onClick={() => handleStartWindow(win.id)}
                              disabled={driveActionLoading}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 shadow-sm disabled:opacity-50"
                              title="Start or resume selection for this batch"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Selection</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStopWindow(win.id)}
                              disabled={driveActionLoading}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs disabled:opacity-50"
                              title="Stop or pause selection for this batch"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Stop / Pause Selection</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteWindow(win.id, win.title)}
                            disabled={driveActionLoading}
                            className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                            title="Delete Batch Selection Window"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {selectionWindows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        No batch selection windows configured. Click "Configure New OE Batch Drive" above to create one.
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
            {curriculumBatches.length > 0 ? (
              <select
                value={driveFormData.batch}
                onChange={(e) => setDriveFormData({ ...driveFormData, batch: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800"
              >
                {curriculumBatches.map(b => (
                  <option key={b} value={b}>Batch {b}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
                No curriculum batches uploaded yet. Coordinators must first upload curriculum before establishing drives.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Semester *
              </label>
              <select
                value={driveFormData.semester}
                onChange={(e) => setDriveFormData({ ...driveFormData, semester: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Elective Category
              </label>
              <div className="px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <span>Open Elective (OE)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Institution Open Elective Control</p>
              <p className="text-blue-800 text-[10px] mt-0.5">
                Admin controls college-wide Open Electives (OE). Department Professional Electives (PE) are managed individually by respective Branch Coordinators.
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
              disabled={driveActionLoading || curriculumBatches.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{driveActionLoading ? 'Configuring...' : 'Establish OE Drive'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT-ONLY COMPONENT */}
      <PrintAllotmentView
        records={printConfig.records && printConfig.records.length > 0 ? printConfig.records : allotments}
        reportType={printConfig.reportType}
        title={printConfig.title}
        subtitle={printConfig.subtitle}
        filters={allotmentFilters}
      />

    </div>
  );
}
