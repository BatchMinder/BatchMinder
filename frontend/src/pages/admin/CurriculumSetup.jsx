import React, { useState, useEffect } from 'react';
import { BookOpen, Building2, Layers, GitCompare, FileEdit, Trash2, Eye, Plus, ArrowRightLeft, Clock, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import EquivalencyForm from '../../components/curriculum/EquivalencyForm';

const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6'];

export default function CurriculumSetup() {
  const [curriculums, setCurriculums] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllCoursesModal, setShowAllCoursesModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCourses, setEditCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ code: '', title: '', creditHours: 3, semester: 1 });

  // Add Curriculum Form State
  const [addForm, setAddForm] = useState({ batchId: '', departmentId: '', version: '1.0' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const fetchCurriculums = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/curriculums');
      const data = await res.json();
      if (data.status === 'success' && data.data.curriculums) {
        setCurriculums(data.data.curriculums);
        if (data.data.curriculums.length > 0) {
          setSelectedCurriculum(data.data.curriculums[0]);
        }
      }
      
      const deptRes = await fetch('/api/departments');
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.data || []);
      }

      const batchRes = await fetch('/api/batches');
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData.data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurriculumSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create a dummy course as requested in the plan
      const payload = {
        batchId: addForm.batchId,
        departmentId: addForm.departmentId,
        version: addForm.version,
        courses: [{ code: "DUMMY101", title: "Placeholder Course", creditHours: 3, semester: 1 }]
      };
      const res = await fetch('/api/curriculums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ batchId: '', departmentId: '', version: '1.0' });
        fetchCurriculums(); // Refresh list
      } else {
        const error = await res.json();
        alert('Error: ' + error.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create curriculum');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCurriculumSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        batchId: selectedCurriculum.batchId?._id || selectedCurriculum.batchId,
        departmentId: selectedCurriculum.departmentId?._id || selectedCurriculum.departmentId,
        version: selectedCurriculum.version,
        courses: editCourses.map(c => ({
          code: c.code,
          title: c.title,
          creditHours: c.creditHours,
          semester: c.semester
        }))
      };

      const res = await fetch('/api/curriculums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchCurriculums(); // Refresh list
        alert('Curriculum updated successfully!');
      } else {
        const error = await res.json();
        alert('Error: ' + error.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update curriculum');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Loading curriculums...</div>;
  }

  // Derived metrics
  const activeCount = curriculums.filter(c => c.status === 'active').length;
  const deptCount = departments.length;
  let totalCourses = 0;
  const courseCodeSet = new Set();
  curriculums.forEach(c => {
    if (c.courses) c.courses.forEach(course => courseCodeSet.add(course.code));
  });
  totalCourses = courseCodeSet.size;

  const statCards = [
    { label: 'Curriculum Versions', value: curriculums.length, subtitle: `${activeCount} Active`, icon: BookOpen, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Departments', value: deptCount, subtitle: 'All Departments', icon: Building2, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Total Courses', value: totalCourses, subtitle: 'Across all curriculums', icon: Layers, color: '#10B981', bg: '#F0FDF4' },
    { label: 'Active Mappings', value: 0, subtitle: 'Course Equivalencies', icon: ArrowRightLeft, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Pending Updates', value: 0, subtitle: 'Require Review', icon: Clock, color: '#EF4444', bg: '#FEF2F2' }
  ];

  // Selected Curriculum Stats
  let coreCount = 0;
  let electiveCount = 0;
  let labCount = 0;
  let genCount = 0;
  let totalCredits = 0;
  
  if (selectedCurriculum && selectedCurriculum.courses) {
    selectedCurriculum.courses.forEach(c => {
      totalCredits += c.creditHours;
      const lower = c.title.toLowerCase();
      if (lower.includes('lab') || c.creditHours === 1) labCount++;
      else if (lower.includes('elective')) electiveCount++;
      else if (lower.includes('english') || lower.includes('studies') || lower.includes('communication')) genCount++;
      else coreCount++;
    });
  }

  const pieData = [
    { name: 'Core Courses', value: coreCount, credits: coreCount * 3 },
    { name: 'Elective Courses', value: electiveCount, credits: electiveCount * 3 },
    { name: 'Lab Courses', value: labCount, credits: labCount * 1 },
    { name: 'General Courses', value: genCount, credits: genCount * 2 }
  ].filter(d => d.value > 0);

  return (
    <div style={{ padding: '0 0 40px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Curriculum Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>Manage program curricula, map equivalencies, and configure rules.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add New Curriculum Version
        </button>
      </div>

      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{card.label}</p>
              <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{card.value}</h3>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: card.color }}>{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* FILTERING LOGIC */}
      {(() => {
        const filteredCurriculums = curriculums.filter(c => {
          const matchesSearch = (c.batchId?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                                (c.batchId?.code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
          const matchesDept = departmentFilter === 'all' || c.departmentId?._id === departmentFilter;
          return matchesSearch && matchesDept;
        });

        return (
          <>
            {/* 2. VERSIONS & DETAILS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 mb-6">
              
              {/* Curriculum Versions List */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-4">
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Curriculum Versions</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      placeholder="Search curriculum..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }} 
                    />
                    <select 
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                        <th style={{ padding: '12px 8px' }}>VERSION</th>
                        <th style={{ padding: '12px 8px' }}>CURRICULUM NAME</th>
                        <th style={{ padding: '12px 8px' }}>DEPARTMENT</th>
                        <th style={{ padding: '12px 8px' }}>EFFECTIVE FROM</th>
                        <th style={{ padding: '12px 8px' }}>STATUS</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCurriculums.map(c => {
                        const isSelected = selectedCurriculum && selectedCurriculum._id === c._id;
                        return (
                          <tr key={c._id} onClick={() => setSelectedCurriculum(c)} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: isSelected ? '#EFF6FF' : 'transparent', transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '12px 8px', color: '#2563EB', fontWeight: 600 }}>v{c.version}</td>
                            <td style={{ padding: '12px 8px', color: '#0F172A', fontWeight: 500 }}>{c.batchId?.name || c.batchId?.code} Curriculum</td>
                            <td style={{ padding: '12px 8px', color: '#64748B' }}>{c.departmentId?.name}</td>
                            <td style={{ padding: '12px 8px', color: '#64748B' }}>{c.batchId?.code || 'N/A'}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: c.status === 'active' ? '#D1FAE5' : '#F1F5F9', color: c.status === 'active' ? '#059669' : '#64748B' }}>
                                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedCurriculum(c); setShowAllCoursesModal(true); }} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '4px' }}><Eye size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedCurriculum(c); setEditCourses(c.courses || []); setShowEditModal(true); }} style={{ background: 'none', border: 'none', color: '#F59E0B', cursor: 'pointer', padding: '4px' }}><FileEdit size={14} /></button>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredCurriculums.length === 0 && (
                        <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No curriculum versions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

        {/* Selected Curriculum Details */}
        {selectedCurriculum && (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Curriculum Details</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                v{selectedCurriculum.version}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  {selectedCurriculum.batchId?.name || selectedCurriculum.batchId?.code} Curriculum <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, backgroundColor: selectedCurriculum.status === 'active' ? '#D1FAE5' : '#F1F5F9', color: selectedCurriculum.status === 'active' ? '#059669' : '#64748B', verticalAlign: 'middle', marginLeft: '8px' }}>{selectedCurriculum.status.toUpperCase()}</span>
                </h4>
                <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#64748B' }}>Department: {selectedCurriculum.departmentId?.name}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Effective From: {selectedCurriculum.batchId?.code}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Total Courses: {selectedCurriculum.courses?.length || 0}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Total Credits: {totalCredits}</p>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Description</h5>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                Official curriculum definition for {selectedCurriculum.batchId?.name || selectedCurriculum.batchId?.code} ensuring compliance with university academic standards and program learning outcomes.
              </p>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Key Features</h5>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Standardized course sequence</li>
                <li>Credit hour validation rules active</li>
                <li>Updated prerequisites for advanced topics</li>
              </ul>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAllCoursesModal(true)} style={{ color: '#2563EB', backgroundColor: 'transparent', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>View Full Specs</button>
            </div>
          </div>
        )}
      </div>
      </>
      );
      })()}

      {/* 3. COURSES & MAPPING ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr] gap-5">
        
        {/* Course List */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Course List {selectedCurriculum && `(v${selectedCurriculum.version})`}</h3>
            <select 
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                 <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '10px 8px' }}>COURSE CODE</th>
                  <th style={{ padding: '10px 8px' }}>COURSE TITLE</th>
                  <th style={{ padding: '10px 8px' }}>SEMESTER</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>CREDIT HOURS</th>
                  <th style={{ padding: '10px 8px' }}>TYPE</th>
                  <th style={{ padding: '10px 8px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {selectedCurriculum && selectedCurriculum.courses ? (
                  selectedCurriculum.courses
                    .filter(c => semesterFilter === 'all' || c.semester.toString() === semesterFilter)
                    .slice(0, 7).map(c => {
                    const lower = c.title.toLowerCase();
                    let type = 'Core';
                    let typeColor = '#2563EB';
                    let typeBg = '#EFF6FF';
                    if (lower.includes('lab') || c.creditHours === 1) { type = 'Lab'; typeColor = '#8B5CF6'; typeBg = '#F5F3FF'; }
                    else if (lower.includes('elective')) { type = 'Elective'; typeColor = '#F59E0B'; typeBg = '#FFFBEB'; }

                    return (
                      <tr key={c._id || c.code} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '10px 8px', color: '#0F172A', fontWeight: 600 }}>{c.code}</td>
                        <td style={{ padding: '10px 8px', color: '#64748B' }}>{c.title}</td>
                        <td style={{ padding: '10px 8px', color: '#64748B' }}>{c.semester}</td>
                        <td style={{ padding: '10px 8px', color: '#64748B', textAlign: 'center' }}>{c.creditHours}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: typeBg, color: typeColor }}>{type}</span>
                        </td>
                        <td style={{ padding: '10px 8px', color: '#10B981', fontWeight: 600, fontSize: '11px' }}>Active</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No courses selected</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button onClick={() => setShowAllCoursesModal(true)} style={{ color: '#2563EB', backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>View All Courses</button>
          </div>
        </div>

        {/* Course Mapping Equivalency */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Course Mapping (Equivalency)</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Migrate & Map courses between versions</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>From Version</p>
              <select style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', backgroundColor: '#F8FAFC' }}>
                <option>v1.0</option>
              </select>
            </div>
            <ArrowRightLeft size={16} color="#94A3B8" style={{ margin: '0 12px', marginTop: '16px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>To Version</p>
              <select style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', backgroundColor: '#F8FAFC' }}>
                <option>v{selectedCurriculum?.version || '2.0'}</option>
              </select>
            </div>
          </div>
          
          {/* Mock stats for the mapping interface as it is a specialized tool not fully implemented in backend yet */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>0</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Mapped</div>
            </div>
            <div style={{ width: '1px', backgroundColor: '#E2E8F0' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>0</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Partial</div>
            </div>
            <div style={{ width: '1px', backgroundColor: '#E2E8F0' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>0</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Unmapped</div>
            </div>
          </div>
          
          <button onClick={() => setShowMappingModal(true)} style={{ marginTop: 'auto', width: '100%', padding: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Manage Course Mapping
          </button>
        </div>

        {/* Curriculum Statistics */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Curriculum Statistics</h3>
          {selectedCurriculum && pieData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '180px', height: '180px', position: 'relative', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{selectedCurriculum.courses.length}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Total Courses</div>
                </div>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span style={{ color: '#475569', fontWeight: 500 }}>{d.name}</span>
                    </div>
                    <div style={{ color: '#0F172A', fontWeight: 600 }}>{d.value} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({d.credits} Cr)</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>No statistics available.</div>
          )}
        </div>

      </div>

      {/* MODALS */}
      
      {/* 1. Add Curriculum Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Add New Curriculum Version</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>Initialize a new curriculum structure.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCurriculumSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch Code</label>
                <select 
                  required 
                  value={addForm.batchId} 
                  onChange={e => setAddForm({...addForm, batchId: e.target.value})} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.code}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
                <select required value={addForm.departmentId} onChange={e => setAddForm({...addForm, departmentId: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}>
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Version</label>
                <input required type="text" placeholder="1.0" value={addForm.version} onChange={e => setAddForm({...addForm, version: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
              </div>
              
              <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <BookOpen size={20} color="#2563EB" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>A placeholder template course will be automatically added. You can add or modify real courses via the "View Full Specs" tool later.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Creating...' : 'Create Curriculum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View All Courses Modal */}
      {showAllCoursesModal && selectedCurriculum && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Master Course List</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>v{selectedCurriculum.version} • {selectedCurriculum.batchId?.name || selectedCurriculum.batchId?.code}</p>
              </div>
              <button onClick={() => setShowAllCoursesModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '14px 16px' }}>COURSE CODE</th>
                    <th style={{ padding: '14px 16px' }}>COURSE TITLE</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>SEM</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>CR</th>
                    <th style={{ padding: '14px 16px' }}>TYPE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCurriculum.courses && selectedCurriculum.courses.length > 0 ? (
                    selectedCurriculum.courses.map(c => {
                      const lower = c.title.toLowerCase();
                      let type = 'Core';
                      let typeColor = '#2563EB';
                      let typeBg = '#EFF6FF';
                      if (lower.includes('lab') || c.creditHours === 1) { type = 'Lab'; typeColor = '#8B5CF6'; typeBg = '#F5F3FF'; }
                      else if (lower.includes('elective')) { type = 'Elective'; typeColor = '#F59E0B'; typeBg = '#FFFBEB'; }

                      return (
                        <tr key={c._id || c.code} style={{ borderBottom: '1px solid #F8FAFC', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#F8FAFC' } }}>
                          <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>{c.code}</td>
                          <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 500 }}>{c.title}</td>
                          <td style={{ padding: '14px 16px', color: '#64748B', textAlign: 'center', fontWeight: 600 }}>{c.semester}</td>
                          <td style={{ padding: '14px 16px', color: '#64748B', textAlign: 'center', fontWeight: 600 }}>{c.creditHours}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: typeBg, color: typeColor }}>{type}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No courses exist in this curriculum.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total: {selectedCurriculum.courses?.length || 0} Courses</span>
               <button onClick={() => setShowAllCoursesModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#0F172A', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Manage Course Mapping Modal */}
      {showMappingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
             <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Course Equivalency Mapping</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>Map courses between active curriculum versions.</p>
              </div>
              <button onClick={() => setShowMappingModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
               <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B', fontSize: '13px' }}>
                 <strong>Admin Notice:</strong> Using external equivalency form temporarily for internal curriculum mapping migrations.
               </div>
               
               <EquivalencyForm 
                  canEdit={true} 
                  onSubmitEquivalency={(data) => {
                    console.log('Submitted equivalency mapping:', data);
                    alert('Equivalency mapped successfully! (Console Logged)');
                    setShowMappingModal(false);
                  }} 
               />
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Curriculum Modal */}
      {showEditModal && selectedCurriculum && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '850px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Edit Curriculum Courses</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>v{selectedCurriculum.version} • {selectedCurriculum.batchId?.name || selectedCurriculum.batchId?.code} Curriculum</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>CODE</th>
                      <th style={{ padding: '12px 16px' }}>TITLE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>SEM</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>CR</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editCourses.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{c.code}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{c.title}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{c.semester}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{c.creditHours}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button 
                            type="button"
                            onClick={() => setEditCourses(editCourses.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {editCourses.length === 0 && (
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No courses added yet. Add a course below.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>Add Course to Version</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Code (e.g. CS-203)"
                    value={newCourse.code}
                    onChange={e => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                    style={{ flex: 1, minWidth: '120px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Title (e.g. Database Systems)"
                    value={newCourse.title}
                    onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                    style={{ flex: 2, minWidth: '200px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                  <select 
                    value={newCourse.semester}
                    onChange={e => setNewCourse({ ...newCourse, semester: Number(e.target.value) })}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                  <select 
                    value={newCourse.creditHours}
                    onChange={e => setNewCourse({ ...newCourse, creditHours: Number(e.target.value) })}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    {[1,2,3,4].map(c => <option key={c} value={c}>{c} Credits</option>)}
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!newCourse.code || !newCourse.title) {
                        alert('Please fill in Code and Title');
                        return;
                      }
                      setEditCourses([...editCourses, newCourse]);
                      setNewCourse({ code: '', title: '', creditHours: 3, semester: 1 });
                    }}
                    style={{ padding: '10px 20px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Add Course
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleEditCurriculumSubmit}
                disabled={isSubmitting}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
