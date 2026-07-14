import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Grid } from '@mui/material';

const StudentModal = ({ open, onClose, studentData, onSave, canEdit = false }) => {
  const [form, setForm] = useState({
    studentID: '',
    studentName: '',
    email: '',
    semester: '',
    cgpa: '',
    batch: ''
  });

  useEffect(() => {
    if (studentData) {
      setForm({
        studentID: studentData.studentID || '',
        studentName: studentData.studentName || '',
        email: studentData.email || '',
        semester: studentData.semester || '',
        cgpa: studentData.cgpa !== undefined && studentData.cgpa !== null ? studentData.cgpa : '',
        batch: studentData.batch || ''
      });
    } else {
      setForm({ studentID: '', studentName: '', email: '', semester: '', cgpa: '', batch: '' });
    }
  }, [studentData, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { borderRadius: '16px', padding: '8px' } }}>
      <DialogTitle sx={{ fontWeight: 'bold', color: '#1B3A6B', fontSize: '20px' }}>
        {studentData ? 'Modify Profile Record' : 'Register New Student'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField label="Student Registration ID" name="studentID" fullWidth required disabled={!!studentData || !canEdit} value={form.studentID} onChange={handleChange} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Academic Enrollment Batch" name="batch" placeholder="e.g. BSCS-2023" fullWidth required disabled={!canEdit} value={form.batch} onChange={handleChange} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Full Student Name" name="studentName" fullWidth required disabled={!canEdit} value={form.studentName} onChange={handleChange} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Institutional Email" name="email" type="email" fullWidth required disabled={!canEdit} value={form.email} onChange={handleChange} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Current Term Semester" name="semester" type="number" inputProps={{ min: 1, max: 8 }} fullWidth required disabled={!canEdit} value={form.semester} onChange={handleChange} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Current Cumulative CGPA" name="cgpa" type="number" inputProps={{ step: '0.01', min: 0, max: 4 }} placeholder="Leave blank if N/A" fullWidth disabled={!canEdit} value={form.cgpa} onChange={handleChange} size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b', fontWeight: '600' }}>Cancel</Button>
          {canEdit && (
            <Button type="submit" variant="contained" sx={{ textTransform: 'none', backgroundColor: '#1B3A6B', '&:hover': { backgroundColor: '#2E75B6' }, fontWeight: '600', px: 3, borderRadius: '8px' }}>
              Commit Changes
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentModal;