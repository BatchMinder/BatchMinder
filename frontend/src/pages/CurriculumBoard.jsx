import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const MOCK_CURRICULUM = {
  '2022': [
    { code: 'CS-101', name: 'Programming Fundamentals', credits: 4, semester: 1, prereq: 'None' },
    { code: 'CS-102', name: 'Calculus & Analytical Geometry', credits: 3, semester: 1, prereq: 'None' },
    { code: 'CS-201', name: 'Object Oriented Programming', credits: 4, semester: 2, prereq: 'CS-101' },
    { code: 'CS-202', name: 'Discrete Structures', credits: 3, semester: 2, prereq: 'None' },
    { code: 'CS-301', name: 'Data Structures & Algorithms', credits: 4, semester: 3, prereq: 'CS-201' },
    { code: 'CS-302', name: 'Database Systems', credits: 4, semester: 3, prereq: 'CS-201' },
    { code: 'CS-401', name: 'Operating Systems', credits: 4, semester: 4, prereq: 'CS-301' },
    { code: 'CS-402', name: 'Software Engineering', credits: 3, semester: 4, prereq: 'None' }
  ],
  '2023': [
    { code: 'CS-101', name: 'Programming Fundamentals', credits: 4, semester: 1, prereq: 'None' },
    { code: 'CS-103', name: 'Introduction to ICT', credits: 3, semester: 1, prereq: 'None' },
    { code: 'CS-201', name: 'Object Oriented Programming', credits: 4, semester: 2, prereq: 'CS-101' },
    { code: 'CS-301', name: 'Data Structures & Algorithms', credits: 4, semester: 3, prereq: 'CS-201' }
  ],
  '2024': [
    { code: 'CS-101', name: 'Programming Fundamentals', credits: 4, semester: 1, prereq: 'None' },
    { code: 'CS-104', name: 'Applied Physics', credits: 3, semester: 1, prereq: 'None' }
  ]
};

