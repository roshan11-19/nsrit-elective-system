import {
  INITIAL_PROFILES,
  INITIAL_SUBJECTS,
  INITIAL_PREFERENCES,
  INITIAL_ALLOTMENTS,
  INITIAL_AUDIT_LOGS
} from './mockData.js';

export function normalizeBatch(batchStr) {
  if (!batchStr) return '';
  return String(batchStr).trim().replace(/\s*[-–—]\s*/g, '-').replace(/\s+/g, '');
}

export function parseOfferedBranches(raw, fallback = ['ALL']) {
  if (!raw) return Array.isArray(fallback) ? fallback : [fallback];
  if (Array.isArray(raw)) {
    const list = raw.map(b => String(b || '').trim().toUpperCase()).filter(Boolean);
    return list.length > 0 ? list : (Array.isArray(fallback) ? fallback : [fallback]);
  }
  if (typeof raw === 'string') {
    let str = raw.trim();
    if (!str) return Array.isArray(fallback) ? fallback : [fallback];
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          const list = parsed.map(b => String(b || '').trim().toUpperCase()).filter(Boolean);
          return list.length > 0 ? list : (Array.isArray(fallback) ? fallback : [fallback]);
        }
      } catch (e) {}
    }
    const split = str.replace(/[\[\]"']/g, '').split(',').map(b => b.trim().toUpperCase()).filter(Boolean);
    return split.length > 0 ? split : (Array.isArray(fallback) ? fallback : [fallback]);
  }
  return Array.isArray(fallback) ? fallback : [fallback];
}

export function normalizeBranchName(branchStr) {
  if (!branchStr) return '';
  const clean = String(branchStr).trim().toUpperCase();
  if (clean === 'ALL' || clean === '*') return 'ALL';
  if (clean.includes('COMPUTER') || clean.includes('CSE') || clean === 'CS') return 'CSE';
  if (clean.includes('ELECTRONIC') || clean.includes('COMMUNICATION') || clean === 'ECE') return 'ECE';
  if (clean.includes('MECHANICAL') || clean === 'MECH' || clean === 'ME') return 'MECH';
  if (clean.includes('CIVIL') || clean === 'CE') return 'CIVIL';
  if (clean.includes('ELECTRICAL') || clean === 'EEE' || clean === 'EE') return 'EEE';
  if ((clean.includes('ARTIFICIAL') && clean.includes('DATA')) || clean === 'AIDS' || clean === 'AI&DS') return 'AIDS';
  if (clean.includes('ARTIFICIAL') || clean.includes('AIML') || clean === 'AI&ML') return 'AIML';
  if (clean.includes('INFORMATION') || clean === 'IT') return 'IT';
  if (clean.includes('BUSINESS') || clean === 'CSBS') return 'CSBS';
  return clean;
}

export function isBranchEligibleForSubject(subject, studentBranch) {
  if (!subject) return false;
  const cleanStudentBranch = normalizeBranchName(studentBranch);
  if (!cleanStudentBranch) return true;

  const sType = String(subject.elective_type || '').toUpperCase();
  const isPE = sType === 'PE' || sType === 'PROFESSIONAL ELECTIVE';
  const offeringBranch = normalizeBranchName(subject.branch);
  const rawOffered = parseOfferedBranches(subject.offered_branches, isPE ? (offeringBranch ? [offeringBranch] : ['ALL']) : ['ALL']);
  const offered = rawOffered.map(b => normalizeBranchName(b));

  if (isPE) {
    if (offeringBranch && offeringBranch === cleanStudentBranch) return true;
    if (!offeringBranch) return true;
    return offered.includes('ALL') || offered.includes(cleanStudentBranch);
  } else {
    // OE: Open Elective (must not be student's own offering department, and target branch must be eligible)
    if (offeringBranch && offeringBranch === cleanStudentBranch) {
      return false;
    }
    return offered.includes('ALL') || offered.includes(cleanStudentBranch);
  }
}

const KEYS = {
  PROFILES: 'aes_v2_profiles',
  DEPARTMENTS: 'aes_v2_departments',
  CURRICULUM: 'aes_v2_curriculum',
  SUBJECTS: 'aes_v2_subjects',
  PREFERENCES: 'aes_v2_preferences',
  ALLOTMENTS: 'aes_v2_allotments',
  AUDIT_LOGS: 'aes_v2_audit_logs',
  SELECTION_WINDOWS: 'aes_v2_selection_windows',
  CURRENT_USER: 'aes_v2_current_user',
  AUTO_ALLOCATION_HISTORY: 'aes_v2_auto_allocation_history'
};

// Automatically purge all legacy and local storage data to guarantee pure live Supabase data
try {
  [
    KEYS.PROFILES,
    KEYS.DEPARTMENTS,
    KEYS.CURRICULUM,
    KEYS.SUBJECTS,
    KEYS.PREFERENCES,
    KEYS.ALLOTMENTS,
    KEYS.AUDIT_LOGS,
    KEYS.SELECTION_WINDOWS,
    KEYS.AUTO_ALLOCATION_HISTORY,
    'aes_profiles',
    'aes_subjects',
    'aes_allotments',
    'aes_preferences',
    'aes_audit_logs',
    'aes_selection_windows',
    'aes_curriculum',
    'aes_departments'
  ].forEach(k => {
    localStorage.removeItem(k);
  });
} catch (e) {}

