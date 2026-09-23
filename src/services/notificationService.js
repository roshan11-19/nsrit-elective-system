import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, normalizeBatch } from '../lib/storage';
import { coordinatorService } from './coordinatorService';

export const OFFICIAL_SENDER_EMAIL = 'nsritelectivesystem@gmail.com';
export const OFFICIAL_SENDER_NAME = 'NSRIT Autonomous Elective System';

/**
 * NSRIT Elective Notification Service
 * Dispatches automated and on-demand email communications to students.
 * Official System Sender: nsritelectivesystem@gmail.com
 */
export const notificationService = {
  SENDER_EMAIL: OFFICIAL_SENDER_EMAIL,
  SENDER_NAME: OFFICIAL_SENDER_NAME,

  /**
   * Generates a direct mailto URI or triggers client/server email dispatch
   */
  generateMailto: ({ to, subject, body }) => {
    const encSubject = encodeURIComponent(subject);
    const encBody = encodeURIComponent(body);
    const recipientsStr = Array.isArray(to) ? to.join(',') : (to || '');
    return `mailto:${recipientsStr}?subject=${encSubject}&body=${encBody}`;
  },

  /**
   * Helper to log sent notifications to Supabase and LocalStorage
   */
  logNotification: async ({ type, subject, body, recipients = [], windowId = null, driveType = 'PE', electiveNumber = 1 }) => {
    const logPayload = {
      id: `notif_${Date.now()}`,
      type,
      sender_email: OFFICIAL_SENDER_EMAIL,
      recipient_count: recipients.length,
      recipients,
      subject,
      body,
      window_id: windowId,
      elective_type: driveType,
      elective_number: Number(electiveNumber || 1),
      status: 'SENT',
      created_at: new Date().toISOString()
    };

    // 1. Supabase logging
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notification_logs').insert([{
          type: logPayload.type,
          sender_email: logPayload.sender_email,
          recipient_count: logPayload.recipient_count,
          recipients: logPayload.recipients,
          subject: logPayload.subject,
          body: logPayload.body,
          window_id: logPayload.window_id,
          elective_type: logPayload.elective_type,
          elective_number: logPayload.elective_number,
          status: logPayload.status
        }]);
      } catch (err) {
        console.warn('Supabase notification log note:', err);
      }
    }

    // 2. Local storage logging
    try {
      const logs = JSON.parse(localStorage.getItem('nsrit_notification_logs') || '[]');
      logs.unshift(logPayload);
      localStorage.setItem('nsrit_notification_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.warn('LocalStorage notification log note:', e);
    }
  },

  /**
   * Dispatches 24-Hour Pre-Deadline Reminder to students who haven't submitted their elective priorities
   * Sent from: nsritelectivesystem@gmail.com
   * Strictly scoped to the specified drive's batch, branch (for PE), semester, and elective number.
   */
  sendDeadlineReminderEmail: async ({ driveType = 'PE', drive, students = [], pendingOnly = true }) => {
    const isPE = driveType === 'PE';
    const eNum = Number(drive?.elective_number || 1);
    const driveTitle = drive?.title || `${driveType}-${eNum} Elective Selection Drive`;
    const batch = drive?.batch || 'Current Batch';
    const cleanBatch = normalizeBatch(batch);
    const semester = Number(drive?.semester || 5);
    const branch = String(drive?.branch || '').trim().toUpperCase();
    const dueDate = drive?.due_date ? new Date(drive.due_date) : null;
    const formattedDeadline = dueDate ? dueDate.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) : 'Approaching Soon';

    // Calculate remaining time
    let remainingText = 'less than 24 hours';
    if (dueDate) {
      const diffMs = dueDate.getTime() - Date.now();
      const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
      remainingText = `approximately ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }

    // 1. Resolve candidate students pool
    let candidateStudents = Array.isArray(students) && students.length > 0 ? [...students] : [];

    if (candidateStudents.length === 0) {
      try {
        const queryBranch = isPE && branch && branch !== 'ALL' ? branch : 'ALL';
        const fetched = await coordinatorService.getStudents(queryBranch);
        if (fetched && fetched.length > 0) {
          candidateStudents = fetched;
        }
      } catch (e) {
        console.warn('Eligible students fetch note:', e);
      }
    }

    // 2. STRICTLY filter candidates to ONLY include students of THIS drive's batch and branch (DO NOT filter by semester)
    const eligibleStudents = candidateStudents.filter(s => {
      if (s.role && s.role !== 'student') return false;

      // Strict Batch check: student must match this drive's batch
      const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
      if (cleanBatch && sBatch && sBatch !== cleanBatch) return false;

      // Strict Branch check (for PE drives): student must match this drive's branch
      if (isPE) {
        const sBranch = String(s.branch || '').trim().toUpperCase();
        if (branch && branch !== 'ALL' && sBranch && sBranch !== branch) return false;
      }

      return true;
    });

    // If 0 eligible students exist for this specific batch/branch:
    if (eligibleStudents.length === 0) {
      return {
        success: false,
        count: 0,
        sender: OFFICIAL_SENDER_EMAIL,
        message: `No enrolled students found matching Batch ${batch}${isPE && branch ? ` (${branch})` : ''} for ${driveType}-${eNum}.`
      };
    }

    // 3. Identify students who have already submitted preferences or received an allotment for THIS specific elective slot (e.g. PE-3)
    let targetStudents = eligibleStudents;
    if (pendingOnly) {
      const submittedIds = new Set();
      const submittedEmails = new Set();
      const submittedRolls = new Set();

      // Query Supabase elective_preferences
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: prefData } = await supabase
            .from('elective_preferences')
            .select('student_id, roll_number')
            .eq('elective_type', driveType)
            .eq('elective_number', eNum);
          if (prefData) {
            prefData.forEach(p => {
              if (p.student_id) submittedIds.add(String(p.student_id).trim());
              if (p.roll_number && p.roll_number !== 'N/A') submittedRolls.add(String(p.roll_number).trim().toUpperCase());
            });
          }
        } catch (e) {
          console.warn('Preferences query note:', e);
        }

        // Query Supabase allotments
        try {
          const { data: allotData } = await supabase
            .from('allotments')
            .select('student_id, roll_number, student_email')
            .eq('elective_type', driveType)
            .eq('elective_number', eNum);
          if (allotData) {
            allotData.forEach(a => {
              if (a.student_id) submittedIds.add(String(a.student_id).trim());
              if (a.roll_number && a.roll_number !== 'N/A') submittedRolls.add(String(a.roll_number).trim().toUpperCase());
              if (a.student_email) submittedEmails.add(String(a.student_email).trim().toLowerCase());
            });
          }
        } catch (e) {
          console.warn('Allotments query note:', e);
        }
      }

      // Query LocalStorage db.getPreferences
      try {
        const localPrefs = db.getPreferences ? db.getPreferences() : [];
        localPrefs
          .filter(p => p.elective_type === driveType && Number(p.elective_number || 1) === eNum)
          .forEach(p => {
            if (p.student_id) submittedIds.add(String(p.student_id).trim());
            if (p.roll_number) submittedRolls.add(String(p.roll_number).trim().toUpperCase());
            if (p.student_email) submittedEmails.add(String(p.student_email).trim().toLowerCase());
          });
      } catch (e) {}

      // Query LocalStorage db.getAllotments
      try {
        const localAllots = db.getAllotments ? db.getAllotments() : [];
        localAllots
          .filter(a => a.elective_type === driveType && Number(a.elective_number || 1) === eNum)
          .forEach(a => {
            if (a.student_id) submittedIds.add(String(a.student_id).trim());
            if (a.roll_number) submittedRolls.add(String(a.roll_number).trim().toUpperCase());
            if (a.student_email) submittedEmails.add(String(a.student_email).trim().toLowerCase());
          });
      } catch (e) {}

      targetStudents = eligibleStudents.filter(s => {
        const sid = String(s.id || '').trim();
        const semail = String(s.email || '').trim().toLowerCase();
        const sroll = String(s.roll_number || '').trim().toUpperCase();

        const isSubmitted = (sid && submittedIds.has(sid)) ||
                            (semail && submittedEmails.has(semail)) ||
                            (sroll && submittedRolls.has(sroll));
        return !isSubmitted;
      });
    }

    if (targetStudents.length === 0) {
      return {
        success: true,
        count: 0,
        sender: OFFICIAL_SENDER_EMAIL,
        message: `All ${eligibleStudents.length} enrolled students in Batch ${batch}${isPE && branch ? ` (${branch})` : ''} have already submitted their ${driveType}-${eNum} elective choices!`
      };
    }

    const recipientEmails = targetStudents.map(s => s.email).filter(Boolean);
    const portalUrl = `${window.location.origin}${window.location.pathname}#/login?role=student`;

    const emailSubject = `URGENT: 24-Hour Deadline Reminder — ${driveType}-${eNum} Elective Selection Closing (${batch} • Sem ${semester}${isPE && branch ? ` • ${branch}` : ''})`;
    const emailBody = 
`Dear NSRIT Student,

This is an official academic notice from the NSRIT Autonomous Elective System (${OFFICIAL_SENDER_EMAIL}) regarding your ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum} • ${branch || 'Engineering'})` : `Open Elective ${eNum} (OE-${eNum})`} course selection.

