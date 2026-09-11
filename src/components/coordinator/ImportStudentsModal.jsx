import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../common/Modal';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Trash2, 
  FileCheck,
  Send
} from 'lucide-react';
import { isValidEmail } from '../../context/AuthContext';

export default function ImportStudentsModal({ isOpen, onClose, onImportSuccess, coordinatorBranch = 'CSE' }) {
  const fileInputRef = useRef(null);

  // Batch details
  const [batchInfo, setBatchInfo] = useState({
    regulation: 'AR23',
    branch: coordinatorBranch || 'CSE',
    section: 'A',
    admitted_batch: '',
    semester: 5
  });

  // Parsed students list from file
  const [parsedStudents, setParsedStudents] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    setBatchInfo(prev => ({
      ...prev,
      branch: coordinatorBranch || 'CSE'
    }));
  }, [coordinatorBranch, isOpen]);

  // Download Sample Excel Template
  const handleDownloadSample = () => {
    const sampleData = [
      { 'Roll Number': '24NU1A0501', 'Student Name': 'Aarav Sharma', 'Email': 'aarav.sharma@college.edu' },
      { 'Roll Number': '24NU1A0502', 'Student Name': 'Bhavya Patel', 'Email': 'bhavya.patel@college.edu' },
      { 'Roll Number': '24NU1A0503', 'Student Name': 'Chaitanya Reddy', 'Email': 'chaitanya.reddy@college.edu' },
      { 'Roll Number': '24NU1A0504', 'Student Name': 'Deepika Rao', 'Email': 'deepika.rao@college.edu' },
      { 'Roll Number': '24NU1A0505', 'Student Name': 'Eshwar Kumar', 'Email': 'eshwar.kumar@college.edu' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Auto-size columns
    worksheet['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 32 }];

    XLSX.writeFile(workbook, `student_import_template_${coordinatorBranch || batchInfo.branch}_Sec${batchInfo.section}.xlsx`);
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          throw new Error('The uploaded file is empty. Please check the spreadsheet contents.');
        }

        // Map and validate columns
        const mappedList = [];
        const invalidRows = [];
        const seenEmails = new Set();
        const seenRolls = new Set();

        rawJson.forEach((row, index) => {
          // Flexible key lookup
          const rawRoll = (row['Roll Number'] || row['Roll No'] || row['RollNo'] || row['Roll'] || row['HTNO'] || row['RegNo'] || row['roll_number'] || '').toString().trim();
          const roll = rawRoll.toUpperCase().replace(/\s+/g, '');
          const name = (row['Student Name'] || row['Name'] || row['StudentName'] || row['Full Name'] || row['name'] || '').toString().trim();
          const email = (row['Email'] || row['Email ID'] || row['College Email'] || row['EmailID'] || row['Mail'] || row['email'] || '').toString().trim().toLowerCase();

          if (!name || !email) {
            invalidRows.push(`Row ${index + 2}: Missing student name or email.`);
            return;
          }

          if (!isValidEmail(email)) {
            invalidRows.push(`Row ${index + 2}: Invalid email format "${email}".`);
            return;
          }

          if (seenEmails.has(email)) {
            invalidRows.push(`Row ${index + 2}: Duplicate email "${email}" found in spreadsheet.`);
            return;
          }
          seenEmails.add(email);

          if (roll && seenRolls.has(roll)) {
            invalidRows.push(`Row ${index + 2}: Duplicate roll number "${roll}" found in spreadsheet.`);
            return;
          }
          if (roll) seenRolls.add(roll);

          mappedList.push({
            roll_number: roll || `ROLL-${index + 1}`,
            name,
            email,
            valid: true
          });
        });

        if (invalidRows.length > 0 && mappedList.length === 0) {
          throw new Error(invalidRows.slice(0, 3).join(' '));
        }

        setParsedStudents(mappedList);
      } catch (err) {
        setError(err.message || 'Failed to read spreadsheet. Please ensure headers are Roll Number, Student Name, Email.');
        setParsedStudents([]);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit and bulk import
  const handleExecuteImport = async () => {
    if (parsedStudents.length === 0) {
      setError('Please upload an Excel or CSV file containing student records.');
      return;
    }

    const regValue = (batchInfo.regulation || 'AR23').trim().toUpperCase().replace(/\s+/g, '');
    const secValue = (batchInfo.section || 'A').trim().toUpperCase().replace(/\s+/g, '');
    const batchValue = (batchInfo.admitted_batch || '').trim();

    if (!batchValue) {
      setError('Please select or specify an Academic Batch.');
      return;
    }

    if (!regValue) {
      setError('Please specify a Regulation (e.g. AR23).');
      return;
    }

    if (!secValue) {
      setError('Please specify a Class Section (e.g. A, B).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const studentsToEnroll = parsedStudents.map(st => ({
        ...st,
        regulation: regValue,
        branch: coordinatorBranch || batchInfo.branch,
        section: secValue,
        admitted_batch: batchValue,
        semester: Number(batchInfo.semester),
        role: 'student',
        password_changed: true
      }));

      await onImportSuccess(studentsToEnroll);
      setImportResult({
        total: studentsToEnroll.length,
        regulation: regValue,
        branch: coordinatorBranch || batchInfo.branch,
        section: secValue,
        admitted_batch: batchValue,
        semester: batchInfo.semester
      });

    } catch (err) {
      setError(err.message || 'Failed to complete student bulk import.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setParsedStudents([]);
    setFileName('');
    setImportResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const currentRegulation = batchInfo.regulation;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={importResult ? "Import Successful" : `Batch ${coordinatorBranch || 'Department'} Student Excel Import`}
      subtitle={importResult 
        ? `Successfully enrolled ${importResult.total} students into Section ${importResult.section}.` 
        : `Upload ${coordinatorBranch || 'branch'} students list spreadsheet categorized by Regulation, Section & Semester.`}
      maxWidth="max-w-3xl"
    >
      {importResult ? (
        <div className="space-y-5 py-3">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-900">
                {importResult.total} Students Enrolled Successfully!
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Registered under <strong>{importResult.regulation}</strong> • <strong>{importResult.branch} - Section {importResult.section}</strong> (Semester {importResult.semester}).
                Only these students can log in with their registered college emails.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm"
            >
              Done / Return to Directory
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-200 text-xs text-crimson-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CONFIGURE BATCH METADATA */}
          <div className="bg-surface-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-crimson-700" />
                <span>1. Select Batch & Section Parameters</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Batch */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Batch *
                </label>
                <select
                  value={batchInfo.admitted_batch}
                  onChange={(e) => setBatchInfo({ ...batchInfo, admitted_batch: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800"
                >
                  <option value="">Select Batch...</option>
                  {['2021-2025', '2022-2026', '2023-2027', '2024-2028', '2025-2029', '2026-2030'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Regulation */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Regulation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AR23"
                  value={batchInfo.regulation}
                  onChange={(e) => setBatchInfo({ ...batchInfo, regulation: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold font-mono uppercase"
                />
              </div>

              {/* Branch (Locked to Coordinator's Department) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${coordinatorBranch || 'CSE'}`}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold text-gray-700 cursor-not-allowed font-mono uppercase"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Section *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A"
                  value={batchInfo.section}
                  onChange={(e) => setBatchInfo({ ...batchInfo, section: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold font-mono uppercase text-crimson-800"
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Semester *
                </label>
                <select
                  value={batchInfo.semester}
                  onChange={(e) => setBatchInfo({ ...batchInfo, semester: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: FILE UPLOAD DROPZONE & SAMPLE TEMPLATE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                2. Upload Excel (.xlsx, .xls) or CSV Sheet
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-xs font-bold text-crimson-700 hover:text-crimson-800 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Excel Template</span>
              </button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-crimson-500 bg-white hover:bg-crimson-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-crimson-50 text-crimson-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-800">
                {fileName ? fileName : 'Click to select or drop your Excel / CSV file here'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Expected Columns: <strong>Roll Number</strong>, <strong>Student Name</strong>, <strong>Email</strong>
              </p>
            </div>
          </div>

          {/* STEP 3: PREVIEW PARSED STUDENTS TABLE */}
          {parsedStudents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <FileCheck className="w-4 h-4" />
                  <span>{parsedStudents.length} Students Parsed from Spreadsheet</span>
                </span>
                <span className="text-gray-400">Target: {currentRegulation} • {coordinatorBranch || batchInfo.branch} - Sec {batchInfo.section}</span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Roll Number</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">College Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedStudents.map((st, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-mono font-bold text-gray-800">{st.roll_number}</td>
                        <td className="px-3 py-1.5 font-semibold text-gray-900">{st.name}</td>
                        <td className="px-3 py-1.5 text-crimson-800 font-medium">{st.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={loading || parsedStudents.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? 'Importing Batch...' : `Enroll ${parsedStudents.length} Students into Section ${batchInfo.section}`}</span>
            </button>
          </div>

        </div>
      )}
    </Modal>
  );
}
