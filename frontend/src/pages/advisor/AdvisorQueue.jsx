import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    Users,
    Clock,
    CheckCircle2,
    ExternalLink,
    AlertTriangle,
    X,
    Plus,
    Search,
    Check,
    AlertCircle
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

// YOUR 3 CORE VALIDATION COMPONENTS (Imported from your folder structure)
import PrerequisiteCheck from '../../components/ApprovalWorkflow/PrerequisiteCheck';
import CreditHourMeter from '../../components/ApprovalWorkflow/CreditHourMeter';
import DuplicateWarning from '../../components/ApprovalWorkflow/DuplicateWarning';

export default function AdvisorQueue() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Evaluate modal
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    // Request submission modal
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [studentsList, setStudentsList] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [creditHours, setCreditHours] = useState(3);
    const [requestType, setRequestType] = useState('add');
    const [justification, setJustification] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Fetch requests
    const fetchRequests = async (showRefresher = false) => {
        if (showRefresher) setRefreshing(true);
        try {
            const res = await fetch('/api/advisor/requests');
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setRequests(data.data.requests || []);
            }
        } catch (err) {
            console.error('Failed to fetch advisor workflow requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Search students for submission modal
    useEffect(() => {
        if (studentSearch.trim().length < 2) {
            setStudentsList([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearchingStudents(true);
            try {
                const res = await fetch(`/api/students?search=${encodeURIComponent(studentSearch.trim())}&limit=5`);
                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    // Filter to only allow students in the advisor's assigned batches
                    const advisorBatchIds = (user?.assignedBatchIds || []).map(id => id.toString());
                    const filtered = (data.data.students || []).filter(
                        s => advisorBatchIds.includes(s.batchId?._id?.toString() || s.batchId?.toString())
                    );
                    setStudentsList(filtered);
                }
            } catch (err) {
                console.error('Failed to search students:', err);
            } finally {
                setSearchingStudents(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [studentSearch, user]);

    const handleRowClick = (req) => {
        setSelectedRequest(req);
        setRemarks('');
        setActionError('');
        setIsModalOpen(true);
    };

    // Advisor decisions (Approve / Reject)
    const handleResolveAction = async (isApprove) => {
        if (!isApprove && (!remarks || remarks.trim() === '')) {
            setActionError('Remarks are required when rejecting a request.');
            return;
        }

        setActionError('');
        setActionLoading(true);

        try {
            const endpoint = isApprove 
                ? `/api/advisor/approve/${selectedRequest.id}`
                : `/api/advisor/reject/${selectedRequest.id}`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks: remarks.trim() }),
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setIsModalOpen(false);
                fetchRequests();
            } else {
                setActionError(data.message || `Failed to ${isApprove ? 'approve' : 'reject'} the request.`);
            }
        } catch (err) {
            setActionError('A network error occurred. Please try again.');
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    // Submit new request
    const handleSubmitRequest = async (e) => {
        e.preventDefault();

        if (!selectedStudent) {
            setSubmitError('Please select a student.');
            return;
        }
        if (!courseCode.trim() || !courseTitle.trim()) {
            setSubmitError('Please fill in course code and course title.');
            return;
        }

        setSubmitError('');
        setSubmitLoading(true);

        try {
            const res = await fetch('/api/advisor/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent._id,
                    courseCode: courseCode.trim().toUpperCase(),
                    courseTitle: courseTitle.trim(),
                    creditHours: Number(creditHours),
                    requestType,
                    justification: justification.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setShowSubmitModal(false);
                // Clear state
                setSelectedStudent(null);
                setCourseCode('');
                setCourseTitle('');
                setCreditHours(3);
                setRequestType('add');
                setJustification('');
                fetchRequests();
            } else {
                setSubmitError(data.message || 'Failed to submit request.');
            }
        } catch (err) {
            setSubmitError('A network error occurred. Please try again.');
            console.error(err);
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Top Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-brandNavy">Workflow Requests Center</h1>
                        <p className="text-xs text-slate-500">Manage, evaluate, and route course adjustments for your assigned batches.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchRequests(true)}
                            disabled={refreshing}
                            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                            <span>Sync Queue</span>
                        </button>
                        <button
                            onClick={() => {
                                setSubmitError('');
                                setShowSubmitModal(true);
                            }}
                            className="px-4 py-2 bg-brandNavy hover:bg-brandNavy/95 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-sm shadow-brandNavy/10"
                        >
                            <Plus className="w-3.5 h-3.5" /> Submit Request
                        </button>
                    </div>
                </div>

                {/* Metric Grid Cards */}
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
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Escalated to HOD</p>
                            <h3 className="text-2xl font-bold text-alertGood mt-1">
                                {requests.filter(r => r.status === 'Forwarded to HOD' || r.status === 'Approved').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-alertGood rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-brandNavy uppercase tracking-wide">Active Enrollment Pipeline Requests</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="p-4">Student Particulars</th>
                                    <th className="p-4">Request Category</th>
                                    <th className="p-4">Target Course</th>
                                    <th className="p-4">Routing State</th>
                                    <th className="p-4 text-center">Execution Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                                            Loading workflow queue...
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                                            No requests are currently waiting for review.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900">{req.studentName}</p>
                                                    <p className="text-[11px] text-slate-400">{req.rollNo} • CGPA: {req.cgpa}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                    req.type === 'Course Add' ? 'bg-blue-50 text-brandAccent' : 
                                                    req.type === 'Course Drop' ? 'bg-amber-50 text-alertWarning' : 'bg-rose-50 text-red-500'
                                                }`}>
                                                    {req.type}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-semibold text-slate-900">{req.courseCode}</span>
                                                <span className="block text-[11px] text-slate-400 font-normal">{req.courseName}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border text-[10px] ${
                                                    req.status === 'Pending Advisor' ? 'bg-amber-50 text-alertWarning border-alertWarning/20' :
                                                    req.status === 'Approved' || req.status.includes('Approved') ? 'bg-emerald-50 text-alertGood border-alertGood/20' : 
                                                    req.status.includes('Rejected') ? 'bg-rose-50 text-red-500 border-red-500/20' :
                                                    'bg-blue-50 text-brandAccent border-brandAccent/20'
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 📝 ADVISOR EVALUATION MODAL CONTAINER */}
                {isModalOpen && selectedRequest && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

                            {/* Modal Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-base font-bold text-brandNavy">Evaluation Control</h2>
                                    <p className="text-xs text-slate-400">{selectedRequest.studentName} ({selectedRequest.rollNo})</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
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

                                {/* Remarks Textarea */}
                                <div className="flex flex-col gap-1.5 pt-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                        Advisor Recommendation Remarks
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => {
                                            setRemarks(e.target.value);
                                            setActionError('');
                                        }}
                                        placeholder="Add recommendation remarks here... (Required for rejection)"
                                        className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 min-h-[70px] resize-y"
                                    />
                                </div>

                                {actionError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{actionError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Modal Action Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleResolveAction(false)}
                                    disabled={actionLoading}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={() => handleResolveAction(true)}
                                    disabled={actionLoading}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-brandAccent hover:bg-brandAccent/95 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Recommend & Escalate
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* 🆕 REQUEST SUBMISSION MODAL */}
                {showSubmitModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
                            
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-sm font-extrabold text-brandNavy uppercase tracking-wider">Log Course Adjustment Request</h2>
                                    <p className="text-xs text-slate-400">Advisor request logging on behalf of student.</p>
                                </div>
                                <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 flex-1">
                                {/* Student Search */}
                                <div className="flex flex-col gap-1.5 relative">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Search Student <span className="text-red-500">*</span>
                                    </label>
                                    
                                    {selectedStudent ? (
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800">{selectedStudent.name}</p>
                                                <p className="text-[10.5px] text-emerald-600">{selectedStudent.rollNumber} &bull; CGPA: {selectedStudent.cgpa.toFixed(2)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStudent(null)}
                                                className="text-xs font-bold text-emerald-800 hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="Type student name or roll number..."
                                                    value={studentSearch}
                                                    onChange={e => setStudentSearch(e.target.value)}
                                                    className="w-full text-xs pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                                                />
                                                {searchingStudents && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <CircularProgress size={12} />
                                                    </div>
                                                )}
                                            </div>

                                            {studentSearch.trim().length >= 2 && studentsList.length > 0 && (
                                                <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                    {studentsList.map(s => (
                                                        <div
                                                            key={s._id}
                                                            onClick={() => {
                                                                setSelectedStudent(s);
                                                                setStudentSearch('');
                                                                setStudentsList([]);
                                                            }}
                                                            className="p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-left"
                                                        >
                                                            <p className="text-xs font-bold text-slate-800">{s.name}</p>
                                                            <p className="text-[10px] text-slate-500">{s.rollNumber} &bull; CGPA: {s.cgpa.toFixed(2)} &bull; Sem: {s.currentSemester}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Request Type */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Request Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={requestType}
                                        onChange={e => setRequestType(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="add">Course Add</option>
                                        <option value="drop">Course Drop</option>
                                        <option value="withdrawal">Course Withdrawal</option>
                                    </select>
                                </div>

                                {/* Course Code & Credit Hours */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                            Course Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CS201"
                                            value={courseCode}
                                            onChange={e => setCourseCode(e.target.value)}
                                            required
                                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                            Credit Hours <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={creditHours}
                                            onChange={e => setCreditHours(Number(e.target.value))}
                                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                                        >
                                            <option value={1}>1 Credit Hour</option>
                                            <option value={2}>2 Credit Hours</option>
                                            <option value={3}>3 Credit Hours</option>
                                            <option value={4}>4 Credit Hours</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Course Title */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Course Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Software Engineering"
                                        value={courseTitle}
                                        onChange={e => setCourseTitle(e.target.value)}
                                        required
                                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Justification */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Justification / Reason
                                    </label>
                                    <textarea
                                        placeholder="Explain the academic justification..."
                                        value={justification}
                                        onChange={e => setJustification(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 min-h-[50px]"
                                    />
                                </div>

                                {submitError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{submitError}</span>
                                    </div>
                                )}

                                {/* Form Action Buttons */}
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowSubmitModal(false)}
                                        disabled={submitLoading}
                                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitLoading}
                                        className="px-5 py-2 bg-brandNavy hover:bg-brandNavy/95 text-white font-semibold rounded-xl text-xs transition-all shadow-sm"
                                    >
                                        {submitLoading ? (
                                            <CircularProgress size={12} color="inherit" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5 inline mr-1" />
                                        )}
                                        <span>Submit Request</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}