import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

/**
 * Drag‑and‑drop zone for CSV/Excel uploads.
 * Props:
 *   - onUpload: (File) => void – called with the dropped file
 *   - accept: string – MIME types to accept (default: ".csv,.xlsx,.xls")
 */
export default function FileDropzone({ onUpload, accept = ".csv,.xlsx,.xls" }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length) {
        onUpload?.(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isFileDialogActive } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx", ".xls"],
      },
      multiple: false,
    });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors
        ${isDragActive || isFileDialogActive
          ? "border-brandAccent bg-brandAccent/10"
          : "border-gray-300 bg-white"}
        cursor-pointer`}
    >
      <input {...getInputProps()} />
      <svg
        className="w-12 h-12 text-gray-400 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4h10v12M5 20h14"
        />
      </svg>
      <p className="text-sm text-gray-600">
        {isDragActive ? "Drop the file here …" : "Drag & drop a CSV/Excel file, or click to select"}
      </p>
    </div>
  );
}
