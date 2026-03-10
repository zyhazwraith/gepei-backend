import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { logger } from '../lib/logger.js';

// 全局错误处理中间件
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Zod 验证错误
  if (err instanceof ZodError) {
    const msg = err.issues.map(i => i.message).join(', ');
    errorResponse(res, ErrorCodes.VALIDATION_ERROR, msg, 400);
    return;
  }

  // 2. AppError (业务逻辑错误)
  if (err instanceof AppError) {
    let numericCode = Number.isFinite(err.code) ? err.code : undefined;
    if (!numericCode && err.statusCode === 400) {
      numericCode = ErrorCodes.INVALID_PARAMS;
    }

    errorResponse(
      res, 
      numericCode || ErrorCodes.INTERNAL_ERROR, 
      err.message, 
      err.statusCode
    );
    return;
  }

  // 3. 未知错误
  logger.error('Unexpected error', err instanceof Error ? err.stack || err.message : String(err));
  errorResponse(res, ErrorCodes.INTERNAL_ERROR);
}

// 404 处理中间件
export function notFoundHandler(req: Request, res: Response): void {
  errorResponse(res, ErrorCodes.INVALID_PARAMS, '请求的资源不存在');
}

// 异步错误包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
