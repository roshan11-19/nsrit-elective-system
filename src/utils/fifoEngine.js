import { db } from '../lib/storage';

/**
 * Executes the First-In, First-Out (FIFO) Allotment Algorithm
 * 
 * Rules:
 * 1. Process students strictly in order of their earliest preference submission timestamp (FIFO).
 * 2. For each student, check priorities 1 -> 2 -> 3...
 * 3. First priority with remaining available seats gets allotted atomically.
 * 4. Decrement available seats.
 * 5. If all selected subjects are full, mark student as WAITLISTED.
 * 
 * @param {string} selectionPeriodId - Target selection period ID
 * @param {string} coordinatorId - Coordinator ID executing the allotment
 * @returns {object} Allotment execution summary and stats
 */
export function executeFifoAllotment(selectionPeriodId, coordinatorId = 'system') {
  const period = db.getSelectionPeriodById(selectionPeriodId);
  if (!period) {
    throw new Error(`Selection period ${selectionPeriodId} not found.`);
  }

  // 1. Fetch subjects and restore baseline seat count for this regulation/semester/type
  const allSubjects = db.getSubjects();
  const periodSubjects = allSubjects.filter(s => 
    s.active && 
    s.semester === period.semester && 
    s.regulation === period.regulation &&
    (s.elective_type === period.elective_type || s.branch === 'ALL')
  );

  // Map of subject seats for atomic tracking
  const subjectSeatsMap = {};
  periodSubjects.forEach(s => {
    subjectSeatsMap[s.id] = {
      ...s,
      seats: Number(s.seats),
      available_seats: Number(s.seats), // reset for fresh allotment run
      allotted_count: 0
    };
  });

  // 2. Fetch all preferences for this selection period
  const allPreferences = db.getPreferences().filter(p => p.selection_period_id === selectionPeriodId);

  // 3. Group preferences by student
  const studentMap = {};
  allPreferences.forEach(pref => {
    if (!studentMap[pref.student_id]) {
      studentMap[pref.student_id] = {
        student_id: pref.student_id,
        earliest_submitted_at: pref.submitted_at,
        preferences: []
      };
    }
    // Track earliest timestamp if slightly different
    if (new Date(pref.submitted_at) < new Date(studentMap[pref.student_id].earliest_submitted_at)) {
      studentMap[pref.student_id].earliest_submitted_at = pref.submitted_at;
    }
    studentMap[pref.student_id].preferences.push(pref);
  });

  // 4. Sort students STRICTLY BY FIFO (submitted_at ASC, student_id ASC for secondary determinism)
  const sortedStudents = Object.values(studentMap).sort((a, b) => {
    const timeA = new Date(a.earliest_submitted_at).getTime();
    const timeB = new Date(b.earliest_submitted_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.student_id.localeCompare(b.student_id);
  });

  const newAllotments = [];
  let totalAllotted = 0;
  let totalWaitlisted = 0;

  // 5. Process each student in FIFO order
  sortedStudents.forEach(studentEntry => {
    const profile = db.getProfileById(studentEntry.student_id);
    const rollNumber = profile?.roll_number || 'UNKNOWN';

    // Sort student's preferences by priority 1, 2, 3...
    const sortedPrefs = [...studentEntry.preferences].sort((a, b) => a.priority - b.priority);

    let isAllocated = false;

    for (const pref of sortedPrefs) {
      const subj = subjectSeatsMap[pref.subject_id];
      if (subj && subj.available_seats > 0) {
        // Seat available! Allot this priority
        subj.available_seats -= 1;
        subj.allotted_count += 1;

        newAllotments.push({
          id: `allot-${studentEntry.student_id}-${Date.now()}`,
          student_id: studentEntry.student_id,
          roll_number: rollNumber,
          student_name: profile?.name || 'Student',
          student_email: profile?.email || '',
          branch: profile?.branch || 'N/A',
          section: profile?.section || 'A',
          semester: profile?.semester || period.semester || 5,
          selection_period_id: selectionPeriodId,
          elective_type: period.elective_type,
          subject_id: subj.id,
          priority_selected: pref.priority,
          status: 'ALLOTTED',
          submitted_at: studentEntry.earliest_submitted_at,
          allotted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        isAllocated = true;
        totalAllotted += 1;
        break; // Stop checking lower priorities
      }
    }

    // If no priority had available seats
    if (!isAllocated) {
      newAllotments.push({
        id: `allot-${studentEntry.student_id}-${Date.now()}`,
        student_id: studentEntry.student_id,
        roll_number: rollNumber,
        student_name: profile?.name || 'Student',
        student_email: profile?.email || '',
        branch: profile?.branch || 'N/A',
        section: profile?.section || 'A',
        semester: profile?.semester || period.semester || 5,
        selection_period_id: selectionPeriodId,
        elective_type: period.elective_type,
        subject_id: null,
        priority_selected: null,
        status: 'WAITLISTED',
        submitted_at: studentEntry.earliest_submitted_at,
        allotted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      totalWaitlisted += 1;
    }
  });

  // 6. Update subjects in DB with final available seats
  Object.values(subjectSeatsMap).forEach(updatedSubj => {
    db.updateSubject(updatedSubj.id, {
      available_seats: updatedSubj.available_seats
    });
  });

  // 7. Retain allotments from other periods, overwrite current period allotments
  const otherAllotments = db.getAllotments().filter(a => a.selection_period_id !== selectionPeriodId);
  const finalAllotments = [...otherAllotments, ...newAllotments];
  db.setAllotments(finalAllotments);

  // 8. Record audit log
  db.addAuditLog({
    coordinatorId,
    studentId: null,
    action: 'FIFO_ALLOTMENT_RUN',
    oldValue: null,
    newValue: `Processed: ${sortedStudents.length}, Allotted: ${totalAllotted}, Waitlisted: ${totalWaitlisted}`,
    reason: `Automated FIFO allotment execution for ${period.elective_type} ${period.academic_year} Sem ${period.semester}`
  });

  return {
    success: true,
    selection_period_id: selectionPeriodId,
    total_processed: sortedStudents.length,
    total_allotted: totalAllotted,
    total_waitlisted: totalWaitlisted,
    subjects: Object.values(subjectSeatsMap),
    allotments: newAllotments,
    executed_at: new Date().toISOString()
  };
}
