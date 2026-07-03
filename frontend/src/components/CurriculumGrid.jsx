import React from "react";

/**
 * Simple visual tree for core & elective requirements.
 * Props:
 *   - curriculum: [{ id, title, required, children? }]
 */
export default function CurriculumGrid({ curriculum = [] }) {
  const renderNode = (node, depth = 0) => (
    <li key={node.id} className="mb-2">
      <div className="flex items-center">
        <span
          className={`ml-${depth * 4} inline-block w-2 h-2 rounded-full ${node.required ? "bg-brandAccent" : "bg-gray-300"} mr-2`}
        />
        <span className="text-sm font-medium text-gray-800">{node.title}</span>
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="ml-4 border-l border-gray-200 pl-2">
          {node.children.map((c) => renderNode(c, depth + 1))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Curriculum Overview</h3>
      <ul className="list-none">
        {curriculum.map((c) => renderNode(c))}
      </ul>
    </div>
  );
}
