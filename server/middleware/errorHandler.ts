import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ErrorCodes, ErrorCodeToHttpStatus, ErrorCodeToMessage } from '../../shared/errorCodes.js';
import { errorResponse } from '../utils/response.js';

// 全局错误处理中间件
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    // 将旧的字符串错误码映射到新的数字错误码
    const errorCodeMap: Record<string, number> = {
      'UNAUTHORIZED': ErrorCodes.TOKEN_INVALID,
      'INVALID_TOKEN': ErrorCodes.TOKEN_INVALID,
      'TOKEN_EXPIRED': ErrorCodes.TOKEN_INVALID,
      'USER_NOT_FOUND': ErrorCodes.USER_NOT_FOUND,
      'PHONE_EXISTS': ErrorCodes.PHONE_EXISTS,
      'INVALID_PHONE': ErrorCodes.INVALID_PARAMS,
      'INVALID_PASSWORD': ErrorCodes.INVALID_CREDENTIALS,
    };

    const numericCode = errorCodeMap[err.code] || ErrorCodes.INTERNAL_ERROR;
    errorResponse(res, numericCode, err.message);
    return;
  }

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
