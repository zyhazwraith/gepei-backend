import { Request, Response, NextFunction } from 'express';
import { Context } from '../utils/context.js';
import { getClientIp } from '../utils/request.js';
import { logger } from '../lib/logger.js';

function getPathWithoutQuery(req: Request): string {
  const raw = req.originalUrl || req.url;
  return raw.split('?')[0] || '/';
}

export function apiLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const path = getPathWithoutQuery(req);
    const ip = getClientIp(req);
    const store = Context.get();
    const reqId = store?.requestId ?? '-';
    const userId = req.user?.id ?? store?.operatorId ?? '-';

    logger.api(
      `${req.method} ${path} ${res.statusCode} ${durationMs.toFixed(1)}ms ${logger.kv({ ip, rid: reqId, uid: userId })}`
    );
  });

  next();
}
