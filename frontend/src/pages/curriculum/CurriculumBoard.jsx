import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layers,
  AlertTriangle,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';

// Read-only degree-plan viewer for Batch Advisors.
//
// Curriculum management (add/edit/remove courses, new versions, assigning
// batches to a version) is an Administrator-only capability per the SRS
// role definitions, and is already enforced that way on the backend
// (`restrictTo('dean', 'academic_admin')` on the write endpoints). This
// page previously tried to let advisors add/delete courses directly, which
// could never actually succeed against the real API (wrong field names,
// and would have been blocked by RBAC even if the names were fixed). It's
// now a pure viewer: advisors can see their batch's degree pathway to
// guide students, but all edits happen through Admin's Curriculum
// Management screen.
export default function CurriculumBoard({ selectedBatch: selectedBatchProp }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(selectedBatchProp || '');
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const assignedBatchIds = user?.assignedBatchIds || [];
  const hasNoBatches = assignedBatchIds.length === 0;

  // Load the advisor's own assigned batches (for the picker), defaulting
  // to the first one if none is selected yet.
  useEffect(() => {
    const loadBatches = async () => {
      if (hasNoBatches) return;
      try {
        const res = await fetch('/api/batches');
        if (res.ok) {
          const data = await res.json();
          const allBatches = data.data || [];
          const mine = allBatches.filter(b => assignedBatchIds.includes(b._id));
          setBatches(mine);
          if (!selectedBatchId && mine.length > 0) {
            setSelectedBatchId(mine[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load assigned batches:', err);
      }
    };
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBatchProp) setSelectedBatchId(selectedBatchProp);
  }, [selectedBatchProp]);

  const fetchCurriculum = async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/curriculums/batch/${selectedBatchId}`);
      const data = await response.json();
      if (response.ok) {
        setCurriculum(data.data.curriculum || null);
      } else {
        setCurriculum(null);
        setError(data.message || 'Failed to load degree plan for this batch');
      }
    } catch (err) {
      setError('Network error loading degree plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId]);

  // Group courses by semester for display
  const groupedCourses = {};
  for (let i = 1; i <= 8; i++) groupedCourses[i] = [];
  (curriculum?.courses || []).forEach(c => {
    if (groupedCourses[c.semester]) groupedCourses[c.semester].push(c);
  });

  const totalCredits = (curriculum?.courses || []).reduce((sum, c) => sum + (c.creditHours || 0), 0);
  const selectedBatchObj = batches.find(b => b._id === selectedBatchId);

  if (hasNoBatches) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 font-medium">
        No batches are currently assigned to you.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brandNavy font-display">Degree Plan</h1>
          <p className="text-slate-500 text-sm">View the curriculum structure for your assigned batches. Course changes are managed by your department Administrator.</p>
        </div>

        {/* Batch Selection — only the advisor's own assigned batches */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="py-1.5 px-4 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-brandAccent text-brandNavy bg-white shadow-sm"
          >
            {batches.map(b => (
              <option key={b._id} value={b._id}>{b.name || b.code}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brandAccent" />
            <h2 className="text-lg font-bold text-slate-800">
              Degree Pathway — {selectedBatchObj?.name || selectedBatchObj?.code || '...'}
            </h2>
          </div>
          {curriculum && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <GraduationCap className="h-4 w-4 text-brandAccent" />
              v{curriculum.version} • {curriculum.courses?.length || 0} courses • {totalCredits} CH total
            </div>
          )}
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500 flex justify-center items-center gap-2">
              <CircularProgress size={16} className="text-brandAccent" />
              Loading degree plan...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-alertCritical flex justify-center items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : !curriculum || Object.keys(groupedCourses).every(sem => groupedCourses[sem].length === 0) ? (
            <div className="py-8 text-center text-sm text-slate-400 font-medium">
              No curriculum has been set up for this batch yet. Contact your department Administrator.
            </div>
          ) : (
            Object.keys(groupedCourses).map(sem => {
              const semesterCourses = groupedCourses[sem];
              if (semesterCourses.length === 0) return null;

              return (
                <div key={sem} className="relative pl-6 border-l-2 border-slate-100 space-y-3">
                  <div className="absolute top-1.5 left-[-6px] h-3.5 w-3.5 rounded-full bg-brandAccent border-4 border-white shadow-sm shadow-brandAccent/30" />

                  <h3 className="text-sm font-extrabold text-brandNavy flex items-center gap-2">
                    Semester {sem}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      {semesterCourses.reduce((acc, c) => acc + c.creditHours, 0)} Credit Hours
                    </span>
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {semesterCourses.map(course => (
                      <div
                        key={course.code}
                        className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 transition-colors flex flex-col justify-between shadow-sm"
                      >
                        <div className="space-y-2">
                          <span className="font-mono text-xs font-bold text-brandAccent bg-brandAccent/5 px-2 py-0.5 rounded border border-brandAccent/10 uppercase tracking-wide">
                            {course.code}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm leading-snug">{course.title}</h4>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-150 mt-3 text-xs text-slate-500 font-medium">
                          <span>Credits: {course.creditHours} CH</span>
                          {course.prerequisiteCourseIds && course.prerequisiteCourseIds.length > 0 ? (
                            <span className="flex items-center gap-1 text-slate-400 font-semibold">
                              Has Prereqs
                              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                          ) : (
                            <span className="text-slate-300">No Prereq</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}