export default function CurriculumBoard() {
  const [selectedBatch, setSelectedBatch] = useState('2022');
  const [courses, setCourses] = useState(MOCK_CURRICULUM);
  
  // Form Input States
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credits, setCredits] = useState('3');
  const [semester, setSemester] = useState('1');
  const [prereq, setPrereq] = useState('None');

  // Input Validation Errors (UI-5)
  const [errors, setErrors] = useState({
    courseCode: '',
    courseName: '',
    credits: ''
  });

  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'courseCode') {
      if (!value) {
        errorMsg = 'Course Code is required.';
      } else if (!/^[A-Z]{2,3}-\d{3}$/.test(value)) {
        errorMsg = 'Course Code must match department pattern (e.g. CS-201).';
      }
    } else if (field === 'courseName') {
      if (!value) {
        errorMsg = 'Course Name is required.';
      } else if (value.trim().length < 3) {
        errorMsg = 'Course Name must be at least 3 characters.';
      }
    } else if (field === 'credits') {
      const num = Number(value);
      if (isNaN(num) || num < 1 || num > 4) {
        errorMsg = 'Credit Hours must be between 1 and 4.';
      }
    }
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    
    // Check all fields
    validateField('courseCode', courseCode);
    validateField('courseName', courseName);
    validateField('credits', credits);

    if (!courseCode || errors.courseCode || !courseName || errors.courseName || errors.credits) {
      return;
    }

    const newCourse = {
      code: courseCode.trim().toUpperCase(),
      name: courseName.trim(),
      credits: Number(credits),
      semester: Number(semester),
      prereq: prereq
    };

    setCourses(prev => ({
      ...prev,
      [selectedBatch]: [...prev[selectedBatch], newCourse]
    }));

    // Reset Form
    setCourseCode('');
    setCourseName('');
    setCredits('3');
    setSemester('1');
    setPrereq('None');
  };

  const handleDeleteCourse = (codeToDelete) => {
    setCourses(prev => ({
      ...prev,
      [selectedBatch]: prev[selectedBatch].filter(course => course.code !== codeToDelete)
    }));
  };

  // Group current batch courses by Semester
  const groupedCourses = useMemo(() => {
    const currentBatchCourses = courses[selectedBatch] || [];
    const semesters = {};
    for (let i = 1; i <= 8; i++) {
      semesters[i] = [];
    }
    currentBatchCourses.forEach(course => {
      if (semesters[course.semester]) {
        semesters[course.semester].push(course);
      }
    });
    return semesters;
  }, [courses, selectedBatch]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brandNavy font-display">Curriculum Version Board</h1>
          <p className="text-slate-500 text-sm">Define degree pathways, batch templates, and course prerequisite constraints.</p>
        </div>
        
        {/* Batch Selection */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">Active Curriculum:</span>
          <select 
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="py-1.5 px-4 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-brandAccent text-brandNavy bg-white shadow-sm"
          >
            <option value="2022">CS Batch 2022</option>
            <option value="2023">CS Batch 2023</option>
            <option value="2024">CS Batch 2024</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Columns: Visual Curriculum Semesters Tree (UI-1, UI-2) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-brandAccent" />
              <h2 className="text-lg font-bold text-slate-800">Degree Pathway Structure (CS Batch {selectedBatch})</h2>
            </div>

            {/* Curriculum grid list */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {Object.keys(groupedCourses).map(sem => {
                const semesterCourses = groupedCourses[sem];
                if (semesterCourses.length === 0 && Number(sem) > 4) return null; // Hide empty upper semesters
                
                return (
                  <div key={sem} className="relative pl-6 border-l-2 border-slate-100 space-y-3">
                    {/* Visual Connector Dot */}
                    <div className="absolute top-1.5 left-[-6px] h-3.5 w-3.5 rounded-full bg-brandAccent border-4 border-white shadow-sm shadow-brandAccent/30" />
                    
                    <h3 className="text-sm font-extrabold text-brandNavy flex items-center gap-2">
                      Semester {sem}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        {semesterCourses.reduce((acc, c) => acc + c.credits, 0)} Credit Hours
                      </span>
                    </h3>

                    {semesterCourses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No courses mapped to this semester yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {semesterCourses.map(course => (
                          <div 
                            key={course.code} 
                            className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 transition-colors flex flex-col justify-between group shadow-sm"
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-xs font-bold text-brandAccent bg-brandAccent/5 px-2 py-0.5 rounded border border-brandAccent/10 uppercase tracking-wide">
                                  {course.code}
                                </span>
                                <button 
                                  onClick={() => handleDeleteCourse(course.code)}
                                  className="text-slate-400 hover:text-alertCritical p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition-all opacity-0 group-hover:opacity-100 focus:outline-none"
                                  title="Remove Course"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm leading-snug">{course.name}</h4>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-150 mt-3 text-xs text-slate-500 font-medium">
                              <span>Credits: {course.credits} CH</span>
                              {course.prereq !== 'None' ? (
                                <span className="flex items-center gap-1 text-slate-400 font-semibold" title={`Requires ${course.prereq}`}>
                                  Prereq: <strong className="text-slate-600 font-bold">{course.prereq}</strong>
                                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                </span>
                              ) : (
                                <span className="text-slate-300">No Prereq</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Columns: Add Course Form (FR-2.4, UI-5) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brandAccent" />
              <h2 className="text-lg font-bold text-slate-800">Add Course Template</h2>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4">
              
              {/* Course Code Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Course Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. CS-201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  onBlur={() => validateField('courseCode', courseCode)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold uppercase focus:outline-none transition-colors text-slate-800 placeholder-slate-400 ${
                    errors.courseCode ? 'border-alertCritical focus:border-alertCritical' : 'border-slate-200 focus:border-brandAccent'
                  }`}
                />
                {errors.courseCode && (
                  <p className="text-xs font-medium text-alertCritical flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.courseCode}
                  </p>
                )}
              </div>

              {/* Course Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Course Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Object Oriented Programming"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  onBlur={() => validateField('courseName', courseName)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors text-slate-800 placeholder-slate-400 ${
                    errors.courseName ? 'border-alertCritical focus:border-alertCritical' : 'border-slate-200 focus:border-brandAccent'
                  }`}
                />
                {errors.courseName && (
                  <p className="text-xs font-medium text-alertCritical flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.courseName}
                  </p>
                )}
              </div>

              {/* Credit Hours & Semester Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Credits (CH)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="4"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    onBlur={() => validateField('credits', credits)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors text-slate-800 ${
                      errors.credits ? 'border-alertCritical focus:border-alertCritical' : 'border-slate-200 focus:border-brandAccent'
                    }`}
                  />
                  {errors.credits && (
                    <p className="text-xs font-medium text-alertCritical flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {errors.credits}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Semester</label>
                  <select 
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brandAccent text-slate-700 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prerequisite course selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Prerequisite Course</label>
                <select 
                  value={prereq}
                  onChange={(e) => setPrereq(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brandAccent text-slate-700 bg-white"
                >
                  <option value="None">None (No prerequisites)</option>
                  {(courses[selectedBatch] || []).map(course => (
                    <option key={course.code} value={course.code}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="w-full py-2.5 px-4 bg-brandNavy text-white hover:bg-brandNavy/95 font-bold rounded-lg text-sm focus:outline-none transition-colors shadow-sm shadow-brandNavy/10 flex items-center justify-center gap-2 mt-4"
              >
                <Plus className="h-5 w-5" />
                Add Course to Batch
              </button>
            </form>
          </div>

          {/* AI Helper banner tip */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-brandNavy to-brandAccent text-white relative overflow-hidden shadow-md shadow-brandNavy/15">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 pointer-events-none">
              <Sparkles className="h-24 w-24" />
            </div>
            <h4 className="font-extrabold text-sm mb-1 flex items-center gap-1.5 font-display">
              <Sparkles className="h-4 w-4" />
              AI Prerequisite Auditor
            </h4>
            <p className="text-xs leading-relaxed text-blue-100">
              When adding courses, BatchMinder validates circular logic dependencies to prevent invalid pathway generation before saving.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
