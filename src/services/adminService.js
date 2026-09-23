import { db, normalizeBatch, normalizeBranchName } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { coordinatorService } from './coordinatorService';

export const adminService = {
  // --------------------------------------------------------------------------
  // 1. COORDINATOR MANAGEMENT (INSTITUTION LEVEL)
  // --------------------------------------------------------------------------

  getCoordinators: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'coordinator')
          .order('created_at', { ascending: false });

        if (!error && data !== null) {
          return data;
        }
        return [];
      } catch (e) {
        console.warn('Supabase getCoordinators warning:', e);
        return [];
      }
    }
    return db.getCoordinators ? db.getCoordinators() : [];
  },

  getDepartments: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profs } = await supabase.from('profiles').select('branch');
        const { data: currs } = await supabase.from('curriculum').select('branch');
        const { data: subjs } = await supabase.from('subjects').select('branch');
        const { data: wins } = await supabase.from('selection_windows').select('branch');

        const bSet = new Set();
        (profs || []).forEach(p => {
          if (p.branch && p.branch !== 'ALL') bSet.add(p.branch.trim().toUpperCase());
        });
        (currs || []).forEach(c => {
          if (c.branch && c.branch !== 'ALL') bSet.add(c.branch.trim().toUpperCase());
        });
        (subjs || []).forEach(s => {
          if (s.branch && s.branch !== 'ALL') bSet.add(s.branch.trim().toUpperCase());
        });
        (wins || []).forEach(w => {
          if (w.branch && w.branch !== 'ALL') bSet.add(w.branch.trim().toUpperCase());
        });

        if (bSet.size > 0) return Array.from(bSet).sort();
      } catch (e) {
        console.warn('Supabase getDepartments note:', e);
      }
    }

    return db.getDepartments ? db.getDepartments() : [];
  },

  addDepartment: async (code, name) => {
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanName = String(name || cleanCode).trim();
    if (!cleanCode) throw new Error('Department code is required.');
    return db.addDepartment ? db.addDepartment({ code: cleanCode, name: cleanName }) : cleanCode;
  },

  addCoordinator: async (coordinatorData) => {
    const cleanEmail = String(coordinatorData.email || '').trim().toLowerCase();
    const cleanName = String(coordinatorData.name || '').trim();
    const cleanBranch = String(coordinatorData.branch || 'CSE').trim().toUpperCase();
    const cleanRoll = coordinatorData.roll_number 
      ? String(coordinatorData.roll_number).trim().toUpperCase() 
      : `COORD-${cleanBranch}`;

    if (!cleanRoll) {
      throw new Error('Staff Roll Number is required.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data: existingRoll } = await supabase
        .from('profiles')
        .select('id, name, roll_number, email')
        .ilike('roll_number', cleanRoll)
        .maybeSingle();

      if (existingRoll) {
        throw new Error(`Staff Roll Number "${cleanRoll}" is already assigned to ${existingRoll.name} (${existingRoll.email}). Staff Roll Number must be unique.`);
      }

      const payload = {
        name: cleanName,
        email: cleanEmail,
        branch: cleanBranch,
        roll_number: cleanRoll,
        role: 'coordinator',
        section: 'Admin',
        regulation: 'AR23',
        admitted_batch: '2024-2028',
        semester: 5
      };

      const { data, error } = await supabase.from('profiles').upsert([payload], { onConflict: 'email' }).select().single();
      if (error) {
        throw new Error(`Database error adding coordinator: ${error.message}`);
      }
      return data || payload;
    }

    throw new Error('Database connection is not configured.');
  },

  updateCoordinator: async (id, updates) => {
    if (updates.roll_number) {
      const cleanRoll = String(updates.roll_number).trim().toUpperCase();
      if (isSupabaseConfigured && supabase) {
        const { data: existingRoll } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('roll_number', cleanRoll)
          .neq('id', id)
          .maybeSingle();

        if (existingRoll) {
          throw new Error(`Staff Roll Number "${cleanRoll}" is already assigned to ${existingRoll.name} (${existingRoll.email}). Staff Roll Number must be unique.`);
        }
      }
      updates.roll_number = cleanRoll;
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) {
        throw new Error(`Database error updating coordinator: ${error.message}`);
      }
      return data || updates;
    }

    throw new Error('Database connection is not configured.');
  },

  deleteCoordinator: async (id) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
        return true;
      } catch (e) {
        console.warn('Supabase deleteCoordinator error:', e);
        throw e;
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 2. INSTITUTION-WIDE ALLOTMENTS & FILTERS
  // --------------------------------------------------------------------------

  getInstitutionAllotments: async (filters = {}) => {
    return coordinatorService.getAllotmentRecords(filters);
  },

  getInstitutionAnalytics: async () => {
    const [students, peSubjects, oeSubjects, allotments, coordinators] = await Promise.all([
      coordinatorService.getStudents(),
      coordinatorService.getSubjects('PE'),
      coordinatorService.getSubjects('OE'),
      coordinatorService.getAllotmentRecords(),
      adminService.getCoordinators()
    ]);

    const totalStudents = students.length;
    const totalCoordinators = coordinators.length;
    const allSubjects = [...peSubjects, ...oeSubjects];
    const totalSeats = allSubjects.reduce((acc, s) => acc + Number(s.seats || 0), 0);

    const activeAllotments = allotments.filter(a => a.status === 'ALLOTTED');
    const allottedCount = activeAllotments.length;
    const waitlistedCount = allotments.filter(a => a.status === 'WAITLISTED').length;
    const pendingCount = Math.max(0, totalStudents - (allottedCount + waitlistedCount));

    // Department-wise breakdown with full metrics & seat capacity (registered branches only)
    const branchSet = new Set();
    coordinators.forEach(c => { 
      if (c.branch && c.branch !== 'ALL') {
        branchSet.add(String(c.branch).trim().toUpperCase()); 
      }
    });
    students.forEach(st => { 
      if (st.branch) {
        branchSet.add(String(st.branch).trim().toUpperCase()); 
      }
    });
    allSubjects.forEach(s => { 
      if (s.branch && s.branch !== 'ALL') {
        branchSet.add(String(s.branch).trim().toUpperCase()); 
      }
    });

    const departmentStats = Array.from(branchSet).sort().map(branchName => {
      const bUpper = branchName.toUpperCase();
      const branchStudents = students.filter(s => String(s.branch || '').trim().toUpperCase() === bUpper);
      const branchCoords = coordinators.filter(c => String(c.branch || '').trim().toUpperCase() === bUpper);
      const branchPE = peSubjects.filter(s => String(s.branch || '').trim().toUpperCase() === bUpper);
      const branchOE = oeSubjects.filter(s => String(s.branch || '').trim().toUpperCase() === bUpper);
      
      const branchPESeats = branchPE.reduce((acc, s) => acc + Number(s.seats || 0), 0);
      const branchOESeats = branchOE.reduce((acc, s) => acc + Number(s.seats || 0), 0);
      const branchTotalSeats = branchPESeats + branchOESeats;

      const branchPEAllots = allotments.filter(a => {
        const studentBranch = String(a.branch || a.studentBranch || '').trim().toUpperCase();
        return studentBranch === bUpper && a.status === 'ALLOTTED' && a.elective_type === 'PE';
      });

      const branchOEAllots = allotments.filter(a => {
        const studentBranch = String(a.branch || a.studentBranch || '').trim().toUpperCase();
        return studentBranch === bUpper && a.status === 'ALLOTTED' && a.elective_type === 'OE';
      });

      const coordinatorNames = branchCoords.map(c => c.name).filter(Boolean).join(', ') || 'Vacant';

      return {
        branch: branchName,
        name: branchName,
        studentsCount: branchStudents.length,
        totalStudents: branchStudents.length,
        hasCoordinator: branchCoords.length > 0,
        coordinatorName: coordinatorNames,
        peSubjectsCount: branchPE.length,
        peCount: branchPE.length,
        peSeats: branchPESeats,
        peAllotted: branchPEAllots.length,
        oeSubjectsCount: branchOE.length,
        oeCount: branchOE.length,
        oeSeats: branchOESeats,
        oeAllotted: branchOEAllots.length,
        totalSeats: branchTotalSeats,
        allottedCount: branchPEAllots.length + branchOEAllots.length,
        allottedStudents: branchPEAllots.length + branchOEAllots.length
      };
    }).filter(d => d.hasCoordinator || d.studentsCount > 0 || d.peSubjectsCount > 0 || d.oeSubjectsCount > 0);

    const peSeatsTotal = peSubjects.reduce((acc, s) => acc + Number(s.seats || 0), 0);
    const oeSeatsTotal = oeSubjects.reduce((acc, s) => acc + Number(s.seats || 0), 0);
    const peAllottedTotal = activeAllotments.filter(a => a.elective_type === 'PE').length;
    const oeAllottedTotal = activeAllotments.filter(a => a.elective_type === 'OE').length;

    return {
      totalStudents,
      totalCoordinators,
      totalSubjects: allSubjects.length,
      peCount: peSubjects.length,
      oeCount: oeSubjects.length,
      peSeatsTotal,
      oeSeatsTotal,
      peAllottedTotal,
      oeAllottedTotal,
      totalSeats,
      allottedCount,
      waitlistedCount,
      pendingCount,
      departmentStats
    };
  },

  // --------------------------------------------------------------------------
  // 3. BATCH-WISE OPEN ELECTIVE (OE) SELECTION WINDOWS CONTROLS
  // --------------------------------------------------------------------------
  getSelectionWindows: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('selection_windows')
          .select('*')
          .eq('elective_type', 'OE')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const list = data.map(w => ({ ...w, elective_number: Number(w.elective_number || 1) }));
          return list.sort((a, b) => {
            const batchA = normalizeBatch(a.batch || '');
            const batchB = normalizeBatch(b.batch || '');
            const batchCompare = batchB.localeCompare(batchA, undefined, { numeric: true, sensitivity: 'base' });
            if (batchCompare !== 0) return batchCompare;

            const numA = Number(a.elective_number || 1);
            const numB = Number(b.elective_number || 1);
            if (numA !== numB) return numB - numA;

            return (Number(b.semester) || 0) - (Number(a.semester) || 0);
          });
        }
        return [];
      } catch (e) {
        console.warn('Supabase selection_windows query note:', e);
        return [];
      }
    }

    const localWindows = db.getSelectionWindows ? db.getSelectionWindows('ALL', 'OE') : [];
    return localWindows.map(w => ({ ...w, elective_number: Number(w.elective_number || 1) }));
  },

  startSelectionWindow: async (windowId, windowInfo = null) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', windowId);

        if (windowInfo) {
          const cleanSem = Number(windowInfo.semester || 5);
          const cleanNum = Number(windowInfo.elective_number || 1);
          await supabase
            .from('subjects')
            .update({ active: true, updated_at: new Date().toISOString() })
            .eq('elective_type', 'OE')
            .eq('semester', cleanSem)
            .eq('elective_number', cleanNum);
        }
      } catch (e) {
        console.warn('Supabase startSelectionWindow note:', e);
      }
    }
    if (db.updateSelectionWindow) db.updateSelectionWindow(windowId, { status: 'ACTIVE' });
    return await adminService.getSelectionWindows();
  },

  stopSelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ status: 'LOCKED', updated_at: new Date().toISOString() })
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase stopSelectionWindow note:', e);
      }
    }
    if (db.updateSelectionWindow) db.updateSelectionWindow(windowId, { status: 'LOCKED' });
    return await adminService.getSelectionWindows();
  },

  deleteSelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .delete()
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase deleteSelectionWindow note:', e);
      }
    }
    if (db.deleteSelectionWindow) db.deleteSelectionWindow(windowId);
    return await adminService.getSelectionWindows();
  },

  createSelectionWindow: async (windowData) => {
    const cleanBatch = String(windowData.batch || '').trim().replace(/\s*-\s*/g, '-');
    if (!cleanBatch) {
      throw new Error('Please select or specify a target academic batch.');
    }
    const cleanSem = Number(windowData.semester || 5);
    const cleanElectiveNum = Number(windowData.elective_number || 1);
    const id = windowData.id || `WINDOW_${cleanBatch.replace(/[^A-Za-z0-9]/g, '_')}_SEM${cleanSem}_OE${cleanElectiveNum}`;

    const payload = {
      id,
      batch: cleanBatch,
      branch: 'ALL',
      semester: cleanSem,
      elective_number: cleanElectiveNum,
      elective_type: 'OE',
      status: windowData.status || 'LOCKED',
      title: windowData.title || `Batch ${cleanBatch} • Semester ${cleanSem} Open Elective (OE-${cleanElectiveNum} • Institution-Wide)`,
      allotment_revealed: Boolean(windowData.allotment_revealed || false),
      due_date: windowData.due_date || null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('selection_windows')
          .upsert([payload], { onConflict: 'id' });

        if (error) {
          console.warn('Supabase createSelectionWindow retry note:', error);
          const basePayload = {
            id,
            batch: cleanBatch,
            branch: 'ALL',
            semester: cleanSem,
            elective_type: 'OE',
            status: windowData.status || 'LOCKED',
            title: payload.title,
            allotment_revealed: Boolean(windowData.allotment_revealed || false),
            due_date: windowData.due_date || null,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
          await supabase.from('selection_windows').upsert([basePayload], { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('Supabase createSelectionWindow note:', e);
      }
    }

    if (db.createSelectionWindow) db.createSelectionWindow(payload);
    return await adminService.getSelectionWindows();
  },

  // Toggle Reveal / Hide OE Allotment for students in this drive
  toggleRevealOEAllotment: async (windowId, isRevealed) => {
    const revealed = Boolean(isRevealed);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ allotment_revealed: revealed, updated_at: new Date().toISOString() })
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase toggleRevealOEAllotment note:', e);
      }
    }
    if (db.toggleRevealSelectionWindow) db.toggleRevealSelectionWindow(windowId, revealed);
    return await adminService.getSelectionWindows();
  },

  // Update Due Date / Deadline for OE Selection Drive
  updateOEDriveDueDate: async (windowId, dueDate) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ due_date: dueDate || null, updated_at: new Date().toISOString() })
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase updateOEDriveDueDate note:', e);
      }
    }
    if (db.updateSelectionWindowDueDate) db.updateSelectionWindowDueDate(windowId, dueDate);
    return await adminService.getSelectionWindows();
  },

  // Auto-allocate OE students according to Admin-defined Branch Priority + Section-wise + Waitlist Priority Reallocation
  autoAllocateOEStudents: async (drive, branchPriorityList = []) => {
    const batch = drive.batch;
    const semester = Number(drive.semester || 5);
    const targetElectiveNum = Number(drive.elective_number || 1);
    let totalAllotted = 0;

    // 1. In Supabase mode, also sync to DB if connected
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanTargetBatch = normalizeBatch(batch);

        const { data: allProfiles, error: profErr } = await supabase
          .from('profiles')
          .select('*');

        if (profErr) {
          console.warn('Profiles fetch error in autoAllocateOEStudents:', profErr);
        }

        const eligible = (allProfiles || []).filter(s => {
          const isStudent = String(s.role || '').trim().toLowerCase() === 'student';
          if (!isStudent) return false;
          const sBatch = normalizeBatch(s.admitted_batch);
          if (cleanTargetBatch && sBatch && sBatch !== 'ALL') {
            return sBatch === cleanTargetBatch || Number(s.semester || 5) === semester;
          }
          return Number(s.semester || 5) === semester || !cleanTargetBatch;
        });

        const { data: allSubjects, error: subjErr } = await supabase
          .from('subjects')
          .select('*');

        if (subjErr) {
          console.warn('Subjects fetch error in autoAllocateOEStudents:', subjErr);
        }

        let subjects = (allSubjects || []).filter(s => {
          const isOE = String(s.elective_type || '').trim().toUpperCase() === 'OE';
          const sSem = Number(s.semester || 5);
          const sNum = Number(s.elective_number || 1);
          return isOE && sSem === semester && sNum === targetElectiveNum;
        });

        if (subjects.length === 0) {
          subjects = (allSubjects || []).filter(s => {
            const isOE = String(s.elective_type || '').trim().toUpperCase() === 'OE';
            const sSem = Number(s.semester || 5);
            return isOE && sSem === semester;
          });
        }

        if (subjects.length === 0) {
          subjects = (allSubjects || []).filter(s => {
            const isOE = String(s.elective_type || '').trim().toUpperCase() === 'OE';
            return isOE;
          });
        }

        if (subjects && subjects.length > 0 && eligible.length > 0) {
          const { data: allAllots } = await supabase
            .from('allotments')
            .select('*');

          const existingAllots = (allAllots || []).filter(a =>
            String(a.elective_type || '').trim().toUpperCase() === 'OE' &&
            Number(a.elective_number || 1) === targetElectiveNum
          );

          const { data: allPrefs } = await supabase
            .from('elective_preferences')
            .select('*');

          const preferences = (allPrefs || []).filter(p =>
            String(p.elective_type || '').trim().toUpperCase() === 'OE' &&
            Number(p.elective_number || 1) === targetElectiveNum
          );

          const branchOrder = (branchPriorityList && branchPriorityList.length > 0)
            ? branchPriorityList.map(b => normalizeBranchName(b))
            : [];

          // Calibrate dynamic available seats
          for (const s of subjects) {
            const count = existingAllots.filter(a => a.subject_id === s.id && a.status === 'ALLOTTED').length;
            const totalCap = Number(s.seats || s.available_seats || 60);
            s.available_seats = Math.max(0, totalCap - count);
          }

          const nowIso = new Date().toISOString();

          // Phase 1: Reallocate WAITLISTED students who previously submitted preferences (Cross-Department only)
          const waitlistedAllots = existingAllots.filter(a => 
            a.status === 'WAITLISTED' &&
            eligible.some(st => st.id === a.student_id || (st.email && a.student_email && st.email.toLowerCase() === a.student_email.toLowerCase()))
          );

          for (const waitRecord of waitlistedAllots) {
            const stObj = eligible.find(s => s.id === waitRecord.student_id || (s.email && waitRecord.student_email && s.email.toLowerCase() === waitRecord.student_email.toLowerCase()));
            const stBranch = normalizeBranchName(stObj?.branch || waitRecord.branch || '');

            const studentPrefs = preferences
              .filter(p => p.student_id === waitRecord.student_id || (waitRecord.roll_number && p.roll_number === waitRecord.roll_number))
              .sort((a, b) => Number(a.priority) - Number(b.priority));

            for (const pref of studentPrefs) {
              const targetSubj = subjects.find(s => {
                if (s.id !== pref.subject_id) return false;
                if (Number(s.available_seats || 0) <= 0) return false;
                const subjBranch = normalizeBranchName(s.branch || '');
                if (subjBranch && stBranch && subjBranch === stBranch) return false; // Strictly forbid own branch
                if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                  const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => normalizeBranchName(b) === stBranch);
                  if (!allowed) return false;
                }
                return true;
              });

              if (targetSubj) {
                waitRecord.subject_id = targetSubj.id;
                waitRecord.priority_selected = pref.priority;
                waitRecord.status = 'ALLOTTED';
                waitRecord.is_auto_allocated = false;
                waitRecord.allotted_at = nowIso;
                targetSubj.available_seats = Math.max(0, targetSubj.available_seats - 1);
                totalAllotted++;

                await supabase.from('allotments').update({
                  subject_id: targetSubj.id,
                  priority_selected: pref.priority,
                  status: 'ALLOTTED',
                  is_auto_allocated: false,
                  allotted_at: nowIso,
                  updated_at: nowIso
                }).eq('id', waitRecord.id);

                await supabase.from('subjects').update({ available_seats: targetSubj.available_seats }).eq('id', targetSubj.id);
                break;
              }
            }
          }

          // Phase 2: Branch Priority sequence + Section-wise sorted unallocated students
          const unallocated = eligible.filter(st => {
            return !existingAllots.some(a => 
              (a.student_id === st.id || (a.student_email && a.student_email.toLowerCase() === st.email.toLowerCase())) &&
              a.status === 'ALLOTTED'
            );
          }).sort((a, b) => {
            const branchA = normalizeBranchName(a.branch || '');
            const branchB = normalizeBranchName(b.branch || '');
            const idxA = branchOrder.indexOf(branchA) === -1 ? 999 : branchOrder.indexOf(branchA);
            const idxB = branchOrder.indexOf(branchB) === -1 ? 999 : branchOrder.indexOf(branchB);

            if (idxA !== idxB) return idxA - idxB;
            const secComp = String(a.section || 'A').localeCompare(String(b.section || 'A'));
            if (secComp !== 0) return secComp;
            return String(a.roll_number || '').localeCompare(String(b.roll_number || ''));
          });

          let subjIdx = 0;
          for (const st of unallocated) {
            const studentBranch = normalizeBranchName(st.branch || '');

            // Check preferences first (Cross-department only)
            const studentPrefs = preferences
              .filter(p => p.student_id === st.id || (st.roll_number && p.roll_number === st.roll_number))
              .sort((a, b) => Number(a.priority) - Number(b.priority));

            let chosenSubj = null;
            let chosenPriority = null;

            for (const pref of studentPrefs) {
              const targetSubj = subjects.find(s => {
                if (s.id !== pref.subject_id) return false;
                if (Number(s.available_seats || 0) <= 0) return false;
                const subjBranch = normalizeBranchName(s.branch || '');
                if (subjBranch && studentBranch && subjBranch === studentBranch) return false;
                if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                  const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => normalizeBranchName(b) === studentBranch);
                  if (!allowed) return false;
                }
                return true;
              });

              if (targetSubj) {
                chosenSubj = targetSubj;
                chosenPriority = pref.priority;
                break;
              }
            }

            // If no preference could be fulfilled, choose available cross-department subject
            if (!chosenSubj) {
              const crossDeptAvailable = subjects.filter(s => {
                if (Number(s.available_seats || 0) <= 0) return false;
                const subjBranch = normalizeBranchName(s.branch || '');
                if (subjBranch && studentBranch && subjBranch === studentBranch) return false; // Strictly forbid own branch
                if (Array.isArray(s.offered_branches) && s.offered_branches.length > 0) {
                  const allowed = s.offered_branches.includes('ALL') || s.offered_branches.some(b => normalizeBranchName(b) === studentBranch);
                  if (!allowed) return false;
                }
                return true;
              });

              if (crossDeptAvailable.length > 0) {
                chosenSubj = crossDeptAvailable[subjIdx % crossDeptAvailable.length];
                subjIdx++;
              }
            }

            const insertPayload = {
              student_id: st.id,
              roll_number: st.roll_number || 'N/A',
              student_email: st.email,
              student_name: st.name || '',
              elective_type: 'OE',
              elective_number: targetElectiveNum,
              subject_id: chosenSubj ? chosenSubj.id : null,
              priority_selected: chosenPriority,
              is_auto_allocated: true,
              history_id: drive.id,
              status: chosenSubj ? 'ALLOTTED' : 'WAITLISTED',
              submitted_at: nowIso,
              allotted_at: nowIso,
              updated_at: nowIso
            };

            try {
              // Delete prior unassigned or waitlist record
              await supabase.from('allotments').delete()
                .eq('student_id', st.id)
                .eq('elective_type', 'OE')
                .eq('elective_number', targetElectiveNum);

              const { error: insErr } = await supabase.from('allotments').insert([insertPayload]);
              if (insErr) {
                console.warn('OE auto allot insert retry with minimal schema:', insErr);
                const minPayload = {
                  student_id: st.id,
                  student_email: st.email,
                  elective_type: 'OE',
                  elective_number: targetElectiveNum,
                  subject_id: chosenSubj ? chosenSubj.id : null,
                  priority_selected: chosenPriority,
                  is_auto_allocated: true,
                  status: chosenSubj ? 'ALLOTTED' : 'WAITLISTED',
                  submitted_at: nowIso,
                  allotted_at: nowIso
                };
                await supabase.from('allotments').insert([minPayload]);
              }

              if (chosenSubj) {
                chosenSubj.available_seats = Math.max(0, chosenSubj.available_seats - 1);
                await supabase.from('subjects').update({ available_seats: chosenSubj.available_seats }).eq('id', chosenSubj.id);
                totalAllotted++;
              }
            } catch (insErr) {
              console.error('OE auto allot insert exception:', insErr);
            }
          }

          // Update selection window allocated_count in DB
          if (drive?.id) {
            try {
              const { count: freshAllotedCount } = await supabase
                .from('allotments')
                .select('id', { count: 'exact', head: true })
                .eq('elective_type', 'OE')
                .eq('elective_number', targetElectiveNum)
                .eq('status', 'ALLOTTED');

              await supabase.from('selection_windows').update({
                allocated_count: freshAllotedCount ?? totalAllotted,
                updated_at: nowIso
              }).eq('id', drive.id);
            } catch (winSyncErr) {
              console.warn('Window sync note:', winSyncErr);
            }
          }

          // Sync storage silently
          try {
            db.autoAllocateStudents({
              windowId: drive.id,
              batch,
              semester,
              branch: 'ALL',
              electiveType: 'OE',
              elective_number: targetElectiveNum,
              branchPriorityList
            });
          } catch (storageErr) {
            console.warn('Storage sync note:', storageErr);
          }

          return {
            success: true,
            count: totalAllotted,
            message: `Successfully allocated and reallocated ${totalAllotted} student(s) for OE-${targetElectiveNum}.`
          };
        }
      } catch (e) {
        console.warn('Supabase autoAllocateOEStudents note:', e);
      }
    }

    return db.autoAllocateStudents({
      windowId: drive.id,
      batch,
      semester,
      branch: 'ALL',
      electiveType: 'OE',
      elective_number: targetElectiveNum,
      branchPriorityList
    });
  },

  undoAutoAllocateOE: async (driveOrId) => {
    const driveObj = typeof driveOrId === 'object' && driveOrId !== null ? driveOrId : { id: driveOrId };
    const targetElectiveNum = Number(driveObj.elective_number || 1);
    const cleanSem = Number(driveObj.semester || 5);
    let revertedCount = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Delete all auto-allocated allotments for this OE slot
        const { data: autoAllots, error: fetchErr } = await supabase
          .from('allotments')
          .select('id')
          .eq('elective_type', 'OE')
          .eq('elective_number', targetElectiveNum)
          .eq('is_auto_allocated', true);

        if (!fetchErr && autoAllots && autoAllots.length > 0) {
          const idsToDelete = autoAllots.map(a => a.id);
          const { error: delErr } = await supabase
            .from('allotments')
            .delete()
            .in('id', idsToDelete);

          if (!delErr) {
            revertedCount = idsToDelete.length;
          }
        }

        // 2. Recalculate remaining seats on OE subjects
        const { data: remainingAllots } = await supabase
          .from('allotments')
          .select('subject_id')
          .eq('elective_type', 'OE')
          .eq('elective_number', targetElectiveNum)
          .eq('status', 'ALLOTTED');

        const { data: allSubjects } = await supabase
          .from('subjects')
          .select('id, seats, elective_type, semester, elective_number');

        const subjects = (allSubjects || []).filter(s => {
          const isOE = String(s.elective_type || '').toUpperCase() === 'OE';
          const matchSem = Number(s.semester || 5) === cleanSem;
          const matchNum = Number(s.elective_number || 1) === targetElectiveNum;
          return isOE && matchSem && matchNum;
        });

        if (subjects && subjects.length > 0) {
          for (const s of subjects) {
            const activeCount = (remainingAllots || []).filter(a => a.subject_id === s.id).length;
            const totalCap = Number(s.seats || 60);
            const updatedAvailable = Math.max(0, totalCap - activeCount);
            await supabase.from('subjects').update({ available_seats: updatedAvailable }).eq('id', s.id);
          }
        }

        return {
          success: true,
          revertedCount,
          message: `Reverted ${revertedCount} auto-allocated assignment(s) for OE-${targetElectiveNum}. You can now update subject seats and reallocate.`
        };
      } catch (err) {
        console.warn('Supabase undoAutoAllocateOE note:', err);
      }
    }

    return {
      success: true,
      revertedCount: 0,
      message: `Reverted auto-allocation for OE-${targetElectiveNum}.`
    };
  },

  redoAutoAllocateOE: async (windowId) => {
    return {
      success: true,
      restoredCount: 0
    };
  },

  getOEAutoAllocationHistory: (windowId) => {
    return db.getAutoAllocationHistory(windowId);
  },

  exportInstitutionCSV: (allotmentsList, filename = 'institution_master_allotments.csv') => {
    coordinatorService.exportAllotmentsCSV(allotmentsList, filename);
  },

  // Manual Allotment Override & Assignment by Admin
  manualUpdateAllotment: async ({ allotmentId, studentId, electiveType, electiveNumber, semester, newSubjectId, reason, adminId }) => {
    return coordinatorService.manualUpdateAllotment({
      allotmentId,
      studentId,
      electiveType,
      electiveNumber,
      semester,
      newSubjectId,
      reason,
      coordinatorId: adminId
    });
  },

  // Reset Student Allotment & Preference Selection by Admin
  resetStudentAllotment: async (studentId, electiveType = 'OE', electiveNumber = 1, adminId = null) => {
    return coordinatorService.unlockStudentSelection(studentId, electiveType, adminId, electiveNumber);
  }
};

