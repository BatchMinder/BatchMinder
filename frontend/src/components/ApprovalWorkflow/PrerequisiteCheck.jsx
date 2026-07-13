import React from "react";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";

export default function PrerequisiteCheck({ prerequisites = [], cgpa = 0 }) {
    const minCgpa = 2.00;
    const cgpaSatisfied = Number(cgpa) >= minCgpa;

    return (
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 tracking-wide pb-1 border-b border-slate-100">Prerequisite Validation:</h3>

            <div className="space-y-2">
                {prerequisites.length === 0 ? (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">No course prerequisites specified</span>
                        <span className="text-xs font-bold text-emerald-600">N/A</span>
                    </div>
                ) : (
                    prerequisites.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <span className="text-[12px] text-slate-700 font-medium">
                                {course.courseCode} ({course.courseTitle})
                            </span>
                            <span className={`text-[12px] font-bold ${course.status === 'Completed' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {course.status}
                            </span>
                        </div>
                    ))
                )}
                
                <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] text-slate-700 font-medium">
                        CGPA Requirement (Min: {minCgpa.toFixed(2)})
                    </span>
                    <span className={`text-[12px] font-bold ${cgpaSatisfied ? 'text-emerald-600' : 'text-red-500'}`}>
                        {cgpaSatisfied ? `Satisfied (${Number(cgpa).toFixed(2)})` : `Deficient (${Number(cgpa).toFixed(2)})`}
                    </span>
                </div>
            </div>
        </div>
    );
}