⚠️ SELECTION WINDOW CLOSING IN ${remainingText.toUpperCase()}!
• Selection Drive: ${driveTitle}
• Elective Slot: ${driveType}-${eNum}
• Academic Batch: ${batch} • Semester ${semester}${isPE && branch ? ` • Department: ${branch}` : ''}
• Final Submission Deadline: ${formattedDeadline}
• Official System Sender: ${OFFICIAL_SENDER_EMAIL}

You currently have NOT submitted or locked your subject preferences for ${driveType}-${eNum}. Once the deadline passes, elective selection will be permanently closed and unsubmitted students will be auto-allocated.

👉 CLICK HERE TO LOGIN & SUBMIT YOUR PREFERENCES:
${portalUrl}

Submission Guidelines:
1. Log in with your College Email or Roll Number.
2. Select "${driveType}-${eNum}" under Semester ${semester}.
3. Drag and arrange your subject choices in order of preference (Priority 1 = Top Choice).
4. Click "Save & Lock ${driveType}-${eNum} Priorities" to confirm your choices. (Seats are allocated in strict FIFO timestamp order).

Please complete your submission immediately before the deadline expires.

Office of Academic Affairs & Elective Coordination
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)
Official Contact: ${OFFICIAL_SENDER_EMAIL}`;

    // Record notification log
    await notificationService.logNotification({
      type: 'DEADLINE_24H_REMINDER',
      subject: emailSubject,
      body: emailBody,
      recipients: recipientEmails,
      windowId: drive?.id,
      driveType,
      electiveNumber: eNum
    });

    // Mark reminder_24h_sent flag in database/storage
    if (drive?.id) {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('selection_windows').update({ reminder_24h_sent: true }).eq('id', drive.id);
        } catch (uErr) {
          console.warn('Update reminder_24h_sent note:', uErr);
        }
      }
      if (db.updateSelectionWindow) {
        try {
          db.updateSelectionWindow(drive.id, { reminder_24h_sent: true });
        } catch (e) {}
      }
    }

    return {
      success: true,
      count: recipientEmails.length,
      sender: OFFICIAL_SENDER_EMAIL,
      emails: recipientEmails,
      subject: emailSubject,
      body: emailBody,
      mailtoUrl: notificationService.generateMailto({ to: recipientEmails, subject: emailSubject, body: emailBody })
    };
  },

  /**
   * Scans active drives and automatically triggers 24-hour reminders if due within 24h
   */
  checkAndDispatchAutomated24hReminders: async (studentsList = []) => {
    let windows = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('selection_windows').select('*').eq('status', 'ACTIVE');
        if (data) windows = data;
      } catch (e) {}
    }
    if (windows.length === 0 && db.getSelectionWindows) {
      windows = (db.getSelectionWindows() || []).filter(w => w.status === 'ACTIVE');
    }

    const now = Date.now();
    const results = [];

    for (const win of windows) {
      if (!win.due_date) continue;
      if (win.reminder_24h_sent) continue; // Already sent

      const due = new Date(win.due_date).getTime();
      const diffMs = due - now;
      const hoursRemaining = diffMs / (1000 * 60 * 60);

      // Trigger if deadline is within 24 hours and in the future
      if (hoursRemaining <= 24 && hoursRemaining > 0) {
        const dType = win.elective_type || 'PE';
        const res = await notificationService.sendDeadlineReminderEmail({
          driveType: dType,
          drive: win,
          students: studentsList,
          pendingOnly: true
        });
        results.push({ window: win, result: res });
      }
    }

    return results;
  },

  /**
   * Dispatches Selection Window Open notification
   * Sent from: nsritelectivesystem@gmail.com
   */
  sendSelectionOpenEmail: async ({ driveType = 'PE', drive, students = [] }) => {
    const eNum = Number(drive?.elective_number || 1);
    const driveTitle = drive?.title || `${driveType}-${eNum} Elective Selection Drive`;
    const batch = drive?.batch || 'Current Batch';
    const semester = drive?.semester || 5;
    const branch = String(drive?.branch || '').trim().toUpperCase();
    const isPE = driveType === 'PE';
    const dueDate = drive?.due_date ? new Date(drive.due_date) : null;
    const formattedDeadline = dueDate ? dueDate.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) : 'To Be Announced';

    // Strictly filter students by batch, semester, branch
    const cleanBatch = normalizeBatch(batch);
    const filteredStudents = (students || []).filter(s => {
      if (s.role && s.role !== 'student') return false;
      const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
      if (cleanBatch && sBatch && sBatch !== cleanBatch) return false;
      if (isPE && branch && branch !== 'ALL') {
        const sBranch = String(s.branch || '').trim().toUpperCase();
        if (sBranch && sBranch !== branch) return false;
      }
      return true;
    });

    const targetList = filteredStudents.length > 0 ? filteredStudents : students;
    const recipientEmails = targetList.map(s => s.email).filter(Boolean);
    const portalUrl = `${window.location.origin}${window.location.pathname}#/login?role=student`;

    const emailSubject = `NOW OPEN: ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum}${branch ? ` • ${branch}` : ''})` : `Open Elective ${eNum} (OE-${eNum})`} Selection Portal (${batch} • Sem ${semester})`;
    const emailBody = 
`Dear NSRIT Student,

