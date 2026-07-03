import React, { useState, useMemo } from 'react';
import { 
  User, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Award,
  Sparkles,
  Info
} from 'lucide-react';

const MOCK_MIGRATION_STUDENT = {
  name: 'Hamza Nabeel',
  sourceUniversity: 'NUST School of Electrical Engineering & Computer Science',
  sourceCgpa: 3.45,
  targetBatch: '2022',
  completedCourses: [
    { code: 'CS110', name: 'Introduction to Programming', credits: 4, matched: '', status: 'Pending' },
    { code: 'MATH101', name: 'Calculus I', credits: 3, matched: '', status: 'Pending' },
    { code: 'CS210', name: 'Object Oriented Programming Concepts', credits: 4, matched: '', status: 'Pending' },
    { code: 'HUM102', name: 'English Composition', credits: 3, matched: '', status: 'Pending' }
  ]
};

const LOCAL_AVAILABLE_COURSES = [
  { code: 'CS-101', name: 'Programming Fundamentals', credits: 4 },
  { code: 'CS-102', name: 'Calculus & Analytical Geometry', credits: 3 },
  { code: 'CS-201', name: 'Object Oriented Programming', credits: 4 },
  { code: 'CS-202', name: 'Discrete Structures', credits: 3 },
  { code: 'CS-301', name: 'Data Structures & Algorithms', credits: 4 }
];

