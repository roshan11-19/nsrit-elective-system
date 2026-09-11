import { db } from '../lib/storage';
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
    return [];
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
          return data;
        }
      } catch (e) {
        console.warn('Supabase selection_windows query note:', e);
      }
    }

    return db.getSelectionWindows ? db.getSelectionWindows('ALL', 'OE') : [];
  },

  startSelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', windowId);
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
    const id = `WINDOW_${cleanBatch.replace(/[^A-Za-z0-9]/g, '_')}_SEM${cleanSem}_OE`;

    const payload = {
      id,
      batch: cleanBatch,
      branch: 'ALL',
      semester: cleanSem,
      elective_type: 'OE',
      status: windowData.status || 'ACTIVE',
      title: windowData.title || `Batch ${cleanBatch} • Semester ${cleanSem} Open Elective (Institution-Wide)`,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .upsert([payload], { onConflict: 'id' });
      } catch (e) {
        console.warn('Supabase createSelectionWindow note:', e);
      }
    }

    if (db.createSelectionWindow) db.createSelectionWindow(payload);
    return await adminService.getSelectionWindows();
  },

  exportInstitutionCSV: (allotmentsList, filename = 'institution_master_allotments.csv') => {
    coordinatorService.exportAllotmentsCSV(allotmentsList, filename);
  }
};
