import mongoose from 'mongoose';

// Per SDD Section 9.2 (Module 6 — Reporting & Analytics) data dictionary.
// One record per one-click transcript generated (FE-35 / FR-6.4), so official
// transcript issuance is logged server-side rather than existing only as an
// in-browser PDF the backend never sees.
const transcriptSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Please provide student ID'],
    },
    overallCGPA: {
        type: Number,
        required: true,
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please specify who generated this transcript'],
    },
    generatedDate: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const Transcript = mongoose.model('Transcript', transcriptSchema);
export default Transcript;
