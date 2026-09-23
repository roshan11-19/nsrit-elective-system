import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Globe, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Award,
  Sparkles,
  Lock,
  Radio,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const currentSem = Number(currentUser?.semester || 5);
  const [peAllotments, setPeAllotments] = useState([]);
  const [oeAllotments, setOeAllotments] = useState([]);
  const [pePrefs, setPePrefs] = useState([]);
  const [oePrefs, setOePrefs] = useState([]);
  const [pastAllotments, setPastAllotments] = useState([]);
  const [peSemester, setPeSemester] = useState(currentSem);
  const [oeSemester, setOeSemester] = useState(currentSem);
  const [peWindowInfo, setPeWindowInfo] = useState(null);
  const [oeWindowInfo, setOeWindowInfo] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const sem = Number(currentUser.semester || 5);
        setPeSemester(sem);
        setOeSemester(sem);

        const allAllots = await studentService.getAllotments(currentUser.id, 'ALL', currentUser.email);
        // Filter allotments from previous semesters
        const past = (allAllots || []).filter(a => Number(a.semester || a.subject?.semester || 5) !== sem);
        setPastAllotments(past);
      } catch (err) {
        console.error('Error loading student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [currentUser]);

  useEffect(() => {
    async function updatePEData() {
      if (!currentUser) return;
      try {
        const [peA, peP, peWin] = await Promise.all([
          studentService.getAllotments(currentUser.id, 'PE', currentUser.email, peSemester),
          studentService.getSubmittedPreferences(currentUser.id, 'PE', peSemester),
          studentService.isSelectionOpen(currentUser, 'PE', peSemester)
        ]);
        setPeAllotments(peA || []);
        setPePrefs(peP || []);
        setPeWindowInfo(peWin || null);
      } catch (err) {
        console.warn('Update PE data note:', err);
      }
    }
    updatePEData();
  }, [currentUser, peSemester]);

  useEffect(() => {
    async function updateOEData() {
      if (!currentUser) return;
      try {
        const [oeA, oeP, oeWin] = await Promise.all([
          studentService.getAllotments(currentUser.id, 'OE', currentUser.email, oeSemester),
          studentService.getSubmittedPreferences(currentUser.id, 'OE', oeSemester),
          studentService.isSelectionOpen(currentUser, 'OE', oeSemester)
        ]);
        setOeAllotments(oeA || []);
        setOePrefs(oeP || []);
        setOeWindowInfo(oeWin || null);
      } catch (err) {
        console.warn('Update OE data note:', err);
      }
    }
    updateOEData();
  }, [currentUser, oeSemester]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-crimson-200 border-t-crimson-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPeLocked = Boolean(peAllotments.length > 0 || pePrefs.length > 0);
  const isOeLocked = Boolean(oeAllotments.length > 0 || oePrefs.length > 0);

  return (
    <div className="space-y-6">
      
      {/* 1. LIVE SCROLLING TICKER / MARQUEE BAR */}
      <div className="bg-gradient-to-r from-crimson-900 via-crimson-700 to-crimson-900 text-white overflow-hidden py-2.5 px-4 shadow-sm border-b border-crimson-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-crimson-800 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-crimson-600 animate-ping"></span>
            <span>LIVE ALLOTMENT</span>
          </div>

          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="inline-block animate-marquee text-xs font-semibold tracking-wide space-x-12">
              <span>📢 Professional Elective (PE) & Open Elective (OE) subject selection is ACTIVE.</span>
              <span>⚡ Allotments are calculated INSTANTLY in real-time using First-In, First-Out (FIFO) timestamp order.</span>
              <span>🔒 Once preferences are submitted, choices are permanently locked to guarantee allotment integrity.</span>
              <span>🎓 Welcome {currentUser?.name} ({currentUser?.email}) • Semester {currentUser?.semester} {currentUser?.branch}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
        
        {/* 2. WELCOME & ACADEMIC PROFILE CARD */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-crimson-100/40 via-coral-light/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-200 text-xs font-bold text-crimson-700 uppercase tracking-wider">
                <span>Verified Student Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-display tracking-tight">
                Welcome, {currentUser?.name}
              </h1>
              <p className="text-xs text-gray-500 max-w-xl">
                Select and prioritize your Professional Electives and Open Electives. Allotments are calculated atomically in real-time upon your submission.
              </p>
            </div>

            {/* Key Identifiers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-50 p-4 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">College Email</span>
                <span className="font-bold text-gray-900 truncate block text-xs">{currentUser?.email}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Roll Number</span>
                <span className="font-extrabold text-gray-900 font-mono text-sm">{currentUser?.roll_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Branch & Sec</span>
                <span className="font-bold text-gray-900 text-sm">{currentUser?.branch} - {currentUser?.section || 'A'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Semester</span>
                <span className="font-bold text-crimson-700 text-sm">Sem {currentUser?.semester}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAIN TWO ELECTIVE MODULES (PE & OE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Module 1: Professional Elective (PE) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card hover:border-crimson-300 hover:shadow-card-hover transition-all flex flex-col justify-between overflow-hidden group">
            <div className="p-6 sm:p-8 space-y-5">
              
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-2xl bg-crimson-50 text-crimson-700 border border-crimson-200/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                
                {isPeLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Submitted & Locked</span>
                  </span>
                ) : peWindowInfo?.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Selection Active {peWindowInfo.activeElectiveNumbers?.length > 0 ? `(${peWindowInfo.activeElectiveNumbers.map(n => `PE-${n}`).join(', ')})` : ''}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Drive Inactive (Preview Mode)</span>
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Department Elective</div>
                <h2 className="text-2xl font-bold text-gray-900 font-display mt-0.5">
                  Professional Elective (PE)
                </h2>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Specialized domain courses exclusive to <strong>{currentUser?.branch}</strong> students in Semester {currentUser?.semester}.
                </p>

                {/* Due Date Indicator (Individual Per-Elective Deadlines) */}
                {peWindowInfo?.allRelevantWins && peWindowInfo.allRelevantWins.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {peWindowInfo.allRelevantWins.filter(w => w.due_date).map(w => {
                      const eNum = Number(w.elective_number || 1);
                      const isPast = new Date() > new Date(w.due_date);
                      return (
                        <div key={w.id || eNum} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                          isPast ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                          <Clock className={`w-3.5 h-3.5 ${isPast ? 'text-rose-600' : 'text-blue-600'}`} />
                          <span>
                            <strong>PE-{eNum} Deadline:</strong> {new Date(w.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            {isPast ? ' (Expired)' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : peWindowInfo?.dueDate ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Deadline: <strong>{new Date(peWindowInfo.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                      {new Date() > new Date(peWindowInfo.dueDate) ? ' (Expired)' : ''}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Allotment Status Card */}
              {peAllotments.length > 0 ? (
                !peAllotments[0]?.allotment_revealed ? (
                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Preferences Submitted & Locked</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Your subject priority rankings have been submitted. Allotment results are pending official publication by the Department Coordinator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {peAllotments.map((a, idx) => (
                      <div key={a.id || idx} className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        a.status === 'ALLOTTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-crimson-100 text-crimson-800 font-mono text-[10px]">
                              PE-{a.elective_number || idx + 1}
                            </span>
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>{a.status === 'ALLOTTED' ? `Allotted (Priority ${a.priority_selected || 'Assigned'})` : 'WAITLISTED'}</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {a.allotted_at ? new Date(a.allotted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </div>
                        {a.status === 'ALLOTTED' && (a.subject?.subject_name || a.subject_name) && (
                          <div className="text-sm font-extrabold text-gray-900">
                            {a.subject?.subject_name || a.subject_name} {(a.subject?.subject_code || a.subject_code) && (a.subject?.subject_code || a.subject_code) !== 'N/A' ? `(${a.subject?.subject_code || a.subject_code})` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-crimson-600 flex-shrink-0" />
                  <span>Prioritize your subjects now. First-In, First-Out rule applies.</span>
                </div>
              )}

              {/* Semester Selection for PE */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Select Academic Semester</span>
                  <span className="text-[10px] text-gray-500">{currentUser?.admitted_batch ? `Batch ${currentUser.admitted_batch}` : 'Batch N/A'}</span>
                </div>
                <select
                  value={peSemester}
                  onChange={(e) => setPeSemester(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white text-crimson-800 shadow-2xs focus:ring-2 focus:ring-crimson-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Action Bar */}
            <div className="p-6 sm:px-8 sm:py-5 bg-surface-50 border-t border-gray-100 flex items-center justify-between">
              {isPeLocked ? (
                !peAllotments[0]?.allotment_revealed ? (
                  <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Allotment Publication Pending</span>
                  </span>
                ) : (
                  <Link
                    to={`/student/allotment?type=PE&semester=${currentSem}`}
                    className="text-xs font-bold text-crimson-700 hover:text-crimson-800 flex items-center gap-1"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>View Official Allotment Memo</span>
                  </Link>
                )
              ) : (
                <span className="text-xs text-gray-500 font-medium">{peWindowInfo?.isOpen ? 'Ready to Submit' : 'Drive Inactive (Preview Only)'}</span>
              )}

              <Link
                to={`/student/select?type=PE&semester=${peSemester}`}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all text-white crimson-gradient-btn"
              >
                <span>{isPeLocked ? (!peAllotments[0]?.allotment_revealed ? 'View Submitted Choices' : 'View Choices & Allotment') : (peWindowInfo?.isOpen ? 'Prioritize Subjects' : 'Explore Offered Subjects')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module 2: Open Elective (OE) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card hover:border-crimson-300 hover:shadow-card-hover transition-all flex flex-col justify-between overflow-hidden group">
            <div className="p-6 sm:p-8 space-y-5">
              
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-2xl bg-coral/10 text-crimson-700 border border-coral/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Globe className="w-7 h-7" />
                </div>

                {isOeLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Submitted & Locked</span>
                  </span>
                ) : oeWindowInfo?.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Selection Active {oeWindowInfo.activeElectiveNumbers?.length > 0 ? `(${oeWindowInfo.activeElectiveNumbers.map(n => `OE-${n}`).join(', ')})` : ''}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Drive Inactive (Preview Mode)</span>
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Interdisciplinary Elective</div>
                <h2 className="text-2xl font-bold text-gray-900 font-display mt-0.5">
                  Open Elective (OE)
                </h2>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Interdisciplinary subjects open across multiple departments for broad academic enrichment in Semester {currentSem}.
                </p>

                {/* Due Date Indicator (Individual Per-Elective Deadlines) */}
                {oeWindowInfo?.allRelevantWins && oeWindowInfo.allRelevantWins.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {oeWindowInfo.allRelevantWins.filter(w => w.due_date).map(w => {
                      const eNum = Number(w.elective_number || 1);
                      const isPast = new Date() > new Date(w.due_date);
                      return (
                        <div key={w.id || eNum} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                          isPast ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                          <Clock className={`w-3.5 h-3.5 ${isPast ? 'text-rose-600' : 'text-blue-600'}`} />
                          <span>
                            <strong>OE-{eNum} Deadline:</strong> {new Date(w.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            {isPast ? ' (Expired)' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : oeWindowInfo?.dueDate ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Deadline: <strong>{new Date(oeWindowInfo.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                      {new Date() > new Date(oeWindowInfo.dueDate) ? ' (Expired)' : ''}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Allotment Status Card */}
              {oeAllotments.length > 0 ? (
                !oeAllotments[0]?.allotment_revealed ? (
                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Preferences Submitted & Locked</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Your subject priority rankings have been submitted. Allotment results are pending official publication by the College Administrator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {oeAllotments.map((a, idx) => (
                      <div key={a.id || idx} className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        a.status === 'ALLOTTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px]">
                              OE-{a.elective_number || idx + 1}
                            </span>
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>{a.status === 'ALLOTTED' ? `Allotted (Priority ${a.priority_selected || 'Assigned'})` : 'WAITLISTED'}</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {a.allotted_at ? new Date(a.allotted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </div>
                        {a.status === 'ALLOTTED' && (a.subject?.subject_name || a.subject_name) && (
                          <div className="text-sm font-extrabold text-gray-900">
                            {a.subject?.subject_name || a.subject_name} {(a.subject?.subject_code || a.subject_code) && (a.subject?.subject_code || a.subject_code) !== 'N/A' ? `(${a.subject?.subject_code || a.subject_code})` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-crimson-600 flex-shrink-0" />
                  <span>Prioritize your subjects now. First-In, First-Out rule applies.</span>
                </div>
              )}

              {/* Semester Selection for OE */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Select Academic Semester</span>
                  <span className="text-[10px] text-gray-500">{currentUser?.admitted_batch ? `Batch ${currentUser.admitted_batch}` : 'Batch N/A'}</span>
                </div>
                <select
                  value={oeSemester}
                  onChange={(e) => setOeSemester(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white text-crimson-800 shadow-2xs focus:ring-2 focus:ring-crimson-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Action Bar */}
            <div className="p-6 sm:px-8 sm:py-5 bg-surface-50 border-t border-gray-100 flex items-center justify-between">
              {isOeLocked ? (
                !oeAllotments[0]?.allotment_revealed ? (
                  <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Allotment Publication Pending</span>
                  </span>
                ) : (
                  <Link
                    to={`/student/allotment?type=OE&semester=${currentSem}`}
                    className="text-xs font-bold text-crimson-700 hover:text-crimson-800 flex items-center gap-1"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>View Official Allotment Memo</span>
                  </Link>
                )
              ) : (
                <span className="text-xs text-gray-500 font-medium">{oeWindowInfo?.isOpen ? 'Ready to Submit' : 'Drive Inactive (Preview Only)'}</span>
              )}

              <Link
                to={`/student/select?type=OE&semester=${oeSemester}`}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all text-white crimson-gradient-btn"
              >
                <span>{isOeLocked ? (!oeAllotments[0]?.allotment_revealed ? 'View Submitted Choices' : 'View Choices & Allotment') : (oeWindowInfo?.isOpen ? 'Prioritize Subjects' : 'Explore Offered Subjects')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

        {/* 4. ACADEMIC HISTORY / COMPLETED PAST SEMESTERS */}
        {pastAllotments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 font-display">
                    Academic History & Past Allotments
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    Archived & Read-Only
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Elective courses completed and verified in previous academic semesters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastAllotments.map((a, idx) => {
                const subjName = a.subject?.subject_name || a.subject_name || 'Allotted Elective Course';
                const subjCode = a.subject?.subject_code || a.subject_code || 'N/A';
                const subjBranch = a.subject?.branch || a.subject_branch || 'N/A';
                const semNum = a.semester || a.subject?.semester || 'Past';

                return (
                  <div key={a.id || idx} className="p-4 rounded-xl border border-gray-200 bg-surface-50/70 space-y-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-bold text-[10px]">
                          Semester {semNum}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-crimson-100 text-crimson-800 font-mono font-bold text-[10px]">
                          {a.elective_type}-{a.elective_number || 1}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {subjName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                        {subjCode !== 'N/A' && <span className="font-mono font-bold">{subjCode}</span>}
                        {subjCode !== 'N/A' && <span>•</span>}
                        <span>Dept: {subjBranch}</span>
                        {a.priority_selected && (
                          <>
                            <span>•</span>
                            <span>Choice #{a.priority_selected}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono">
                        {a.allotted_at ? new Date(a.allotted_at).toLocaleDateString() : 'Archived'}
                      </span>
                      <Link
                        to={`/student/allotment?type=${a.elective_type}&semester=${semNum}`}
                        className="text-xs font-bold text-crimson-700 hover:text-crimson-800 flex items-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>View Official Memo</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
