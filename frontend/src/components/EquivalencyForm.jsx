import React, { useState } from "react";

/**
 * Form for mapping a source course to a target curriculum item.
 * Props:
 *   - sourceCourses: [{ id, name }]
 *   - targetItems: [{ id, name }]
 *   - onMap: ({ sourceId, targetId }) => void
 */
export default function EquivalencyForm({ sourceCourses = [], targetItems = [], onMap }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (sourceId && targetId) {
      onMap?.({ sourceId, targetId });
      setSourceId("");
      setTargetId("");
    }
  };

  const isValid = sourceId && targetId;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 bg-white rounded-xl shadow-sm p-5">
      <h4 className="text-md font-semibold text-gray-800 mb-2">Map Course Equivalency</h4>

      <select
        value={sourceId}
        onChange={(e) => setSourceId(e.target.value)}
        className="rounded border-gray-300 focus:border-brandAccent focus:ring-brandAccent"
        required
      >
        <option value="">Select source course</option>
        {sourceCourses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="rounded border-gray-300 focus:border-brandAccent focus:ring-brandAccent"
        required
      >
        <option value="">Select target requirement</option>
        {targetItems.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!isValid}
        className={`px-4 py-2 rounded text-white ${isValid ? "bg-brandAccent hover:bg-brandNavy" : "bg-gray-300 cursor-not-allowed"}`}
      >
        Save Mapping
      </button>
    </form>
  );
}
