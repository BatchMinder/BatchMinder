import mongoose from 'mongoose';

const datesheetSchema = new mongoose.Schema({
  date: { type: String, required: true },
  examSlot: { type: String, required: true },
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  room: { type: String, required: true },
  invigilator: { type: String, required: true },
  batch: { type: String, required: true },
  semester: { type: Number, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }
}, { timestamps: true });

const Datesheet = mongoose.model('Datesheet', datesheetSchema);
export default Datesheet;