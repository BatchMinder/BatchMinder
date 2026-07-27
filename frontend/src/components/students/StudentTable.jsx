import React, { useMemo, useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

const StudentTable = ({ students = [], onEdit, onAdd, canEdit = false }) => {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('studentID');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25); // Enforces 25 default
  const [searchQuery, setSearchQuery] = useState('');

  // Page index reset handler avoids layout mismatch failures
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredStudents = students.filter(student =>
    student.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentID?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStudents = useMemo(() => {
    const compare = (a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
      return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    };
    const sorted = [...filteredStudents].sort(compare);
    return order === 'asc' ? sorted : sorted.reverse();
  }, [filteredStudents, order, orderBy]);

  const headers = [
    { id: 'studentID', label: 'STUDENT ID' },
    { id: 'studentName', label: 'FULL NAME' },
    { id: 'semester', label: 'SEMESTER' },
    { id: 'cgpa', label: 'CGPA' }
  ];

  return (
    <Box className="w-full bg-white rounded-md p-2">
      <Box className="flex justify-between items-center mb-4 gap-4">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by ID or Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          inputProps={{ style: { fontSize: 14 } }}
        />
      </Box>
      <TableContainer component={Paper} className="shadow-none border border-gray-200">
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {headers.map((col) => (
                <TableCell key={col.id} sx={{ color: 'white', fontWeight: 'bold', backgroundColor: '#1B3A6B', fontSize: '13px', py: 1.5 }}>
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : 'asc'}
                    onClick={() => handleRequestSort(col.id)}
                    sx={{ '&.MuiTableSortLabel-active': { color: 'white' }, '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#666', fontSize: '14px' }}>
                  No matching entries available.
                </TableCell>
              </TableRow>
            ) : (
              sortedStudents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((student) => {
                  const valCgpa = typeof student.cgpa === 'number' ? student.cgpa : null;
                  const isSem1 = student.semester === 1 || Number(student.semester) === 1;
                  const tagStyle = isSem1
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : (valCgpa == null
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : valCgpa < 2.0
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : valCgpa <= 2.1
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-green-50 text-green-700 border-green-200');

                  return (
                    <TableRow
                      hover
                      key={student._id || student.studentID}
                      onClick={() => onEdit?.(student)}
                      className="cursor-pointer transition-colors"
                      sx={{ '&:hover': { backgroundColor: '#f8fafc !important' } }}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') onEdit?.(student); }}
                    >
                      <TableCell sx={{ fontSize: '14px', py: 1.5 }}>{student.studentID}</TableCell>
                      <TableCell sx={{ fontSize: '14px', py: 1.5, fontWeight: '500' }}>{student.studentName}</TableCell>
                      <TableCell sx={{ fontSize: '14px', py: 1.5 }}>Semester {student.semester}</TableCell>
                      <TableCell sx={{ fontSize: '14px', py: 1.5 }}>
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-bold ${tagStyle}`}>
                          {student.semester === 1 || Number(student.semester) === 1 ? 'N/A' : (valCgpa != null ? valCgpa.toFixed(2) : 'N/A')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component="div"
        count={filteredStudents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '13px' } }}
      />
    </Box>
  );
};

export default StudentTable;