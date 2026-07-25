// MigrationAudit.jsx
// Visual Audit log showcasing course match lists and credit losses (FR-6.5)

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, FileText, CheckCircle, XCircle, Search, 
  Filter, Eye, Download, Calendar, User, Building2, AlertTriangle, Printer
} from 'lucide-react';
import { CircularProgress } from '@mui/material';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';

export default function MigrationAudit() {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMigration, setSelectedMigration] = useState(null);

  useEffect(() => {
    fetchMigrations();
  }, []);

  const fetchMigrations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/migrations');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMigrations(data.data.migrations || []);
      } else {
        setError(data.message || 'Failed to retrieve migration audits');
      }
    } catch (err) {
      setError('Network error fetching migration audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Filter migrations
  const filteredMigrations = useMemo(() => {
    return migrations.filter(m => {
      const student = m.studentId || {};
      const studentName = student.name || '';
      const rollNumber = student.rollNumber || '';
      const source = m.sourceInstitution || '';
      
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            source.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [migrations, searchTerm, statusFilter]);

  // Export audit log for single student
  const handleExportSingle = (m) => {
    const student = m.studentId || {};
    const courses = m.transferredCourses || [];
    
    let csv = [
      ['MIGRATION TRANSFER AUDIT LOG'],
      ['Student Name', student.name],
      ['Roll Number', student.rollNumber],
      ['Source Institution', m.sourceInstitution],
      ['Transfer Status', m.status.toUpperCase()],
      ['Approved Credits', m.curriculumComparison?.toCompletedCredits || 0],
      ['Credit Losses', courses.filter(c => c.equivalencyStatus === 'rejected').reduce((sum, c) => sum + c.credits, 0)],
      [],
      ['Source Course', 'Mapped Target Course', 'Credits', 'Equivalency Status']
    ];

    courses.forEach(c => {
      csv.push([
        c.courseName,
        c.mappedCourseName || 'N/A',
        c.credits,
        c.equivalencyStatus.toUpperCase()
      ]);
    });

    const csvContent = csv.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `migration_audit_${student.rollNumber || 'record'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate and print high-fidelity official report PDF via browser
  const handlePrintPDF = (m) => {
    const student = m.studentId || {};
    const courses = m.transferredCourses || [];
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const acceptedCredits = courses.filter(c => c.equivalencyStatus === 'accepted').reduce((sum, c) => sum + c.credits, 0);
    const rejectedCredits = totalCredits - acceptedCredits;
    const transferEfficiency = totalCredits > 0 ? Math.round((acceptedCredits / totalCredits) * 100) : 0;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Migration Transfer Audit - ${student.name || 'Record'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1E293B; padding: 40px; margin: 0; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #1E3A6B; text-transform: uppercase; }
            .title { font-size: 20px; font-weight: 800; text-align: center; margin: 20px 0; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 15px; background-color: #F8FAFC; }
            .meta-title { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 5px; }
            .meta-value { font-size: 14px; font-weight: 700; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { border-bottom: 2px solid #E2E8F0; background-color: #FAFAFA; color: #475569; font-weight: 700; padding: 12px 16px; text-align: left; text-transform: uppercase; font-size: 11px; }
            td { border-bottom: 1px solid #F1F5F9; padding: 12px 16px; color: #334155; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .badge-accepted { color: #047857; background-color: #D1FAE5; }
            .badge-rejected { color: #B91C1C; background-color: #FEE2E2; }
            .footer { border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">BatchMinder</div>
            <div style="text-align: right; font-size: 12px; color: #64748B;">
              <strong>Migration Transfer Audit Log</strong><br/>
              Date: ${new Date().toLocaleDateString()}
            </div>
          </div>

          <div class="title">OFFICIAL MIGRATION EVALUATION REPORT</div>

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-title">Student Profile</div>
              <div class="meta-value">${student.name || 'N/A'}</div>
              <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Roll Number: ${student.rollNumber || 'N/A'}</div>
              <div style="font-size: 12px; color: #64748B;">Department: ${m.departmentId?.name || 'Computer Science'}</div>
            </div>
            <div class="meta-box">
              <div class="meta-title">Transfer Statistics</div>
              <div class="meta-value">Efficiency: ${transferEfficiency}%</div>
              <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Transferred Credits: ${acceptedCredits} CH</div>
              <div style="font-size: 12px; color: #64748B; color: ${rejectedCredits > 0 ? '#EF4444' : '#64748B'}">Credit Loss: ${rejectedCredits} CH</div>
            </div>
          </div>

          <div class="meta-box" style="margin-bottom: 30px;">
            <div class="meta-title">Source University / Institution</div>
            <div class="meta-value" style="font-size: 13px;">${m.sourceInstitution || 'N/A'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Source Course</th>
                <th>Mapped Target Course</th>
                <th>Credits</th>
                <th>Equivalency Status</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(c => `
                <tr>
                  <td style="font-weight: 600;">${c.courseName}</td>
                  <td>${c.mappedCourseName || 'N/A'}</td>
                  <td>${c.credits} CH</td>
                  <td>
                    <span class="badge ${c.equivalencyStatus === 'accepted' ? 'badge-accepted' : 'badge-rejected'}">
                      ${c.equivalencyStatus.toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="meta-box" style="margin-top: 20px;">
            <div class="meta-title">Official Remarks</div>
            <div style="font-size: 12px; font-style: italic; color: #334155;">
              "${m.remarks || 'No remarks provided.'}"
            </div>
          </div>

          <div class="footer">
            <div>
              <strong>Evaluator:</strong> ${m.decidedBy?.name || 'HOD/Academic Admin'}<br/>
              <strong>Date Evaluated:</strong> ${m.decidedAt ? new Date(m.decidedAt).toLocaleString() : '—'}
            </div>
            <div style="text-align: right;">
              BatchMinder Academic Portal<br/>
              Official Record
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      
      {/* Search & Filter Header Panel */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by Student Name, Roll Number, or Source Institution..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-800 focus:border-blue-500"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Filter size={15} color="#94A3B8" />
          <ResponsiveSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full"
            options={[
              { value: 'all', label: 'All Decision Statuses' },
              { value: 'approved', label: 'Approved / Equated' },
              { value: 'rejected', label: 'Rejected / Credit Losses' },
              { value: 'pending', label: 'Pending Evaluation' }
            ]}
          />
        </div>

      </div>

      {/* Main Grid View: Audit table or details */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
        
        {/* Audit list column */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Migration Audit Registry ({filteredMigrations.length})
            </h4>
            <button onClick={fetchMigrations} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
              Reload Registry
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', backgroundColor: '#FAFAFA' }}>
                  <th style={{ padding: '12px 20px' }}>Student Profile</th>
                  <th style={{ padding: '12px 20px' }}>Source Institution</th>
                  <th style={{ padding: '12px 20px' }}>Transferred</th>
                  <th style={{ padding: '12px 20px' }}>Credit Loss</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                      <CircularProgress size={20} style={{ color: '#2563EB', marginBottom: '8px' }} />
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Loading decision audits...</div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#EF4444', fontWeight: 600 }}>
                      {error}
                    </td>
                  </tr>
                ) : filteredMigrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                      No migration audit records match active filter.
                    </td>
                  </tr>
                ) : (
                  filteredMigrations.map((m) => {
                    const student = m.studentId || {};
                    const totalCredits = (m.transferredCourses || []).reduce((sum, c) => sum + c.credits, 0);
                    const acceptedCredits = (m.transferredCourses || []).filter(c => c.equivalencyStatus === 'accepted').reduce((sum, c) => sum + c.credits, 0);
                    const creditLoss = totalCredits - acceptedCredits;

                    return (
                      <tr key={m._id} style={{ borderBottom: '1px solid #F1F5F9' }} className="hover:bg-slate-50/40">
                        <td style={{ padding: '14px 20px' }}>
                          <strong style={{ color: '#0F172A', display: 'block' }}>{student.name || 'Unknown'}</strong>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>{student.rollNumber || 'N/A'}</span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 500 }}>
                          {m.sourceInstitution}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#10B981' }}>
                          {acceptedCredits} CH <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>/ {totalCredits}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: creditLoss > 0 ? '#EF4444' : '#64748B' }}>
                          {creditLoss} CH
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                            color: m.status === 'approved' ? '#047857' : m.status === 'rejected' ? '#B91C1C' : '#D97706',
                            backgroundColor: m.status === 'approved' ? '#D1FAE5' : m.status === 'rejected' ? '#FEE2E2' : '#FEF3C7'
                          }}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setSelectedMigration(m)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB', padding: '4px', borderRadius: '6px' }}
                              title="Audit Course Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleExportSingle(m)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', borderRadius: '6px' }}
                              title="Export CSV Audit Log"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handlePrintPDF(m)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', borderRadius: '6px' }}
                              title="Print Audit Report PDF"
                            >
                              <Printer size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected audit detail sidebar */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: 'fit-content'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <FileText size={16} color="#4F46E5" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Transfer Audit Analyzer
            </h4>
          </div>

          {!selectedMigration ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px', fontStyle: 'italic' }}>
              Select a migration record from the audit registry to review the equivalency match list, credit loss diagnostics, and program gaps.
            </div>
          ) : (() => {
            const m = selectedMigration;
            const student = m.studentId || {};
            const courses = m.transferredCourses || [];
            
            const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
            const acceptedCredits = courses.filter(c => c.equivalencyStatus === 'accepted').reduce((sum, c) => sum + c.credits, 0);
            const rejectedCredits = totalCredits - acceptedCredits;
            const transferEfficiency = totalCredits > 0 ? Math.round((acceptedCredits / totalCredits) * 100) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Profile Header */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 700, fontSize: '13px' }}>
                    {student.name ? student.name.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{student.name || 'Unknown'}</h5>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>{student.rollNumber}</span>
                  </div>
                </div>

                {/* Credit Loss Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Transfer Credit Losses
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div style={{ padding: '10px', backgroundColor: '#EFFDF5', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Transferred</span>
                      <strong style={{ fontSize: '16px', color: '#15803D', display: 'block', marginTop: '2px' }}>{acceptedCredits} CH</strong>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: rejectedCredits > 0 ? '#FEF2F2' : '#F8FAFC', border: `1px solid ${rejectedCredits > 0 ? '#FEE2E2' : '#E2E8F0'}`, borderRadius: '10px' }}>
                      <span style={{ fontSize: '10px', color: rejectedCredits > 0 ? '#991B1B' : '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Credit Loss</span>
                      <strong style={{ fontSize: '16px', color: rejectedCredits > 0 ? '#EF4444' : '#64748B', display: 'block', marginTop: '2px' }}>{rejectedCredits} CH</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', fontWeight: 600, border: '1px solid #F1F5F9', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#FAFAFA' }}>
                    <span>Transfer Efficiency:</span>
                    <strong style={{ color: transferEfficiency > 80 ? '#10B981' : transferEfficiency > 50 ? '#F59E0B' : '#EF4444' }}>{transferEfficiency}%</strong>
                  </div>
                </div>

                {/* Match Lists */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Equivalency Match List
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {courses.map((c, i) => (
                      <div key={i} style={{ padding: '10px', border: '1px solid #F1F5F9', borderRadius: '10px', backgroundColor: '#FAFAFA', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ color: '#334155' }}>{c.courseName}</strong>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px',
                            color: c.equivalencyStatus === 'accepted' ? '#047857' : '#B91C1C',
                            backgroundColor: c.equivalencyStatus === 'accepted' ? '#D1FAE5' : '#FEE2E2'
                          }}>{c.equivalencyStatus}</span>
                        </div>
                        {c.mappedCourseName && (
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                            Equiv: <b>{c.mappedCourseName}</b>
                          </div>
                        )}
                        <div style={{ fontSize: '10px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Source Course Weight:</span>
                          <span>{c.credits} CH</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit decider details */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span><b>Evaluated By:</b> {m.decidedBy?.name || 'Administrator'}</span>
                  <span><b>Evaluation Date:</b> {m.decidedAt ? new Date(m.decidedAt).toLocaleString() : '—'}</span>
                  {m.remarks && (
                    <div style={{ marginTop: '6px', padding: '8px', borderLeft: '3px solid #CBD5E1', color: '#64748B', fontStyle: 'italic', backgroundColor: '#F8FAFC', borderRadius: '0 6px 6px 0' }}>
                      " {m.remarks} "
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

      </div>
    </div>
  );
}
