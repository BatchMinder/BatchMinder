import React, { useState, useEffect } from "react";

/**
 * Modal dialog for viewing / editing a single student.
 * Props:
 *   - open: boolean – show/hide the modal
 *   - onClose: () => void – called when the modal is dismissed
 *   - student: { id, name, email, cohort } – data to display/edit
 *   - onSave: (updatedStudent) => void – called with edited data
 */
export default function StudentModal({ open, onClose, student, onSave }) {
  const [form, setForm] = useState(student || {});

  useEffect(() => {
    setForm(student || {});
  }, [student]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(form);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fadeIn">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {student?.id ? "Edit Student" : "Add Student"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Name</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded border-gray-300 focus:border-brandAccent focus:ring-brandAccent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Email</label>
            <input
              name="email"
              type="email"
              value={form.email || ""}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded border-gray-300 focus:border-brandAccent focus:ring-brandAccent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Cohort</label>
            <input
              name="cohort"
              value={form.cohort || ""}
              onChange={handleChange}
              className="mt-1 w-full rounded border-gray-300 focus:border-brandAccent focus:ring-brandAccent"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-brandAccent text-white hover:bg-brandNavy"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
