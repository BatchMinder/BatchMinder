import React, { useState } from 'react';
import { 
  Upload, CheckCircle, AlertCircle, FileSpreadsheet,
  Users, Copy, Loader2, Download, X, RefreshCw
} from 'lucide-react';

export default function CsvUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  // Mock data to match the screenshot state exactly
  const mockState = {
    totalRecords: "1,256",
    validRecords: "1,198",
    errorsFound: 58,
    duplicates: 14,
    fileName: "Students_May2026.xlsx",
    fileSize: "2.45 MB",
    uploadedBy: "Dr. Ahmed Raza",
    uploadTime: "May 22, 2026, 10:30 AM",
    status: "Processing...",
    dataPreview: [
      { id: '1', stId: 'BSCS-23S-0092', name: 'Muhammad Ahmed', dept: 'Computer Science', batch: 'BSCS-2023', sem: '6', cgpa: '3.82', status: 'Valid' },
      { id: '2', stId: 'BSSE-23S-0056', name: 'Sara Ali', dept: 'Software Engineering', batch: 'BSSE-2023', sem: '4', cgpa: '2.45', status: 'Valid' },
      { id: '3', stId: 'BSEE-21S-0031', name: 'Usman Hassan', dept: 'Electrical Engineering', batch: 'BSEE-2021', sem: '8', cgpa: '3.81', status: 'Valid' },
      { id: '4', stId: 'BSCS-23S-0078', name: 'Fatima Aziz', dept: 'Computer Science', batch: 'BSCS-2023', sem: '6', cgpa: '3.10', status: 'Valid' },
      { id: '5', stId: 'BSSE-23S-0044', name: 'Muhammad Khan', dept: 'Software Engineering', batch: 'BSSE-2023', sem: '6', cgpa: '1.98', status: 'Invalid' },
      { id: '6', stId: 'BSME-21S-0019', name: 'Ayesha Habib', dept: 'Mechanical Engineering', batch: 'BSME-2021', sem: '8', cgpa: '3.67', status: 'Valid' },
      { id: '7', stId: 'BSCS-24S-0012', name: 'Zain Raza', dept: 'Computer Science', batch: 'BSCS-2024', sem: '2', cgpa: '3.22', status: 'Valid' },
      { id: '8', stId: 'BSEE-22S-0065', name: 'Hida Nawaz', dept: 'Electrical Engineering', batch: 'BSEE-2022', sem: '5', cgpa: '2.15', status: 'Invalid' },
      { id: '9', stId: 'BSCS-23S-0031', name: 'Hassan Rauf', dept: 'Computer Science', batch: 'BSCS-2023', sem: '1', cgpa: '0.00', status: 'Invalid' },
      { id: '10', stId: 'BSSE-23S-0158', name: 'Laiba Noor', dept: 'Software Engineering', batch: 'BSSE-2023', sem: '4', cgpa: '2.78', status: 'Valid' },
    ],
    validationErrors: [
      { row: '9', field: 'CGPA', desc: 'CGPA cannot be 0.00' },
      { row: '15', field: 'Student ID', desc: 'Student ID format is invalid' },
      { row: '18', field: 'Department', desc: 'Department code not recognized' },
      { row: '23', field: 'Semester', desc: 'Semester must be between 1 and 8' },
      { row: '27', field: 'CGPA', desc: 'CGPA must be between 0.00 and 4.00' },
      { row: '31', field: 'Student Name', desc: 'Student name is missing' },
      { row: '34', field: 'Batch', desc: 'Batch does not exist' },
      { row: '37', field: 'Student ID', desc: 'Duplicate Student ID found' },
    ]
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setUploading(true);
    setProgress(0);
    setResult(null);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          setResult(mockState); // Show mock state when progress reaches 85% to match screenshot
          return 85;
        }
        return prev + 5;
      });
    }, 100);
  };

  const handleAction = (actionName) => {
    alert(`Mock action triggered: ${actionName}`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#0F172A', paddingBottom: '40px' }}>
      
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
        <span>BatchMinder ERP</span>
        <span style={{ margin: '0 4px' }}>&gt;</span>
        <span>Administrator</span>
        <span style={{ margin: '0 4px' }}>&gt;</span>
        <span style={{ fontWeight: 600, color: '#0F172A' }}>CSV / Excel Upload</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Section: Upload Area & Summary */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Upload Container */}
          <div style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Upload Student Data File</h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748B' }}>Upload CSV or Excel file to add or update student records</p>
            
            <div style={{
              border: '2px dashed #93C5FD', borderRadius: '12px', padding: '40px 24px',
              textAlign: 'center', backgroundColor: '#EFF6FF', position: 'relative'
            }}>
              <input type="file" accept=".csv,.xlsx" onChange={handleFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DBEAFE', marginBottom: '16px' }}>
                <Upload size={24} color="#2563EB" />
              </div>
              
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>
                Drag & drop your file here<br/>or
              </div>
              
              <button style={{ 
                backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '8px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '24px'
              }}>
                Choose File
              </button>
              
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                <p style={{ margin: '0 0 4px' }}>Supported formats: .csv, .xlsx</p>
                <p style={{ margin: 0 }}>Maximum file size: 10 MB</p>
              </div>
            </div>
          </div>

          {/* Summary & Progress Container */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Summary Cards */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Upload Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Records */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: '#F3E8FF', padding: '6px', borderRadius: '8px' }}><Users size={16} color="#9333EA" /></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Total Records</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>{result ? result.totalRecords : '-'}</div>
                </div>
                
                {/* Valid Records */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: '#DCFCE7', padding: '6px', borderRadius: '8px' }}><CheckCircle size={16} color="#16A34A" /></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Valid Records</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>{result ? result.validRecords : '-'}</div>
                </div>

                {/* Errors Found */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: '#FEF2F2', padding: '6px', borderRadius: '8px' }}><AlertCircle size={16} color="#EF4444" /></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Errors Found</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>{result ? result.errorsFound : '-'}</div>
                </div>

                {/* Duplicates */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <div style={{ backgroundColor: '#E0F2FE', padding: '6px', borderRadius: '8px' }}><Copy size={16} color="#0284C7" /></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Duplicates</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>{result ? result.duplicates : '-'}</div>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Upload Progress</h2>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{progress}%</span>
              </div>
              
              <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '4px', transition: 'width 0.2s ease-out' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
                <span>{file ? `File: ${file.name}` : (result ? `File: ${result.fileName}` : 'No file selected')}</span>
                {uploading && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={12} style={{ animation: 'spin 2s linear infinite' }} /> Uploading... please wait
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* File Detail Row */}
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={20} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>File Name</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{result.fileName}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '48px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>File Size</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{result.fileSize}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Uploaded By</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=24&h=24&fit=crop&crop=faces" alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{result.uploadedBy}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Upload Time</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{result.uploadTime}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Upload Status</div>
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', padding: '4px 12px', 
                  backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: '20px', 
                  fontSize: '12px', fontWeight: 600 
                }}>
                  {result.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Tables Section */}
        {result && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Left: Data Preview */}
            <div style={{ flex: '3', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>Data Preview (First 10 Rows)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dataPreview.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>{row.id}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{row.stId}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#1E293B' }}>{row.name}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>{row.dept}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>{row.batch}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748B' }}>{row.sem}</td>
                        <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: 600, color: row.status === 'Invalid' ? '#EF4444' : (parseFloat(row.cgpa) < 2.5 ? '#F59E0B' : '#16A34A') }}>{row.cgpa}</td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ 
                            fontSize: '12px', fontWeight: 600, 
                            color: row.status === 'Valid' ? '#16A34A' : '#EF4444',
                            backgroundColor: row.status === 'Valid' ? '#DCFCE7' : '#FEE2E2',
                            padding: '4px 10px', borderRadius: '12px'
                          }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}>
                Showing first 10 rows of 1,256 total records
              </div>
            </div>

            {/* Right: Validation Errors */}
            <div style={{ flex: '2', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>Validation Errors (58)</h3>
                <button onClick={() => handleAction('Download Error Report')} style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px',
                  fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer'
                }}>
                  <Download size={14} /> Download Error Report
                </button>
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Row #</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Field Name</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Error Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.validationErrors.map((err, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{err.row}</td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748B' }}>{err.field}</td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#EF4444' }}>{err.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                Total Errors Found: 58
              </div>
            </div>

          </div>
        )}

        {/* Bottom Actions */}
        {result && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '24px 0', borderTop: '1px solid #E2E8F0' }}>
            <button 
              onClick={() => { setResult(null); setFile(null); setProgress(0); }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, color: '#64748B', cursor: 'pointer' 
              }}>
              <X size={16} /> Cancel Upload
            </button>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleAction('Validate Again')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                  backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' 
                }}>
                <RefreshCw size={16} /> Validate Again
              </button>
              
              <button 
                onClick={() => handleAction('Import Valid Records')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                  backgroundColor: '#2563EB', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                }}>
                <Download size={16} /> Import Valid Records
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
