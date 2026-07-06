import React from 'react';
import { Calendar } from 'lucide-react';

const ProgressPreview = ({ progress }) => {
    if (!progress) return <div className="text-xs text-slate-400 py-4 text-center">No calculated logs run yet.</div>;

    const totalEarned = (progress.creditsCompleted || 0) + (progress.creditsTransferred || 0);
    const ratio = Math.min(100, Math.max(0, ((totalEarned / (progress.totalCreditsRequired || 130)) * 100)));

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left space-y-4">
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overall Degree Progress</span>
                    <span className="text-lg font-black text-slate-900 font-display">{ratio.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                    <div className="bg-slate-900 h-full transition-all duration-500 rounded-full" style={{ width: `${ratio}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-50/50 border border-slate-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Total Credits Earned</span>
                    <span className="text-lg font-black text-slate-800 font-display">{totalEarned} / {progress.totalCreditsRequired}</span>
                </div>
                <div className="p-2.5 bg-slate-50/50 border border-slate-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Exemptions Processed</span>
                    <span className="text-lg font-black text-green-700 font-display">+{progress.creditsTransferred || 0} Cr</span>
                </div>
                <div className="p-2.5 bg-slate-50/50 border border-slate-200/60 rounded-lg col-span-2 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Credit Deficiency Loss</span>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">Rejected course configurations</p>
                    </div>
                    <span className="text-lg font-black text-red-600 font-display">{progress.creditsLost || 0} Cr</span>
                </div>
            </div>

            {progress.recalculatedAt && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <Calendar className="h-3 w-3" /> System Tracking Sync: {new Date(progress.recalculatedAt).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

export default ProgressPreview;