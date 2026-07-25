import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Mail, 
  BookOpen, 
  Award, 
  AlertCircle, 
  X, 
  Filter,
  Eye
} from 'lucide-react';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button as MuiButton,
  CircularProgress
} from '@mui/material';

export default function RecordsDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [selectedStudent, setSelectedStudent] = useState(null);

  // API Integration States
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (batchFilter !== 'All') params.append('batch', batchFilter);
      if (statusFilter !== 'All') {
        const mappedStatus = statusFilter === 'Good' ? 'good_standing' : statusFilter.toLowerCase();
        params.append('status', mappedStatus);
      }
      if (searchTerm) params.append('search', searchTerm);
      
      params.append('limit', '1000'); // Grab matching batch results to allow frontend sorting/pagination

      const response = await fetch(`/api/students?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.data.students || []);
      } else {
        setError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Network error fetching student records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, statusFilter, batchFilter]);

  // Sorting Handler
  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Filter & Sort Logic (Mapped to backend schema attributes)
  const processedStudents = useMemo(() => {
    let result = students.map(student => {
      const completedCredits = student.courses 
        ? student.courses.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.creditHours, 0)
        : 0;
      const completedCourses = student.courses 
        ? student.courses.filter(c => c.status === 'completed').length 
        : 0;

      return {
        id: student.rollNumber,
        name: student.name,
        email: student.email || 'N/A',
        cgpa: student.cgpa || 0.0,
        currentSemester: student.currentSemester || 1,
        status: student.status === 'good_standing' 
          ? 'Good' 
          : student.status === 'warning' 
          ? 'Warning' 
          : 'Critical',
        batch: student.batch,
        coursesCompleted: completedCourses,
        remainingCredits: Math.max(130 - completedCredits, 0)
      };
    });

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(processedStudents.length / pageSize);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedStudents.slice(start, start + pageSize);
  }, [processedStudents, currentPage, pageSize]);

  // Sort icon renderer
  const renderSortIcon = (field) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 text-slate-300 ml-1 opacity-50" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-4 w-4 text-brandAccent ml-1" />
      : <ChevronDown className="h-4 w-4 text-brandAccent ml-1" />;
  };

  // Status Badge styling mapping
  const statusBadges = {
    Good: {
      bg: 'bg-alertGood/10 border-alertGood/30 text-alertGood',
      label: 'Good Standing'
    },
    Warning: {
      bg: 'bg-alertWarning/10 border-alertWarning/30 text-alertWarning',
      label: 'Warning (CGPA ≤ 2.1)'
    },
    Critical: {
      bg: 'bg-alertCritical/10 border-alertCritical/30 text-alertCritical',
      label: 'Critical (CGPA < 2.0)'
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brandNavy font-display">Student Records Directory</h1>
          <p className="text-slate-500 text-sm">Search, filter, and review profiles of assigned student batches.</p>
        </div>
      </div>

      {/* Control Panel (Search, Filters, Limit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

        {/* Search */}
        <div className="lg:col-span-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search by Name, Roll No, or Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brandAccent transition-colors text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:inline" />
          <ResponsiveSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full"
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Good', label: 'Good Standing' },
              { value: 'Warning', label: 'Warning (≤ 2.1)' },
              { value: 'Critical', label: 'Critical (< 2.0)' },
            ]}
          />
        </div>

        {/* Batch Filter */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <ResponsiveSelect
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setCurrentPage(1); }}
            className="w-full"
            options={[
              { value: 'All', label: 'All Batches' },
              { value: '2022', label: 'Batch 2022' },
              { value: '2023', label: 'Batch 2023' },
              { value: '2024', label: 'Batch 2024' },
              { value: '2025', label: 'Batch 2025' },
            ]}
          />
        </div>

        {/* Rows Limit Selection */}
        <div className="lg:col-span-3 flex items-center justify-start lg:justify-end gap-2 text-sm text-slate-500">
          <span>Show:</span>
          <ResponsiveSelect
            value={String(pageSize)}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            options={[
              { value: '25', label: '25 Rows' },
              { value: '50', label: '50 Rows' },
              { value: '100', label: '100 Rows' },
            ]}
          />
        </div>

      </div>

      {/* Grid Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('id')}>
                  <div className="flex items-center">Roll Number {renderSortIcon('id')}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Full Name {renderSortIcon('name')}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('batch')}>
                  <div className="flex items-center">Batch {renderSortIcon('batch')}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('cgpa')}>
                  <div className="flex items-center">CGPA {renderSortIcon('cgpa')}</div>
                </th>
                <th className="py-3 px-4">Academic Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <CircularProgress size={16} className="text-brandAccent" />
                      Loading student records...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-alertCritical text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">{student.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-400 font-medium">{student.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">CS Batch {student.batch}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {student.currentSemester === 1 || Number(student.currentSemester) === 1 ? 'N/A' : student.cgpa.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${statusBadges[student.status].bg}`}>
                        {statusBadges[student.status].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brandAccent hover:text-brandAccent/80 focus:outline-none transition-colors"
                      >
                        <Eye className="h-4 w-4" /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/30 text-sm">
            <span className="text-slate-500 font-medium">
              Showing page <strong className="text-slate-700">{currentPage}</strong> of <strong className="text-slate-700">{totalPages}</strong> ({processedStudents.length} entries)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Details Dialog (MUI) */}
      <Dialog
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '24px',
            padding: '8px',
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        {selectedStudent && (
          <>
            <DialogTitle className="flex justify-between items-center font-bold font-display" style={{ color: '#1B3A6B', padding: '16px 24px' }}>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-brandAccent" />
                Student Academic Card
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogTitle>
            <DialogContent className="space-y-4" style={{ padding: '8px 24px 24px' }}>
              {/* Profile Card Header */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-brandNavy/5 flex items-center justify-center border border-brandNavy/10 text-brandNavy font-bold text-lg">
                  {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{selectedStudent.name}</h3>
                  <p className="text-xs font-mono text-slate-500 font-semibold">{selectedStudent.id}</p>
                </div>
              </div>

              {/* Data Grid list */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 border border-slate-150 rounded-lg">
                  <span className="text-slate-400 font-medium text-xs uppercase tracking-wider block">Assigned Batch</span>
                  <strong className="text-slate-700 block mt-0.5">CS Batch {selectedStudent.batch}</strong>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg">
                  <span className="text-slate-400 font-medium text-xs uppercase tracking-wider block">Current CGPA</span>
                  <strong className="text-slate-700 block mt-0.5 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-yellow-500" />
                    {selectedStudent.cgpa.toFixed(2)}
                  </strong>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg">
                  <span className="text-slate-400 font-medium text-xs uppercase tracking-wider block">Completed Credits</span>
                  <strong className="text-slate-700 block mt-0.5">{selectedStudent.coursesCompleted * 3} CH ({selectedStudent.coursesCompleted} Courses)</strong>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg">
                  <span className="text-slate-400 font-medium text-xs uppercase tracking-wider block">Remaining Credits</span>
                  <strong className="text-slate-700 block mt-0.5">{selectedStudent.remainingCredits} CH</strong>
                </div>
              </div>

              {/* Contact list */}
              <div className="space-y-2 border border-slate-150 p-3 rounded-lg text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{selectedStudent.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span>Department of Computer Science</span>
                </div>
              </div>

              {/* Warnings alert if applicable */}
              {selectedStudent.status !== 'Good' && (
                <div className={`p-3 rounded-lg border text-sm flex gap-2.5 leading-relaxed ${selectedStudent.status === 'Critical'
                    ? 'bg-alertCritical/5 border-alertCritical/10 text-alertCritical'
                    : 'bg-alertWarning/5 border-alertWarning/10 text-alertWarning'
                  }`}>
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Academic Standing Alert</span>
                    This student's CGPA has fallen into the **{selectedStudent.status}** range. Timely advisory intervention and counseling are highly recommended.
                  </div>
                </div>
              )}
            </DialogContent>
            <DialogActions style={{ padding: '8px 24px 16px' }}>
              <MuiButton
                onClick={() => setSelectedStudent(null)}
                style={{
                  backgroundColor: '#1B3A6B',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  padding: '6px 20px',
                  borderRadius: '12px'
                }}
              >
                Close Profile
              </MuiButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