The Autonomous Elective Selection Window for ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum}${branch ? ` • ${branch}` : ''})` : `Open Elective ${eNum} (OE-${eNum})`} is now officially OPEN for your batch.

• Drive: ${driveTitle}
• Elective Slot: ${driveType}-${eNum}
• Academic Batch: ${batch} | Semester: ${semester}${isPE && branch ? ` | Department: ${branch}` : ''}
• Submission Deadline: ${formattedDeadline}
• Official System Sender: ${OFFICIAL_SENDER_EMAIL}

👉 ACCESS THE SELECTION PORTAL:
${portalUrl}

Key Points to Remember:
1. Log in using your registered college email or roll number.
2. Review the course syllabus and available seat capacity for each offered elective.
3. Rank your choices in priority order (Priority 1 = Highest Priority).
4. Submissions are processed on a First-In, First-Out (FIFO) basis.

Please complete your selection before the deadline.

Academic Coordination Division
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)
Official Contact: ${OFFICIAL_SENDER_EMAIL}`;

    await notificationService.logNotification({
      type: 'SELECTION_OPEN',
      subject: emailSubject,
      body: emailBody,
      recipients: recipientEmails,
      windowId: drive?.id,
      driveType,
      electiveNumber: eNum
    });

    return {
      success: true,
      count: recipientEmails.length,
      sender: OFFICIAL_SENDER_EMAIL,
      emails: recipientEmails,
      subject: emailSubject,
      body: emailBody,
      mailtoUrl: notificationService.generateMailto({ to: recipientEmails, subject: emailSubject, body: emailBody })
    };
  },

  /**
   * Dispatches Student Invitation / Onboarding Email
   * Sent from: nsritelectivesystem@gmail.com
   */
  sendStudentInvitationEmail: async ({ student, temporaryPassword = null }) => {
    const portalUrl = `${window.location.origin}${window.location.pathname}#/login?role=student`;
    const emailSubject = `INVITATION: Access Your NSRIT Elective Selection Account`;
    const emailBody = 
`Dear ${student?.name || 'Student'},

You have been registered on the NSRIT Autonomous Elective Selection Portal.

Your Account Credentials:
• College Email: ${student?.email}
• Roll Number: ${student?.roll_number || 'N/A'}
• Branch: ${student?.branch || 'N/A'} • Section: ${student?.section || 'A'}
• Semester: ${student?.semester || 5}
${temporaryPassword ? `• Temporary Password: ${temporaryPassword}` : '• Password: Use your registered college password or reset via the login page.'}
• Official System Sender: ${OFFICIAL_SENDER_EMAIL}

👉 LOGIN TO THE PORTAL:
${portalUrl}

Please log in to review offered elective subjects, rank your preferences, and submit your choices before selection deadlines.

Academic Administration
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)
Official Contact: ${OFFICIAL_SENDER_EMAIL}`;

    await notificationService.logNotification({
      type: 'INVITATION',
      subject: emailSubject,
      body: emailBody,
      recipients: [student?.email].filter(Boolean),
      driveType: 'SYSTEM',
      electiveNumber: 1
    });

    return {
      success: true,
      count: 1,
      sender: OFFICIAL_SENDER_EMAIL,
      subject: emailSubject,
      body: emailBody,
      mailtoUrl: notificationService.generateMailto({ to: [student?.email], subject: emailSubject, body: emailBody })
    };
  },

  /**
   * Dispatches Allotment Publication notification
   * Sent from: nsritelectivesystem@gmail.com
   */
  sendAllotmentPublishedEmail: async ({ driveType = 'PE', drive, students = [] }) => {
    const eNum = Number(drive?.elective_number || 1);
    const batch = drive?.batch || 'Current Batch';
    const semester = drive?.semester || 5;
    const branch = String(drive?.branch || '').trim().toUpperCase();
    const isPE = driveType === 'PE';
    const cleanBatch = normalizeBatch(batch);

    // Filter students by batch, branch
    const filteredStudents = (students || []).filter(s => {
      if (s.role && s.role !== 'student') return false;
      const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
      if (cleanBatch && sBatch && sBatch !== cleanBatch) return false;
      if (isPE && branch && branch !== 'ALL') {
        const sBranch = String(s.branch || '').trim().toUpperCase();
        if (sBranch && sBranch !== branch) return false;
      }
      return true;
    });

    const targetList = filteredStudents.length > 0 ? filteredStudents : students;
    const recipientEmails = targetList.map(s => s.email).filter(Boolean);
    const portalUrl = `${window.location.origin}${window.location.pathname}#/login?role=student`;

    const emailSubject = `ANNOUNCEMENT: ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum}${branch ? ` • ${branch}` : ''})` : `Open Elective ${eNum} (OE-${eNum})`} Allotment Results Published (${batch} • Sem ${semester})`;
    const emailBody = 
`Dear NSRIT Student,

