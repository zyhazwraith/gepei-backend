import { ErrorCodes, ErrorCodeToHttpStatus } from '../../shared/errorCodes';
export { ErrorCodes as ERROR_CODES } from '../../shared/errorCodes';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public code: number;
  public isOperational: boolean;

  // Refactored: code is mandatory, statusCode is optional (auto-lookup)
  constructor(message: string, code: number, statusCode?: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode || ErrorCodeToHttpStatus[code] || 500;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: number = ErrorCodes.VALIDATION_ERROR) {
    super(message, code); // Auto-lookup 400
    this.message = message;
    this.name = 'ValidationError'; 
    Object.setPrototypeOf(this, ValidationError.prototype); 
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, code: number = ErrorCodes.INVALID_CREDENTIALS) {
    super(message, code); // Auto-lookup 401
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: number = ErrorCodes.USER_NOT_FOUND) {
    super(message, code); // Auto-lookup 404
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: number = ErrorCodes.INVALID_PARAMS) { 
    super(message, code); // Auto-lookup 409 (Wait, INVALID_PARAMS is 400. Need override?)
    // If we want 409, we should manually pass it or use a 409-mapped code.
    // But ErrorCodes.INVALID_PARAMS maps to 400.
    // Let's force 409 if intended.
    this.statusCode = 409; 
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code: number = ErrorCodes.PERMISSION_DENIED) {
    super(message, code); // Auto-lookup 403
  }
}
