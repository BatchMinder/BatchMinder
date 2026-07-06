import React, { useState } from 'react';

const EquivalencyForm = ({ onSubmitEquivalency, canEdit = false }) => {
  const [form, setForm] = useState({
    externalCourseCode: '',
    externalCourseTitle: '',
    externalCreditHours: '',
    internalCourseCode: '',
    decision: 'Accepted',
    justification: ''
  });

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmitEquivalency?.({
      ...form,
      externalCreditHours: Number(form.externalCreditHours),
      timestamp: new Date().toISOString()
    });
    setForm({ externalCourseCode: '', externalCourseTitle: '', externalCreditHours: '', internalCourseCode: '', decision: 'Accepted', justification: '' });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Origin Course Code</label>
          <input type="text" name="externalCourseCode" required disabled={!canEdit} value={form.externalCourseCode} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="e.g. CS102" />
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Equivalent Mapped Code</label>
          <input type="text" name="internalCourseCode" required disabled={!canEdit} value={form.internalCourseCode} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="e.g. CS-101" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Migrated Course Title</label>
        <input type="text" name="externalCourseTitle" required disabled={!canEdit} value={form.externalCourseTitle} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="e.g. Fundamental Programming Paradigms" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Credit Allocation</label>
          <input type="number" name="externalCreditHours" inputProps={{ min: 1 }} required disabled={!canEdit} value={form.externalCreditHours} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="e.g. 3" />
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Evaluation Action</label>
          <select name="decision" disabled={!canEdit} value={form.decision} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 bg-white">
            <option value="Accepted">Accepted / Exempted</option>
            <option value="Rejected">Rejected / Revoked</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Advisory Board Justification Note</label>
        <textarea name="justification" rows={2} required disabled={!canEdit} value={form.justification} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="Provide clear transfer syllabus mapping details..." />
      </div>
      {canEdit && (
        <button type="submit" className="w-full py-2 bg-slate-900 text-white font-bold text-xs tracking-wider rounded-lg uppercase hover:bg-slate-800 transition-colors">
          Commit Decisions Audit Log
        </button>
      )}
    </form>
  );
};

export default EquivalencyForm;