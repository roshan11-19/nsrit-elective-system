import React from 'react';

export default function PrintAllotmentView({ 
  records = [], 
  reportType = 'PE',
  title = 'Professional Elective (PE) Allotment Sheet',
  subtitle = 'Academic Year 2024–2025',
  filters = {},
  currentPage = 1,
  pageSize = 100,
  totalRecords = null
}) {
  const sortedRecords = [...records].sort((a, b) => {
    const rollA = a.rollNumber || a.roll_number || '';
    const rollB = b.rollNumber || b.roll_number || '';
    return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const actualTotal = typeof totalRecords === 'number' ? totalRecords : sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(actualTotal / pageSize));
  const startSerial = (currentPage - 1) * pageSize;
  const allottedCount = sortedRecords.filter(r => r.status === 'ALLOTTED').length;
  const waitlistedCount = sortedRecords.filter(r => r.status === 'WAITLISTED').length;

  const deptDisplay = filters.student_branch && filters.student_branch !== 'ALL' 
    ? `${filters.student_branch} Department` 
    : (filters.coordinatorBranch && filters.coordinatorBranch !== 'ALL'
      ? `${filters.coordinatorBranch} Department` 
      : (filters.branch && filters.branch !== 'ALL' ? `${filters.branch} Department` : 'All Registered Departments'));
  const sectionDisplay = filters.section && filters.section !== 'ALL' ? `Section ${filters.section}` : 'All Sections';
  const batchDisplay = filters.batch && filters.batch !== 'ALL' ? ` • Batch ${filters.batch}` : '';
  const typeDisplay = filters.elective_type && filters.elective_type !== 'ALL' 
    ? (filters.elective_type === 'PE' ? 'Professional Elective (PE)' : 'Open Elective (OE)')
    : (reportType === 'PE' ? 'Professional Elective (PE)' : reportType === 'OE' ? 'Open Elective (OE)' : 'All Electives (PE & OE)');

  return (
    <div className="hidden print-only p-8 bg-white text-black font-sans print-container">
      {/* College Official Letterhead */}
      <div className="border-b-2 border-black pb-4 mb-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="p-1 bg-white border border-gray-400 rounded-lg flex items-center justify-center">
            <img 
              src="/nsrit-logo.png" 
              alt="NSRIT Logo" 
              className="h-14 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-gray-900">
              NADIMPALLI SATYANARAYANA RAJU INSTITUTE OF TECHNOLOGY
            </h1>
            <p className="text-xs uppercase font-bold text-gray-700">
              (AUTONOMOUS INSTITUTION) • Office of the Academic Coordinator & Dean of Academics
            </p>
          </div>
        </div>
        <div className="mt-3 py-2 bg-gray-100 border-y border-black">
          <h2 className="text-base font-extrabold uppercase tracking-wider">{title}</h2>
          <p className="text-xs text-gray-600 font-medium">
            {subtitle} • Printed on: {new Date().toLocaleString()} • <strong className="font-mono">Page {currentPage} of {totalPages} (Rows {startSerial + 1}–{startSerial + records.length} of {actualTotal})</strong>
          </p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 text-xs font-semibold mb-4 px-3 py-2 bg-gray-50 border border-gray-400">
        <div>
          Rows on Page: <strong>{records.length}</strong> (Total Filtered: <strong>{actualTotal}</strong>)
        </div>
        <div className="text-center">
          Allotted: <strong className="text-emerald-900">{allottedCount}</strong> | Waitlisted: <strong className="text-amber-900">{waitlistedCount}</strong>
        </div>
        <div className="text-center">
          Department: <strong>{deptDisplay} ({sectionDisplay}{batchDisplay})</strong>
        </div>
        <div className="text-right">
          Type: <strong>{typeDisplay}</strong> • <strong>Page {currentPage}/{totalPages}</strong>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full text-xs text-left border-collapse border border-black">
        <thead>
          <tr className="bg-gray-200 font-bold uppercase tracking-wider">
            <th className="border border-black px-2 py-2 text-center w-10">S.No</th>
            <th className="border border-black px-2 py-2 text-center">Elective</th>
            <th className="border border-black px-2 py-2">Roll Number</th>
            <th className="border border-black px-2 py-2">Student Name</th>
            <th className="border border-black px-2 py-2">Student Email</th>
            <th className="border border-black px-2 py-2 text-center">Student Branch</th>
            <th className="border border-black px-2 py-2 text-center">Sec</th>
            <th className="border border-black px-2 py-2">Allotted Subject</th>
            <th className="border border-black px-2 py-2 text-center">Choice Priority</th>
            <th className="border border-black px-2 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((row, idx) => {
            const electiveDisplay = `${row.elective_type || 'PE'}-${row.elective_number || 1}`;
            const subjectLabel = row.status === 'ALLOTTED'
              ? (row.subjectCode && row.subjectCode !== 'N/A' ? `${row.subjectCode} - ${row.subjectName}` : (row.subjectName || 'Allotted'))
              : (row.status === 'WAITLISTED' ? 'WAITLISTED (No Vacancy)' : (row.subjectName || '—'));

            const priorityLabel = row.is_auto_allocated
              ? 'Auto Allocated'
              : (row.priority_selected 
                ? `Priority ${row.priority_selected}` 
                : (row.status === 'ALLOTTED' ? 'Assigned (Override)' : '—'));

            return (
              <tr key={row.id || idx} className="hover:bg-gray-50">
                <td className="border border-black px-2 py-1.5 text-center font-mono">{startSerial + idx + 1}</td>
                <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">{electiveDisplay}</td>
                <td className="border border-black px-2 py-1.5 font-mono font-bold">{row.rollNumber || 'N/A'}</td>
                <td className="border border-black px-2 py-1.5 font-semibold">{row.studentName || 'Student'}</td>
                <td className="border border-black px-2 py-1.5 text-gray-800">{row.studentEmail || 'N/A'}</td>
                <td className="border border-black px-2 py-1.5 text-center font-semibold">{row.branch || '—'}</td>
                <td className="border border-black px-2 py-1.5 text-center">{row.section || '—'}</td>
                <td className="border border-black px-2 py-1.5 font-bold">
                  {subjectLabel}
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-medium">
                  {priorityLabel}
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {row.status}
                </td>
              </tr>
            );
          })}
          {sortedRecords.length === 0 && (
            <tr>
              <td colSpan="10" className="border border-black py-8 text-center text-gray-500 font-semibold">
                No allotment records found for the selected filter parameters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Official Sign-off Footer */}
      <div className="mt-12 pt-8 flex items-center justify-between text-xs font-bold border-t border-black">
        <div className="text-center">
          <div className="w-48 border-b border-black mb-1"></div>
          <span>Department Coordinator Signature</span>
        </div>
        <div className="text-center">
          <div className="w-48 border-b border-black mb-1"></div>
          <span>Head of Department (HOD)</span>
        </div>
        <div className="text-center">
          <div className="w-48 border-b border-black mb-1"></div>
          <span>Dean / Academic Controller</span>
        </div>
      </div>
    </div>
  );
}
