import React from "react";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";

export default function PrerequisiteCheck({ prerequisites = [] }) {
    return (
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-brandNavy pb-1 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-brandAccent" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Prerequisite Mapping Engine</h3>
            </div>

            <div className="space-y-2">
                {prerequisites.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">No prerequisites specified for this module.</p>
                ) : (
                    prerequisites.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                            <div>
                                <span className="text-xs font-bold text-slate-800">{course.courseCode}</span>
                                <span className="block text-[11px] text-slate-400 font-normal">{course.courseName}</span>
                            </div>
                            <div>
                                {course.isPassed ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                        <XCircle className="w-3.5 h-3.5" /> Deficient
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}