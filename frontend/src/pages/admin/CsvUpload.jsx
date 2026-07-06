import React, { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function CsvUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setImportResult(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('departmentId', '');

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.data);
      } else {
        alert(data.message || 'Validation failed');
      }
    } catch (err) {
      alert('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!result?.uploadId) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/uploads/${result.uploadId}/import`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data.data);
      } else {
        alert(data.message || 'Import failed');
      }
    } catch (err) {
      alert('Network error during import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>

      {/* Upload Area */}
      <div style={{
        border: '2px dashed #CBD5E1', borderRadius: 16, padding: 48,
        textAlign: 'center', cursor: 'pointer', marginBottom: 24,
        borderColor: file ? '#2E75B6' : '#CBD5E1',
        backgroundColor: file ? '#F8FAFC' : '#fff',
      }}>
        <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} id="csv-input" />
        <label htmlFor="csv-input" style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Upload size={24} color="#2563EB" />
          </div>
          <p style={{ fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Drag & drop, or click to browse</p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Accepts CSV files only (max 10MB)</p>
        </label>
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 24 }}>
          <CircularProgress size={16} /> <span style={{ fontSize: 13, color: '#475569' }}>Validating file...</span>
        </div>
      )}

      {/* Validation Summary */}
      {result && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={18} color="#2E75B6" /> Validation Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{result.totalRecords}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
            </div>
            <div style={{ padding: 16, backgroundColor: '#F0FDF4', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A' }}>{result.validRecords}</div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valid</div>
            </div>
            <div style={{ padding: 16, backgroundColor: '#FFF1F2', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{result.errorCount}</div>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Errors</div>
            </div>
            <div style={{ padding: 16, backgroundColor: '#FFFBEB', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{result.duplicateCount}</div>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duplicates</div>
            </div>
          </div>

          {/* Error List */}
          {result.errors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> Row-level Errors
              </h4>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #FECACA', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FFF1F2' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#991B1B', fontWeight: 700 }}>Row</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#991B1B', fontWeight: 700 }}>Field</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#991B1B', fontWeight: 700 }}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((err, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #FEE2E2' }}>
                        <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>#{err.row}</td>
                        <td style={{ padding: '6px 12px', fontWeight: 600 }}>{err.field}</td>
                        <td style={{ padding: '6px 12px' }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Rows Preview */}
          {result.validPreview?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Valid Rows Preview (first {result.validPreview.length})
              </h4>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #BBF7D0', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F0FDF4' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#166534', fontWeight: 700 }}>Roll Number</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#166534', fontWeight: 700 }}>Name</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#166534', fontWeight: 700 }}>Batch</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#166534', fontWeight: 700 }}>CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.validPreview.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #DCFCE7' }}>
                        <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{row.rollNumber}</td>
                        <td style={{ padding: '6px 12px' }}>{row.name}</td>
                        <td style={{ padding: '6px 12px' }}>{row.batchCode}</td>
                        <td style={{ padding: '6px 12px' }}>{row.cgpa.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Button */}
          {result.validRecords > 0 && !importResult && (
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                backgroundColor: '#0F172A', color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: importing ? 0.7 : 1
              }}
            >
              {importing ? <CircularProgress size={14} color="inherit" /> : <Upload size={16} />}
              Import {result.validRecords} valid records
            </button>
          )}

          {/* Import Result Summary */}
          {importResult && (
            <div style={{ padding: 16, backgroundColor: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#16A34A" />
              <div>
                <strong style={{ color: '#166534' }}>Import complete:</strong>{' '}
                <span style={{ color: '#166534' }}>{importResult.importedCount} students imported, {importResult.errorCount} errors</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
