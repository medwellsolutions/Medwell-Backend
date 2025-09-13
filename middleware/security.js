const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limiting
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// Auth rate limiting (stricter)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs for auth routes
  'Too many authentication attempts from this IP, please try again later'
);

// Password reset rate limiting (very strict)
const passwordResetLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // limit each IP to 3 password reset requests per hour
  'Too many password reset attempts from this IP, please try again later'
);

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  securityHeaders
};
