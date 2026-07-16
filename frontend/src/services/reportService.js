// reportService.js
// Handles configurations, queries, and stores/snapshots for Batch Reports (FR-6.1)

export const fetchReportingStats = async () => {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch reporting stats');
  return res.json();
};

export const fetchCgpaDistribution = async () => {
  const res = await fetch('/api/dashboard/cgpa-distribution');
  if (!res.ok) throw new Error('Failed to fetch CGPA distribution');
  return res.json();
};

export const fetchStudentsByBatch = async () => {
  const res = await fetch('/api/dashboard/students-by-batch');
  if (!res.ok) throw new Error('Failed to fetch students by batch');
  return res.json();
};

export const fetchAtRiskTrend = async () => {
  const res = await fetch('/api/dashboard/at-risk-trend');
  if (!res.ok) throw new Error('Failed to fetch at-risk trend');
  return res.json();
};

export const fetchAuditLogs = async () => {
  try {
    const res = await fetch('/api/audit-logs');
    if (res.ok) return res.json();
  } catch (e) {}
  
  const res = await fetch('/api/auth/audit-logs');
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
};

// Snapshot Storage (FR-6.1 Snapshot Snapshots History)
const SNAPSHOTS_KEY = 'batchminder_saved_snapshots';

export const getSavedSnapshots = () => {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load snapshots:', err);
    return [];
  }
};

export const saveSnapshot = (name, type, filters, dataSummary) => {
  try {
    const snapshots = getSavedSnapshots();
    const newSnapshot = {
      id: `snap_${Date.now()}`,
      name: name || `Report Snapshot - ${new Date().toLocaleDateString()}`,
      type,
      filters,
      dataSummary,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify([newSnapshot, ...snapshots]));
    return newSnapshot;
  } catch (err) {
    console.error('Failed to save snapshot:', err);
    return null;
  }
};

export const deleteSnapshot = (id) => {
  try {
    const snapshots = getSavedSnapshots();
    const filtered = snapshots.filter(s => s.id !== id);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete snapshot:', err);
    return false;
  }
};
