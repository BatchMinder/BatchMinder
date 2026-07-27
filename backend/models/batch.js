import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide batch code'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  startYear: {
    type: Number,
    required: [true, 'Please specify start year'],
  },
  intakeSession: {
    type: String,
    enum: ['Spring', 'Fall'],
    default: 'Fall',
  },
  // Pinned at batch-creation time to whichever curriculum version was
  // 'active' for the department at that moment. Publishing a NEW curriculum
  // version later does NOT move this — the batch keeps following whatever
  // it started under, so students already partway through aren't
  // retroactively affected by a plan revision. Only an explicit admin
  // reassignment changes it.
  curriculumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curriculum',
    default: null,
  },
  advisor: {
    type: String,
    default: 'Unassigned',
    trim: true,
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['Allocated', 'Pending', 'Unassigned'],
    default: 'Unassigned',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Batch = mongoose.model('Batch', batchSchema);
export default Batch;
