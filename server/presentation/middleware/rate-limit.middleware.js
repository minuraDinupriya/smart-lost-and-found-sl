const { rateLimit } = require('express-rate-limit');

const minute = 60_000;
const byUser = req => req.userId;
const createLimiter = (identifier, limit, windowMs, options = {}) => rateLimit({
  identifier,
  limit,
  windowMs,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  ...options,
});

// Public authentication routes share the client IP budget, including IPv6 grouping.
const limitAuthentication = createLimiter('authentication', 30, 15 * minute, {
  // Express honors forwarded IPs only with explicitly configured proxy trust.
  validate: { xForwardedForHeader: false, forwardedHeader: false },
});
// Run after verifyToken so these quotas are tied to the signed-in user.
const limitOwnershipVerification = createLimiter('ownership-verification', 10, 10 * minute, { keyGenerator: byUser });
const limitAiRequests = createLimiter('ai-analysis', 8, 5 * minute, { keyGenerator: byUser });

module.exports = { limitAuthentication, limitOwnershipVerification, limitAiRequests };
