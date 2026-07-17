import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // SHA-256 hash of the refresh token JWT — raw token is never stored
  tokenHash: {
    type: String,
    required: true,
    index: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  userAgent: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Matches the refresh token's own 7-day JWT expiry
  expiresAt: {
    type: Date,
    required: true,
  },
});

// TTL index — MongoDB automatically deletes the session document once expiresAt passes,
// so revoked/expired sessions don't pile up indefinitely.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
