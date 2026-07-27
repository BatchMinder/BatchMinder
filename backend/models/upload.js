import mongoose from 'mongoose';

const uploadErrorSchema = new mongoose.Schema({
  row: { type: Number, required: true },
  field: { type: String, required: true },
  message: { type: String, required: true },
});

// Batch, semester and intake session are now selected once for the whole
// file via the form (not repeated per row), so a parsed row only carries
// actual per-student data.
const parsedRowSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  cgpa: { type: Number, default: 0 },
}, { _id: false });

const uploadSchema = new mongoose.Schema({
  fileName: { type: String, required: true, trim: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  intakeSession: { type: String, enum: ['Spring', 'Fall'], default: 'Fall' },
  status: { type: String, enum: ['processing', 'complete', 'failed'], default: 'processing' },
  totalRecords: { type: Number, default: 0 },
  validRecords: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  errors: [uploadErrorSchema],
  parsedData: [parsedRowSchema],
  createdAt: { type: Date, default: Date.now },
});

const Upload = mongoose.model('Upload', uploadSchema);
export default Upload;