export default function MigrationManager() {
  const [student, setStudent] = useState(MOCK_MIGRATION_STUDENT);
  
  // Track selected local matches
  const [mappings, setMappings] = useState({
    'CS110': '',
    'MATH101': '',
    'CS210': '',
    'HUM102': ''
  });

  // Track statuses of evaluations
  const [statuses, setStatuses] = useState({
    'CS110': 'Pending',
    'MATH101': 'Pending',
    'CS210': 'Pending',
    'HUM102': 'Pending'
  });

  const handleMatchChange = (sourceCode, localCode) => {
    setMappings(prev => ({ ...prev, [sourceCode]: localCode }));
    if (localCode) {
      setStatuses(prev => ({ ...prev, [sourceCode]: 'Approved' }));
    } else {
      setStatuses(prev => ({ ...prev, [sourceCode]: 'Pending' }));
    }
  };

  const handleReject = (sourceCode) => {
    setMappings(prev => ({ ...prev, [sourceCode]: '' }));
    setStatuses(prev => ({ ...prev, [sourceCode]: 'Rejected' }));
  };

  // Recalculate credit mapping results dynamically (FR-2.6, UI-8)
  const statistics = useMemo(() => {
    let acceptedCredits = 0;
    let rejectedCredits = 0;
    let totalCreditsChecked = 0;

    student.completedCourses.forEach(c => {
      totalCreditsChecked += c.credits;
      const status = statuses[c.code];
      if (status === 'Approved') {
        acceptedCredits += c.credits;
      } else if (status === 'Rejected') {
        rejectedCredits += c.credits;
      }
    });

    const completionRate = totalCreditsChecked > 0 ? (acceptedCredits / totalCreditsChecked) * 100 : 0;

    return {
      acceptedCredits,
      rejectedCredits,
      totalCreditsChecked,
      completionRate: Math.round(completionRate)
    };
  }, [student, mappings, statuses]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-brandNavy font-display">Migration Manager</h1>
        <p className="text-slate-500 text-sm">Review credit transfers and evaluate course equivalency matching for migration students.</p>
      </div>

      {/* Recalculation Results Progress Bar Summary (FR-2.6, UI-8) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Info className="h-4 w-4 text-brandAccent" />
              Equivalency Recalculation Preview
            </span>
            <span className="text-brandNavy font-extrabold">{statistics.acceptedCredits} of {statistics.totalCreditsChecked} CH Accepted ({statistics.completionRate}%)</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
            <div 
              style={{ width: `${statistics.completionRate}%` }}
              className="h-full bg-brandNavy transition-all duration-500" 
              title="Accepted Credits"
            />
            {/* Split for Rejected credits */}
            <div 
              style={{ width: `${(statistics.rejectedCredits / statistics.totalCreditsChecked) * 100}%` }}
              className="h-full bg-alertCritical/40 transition-all duration-500 border-l border-white"
              title="Rejected Credit Loss"
            />
          </div>
          
          <div className="flex gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-brandNavy inline-block" /> Accepted Integration</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-alertCritical/40 inline-block" /> Rejected / Credit Loss</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-slate-200 inline-block" /> Pending Evaluation</span>
          </div>
        </div>

        {/* Big Percentage box */}
        <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center items-center text-center shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equivalency Score</span>
          <div className="text-3xl font-extrabold text-brandNavy font-display mt-0.5">{statistics.completionRate}%</div>
          <span className="text-xs text-slate-500 mt-1 font-semibold">Net Credit Hour Ingestion</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Migration Student Profile Details (FR-2.5) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-brandAccent" />
              <h2 className="text-lg font-bold text-slate-800">Migration Applicant</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <h3 className="font-extrabold text-slate-900 leading-tight">{student.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brandAccent/5 text-brandAccent border border-brandAccent/10 uppercase tracking-wider inline-block mt-2">
                  Applying for CS Batch {student.targetBatch}
                </span>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source University</span>
                  <span className="font-medium text-slate-700 leading-snug">{student.sourceUniversity}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Previous CGPA</span>
                    <span className="font-extrabold text-slate-700 flex items-center gap-1 text-sm mt-0.5">
                      <Award className="h-4 w-4 text-yellow-500" />
                      {student.sourceCgpa.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Credits</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">14 CH (4 courses)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advisory Info box */}
            <div className="bg-gradient-to-tr from-brandNavy to-brandAccent text-white p-5 rounded-2xl relative overflow-hidden shadow-md">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-15 pointer-events-none">
                <Sparkles className="h-24 w-24" />
              </div>
              <h4 className="font-extrabold text-sm flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-4 w-4" />
                Equivalency Checklist Rule
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Courses require at least 80% syllabus match and a minimum grade of "C" to transfer credits. Rejected courses are marked as credit loss.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Course Matcher Workspace (FR-2.5, UI-1, UI-6) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brandAccent" />
              <h2 className="text-lg font-bold text-slate-800">Equivalency Workspace</h2>
            </div>

            <div className="space-y-4">
              {student.completedCourses.map((c) => {
                const status = statuses[c.code];
                const matchedCode = mappings[c.code];
                
                return (
                  <div 
                    key={c.code} 
                    className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 grid md:grid-cols-12 gap-4 items-center hover:border-slate-300 transition-colors shadow-sm"
                  >
                    {/* Left: Source Course Info */}
                    <div className="md:col-span-5 space-y-1">
                      <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">{c.code} ({c.credits} CH)</span>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug">{c.name}</h4>
                    </div>

                    {/* Middle: Match visual indicator */}
                    <div className="md:col-span-1 flex justify-center text-slate-400">
                      <ChevronRight className="h-5 w-5 rotate-90 md:rotate-0" />
                    </div>

                    {/* Right: Local Course Dropdown & Action Buttons */}
                    <div className="md:col-span-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <select 
                          value={matchedCode}
                          onChange={(e) => handleMatchChange(c.code, e.target.value)}
                          className="flex-1 py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brandAccent text-slate-700 bg-white"
                        >
                          <option value="">Match local course...</option>
                          {LOCAL_AVAILABLE_COURSES.map(local => (
                            <option key={local.code} value={local.code}>{local.code} - {local.name} ({local.credits} CH)</option>
                          ))}
                        </select>

                        <button 
                          onClick={() => handleReject(c.code)}
                          className={`p-1.5 rounded-lg border focus:outline-none transition-all ${
                            status === 'Rejected'
                              ? 'bg-alertCritical/10 border-alertCritical/30 text-alertCritical'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-alertCritical hover:bg-slate-50'
                          }`}
                          title="Mark Credit Loss"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Matching Status Info Badge (UI-6) */}
                      {status === 'Approved' && (
                        <div className="flex items-center gap-1 text-[11px] text-alertGood font-bold uppercase tracking-wider">
                          <CheckCircle className="h-3.5 w-3.5" /> Equivalent to {matchedCode}
                        </div>
                      )}
                      {status === 'Rejected' && (
                        <div className="flex items-center gap-1 text-[11px] text-alertCritical font-bold uppercase tracking-wider">
                          <XCircle className="h-3.5 w-3.5" /> Credit Loss (No Match)
                        </div>
                      )}
                      {status === 'Pending' && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          <HelpCircle className="h-3.5 w-3.5 animate-pulse" /> Pending Evaluation
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Complete evaluation action button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                type="button"
                className="py-2 px-6 bg-brandNavy text-white hover:bg-brandNavy/95 font-bold rounded-lg text-sm focus:outline-none transition-colors shadow-sm shadow-brandNavy/10"
              >
                Submit Migration Audit
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
