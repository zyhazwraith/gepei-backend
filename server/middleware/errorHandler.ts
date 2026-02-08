import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { ErrorCodes, ErrorCodeToMessage } from '../../shared/errorCodes.js';

// 错误码映射表
const ERROR_CODE_MAP: Record<string, number> = {
  'UNAUTHORIZED': ErrorCodes.TOKEN_INVALID,
  'INVALID_TOKEN': ErrorCodes.TOKEN_INVALID,
  'TOKEN_EXPIRED': ErrorCodes.TOKEN_INVALID,
  'USER_NOT_FOUND': ErrorCodes.USER_NOT_FOUND,
  'PHONE_EXISTS': ErrorCodes.PHONE_EXISTS,
  'INVALID_PHONE': ErrorCodes.INVALID_PARAMS,
  'INVALID_PASSWORD': ErrorCodes.INVALID_CREDENTIALS,
  'VALIDATION_ERROR': ErrorCodes.VALIDATION_ERROR,
  'FORBIDDEN': ErrorCodes.PERMISSION_DENIED,
  'NOT_FOUND': ErrorCodes.USER_NOT_FOUND,
  'USER_BANNED': ErrorCodes.USER_BANNED,
};

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
    // 优先使用映射表，如果是 400 但未映射则默认为参数错误
    let numericCode = ERROR_CODE_MAP[err.code];
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
  console.error('Unexpected error:', err);
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