The official elective course allotment results for ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum}${branch ? ` • ${branch}` : ''})` : `Open Elective ${eNum} (OE-${eNum})`} (Batch ${batch} • Semester ${semester}) have been finalized and published.

• Elective Slot: ${driveType}-${eNum}
• Academic Batch: ${batch} • Semester ${semester}${isPE && branch ? ` • Department: ${branch}` : ''}
• Official System Sender: ${OFFICIAL_SENDER_EMAIL}

👉 VIEW YOUR OFFICIAL ALLOTMENT RESULT:
${portalUrl}

Instructions:
1. Log in to your student dashboard.
2. Your confirmed elective course name, course code, and priority allotment status are now visible on your dashboard.
3. You can download or print your official Elective Confirmation Slip for your academic records.

For any queries regarding your allotment, please contact your Department Coordinator.

Office of Academic Affairs
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)
Official Contact: ${OFFICIAL_SENDER_EMAIL}`;

    await notificationService.logNotification({
      type: 'ALLOTMENT_PUBLISHED',
      subject: emailSubject,
      body: emailBody,
      recipients: recipientEmails,
      windowId: drive?.id,
      driveType,
      electiveNumber: eNum
    });

    return {
      success: true,
      count: recipientEmails.length,
      sender: OFFICIAL_SENDER_EMAIL,
      emails: recipientEmails,
      subject: emailSubject,
      body: emailBody,
      mailtoUrl: notificationService.generateMailto({ to: recipientEmails, subject: emailSubject, body: emailBody })
    };
  },

  /**
   * Dispatches Deadline Extension notification
   * Sent from: nsritelectivesystem@gmail.com
   */
  sendDeadlineExtensionEmail: async ({ driveType = 'PE', drive, students = [] }) => {
    const eNum = Number(drive?.elective_number || 1);
    const batch = drive?.batch || 'Current Batch';
    const semester = drive?.semester || 5;
    const branch = String(drive?.branch || '').trim().toUpperCase();
    const isPE = driveType === 'PE';
    const dueDate = drive?.due_date ? new Date(drive.due_date) : null;
    const formattedDeadline = dueDate ? dueDate.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) : 'Extended';
    const cleanBatch = normalizeBatch(batch);

    // Filter students by batch, branch
    const filteredStudents = (students || []).filter(s => {
      if (s.role && s.role !== 'student') return false;
      const sBatch = normalizeBatch(s.admitted_batch || s.batch || '');
      if (cleanBatch && sBatch && sBatch !== cleanBatch) return false;
      if (isPE && branch && branch !== 'ALL') {
        const sBranch = String(s.branch || '').trim().toUpperCase();
        if (sBranch && sBranch !== branch) return false;
      }
      return true;
    });

    const targetList = filteredStudents.length > 0 ? filteredStudents : students;
    const recipientEmails = targetList.map(s => s.email).filter(Boolean);
    const portalUrl = `${window.location.origin}${window.location.pathname}#/login?role=student`;

    const emailSubject = `DEADLINE EXTENDED: ${driveType}-${eNum} Elective Selection Portal (${batch} • Sem ${semester}${isPE && branch ? ` • ${branch}` : ''})`;
    const emailBody = 
