import crypto from 'crypto';

// We never store the raw refresh token in the DB — only its hash, so a DB leak
// alone can't be used to replay sessions.
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
