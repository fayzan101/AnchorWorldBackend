import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Signup only — allow multiple new accounts within a short window. */
export const registerLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many signups, please try again in a couple of minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: 'Too many messages sent, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
});