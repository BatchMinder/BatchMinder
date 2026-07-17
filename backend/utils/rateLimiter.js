// Simple in-memory sliding-window rate limiter. Fine for a single-instance
// deployment; if BatchMinder ever runs multiple server instances behind a
// load balancer, swap this for a Redis-backed limiter instead.

const buckets = new Map(); // key -> array of request timestamps (ms)

// Periodically clear out stale buckets so this doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets.entries()) {
    const recent = timestamps.filter(t => now - t < 15 * 60 * 1000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}, 5 * 60 * 1000).unref();

/**
 * @param {number} max - max requests allowed per window
 * @param {number} windowMs - window size in milliseconds
 */
export const rateLimit = (max, windowMs) => (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();

  const timestamps = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= max) {
    return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  next();
};
