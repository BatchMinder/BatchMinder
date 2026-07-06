import mongoose from 'mongoose';

const uploadErrorSchema = new mongoose.Schema({
  row: { type: Number, required: true },
  field: { type: String, required: true },
  message: { type: String, required: true },
});

const parsedRowSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  batchCode: { type: String, required: true },
  cgpa: { type: Number, default: 0 },
}, { _id: false });

const uploadSchema = new mongoose.Schema({
  fileName: { type: String, required: true, trim: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
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
