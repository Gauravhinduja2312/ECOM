const rateLimit = require('express-rate-limit');

const standardWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitProfile = String(process.env.RATE_LIMIT_PROFILE || 'prod').toLowerCase();

const defaultsByProfile = {
  prod: {
    global: 300,
    payment: 40,
    createOrder: 20,
    verifyPayment: 12,
    admin: 120,
  },
  dev: {
    global: 1200,
    payment: 240,
    createOrder: 120,
    verifyPayment: 80,
    admin: 600,
  },
};

const activeDefaults = defaultsByProfile[rateLimitProfile] || defaultsByProfile.prod;

function readLimit(envKey, fallback) {
  const raw = process.env[envKey];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const globalMax = readLimit('RATE_LIMIT_GLOBAL_MAX', activeDefaults.global);
const paymentMax = readLimit('RATE_LIMIT_PAYMENT_MAX', activeDefaults.payment);
const createOrderMax = readLimit('RATE_LIMIT_CREATE_ORDER_MAX', activeDefaults.createOrder);
const verifyPaymentMax = readLimit('RATE_LIMIT_VERIFY_PAYMENT_MAX', activeDefaults.verifyPayment);
const adminMax = readLimit('RATE_LIMIT_ADMIN_MAX', activeDefaults.admin);

const globalLimiter = rateLimit({
  windowMs: standardWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: standardWindowMs,
  max: paymentMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please try again shortly.' },
});

const createOrderLimiter = rateLimit({
  windowMs: standardWindowMs,
  max: createOrderMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many create-order attempts. Please try again shortly.' },
});

const verifyPaymentLimiter = rateLimit({
  windowMs: standardWindowMs,
  max: verifyPaymentMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment verification attempts. Please try again shortly.' },
});

const adminLimiter = rateLimit({
  windowMs: standardWindowMs,
  max: adminMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please slow down and retry.' },
});

module.exports = {
  globalLimiter,
  paymentLimiter,
  createOrderLimiter,
  verifyPaymentLimiter,
  adminLimiter,
};
