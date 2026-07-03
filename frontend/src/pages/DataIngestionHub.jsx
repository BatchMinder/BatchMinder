import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

const MOCK_VALIDATION_ERRORS = [
  { row: 3, field: 'cgpa', value: '4.5', error: 'CGPA cannot exceed 4.00', severity: 'error' },
  { row: 7, field: 'id', value: 'F22-BCS-9999', error: 'Invalid Roll Number format pattern', severity: 'warning' },
  { row: 12, field: 'email', value: 'invalid_email', error: 'Invalid institutional email address structure', severity: 'error' }
];

const MOCK_SYNC_LOGS = [
  { timestamp: '2026-07-03 10:15:32', source: 'LMS API Gateway', records: 124, status: 'Success' },
  { timestamp: '2026-07-02 08:30:11', source: 'ERP Core Services', records: 45, status: 'Success' },
  { timestamp: '2026-06-30 14:22:00', source: 'LMS API Gateway', records: 0, status: 'Failed (Timeout)' }
];

export default function DataIngestionHub({ onUploadSuccess }) {
  // Upload States
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showValidationReport, setShowValidationReport] = useState(false);

  // Sync API Configuration States
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [syncBatch, setSyncBatch] = useState('All');
  
  // Validation Errors States
  const [errors, setErrors] = useState({
    apiUrl: '',
    apiKey: ''
  });

  // Sync trigger states
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Integration States
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [syncCount, setSyncCount] = useState(0);
  const [syncError, setSyncError] = useState('');

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

  // Real upload logic
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);
    setUploadSuccess(false);
    setUploadStats(null);
    setValidationErrors([]);
    setShowValidationReport(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setUploadSuccess(true);
        if (onUploadSuccess) onUploadSuccess();
        setUploadStats({
          processed: data.data.processed,
          upserted: data.data.upserted,
          modified: data.data.modified
        });
        if (data.data.errors) {
          const parsed = data.data.errors.map((errStr, idx) => {
            const match = errStr.match(/^Row (\d+): (.*)/);
            return {
              row: match ? Number(match[1]) : idx + 1,
              field: 'Record Schema',
              value: 'Invalid',
              error: match ? match[2] : errStr,
              severity: 'error'
            };
          });
          setValidationErrors(parsed);
          setShowValidationReport(true);
        }
      } else {
        const errMsg = data.message || 'File upload failed';
        const rawErrors = data.errors || [];
        const parsed = rawErrors.map((errStr, idx) => {
          const match = errStr.match(/^Row (\d+): (.*)/);
          return {
            row: match ? Number(match[1]) : idx + 1,
            field: 'Required Attribute',
            value: 'Missing / Blank',
            error: match ? match[2] : errStr,
            severity: 'error'
          };
        });
        
        if (parsed.length > 0) {
          setValidationErrors(parsed);
          setShowValidationReport(true);
        } else {
          alert(errMsg);
        }
      }
    } catch (err) {
      alert('Network error uploading CSV spreadsheet');
    } finally {
      setUploading(false);
    }
  };

  // Real sync trigger logic
  const handleSyncTrigger = async () => {
    if (!apiUrl || errors.apiUrl || !apiKey || errors.apiKey) {
      validateField('apiUrl', apiUrl);
      validateField('apiKey', apiKey);
      return;
    }

    setSyncing(true);
    setSyncSuccess(false);
    setSyncError('');
    setSyncCount(0);

    try {
      const batches = syncBatch === 'All' ? ['2022', '2023', '2024'] : [syncBatch];
      let netCount = 0;
      let failedBatch = null;

      for (const b of batches) {
        const response = await fetch('/api/students/sync-lms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batch: b,
            department: 'Computer Science'
          })
        });

        const data = await response.json();
        if (response.ok) {
          netCount += data.syncedCount || 0;
        } else {
          failedBatch = b;
          setSyncError(data.message || `Failed to sync batch ${b}`);
          break;
        }
      }

      if (!failedBatch) {
        setSyncSuccess(true);
        setSyncCount(netCount);
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err) {
      setSyncError('Network error connecting to LMS synchronizer');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-brandNavy font-display">Data Ingestion Hub</h1>
        <p className="text-slate-500 text-sm">Bulk import student records via CSV files or synchronize dynamically with LMS/ERP APIs.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Side: CSV/Excel Bulk Upload (FR-2.2) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-brandAccent" />
                <h2 className="text-lg font-bold text-slate-800">Bulk CSV/Excel Ingestion</h2>
              </div>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-brandAccent hover:text-brandAccent/80 focus:outline-none transition-colors">
                <Download className="h-4 w-4" /> Template.csv
              </button>
            </div>

            {/* Drop Zone Box */}
            <div className="border-2 border-dashed border-slate-200 hover:border-brandAccent/50 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center relative cursor-pointer group">
              <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={uploading}
              />
              <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:text-brandAccent flex items-center justify-center shadow-sm mb-4 transition-colors">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Drag and drop your spreadsheet here</p>
              <p className="text-xs text-slate-400 mt-1">Accepts CSV, XLS, XLSX formats (Max file size 10MB)</p>
            </div>

            {/* Upload loading status */}
            {uploading && (
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <CircularProgress size={16} className="text-brandNavy" />
                <span className="text-sm text-slate-600 font-semibold">Analyzing database structure & validating file format...</span>
              </div>
            )}

            {/* Upload success feedback */}
            {uploadSuccess && uploadStats && (
              <div className="p-4 rounded-xl bg-alertGood/5 border border-alertGood/25 text-alertGood text-sm flex gap-3 leading-relaxed animate-fade-in">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Spreadsheet Ingestion Complete</span>
                  Successfully processed all **{uploadStats.processed} records** from the file.
                  <span className="block text-xs mt-1 text-slate-500 font-semibold">
                    Upserted: {uploadStats.upserted} | Modified: {uploadStats.modified}
                  </span>
                </div>
              </div>
            )}

            {/* Validation reports grid (UI-1, UI-6) */}
            {showValidationReport && !uploading && validationErrors.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-alertCritical/5 border border-alertCritical/20 flex gap-3 text-sm text-alertCritical leading-relaxed">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Spreadsheet Validation Check Failed</span>
                    We found **{validationErrors.length} warnings/errors** in the uploaded file. Please fix the records highlighted below and re-upload.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Validation Error Logs
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400">
                        <th className="py-2.5 px-3">Row No.</th>
                        <th className="py-2.5 px-3">Attribute</th>
                        <th className="py-2.5 px-3">Raw Value</th>
                        <th className="py-2.5 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {validationErrors.map((err, i) => (
                        <tr key={i} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3 font-mono">#{err.row}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-semibold">{err.field}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{err.value}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide mr-2 ${
                              err.severity === 'error' 
                                ? 'bg-alertCritical/5 border-alertCritical/20 text-alertCritical'
                                : 'bg-alertWarning/5 border-alertWarning/20 text-alertWarning'
                            }`}>
                              {err.severity}
                            </span>
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: LMS/ERP REST API Sync Configuration (FR-2.3, UI-5) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-brandAccent" />
              <h2 className="text-lg font-bold text-slate-800">LMS/ERP Synchronizer</h2>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed">
              Connect directly to the university's institutional REST API gateway to retrieve the latest student enrollment statuses and GPA grades.
            </p>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* API URL Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">REST API Endpoints Gateway</label>
                <input 
                  type="text" 
                  placeholder="https://lms.university.edu/api/v1/students"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  onBlur={() => validateField('apiUrl', apiUrl)}
                  className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none transition-colors text-slate-800 placeholder-slate-400 ${
                    errors.apiUrl ? 'border-alertCritical focus:border-alertCritical' : 'border-slate-200 focus:border-brandAccent'
                  }`}
                />
                {errors.apiUrl && (
                  <p className="text-xs font-medium text-alertCritical flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.apiUrl}
                  </p>
                )}
              </div>

              {/* API Security Token Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Security Access Key/Token</label>
                <input 
                  type="password" 
                  placeholder="••••••••••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onBlur={() => validateField('apiKey', apiKey)}
                  className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none transition-colors text-slate-800 placeholder-slate-400 ${
                    errors.apiKey ? 'border-alertCritical focus:border-alertCritical' : 'border-slate-200 focus:border-brandAccent'
                  }`}
                />
                {errors.apiKey && (
                  <p className="text-xs font-medium text-alertCritical flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.apiKey}
                  </p>
                )}
              </div>

              {/* Sync Batch */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Batch Selection</label>
                  <select 
                    value={syncBatch}
                    onChange={(e) => setSyncBatch(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brandAccent text-slate-700 bg-white"
                  >
                    <option value="All">All Active Batches</option>
                    <option value="2022">CS Batch 2022</option>
                    <option value="2023">CS Batch 2023</option>
                    <option value="2024">CS Batch 2024</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    type="button"
                    onClick={handleSyncTrigger}
                    disabled={syncing}
                    className="w-full py-2 px-4 bg-brandNavy text-white hover:bg-brandNavy/95 disabled:bg-slate-200 font-bold rounded-lg text-sm focus:outline-none transition-colors shadow-sm shadow-brandNavy/10 flex items-center justify-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <CircularProgress size={12} color="inherit" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Sync success feedback */}
            {syncSuccess && (
              <div className="p-3 rounded-xl bg-alertGood/5 border border-alertGood/25 text-alertGood text-sm flex items-center gap-2 animate-fade-in font-medium">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>Sync process completed! {syncCount} student profiles synced successfully.</span>
              </div>
            )}

            {/* Sync error feedback */}
            {syncError && (
              <div className="p-3 rounded-xl bg-alertCritical/5 border border-alertCritical/25 text-alertCritical text-sm flex items-center gap-2 animate-fade-in font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Sync failed: {syncError}</span>
              </div>
            )}

            {/* Sync History log */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <History className="h-4 w-4" />
                Previous API Sync History
              </div>
              
              <div className="space-y-2">
                {MOCK_SYNC_LOGS.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-slate-150 text-xs">
                    <div>
                      <strong className="text-slate-700 block">{log.source}</strong>
                      <span className="text-slate-400 block mt-0.5">{log.timestamp}</span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold border uppercase text-[10px] ${
                        log.status.startsWith('Success') 
                          ? 'bg-alertGood/10 border-alertGood/30 text-alertGood'
                          : 'bg-alertCritical/10 border-alertCritical/30 text-alertCritical'
                      }`}>
                        {log.status}
                      </span>
                      <span className="block text-slate-500 font-semibold mt-1">{log.records} records processed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
