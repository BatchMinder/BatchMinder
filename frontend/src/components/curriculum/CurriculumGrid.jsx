import React from 'react';

const CurriculumGrid = ({ curriculumData = [] }) => {
  if (curriculumData.length === 0) {
    return <div className="text-sm text-slate-400 py-4 text-center">No structural track mappings found.</div>;
  }

  return (
    <div className="w-full space-y-6 max-h-[400px] overflow-y-auto pr-1">
      {curriculumData.map((semData) => (
        <div key={semData.semester} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-200">
            <h4 className="text-xs font-extrabold text-white tracking-wider">SEMESTER TERM {semData.semester}</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {semData.courses.map((course) => (
              <div key={course.courseCode} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 border px-1.5 py-0.5 rounded text-slate-700 shrink-0">
                      {course.courseCode}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 truncate">{course.courseTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold px-2 py-0.5 border rounded-full bg-blue-50 text-blue-700 border-blue-100">
                    {course.creditHours} Cr. Hrs
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 border rounded-full ${course.courseType?.toLowerCase() === 'core' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                    }`}>
                    {course.courseType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CurriculumGrid;