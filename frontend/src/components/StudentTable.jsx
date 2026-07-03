import React, { useState, useEffect } from 'react';

/**
 * StudentTable – displays a list of students with sorting and pagination.
 * Props:
 *   students: array of student objects { id, name, email, cohort }
 *   pageSizeOptions: optional array of page sizes (default [25, 50, 100])
 */
export default function StudentTable({ students = [], pageSizeOptions = [25, 50, 100] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [sortedStudents, setSortedStudents] = useState([]);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const sorted = [...students].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    setSortedStudents(sorted);
  }, [students, sortKey, sortAsc]);

  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const displayed = sortedStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeSort = (key) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-4 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer"
              onClick={() => changeSort('name')}
            >
              Name {sortKey === 'name' && (sortAsc ? '▲' : '▼')}
            </th>
            <th
              className="px-4 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer"
              onClick={() => changeSort('email')}
            >
              Email {sortKey === 'email' && (sortAsc ? '▲' : '▼')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
              Cohort
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {displayed.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 text-sm text-gray-800">{s.name}</td>
              <td className="px-4 py-2 text-sm text-gray-600">{s.email}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{s.cohort}</td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No students found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <label htmlFor="pageSize" className="text-sm text-gray-600">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="rounded border-gray-300 text-sm"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm text-gray-600 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm text-gray-600 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
