import React from "react";
import { Layers } from "lucide-react";

export default function CreditHourMeter({ currentCredits = 0, requestedCredits = 0, maxCredits = 18 }) {
    const totalProjected = currentCredits + requestedCredits;
    const isOverLimit = totalProjected > maxCredits;

    return (
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-brandNavy pb-1 border-b border-slate-100">
                <Layers className="w-4 h-4 text-brandAccent" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Credit Load Threshold</h3>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Current Registered Load:</span>
                    <span className="text-slate-900 font-bold">{currentCredits} CH</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Requested Course Increment:</span>
                    <span className="text-brandAccent font-bold">+{requestedCredits} CH</span>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1 flex">
                    <div
                        style={{ width: `${Math.min((currentCredits / maxCredits) * 100, 100)}%` }}
                        className="bg-brandNavy h-full"
                    />
                    <div
                        style={{ width: `${Math.min((requestedCredits / maxCredits) * 100, 100)}%` }}
                        className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-brandAccent'}`}
                    />
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Cap Limit: {maxCredits} CH</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOverLimit ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        Projected Total: {totalProjected} CH
                    </span>
                </div>
            </div>
        </div>
    );
}