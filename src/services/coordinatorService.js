import * as XLSX from 'xlsx';
import { db, normalizeBatch } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const coordinatorService = {
  // --------------------------------------------------------------------------
  // 0. BATCH NORMALIZATION & CURRICULUM MANAGEMENT (TAB 1)
  // --------------------------------------------------------------------------
  normalizeBatch: (batchStr) => normalizeBatch(batchStr),

  getCurriculumBatches: async (branch = 'ALL') => {
    const list = await coordinatorService.getCurriculum('ALL', branch);
    const batches = Array.from(new Set(list.map(c => normalizeBatch(c.batch)).filter(Boolean))).sort();
    return batches;
  },

  getCurriculumBatchSummaries: async (branch = 'ALL') => {
    const list = await coordinatorService.getCurriculum('ALL', branch);
    const map = {};
    list.forEach(item => {
      const b = normalizeBatch(item.batch);
      if (!b) return;
      if (!map[b]) {
        map[b] = {
          batch: b,
          regulation: item.regulation || 'AR23',
          peCount: 0,
          oeCount: 0,
          semesters: new Set(),
          subjects: []
        };
      }
      if (item.elective_type === 'PE') map[b].peCount += 1;
      else if (item.elective_type === 'OE') map[b].oeCount += 1;
      if (item.semester) map[b].semesters.add(Number(item.semester));
      map[b].subjects.push(item);
    });

    return Object.values(map).map(b => ({
      ...b,
      semesters: Array.from(b.semesters).sort((a, b) => a - b),
      totalSubjects: b.peCount + b.oeCount
    }));
  },

  getCurriculum: async (batch = 'ALL', branch = 'ALL', semester = 'ALL', electiveType = 'ALL') => {
    let reqBatch = batch;
    let reqBranch = branch;
    let reqSemester = semester;
    let reqElectiveType = electiveType;

    if (typeof batch === 'object' && batch !== null) {
      reqBatch = batch.batch || 'ALL';
      reqBranch = batch.branch || 'ALL';
      reqSemester = batch.semester || 'ALL';
      reqElectiveType = batch.electiveType || batch.elective_type || 'ALL';
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('curriculum').select('*').order('semester', { ascending: true }).order('elective_number', { ascending: true });
        if (reqBatch && reqBatch !== 'ALL') {
          query = query.eq('batch', normalizeBatch(reqBatch));
        }
        if (reqBranch && reqBranch !== 'ALL') {
          query = query.eq('branch', reqBranch);
        }
        if (reqSemester && reqSemester !== 'ALL') {
          query = query.eq('semester', Number(reqSemester));
        }
        if (reqElectiveType && reqElectiveType !== 'ALL') {
          query = query.eq('elective_type', reqElectiveType);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('Supabase getCurriculum note:', e);
      }
    }
    return db.getCurriculum(reqBatch, reqBranch, reqSemester, reqElectiveType);
  },

  uploadCurriculumExcel: async (targetBatch, coordinatorBranch, rows) => {
    const cleanBatch = normalizeBatch(targetBatch || '');
    const cleanBranch = String(coordinatorBranch || 'CSE').trim().toUpperCase();

    const formatted = rows.map((r, idx) => {
      const code = String(r.subject_code || r['Subject Code'] || r['Course Code'] || r['Code'] || '').trim().toUpperCase().replace(/\s+/g, '');
      const name = String(r.subject_name || r['Subject Name'] || r['Course Name'] || r['Name'] || '').trim();
      const sem = Number(r.semester || r['Semester'] || r['Sem'] || 5);
      
      const rawType = String(r.elective_type || r['Elective Type'] || r['Type'] || 'PE').trim().toUpperCase();
      const isOE = rawType.includes('OPEN') || rawType === 'OE';
      const eType = isOE ? 'OE' : 'PE';

      const rawNum = r.elective_number || r['Elective Number'] || r['Elective No'] || r['Number'] || 1;
      const eNum = Math.max(1, Math.min(8, Number(rawNum) || 1));
      const reg = String(r.regulation || r['Regulation'] || 'AR23').trim().toUpperCase();

      return {
        batch: cleanBatch,
        branch: cleanBranch,
        regulation: reg,
        semester: sem >= 1 && sem <= 8 ? sem : 5,
        elective_type: eType,
        elective_number: eNum,
        subject_code: code || `SUBJ-${idx + 1}`,
        subject_name: name || `Curriculum Course ${idx + 1}`
      };
    }).filter(r => r.subject_code && r.subject_name);

    // Validate duplicate subject codes within the upload list
    const seenCodes = new Set();
    for (const r of formatted) {
      if (seenCodes.has(r.subject_code)) {
        throw new Error(`Duplicate Subject Code "${r.subject_code}" detected in uploaded curriculum. Each subject code in a batch must be unique.`);
      }
      seenCodes.add(r.subject_code);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('curriculum')
          .upsert(formatted, { onConflict: 'batch,branch,subject_code' })
          .select();

        if (error) {
          console.error('Supabase uploadCurriculumExcel error:', error);
          throw new Error(`Database error saving curriculum: ${error.message}`);
        }
        return data || formatted;
      } catch (err) {
        console.warn('Supabase curriculum upsert fallback note:', err);
      }
    }

    return db.addCurriculumBatch(formatted);
  },

  addCurriculumSubject: async (subjectData) => {
    const payload = {
      batch: normalizeBatch(subjectData.batch || ''),
      branch: String(subjectData.branch || 'CSE').trim().toUpperCase(),
      regulation: String(subjectData.regulation || 'AR23').trim().toUpperCase(),
      semester: Number(subjectData.semester || 5),
      elective_type: String(subjectData.elective_type || 'PE').toUpperCase(),
      elective_number: Number(subjectData.elective_number || 1),
      subject_code: String(subjectData.subject_code || '').trim().toUpperCase().replace(/\s+/g, ''),
      subject_name: String(subjectData.subject_name || '').trim()
    };

    if (!payload.subject_code || !payload.subject_name) {
      throw new Error('Subject Code and Subject Name are required.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('curriculum')
        .upsert([payload], { onConflict: 'batch,branch,subject_code' })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error adding curriculum subject: ${error.message}`);
      }
      return data || payload;
    }

    return db.addCurriculumSubject(payload);
  },

  updateCurriculumSubject: async (id, updates) => {
    const payload = {
      batch: normalizeBatch(updates.batch || ''),
      branch: String(updates.branch || 'CSE').trim().toUpperCase(),
      regulation: String(updates.regulation || 'AR23').trim().toUpperCase(),
      semester: Number(updates.semester || 5),
      elective_type: String(updates.elective_type || 'PE').toUpperCase(),
      elective_number: Number(updates.elective_number || 1),
      subject_code: String(updates.subject_code || '').trim().toUpperCase().replace(/\s+/g, ''),
      subject_name: String(updates.subject_name || '').trim()
    };

    if (!payload.subject_code || !payload.subject_name) {
      throw new Error('Subject Code and Subject Name are required.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('curriculum')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error updating curriculum subject: ${error.message}`);
      }
      return data || { id, ...payload };
    }

    return db.updateCurriculumSubject(id, payload);
  },

  deleteCurriculumSubject: async (id) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('curriculum')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (e) {
        console.warn('Supabase deleteCurriculumSubject note:', e);
      }
    }
    return db.deleteCurriculumSubject(id);
  },

  exportCurriculumTemplate: (batch = '', branch = 'CSE') => {
    const sampleRows = [
      {
        'Semester': 5,
        'Elective Type': 'Professional Elective',
        'Elective Number': 1,
        'Subject Code': 'CS501PE',
        'Subject Name': 'Software Testing Methodologies',
        'Regulation': 'AR23'
      },
      {
        'Semester': 5,
        'Elective Type': 'Professional Elective',
        'Elective Number': 1,
        'Subject Code': 'CS502PE',
        'Subject Name': 'Advanced Web Technologies',
        'Regulation': 'AR23'
      },
      {
        'Semester': 5,
        'Elective Type': 'Open Elective',
        'Elective Number': 1,
        'Subject Code': 'CS501OE',
        'Subject Name': 'Fundamentals of Artificial Intelligence',
        'Regulation': 'AR23'
      },
      {
        'Semester': 6,
        'Elective Type': 'Professional Elective',
        'Elective Number': 2,
        'Subject Code': 'CS601PE',
        'Subject Name': 'Cloud Computing & DevOps',
        'Regulation': 'AR23'
      },
      {
        'Semester': 6,
        'Elective Type': 'Open Elective',
        'Elective Number': 2,
        'Subject Code': 'CS601OE',
        'Subject Name': 'Cyber Security & Ethical Hacking',
        'Regulation': 'AR23'
      },
      {
        'Semester': 7,
        'Elective Type': 'Professional Elective',
        'Elective Number': 3,
        'Subject Code': 'CS701PE',
        'Subject Name': 'Machine Learning Algorithms',
        'Regulation': 'AR23'
      },
      {
        'Semester': 7,
        'Elective Type': 'Open Elective',
        'Elective Number': 3,
        'Subject Code': 'CS701OE',
        'Subject Name': 'Data Science for Engineers',
        'Regulation': 'AR23'
      },
      {
        'Semester': 8,
        'Elective Type': 'Professional Elective',
        'Elective Number': 4,
        'Subject Code': 'CS801PE',
        'Subject Name': 'Blockchain Architecture',
        'Regulation': 'AR23'
      },
      {
        'Semester': 8,
        'Elective Type': 'Professional Elective',
        'Elective Number': 5,
        'Subject Code': 'CS802PE',
        'Subject Name': 'Natural Language Processing',
        'Regulation': 'AR23'
      },
      {
        'Semester': 8,
        'Elective Type': 'Open Elective',
        'Elective Number': 4,
        'Subject Code': 'CS801OE',
        'Subject Name': 'Deep Learning with PyTorch',
        'Regulation': 'AR23'
      }
    ];

    try {
      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Curriculum_Master');
      const batchSuffix = batch ? `_${normalizeBatch(batch)}` : '';
      XLSX.writeFile(workbook, `Curriculum_Template${batchSuffix}_${branch}.xlsx`);
    } catch (e) {
      console.error('Error generating curriculum template via XLSX:', e);
      // Fallback CSV download
      const headers = ['Semester', 'Elective Type', 'Elective Number', 'Subject Code', 'Subject Name', 'Regulation'];
      const csvContent = [
        headers.join(','),
        ...sampleRows.map(r => `"${r.Semester}","${r['Elective Type']}","${r['Elective Number']}","${r['Subject Code']}","${r['Subject Name']}","${r.Regulation}"`)
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const batchSuffix = batch ? `_${normalizeBatch(batch)}` : '';
      link.setAttribute('download', `Curriculum_Template${batchSuffix}_${branch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // --------------------------------------------------------------------------
  // 1. COORDINATOR BATCH ALLOTMENT DRIVES (PE ONLY) (TAB 2)
  // --------------------------------------------------------------------------
  getPESelectionWindows: async (branch) => {
    const cleanBranch = String(branch || 'CSE').trim().toUpperCase();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('selection_windows')
          .select('*')
          .eq('elective_type', 'PE')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.filter(w => !w.branch || w.branch === 'ALL' || String(w.branch).toUpperCase() === cleanBranch);
        }
      } catch (e) {
        console.warn('Supabase getPESelectionWindows note:', e);
      }
    }
    return db.getSelectionWindows(cleanBranch, 'PE');
  },

  createPESelectionWindow: async (driveData, coordinatorBranch) => {
    const cleanBatch = normalizeBatch(driveData.batch || '');
    const cleanBranch = String(coordinatorBranch || driveData.branch || 'CSE').trim().toUpperCase();
    const cleanSem = Number(driveData.semester || 5);
    const id = `WINDOW_${cleanBatch.replace(/[^A-Za-z0-9]/g, '_')}_SEM${cleanSem}_PE_${cleanBranch}`;

    const payload = {
      id,
      batch: cleanBatch,
      branch: cleanBranch,
      semester: cleanSem,
      elective_type: 'PE',
      status: driveData.status || 'ACTIVE',
      title: driveData.title || `Batch ${cleanBatch} • Semester ${cleanSem} Professional Elective (${cleanBranch})`,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('selection_windows')
          .upsert([payload], { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          throw new Error(`Database error creating PE drive: ${error.message}`);
        }
        return data || payload;
      } catch (e) {
        console.warn('Supabase createPESelectionWindow note:', e);
      }
    }

    return db.createSelectionWindow(payload);
  },

  startPESelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase startPESelectionWindow note:', e);
      }
    }
    db.updateSelectionWindow(windowId, { status: 'ACTIVE' });
    return true;
  },

  stopPESelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('selection_windows')
          .update({ status: 'LOCKED', updated_at: new Date().toISOString() })
          .eq('id', windowId);
      } catch (e) {
        console.warn('Supabase stopPESelectionWindow note:', e);
      }
    }
    db.updateSelectionWindow(windowId, { status: 'LOCKED' });
    return true;
  },

  deletePESelectionWindow: async (windowId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('selection_windows').delete().eq('id', windowId);
      } catch (e) {
        console.warn('Supabase deletePESelectionWindow note:', e);
      }
    }
    db.deleteSelectionWindow(windowId);
    return true;
  },

  // --------------------------------------------------------------------------
  // 2. ELECTIVE SUBJECTS (OFFERING ACTIVE SUBJECTS FROM CURRICULUM) (TAB 3)
  // --------------------------------------------------------------------------
  activateSubjectsFromCurriculum: async ({ batch, branch, semester, elective_type, elective_number, curriculumSubjects, seats = 60 }) => {
    const cleanBatch = normalizeBatch(batch || '');
    const cleanBranch = String(branch || 'CSE').trim().toUpperCase();
    const cleanSem = Number(semester || 5);
    const cleanElectiveNum = Number(elective_number || 1);
    const cleanType = String(elective_type || 'PE').toUpperCase();
    const fallbackSeatCount = Number(seats || 60);

    // Rule 1: For PE, an established PE drive must exist for this batch & semester
    if (cleanType === 'PE') {
      const peWindows = await coordinatorService.getPESelectionWindows(cleanBranch);
      const matchingDrive = (peWindows || []).find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === cleanSem
      );
      if (!matchingDrive) {
        throw new Error(`Cannot offer PE subjects. No PE Selection Drive has been established for Batch ${cleanBatch} (Semester ${cleanSem}). Please establish the PE drive in Tab 2 first.`);
      }
      if (matchingDrive.status === 'ACTIVE') {
        throw new Error(`Cannot modify or add subject offerings while the PE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${cleanSem}). Please pause the drive in Tab 2 before making changes.`);
      }
    }

    const subjectsToInsert = curriculumSubjects.map(cs => {
      const individualSeats = (cs.seats !== undefined && cs.seats !== '' && !isNaN(Number(cs.seats))) 
        ? Math.max(1, Number(cs.seats)) 
        : (seatCount || 60);
      return {
        subject_code: cs.subject_code,
        subject_name: cs.subject_name,
        elective_type: cleanType,
        elective_number: cleanElectiveNum,
        branch: cleanBranch,
        offered_branches: cleanType === 'OE' ? (Array.isArray(cs.offered_branches) ? cs.offered_branches : ['ALL']) : [cleanBranch],
        admitted_batch: cleanBatch,
        regulation: cs.regulation || 'AR23',
        semester: cleanSem,
        seats: individualSeats,
        available_seats: individualSeats,
        active: true
      };
    });

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .upsert(subjectsToInsert, { onConflict: 'subject_code' })
        .select();

      if (error) {
        throw new Error(`Database error offering curriculum subjects: ${error.message}`);
      }
      return data || subjectsToInsert;
    }

    return subjectsToInsert.map(s => db.addSubject(s));
  },

  getSubjects: async (electiveType, branch) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('subjects').select('*').order('created_at', { ascending: false });
        if (electiveType && electiveType !== 'ALL') {
          query = query.eq('elective_type', electiveType);
        }
        if (branch && branch !== 'ALL') {
          query = query.eq('branch', branch);
        }
        const { data, error } = await query;
        if (!error && data !== null) {
          // Calibrate seats with Supabase allotments
          const { data: allotData } = await supabase.from('allotments').select('subject_id, status').eq('status', 'ALLOTTED');
          const allots = allotData || [];
          return data.map(s => {
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
        return [];
      } catch (e) {
        console.warn('Supabase getSubjects note:', e);
        return [];
      }
    }
    return db.getSubjects(electiveType, branch);
  },

  addSubject: async (subjectData) => {
    const cleanBatch = normalizeBatch(subjectData.admitted_batch || '');
    const cleanSem = Number(subjectData.semester || 5);
    const cleanType = String(subjectData.elective_type || 'PE').toUpperCase();
    const cleanBranch = String(subjectData.branch || 'CSE').trim().toUpperCase();

    if (cleanType === 'PE') {
      const peWindows = await coordinatorService.getPESelectionWindows(cleanBranch);
      const matchingDrive = (peWindows || []).find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === cleanSem
      );
      if (!matchingDrive) {
        throw new Error(`Cannot add PE subject. No PE Selection Drive has been established for Batch ${cleanBatch} (Semester ${cleanSem}). Please establish the PE drive in Tab 2 first.`);
      }
      if (matchingDrive.status === 'ACTIVE') {
        throw new Error(`Cannot add subjects while the PE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${cleanSem}). Please pause the drive in Tab 2 first.`);
      }
    }

    const payload = {
      ...subjectData,
      admitted_batch: cleanBatch,
      semester: cleanSem,
      elective_type: cleanType,
      branch: cleanBranch,
      elective_number: Number(subjectData.elective_number || 1),
      seats: Number(subjectData.seats),
      available_seats: Number(subjectData.seats)
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('subjects').insert([payload]).select().single();
      if (error) {
        throw new Error(`Database error adding subject: ${error.message}`);
      }
      return data || payload;
    }
    return db.addSubject(payload);
  },

  // Automatically recalculate and promote waitlisted/higher-choice students in strict FIFO order when seats change
  recalculateFIFOAllotments: async ({ subjectId = null, batch = null, semester = null, elective_type = null, elective_number = null } = {}) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let targetBatch = batch ? normalizeBatch(batch) : null;
        let targetSem = semester ? Number(semester) : null;
        let targetType = elective_type || null;
        let targetNum = elective_number ? Number(elective_number) : null;

        if (subjectId) {
          const { data: targetSubj } = await supabase.from('subjects').select('*').eq('id', subjectId).maybeSingle();
          if (targetSubj) {
            targetBatch = targetBatch || normalizeBatch(targetSubj.admitted_batch || '');
            targetSem = targetSem || Number(targetSubj.semester || 5);
            targetType = targetType || targetSubj.elective_type;
            targetNum = targetNum || Number(targetSubj.elective_number || 1);
          }
        }

        // Fetch active subjects in this elective pool
        let subjQuery = supabase.from('subjects').select('*').eq('active', true);
        if (targetSem) subjQuery = subjQuery.eq('semester', targetSem);
        if (targetType) subjQuery = subjQuery.eq('elective_type', targetType);
        if (targetNum) subjQuery = subjQuery.eq('elective_number', targetNum);

        const { data: subjectsData, error: sErr } = await subjQuery;
        if (sErr || !subjectsData || subjectsData.length === 0) return { success: true, promotionsCount: 0 };

        let poolSubjects = subjectsData;
        if (targetBatch) {
          poolSubjects = poolSubjects.filter(s => !s.admitted_batch || normalizeBatch(s.admitted_batch) === targetBatch);
        }

        const poolSubjectIds = new Set(poolSubjects.map(s => s.id));
        const poolSubjectMap = {};
        poolSubjects.forEach(s => {
          poolSubjectMap[s.id] = {
            ...s,
            totalSeats: Number(s.seats || 0)
          };
        });

        // Fetch preferences for this elective type and elective number
        let prefQuery = supabase.from('elective_preferences').select('*');
        if (targetType) prefQuery = prefQuery.eq('elective_type', targetType);
        if (targetNum) prefQuery = prefQuery.eq('elective_number', targetNum);

        const { data: prefsData } = await prefQuery.order('priority', { ascending: true });
        const allPrefs = (prefsData || []).filter(p => poolSubjectIds.has(p.subject_id));

        // Fetch existing allotments
        let allotQuery = supabase.from('allotments').select('*');
        if (targetType) allotQuery = allotQuery.eq('elective_type', targetType);
        if (targetNum) allotQuery = allotQuery.eq('elective_number', targetNum);

        const { data: allotsData } = await allotQuery;
        const existingAllotments = allotsData || [];

        // If no preferences yet, just sync available_seats
        if (allPrefs.length === 0) {
          for (const s of poolSubjects) {
            const count = existingAllotments.filter(a => a.subject_id === s.id && a.status === 'ALLOTTED').length;
            await supabase.from('subjects').update({ available_seats: Math.max(0, s.totalSeats - count) }).eq('id', s.id);
          }
          return { success: true, promotionsCount: 0 };
        }

        // Fetch profiles of students
        const studentIds = Array.from(new Set(allPrefs.map(p => p.student_id)));
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', studentIds);
        const profilesMap = {};
        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });

        // Group preferences by student and find earliest submission timestamp
        const studentPrefMap = {};
        allPrefs.forEach(p => {
          const student = profilesMap[p.student_id];
          if (targetBatch && student?.admitted_batch && normalizeBatch(student.admitted_batch) !== targetBatch) {
            return;
          }

          if (!studentPrefMap[p.student_id]) {
            const studentAllot = existingAllotments.find(a => a.student_id === p.student_id);
            studentPrefMap[p.student_id] = {
              student_id: p.student_id,
              student: student || null,
              submitted_at: p.submitted_at || studentAllot?.submitted_at || new Date().toISOString(),
              preferences: [],
              existingAllotment: studentAllot || null
            };
          }

          if (p.submitted_at && new Date(p.submitted_at) < new Date(studentPrefMap[p.student_id].submitted_at)) {
            studentPrefMap[p.student_id].submitted_at = p.submitted_at;
          }

          studentPrefMap[p.student_id].preferences.push(p);
        });

        // Strict FIFO sort: earliest submitter first
        const sortedStudents = Object.values(studentPrefMap).sort((a, b) => {
          const timeA = new Date(a.submitted_at).getTime();
          const timeB = new Date(b.submitted_at).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return String(a.student_id).localeCompare(String(b.student_id));
        });

        // Track occupied seats per subject
        const occupiedCount = {};
        poolSubjects.forEach(s => { occupiedCount[s.id] = 0; });

        // Keep manual overrides
        existingAllotments.forEach(a => {
          if (a.manual_override && a.status === 'ALLOTTED' && a.subject_id && occupiedCount[a.subject_id] !== undefined) {
            occupiedCount[a.subject_id] += 1;
          }
        });

        // Run FIFO Allotment in timestamp order
        const promotions = [];
        const nowIso = new Date().toISOString();

        for (const entry of sortedStudents) {
          if (entry.existingAllotment?.manual_override) {
            continue;
          }

          const sortedPrefs = [...entry.preferences].sort((a, b) => Number(a.priority) - Number(b.priority));
          let assignedSubjId = null;
          let assignedPriority = null;
          let status = 'WAITLISTED';

          for (const pref of sortedPrefs) {
            const subj = poolSubjectMap[pref.subject_id];
            if (subj) {
              const currentOcc = occupiedCount[subj.id] || 0;
              const remaining = subj.totalSeats - currentOcc;
              if (remaining > 0) {
                assignedSubjId = subj.id;
                assignedPriority = Number(pref.priority);
                status = 'ALLOTTED';
                occupiedCount[subj.id] = currentOcc + 1;
                break;
              }
            }
          }

          const prev = entry.existingAllotment;
          const hasChanged = !prev || 
            prev.subject_id !== assignedSubjId || 
            prev.status !== status || 
            prev.priority_selected !== assignedPriority;

          if (hasChanged) {
            const studentProf = entry.student;
            const allotPayload = {
              student_id: entry.student_id,
              roll_number: studentProf?.roll_number || prev?.roll_number || 'N/A',
              student_email: studentProf?.email || prev?.student_email || '',
              elective_type: targetType || prev?.elective_type || 'PE',
              elective_number: targetNum || prev?.elective_number || 1,
              subject_id: assignedSubjId,
              priority_selected: assignedPriority,
              status,
              submitted_at: entry.submitted_at,
              allotted_at: nowIso
            };

            if (prev?.id) {
              await supabase.from('allotments').update(allotPayload).eq('id', prev.id);
            } else {
              await supabase.from('allotments').insert([allotPayload]);
            }

            if ((prev?.status === 'WAITLISTED' && status === 'ALLOTTED') || (prev?.status === 'ALLOTTED' && status === 'ALLOTTED' && assignedPriority < prev.priority_selected)) {
              promotions.push({
                student_id: entry.student_id,
                email: studentProf?.email,
                toSubject: poolSubjectMap[assignedSubjId]?.subject_name,
                priority: assignedPriority
              });
            }
          }
        }

        // Update available_seats for all subjects in pool
        for (const subj of poolSubjects) {
          const occ = occupiedCount[subj.id] || 0;
          const finalVacant = Math.max(0, subj.totalSeats - occ);
          await supabase.from('subjects').update({ available_seats: finalVacant }).eq('id', subj.id);
        }

        return {
          success: true,
          promotionsCount: promotions.length,
          promotions
        };
      } catch (err) {
        console.error('recalculateFIFOAllotments error:', err);
        return { success: false, error: err.message };
      }
    }

    return db.recalculateFIFOAllotments ? db.recalculateFIFOAllotments({ subjectId, batch, semester, elective_type, elective_number }) : { success: true };
  },

  updateSubject: async (id, subjectData) => {
    const cleanBatch = normalizeBatch(subjectData.admitted_batch || '');
    const cleanSem = Number(subjectData.semester || 5);
    const cleanType = String(subjectData.elective_type || 'PE').toUpperCase();
    const cleanBranch = String(subjectData.branch || 'CSE').trim().toUpperCase();

    if (cleanType === 'PE') {
      const peWindows = await coordinatorService.getPESelectionWindows(cleanBranch);
      const matchingDrive = (peWindows || []).find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === cleanSem
      );
      if (matchingDrive && matchingDrive.status === 'ACTIVE') {
        throw new Error(`Cannot edit subject while the PE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${cleanSem}). Please pause the drive in Tab 2 first.`);
      }
    }

    const payload = {
      ...subjectData,
      admitted_batch: cleanBatch,
      semester: cleanSem,
      elective_type: cleanType,
      branch: cleanBranch,
      elective_number: Number(subjectData.elective_number || 1),
      seats: Number(subjectData.seats)
    };

    let result = null;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('subjects').update(payload).eq('id', id).select().single();
      if (error) {
        throw new Error(`Database error updating subject: ${error.message}`);
      }
      result = data || payload;
    } else {
      result = db.updateSubject(id, payload);
    }

    // Automatically recalculate and promote waitlisted students in FIFO order when seats change
    const fifoResult = await coordinatorService.recalculateFIFOAllotments({
      subjectId: id,
      batch: cleanBatch,
      semester: cleanSem,
      elective_type: cleanType,
      elective_number: payload.elective_number
    });

    if (fifoResult?.promotionsCount > 0) {
      result.promotionsCount = fifoResult.promotionsCount;
      result.promotions = fifoResult.promotions;
    }

    return result;
  },

  // When a coordinator deletes a subject:
  // Reset allotments and preferences for that subject in database
  deleteSubject: async (id, coordinatorId) => {
    const subjects = await coordinatorService.getSubjects();
    const targetSubject = subjects.find(s => s.id === id);
    if (targetSubject && targetSubject.elective_type === 'PE') {
      const cleanBatch = normalizeBatch(targetSubject.admitted_batch || '');
      const cleanSem = Number(targetSubject.semester || 5);
      const cleanBranch = String(targetSubject.branch || 'CSE').trim().toUpperCase();
      const peWindows = await coordinatorService.getPESelectionWindows(cleanBranch);
      const matchingDrive = (peWindows || []).find(w => 
        normalizeBatch(w.batch) === cleanBatch && Number(w.semester) === cleanSem
      );
      if (matchingDrive && matchingDrive.status === 'ACTIVE') {
        throw new Error(`Cannot delete subject while the PE Selection Drive is ACTIVE for Batch ${cleanBatch} (Semester ${cleanSem}). Please pause the drive in Tab 2 first.`);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('allotments').delete().eq('subject_id', id);
        await supabase.from('elective_preferences').delete().eq('subject_id', id);
        const { error } = await supabase.from('subjects').delete().eq('id', id);
        if (error) {
          throw new Error(`Database error deleting subject: ${error.message}`);
        }
        return true;
      } catch (e) {
        console.warn('Supabase deleteSubject error:', e);
        throw e;
      }
    }
    return db.deleteSubject(id, coordinatorId);
  },

  // Unlock / Reset student selection for re-choosing
  unlockStudentSelection: async (studentId, electiveType, coordinatorId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let studentEmail = null;
        const { data: sp } = await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle();
        if (sp?.email) studentEmail = sp.email.toLowerCase().trim();

        let queryA = supabase.from('allotments').delete();
        if (studentEmail) {
          queryA = queryA.or(`student_id.eq.${studentId},student_email.eq.${studentEmail}`);
        } else {
          queryA = queryA.eq('student_id', studentId);
        }

        let queryP = supabase.from('elective_preferences').delete().eq('student_id', studentId);

        if (electiveType && electiveType !== 'ALL') {
          queryA = queryA.eq('elective_type', electiveType);
          queryP = queryP.eq('elective_type', electiveType);
        }

        await Promise.all([queryA, queryP]);
        return true;
      } catch (e) {
        console.warn('Supabase unlockStudentSelection error:', e);
        throw e;
      }
    }
    throw new Error('Database connection is not configured.');
  },

  // --------------------------------------------------------------------------
  // 2. STUDENT PROFILES MANAGEMENT
  // --------------------------------------------------------------------------

  getStudents: async (branch) => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
        if (branch && branch !== 'ALL') {
          query = query.eq('branch', branch);
        }
        const { data, error } = await query;
        if (!error && data !== null) {
          const { data: sAllots } = await supabase.from('allotments').select('*');
          const { data: sSubjects } = await supabase.from('subjects').select('*');
          const allotments = sAllots || [];
          const subjects = sSubjects || [];

          return data.map(student => {
            const studentAllotmentPE = allotments.find(a => a.student_id === student.id && a.elective_type === 'PE');
            const studentAllotmentOE = allotments.find(a => a.student_id === student.id && a.elective_type === 'OE');

            return {
              ...student,
              hasSubmittedPE: Boolean(studentAllotmentPE),
              hasSubmittedOE: Boolean(studentAllotmentOE),
              allotmentPE: studentAllotmentPE ? {
                ...studentAllotmentPE,
                subject: subjects.find(s => s.id === studentAllotmentPE.subject_id)
              } : null,
              allotmentOE: studentAllotmentOE ? {
                ...studentAllotmentOE,
                subject: subjects.find(s => s.id === studentAllotmentOE.subject_id)
              } : null
            };
          });
        }
        return [];
      } catch (e) {
        console.warn('Supabase getStudents note:', e);
        return [];
      }
    }
    return [];
  },

  addStudent: async (studentData) => {
    const cleanEmail = String(studentData.email || '').trim().toLowerCase();
    const cleanName = String(studentData.name || '').trim();
    const cleanRoll = String(studentData.roll_number || '').trim().toUpperCase();

    const payload = {
      email: cleanEmail,
      name: cleanName,
      roll_number: cleanRoll,
      role: 'student',
      branch: String(studentData.branch || 'CSE').trim().toUpperCase(),
      section: String(studentData.section || 'A').trim().toUpperCase(),
      regulation: String(studentData.regulation || 'AR23').trim(),
      admitted_batch: String(studentData.admitted_batch || '2024-2028').trim(),
      semester: Number(studentData.semester || 5)
    };

    if (isSupabaseConfigured && supabase) {
      // Check for existing student email
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id, name, roll_number, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        throw new Error(`Email "${cleanEmail}" is already registered for student ${existingEmail.name} (${existingEmail.roll_number || 'No Roll No'}). Email must be unique.`);
      }

      // Check for existing roll number
      if (cleanRoll) {
        const { data: existingRoll } = await supabase
          .from('profiles')
          .select('id, name, roll_number, email')
          .ilike('roll_number', cleanRoll)
          .maybeSingle();

        if (existingRoll) {
          throw new Error(`Roll Number "${cleanRoll}" is already registered for student ${existingRoll.name} (${existingRoll.email}). Roll Number must be unique.`);
        }
      }

      const { data, error } = await supabase.from('profiles').insert([payload]).select().single();
      if (error) {
        console.error('Supabase addStudent error:', error);
        throw new Error(`Database error adding student: ${error.message}`);
      }
      return data || payload;
    }

    throw new Error('Database connection is not configured.');
  },

  bulkAddStudents: async (studentsList) => {
    const formatted = studentsList.map((st, idx) => {
      const cleanEmail = String(st.email || '').trim().toLowerCase();
      const cleanName = String(st.name || '').trim();
      const cleanRoll = String(st.roll_number || '').trim().toUpperCase();
      const rollNum = cleanRoll || `ROLL-${idx + 1}`;
      return {
        email: cleanEmail,
        name: cleanName,
        roll_number: rollNum,
        role: 'student',
        branch: String(st.branch || 'CSE').trim().toUpperCase(),
        section: String(st.section || 'A').trim().toUpperCase(),
        regulation: String(st.regulation || 'AR23').trim(),
        admitted_batch: String(st.admitted_batch || '2024-2028').trim(),
        semester: Number(st.semester || 5)
      };
    });

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').upsert(formatted, { onConflict: 'email' }).select();
      if (error) {
        console.error('Supabase bulkAddStudents error:', error);
        throw new Error(`Database error importing students: ${error.message}`);
      }
      return data || formatted;
    }

    throw new Error('Database connection is not configured.');
  },

  updateStudent: async (id, studentData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').update(studentData).eq('id', id).select().single();
      if (error) {
        console.error('Supabase updateStudent error:', error);
        throw new Error(`Database error updating student: ${error.message}`);
      }
      return data || studentData;
    }
    throw new Error('Database connection is not configured.');
  },

  deleteStudent: async (id) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('allotments').delete().eq('student_id', id);
        await supabase.from('elective_preferences').delete().eq('student_id', id);
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
          throw new Error(`Database error deleting student: ${error.message}`);
        }
        return true;
      } catch (e) {
        console.warn('Supabase deleteStudent error:', e);
        throw e;
      }
    }
    throw new Error('Database connection is not configured.');
  },

  bulkUpdateStudents: async (studentIds, updates) => {
    if (!studentIds || studentIds.length === 0) return true;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .in('id', studentIds);

      if (error) {
        console.error('Supabase bulkUpdateStudents error:', error);
        throw new Error(`Database error in bulk updating students: ${error.message}`);
      }
      return true;
    }
    throw new Error('Database connection is not configured.');
  },

  bulkDeleteStudents: async (studentIds) => {
    if (!studentIds || studentIds.length === 0) return true;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('allotments').delete().in('student_id', studentIds);
        await supabase.from('elective_preferences').delete().in('student_id', studentIds);
        const { error } = await supabase.from('profiles').delete().in('id', studentIds);
        if (error) {
          console.error('Supabase bulkDeleteStudents error:', error);
          throw new Error(`Database error in bulk deleting students: ${error.message}`);
        }
        return true;
      } catch (e) {
        console.error('Supabase bulkDeleteStudents note:', e);
        throw e;
      }
    }
    throw new Error('Database connection is not configured.');
  },

  // --------------------------------------------------------------------------
  // 3. ACCURATE REAL-TIME ANALYTICS SUMMARY
  // --------------------------------------------------------------------------

  getAnalyticsSummary: async (electiveType = 'PE', branch) => {
    let allProfiles = [];
    let allSubjects = await coordinatorService.getSubjects(electiveType, branch);
    let allPreferences = [];
    let allAllotments = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [profRes, aRes, pRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('role', 'student'),
          supabase.from('allotments').select('*').eq('elective_type', electiveType),
          supabase.from('elective_preferences').select('*').eq('elective_type', electiveType)
        ]);
        if (profRes.data) allProfiles = profRes.data;
        if (aRes.data) allAllotments = aRes.data;
        if (pRes.data) allPreferences = pRes.data;
      } catch (e) {
        console.warn('Supabase analytics fetch note:', e);
      }
    }

    // Profiles map
    const profilesMap = {};
    allProfiles.forEach(p => {
      profilesMap[p.id] = p;
    });

    // Department students (for PE) vs All students (for OE cross-branch analysis)
    const deptStudents = allProfiles.filter(p => !branch || branch === 'ALL' || String(p.branch || '').trim().toUpperCase() === String(branch).trim().toUpperCase());
    const allStudents = electiveType === 'PE' ? deptStudents : allProfiles;

    // Attach student details to preferences
    const enrichedPreferences = allPreferences.map(pref => {
      const student = profilesMap[pref.student_id] || {};
      return {
        ...pref,
        student_name: student.name || 'Unknown Student',
        roll_number: student.roll_number || 'N/A',
        student_email: student.email || '',
        branch: String(student.branch || '').trim().toUpperCase(),
        section: String(student.section || 'A').trim().toUpperCase(),
        admitted_batch: normalizeBatch(student.admitted_batch || ''),
        semester: Number(student.semester || 0)
      };
    });

    // Attach student & subject details to allotments
    const subjectsMap = {};
    allSubjects.forEach(s => { subjectsMap[s.id] = s; });

    const enrichedAllotments = allAllotments.map(allot => {
      const student = profilesMap[allot.student_id] || {};
      const subject = subjectsMap[allot.subject_id] || {};
      return {
        ...allot,
        student_name: allot.student_name || student.name || 'Unknown Student',
        roll_number: allot.roll_number || student.roll_number || 'N/A',
        student_email: allot.student_email || student.email || '',
        branch: String(allot.student_branch || student.branch || allot.branch || '').trim().toUpperCase(),
        section: String(allot.section || student.section || 'A').trim().toUpperCase(),
        admitted_batch: normalizeBatch(allot.admitted_batch || student.admitted_batch || allot.batch || ''),
        semester: Number(allot.semester || student.semester || 0),
        subject_name: subject.subject_name || allot.subject_name || 'Unknown Subject',
        subject_code: subject.subject_code || allot.subject_code || ''
      };
    });

    // Accurate high-level calculations
    const totalSeats = allSubjects.reduce((acc, s) => acc + Number(s.seats || 0), 0);
    const validSubjectIds = new Set(allSubjects.map(s => s.id));
    const activeAllotments = enrichedAllotments.filter(a => a.subject_id && validSubjectIds.has(a.subject_id) && a.status === 'ALLOTTED');
    
    const filledSeats = activeAllotments.length;
    const availableSeats = Math.max(0, totalSeats - filledSeats);

    const submittedStudentIds = new Set(enrichedPreferences.map(p => p.student_id));
    const submittedStudents = submittedStudentIds.size;
    const allottedCount = filledSeats;
    const waitlistedCount = enrichedAllotments.filter(a => a.status === 'WAITLISTED' && validSubjectIds.has(a.subject_id)).length;
    const pendingCount = Math.max(0, deptStudents.length - submittedStudents);

    // Subject-wise demand & section/branch breakdown
    const subjectWiseStats = allSubjects.map(subj => {
      const subjPrefs = enrichedPreferences.filter(p => p.subject_id === subj.id);
      const p1Prefs = subjPrefs.filter(p => p.priority === 1);
      const p2Prefs = subjPrefs.filter(p => p.priority === 2);
      const p3Prefs = subjPrefs.filter(p => p.priority === 3);
      const pOtherPrefs = subjPrefs.filter(p => p.priority > 3);
      
      const subjAllots = enrichedAllotments.filter(a => a.subject_id === subj.id);
      const allottedToSubject = subjAllots.filter(a => a.status === 'ALLOTTED').length;
      const waitlistedForSubject = subjAllots.filter(a => a.status === 'WAITLISTED').length;
      const remainingVacancies = Math.max(0, Number(subj.seats || 0) - allottedToSubject);

      // Section-wise choice breakdown (which section chose this subject)
      const sectionBreakdown = {};
      subjPrefs.forEach(p => {
        const sec = p.section || 'A';
        if (!sectionBreakdown[sec]) {
          sectionBreakdown[sec] = {
            section: sec,
            totalChoices: 0,
            priority1: 0,
            priority2: 0,
            priority3: 0,
            priorityOther: 0,
            allotted: 0,
            waitlisted: 0,
            students: []
          };
        }
        sectionBreakdown[sec].totalChoices += 1;
        if (p.priority === 1) sectionBreakdown[sec].priority1 += 1;
        else if (p.priority === 2) sectionBreakdown[sec].priority2 += 1;
        else if (p.priority === 3) sectionBreakdown[sec].priority3 += 1;
        else sectionBreakdown[sec].priorityOther += 1;

        sectionBreakdown[sec].students.push({
          student_id: p.student_id,
          name: p.student_name,
          roll_number: p.roll_number,
          email: p.student_email,
          priority: p.priority,
          submitted_at: p.submitted_at
        });
      });

      // Add allotment counts to section breakdown
      subjAllots.forEach(a => {
        const sec = a.section || 'A';
        if (!sectionBreakdown[sec]) {
          sectionBreakdown[sec] = {
            section: sec,
            totalChoices: 0,
            priority1: 0,
            priority2: 0,
            priority3: 0,
            priorityOther: 0,
            allotted: 0,
            waitlisted: 0,
            students: []
          };
        }
        if (a.status === 'ALLOTTED') sectionBreakdown[sec].allotted += 1;
        if (a.status === 'WAITLISTED') sectionBreakdown[sec].waitlisted += 1;
      });

      // Branch-wise choice breakdown (for OE outside student branches)
      const branchBreakdown = {};
      subjPrefs.forEach(p => {
        const br = p.branch || 'OTHER';
        if (!branchBreakdown[br]) {
          branchBreakdown[br] = {
            branch: br,
            totalChoices: 0,
            priority1: 0,
            priority2: 0,
            priority3: 0,
            priorityOther: 0,
            allotted: 0,
            waitlisted: 0,
            students: []
          };
        }
        branchBreakdown[br].totalChoices += 1;
        if (p.priority === 1) branchBreakdown[br].priority1 += 1;
        else if (p.priority === 2) branchBreakdown[br].priority2 += 1;
        else if (p.priority === 3) branchBreakdown[br].priority3 += 1;
        else branchBreakdown[br].priorityOther += 1;

        branchBreakdown[br].students.push({
          student_id: p.student_id,
          name: p.student_name,
          roll_number: p.roll_number,
          email: p.student_email,
          section: p.section,
          priority: p.priority,
          submitted_at: p.submitted_at
        });
      });

      subjAllots.forEach(a => {
        const br = a.branch || 'OTHER';
        if (!branchBreakdown[br]) {
          branchBreakdown[br] = {
            branch: br,
            totalChoices: 0,
            priority1: 0,
            priority2: 0,
            priority3: 0,
            priorityOther: 0,
            allotted: 0,
            waitlisted: 0,
            students: []
          };
        }
        if (a.status === 'ALLOTTED') branchBreakdown[br].allotted += 1;
        if (a.status === 'WAITLISTED') branchBreakdown[br].waitlisted += 1;
      });

      return {
        id: subj.id,
        code: subj.subject_code,
        name: subj.subject_name,
        branch: subj.branch,
        semester: subj.semester,
        admitted_batch: subj.admitted_batch,
        elective_number: subj.elective_number,
        seats: Number(subj.seats || 0),
        available_seats: remainingVacancies,
        priority1: p1Prefs.length,
        priority2: p2Prefs.length,
        priority3: p3Prefs.length,
        priorityOther: pOtherPrefs.length,
        totalDemand: subjPrefs.length,
        allotted: allottedToSubject,
        waitlisted: waitlistedForSubject,
        remaining: remainingVacancies,
        fillRate: Number(subj.seats || 0) > 0 ? Math.round((allottedToSubject / Number(subj.seats || 0)) * 100) : 0,
        sectionBreakdown,
        branchBreakdown,
        studentsList: subjPrefs.map(p => {
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
            status: allot?.status || 'PENDING_EVALUATION'
          };
        }).sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
        })
      };
    });

    // Section-wise statistics for Department (for PE)
    const distinctSections = Array.from(new Set(deptStudents.map(s => String(s.section || 'A').trim().toUpperCase()).filter(Boolean))).sort();
    if (distinctSections.length === 0) distinctSections.push('A');

    const sectionWiseStats = distinctSections.map(sec => {
      const secStudents = deptStudents.filter(s => String(s.section || 'A').trim().toUpperCase() === sec);
      const secStudentIds = new Set(secStudents.map(s => s.id));
      
      const secPrefs = enrichedPreferences.filter(p => secStudentIds.has(p.student_id));
      const secSubmittedIds = new Set(secPrefs.map(p => p.student_id));
      const submittedCount = secSubmittedIds.size;
      const pendingStudents = secStudents.filter(s => !secSubmittedIds.has(s.id));

      const secAllots = enrichedAllotments.filter(a => secStudentIds.has(a.student_id) || String(a.section || 'A').trim().toUpperCase() === sec);
      const allottedCount = secAllots.filter(a => a.status === 'ALLOTTED' && validSubjectIds.has(a.subject_id)).length;
      const waitlistedCount = secAllots.filter(a => a.status === 'WAITLISTED' && validSubjectIds.has(a.subject_id)).length;
      const completionRate = secStudents.length > 0 ? Math.round((submittedCount / secStudents.length) * 100) : 0;

      return {
        section: sec,
        name: `Section ${sec}`,
        enrolled: secStudents.length,
        submitted: submittedCount,
        pending: pendingStudents.length,
        allotted: allottedCount,
        waitlisted: waitlistedCount,
        completionRate,
        pendingStudents: pendingStudents.map(s => ({
          id: s.id,
          name: s.name,
          roll_number: s.roll_number,
          email: s.email,
          section: s.section,
          admitted_batch: s.admitted_batch,
          semester: s.semester
        })),
        submittedStudents: secStudents.filter(s => secSubmittedIds.has(s.id)).map(s => {
          const studentAllot = secAllots.find(a => a.student_id === s.id);
          return {
            id: s.id,
            name: s.name,
            roll_number: s.roll_number,
            email: s.email,
            section: s.section,
            status: studentAllot?.status || 'SUBMITTED',
            allottedSubject: studentAllot?.subject_name || null
          };
        })
      };
    });

    // Branch-wise candidate pool and allotment metrics
    const dynamicBranches = new Set();
    allProfiles.forEach(st => { 
      if (st.branch) dynamicBranches.add(String(st.branch).trim().toUpperCase()); 
    });
    allSubjects.forEach(sub => { 
      if (sub.branch && sub.branch !== 'ALL') dynamicBranches.add(String(sub.branch).trim().toUpperCase()); 
    });
    const allBranchesList = Array.from(dynamicBranches).sort();

    const branchWiseStats = allBranchesList.map(branchName => {
      const branchStudents = allProfiles.filter(st => String(st.branch || '').trim().toUpperCase() === branchName);
      const studentIds = new Set(branchStudents.map(st => st.id));
      const studentEmails = new Set(branchStudents.map(st => st.email?.toLowerCase().trim()));

      const branchPrefs = enrichedPreferences.filter(p => studentIds.has(p.student_id) || String(p.branch || '').trim().toUpperCase() === branchName);
      const branchSubmittedCount = new Set(branchPrefs.map(p => p.student_id)).size;

      const branchAllotments = enrichedAllotments.filter(a => 
        studentIds.has(a.student_id) || 
        (a.student_email && studentEmails.has(a.student_email.toLowerCase().trim())) ||
        String(a.branch || '').trim().toUpperCase() === branchName
      );

      const branchAllotted = branchAllotments.filter(a => a.status === 'ALLOTTED' && validSubjectIds.has(a.subject_id)).length;
      const branchWaitlisted = branchAllotments.filter(a => a.status === 'WAITLISTED' && validSubjectIds.has(a.subject_id)).length;
      const branchPending = Math.max(0, branchStudents.length - branchSubmittedCount);
      const completionRate = branchStudents.length > 0 ? Math.round((branchSubmittedCount / branchStudents.length) * 100) : 0;

      // Top subject chosen by this branch
      const subjectCountMap = {};
      branchPrefs.forEach(p => {
        const sub = subjectsMap[p.subject_id];
        const code = sub ? sub.subject_code : 'Unknown';
        subjectCountMap[code] = (subjectCountMap[code] || 0) + 1;
      });

      return {
        branch: branchName,
        name: branchName,
        enrolled: branchStudents.length,
        totalStudents: branchStudents.length,
        submitted: branchSubmittedCount,
        allotted: branchAllotted,
        waitlisted: branchWaitlisted,
        pending: branchPending,
        completionRate,
        subjectCountMap,
        value: branchStudents.length
      };
    }).filter(b => b.totalStudents > 0 || b.submitted > 0 || b.allotted > 0);

    const branchDistribution = branchWiseStats
      .filter(b => b.totalStudents > 0)
      .map(b => ({
        name: b.branch,
        value: b.totalStudents,
        allotted: b.allotted,
        waitlisted: b.waitlisted
      }));

    return {
      totalStudents: deptStudents.length,
      allCollegeStudentsCount: allProfiles.length,
      submittedStudents,
      totalSeats,
      filledSeats,
      availableSeats,
      allottedCount,
      waitlistedCount,
      pendingCount,
      subjectWiseStats,
      sectionWiseStats,
      branchWiseStats,
      branchDistribution: branchDistribution.length > 0 ? branchDistribution : branchWiseStats.map(b => ({ name: b.branch, value: b.totalStudents || 1 })),
      rawPreferences: enrichedPreferences,
      rawAllotments: enrichedAllotments,
      rawStudents: allStudents,
      rawSubjects: allSubjects
    };
  },

  // --------------------------------------------------------------------------
  // 4. ALLOTMENT MANAGEMENT, MANUAL OVERRIDES & DETAILS
  // --------------------------------------------------------------------------

  getAllotmentRecords: async (filters = {}) => {
    let allotments = [];
    let students = [];
    let subjects = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [aRes, sRes, subRes] = await Promise.all([
          supabase.from('allotments').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('subjects').select('*')
        ]);
        if (!aRes.error && aRes.data !== null) allotments = aRes.data;
        if (!sRes.error && sRes.data !== null) students = sRes.data;
        if (!subRes.error && subRes.data !== null) subjects = subRes.data;
      } catch (e) {
        console.warn('Supabase allotment records fetch note:', e);
      }
    } else {
      allotments = db.getAllotments();
      students = db.getProfiles();
      subjects = db.getSubjects();
    }

    let list = allotments.map(a => {
      const student = students.find(s => 
        (a.student_id && s.id === a.student_id) || 
        (a.student_email && s.email && s.email.toLowerCase().trim() === a.student_email.toLowerCase().trim()) || 
        (a.roll_number && s.roll_number && s.roll_number.toUpperCase().trim() === a.roll_number.toUpperCase().trim())
      ) || {};
      const subject = subjects.find(s => s.id === a.subject_id) || null;

      const studentName = student.name || a.student_name || 'Unknown';
      const studentEmail = student.email || a.student_email || 'N/A';
      const rollNumber = student.roll_number || a.roll_number || 'N/A';
      const branch = student.branch || a.branch || 'N/A';
      const section = student.section || a.section || 'A';
      const semester = student.semester || a.semester || 5;

      const subjectBranch = subject?.branch || a.branch || 'N/A';

      let subjectName = 'Not Allotted';
      let subjectCode = 'N/A';

      if (subject) {
        subjectName = subject.subject_name;
        subjectCode = subject.subject_code;
      } else if (a.status === 'WAITLISTED') {
        subjectName = 'WAITLISTED (No Vacancy)';
        subjectCode = 'N/A';
      } else if (a.subject_id) {
        subjectName = 'Allotted Subject';
        subjectCode = 'N/A';
      }

      const elective_number = Number(a.elective_number || subject?.elective_number || 1);
      const admitted_batch = student.admitted_batch || a.admitted_batch || subject?.admitted_batch || '';

      return {
        ...a,
        studentName,
        studentEmail,
        rollNumber,
        branch,
        section,
        semester,
        admitted_batch,
        elective_number,
        subjectName,
        subjectCode,
        subjectBranch
      };
    });

    // 1. Coordinator Department Scoping (Strict PE branch isolation)
    // PE: Students of coordinator's branch ONLY
    // OE: Subjects offered by coordinator's branch
    if (filters.coordinatorBranch && filters.coordinatorBranch !== 'ALL') {
      const cBranch = String(filters.coordinatorBranch).trim().toUpperCase();
      list = list.filter(item => {
        const itemStudentBranch = String(item.branch || '').trim().toUpperCase();
        const itemSubjectBranch = String(item.subjectBranch || '').trim().toUpperCase();

        if (item.elective_type === 'PE') {
          return itemStudentBranch === cBranch;
        } else if (item.elective_type === 'OE') {
          return itemSubjectBranch === cBranch;
        } else {
          return itemStudentBranch === cBranch || itemSubjectBranch === cBranch;
        }
      });
    }

    // 2. Elective Type & Number Filter (Supports 'PE', 'OE', 'PE-1'..'PE-8', 'OE-1'..'OE-8')
    if (filters.elective_type && filters.elective_type !== 'ALL') {
      const eFilter = String(filters.elective_type).trim().toUpperCase();
      if (eFilter.includes('-')) {
        const [type, num] = eFilter.split('-');
        list = list.filter(item => item.elective_type === type && Number(item.elective_number || 1) === Number(num));
      } else {
        list = list.filter(item => item.elective_type === eFilter);
      }
    }

    // 3. Elective Number Filter (if specified separately)
    if (filters.elective_number && filters.elective_number !== 'ALL') {
      list = list.filter(item => Number(item.elective_number || 1) === Number(filters.elective_number));
    }

    // 4. Batch Filter
    if (filters.batch && filters.batch !== 'ALL') {
      list = list.filter(item => String(item.admitted_batch || '').trim().toLowerCase() === String(filters.batch).trim().toLowerCase());
    }

    // 5. Student Branch Filter
    if (filters.student_branch && filters.student_branch !== 'ALL') {
      list = list.filter(item => item.branch === filters.student_branch);
    } else if (filters.branch && filters.branch !== 'ALL' && !filters.coordinatorBranch) {
      list = list.filter(item => item.branch === filters.branch);
    }

    // 6. Section Filter
    if (filters.section && filters.section !== 'ALL') {
      list = list.filter(item => item.section === filters.section);
    }

    // 7. Status Filter
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }

    // 8. Subject-Wise Filter
    if (filters.subject_id && filters.subject_id !== 'ALL') {
      list = list.filter(item => item.subject_id === filters.subject_id);
    }

    // 9. Search Query
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(item =>
        item.studentEmail?.toLowerCase().includes(q) ||
        item.rollNumber?.toLowerCase().includes(q) ||
        item.studentName?.toLowerCase().includes(q) ||
        item.subjectName?.toLowerCase().includes(q) ||
        item.subjectCode?.toLowerCase().includes(q)
      );
    }

    return list;
  },

  // Manual Allotment Override with Audit Log
  manualUpdateAllotment: async ({ allotmentId, newSubjectId, reason, coordinatorId }) => {
    if (isSupabaseConfigured && supabase) {
      const { data: targetAllotment } = await supabase.from('allotments').select('*').eq('id', allotmentId).single();
      if (!targetAllotment) throw new Error('Allotment record not found.');

      const { data: oldSubject } = targetAllotment.subject_id 
        ? await supabase.from('subjects').select('*').eq('id', targetAllotment.subject_id).maybeSingle()
        : { data: null };

      const { data: newSubject } = newSubjectId 
        ? await supabase.from('subjects').select('*').eq('id', newSubjectId).maybeSingle()
        : { data: null };

      const { data: updatedAllotment, error: updateErr } = await supabase
        .from('allotments')
        .update({
          subject_id: newSubjectId || null,
          status: newSubjectId ? 'ALLOTTED' : 'WAITLISTED',
          priority_selected: null
        })
        .eq('id', allotmentId)
        .select()
        .single();

      if (updateErr) {
        throw new Error(`Database error updating allotment: ${updateErr.message}`);
      }

      // Recalibrate seat vacancies for affected subjects
      try {
        const { data: allAllots } = await supabase.from('allotments').select('subject_id, status').eq('status', 'ALLOTTED');
        const activeAllots = allAllots || [];

        if (oldSubject) {
          const occ = activeAllots.filter(a => a.subject_id === oldSubject.id).length;
          await supabase.from('subjects').update({ available_seats: Math.max(0, Number(oldSubject.seats || 0) - occ) }).eq('id', oldSubject.id);
        }
        if (newSubject) {
          const occ = activeAllots.filter(a => a.subject_id === newSubject.id).length;
          await supabase.from('subjects').update({ available_seats: Math.max(0, Number(newSubject.seats || 0) - occ) }).eq('id', newSubject.id);
        }
      } catch (seatErr) {
        console.warn('Seat calibration note:', seatErr);
      }

      await supabase.from('audit_logs').insert([{
        coordinator_id: coordinatorId,
        student_id: targetAllotment.student_id,
        action: 'MANUAL_ALLOTMENT_MODIFICATION',
        old_value: oldSubject ? `${oldSubject.subject_code} - ${oldSubject.subject_name}` : 'WAITLISTED',
        new_value: newSubject ? `${newSubject.subject_code} - ${newSubject.subject_name}` : 'WAITLISTED',
        reason: reason || 'Manual adjustment by coordinator'
      }]);

      return updatedAllotment;
    }
    throw new Error('Database connection is not configured.');
  },

  getAuditLogs: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        const { data: coordinators } = await supabase.from('profiles').select('id, name, email').eq('role', 'coordinator');
        const { data: students } = await supabase.from('profiles').select('id, name, email').eq('role', 'student');

        const coords = coordinators || [];
        const studs = students || [];

        return (logs || []).map(log => {
          const coord = coords.find(p => p.id === log.coordinator_id);
          const student = studs.find(p => p.id === log.student_id);
          return {
            ...log,
            timestamp: log.created_at,
            coordinatorName: coord?.name || 'Coordinator',
            studentEmail: student?.email || 'General'
          };
        });
      } catch (e) {
        console.warn('Supabase audit logs fetch note:', e);
        return [];
      }
    }
    return [];
  },

  exportAllotmentsCSV: (allotmentsList, filename = 'elective_allotments.csv') => {
    const headers = ['Student Email', 'Roll Number', 'Student Name', 'Branch', 'Section', 'Semester', 'Elective Type', 'Subject Code', 'Allotted Subject', 'Priority', 'Status', 'Submitted At', 'Allotted At'];
    const rows = allotmentsList.map(a => [
      `"${a.studentEmail || ''}"`,
      `"${a.rollNumber || ''}"`,
      `"${a.studentName || ''}"`,
      `"${a.branch || ''}"`,
      `"${a.section || ''}"`,
      `"${a.semester || 5}"`,
      `"${a.elective_type || ''}"`,
      `"${a.subjectCode || 'N/A'}"`,
      `"${a.subjectName || ''}"`,
      `"${a.priority_selected ? `Priority ${a.priority_selected}` : (a.status === 'ALLOTTED' ? 'Manual/Assigned' : '—')}"`,
      `"${a.status || ''}"`,
      `"${a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ''}"`,
      `"${a.allotted_at ? new Date(a.allotted_at).toLocaleString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