function getStored(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

export const db = {
  // Clear & reset
  resetAll: () => {
    localStorage.removeItem(KEYS.PROFILES);
    localStorage.removeItem(KEYS.SUBJECTS);
    localStorage.removeItem(KEYS.PREFERENCES);
    localStorage.removeItem(KEYS.ALLOTMENTS);
    localStorage.removeItem(KEYS.AUDIT_LOGS);
  },

  // Profiles
  getProfiles: (branch) => {
    const profiles = getStored(KEYS.PROFILES, INITIAL_PROFILES);
    if (branch && branch !== 'ALL') {
      return profiles.filter(p => p.branch === branch);
    }
    return profiles;
  },
  getProfileById: (id) => {
    if (!id) return null;
    return db.getProfiles().find(p => p.id === id);
  },
  getProfileByEmail: (email) => {
    if (!email) return null;
    const clean = String(email).toLowerCase().trim();
    return db.getProfiles().find(p => p.email?.toLowerCase().trim() === clean);
  },
  addProfile: (profile) => {
    const profiles = db.getProfiles();
    const cleanEmail = profile.email ? String(profile.email).toLowerCase().trim() : '';
    const existingIndex = profiles.findIndex(p => p.email?.toLowerCase().trim() === cleanEmail);
    if (existingIndex !== -1) {
      profiles[existingIndex] = {
        ...profiles[existingIndex],
        ...profile,
        email: cleanEmail,
        updated_at: new Date().toISOString()
      };
      setStored(KEYS.PROFILES, profiles);
      return profiles[existingIndex];
    }
    const newProfile = {
      id: profile.id || `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      password_changed: true,
      ...profile,
      email: cleanEmail
    };
    profiles.push(newProfile);
    setStored(KEYS.PROFILES, profiles);
    return newProfile;
  },
  bulkAddProfiles: (studentList) => {
    const profiles = db.getProfiles();
    const existingEmails = new Set(profiles.map(p => p.email?.toLowerCase().trim()));
    const added = [];

    studentList.forEach((student, idx) => {
      const cleanEmail = student.email?.toLowerCase().trim();
      if (!cleanEmail || existingEmails.has(cleanEmail)) return;

      const newProfile = {
        id: student.id || `s-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        password_changed: true,
        ...student,
        email: cleanEmail
      };
      profiles.push(newProfile);
      existingEmails.add(cleanEmail);
      added.push(newProfile);
    });

    setStored(KEYS.PROFILES, profiles);
    return added;
  },
  deleteProfile: (id) => {
    const profiles = db.getProfiles().filter(p => p.id !== id);
    setStored(KEYS.PROFILES, profiles);
    
    // Also clean up any preferences & allotments for deleted student
    const preferences = db.getPreferences().filter(p => p.student_id !== id);
    setStored(KEYS.PREFERENCES, preferences);

    const allotments = db.getAllotments().filter(a => a.student_id !== id);
    setStored(KEYS.ALLOTMENTS, allotments);

    return true;
  },
  updateProfile: (id, updates) => {
    const profiles = db.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates, updated_at: new Date().toISOString() };
      setStored(KEYS.PROFILES, profiles);
      return profiles[index];
    }
    return null;
  },
  setProfiles: (list) => setStored(KEYS.PROFILES, list),
  setSubjects: (list) => setStored(KEYS.SUBJECTS, list),
  setPreferences: (list) => setStored(KEYS.PREFERENCES, list),

  // Coordinators Management (College Admin)
  getCoordinators: () => db.getProfiles().filter(p => p.role === 'coordinator'),
  addCoordinator: (coord) => {
    const cleanEmail = String(coord.email || '').trim().toLowerCase();
    const cleanName = String(coord.name || '').trim();
    const cleanBranch = String(coord.branch || 'CSE').trim().toUpperCase();
    const payload = {
      ...coord,
      name: cleanName,
      email: cleanEmail,
      branch: cleanBranch,
      role: 'coordinator',
      password_changed: true,
      roll_number: coord.roll_number || `COORD-${cleanBranch}`
    };
    return db.addProfile(payload);
  },
  updateCoordinator: (id, updates) => {
    return db.updateProfile(id, updates);
  },
  deleteCoordinator: (id) => {
    return db.deleteProfile(id);
  },

  // Departments / Branches (Dynamic database catalog derived from registered coordinators & profiles)
  getDepartments: () => {
    const set = new Set();
    (db.getProfiles() || []).forEach(p => {
      if (p.branch && p.branch !== 'ALL') set.add(String(p.branch).trim().toUpperCase());
    });
    (db.getCurriculum() || []).forEach(c => {
      if (c.branch && c.branch !== 'ALL') set.add(String(c.branch).trim().toUpperCase());
    });
    (db.getSubjects() || []).forEach(s => {
      if (s.branch && s.branch !== 'ALL') set.add(String(s.branch).trim().toUpperCase());
    });
    (db.getSelectionWindows ? db.getSelectionWindows() : []).forEach(w => {
      if (w.branch && w.branch !== 'ALL') set.add(String(w.branch).trim().toUpperCase());
    });
    return Array.from(set).sort();
  },
  setDepartments: (depts) => setStored(KEYS.DEPARTMENTS, depts),
  addDepartment: (dept) => {
    const code = (typeof dept === 'string' ? dept : dept.code || dept.name || '').trim().toUpperCase();
    return code;
  },

  // Reset student elective selection so student can re-choose
  unlockStudentSelection: (studentId, electiveType, coordinatorId, semester = null, electiveNumber = null) => {
    const student = db.getProfileById(studentId) || db.getProfiles().find(p => p.id === studentId || p.email?.toLowerCase().trim() === String(studentId).toLowerCase().trim());
    const studentEmail = student?.email ? student.email.toLowerCase().trim() : null;
    const targetId = student?.id || studentId;

    // Remove allotment
    const allotments = db.getAllotments().filter(a => {
      const isMatch = a.student_id === targetId || (studentEmail && a.student_email && a.student_email.toLowerCase().trim() === studentEmail);
      if (isMatch && (!electiveType || a.elective_type === electiveType)) {
        if (electiveNumber && Number(a.elective_number || 1) !== Number(electiveNumber)) {
          return true;
        }
        if (!semester || Number(a.semester || 5) === Number(semester)) {
          return false;
        }
      }
      return true;
    });
    setStored(KEYS.ALLOTMENTS, allotments);

    // Remove preferences
    const preferences = db.getPreferences().filter(p => {
      const isMatch = p.student_id === targetId;
      if (isMatch && (!electiveType || p.elective_type === electiveType)) {
        if (electiveNumber && Number(p.elective_number || 1) !== Number(electiveNumber)) {
          return true;
        }
        if (!semester || Number(p.semester || 5) === Number(semester)) {
          return false;
        }
      }
      return true;
    });
    setStored(KEYS.PREFERENCES, preferences);

    // Recalculate subject vacancies
    db.syncSubjectSeats();

    // Add audit log
    db.addAuditLog({
      coordinatorId,
      studentId: targetId,
      action: 'UNLOCK_SELECTION',
      oldValue: 'Locked Preferences & Allotment',
      newValue: 'Selection Reset (Unlocked for Re-Selection)',
      reason: `Reset ${electiveType || 'PE & OE'}${electiveNumber ? `-${electiveNumber}` : ''}${semester ? ` Sem ${semester}` : ''} selection for ${student?.name || student?.email || studentId}`
    });

    return true;
  },

  // Subjects (PE and OE managed separately)
  getSubjects: (electiveType, branch, semester = null) => {
    const subjects = getStored(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const allotments = db.getAllotments().filter(a => a.status === 'ALLOTTED');

    // Dynamically calculate accurate available seats
    const calibrated = subjects.map(s => {
      const allottedCount = allotments.filter(a => a.subject_id === s.id).length;
      const totalSeats = Number(s.seats || 0);
      const available = Math.max(0, totalSeats - allottedCount);
      const sType = String(s.elective_type || 'PE').toUpperCase();
      const sBranch = s.branch ? normalizeBranchName(s.branch) : 'CSE';
      return {
        ...s,
        seats: totalSeats,
        available_seats: available,
        offered_branches: parseOfferedBranches(s.offered_branches, sType === 'PE' ? [sBranch] : ['ALL'])
      };
    });

    let result = calibrated;
    if (electiveType && electiveType !== 'ALL') {
      const eType = String(electiveType).toUpperCase();
      result = result.filter(s => String(s.elective_type || '').toUpperCase() === eType);
    }
    if (branch && branch !== 'ALL') {
      const bUpper = normalizeBranchName(branch);
      result = result.filter(s => {
        const sBranch = s.branch ? normalizeBranchName(s.branch) : '';
        return sBranch === bUpper;
      });
    }
    if (semester && semester !== 'ALL') {
      result = result.filter(s => Number(s.semester) === Number(semester));
    }
    return result;
  },
  getSubjectById: (id) => db.getSubjects().find(s => s.id === id),
  addSubject: (subject) => {
    const subjects = getStored(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const seatsCount = (subject.seats !== undefined && subject.seats !== '' && !isNaN(Number(subject.seats))) ? Number(subject.seats) : 60;
    const sType = String(subject.elective_type || 'PE').toUpperCase();
    const sBranch = subject.branch ? normalizeBranchName(subject.branch) : 'CSE';
    const defaultOffered = parseOfferedBranches(
      subject.offered_branches,
      sType === 'PE' ? [sBranch] : ['ALL']
    );

    const cleanCode = String(subject.subject_code || '').trim().toUpperCase().replace(/\s+/g, '');
    const cleanBranch = sBranch;
    const cleanSem = Number(subject.semester || 5);
    const cleanBatch = normalizeBatch(subject.admitted_batch || subject.batch || '');
    const cleanType = sType;
    const cleanNum = Number(subject.elective_number || 1);

    const existingIndex = subjects.findIndex(s => {
      if (subject.id && s.id === subject.id) return true;
      const sCode = String(s.subject_code || '').trim().toUpperCase().replace(/\s+/g, '');
      const sB = s.branch ? normalizeBranchName(s.branch) : '';
      const sSem = Number(s.semester || 5);
      const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
      const sT = String(s.elective_type || '').toUpperCase();
      const sN = Number(s.elective_number || 1);

      return sCode === cleanCode && sB === cleanBranch && sSem === cleanSem && sT === cleanType && sN === cleanNum && (!cleanBatch || !sBatch || sBatch === cleanBatch);
    });

    if (existingIndex !== -1) {
      subjects[existingIndex] = {
        ...subjects[existingIndex],
        ...subject,
        branch: cleanBranch,
        seats: seatsCount,
        available_seats: seatsCount,
        offered_branches: defaultOffered,
        updated_at: new Date().toISOString()
      };
      setStored(KEYS.SUBJECTS, subjects);
      return subjects[existingIndex];
    }

    const newSubject = {
      id: subject.id || `subj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      seats: seatsCount,
      available_seats: seatsCount,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...subject,
      branch: cleanBranch,
      offered_branches: defaultOffered,
      seats: seatsCount,
      available_seats: seatsCount
    };
    subjects.push(newSubject);
    setStored(KEYS.SUBJECTS, subjects);
    return newSubject;
  },
  updateSubject: (id, updates) => {
    const subjects = getStored(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const index = subjects.findIndex(s => s.id === id);
    if (index !== -1) {
      const current = subjects[index];
      const newSeats = updates.seats !== undefined ? Number(updates.seats) : current.seats;
      const sType = String(updates.elective_type || current.elective_type || 'PE').toUpperCase();
      const sBranch = updates.branch || current.branch || 'CSE';
      const cleanOffered = updates.offered_branches !== undefined
        ? parseOfferedBranches(updates.offered_branches, sType === 'PE' ? [sBranch] : ['ALL'])
        : parseOfferedBranches(current.offered_branches, sType === 'PE' ? [sBranch] : ['ALL']);
      
      subjects[index] = { 
        ...current, 
        ...updates, 
        seats: newSeats,
        offered_branches: cleanOffered,
        updated_at: new Date().toISOString() 
      };
      setStored(KEYS.SUBJECTS, subjects);
      db.recalculateFIFOAllotments({ subjectId: id });
      db.syncSubjectSeats();
      return subjects[index];
    }
    return null;
  },

  // Recalculate allotments for waitlisted/higher-preference students in FIFO order when seats change
  recalculateFIFOAllotments: ({ subjectId = null, batch = null, semester = null, elective_type = null, elective_number = null } = {}) => {
    const allSubjects = db.getSubjects();
    const targetSubj = subjectId ? allSubjects.find(s => s.id === subjectId) : null;
    const targetBatch = batch || targetSubj?.admitted_batch || null;
    const targetSem = semester || targetSubj?.semester || null;
    const targetType = elective_type || targetSubj?.elective_type || null;
    const targetNum = elective_number || targetSubj?.elective_number || null;

    const poolSubjects = allSubjects.filter(s => {
      if (!s.active) return false;
      if (targetSem && Number(s.semester) !== Number(targetSem)) return false;
      if (targetType && s.elective_type !== targetType) return false;
      if (targetNum && Number(s.elective_number || 1) !== Number(targetNum)) return false;
      if (targetBatch && s.admitted_batch && normalizeBatch(s.admitted_batch) !== normalizeBatch(targetBatch)) return false;
      return true;
    });

    if (poolSubjects.length === 0) return { success: true };

    const poolSubjectIds = new Set(poolSubjects.map(s => s.id));
    const allPreferences = db.getPreferences().filter(p => poolSubjectIds.has(p.subject_id));
    const allAllotments = db.getAllotments();

    // Group preferences by student
    const studentMap = {};
    allPreferences.forEach(p => {
      if (!studentMap[p.student_id]) {
        const student = db.getProfileById(p.student_id);
        const studentAllot = allAllotments.find(a => 
          a.student_id === p.student_id && 
          a.elective_type === (targetType || p.elective_type) && 
          Number(a.elective_number || 1) === Number(targetNum || p.elective_number || 1)
        );
        studentMap[p.student_id] = {
          student_id: p.student_id,
          student,
          submitted_at: p.submitted_at || studentAllot?.submitted_at || new Date().toISOString(),
          preferences: [],
          existingAllotment: studentAllot || null
        };
      }
      studentMap[p.student_id].preferences.push(p);
    });

    const sortedStudents = Object.values(studentMap).sort((a, b) => {
      const timeA = new Date(a.submitted_at).getTime();
      const timeB = new Date(b.submitted_at).getTime();
      return timeA - timeB;
    });

    const occupied = {};
    poolSubjects.forEach(s => { occupied[s.id] = 0; });

    allAllotments.forEach(a => {
      if (a.manual_override && a.status === 'ALLOTTED' && a.subject_id && occupied[a.subject_id] !== undefined) {
        occupied[a.subject_id] += 1;
      }
    });

    const nowIso = new Date().toISOString();
    let updatedAllotments = [...allAllotments];

    sortedStudents.forEach(entry => {
      if (entry.existingAllotment?.manual_override) return;

      const sortedPrefs = [...entry.preferences].sort((a, b) => Number(a.priority) - Number(b.priority));
      let assignedSubj = null;
      let assignedPriority = null;
      let status = 'WAITLISTED';

      for (const pref of sortedPrefs) {
        const subj = poolSubjects.find(s => s.id === pref.subject_id);
        if (subj) {
          const currentOcc = occupied[subj.id] || 0;
          if (Number(subj.seats) - currentOcc > 0) {
            assignedSubj = subj;
            assignedPriority = Number(pref.priority);
            status = 'ALLOTTED';
            occupied[subj.id] = currentOcc + 1;
            break;
          }
        }
      }

      const allotIdx = updatedAllotments.findIndex(a => 
        a.student_id === entry.student_id && 
        a.elective_type === (targetType || entry.preferences[0]?.elective_type) &&
        Number(a.elective_number || 1) === Number(targetNum || entry.preferences[0]?.elective_number || 1)
      );

      const payload = {
        id: entry.existingAllotment?.id || `allot-${entry.student_id}-${Date.now()}`,
        student_id: entry.student_id,
        roll_number: entry.student?.roll_number || 'N/A',
        student_name: entry.student?.name || 'Student',
        student_email: entry.student?.email || '',
        branch: entry.student?.branch || 'N/A',
        section: entry.student?.section || 'A',
        semester: Number(targetSem || entry.student?.semester || 5),
        elective_type: targetType || entry.preferences[0]?.elective_type || 'PE',
        elective_number: Number(targetNum || entry.preferences[0]?.elective_number || 1),
        subject_id: assignedSubj ? assignedSubj.id : null,
        priority_selected: assignedPriority,
        status,
        submitted_at: entry.submitted_at,
        allotted_at: nowIso,
        created_at: entry.existingAllotment?.created_at || nowIso,
        updated_at: nowIso
      };

      if (allotIdx !== -1) {
        updatedAllotments[allotIdx] = { ...updatedAllotments[allotIdx], ...payload };
      } else {
        updatedAllotments.push(payload);
      }
    });

    setStored(KEYS.ALLOTMENTS, updatedAllotments);
    db.syncSubjectSeats();
    return { success: true };
  },

  // When a coordinator deletes a subject:
  // 1. Remove subject
  // 2. Clear allotments for that subject and reset the locked status for affected students
  // 3. Clean up preferences referencing the deleted subject
  // 4. Recalculate remaining seats
  deleteSubject: (id, coordinatorId) => {
    const subjects = getStored(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const targetSubject = subjects.find(s => s.id === id);
    const remainingSubjects = subjects.filter(s => s.id !== id);
    setStored(KEYS.SUBJECTS, remainingSubjects);

    // Find all affected allotments
    const allAllotments = db.getAllotments();
    const affectedAllotments = allAllotments.filter(a => a.subject_id === id);
    const affectedStudentIds = new Set(affectedAllotments.map(a => a.student_id));

    // Remove allotments for this subject
    const updatedAllotments = allAllotments.filter(a => a.subject_id !== id);
    setStored(KEYS.ALLOTMENTS, updatedAllotments);

    // Also remove preferences that had this subject or for affected students so they return to previous unlocked stage
    const allPreferences = db.getPreferences();
    const updatedPreferences = allPreferences.filter(p => {
      if (p.subject_id === id) return false;
      // If student was allotted this deleted subject, reset their entire preference for this elective type so they can re-select
      if (affectedStudentIds.has(p.student_id) && targetSubject && p.elective_type === targetSubject.elective_type) {
        return false;
      }
      return true;
    });
    setStored(KEYS.PREFERENCES, updatedPreferences);

    // Recalculate remaining seats
    db.syncSubjectSeats();

    // Log audit
    db.addAuditLog({
      coordinatorId,
      studentId: null,
      action: 'SUBJECT_DELETED_AND_ALLOTMENTS_RESET',
      oldValue: targetSubject ? `${targetSubject.subject_code} - ${targetSubject.subject_name}` : id,
      newValue: `Subject removed. ${affectedStudentIds.size} student allotment(s) reset to unlocked stage.`,
      reason: `Subject deleted by coordinator. Affected students unlocked for re-selection.`
    });

    return true;
  },

  // Recalculate and synchronize all subject available_seats based on actual allotments
  syncSubjectSeats: () => {
    const subjects = getStored(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const allotments = db.getAllotments().filter(a => a.status === 'ALLOTTED');

    const updated = subjects.map(s => {
      const allottedCount = allotments.filter(a => a.subject_id === s.id).length;
      const totalSeats = Number(s.seats || 0);
      const available = Math.max(0, totalSeats - allottedCount);
      return {
        ...s,
        seats: totalSeats,
        available_seats: available
      };
    });

    setStored(KEYS.SUBJECTS, updated);
    return updated;
  },

  // Preferences & Instant FIFO Allotment
  getPreferences: () => getStored(KEYS.PREFERENCES, INITIAL_PREFERENCES),
  getStudentPreferences: (studentId, electiveType = null, semester = null) => {
    return db.getPreferences()
      .filter(p => {
        if (p.student_id !== studentId) return false;
        if (electiveType && electiveType !== 'ALL' && p.elective_type !== electiveType) return false;
        if (semester && semester !== 'ALL' && Number(p.semester || 5) !== Number(semester)) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  },

  // Atomic Instant FIFO Submission & Allocation per Elective
  submitAndAllot: (studentId, electiveType, subjectPriorities, semester = null) => {
    const student = db.getProfileById(studentId);
    if (!student) throw new Error('Student record not found.');

    const targetSem = Number(semester || student.semester || 5);
    const timestamp = new Date().toISOString();

    // Group incoming priorities by elective_number
    const electiveGroupMap = {};
    subjectPriorities.forEach(item => {
      const eNum = Number(item.elective_number || 1);
      if (!electiveGroupMap[eNum]) electiveGroupMap[eNum] = [];
      electiveGroupMap[eNum].push(item);
    });

    let currentPrefs = db.getPreferences();
    let currentAllots = db.getAllotments();
    const results = [];

    for (const [eNumStr, items] of Object.entries(electiveGroupMap)) {
      const eNum = Number(eNumStr);

      // Remove existing preferences for this specific elective_number
      currentPrefs = currentPrefs.filter(p => !(p.student_id === studentId && p.elective_type === electiveType && Number(p.elective_number || 1) === eNum && Number(p.semester || 5) === targetSem));

      // Save new preferences for this elective_number
      const newPrefs = items.map((item, idx) => ({
        id: `pref-${studentId}-${targetSem}-${eNum}-${idx}-${Date.now()}`,
        student_id: studentId,
        elective_type: electiveType,
        elective_number: eNum,
        semester: targetSem,
        subject_id: item.subject_id,
        priority: item.priority || (idx + 1),
        submitted_at: timestamp,
        created_at: timestamp
      }));
      currentPrefs.push(...newPrefs);

      // Perform FIFO allotment
      const subjects = db.getSubjects(electiveType, null, targetSem).filter(s => Number(s.elective_number || 1) === eNum);
      let allottedSubject = null;
      let allottedPriority = null;
      let status = 'WAITLISTED';

      for (const item of newPrefs) {
        const targetSubj = subjects.find(s => s.id === item.subject_id);
        if (targetSubj && targetSubj.available_seats > 0) {
          allottedSubject = targetSubj;
          allottedPriority = item.priority;
          status = 'ALLOTTED';
          break;
        }
      }

      // Remove existing allotment for this specific elective_number
      currentAllots = currentAllots.filter(a => !(a.student_id === studentId && a.elective_type === electiveType && Number(a.elective_number || 1) === eNum && Number(a.semester || 5) === targetSem));

      const newAllotment = {
        id: `allot-${studentId}-${electiveType}-${targetSem}-${eNum}-${Date.now()}`,
        student_id: studentId,
        roll_number: student.roll_number || 'N/A',
        student_name: student.name || 'Student',
        student_email: student.email || '',
        branch: student.branch || 'N/A',
        section: student.section || 'A',
        admitted_batch: student.admitted_batch || '',
        semester: targetSem,
        elective_type: electiveType,
        elective_number: eNum,
        subject_id: allottedSubject ? allottedSubject.id : null,
        priority_selected: allottedPriority,
        status,
        submitted_at: timestamp,
        allotted_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp
      };

      currentAllots.push(newAllotment);
      results.push(newAllotment);
    }

    setStored(KEYS.PREFERENCES, currentPrefs);
    setStored(KEYS.ALLOTMENTS, currentAllots);

    // Sync seats
    db.syncSubjectSeats();

    return results;
  },

  // Allotments
  getAllotments: () => getStored(KEYS.ALLOTMENTS, INITIAL_ALLOTMENTS),
  getAllotmentForStudent: (studentId, electiveType, semester = null) => {
    const allotments = db.getAllotments();
    return allotments.find(a => {
      if (a.student_id !== studentId) return false;
      if (electiveType && electiveType !== 'ALL' && a.elective_type !== electiveType) return false;
      if (semester && semester !== 'ALL' && Number(a.semester || 5) !== Number(semester)) return false;
      return true;
    });
  },
  getAllotmentsForStudent: (studentId, electiveType = null, semester = null) => {
    const allotments = db.getAllotments();
    return allotments.filter(a => {
      if (a.student_id !== studentId) return false;
      if (electiveType && electiveType !== 'ALL' && a.elective_type !== electiveType) return false;
      if (semester && semester !== 'ALL' && Number(a.semester || 5) !== Number(semester)) return false;
      return true;
    });
  },
  setAllotments: (list) => setStored(KEYS.ALLOTMENTS, list),
  updateAllotment: (id, updates) => {
    const allotments = db.getAllotments();
    const index = allotments.findIndex(a => a.id === id);
    if (index !== -1) {
      allotments[index] = { ...allotments[index], ...updates, updated_at: new Date().toISOString() };
      setStored(KEYS.ALLOTMENTS, allotments);
      db.syncSubjectSeats();
      return allotments[index];
    }
    return null;
  },
  manualUpdateAllotment: ({ allotmentId, studentId, electiveType = 'OE', electiveNumber = 1, semester = 5, newSubjectId, reason, coordinatorId }) => {
    const allotments = db.getAllotments();
    let index = -1;
    if (allotmentId) {
      index = allotments.findIndex(a => a.id === allotmentId);
    }
    if (index === -1 && studentId) {
      index = allotments.findIndex(a => 
        a.student_id === studentId && 
        (!electiveType || a.elective_type === electiveType) &&
        Number(a.elective_number || 1) === Number(electiveNumber || 1)
      );
    }

    const allSubjects = db.getSubjects();
    const newSubject = newSubjectId ? allSubjects.find(s => s.id === newSubjectId) : null;
    const student = studentId ? db.getProfileById(studentId) : null;
    const nowIso = new Date().toISOString();

    if (index !== -1) {
      const targetAllotment = allotments[index];
      const oldSubject = targetAllotment.subject_id ? allSubjects.find(s => s.id === targetAllotment.subject_id) : null;

      allotments[index] = {
        ...targetAllotment,
        subject_id: newSubjectId || null,
        subject_name: newSubject?.subject_name || (newSubjectId ? 'Allotted Subject' : 'WAITLISTED (No Vacancy)'),
        subject_code: newSubject?.subject_code || (newSubjectId ? '' : 'N/A'),
        status: newSubjectId ? 'ALLOTTED' : 'WAITLISTED',
        priority_selected: newSubjectId ? (targetAllotment.priority_selected || 'MANUAL') : null,
        manual_override: true,
        is_manual_override: true,
        updated_at: nowIso
      };
      setStored(KEYS.ALLOTMENTS, allotments);
      db.syncSubjectSeats();

      db.addAuditLog({
        coordinatorId,
        studentId: targetAllotment.student_id,
        action: 'MANUAL_ALLOTMENT_MODIFICATION',
        oldValue: oldSubject ? `${oldSubject.subject_code} - ${oldSubject.subject_name}` : 'WAITLISTED',
        newValue: newSubject ? `${newSubject.subject_code} - ${newSubject.subject_name}` : 'WAITLISTED',
        reason: reason || 'Manual adjustment'
      });

      return allotments[index];
    } else if (studentId) {
      const newAllot = {
        id: `allot-${studentId}-${electiveType}-${semester}-${electiveNumber}-MANUAL-${Date.now()}`,
        student_id: studentId,
        roll_number: student?.roll_number || 'N/A',
        student_name: student?.name || 'Student',
        student_email: student?.email || '',
        branch: student?.branch || 'N/A',
        section: student?.section || 'A',
        semester: Number(semester || student?.semester || 5),
        elective_type: electiveType,
        elective_number: Number(electiveNumber || 1),
        subject_id: newSubjectId || null,
        subject_name: newSubject?.subject_name || (newSubjectId ? 'Allotted Subject' : 'WAITLISTED (No Vacancy)'),
        subject_code: newSubject?.subject_code || (newSubjectId ? '' : 'N/A'),
        status: newSubjectId ? 'ALLOTTED' : 'WAITLISTED',
        priority_selected: newSubjectId ? 'MANUAL' : null,
        manual_override: true,
        is_manual_override: true,
        submitted_at: nowIso,
        allotted_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso
      };
      allotments.push(newAllot);
      setStored(KEYS.ALLOTMENTS, allotments);
      db.syncSubjectSeats();

      db.addAuditLog({
        coordinatorId,
        studentId,
        action: 'MANUAL_ALLOTMENT_MODIFICATION',
        oldValue: 'None',
        newValue: newSubject ? `${newSubject.subject_code} - ${newSubject.subject_name}` : 'WAITLISTED',
        reason: reason || 'Manual adjustment'
      });

      return newAllot;
    }

    throw new Error('Allotment record or student identifier not found.');
  },

  // Audit Logs
  getAuditLogs: () => getStored(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
  addAuditLog: ({ coordinatorId, studentId, action, oldValue, newValue, reason }) => {
    const logs = db.getAuditLogs();
    const newLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      coordinator_id: coordinatorId || null,
      student_id: studentId || null,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
      reason: reason || 'Manual modification',
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored(KEYS.AUDIT_LOGS, logs);
    return newLog;
  },

  // Curriculum Master (Batch-wise syllabus subject pool)
  getCurriculum: (batch, branch, semester = null, electiveType = null) => {
    let list = getStored(KEYS.CURRICULUM, []);
    if (batch && batch !== 'ALL') {
      const cleanBatch = normalizeBatch(batch).toLowerCase();
      list = list.filter(c => normalizeBatch(c.batch).toLowerCase() === cleanBatch);
    }
    if (branch && branch !== 'ALL') {
      const cleanBranch = String(branch).trim().toUpperCase();
      list = list.filter(c => String(c.branch || '').trim().toUpperCase() === cleanBranch);
    }
    if (semester && semester !== 'ALL') {
      list = list.filter(c => Number(c.semester) === Number(semester));
    }
    if (electiveType && electiveType !== 'ALL') {
      list = list.filter(c => c.elective_type === electiveType);
    }
    return list.sort((a, b) => {
      const semA = Number(a.semester || 0);
      const semB = Number(b.semester || 0);
      if (semA !== semB) return semA - semB;

      const typeA = String(a.elective_type || '').toUpperCase();
      const typeB = String(b.elective_type || '').toUpperCase();
      if (typeA !== typeB) {
        if (typeA === 'PE') return -1;
        if (typeB === 'PE') return 1;
        return typeA.localeCompare(typeB);
      }

      const numA = Number(a.elective_number || 1);
      const numB = Number(b.elective_number || 1);
      if (numA !== numB) return numA - numB;

      return String(a.subject_code || '').localeCompare(String(b.subject_code || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  },

  addCurriculumBatch: (curriculumRows) => {
    const list = getStored(KEYS.CURRICULUM, []);
    const added = [];

    curriculumRows.forEach(row => {
      const cleanBatch = normalizeBatch(row.batch || '');
      const cleanBranch = String(row.branch || 'CSE').trim().toUpperCase();
      const cleanCode = String(row.subject_code || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanCode) return;

      const existingIndex = list.findIndex(c => 
        normalizeBatch(c.batch).toLowerCase() === cleanBatch.toLowerCase() &&
        String(c.branch || '').toUpperCase() === cleanBranch &&
        String(c.subject_code || '').toUpperCase() === cleanCode
      );

      const eType = String(row.elective_type || 'PE').toUpperCase();
      const entry = {
        id: row.id || `curr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        batch: cleanBatch,
        branch: cleanBranch,
        regulation: String(row.regulation || 'AR23').trim().toUpperCase(),
        semester: Number(row.semester || 5),
        elective_type: eType,
        elective_number: Number(row.elective_number || 1),
        subject_code: cleanCode,
        subject_name: String(row.subject_name || '').trim(),
        offered_branches: parseOfferedBranches(row.offered_branches, eType === 'OE' ? ['ALL'] : [cleanBranch]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIndex !== -1) {
        list[existingIndex] = { ...list[existingIndex], ...entry, id: list[existingIndex].id };
        added.push(list[existingIndex]);
      } else {
        list.push(entry);
        added.push(entry);
      }
    });

    setStored(KEYS.CURRICULUM, list);
    return added;
  },

  addCurriculumSubject: (subject) => {
    const [saved] = db.addCurriculumBatch([subject]);
    return saved;
  },

  updateCurriculumSubject: (id, updates) => {
    const list = getStored(KEYS.CURRICULUM, []);
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      const current = list[index];
      const eType = String(updates.elective_type || current.elective_type || 'PE').toUpperCase();
      const cleanBranch = updates.branch || current.branch || 'CSE';
      const cleanOffered = updates.offered_branches !== undefined
        ? parseOfferedBranches(updates.offered_branches, eType === 'OE' ? ['ALL'] : [cleanBranch])
        : parseOfferedBranches(current.offered_branches, eType === 'OE' ? ['ALL'] : [cleanBranch]);

      list[index] = {
        ...current,
        ...updates,
        batch: updates.batch ? normalizeBatch(updates.batch) : current.batch,
        subject_code: updates.subject_code ? String(updates.subject_code).trim().toUpperCase().replace(/\s+/g, '') : current.subject_code,
        offered_branches: cleanOffered,
        updated_at: new Date().toISOString()
      };
      setStored(KEYS.CURRICULUM, list);
      return list[index];
    }
    return null;
  },

  deleteCurriculumSubject: (id) => {
    const list = getStored(KEYS.CURRICULUM, []).filter(c => c.id !== id);
    setStored(KEYS.CURRICULUM, list);
    return true;
  },

  // Selection Windows (Batch Allotment Drives)
  getSelectionWindows: (branch = null, electiveType = null) => {
    let list = getStored(KEYS.SELECTION_WINDOWS, []);
    if (branch && branch !== 'ALL') {
      const bUpper = String(branch).trim().toUpperCase();
      list = list.filter(w => !w.branch || w.branch === 'ALL' || String(w.branch).toUpperCase() === bUpper);
    }
    if (electiveType && electiveType !== 'ALL') {
      list = list.filter(w => w.elective_type === electiveType || w.elective_type === 'BOTH');
    }
    return list;
  },

  createSelectionWindow: (data) => {
    const list = db.getSelectionWindows();
    const cleanBatch = normalizeBatch(data.batch || '');
    const cleanBranch = String(data.branch || 'ALL').trim().toUpperCase();
    const cleanSem = Number(data.semester || 5);
    const cleanElectiveNum = Number(data.elective_number || 1);
    const cleanType = String(data.elective_type || 'PE').toUpperCase();
    const id = data.id || `WINDOW_${cleanBatch.replace(/[^A-Za-z0-9]/g, '_')}_SEM${cleanSem}_${cleanType}${cleanElectiveNum}${cleanBranch !== 'ALL' ? `_${cleanBranch}` : ''}`;

    const newWindow = {
      id,
      batch: cleanBatch,
      branch: cleanBranch,
      semester: cleanSem,
      elective_number: cleanElectiveNum,
      elective_type: cleanType,
      status: data.status || 'ACTIVE',
      title: data.title || `Batch ${cleanBatch} • Semester ${cleanSem} ${cleanType === 'PE' ? `Professional Elective (PE-${cleanElectiveNum} • ${cleanBranch})` : `Open Elective (OE-${cleanElectiveNum})`}`,
      allotment_revealed: Boolean(data.allotment_revealed || false),
      due_date: data.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingIdx = list.findIndex(w => w.id === id);
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...newWindow };
    } else {
      list.push(newWindow);
    }

    setStored(KEYS.SELECTION_WINDOWS, list);
    return newWindow;
  },

  updateSelectionWindow: (id, updates) => {
    const list = db.getSelectionWindows();
    const index = list.findIndex(w => w.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updated_at: new Date().toISOString() };
      setStored(KEYS.SELECTION_WINDOWS, list);
      return list[index];
    }
    return null;
  },

  toggleRevealSelectionWindow: (id, isRevealed) => {
    return db.updateSelectionWindow(id, { allotment_revealed: Boolean(isRevealed) });
  },

  updateSelectionWindowDueDate: (id, dueDate) => {
    return db.updateSelectionWindow(id, { due_date: dueDate || null });
  },

  deleteSelectionWindow: (id) => {
    const list = db.getSelectionWindows().filter(w => w.id !== id);
    setStored(KEYS.SELECTION_WINDOWS, list);
    return true;
  },

  // --------------------------------------------------------------------------
  // AUTO-ALLOCATION ENGINE & TRANSACTION HISTORY (UNDO / REDO)
  // --------------------------------------------------------------------------
  getAutoAllocationHistory: (windowIdOrCriteria = null) => {
    const history = getStored(KEYS.AUTO_ALLOCATION_HISTORY, []);
    if (!windowIdOrCriteria || windowIdOrCriteria === 'ALL') {
      const pastBatches = history.filter(h => h.status === 'ACTIVE');
      const undoneBatches = history.filter(h => h.status === 'UNDONE');
      return {
        history,
        pastBatches,
        undoneBatches,
        raw: history,
        length: history.length,
        someActive: pastBatches.length > 0,
        someUndone: undoneBatches.length > 0,
        some: (...args) => history.some(...args),
        filter: (...args) => history.filter(...args)
      };
    }

    const list = history.filter(h => {
      if (typeof windowIdOrCriteria === 'string') {
        return h.window_id === windowIdOrCriteria || h.id === windowIdOrCriteria;
      }
      if (typeof windowIdOrCriteria === 'object') {
        const { windowId, batch, semester, electiveType, elective_number } = windowIdOrCriteria;
        if (windowId && (h.window_id === windowId || h.id === windowId)) return true;
        const matchBatch = !batch || normalizeBatch(h.batch) === normalizeBatch(batch);
        const matchSem = !semester || Number(h.semester) === Number(semester);
        const matchType = !electiveType || h.elective_type === electiveType;
        const matchNum = !elective_number || Number(h.elective_number || 1) === Number(elective_number);
        return matchBatch && matchSem && matchType && matchNum;
      }
      return false;
    });

    const pastBatches = list.filter(h => h.status === 'ACTIVE');
    const undoneBatches = list.filter(h => h.status === 'UNDONE');
    return {
      history: list,
      pastBatches,
      undoneBatches,
      raw: list,
      length: list.length,
      someActive: pastBatches.length > 0,
      someUndone: undoneBatches.length > 0,
      some: (...args) => list.some(...args),
      filter: (...args) => list.filter(...args)
    };
  },

  autoAllocateStudents: ({ windowId, batch, semester, branch, electiveType = 'PE', elective_number = null, branchPriorityList = [] }) => {
    const cleanBatch = normalizeBatch(batch || '');
    const cleanSem = Number(semester || 5);
    const cleanBranch = String(branch || 'ALL').trim().toUpperCase();
    const isPE = electiveType === 'PE';
    const targetElectiveNum = elective_number ? Number(elective_number) : null;

    // 1. Sync seat counts first
    db.syncSubjectSeats();

    // 2. Get all enrolled students matching criteria
    let allProfiles = db.getProfiles();
    let eligibleStudents = allProfiles.filter(p => {
      if (p.role !== 'student') return false;
      const matchBatch = !cleanBatch || normalizeBatch(p.admitted_batch) === cleanBatch;
      const matchSem = Number(p.semester || 5) === cleanSem;
      const matchBranch = isPE ? (String(p.branch).toUpperCase() === cleanBranch) : true;
      return (matchBatch || matchSem) && matchBranch;
    });

    // 3. Get offered subjects for this drive
    let allSubjects = db.getSubjects(electiveType, isPE ? cleanBranch : null, cleanSem);
    if ((!allSubjects || allSubjects.length === 0) && isPE) {
      allSubjects = db.getSubjects(electiveType, null, cleanSem);
    }
    if (targetElectiveNum && allSubjects && allSubjects.length > 0) {
      const byNum = allSubjects.filter(s => Number(s.elective_number || 1) === targetElectiveNum);
      if (byNum.length > 0) {
        allSubjects = byNum;
      }
    }
    if (!allSubjects || allSubjects.length === 0) {
      return {
        success: false,
        count: 0,
        message: `No ${electiveType} subjects offered for Batch ${cleanBatch} • Semester ${cleanSem}.`
      };
    }

    const allPreferences = db.getPreferences ? db.getPreferences() : [];
    const electiveNumbers = targetElectiveNum 
      ? [targetElectiveNum] 
      : (Array.from(new Set(allSubjects.map(s => Number(s.elective_number || 1)))).sort((a, b) => a - b));
    if (electiveNumbers.length === 0) electiveNumbers.push(1);

    let currentAllots = db.getAllotments();
    const createdAllotments = [];
    const createdAllotmentIds = [];
    const timestamp = new Date().toISOString();

    for (const eNum of electiveNumbers) {
      const subjectsForNum = allSubjects.filter(s => Number(s.elective_number || 1) === eNum);

      // Phase 1: Reallocate WAITLISTED students who previously submitted preferences
      const waitlistedAllots = currentAllots.filter(a =>
        a.elective_type === electiveType &&
        Number(a.elective_number || 1) === eNum &&
        Number(a.semester || 5) === cleanSem &&
        a.status === 'WAITLISTED'
      );

      for (const waitRecord of waitlistedAllots) {
        const studentObj = eligibleStudents.find(s => s.id === waitRecord.student_id || (s.email && waitRecord.student_email && s.email.toLowerCase() === waitRecord.student_email.toLowerCase()));
        const stBranch = String(studentObj?.branch || waitRecord.branch || '').trim().toUpperCase();

        const studentPrefs = allPreferences.filter(p =>
          p.student_id === waitRecord.student_id &&
          p.elective_type === electiveType &&
          Number(p.semester || cleanSem) === cleanSem
        ).sort((a, b) => Number(a.priority) - Number(b.priority));

        // Check if any of their preferred choices now has capacity
        let satisfiedSubj = null;
        let chosenPriority = null;

        for (const pref of studentPrefs) {
          const targetSubj = subjectsForNum.find(s => {
            if (s.id !== pref.subject_id) return false;
            if (Number(s.available_seats || 0) <= 0) return false;
            if (!isPE) {
              const subjBranch = String(s.branch || '').trim().toUpperCase();
              if (subjBranch === stBranch) return false; // Strictly forbid own branch
              if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => String(b).trim().toUpperCase() === stBranch);
                if (!allowed) return false;
              }
            }
            return true;
          });

          if (targetSubj) {
            satisfiedSubj = targetSubj;
            chosenPriority = pref.priority;
            break;
          }
        }

        if (satisfiedSubj) {
          waitRecord.subject_id = satisfiedSubj.id;
          waitRecord.subject_name = satisfiedSubj.subject_name;
          waitRecord.subject_code = satisfiedSubj.subject_code;
          waitRecord.priority_selected = chosenPriority;
          waitRecord.status = 'ALLOTTED';
          waitRecord.allotted_at = timestamp;
          waitRecord.updated_at = timestamp;
          satisfiedSubj.available_seats = Math.max(0, satisfiedSubj.available_seats - 1);
          createdAllotments.push(waitRecord);
          createdAllotmentIds.push(waitRecord.id);
        }
      }

      // Phase 2: Find remaining unallocated and still-waitlisted students
      let unallocatedStudents = eligibleStudents.filter(student => {
        const hasActiveAllot = currentAllots.some(a => 
          (a.student_id === student.id || (a.student_email && a.student_email.toLowerCase() === student.email.toLowerCase())) &&
          a.elective_type === electiveType &&
          Number(a.elective_number || 1) === eNum &&
          Number(a.semester || 5) === cleanSem &&
          a.status === 'ALLOTTED'
        );
        return !hasActiveAllot;
      });

      // Sort unallocated students
      if (isPE) {
        // Section-wise order (Section A, B, C...) then Roll Number
        unallocatedStudents.sort((a, b) => {
          const secCompare = String(a.section || 'A').localeCompare(String(b.section || 'A'));
          if (secCompare !== 0) return secCompare;
          return String(a.roll_number || '').localeCompare(String(b.roll_number || ''));
        });
      } else {
        // OE: Branch Priority order set by Admin, then Section-wise, then Roll Number
        const branchOrder = (branchPriorityList && branchPriorityList.length > 0)
          ? branchPriorityList.map(b => String(b).trim().toUpperCase())
          : [];

        unallocatedStudents.sort((a, b) => {
          const branchA = String(a.branch || '').trim().toUpperCase();
          const branchB = String(b.branch || '').trim().toUpperCase();
          const indexA = branchOrder.indexOf(branchA) === -1 ? 999 : branchOrder.indexOf(branchA);
          const indexB = branchOrder.indexOf(branchB) === -1 ? 999 : branchOrder.indexOf(branchB);

          if (indexA !== indexB) return indexA - indexB;
          const secCompare = String(a.section || 'A').localeCompare(String(b.section || 'A'));
          if (secCompare !== 0) return secCompare;
          return String(a.roll_number || '').localeCompare(String(b.roll_number || ''));
        });
      }

      // Allocate remaining available seats in round-robin / available vacancy
      let subjectIndex = 0;
      for (const student of unallocatedStudents) {
        let allottedSubj = null;
        let chosenPriority = null;

        if (!isPE) {
          const studentBranch = String(student.branch || '').trim().toUpperCase();

          // 1. Check student's own preferred choices FIRST if they submitted preferences
          const studentPrefs = allPreferences.filter(p =>
            p.student_id === student.id &&
            p.elective_type === electiveType &&
            Number(p.semester || cleanSem) === cleanSem
          ).sort((a, b) => Number(a.priority) - Number(b.priority));

          for (const pref of studentPrefs) {
            const targetSubj = subjectsForNum.find(s => {
              if (s.id !== pref.subject_id) return false;
              if (Number(s.available_seats || 0) <= 0) return false;
              const subjBranch = String(s.branch || '').trim().toUpperCase();
              if (subjBranch === studentBranch) return false; // Strictly forbid own branch
              if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => String(b).trim().toUpperCase() === studentBranch);
                if (!allowed) return false;
              }
              return true;
            });

            if (targetSubj) {
              allottedSubj = targetSubj;
              chosenPriority = pref.priority;
              break;
            }
          }

          // 2. If no preference could be fulfilled, choose available cross-department subject
          if (!allottedSubj) {
            const crossDeptAvailable = subjectsForNum.filter(s => {
              if (Number(s.available_seats || 0) <= 0) return false;
              const subjBranch = String(s.branch || '').trim().toUpperCase();
              if (subjBranch === studentBranch) return false; // Strictly forbid own branch
              if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => String(b).trim().toUpperCase() === studentBranch);
                if (!allowed) return false;
              }
              return true;
            });

            if (crossDeptAvailable.length > 0) {
              allottedSubj = crossDeptAvailable[subjectIndex % crossDeptAvailable.length];
              subjectIndex++;
            }
          }
        } else {
          const availableSubjs = subjectsForNum.filter(s => s.available_seats > 0);
          if (availableSubjs.length > 0) {
            allottedSubj = availableSubjs[subjectIndex % availableSubjs.length];
            subjectIndex++;
          }
        }

        // Check if student already has a WAITLISTED record to update or if we create a new record
        const existingWaitRecord = currentAllots.find(a => 
          (a.student_id === student.id || (a.student_email && a.student_email.toLowerCase() === student.email.toLowerCase())) &&
          a.elective_type === electiveType &&
          Number(a.elective_number || 1) === eNum &&
          Number(a.semester || 5) === cleanSem
        );

        if (existingWaitRecord) {
          if (allottedSubj) {
            existingWaitRecord.subject_id = allottedSubj.id;
            existingWaitRecord.subject_name = allottedSubj.subject_name;
            existingWaitRecord.subject_code = allottedSubj.subject_code;
            existingWaitRecord.priority_selected = chosenPriority;
            existingWaitRecord.status = 'ALLOTTED';
            existingWaitRecord.is_auto_allocated = true;
            existingWaitRecord.allotted_at = timestamp;
            existingWaitRecord.updated_at = timestamp;
            allottedSubj.available_seats = Math.max(0, allottedSubj.available_seats - 1);
            createdAllotments.push(existingWaitRecord);
            createdAllotmentIds.push(existingWaitRecord.id);
          }
        } else {
          const newId = `allot-${student.id}-${electiveType}-${cleanSem}-${eNum}-AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const allotRecord = {
            id: newId,
            student_id: student.id,
            roll_number: student.roll_number || 'N/A',
            student_name: student.name || 'Student',
            student_email: student.email || '',
            branch: student.branch || 'N/A',
            section: student.section || 'A',
            admitted_batch: student.admitted_batch || cleanBatch,
            semester: cleanSem,
            elective_type: electiveType,
            elective_number: eNum,
            subject_id: allottedSubj ? allottedSubj.id : null,
            subject_name: allottedSubj ? allottedSubj.subject_name : 'No Vacancy Available',
            subject_code: allottedSubj ? allottedSubj.subject_code : 'N/A',
            priority_selected: chosenPriority,
            is_auto_allocated: true,
            status: allottedSubj ? 'ALLOTTED' : 'WAITLISTED',
            submitted_at: timestamp,
            allotted_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp
          };

          if (allottedSubj) {
            allottedSubj.available_seats = Math.max(0, allottedSubj.available_seats - 1);
          }

          currentAllots.push(allotRecord);
          createdAllotments.push(allotRecord);
          createdAllotmentIds.push(newId);
        }
      }
    }

    if (createdAllotments.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'All eligible students already have their elective priorities locked.',
        records: []
      };
    }

    // Save updated allotments
    setStored(KEYS.ALLOTMENTS, currentAllots);
    db.syncSubjectSeats();

    // Record transaction in history for Undo / Redo
    const txId = `tx_${Date.now()}`;
    const txRecord = {
      id: txId,
      window_id: windowId || `WINDOW_${cleanBatch}_SEM${cleanSem}_${electiveType}`,
      elective_type: electiveType,
      batch: cleanBatch,
      semester: cleanSem,
      branch: cleanBranch,
      branch_priority: branchPriorityList || [],
      allotted_count: createdAllotments.filter(a => a.status === 'ALLOTTED').length,
      created_allotment_ids: createdAllotmentIds,
      created_allotments: createdAllotments,
      status: 'ACTIVE', // 'ACTIVE' | 'UNDONE'
      created_at: timestamp
    };

    const history = getStored(KEYS.AUTO_ALLOCATION_HISTORY, []);
    history.unshift(txRecord);
    setStored(KEYS.AUTO_ALLOCATION_HISTORY, history);

    return {
      success: true,
      count: txRecord.allotted_count,
      transactionId: txId,
      records: createdAllotments
    };
  },

  undoAutoAllocation: (windowIdOrCriteria) => {
    const history = getStored(KEYS.AUTO_ALLOCATION_HISTORY, []);
    const txIndex = history.findIndex(h => {
      if (!h || h.status !== 'ACTIVE') return false;
      if (typeof windowIdOrCriteria === 'string') {
        return h.id === windowIdOrCriteria || h.window_id === windowIdOrCriteria;
      }
      if (typeof windowIdOrCriteria === 'object' && windowIdOrCriteria !== null) {
        const { windowId, batch, semester, electiveType, elective_number } = windowIdOrCriteria;
        if (windowId && (h.id === windowId || h.window_id === windowId)) return true;
        const matchBatch = !batch || normalizeBatch(h.batch) === normalizeBatch(batch);
        const matchSem = !semester || Number(h.semester) === Number(semester);
        const matchType = !electiveType || h.elective_type === electiveType;
        const matchNum = !elective_number || Number(h.elective_number || 1) === Number(elective_number);
        return matchBatch && matchSem && matchType && matchNum;
      }
      return false;
    });

    if (txIndex !== -1) {
      const tx = history[txIndex];
      const idsToRemove = new Set(tx.created_allotment_ids || []);

      // Remove auto-allocated records
      let currentAllots = db.getAllotments();
      const removedCount = currentAllots.filter(a => idsToRemove.has(a.id) || (tx.created_allotments && tx.created_allotments.some(ca => ca.student_id === a.student_id && a.elective_type === tx.elective_type && Number(a.elective_number || 1) === Number(tx.elective_number || 1)))).length;
      currentAllots = currentAllots.filter(a => !idsToRemove.has(a.id) && !(tx.created_allotments && tx.created_allotments.some(ca => ca.student_id === a.student_id && a.elective_type === tx.elective_type && Number(a.elective_number || 1) === Number(tx.elective_number || 1))));
      setStored(KEYS.ALLOTMENTS, currentAllots);

      // Sync subject seats
      db.syncSubjectSeats();

      // Mark transaction as UNDONE
      history[txIndex].status = 'UNDONE';
      history[txIndex].undone_at = new Date().toISOString();
      setStored(KEYS.AUTO_ALLOCATION_HISTORY, history);

      return {
        success: true,
        revertedCount: Math.max(removedCount, tx.allotted_count || 0),
        transaction: history[txIndex]
      };
    }

    // Fallback: If no transaction object exists, remove any auto_allocated records for this window / drive
    let currentAllots = db.getAllotments();
    const toRemove = currentAllots.filter(a => a.is_auto_allocated);

    if (toRemove.length === 0) {
      return { success: true, revertedCount: 0 };
    }

    const removeIds = new Set(toRemove.map(a => a.id));
    currentAllots = currentAllots.filter(a => !removeIds.has(a.id));
    setStored(KEYS.ALLOTMENTS, currentAllots);
    db.syncSubjectSeats();

    return {
      success: true,
      revertedCount: toRemove.length
    };
  },

  redoAutoAllocation: (windowIdOrCriteria) => {
    const history = getStored(KEYS.AUTO_ALLOCATION_HISTORY, []);
    const txIndex = history.findIndex(h => {
      if (!h || h.status !== 'UNDONE') return false;
      if (typeof windowIdOrCriteria === 'string') {
        return h.id === windowIdOrCriteria || h.window_id === windowIdOrCriteria;
      }
      if (typeof windowIdOrCriteria === 'object' && windowIdOrCriteria !== null) {
        const { windowId, batch, semester, electiveType, elective_number } = windowIdOrCriteria;
        if (windowId && (h.id === windowId || h.window_id === windowId)) return true;
        const matchBatch = !batch || normalizeBatch(h.batch) === normalizeBatch(batch);
        const matchSem = !semester || Number(h.semester) === Number(semester);
        const matchType = !electiveType || h.elective_type === electiveType;
        const matchNum = !elective_number || Number(h.elective_number || 1) === Number(elective_number);
        return matchBatch && matchSem && matchType && matchNum;
      }
      return false;
    });

    if (txIndex === -1) {
      throw new Error('No undone auto-allocation batch found to redo.');
    }

    const tx = history[txIndex];
    let currentAllots = db.getAllotments();

    // Re-insert the allotment records
    const recordsToRestore = tx.created_allotments || [];
    currentAllots.push(...recordsToRestore);
    setStored(KEYS.ALLOTMENTS, currentAllots);

    // Sync subject seats
    db.syncSubjectSeats();

    // Mark transaction as ACTIVE
    history[txIndex].status = 'ACTIVE';
    history[txIndex].redone_at = new Date().toISOString();
    setStored(KEYS.AUTO_ALLOCATION_HISTORY, history);

    return {
      success: true,
      restoredCount: recordsToRestore.length,
      transaction: history[txIndex]
    };
  },
  getCurrentUser: () => {
    try {
      const u = localStorage.getItem(KEYS.CURRENT_USER);
      if (!u) return null;
      const parsed = JSON.parse(u);
      if (typeof parsed === 'string') {
        // String email was stored previously; resolve to full profile object
        return db.getProfileByEmail(parsed) || {
          id: `s-${Date.now()}`,
          email: parsed.toLowerCase().trim(),
          name: parsed.split('@')[0],
          role: parsed.includes('coordinator') ? 'coordinator' : 'student',
          branch: 'CSE',
          section: 'A',
          semester: 5
        };
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setCurrentUser: (user) => {
    if (user) {
      if (typeof user === 'string') {
        const resolved = db.getProfileByEmail(user) || {
          id: `s-${Date.now()}`,
          email: user.toLowerCase().trim(),
          name: user.split('@')[0],
          role: user.includes('coordinator') ? 'coordinator' : 'student',
          branch: 'CSE',
          section: 'A',
          semester: 5
        };
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(resolved));
      } else {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      }
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  }
};
