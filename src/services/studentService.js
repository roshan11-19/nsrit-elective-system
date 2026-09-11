import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../lib/storage';

export const studentService = {
  // Get eligible subjects based on student's branch, semester, and elective type
  getEligibleSubjects: async (profile, electiveType, semester = null) => {
    if (!profile) return [];

    const studentBranch = String(profile.branch || 'CSE').trim().toUpperCase();
    const studentSem = Number(semester || profile.semester || 5);

    let allSubjects = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('subjects')
          .select('*')
          .eq('semester', studentSem)
          .eq('elective_type', electiveType)
          .eq('active', true);

        if (electiveType === 'PE') {
          query = query.eq('branch', studentBranch);
        }

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
            return {
              ...s,
              seats: total,
              available_seats: Math.max(0, total - count),
              offered_branches: Array.isArray(s.offered_branches) ? s.offered_branches : (s.elective_type === 'PE' ? [s.branch] : ['ALL'])
            };
          });
        }
      } catch (e) {
        console.warn('Supabase eligible subjects query note:', e);
      }
    } else {
      allSubjects = db.getSubjects(electiveType, null, studentSem);
    }

    return allSubjects
      .map(s => ({
        ...s,
        elective_number: Number(s.elective_number || 1)
      }))
      .filter(s => {
        if (!s.active) return false;
        if (Number(s.semester) !== studentSem) return false;

        // Filter by admitted batch if specified
        if (profile.admitted_batch && s.admitted_batch) {
          const studentBatch = String(profile.admitted_batch).trim().toLowerCase();
          const subjectBatch = String(s.admitted_batch).trim().toLowerCase();
          if (studentBatch !== subjectBatch) {
            return false;
          }
        }

        if (electiveType === 'PE') {
          // PE: Must match student's own branch
          return s.branch?.toUpperCase() === studentBranch;
        } else {
          // OE (Open Elective):
          // 1. Student cannot choose an OE offered by their own branch
          const offeringBranch = s.branch ? s.branch.toUpperCase() : '';
          if (offeringBranch && offeringBranch === studentBranch) {
            return false;
          }

          // 2. Student's branch must be in the offered_branches list
          let offered = s.offered_branches;
          if (typeof offered === 'string') {
            try { offered = JSON.parse(offered); } catch { offered = [offered]; }
          }

          if (Array.isArray(offered) && offered.length > 0) {
            const upperOffered = offered.map(b => String(b).toUpperCase());
            return upperOffered.includes('ALL') || upperOffered.includes(studentBranch);
          }

          return true;
        }
      });
  },

  // Check if selection window is open (PE operated by Coordinator, OE operated by Admin)
  isSelectionOpen: async (profile, electiveType, semester = null) => {
    if (!profile) return { isOpen: false, reason: 'Profile not found' };

    const studentBatch = String(profile.admitted_batch || '').trim().replace(/\s*-\s*/g, '-');
    const studentSem = Number(semester || profile.semester || 5);
    const studentBranch = String(profile.branch || 'CSE').trim().toUpperCase();

    try {
      let windowList = [];
      if (isSupabaseConfigured && supabase) {
        const { data: allWins } = await supabase
          .from('selection_windows')
          .select('*');
        windowList = allWins || [];
      } else {
        windowList = db.getSelectionWindows ? db.getSelectionWindows() : [];
      }

      const relevantWins = windowList.filter(w => {
        const matchBatch = String(w.batch || '').trim().replace(/\s*-\s*/g, '-').toLowerCase() === studentBatch.toLowerCase();
        const matchSem = Number(w.semester) === studentSem;
        const matchType = w.elective_type === electiveType || w.elective_type === 'BOTH';
        const matchBranch = electiveType === 'PE' ? (!w.branch || w.branch === 'ALL' || String(w.branch).toUpperCase() === studentBranch) : true;
        return matchBatch && matchSem && matchType && matchBranch;
      });

      const exactActive = relevantWins.find(w => w.status === 'ACTIVE');
      const exactLocked = relevantWins.find(w => w.status === 'LOCKED' || w.status === 'CLOSED');

      if (exactLocked && !exactActive) {
        const authority = electiveType === 'PE' ? 'Department Coordinator' : 'College Administrator';
        return {
          isOpen: false,
          reason: `Elective selection for Batch ${studentBatch} • Semester ${studentSem} (${electiveType === 'PE' ? 'Professional Elective' : 'Open Elective'}) is currently LOCKED by the ${authority}.`
        };
      }

      return { isOpen: true, window: exactActive || null };
    } catch (e) {
      return { isOpen: true };
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
    return db.getStudentPreferences(studentId, electiveType, semester);
  },

  // Submit preferences with instant real-time FIFO seat allocation and locking
  submitPreferences: async (studentId, electiveType, subjectPriorities, semester = null) => {
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

          // 2. Insert preferences (omitting column 'semester' to match DB schema)
          const nowIso = new Date().toISOString();
          const prefRows = items.map((p, idx) => ({
            student_id: studentId,
            elective_type: electiveType,
            elective_number: eNum,
            subject_id: p.subject_id,
            priority: p.priority || (idx + 1),
            submitted_at: nowIso
          }));

          const { error: insErr } = await supabase.from('elective_preferences').insert(prefRows);
          if (insErr) {
            console.error('Preferences insert error:', insErr);
            throw new Error(`Failed to save preferences: ${insErr.message}`);
          }

          // 3. FIFO seat allocation
          const sortedItems = [...items].sort((a, b) => (a.priority || 0) - (b.priority || 0));
          let assignedSubjId = null;
          let assignedPriority = null;
          let status = 'WAITLISTED';

          for (const p of sortedItems) {
            const { data: subj } = await supabase
              .from('subjects')
              .select('id, seats, available_seats')
              .eq('id', p.subject_id)
              .single();

            // Calibrate real-time vacancy by checking allotments count (excluding current student)
            const { data: existingAllots } = await supabase
              .from('allotments')
              .select('id, student_id')
              .eq('subject_id', p.subject_id)
              .eq('status', 'ALLOTTED');

            const otherAllots = (existingAllots || []).filter(a => a.student_id !== studentId);
            const totalSeats = Number(subj?.seats || 0);
            const occupiedSeats = otherAllots.length;
            const currentVacancy = Math.max(0, totalSeats - occupiedSeats);

            if (subj && currentVacancy > 0) {
              assignedSubjId = subj.id;
              assignedPriority = p.priority;
              status = 'ALLOTTED';

              // Decrement available_seats in subjects table
              await supabase
                .from('subjects')
                .update({ available_seats: Math.max(0, currentVacancy - 1) })
                .eq('id', subj.id);

              break;
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

          // 5. Insert fresh allotment record (omitting column 'semester' to match DB schema)
          const allotPayload = {
            student_id: studentId,
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

          const { data: insertedAllot, error: aErr } = await supabase
            .from('allotments')
            .insert([allotPayload])
            .select()
            .single();

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
          const subjectsList = allSubjects || [];

          let list = rawAllotments.map(item => {
            const subject = subjectsList.find(s => s.id === item.subject_id) || null;
            const resolvedSem = Number(subject?.semester || studentProfile?.semester || 5);
            return {
              ...item,
              subject,
              semester: resolvedSem,
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
      return {
        ...item,
        subject,
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


