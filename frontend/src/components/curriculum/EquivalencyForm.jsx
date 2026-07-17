import React, { useState } from 'react';
import Select from 'react-select';

const EquivalencyForm = ({ onSubmitEquivalency, onCancel, canEdit = false }) => {
  const [form, setForm] = useState({
    externalCourseCode: '',
    externalCourseTitle: '',
    externalCreditHours: '',
    internalCourseCode: '',
    decision: 'Accepted'
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
    setForm({ externalCourseCode: '', externalCourseTitle: '', externalCreditHours: '', internalCourseCode: '', decision: 'Accepted' });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Credit Allocation</label>
          <input type="number" name="externalCreditHours" min={1} required disabled={!canEdit} value={form.externalCreditHours} onChange={handleInput} className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 disabled:bg-slate-50" placeholder="e.g. 3" />
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 mb-1 uppercase">Evaluation Action</label>
          <Select
            options={[
              { value: 'Accepted', label: 'Accepted / Exempted' },
              { value: 'Rejected', label: 'Rejected / Revoked' }
            ]}
            value={{ value: form.decision, label: form.decision === 'Accepted' ? 'Accepted / Exempted' : 'Rejected / Revoked' }}
            onChange={(opt) => handleInput({ target: { name: 'decision', value: opt.value } })}
            isDisabled={!canEdit}
            menuPlacement="auto"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: '8px',
                borderColor: state.isFocused ? '#3B82F6' : '#CBD5E1',
                boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
                fontSize: '12px',
                minHeight: '34px',
              }),
              menu: base => ({ ...base, fontSize: '12px', zIndex: 9999 }),
              option: base => ({ ...base, cursor: 'pointer' })
            }}
          />
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="w-full sm:w-1/3 py-2 bg-slate-100 text-slate-600 font-bold text-xs tracking-wider rounded-lg uppercase hover:bg-slate-200 transition-colors border border-slate-200">
              Cancel
            </button>
          )}
          <button type="submit" className="w-full sm:flex-1 py-2 bg-slate-900 text-white font-bold text-xs tracking-wider rounded-lg uppercase hover:bg-slate-800 transition-colors">
            Save Mapping
          </button>
        </div>
      )}
    </form>
  );
};

export default EquivalencyForm;