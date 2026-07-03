import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

const FileDropzone = ({ onFileUpload, templateUrl }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const validateAndProcessFile = (targetFile) => {
    if (!targetFile) return;
    const fileExtension = targetFile.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
      setStatus({ type: 'error', message: 'Rejected: Only standard CSV or Excel (.xlsx) formats are supported.' });
      setFile(null);
      return;
    }
    setFile(targetFile);
    setStatus({ type: 'success', message: `Successfully staged: ${targetFile.name}` });
    onFileUpload?.(targetFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
          }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv, .xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && validateAndProcessFile(e.target.files[0])} />
        <UploadCloud className={`h-10 w-10 mb-2 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-slate-700">Drag spreadsheet template here, or browse files</p>
        <p className="text-xs text-slate-400 mt-1">Supports strict column configurations via CSV or XLSX formats</p>
      </div>

      {status.type && (
        <div className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs font-medium ${status.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-green-50 text-green-800 border-green-100'
          }`}>
          {status.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
          <span className="truncate">{status.message}</span>
        </div>
      )}

      {templateUrl && (
        <a href={templateUrl} download className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Download Predefined Validation Template Sheet
        </a>
      )}
    </div>
  );
};

export default FileDropzone;