import mongoose from 'mongoose';

// Per SDD Section 9.2 (Module 6 — Reporting & Analytics) data dictionary.
// Persists a record every time a batch/summary report is generated server-side,
// so generation is auditable and reproducible rather than a stateless client-side artifact.
const reportSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
    },
    reportType: {
        type: String,
        enum: ['BATCH_SUMMARY', 'MIGRATION_AUDIT', 'PERFORMANCE_TREND'],
        required: [true, 'Please specify report type'],
    },
    parameters: {
        semester: { type: String },
        academicYear: { type: String },
        cgpaRange: { type: String },
        enrollmentStatus: { type: String },
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please specify who generated this report'],
    },
    generatedOn: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
