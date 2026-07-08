import mongoose from 'mongoose';

const riskPredictionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['CRITICAL', 'WARNING', 'GOOD STANDING'],
    required: true
  },
  riskScore: {
    type: Number,
    required: true
  },
  predictedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const RiskPrediction = mongoose.model('RiskPrediction', riskPredictionSchema);
export default RiskPrediction;
