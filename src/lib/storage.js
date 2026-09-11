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

const KEYS = {
  PROFILES: 'aes_v2_profiles',
  CURRICULUM: 'aes_v2_curriculum',
  SUBJECTS: 'aes_v2_subjects',
  PREFERENCES: 'aes_v2_preferences',
  ALLOTMENTS: 'aes_v2_allotments',
  AUDIT_LOGS: 'aes_v2_audit_logs',
  SELECTION_WINDOWS: 'aes_v2_selection_windows',
  CURRENT_USER: 'aes_v2_current_user'
};

// Automatically remove any legacy local data from browser localStorage
try {
  [
    KEYS.PROFILES,
    KEYS.SUBJECTS,
    KEYS.PREFERENCES,
    KEYS.ALLOTMENTS,
    KEYS.AUDIT_LOGS,
    'aes_profiles',
    'aes_subjects',
    'aes_allotments',
    'aes_preferences',
    'aes_audit_logs',
    'aes_selection_windows'
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

  // Reset student elective selection so student can re-choose
  unlockStudentSelection: (studentId, electiveType, coordinatorId, semester = null) => {
    const student = db.getProfileById(studentId) || db.getProfiles().find(p => p.id === studentId || p.email?.toLowerCase().trim() === String(studentId).toLowerCase().trim());
    const studentEmail = student?.email ? student.email.toLowerCase().trim() : null;
    const targetId = student?.id || studentId;

    // Remove allotment
    const allotments = db.getAllotments().filter(a => {
      const isMatch = a.student_id === targetId || (studentEmail && a.student_email && a.student_email.toLowerCase().trim() === studentEmail);
      if (isMatch && (!electiveType || a.elective_type === electiveType)) {
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
      reason: `Coordinator unlocked ${electiveType || 'PE & OE'}${semester ? ` Sem ${semester}` : ''} selection for ${student?.name || student?.email || studentId}`
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
      return {
        ...s,
        seats: totalSeats,
        available_seats: available,
        offered_branches: Array.isArray(s.offered_branches) ? s.offered_branches : (s.elective_type === 'PE' ? [s.branch] : ['ALL'])
      };
    });

    let result = calibrated;
    if (electiveType && electiveType !== 'ALL') {
      result = result.filter(s => s.elective_type === electiveType);
    }
    if (branch && branch !== 'ALL') {
      result = result.filter(s => s.branch === branch);
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
    const defaultOffered = subject.elective_type === 'PE' 
      ? [subject.branch || 'CSE'] 
      : (Array.isArray(subject.offered_branches) && subject.offered_branches.length > 0 ? subject.offered_branches : ['ALL']);

    const existingIndex = subjects.findIndex(s => s.subject_code === subject.subject_code);
    if (existingIndex !== -1) {
      subjects[existingIndex] = {
        ...subjects[existingIndex],
        ...subject,
        seats: seatsCount,
        available_seats: seatsCount,
        offered_branches: defaultOffered,
        updated_at: new Date().toISOString()
      };
      setStored(KEYS.SUBJECTS, subjects);
      return subjects[existingIndex];
    }

    const newSubject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      seats: seatsCount,
      available_seats: seatsCount,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...subject,
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
      
      subjects[index] = { 
        ...current, 
        ...updates, 
        seats: newSeats,
        offered_branches: updates.offered_branches || current.offered_branches || (current.elective_type === 'PE' ? [current.branch] : ['ALL']),
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
    return list;
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

      const entry = {
        id: row.id || `curr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        batch: cleanBatch,
        branch: cleanBranch,
        regulation: String(row.regulation || 'AR23').trim().toUpperCase(),
        semester: Number(row.semester || 5),
        elective_type: String(row.elective_type || 'PE').toUpperCase(),
        elective_number: Number(row.elective_number || 1),
        subject_code: cleanCode,
        subject_name: String(row.subject_name || '').trim(),
        offered_branches: Array.isArray(row.offered_branches) ? row.offered_branches : ['ALL'],
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
      list[index] = {
        ...list[index],
        ...updates,
        batch: updates.batch ? normalizeBatch(updates.batch) : list[index].batch,
        subject_code: updates.subject_code ? String(updates.subject_code).trim().toUpperCase().replace(/\s+/g, '') : list[index].subject_code,
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
    const cleanType = String(data.elective_type || 'PE').toUpperCase();
    const id = data.id || `WINDOW_${cleanBatch.replace(/[^A-Za-z0-9]/g, '_')}_SEM${cleanSem}_${cleanType}${cleanBranch !== 'ALL' ? `_${cleanBranch}` : ''}`;

    const newWindow = {
      id,
      batch: cleanBatch,
      branch: cleanBranch,
      semester: cleanSem,
      elective_type: cleanType,
      status: data.status || 'ACTIVE',
      title: data.title || `Batch ${cleanBatch} • Semester ${cleanSem} ${cleanType === 'PE' ? `Professional Elective (${cleanBranch})` : 'Open Elective'}`,
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

  deleteSelectionWindow: (id) => {
    const list = db.getSelectionWindows().filter(w => w.id !== id);
    setStored(KEYS.SELECTION_WINDOWS, list);
    return true;
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
