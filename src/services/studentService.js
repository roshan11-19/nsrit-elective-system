import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, normalizeBatch, parseOfferedBranches, isBranchEligibleForSubject, normalizeBranchName } from '../lib/storage';

export const studentService = {
  // Helper to fetch all selection windows directly from Supabase
  getSelectionWindows: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('selection_windows')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(w => ({ ...w, elective_number: Number(w.elective_number || 1) }));
        }
      } catch (e) {
        console.warn('Supabase selection_windows note:', e);
      }
    }
    const localWindows = db.getSelectionWindows ? db.getSelectionWindows() : [];
    return localWindows.map(w => ({ ...w, elective_number: Number(w.elective_number || 1) }));
  },

  // Get eligible subjects based on student's branch, semester, and elective type (shows all offered subjects, optionally filtered by active selection drives)
  getEligibleSubjects: async (profile, electiveType, semester = null, onlyActiveDrives = false) => {
    if (!profile) return [];

    const studentBranch = String(profile.branch || 'CSE').trim().toUpperCase();
    const studentSem = Number(semester || profile.semester || 5);
    const studentBatch = normalizeBatch(profile.admitted_batch || profile.batch || '');

    let allSubjects = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const query = supabase
          .from('subjects')
          .select('*')
          .eq('semester', studentSem);

        const { data, error } = await query;
        if (!error && data) {
          // Calibrate seats with live allotments
          const { data: allotData } = await supabase
            .from('allotments')
            .select('subject_id, status')
            .eq('status', 'ALLOTTED');
          
          const allots = allotData || [];
          allSubjects = data.map(s => {
            const count = allots.filter(a => a.subject_id === s.id).length;
            const total = Number(s.seats || 0);
            const sType = String(s.elective_type || 'PE').toUpperCase();
            const sBranch = s.branch ? String(s.branch).trim().toUpperCase() : 'CSE';
            return {
              ...s,
              seats: total,
              available_seats: Math.max(0, total - count),
              offered_branches: parseOfferedBranches(s.offered_branches, sType === 'PE' ? [sBranch] : ['ALL'])
            };
          });
        }
      } catch (e) {
        console.warn('Supabase eligible subjects query note:', e);
      }
    } else {
      const localSubjects = db.getSubjects ? db.getSubjects(electiveType, null, studentSem) : [];
      allSubjects = localSubjects.map(s => {
        const sType = String(s.elective_type || 'PE').toUpperCase();
        const sBranch = s.branch ? normalizeBranchName(s.branch) : 'CSE';
        return {
          ...s,
          offered_branches: parseOfferedBranches(s.offered_branches, sType === 'PE' ? [sBranch] : ['ALL'])
        };
      });
    }

    // Determine which elective numbers have an ACTIVE selection drive
    let activeElectiveNumbers = null;
    let activeBatches = new Set();

    try {
      const windowList = await studentService.getSelectionWindows();
      const isPE = electiveType === 'PE';

      let relevantWins = windowList.filter(w => {
        const matchSem = Number(w.semester) === studentSem;
        const wType = String(w.elective_type || w.type || '').toUpperCase();
        const matchType = !wType || wType === 'BOTH' || (isPE ? (wType === 'PE' || wType === 'PROFESSIONAL ELECTIVE') : (wType === 'OE' || wType === 'OPEN ELECTIVE'));
        const matchBranch = isPE ? (!w.branch || String(w.branch).trim().toUpperCase() === 'ALL' || !studentBranch || String(w.branch).trim().toUpperCase() === studentBranch) : true;
        return matchSem && matchType && matchBranch;
      });

      if (studentBatch && relevantWins.some(w => normalizeBatch(w.batch) === studentBatch)) {
        relevantWins = relevantWins.filter(w => !w.batch || normalizeBatch(w.batch) === studentBatch);
      }

      if (relevantWins.length > 0) {
        const activeWins = relevantWins.filter(w => {
          const notExpired = !w.due_date || new Date() <= new Date(w.due_date);
          return w.status === 'ACTIVE' && notExpired;
        });
        activeElectiveNumbers = new Set(activeWins.map(w => Number(w.elective_number || 1)));
        activeWins.forEach(w => {
          if (w.batch) activeBatches.add(normalizeBatch(w.batch));
        });
      } else {
        activeElectiveNumbers = new Set();
      }
    } catch (winErr) {
      console.warn('Window check for eligible subjects note:', winErr);
    }

    return allSubjects
      .map(s => ({
        ...s,
        elective_number: Number(s.elective_number || 1)
      }))
      .filter(s => {
        if (s.is_deleted || s.active === false) return false;
        if (Number(s.semester) !== studentSem) return false;

        // Check elective type
        const sType = String(s.elective_type || '').toUpperCase();
        const isPE = electiveType === 'PE';
        const matchType = isPE ? (sType === 'PE' || sType === 'PROFESSIONAL ELECTIVE') : (sType === 'OE' || sType === 'OPEN ELECTIVE');
        if (!matchType) return false;

        // If filtering by active selection drives:
        if (onlyActiveDrives) {
          if (!activeElectiveNumbers || activeElectiveNumbers.size === 0) {
            return false;
          }
          if (!activeElectiveNumbers.has(Number(s.elective_number || 1))) {
            return false;
          }
          if (activeBatches.size > 0 && s.admitted_batch) {
            if (!activeBatches.has(normalizeBatch(s.admitted_batch)) && studentBatch && normalizeBatch(s.admitted_batch) !== studentBatch) {
              return false;
            }
          }
        }

        // Branch eligibility check (works for both cross-branch OE and PE offerings)
        return isBranchEligibleForSubject(s, studentBranch);
      });
  },

  // Check if selection window is open (PE operated by Coordinator, OE operated by Admin)
  isSelectionOpen: async (profile, electiveType, semester = null, electiveNumber = null) => {
    if (!profile) return { isOpen: false, reason: 'Profile not found' };

    const studentBatch = normalizeBatch(profile.admitted_batch || profile.batch || '');
    const studentSem = Number(semester || profile.semester || 5);
    const studentBranch = String(profile.branch || 'CSE').trim().toUpperCase();

    try {
      const windowList = await studentService.getSelectionWindows();
      const isPE = electiveType === 'PE';

      let relevantWins = windowList.filter(w => {
        const matchSem = Number(w.semester) === studentSem;
        const wType = String(w.elective_type || w.type || '').toUpperCase();
        const matchType = !wType || wType === 'BOTH' || (isPE ? (wType === 'PE' || wType === 'PROFESSIONAL ELECTIVE') : (wType === 'OE' || wType === 'OPEN ELECTIVE'));
        const matchBranch = isPE ? (!w.branch || String(w.branch).trim().toUpperCase() === 'ALL' || !studentBranch || String(w.branch).trim().toUpperCase() === studentBranch) : true;
        return matchSem && matchType && matchBranch;
      });

      if (studentBatch && relevantWins.some(w => normalizeBatch(w.batch) === studentBatch)) {
        relevantWins = relevantWins.filter(w => !w.batch || normalizeBatch(w.batch) === studentBatch);
      }

      // If a specific elective number is queried (e.g. electiveNumber = 1 or 2)
      if (electiveNumber !== null && electiveNumber !== undefined) {
        const targetNum = Number(electiveNumber);
        const win = relevantWins.find(w => Number(w.elective_number || 1) === targetNum);

        if (!win) {
          const authority = electiveType === 'PE' ? 'Department Coordinator' : 'College Administrator';
          return {
            isOpen: false,
            isExpired: false,
            dueDate: null,
            allotmentRevealed: false,
            window: null,
            reason: `Selection drive for ${electiveType}-${targetNum} has not been established yet by the ${authority}.`
          };
        }

        const isPastDue = Boolean(win.due_date && new Date() > new Date(win.due_date));
        if (isPastDue) {
          return {
            isOpen: false,
            isExpired: true,
            dueDate: win.due_date,
            allotmentRevealed: Boolean(win.allotment_revealed),
            window: win,
            reason: `The selection deadline for ${electiveType}-${targetNum} passed on ${new Date(win.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
          };
        }

        if (win.status !== 'ACTIVE') {
          const authority = electiveType === 'PE' ? 'Department Coordinator' : 'College Administrator';
          return {
            isOpen: false,
            isExpired: false,
            dueDate: win.due_date,
            allotmentRevealed: Boolean(win.allotment_revealed),
            window: win,
            reason: `Selection drive for ${electiveType}-${targetNum} is currently ${win.status || 'LOCKED'} by the ${authority}.`
          };
        }

        return {
          isOpen: true,
          isExpired: false,
          dueDate: win.due_date,
          allotmentRevealed: Boolean(win.allotment_revealed),
          window: win
        };
      }

      // General check for the whole semester
      const activeWins = relevantWins.filter(w => {
        const notExpired = !w.due_date || new Date() <= new Date(w.due_date);
        return w.status === 'ACTIVE' && notExpired;
      });

      const activeNumbers = Array.from(new Set(activeWins.map(w => Number(w.elective_number || 1)))).sort((a, b) => a - b);

      if (relevantWins.length === 0) {
        const authority = electiveType === 'PE' ? 'Department Coordinator' : 'College Administrator';
        return {
          isOpen: false,
          isExpired: false,
          dueDate: null,
          allotmentRevealed: false,
          window: null,
          activeElectiveNumbers: [],
          allRelevantWins: [],
          reason: `Selection drive for Semester ${studentSem} (${electiveType === 'PE' ? 'Professional Elective' : 'Open Elective'}) has not been established yet by the ${authority}.`
        };
      }

      if (activeWins.length === 0) {
        const lockedWin = relevantWins[0];
        const authority = electiveType === 'PE' ? 'Department Coordinator' : 'College Administrator';
        const isPastDue = Boolean(lockedWin?.due_date && new Date() > new Date(lockedWin.due_date));

        return {
          isOpen: false,
          isExpired: isPastDue,
          dueDate: lockedWin?.due_date || null,
          allotmentRevealed: Boolean(relevantWins.some(w => w.allotment_revealed)),
          window: lockedWin,
          activeElectiveNumbers: [],
          allRelevantWins: relevantWins,
          reason: isPastDue
            ? `Selection deadline for Semester ${studentSem} electives has expired.`
            : `Selection drive for Semester ${studentSem} (${electiveType === 'PE' ? 'Professional Elective' : 'Open Elective'}) is currently LOCKED by the ${authority}.`
        };
      }

      return { 
        isOpen: true, 
        isExpired: false,
        dueDate: activeWins[0]?.due_date || null,
        allotmentRevealed: Boolean(activeWins.some(w => w.allotment_revealed)),
        window: activeWins[0] || null,
        activeElectiveNumbers: activeNumbers,
        allRelevantWins: relevantWins
      };
    } catch (e) {
      return { isOpen: true, isExpired: false, dueDate: null, allotmentRevealed: false, activeElectiveNumbers: [1], allRelevantWins: [] };
    }
  },

  // Get existing preferences submitted by student
  getSubmittedPreferences: async (studentId, electiveType = null, semester = null) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('elective_preferences')
          .select('*, subjects(*)')
          .eq('student_id', studentId);

        if (electiveType && electiveType !== 'ALL') {
          query = query.eq('elective_type', electiveType);
        }

        const { data, error } = await query.order('priority', { ascending: true });
        if (!error && data) {
          if (semester && semester !== 'ALL') {
            return data.filter(p => Number(p.subjects?.semester || p.semester || 5) === Number(semester));
          }
          return data;
        }
      } catch (e) {
        console.warn('Supabase preferences query note:', e);
      }
    }

    // Storage mode
    const prefs = db.getPreferences(studentId);
    if (electiveType && electiveType !== 'ALL') {
      const filtered = prefs.filter(p => p.elective_type === electiveType);
      if (semester && semester !== 'ALL') {
        const subjects = db.getSubjects ? db.getSubjects() : [];
        return filtered.filter(p => {
          const s = subjects.find(sub => sub.id === p.subject_id);
          return Number(p.semester || s?.semester || 5) === Number(semester);
        });
      }
      return filtered;
    }
    return prefs;
  },

  // Submit prioritized choices & atomically calculate FIFO allotment
  submitPreferences: async (studentId, electiveType, subjectPriorities, semester = 5) => {
    if (!subjectPriorities || subjectPriorities.length === 0) {
      throw new Error('Please select at least one subject preference.');
    }

    // Group priorities by elective_number (PE-1..PE-8, OE-1..OE-8)
    const electiveGroupMap = {};
    subjectPriorities.forEach(item => {
      const eNum = Number(item.elective_number || 1);
      if (!electiveGroupMap[eNum]) electiveGroupMap[eNum] = [];
      electiveGroupMap[eNum].push(item);
    });

    // Validate no duplicates within each elective
    for (const [eNum, items] of Object.entries(electiveGroupMap)) {
      const ids = items.map(p => p.subject_id);
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        throw new Error(`Duplicate subjects detected in ${electiveType}-${eNum}. Each priority choice must be unique.`);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Fetch student profile
        const { data: student, error: spErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();

        if (spErr || !student) throw new Error('Student profile not found.');

        const targetSem = Number(semester || student.semester || 5);
        const results = [];

        for (const [eNumStr, items] of Object.entries(electiveGroupMap)) {
          const eNum = Number(eNumStr);

          // Verify drive is active for this specific elective number
          const windowCheck = await studentService.isSelectionOpen(student, electiveType, targetSem, eNum);
          if (!windowCheck.isOpen) {
            throw new Error(windowCheck.reason || `Selection for ${electiveType}-${eNum} is currently locked or not started.`);
          }

          // 1. Delete prior draft preferences for this elective and student
          try {
            await supabase
              .from('elective_preferences')
              .delete()
              .eq('student_id', studentId)
              .eq('elective_type', electiveType)
              .eq('elective_number', eNum);
          } catch (delErr) {
            console.warn('Preferences delete note:', delErr);
          }

          // 2. Insert new priorities
          const nowIso = new Date().toISOString();
          const prefRows = items.map((item, idx) => ({
            student_id: studentId,
            student_name: student.name,
            roll_number: student.roll_number || 'N/A',
            subject_id: item.subject_id,
            priority: item.priority || (idx + 1),
            elective_type: electiveType,
            elective_number: eNum,
            submitted_at: nowIso
          }));

          let { error: insErr } = await supabase.from('elective_preferences').insert(prefRows);
          if (insErr && (insErr.message?.includes('roll_number') || insErr.message?.includes('student_name') || insErr.code === 'PGRST204')) {
            // Fallback retry with base schema columns if schema cache has not reloaded
            const basePrefRows = items.map((item, idx) => ({
              student_id: studentId,
              subject_id: item.subject_id,
              priority: item.priority || (idx + 1),
              elective_type: electiveType,
              elective_number: eNum,
              submitted_at: nowIso
            }));
            const { error: retryErr } = await supabase.from('elective_preferences').insert(basePrefRows);
            insErr = retryErr;
          }
          if (insErr) {
            console.error('Preferences insert error:', insErr);
            throw new Error(`Failed to save preferences: ${insErr.message}`);
          }

          // 3. FIFO Allocation Engine for this elective
          let assignedSubjId = null;
          let assignedPriority = null;
          let status = 'WAITLISTED';

          const sortedChoices = [...items].sort((a, b) => (a.priority || 0) - (b.priority || 0));

          for (const choice of sortedChoices) {
            const { data: subj } = await supabase
              .from('subjects')
              .select('*')
              .eq('id', choice.subject_id)
              .single();

            if (subj) {
              const { count } = await supabase
                .from('allotments')
                .select('*', { count: 'exact', head: true })
                .eq('subject_id', choice.subject_id)
                .eq('status', 'ALLOTTED');

              const filled = count || 0;
              const capacity = Number(subj.seats || 0);

              if (filled < capacity) {
                assignedSubjId = choice.subject_id;
                assignedPriority = choice.priority;
                status = 'ALLOTTED';
                break;
              }
            }
          }

          // 4. Delete prior conflicting allotment for this elective and student
          try {
            await supabase
              .from('allotments')
              .delete()
              .eq('student_id', studentId)
              .eq('elective_type', electiveType)
              .eq('elective_number', eNum);
          } catch (aDelErr) {
            console.warn('Allotment delete note:', aDelErr);
          }

          // 5. Insert fresh allotment record
          const allotPayload = {
            student_id: studentId,
            student_name: student.name,
            roll_number: student.roll_number || 'N/A',
            student_email: student.email,
            elective_type: electiveType,
            elective_number: eNum,
            subject_id: assignedSubjId,
            priority_selected: assignedPriority,
            status,
            submitted_at: nowIso,
            allotted_at: nowIso
          };

          let { data: insertedAllot, error: aErr } = await supabase
            .from('allotments')
            .insert([allotPayload])
            .select()
            .single();

          if (aErr && (aErr.message?.includes('student_name') || aErr.message?.includes('roll_number') || aErr.code === 'PGRST204')) {
            const baseAllotPayload = {
              student_id: studentId,
              student_email: student.email,
              elective_type: electiveType,
              elective_number: eNum,
              subject_id: assignedSubjId,
              priority_selected: assignedPriority,
              status,
              submitted_at: nowIso,
              allotted_at: nowIso
            };
            const { data: retryAllot, error: retryAErr } = await supabase
              .from('allotments')
              .insert([baseAllotPayload])
              .select()
              .single();
            insertedAllot = retryAllot;
            aErr = retryAErr;
          }

          if (aErr) {
            console.error('Allotment insert error:', aErr);
            throw new Error(`Failed to record allotment: ${aErr.message}`);
          }

          results.push(insertedAllot || allotPayload);
        }

        return results;
      } catch (err) {
        console.error('Supabase elective submit error:', err);
        throw err;
      }
    }

    // Storage / Local mode
    return db.submitAndAllot(studentId, electiveType, subjectPriorities, semester);
  },

  // Get all student allotment status records (e.g. for PE-1, PE-2, OE-1, etc.)
  getAllotments: async (studentId, electiveType = null, studentEmail = null, semester = null) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('allotments')
          .select('*');

        if (electiveType && electiveType !== 'ALL') {
          query = query.eq('elective_type', electiveType);
        }

        if (studentEmail) {
          query = query.or(`student_id.eq.${studentId},student_email.eq.${studentEmail.toLowerCase().trim()}`);
        } else {
          query = query.eq('student_id', studentId);
        }

        const { data: rawAllotments, error } = await query.order('elective_number', { ascending: true });
        if (!error && rawAllotments && rawAllotments.length > 0) {
          const { data: allSubjects } = await supabase.from('subjects').select('*');
          const { data: studentProfile } = await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle();
          const { data: allWins } = await supabase.from('selection_windows').select('*');
          const subjectsList = allSubjects || [];
          const windowsList = allWins || [];

          let list = rawAllotments.map(item => {
            const subject = subjectsList.find(s => s.id === item.subject_id) || null;
            const resolvedSem = Number(subject?.semester || studentProfile?.semester || 5);
            const studentBatch = String(studentProfile?.admitted_batch || '').trim();
            const studentBranch = String(studentProfile?.branch || 'CSE').toUpperCase();

            // Find matching window for this allotment
            const matchingWin = windowsList.find(w => {
              const matchBatch = !w.batch || normalizeBatch(w.batch) === normalizeBatch(studentBatch);
              const matchSem = Number(w.semester) === resolvedSem;
              const matchType = w.elective_type === item.elective_type || w.elective_type === 'BOTH';
              const matchElectiveNum = Number(w.elective_number || 1) === Number(item.elective_number || 1);
              const matchBranch = item.elective_type === 'PE' ? (!w.branch || w.branch === 'ALL' || String(w.branch).toUpperCase() === studentBranch) : true;
              return matchBatch && matchSem && matchType && matchElectiveNum && matchBranch;
            });

            const isRevealed = Boolean(matchingWin?.allotment_revealed);

            return {
              ...item,
              subject,
              semester: resolvedSem,
              allotment_revealed: isRevealed,
              due_date: matchingWin?.due_date || null,
              is_auto_allocated: Boolean(item.is_auto_allocated || item.priority_selected === 'AUTO'),
              subject_name: subject?.subject_name || item.subject_name || (item.status === 'ALLOTTED' ? 'Allotted Elective Course' : 'Not Allotted'),
              subject_code: subject?.subject_code || item.subject_code || 'N/A',
              subject_branch: subject?.branch || item.subject_branch || 'N/A'
            };
          });

          if (semester && semester !== 'ALL') {
            list = list.filter(a => Number(a.semester) === Number(semester));
          }

          return list;
        }
        if (!error && rawAllotments) {
          return [];
        }
      } catch (e) {
        console.warn('Supabase allotments query note:', e);
      }
    }

    // Storage mode
    const allotments = db.getAllotments ? db.getAllotments() : [];
    const subjects = db.getSubjects ? db.getSubjects() : [];
    const windows = db.getSelectionWindows ? db.getSelectionWindows() : [];
    const profiles = db.getProfiles ? db.getProfiles() : [];
    const studentProfile = profiles.find(p => p.id === studentId);
    const cleanEmail = studentEmail ? String(studentEmail).trim().toLowerCase() : null;

    const filtered = allotments.filter(a => {
      const matchId = a.student_id === studentId;
      const matchEmail = cleanEmail && a.student_email && a.student_email.trim().toLowerCase() === cleanEmail;
      const matchType = !electiveType || electiveType === 'ALL' || a.elective_type === electiveType;
      const matchSem = !semester || semester === 'ALL' || Number(a.semester || 5) === Number(semester);
      return (matchId || matchEmail) && matchType && matchSem;
    });

    return filtered.map(item => {
      const subject = subjects.find(s => s.id === item.subject_id) || null;
      const resolvedSem = Number(item.semester || subject?.semester || studentProfile?.semester || 5);
      const studentBatch = String(studentProfile?.admitted_batch || item.admitted_batch || '').trim();
      const studentBranch = String(studentProfile?.branch || item.branch || 'CSE').toUpperCase();

      const matchingWin = windows.find(w => {
        const matchBatch = !w.batch || normalizeBatch(w.batch) === normalizeBatch(studentBatch);
        const matchSem = Number(w.semester) === resolvedSem;
        const matchType = w.elective_type === item.elective_type || w.elective_type === 'BOTH';
        const matchElectiveNum = Number(w.elective_number || 1) === Number(item.elective_number || 1);
        const matchBranch = item.elective_type === 'PE' ? (!w.branch || w.branch === 'ALL' || String(w.branch).toUpperCase() === studentBranch) : true;
        return matchBatch && matchSem && matchType && matchElectiveNum && matchBranch;
      });

      const isRevealed = Boolean(matchingWin?.allotment_revealed);

      return {
        ...item,
        subject,
        semester: resolvedSem,
        allotment_revealed: isRevealed,
        due_date: matchingWin?.due_date || null,
        is_auto_allocated: Boolean(item.is_auto_allocated || item.priority_selected === 'AUTO'),
        subject_name: subject?.subject_name || item.subject_name || (item.status === 'ALLOTTED' ? 'Allotted Elective Course' : 'Not Allotted'),
        subject_code: subject?.subject_code || item.subject_code || 'N/A',
        subject_branch: subject?.branch || item.subject_branch || 'N/A'
      };
    });
  },

  // Get single student allotment status
  getAllotment: async (studentId, electiveType, studentEmail = null, semester = null) => {
    const list = await studentService.getAllotments(studentId, electiveType, studentEmail, semester);
    return list && list.length > 0 ? list[0] : null;
  }
};


