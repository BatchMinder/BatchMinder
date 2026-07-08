import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
  day: { type: String, required: true },
  timeSlot: { type: String, required: true },
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  room: { type: String, required: true },
  instructor: { type: String, required: true },
  batch: { type: String, required: true },
  semester: { type: Number },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }
}, { timestamps: true });

const Timetable = mongoose.model('Timetable', timetableSchema);
export default Timetable;