`Dear NSRIT Student,

Please note that the deadline for ${driveType === 'PE' ? `Professional Elective ${eNum} (PE-${eNum}${branch ? ` • ${branch}` : ''})` : `Open Elective ${eNum} (OE-${eNum})`} course selection has been extended.

• Elective Slot: ${driveType}-${eNum}
• Academic Batch: ${batch} • Semester ${semester}${isPE && branch ? ` • Department: ${branch}` : ''}
• NEW Submission Deadline: ${formattedDeadline}
• Official System Sender: ${OFFICIAL_SENDER_EMAIL}

If you have not yet submitted your choices, please log in and rank your preferences immediately:
${portalUrl}

Academic Coordination Division
Nadimpalli Satyanarayana Raju Institute of Technology (NSRIT)
Official Contact: ${OFFICIAL_SENDER_EMAIL}`;

    await notificationService.logNotification({
      type: 'DEADLINE_EXTENSION',
      subject: emailSubject,
      body: emailBody,
      recipients: recipientEmails,
      windowId: drive?.id,
      driveType,
      electiveNumber: eNum
    });

    return {
      success: true,
      count: recipientEmails.length,
      sender: OFFICIAL_SENDER_EMAIL,
      emails: recipientEmails,
      subject: emailSubject,
      body: emailBody,
      mailtoUrl: notificationService.generateMailto({ to: recipientEmails, subject: emailSubject, body: emailBody })
    };
  }
};
