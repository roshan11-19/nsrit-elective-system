import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  ArrowLeft, 
  BookOpen, 
  Globe, 
  Clock, 
  AlertCircle,
  FileCheck,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import AllotmentCard from '../../components/student/AllotmentCard';

export default function MyAllotmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const currentType = searchParams.get('type') === 'OE' ? 'OE' : 'PE';
  const initialSem = Number(searchParams.get('semester')) || Number(currentUser?.semester) || 5;
  const [selectedSemester, setSelectedSemester] = useState(initialSem);

  const [loading, setLoading] = useState(true);
  const [allotments, setAllotments] = useState([]);

  useEffect(() => {
    const semParam = Number(searchParams.get('semester'));
    if (semParam && semParam !== selectedSemester) {
      setSelectedSemester(semParam);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadAllotment() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const data = await studentService.getAllotments(currentUser.id, currentType, currentUser.email, selectedSemester);
        setAllotments(data || []);
      } catch (err) {
        console.error('Error fetching allotment:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllotment();
  }, [currentUser, currentType, selectedSemester]);

  const handleTypeChange = (type) => {
    setSearchParams({ type, semester: selectedSemester });
  };

  const handleSemesterChange = (newSem) => {
    setSelectedSemester(newSem);
    setSearchParams({ type: currentType, semester: newSem });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between no-print">
        <Link
          to="/student"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-crimson-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-semibold text-gray-400">
          Official Academic Allotment Memo
        </span>
      </div>

      {/* Type Toggle & Semester Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 font-display">
              Elective Allotment Result
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson-100 text-crimson-800 border border-crimson-200">
              Semester {selectedSemester}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified seat allotment result for Semester {selectedSemester} • {currentUser?.admitted_batch ? `Batch ${currentUser.admitted_batch}` : 'Batch N/A'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Semester Selector */}
          <select
            value={selectedSemester}
            onChange={(e) => handleSemesterChange(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-crimson-800 shadow-2xs focus:ring-2 focus:ring-crimson-600"
            title="Switch semester view"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={s}>
                Semester {s} {s === Number(currentUser?.semester) ? '(Current)' : s < Number(currentUser?.semester) ? '(Past)' : ''}
              </option>
            ))}
          </select>

          {/* Type Toggle */}
          <div className="flex p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              onClick={() => handleTypeChange('PE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentType === 'PE'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>PE</span>
            </button>
            <button
              onClick={() => handleTypeChange('OE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentType === 'OE'
                  ? 'bg-white text-crimson-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>OE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Allotment Letter / Status */}
      {loading ? (
        <div className="p-16 text-center">
          <div className="w-10 h-10 border-4 border-crimson-200 border-t-crimson-700 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs text-gray-500 font-medium">Retrieving allotment status...</p>
        </div>
      ) : allotments.length > 0 ? (
        <div className="space-y-8">
          {allotments.map((item, idx) => (
            <div key={item.id || idx} className="space-y-2">
              {allotments.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-crimson-700 text-white font-bold font-mono text-xs">
                    {currentType}-{item.elective_number || idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    {currentType === 'PE' ? `Professional Elective ${item.elective_number || idx + 1}` : `Open Elective ${item.elective_number || idx + 1}`}
                  </h3>
                </div>
              )}
              <AllotmentCard allotment={item} profile={currentUser} electiveType={currentType} />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 font-display">
              {selectedSemester < Number(currentUser?.semester || 5) ? 'No Allotment Recorded' : 'Allotment In Progress'}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
              {selectedSemester < Number(currentUser?.semester || 5)
                ? `No finalized allotment was recorded for ${currentType === 'PE' ? 'Professional Elective' : 'Open Elective'} in Semester ${selectedSemester}.`
                : `The automated FIFO allotment process for Semester ${selectedSemester} ${currentType === 'PE' ? 'Professional Elective' : 'Open Elective'} has not been executed yet.`}
            </p>
          </div>
          {selectedSemester >= Number(currentUser?.semester || 5) && (
            <div className="pt-2">
              <Link
                to={`/student/select?type=${currentType}&semester=${selectedSemester}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm"
              >
                <FileCheck className="w-4 h-4" />
                <span>Select / Verify Submitted Priorities</span>
              </Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
