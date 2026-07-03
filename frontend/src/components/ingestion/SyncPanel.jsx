import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const SyncPanel = ({ sources = [], onSync, canManageSync = false }) => {
    return (
        <div className="w-full space-y-3 text-left">
            {sources.map((src) => (
                <div key={src.id} className="p-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between gap-4 shadow-sm">
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{src.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 border rounded bg-slate-50 text-slate-500 uppercase tracking-wider">
                                {src.type}
                            </span>
                            {src.lastSyncedAt && (
                                <span className="text-[10px] text-slate-400">
                                    Synced: {new Date(src.lastSyncedAt).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {src.status === 'connected' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-100 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-100 rounded-full">
                                <AlertCircle className="h-3 w-3" /> Inactive
                            </span>
                        )}
                        {canManageSync && (
                            <button
                                onClick={() => onSync?.(src.id)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                                title="Trigger Manual Synchronization Sync"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SyncPanel;