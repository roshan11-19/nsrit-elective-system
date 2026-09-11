import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../common/Modal';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  BookOpen,
  Info
} from 'lucide-react';
import { normalizeBatch } from '../../lib/storage';
import { coordinatorService } from '../../services/coordinatorService';

export default function CurriculumUploadModal({
  isOpen,
  onClose,
  onSaveBatch,
  coordinatorBranch = 'CSE',
  initialBatch = ''
}) {
  const [targetBatch, setTargetBatch] = useState(initialBatch || '');
  const [targetRegulation, setTargetRegulation] = useState('AR23');
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);


  const processFile = (file) => {
    setError('');
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    if (!targetBatch.trim()) {
      setError('Please enter the Target Academic Batch before uploading the sheet.');
      return;
    }

    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          setError('The uploaded sheet contains no readable data rows.');
          setParsing(false);
          return;
        }

        // Map and validate columns
        const cleanBatch = normalizeBatch(targetBatch);
        const defaultReg = targetRegulation.trim().toUpperCase() || 'AR23';
        const mapped = json.map((r, idx) => {
          const code = String(r['Subject Code'] || r['subject_code'] || r['Course Code'] || r['Code'] || '').trim().toUpperCase().replace(/\s+/g, '');
          const name = String(r['Subject Name'] || r['subject_name'] || r['Course Name'] || r['Name'] || '').trim();
          const sem = Number(r['Semester'] || r['semester'] || r['Sem'] || 5);
          
          const rawType = String(r['Elective Type'] || r['elective_type'] || r['Type'] || 'PE').trim().toUpperCase();
          const isOE = rawType.includes('OPEN') || rawType === 'OE';
          const eType = isOE ? 'OE' : 'PE';

          const rawNum = r['Elective Number'] || r['elective_number'] || r['Elective No'] || r['Number'] || 1;
          const num = Math.max(1, Math.min(8, Number(rawNum) || 1));
          const reg = String(r['Regulation'] || r['regulation'] || defaultReg || 'AR23').trim().toUpperCase();
          return {
            rowId: idx + 1,
            batch: cleanBatch,
            branch: coordinatorBranch,
            regulation: reg,
            semester: sem >= 1 && sem <= 8 ? sem : 5,
            elective_type: eType,
            elective_number: num,
            subject_code: code,
            subject_name: name
          };
        }).filter(r => r.subject_code && r.subject_name);

        if (mapped.length === 0) {
          setError('No valid curriculum rows with Subject Code and Subject Name were found in the sheet.');
          setParsing(false);
          return;
        }

        // Validate duplicates
        const seen = new Set();
        const duplicates = [];
        mapped.forEach(r => {
          if (seen.has(r.subject_code)) {
            duplicates.push(r.subject_code);
          }
          seen.add(r.subject_code);
        });

        if (duplicates.length > 0) {
          setError(`Duplicate subject codes detected in uploaded file: ${Array.from(new Set(duplicates)).join(', ')}. Each subject code in a batch must be unique.`);
          setParsing(false);
          return;
        }

        setParsedRows(mapped);
      } catch (err) {
        console.error('Error parsing curriculum Excel:', err);
        setError(`Failed to parse file: ${err.message}`);
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setParsedRows([]);
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!targetBatch.trim()) {
      setError('Please enter the Target Academic Batch.');
      return;
    }

    if (parsedRows.length === 0) {
      setError('Please upload an Excel file containing curriculum syllabus rows.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSaveBatch(normalizeBatch(targetBatch), coordinatorBranch, parsedRows);
      onClose();
      handleClear();
    } catch (err) {
      setError(err.message || 'Failed to save uploaded curriculum.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); handleClear(); }}
      title="Upload Batch Curriculum Sheet"
      subtitle={`Import official semester-wise elective curriculum for Department of ${coordinatorBranch}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        
        {/* Batch & Regulation Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Target Academic Batch *
            </label>
            <input
              type="text"
              value={targetBatch}
              onChange={(e) => setTargetBatch(e.target.value)}
              onBlur={(e) => setTargetBatch(normalizeBatch(e.target.value))}
              placeholder="e.g. 2024-2028"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-crimson-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Regulation *
            </label>
            <input
              type="text"
              value={targetRegulation}
              onChange={(e) => setTargetRegulation(e.target.value.toUpperCase())}
              placeholder="e.g. AR23"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-crimson-600 uppercase font-mono"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 rounded-xl flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        {parsedRows.length === 0 ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-crimson-600 bg-crimson-50/40 scale-[1.01]' 
                : 'border-gray-300 hover:border-crimson-400 bg-gray-50/50 hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-crimson-100 text-crimson-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">
              {parsing ? 'Reading and verifying Excel sheet...' : 'Drag & Drop Curriculum Excel Sheet here'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Supports .xlsx, .xls, and .csv files. Each row defines a subject for PE or OE across semesters 5 to 8.
            </p>
            <button
              type="button"
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-crimson-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-2xs"
            >
              Browse Local File
            </button>
          </div>
        ) : (
          /* Preview Table of Parsed Rows */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified {parsedRows.length} Curriculum Subjects from "{fileName}" for Batch {normalizeBatch(targetBatch)}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-crimson-700 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Upload Different File</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase font-bold sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Semester</th>
                    <th className="px-3 py-2.5">Elective</th>
                    <th className="px-3 py-2.5">Subject Code</th>
                    <th className="px-3 py-2.5">Subject Title</th>
                    <th className="px-3 py-2.5">Regulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-gray-800">Sem {r.semester}</td>
                      <td className="px-3 py-2 font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          r.elective_type === 'PE' ? 'bg-crimson-100 text-crimson-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.elective_type}-{r.elective_number}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{r.subject_code}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.subject_name}</td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-600">
                        {r.regulation || 'AR23'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-500">
            {parsedRows.length > 0 ? `${parsedRows.length} subjects ready to store in curriculum master.` : 'Select batch & regulation, then drag and drop the curriculum sheet to upload.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { onClose(); handleClear(); }}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || submitting}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? 'Saving to Curriculum...' : `Confirm & Save ${parsedRows.length > 0 ? `(${parsedRows.length} Subjects)` : ''}`}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
