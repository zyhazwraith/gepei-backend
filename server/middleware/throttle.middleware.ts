import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { runtimeConfig } from '../config/runtime.config.js';
import { getClientIp } from '../utils/request.js';
import { Context } from '../utils/context.js';
import { logger } from '../lib/logger.js';

function getPathWithoutQuery(req: Request): string {
  const raw = req.originalUrl || req.url;
  return raw.split('?')[0] || '/';
}

function createAuthRateLimit(max: number, keyPrefix: string) {
  return rateLimit({
    windowMs: runtimeConfig.throttle.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `${keyPrefix}:${getClientIp(req) || 'unknown'}`,
    handler: (req: Request, res: Response) => {
      const store = Context.get();
      const ip = getClientIp(req) || 'unknown';

      logger.security(
        `throttle_hit ${req.method} ${getPathWithoutQuery(req)} ${logger.kv({ ip, rid: store?.requestId ?? '-', uid: req.user?.id ?? store?.operatorId ?? '-', limit: max })}`
      );

      res.status(429).json({
        success: false,
        message: runtimeConfig.throttle.message,
      });
    },
  });
}

export const authThrottle = createAuthRateLimit(runtimeConfig.throttle.authMax, 'auth');

export const verificationCodeThrottle = createAuthRateLimit(
  Math.min(runtimeConfig.throttle.authMax, runtimeConfig.throttle.verificationCodeMax),
  'auth-verification-code'
);
