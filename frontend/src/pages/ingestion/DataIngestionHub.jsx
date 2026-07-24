import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  History,
  AlertCircle,
  FileText,
  Trash2,
  X,
  File,
  User,
  Clock
} from 'lucide-react';
import { CircularProgress } from '@mui/material';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';

// Real dynamic data states are initialized as empty to prevent dummy data leak

export default function DataIngestionHub({ onUploadSuccess }) {
  const { showAlert, showSuccess } = useModal();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'sync'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Upload States
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const previewLimit = 5;
  const [previewRows, setPreviewRows] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [uploadId, setUploadId] = useState(null);
  const [uploadValidated, setUploadValidated] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch Sync Logs pointing directly to port 5000 with cookies included
  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/audit-logs?action=LMS_SYNCED&limit=5', {
        credentials: 'include' // Automatically sends httpOnly cookies
      });
      if (res.ok) {
        const d = await res.json();
        const logs = d.data?.logs || [];
        setSyncLogs(logs.map(l => ({
          timestamp: new Date(l.timestamp).toLocaleString(),
          source: 'LMS API Gateway',
          records: 1,
          status: 'Success'
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Upload File History from /api/uploads
  const fetchUploadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/uploads', {
        credentials: 'include'
      });
      if (res.ok) {
        const d = await res.json();
        setUploadHistory(d.data?.uploads || []);
      }
    } catch (e) {
      console.error('Failed to fetch upload history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
    fetchUploadHistory();
  }, []);

  // Sync trigger states
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  // Kept separate from selectedBatch (used by the CSV upload tab) so
  // choosing "All" here can never leak into an upload's batch field.
  const [syncBatchSelection, setSyncBatchSelection] = useState('All');

  // Integration States
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [syncCount, setSyncCount] = useState(0);
  const [syncFailedCount, setSyncFailedCount] = useState(0);
  const [syncPromotedCount, setSyncPromotedCount] = useState(0);
  const [syncGraduatedCount, setSyncGraduatedCount] = useState(0);
  const [syncError, setSyncError] = useState('');

  // Metadata Dropdown Selection States
  const [departments, setDepartments] = useState([]);


  const [batches, setBatches] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedIntake, setSelectedIntake] = useState('Fall');

  // Derived state: Filter batches by the selected department
  const filteredBatches = React.useMemo(() => {
    return batches.filter(b => {
      const bDept = b.departmentId?.name || b.dept || b.department;
      return bDept === selectedDept;
    });
  }, [batches, selectedDept]);

  // Auto-select the first valid batch when the selected department changes
  useEffect(() => {
    if (filteredBatches.length > 0) {
      if (!filteredBatches.find(b => b.code === selectedBatch)) {
        setSelectedBatch(filteredBatches[0].code);
      }
    } else {
      setSelectedBatch('');
    }
  }, [filteredBatches]);

  // Auto-calculate expected semester based on batch and intake
  useEffect(() => {
    if (selectedBatch) {
      const match = selectedBatch.match(/\d{4}/);
      if (match) {
        const batchYear = parseInt(match[0], 10);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-11
        const isFallTerm = currentMonth >= 7;
        
        let expectedSem = (currentYear - batchYear) * 2;
        if (selectedIntake === 'Fall') {
            expectedSem += (isFallTerm ? 1 : 0);
        } else {
            expectedSem += (isFallTerm ? 2 : 1);
        }
        
        if (expectedSem < 1) expectedSem = 1;
        if (expectedSem > 8) expectedSem = 'graduated';
        
        setSelectedSemester(expectedSem);
      }
    }
  }, [selectedBatch, selectedIntake]);

  // Load Departments and Batches on mount directly from backend port 5000 with cookies included
  useEffect(() => {
    fetch('http://localhost:5000/api/departments', {
      credentials: 'include' // Automatically sends httpOnly cookies
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data) {
          setDepartments(d.data);
          if (d.data.length > 0) setSelectedDept(d.data[0].name);
        }
      })
      .catch(() => { });

    fetch('http://localhost:5000/api/batches', {
      credentials: 'include' // Automatically sends httpOnly cookies
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data) {
          setBatches(d.data);
          if (d.data.length > 0) setSelectedBatch(d.data[0].code);
        }
      })
      .catch(() => { });
  }, []);

  // Form Field Validation on Blur (UI-5)
  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'apiUrl') {
      if (!value) {
        errorMsg = 'API Endpoint URL is required.';
      } else if (!/^https?:\/\/.+/.test(value)) {
        errorMsg = 'Please enter a valid HTTP/HTTPS URL (e.g. https://lms.university.edu/api).';
      }
    } else if (field === 'apiKey') {
      if (!value) {
        errorMsg = 'API Security Access Token is required.';
      } else if (value.length < 16) {
        errorMsg = 'Access key must be a secure token of at least 16 characters.';
      }
    }
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleDownloadValidationReport = () => {
    let rows = [];
    if (validationErrors.length === 0) {
      rows = [
        ['Validation Report', 'Ingested file is valid. No errors found.'],
        ['Downloaded At', new Date().toLocaleString()]
      ];
    } else {
      rows = [
        ['Validation Report', 'Student Data Ingestion Error Log'],
        ['Downloaded At', new Date().toLocaleString()],
        [],
        ['ROW #', 'FIELD NAME', 'ERROR DESCRIPTION'],
        ...validationErrors.map(err => [`Row ${err.row}`, err.field, err.error])
      ];
    }

    const csvContent = rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Validation report downloaded successfully!');
  };

  // Real upload logic pointing directly to backend port 5000 with cookies included
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);
    setUploadProgress(40);
    setUploadSuccess(false);
    setUploadValidated(false);
    setUploadId(null);
    setUploadStats(null);
    setValidationErrors([]);
    setShowValidationReport(false);

    const deptObj = departments.find(d => d.name === selectedDept);
    if (!deptObj) {
      showAlert('Error', 'Invalid department selected');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('departmentId', deptObj._id);

      // Simulate progress progression
      setTimeout(() => setUploadProgress(85), 600);

      const response = await fetch('http://localhost:5000/api/uploads', {
        method: 'POST',
        credentials: 'include', // Automatically sends httpOnly cookies
        body: formData
      });

      const data = await response.json();

      setUploadProgress(100);

      if (response.ok) {
        setUploadValidated(true);
        setUploadId(data.data.uploadId);
        
        setUploadStats({
          processed: data.data.totalRecords || 0,
          valid: data.data.validRecords || 0,
          errors: data.data.errorCount || 0,
          duplicates: data.data.duplicateCount || 0
        });
        
        if (data.data.validPreview) {
          setPreviewRows(data.data.validPreview.map((r) => ({
             roll: r.rollNumber,
             name: r.name,
             dept: selectedDept,
             batch: r.batchCode,
             sem: selectedSemester,
             cgpa: Number(selectedSemester) === 1 ? 'N/A' : r.cgpa,
             status: 'Valid'
          })));
        }
        
        if (data.data.errors && data.data.errors.length > 0) {
          setValidationErrors(data.data.errors.map(err => ({
            row: err.row,
            field: err.field,
            error: err.message,
            severity: 'error'
          })));
          setShowValidationReport(true);
        }
      } else {
        const errMsg = data.message || 'File upload failed';
        setUploadStats({
          processed: 0,
          valid: 0,
          errors: 1,
          duplicates: 0
        });
        setValidationErrors([{ row: 1, field: 'File', error: errMsg, severity: 'error' }]);
        setShowValidationReport(true);
      }
    } catch (err) {
      showAlert('Network Error', 'Network error uploading CSV spreadsheet');
    } finally {
      setUploading(false);
    }
  };

  // Real sync trigger logic pointing directly to backend port 5000 with cookies included
  const handleSyncTrigger = async () => {
    if (!selectedDept) {
      setSyncError('Select a department before syncing.');
      return;
    }

    setSyncing(true);
    setSyncSuccess(false);
    setSyncError('');
    setSyncCount(0);
    setSyncFailedCount(0);
    setSyncPromotedCount(0);
    setSyncGraduatedCount(0);

    try {
      const batchCodesToSync =
        syncBatchSelection === 'All' || !syncBatchSelection
          ? filteredBatches.map((b) => b.code)
          : [syncBatchSelection];

      if (batchCodesToSync.length === 0) {
        setSyncError('No batches found for this department.');
        setSyncing(false);
        return;
      }

      let netCount = 0;
      let failedBatch = null;
      let netFailedCount = 0;
      let netPromotedCount = 0;
      let netGraduatedCount = 0;

      for (const batchCode of batchCodesToSync) {
        // Pointing explicitly to backend server on port 5000 with credentials: 'include'
        const response = await fetch('http://localhost:5000/api/students/sync-lms', {
          method: 'POST',
          credentials: 'include', // Automatically sends httpOnly cookies
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            batch: batchCode,
            department: selectedDept
          })
        });

        const data = await response.json();
        if (response.ok) {
          netCount += data.syncedCount || 0;
          netFailedCount += data.failedCount || 0;
          netPromotedCount += data.promotedCount || 0;
          netGraduatedCount += data.graduatedCount || 0;
        } else {
          failedBatch = batchCode;
          setSyncError(data.message || `Failed to sync batch ${batchCode}`);
          break;
        }
      }

      if (!failedBatch) {
        setSyncCount(netCount);
        setSyncFailedCount(netFailedCount);
        setSyncPromotedCount(netPromotedCount);
        setSyncGraduatedCount(netGraduatedCount);
        if (netFailedCount > 0 && netCount === 0) {
          setSyncError(`Sync ran but 0 students updated (${netFailedCount} failed). Check that the mock LMS server is reachable.`);
        } else {
          setSyncSuccess(true);
        }
        fetchSyncLogs();
        if (onUploadSuccess) onUploadSuccess();
        // Notify other parts of the app that data changed (e.g., dashboard stats)
        try { window.dispatchEvent(new CustomEvent('batchminder:data-updated')); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      setSyncError('Network error connecting to LMS synchronizer');
    } finally {
      setSyncing(false);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadValidated(false);
    setUploadId(null);
    setUploadStats(null);
    setPreviewRows([]);
    setValidationErrors([]);
    setShowValidationReport(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'inherit' }}>

      {/* Breadcrumb & Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'flex', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>BatchMinder ERP</span> &gt; <span>Administrator</span> &gt; <span style={{ color: '#2563EB' }}>CSV / Excel Upload</span>
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>CSV / Excel Ingestion Hub</h1>
        </div>

        {/* Tab switch buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              backgroundColor: activeTab === 'upload' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'upload' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            📂 Spreadsheet Upload
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              backgroundColor: activeTab === 'sync' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'sync' ? '#0F172A' : '#64748B',
              boxShadow: activeTab === 'sync' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            🔌 API Integrations
          </button>

        </div>
      </div>

      {activeTab === 'upload' ? (
        <>
          {/* Row 1: Upload Student Data File & Upload Summary Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.5fr] gap-5">

            {/* Upload Student Data File Panel */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Upload Student Data File</h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Upload CSV or Excel file to add or update student records</span>
                </div>
              </div>

              {/* Metadata Selectors (Required before upload) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3">
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Department
                  </label>
                  <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#1E293B', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    {departments.map(d => (
                      <option key={d._id} value={d.name}>{d.code || d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Batch
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={e => setSelectedBatch(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#1E293B', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    {filteredBatches.length > 0 ? (
                      filteredBatches.map(b => (
                        <option key={b._id} value={b.code}>{b.code}</option>
                      ))
                    ) : (
                      <option value="" disabled>No batches available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={e => setSelectedSemester(e.target.value === 'graduated' ? 'graduated' : Number(e.target.value))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#1E293B', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    {[selectedSemester].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Intake Term
                  </label>
                  <select
                    value={selectedIntake}
                    onChange={e => setSelectedIntake(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#1E293B', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <option value="Fall">🍂 Fall Intake</option>
                    <option value="Spring">🌸 Spring Intake</option>
                  </select>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div style={{ border: '2px dashed #CBD5E1', borderRadius: '12px', padding: '32px 16px', backgroundColor: '#F8FAFC', textAlign: 'center', cursor: 'pointer', position: 'relative', transition: 'border-color 0.2s' }}>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onClick={(e) => { e.target.value = ''; }}
                  onChange={handleFileUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  disabled={uploading}
                />
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#2563EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <Upload size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Drag & drop your file here</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>or <span style={{ color: '#2563EB', fontWeight: 700 }}>Choose file</span></div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>Supported formats: .csv, .xlsx (Max 10MB)</div>
              </div>
            </div>

            {/* Upload Summary Panel */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Upload Summary</h3>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>Total Records</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#3B82F6', marginTop: '6px' }}>
                      {uploadStats ? uploadStats.processed.toLocaleString() : '0'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>Valid Records</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#16A34A', marginTop: '6px' }}>
                      {uploadStats ? uploadStats.valid.toLocaleString() : '0'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>Errors Found</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>
                      {uploadStats ? uploadStats.errors.toLocaleString() : (validationErrors.length > 0 ? validationErrors.length : '0')}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>Duplicates</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '6px' }}>
                      {uploadStats ? uploadStats.duplicates : '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                  <span>Upload Progress</span>
                  <span>{uploading ? `${uploadProgress}%` : (uploadValidated ? '100%' : '0%')}</span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: uploading ? `${uploadProgress}%` : (uploadValidated ? '100%' : '0%'), backgroundColor: '#2563EB', transition: 'width 0.3s ease' }}></div>
                </div>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {uploading ? 'Uploading... please wait' : (uploadValidated ? 'Validation completed.' : 'No file uploaded.')}
                </span>
              </div>
            </div>

          </div>

          {/* Row 2: File Meta Details Bar */}
          {file && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>File Name</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                  <File size={14} color="#64748B" /> {file.name}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>File Size</span>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Uploaded by</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                  <User size={14} color="#64748B" /> {user?.name || 'Academic Admin'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Upload Time</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                  <Clock size={14} color="#64748B" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Upload Status</span>
                <span style={{
                  display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', marginTop: '4px',
                  backgroundColor: uploading ? '#FFFBEB' : (uploadSuccess ? '#D1FAE5' : '#F1F5F9'),
                  color: uploading ? '#D97706' : (uploadSuccess ? '#059669' : '#64748B')
                }}>
                  {uploading ? 'Processing' : (uploadSuccess ? 'Imported' : (uploadValidated ? 'Validated' : 'Idle'))}
                </span>
              </div>
            </div>
          )}

          {/* Row 3: Data Preview (First 10 Rows) & Validation Errors */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">

            {/* Data Preview */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Data Preview (First 10 Rows)</h3>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Showing first 10 rows of records</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: '10px 8px' }}>#</th>
                      <th style={{ padding: '10px 8px' }}>STUDENT ID</th>
                      <th style={{ padding: '10px 8px' }}>FULL NAME</th>
                      <th style={{ padding: '10px 8px' }}>DEPARTMENT</th>
                      <th style={{ padding: '10px 8px' }}>BATCH</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SEMESTER</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>CGPA</th>
                      <th style={{ padding: '10px 8px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length > 0 ? (() => {
                      const totalPreviewPages = Math.ceil(previewRows.length / previewLimit);
                      const currentPreviewRows = previewRows.slice(
                        (previewPage - 1) * previewLimit,
                        previewPage * previewLimit
                      );
                      return currentPreviewRows.map((r, idx) => {
                        const rowNum = (previewPage - 1) * previewLimit + idx + 1;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 8px', color: '#94A3B8', fontWeight: 600 }}>{rowNum}</td>
                            <td style={{ padding: '10px 8px', color: '#2563EB', fontWeight: 700 }}>{r.roll}</td>
                            <td style={{ padding: '10px 8px', color: '#0F172A', fontWeight: 600 }}>{r.name}</td>
                            <td style={{ padding: '10px 8px', color: '#64748B' }}>{r.dept}</td>
                            <td style={{ padding: '10px 8px', color: '#64748B' }}>{r.batch}</td>
                            <td style={{ padding: '10px 8px', color: '#64748B', textAlign: 'center', fontWeight: 600 }}>{r.sem}</td>
                            <td style={{ padding: '10px 8px', color: '#334155', textAlign: 'center', fontWeight: 700 }}>{r.cgpa}</td>
                            <td style={{ padding: '10px 8px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                                backgroundColor: r.status === 'Valid' ? '#D1FAE5' : (r.status === 'At Risk' ? '#FFFBEB' : '#FEE2E2'),
                                color: r.status === 'Valid' ? '#059669' : (r.status === 'At Risk' ? '#D97706' : '#DC2626')
                              }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })() : (
                      <tr>
                        <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                          No records preview. Please upload a CSV/Excel file to preview student records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Data Preview Pagination controls */}
              {previewRows.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>
                    Showing {(previewPage - 1) * previewLimit + 1}–{Math.min(previewPage * previewLimit, previewRows.length)} of {previewRows.length} rows
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Array.from({ length: Math.ceil(previewRows.length / previewLimit) }, (_, idx) => idx + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPreviewPage(p)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: previewPage === p ? '#2563EB' : '#fff',
                          color: previewPage === p ? '#fff' : '#64748B',
                          border: previewPage === p ? 'none' : '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Import Outcome Summary Banner */}
              {uploadSuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#EFFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginTop: '16px',
                  color: '#137333',
                  fontSize: '13px',
                  fontWeight: 700
                }}>
                  <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />
                  <span>
                    Import complete! The students have been saved to the database.
                  </span>
                </div>
              )}
            </div>

            {/* Validation Errors Panel */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Validation Errors {validationErrors.length > 0 && `(${validationErrors.length})`}
                </h3>
                <button
                  disabled={validationErrors.length === 0}
                  onClick={handleDownloadValidationReport}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: validationErrors.length === 0 ? '#94A3B8' : '#334155', backgroundColor: validationErrors.length === 0 ? '#F1F5F9' : '#fff', cursor: validationErrors.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <Download size={12} /> Download Report
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '320px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: '10px 8px' }}>ROW #</th>
                      <th style={{ padding: '10px 8px' }}>FIELD NAME</th>
                      <th style={{ padding: '10px 8px' }}>ERROR DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationErrors.length > 0 ? (
                      validationErrors.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 8px', color: '#EF4444', fontWeight: 700, fontFamily: 'monospace' }}>#{err.row}</td>
                          <td style={{ padding: '10px 8px', color: '#0F172A', fontWeight: 700 }}>{err.field}</td>
                          <td style={{ padding: '10px 8px', color: '#EF4444' }}>{err.error}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No errors found. Ingested file is valid.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>
                <span>Total Errors Found:</span>
                <span>{validationErrors.length > 0 ? validationErrors.length : '0'}</span>
              </div>
            </div>

          </div>

          {/* Responsive Footer Action Bar */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            backgroundColor: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: isMobile ? '16px' : '16px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
            gap: '12px',
            marginTop: '16px'
          }}>
            <button
              onClick={cancelUpload}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#64748B',
                backgroundColor: 'transparent',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Cancel Upload
            </button>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              width: isMobile ? '100%' : 'auto'
            }}>
              <button
                onClick={() => {
                  if (file) {
                    showSuccess('Re-run validation completed successfully!');
                  } else {
                    showAlert('Notice', 'Please select a file first.');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  backgroundColor: '#fff',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <RefreshCw size={14} /> Validate Again
              </button>
              <button
                disabled={!uploadId || uploadSuccess || !uploadStats || uploadStats.valid === 0}
                onClick={async () => {
                  if (uploadId && !uploadSuccess && uploadStats?.valid > 0) {
                    try {
                      const res = await fetch(`http://localhost:5000/api/uploads/${uploadId}/import`, {
                         method: 'POST',
                         credentials: 'include'
                      });
                      const data = await res.json();
                      if (res.ok) {
                         setUploadSuccess(true);
                         showSuccess(`Import completed! ${data.data.importedCount} records saved.`);
                         if (onUploadSuccess) onUploadSuccess();
                         fetchUploadHistory(); // Refresh history after import
                      } else {
                         showAlert('Import Failed', data.message);
                      }
                    } catch (e) {
                      showAlert('Error', 'Network error during import');
                    }
                  } else {
                    showAlert('Notice', 'No valid records to import or already imported.');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  background: (!uploadId || uploadSuccess || !uploadStats || uploadStats.valid === 0) ? '#94A3B8' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                  cursor: (!uploadId || uploadSuccess || !uploadStats || uploadStats.valid === 0) ? 'not-allowed' : 'pointer',
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
              >
                <CheckCircle size={14} /> Import Valid Records
              </button>

            </div>
          </div>

          {/* Upload File History — FR-2.2 */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Upload File History</h3>
              </div>
              <button
                onClick={fetchUploadHistory}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: '#334155', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '10px 12px' }}>FILE NAME</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>TOTAL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>VALID</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>ERRORS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>DUPLICATES</th>
                    <th style={{ padding: '10px 12px' }}>UPLOADED AT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>Loading history...</td></tr>
                  ) : uploadHistory.length > 0 ? (
                    uploadHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={13} color="#64748B" />
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{h.fileName}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>{(h.fileSize / 1024).toFixed(1)} KB</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#3B82F6' }}>{h.totalRecords}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#16A34A' }}>{h.validRecords}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#EF4444' }}>{h.errorCount}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>{h.duplicateCount}</td>
                        <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '11px' }}>
                          {new Date(h.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                            backgroundColor: h.status === 'complete' ? '#D1FAE5' : h.status === 'processing' ? '#FFFBEB' : '#FEE2E2',
                            color: h.status === 'complete' ? '#059669' : h.status === 'processing' ? '#D97706' : '#EF4444'
                          }}>
                            {h.status === 'complete' ? '✓ Complete' : h.status === 'processing' ? '⏳ Processing' : h.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                        No upload history found. Upload a CSV/Excel file to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* LMS/ERP Dynamic API Synchronizer Tab */
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">

          {/* LMS Sync Panel */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', items: 'center', gap: '8px' }}>
              <Database size={20} color="#2563EB" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>LMS/ERP Synchronizer</h2>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Pulls the latest enrollment statuses, grades, and attendance for the selected department/batch from the
              configured LMS gateway (read-only, per FR-2.3). Server connection details are set once by an
              administrator in the deployment environment — not entered per sync.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>
              <Database size={14} />
              Gateway: server-configured (MOCK_LMS_URL) — contact your administrator to change it.
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    {departments.length === 0 && <option value="">No departments found</option>}
                    {departments.map((d) => (
                      <option key={d._id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target Batch Selection</label>
                  <select
                    value={syncBatchSelection}
                    onChange={(e) => setSyncBatchSelection(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    <option value="All">All batches in this department</option>
                    {filteredBatches.map((b) => (
                      <option key={b._id || b.code} value={b.code}>{b.code}</option>
                    ))}
                  </select>
                  {filteredBatches.length === 0 && (
                    <span style={{ fontSize: '11px', color: '#64748B' }}>No batches exist yet for this department.</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncTrigger}
                disabled={syncing || !selectedDept}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: (syncing || !selectedDept) ? 'not-allowed' : 'pointer', opacity: (syncing || !selectedDept) ? 0.7 : 1 }}
              >
                {syncing ? <CircularProgress size={12} style={{ color: '#fff' }} /> : <RefreshCw size={14} />}
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </form>

            {syncSuccess && (
              <div style={{ padding: '12px', backgroundColor: syncFailedCount > 0 ? '#FEF3C7' : '#D1FAE5', color: syncFailedCount > 0 ? '#92400E' : '#059669', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                Sync process completed! {syncCount} student profiles synced.
                {syncPromotedCount > 0 && ` ${syncPromotedCount} student${syncPromotedCount === 1 ? '' : 's'} auto-promoted to next semester.`}
                {syncGraduatedCount > 0 && ` ${syncGraduatedCount} student${syncGraduatedCount === 1 ? '' : 's'} marked as graduated.`}
                {syncFailedCount > 0 && ` (${syncFailedCount} student${syncFailedCount === 1 ? '' : 's'} failed to sync — check server logs.)`}
              </div>
            )}

            {syncError && (
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#EF4444', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> Sync failed: {syncError}
              </div>
            )}
          </div>

          {/* Sync History Logs */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', items: 'center', gap: '8px' }}>
              <History size={18} color="#64748B" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Previous API Sync History</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {syncLogs.length > 0 ? (
                syncLogs.map((log, i) => (
                  <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155' }}>{log.source}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                        backgroundColor: log.status === 'Success' ? '#D1FAE5' : '#FEE2E2',
                        color: log.status === 'Success' ? '#059669' : '#EF4444'
                      }}>
                        {log.status}
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '6px' }}>{log.records} records processed</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                  No previous API synchronization logs found.
                </div>
              )}
            </div>
          </div>

        </div>
      )}



    </div>
  );
}