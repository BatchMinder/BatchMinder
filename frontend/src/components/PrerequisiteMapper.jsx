import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const PrerequisiteMapper = ({ courses = [], completedCourseCodes = [] }) => {
    const compSet = new Set(completedCourseCodes.map(c => c.toLowerCase()));

    return (
        <div className="w-full space-y-3 text-left max-h-[300px] overflow-y-auto pr-1">
            {courses.map((course) => {
                const reqs = course.prerequisites || [];
                const absoluteCleared = reqs.every(pr => compSet.has(pr.toLowerCase()));

                return (
                    <div key={course.courseCode} className={`p-3 border rounded-xl shadow-sm ${absoluteCleared ? 'bg-white border-slate-200' : 'bg-red-50/30 border-red-100'
                        } flex flex-col justify-between gap-2`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <span className="font-mono text-[10px] font-bold bg-slate-100 border px-1.5 py-0.5 rounded text-slate-600">
                                    {course.courseCode}
                                </span>
                                <h4 className="text-sm font-bold text-slate-800 mt-1.5 truncate">{course.courseTitle}</h4>
                            </div>
                            <div className="shrink-0">
                                {absoluteCleared ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Eligible
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Locked
                                    </span>
                                )}
                            </div>
                        </div>
                        {reqs.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider block mb-1 uppercase">Required Course Mappings:</span>
                                <div className="flex flex-wrap gap-1">
                                    {reqs.map(pr => {
                                        const status = compSet.has(pr.toLowerCase());
                                        return (
                                            <span key={pr} className={`font-mono text-[10px] px-1.5 py-0.5 border rounded ${status ? 'bg-green-50/60 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
                                                }`}>
                                                {pr}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PrerequisiteMapper;