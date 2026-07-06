import React, { useState } from 'react';
// Swapped out MUI for Lucide icons which are already fully installed in your project
import {
    Users,
    Clock,
    CheckCircle2,
    ExternalLink,
    AlertTriangle,
    X
} from 'lucide-react';

// YOUR 3 CORE VALIDATION COMPONENTS (Imported from your folder structure)
import PrerequisiteCheck from '../../components/ApprovalWorkflow/PrerequisiteCheck';
import CreditHourMeter from '../../components/ApprovalWorkflow/CreditHourMeter';
import DuplicateWarning from '../../components/ApprovalWorkflow/DuplicateWarning';

const INITIAL_ADVISOR_DATA = [
    {
        id: "REQ-2026-001",
        studentName: "Muhammad Qasim",
        rollNo: "BSCS-23S-0092",
        cgpa: "3.72",
        type: "Course Add",
        courseCode: "CS-402",
        courseName: "Artificial Intelligence",
        courseCredits: 3,
        status: "Pending Advisor",
        validations: {
            currentCredits: 15,
            maxCredits: 18,
            hasDuplicate: false,
            prerequisites: [
                { courseCode: "CS-201", courseName: "Data Structures", isPassed: true },
                { courseCode: "MA-202", courseName: "Linear Algebra", isPassed: true }
            ]
        }
    },
    {
        id: "REQ-2026-002",
        studentName: "Subhan Mehmood",
        rollNo: "BSCS-23S-0098",
        cgpa: "2.45",
        type: "Course Add",
        courseCode: "CS-409",
        courseName: "Cloud Computing",
        courseCredits: 4,
        status: "Pending Advisor",
        validations: {
            currentCredits: 16,
            maxCredits: 18,
            hasDuplicate: true,
            prerequisites: [
                { courseCode: "CS-302", courseName: "Operating Systems", isPassed: false }
            ]
        }
    }
];

export default function AdvisorQueue() {
    const [requests, setRequests] = useState(INITIAL_ADVISOR_DATA);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRowClick = (req) => {
        setSelectedRequest(req);
        setIsModalOpen(true);
    };

    const handleActionResolution = (id, newStatus) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        setIsModalOpen(false);
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Top Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-brandNavy">Workflow Requests Center</h1>
                        <p className="text-xs text-slate-500">Manage, evaluate, and route course adjustments for your assigned batch.</p>
                    </div>
                </div>

                {/* Dynamic Metric Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Actions Assigned</p>
                            <h3 className="text-2xl font-bold text-brandNavy mt-1">{requests.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-brandAccent rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Advisor Review</p>
                            <h3 className="text-2xl font-bold text-alertWarning mt-1">
                                {requests.filter(r => r.status === 'Pending Advisor').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-alertWarning rounded-xl">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved This Cycle</p>
                            <h3 className="text-2xl font-bold text-alertGood mt-1">
                                {requests.filter(r => r.status === 'Approved' || r.status === 'Forwarded to HOD').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-alertGood rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area / Worklist Pipeline Grid */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-brandNavy uppercase tracking-wide">Active Enrollment Pipeline Requests</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="p-4">Request ID</th>
                                    <th className="p-4">Student Particulars</th>
                                    <th className="p-4">Request Category</th>
                                    <th className="p-4">Target Course Module</th>
                                    <th className="p-4">Routing State</th>
                                    <th className="p-4 text-center">Execution Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="p-4 font-bold text-brandNavy">{req.id}</td>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-semibold text-slate-900">{req.studentName}</p>
                                                <p className="text-[11px] text-slate-400">{req.rollNo} • CGPA: {req.cgpa}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${req.type === 'Course Add' ? 'bg-blue-50 text-brandAccent' : 'bg-amber-50 text-alertWarning'}`}>
                                                {req.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-900">{req.courseCode}</span>
                                            <span className="block text-[11px] text-slate-400 font-normal">{req.courseName}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border text-[10px] ${req.status === 'Pending Advisor' ? 'bg-amber-50 text-alertWarning border-alertWarning/20' :
                                                    req.status === 'Approved' ? 'bg-emerald-50 text-alertGood border-alertGood/20' : 'bg-blue-50 text-brandAccent border-brandAccent/20'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleRowClick(req)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brandNavy hover:bg-brandNavy/95 text-white font-semibold rounded-lg shadow-sm transition-all text-[11px] cursor-pointer"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Evaluate Request
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BRANCH INDEPENDENT EVALUATION MODAL CONTAINER */}
                {isModalOpen && selectedRequest && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

                            {/* Modal Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-base font-bold text-brandNavy">{selectedRequest.id} Evaluation Control</h2>
                                    <p className="text-xs text-slate-400">{selectedRequest.studentName} ({selectedRequest.rollNo})</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body - Embedding your 3 components */}
                            <div className="p-6 space-y-5 flex-1">
                                <DuplicateWarning
                                    hasDuplicate={selectedRequest.validations.hasDuplicate}
                                    courseCode={selectedRequest.courseCode}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <PrerequisiteCheck prerequisites={selectedRequest.validations.prerequisites} />
                                    <CreditHourMeter
                                        currentCredits={selectedRequest.validations.currentCredits}
                                        requestedCredits={selectedRequest.courseCredits}
                                        maxCredits={selectedRequest.validations.maxCredits}
                                    />
                                </div>
                            </div>

                            {/* Modal Action Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleActionResolution(selectedRequest.id, 'Approved')}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Approve Action
                                </button>
                                <button
                                    onClick={() => handleActionResolution(selectedRequest.id, 'Forwarded to HOD')}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-brandAccent hover:bg-brandAccent/95 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                                >
                                    <AlertTriangle className="w-4 h-4" /> Escalate to HOD
                                </button>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}