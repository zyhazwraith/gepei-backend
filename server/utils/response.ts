/**
 * API响应工具函数
 * 符合API设计文档 V1.2
 */

import { Response } from 'express';
import { ErrorCodes, ErrorCodeToHttpStatus, ErrorCodeToMessage } from '../../shared/errorCodes';
import { ApiResponse } from '../../shared/types';

/**
 * 成功响应
 */
export function successResponse<T>(res: Response, data: T, message: string = 'success'): Response {
  const response: ApiResponse<T> = {
    code: ErrorCodes.SUCCESS,
    message,
    data,
  };
  return res.status(200).json(response);
}

/**
 * 错误响应
 */
export function errorResponse(
  res: Response,
  code: number,
  message?: string,
  httpStatus?: number
): Response {
  const response: ApiResponse = {
    code,
    message: message || ErrorCodeToMessage[code] || '未知错误',
  };
  
  const status = httpStatus || ErrorCodeToHttpStatus[code] || 500;
  return res.status(status).json(response);
}
