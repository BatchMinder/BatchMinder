import React from "react";
import { AlertTriangle } from "lucide-react";

export default function DuplicateWarning({ hasDuplicate = false, courseCode = "" }) {
    if (!hasDuplicate) return null;

    return (
        <div className="p-4 bg-amber-50 border border-alertWarning/30 rounded-xl flex items-start gap-3 text-alertWarning animate-shake">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-alertWarning mt-0.5" />
            <div>
                <h4 className="text-xs font-bold uppercase tracking-wide">Duplicate Course Detected</h4>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-normal">
                    This student has already completed or registered for <strong className="text-slate-900">{courseCode}</strong> in a previous semester. Repeating this enrollment requires manual override clearance.
                </p>
            </div>
        </div>
    );
}