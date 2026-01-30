import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { ErrorCodes, ErrorCodeToMessage } from '../../shared/errorCodes.js';

// 全局错误处理中间件
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 检查是否是 ZodError (即使被包装过)
  // 注意：instanceof 检查在测试环境可能会失败（如果使用了不同的类实例），所以我们主要依赖属性检查
  const isValidationError = 
    err instanceof ValidationError || 
    err.name === 'ValidationError' || 
    (err as AppError).code === 'VALIDATION_ERROR';

  if (isValidationError || err instanceof AppError || err.name === 'ZodError') {
    
    // 如果是 ValidationError，直接使用其 message，不进行任何映射
    if (isValidationError) {
       // 确保 message 存在，且不是默认的 "ValidationError"
       // 注意：在 Vitest 环境中，err.message 似乎被强制覆盖或继承行为异常
       // 我们尝试从 err 对象本身或者其原型链上找回原始信息，或者直接信任 controller 层的逻辑
       
       let msg = err.message;
       
       // 终极修复：如果 msg 是 '参数校验失败'，且 err 是 AppError，尝试获取它的原始 message
       // 但在 AppError 构造函数中，super(message) 已经设置了 message
       // 问题可能出在 vitest 环境下的类继承行为
       
       // 强制在此处返回，避免后续逻辑覆盖
       // 注意：这里我们不再试图从 err.message 恢复，而是假设如果它是 "参数校验失败"，那可能是默认值
       // 但在 controller 中我们是这样抛出的：new ValidationError(msg, 'VALIDATION_ERROR')
       // 其中 msg 是来自 Zod 的详细信息。
       
       // 调试发现：在 Vitest 中，errorHandler 接收到的 err.message 似乎被某种机制重置了
       // 或者 AppError/ValidationError 的构造函数在转译后行为不一致
       
       // 让我们尝试直接检查 err 对象是否包含 Zod 的原始错误信息，但这需要我们把原始错误挂载上去
       // 既然我们在 controller 里已经手动处理了 ZodError 并发送了响应，
       // 这里为什么还会被执行？
       // 啊！Controller 里的 return res.status... 并没有阻止后续中间件执行？
       // 不，Controller 里 return 了，所以不会执行 next(error)
       // 等等，Controller 代码是：
       // return res.status(400).json(...)
       
       // 如果 Controller 直接返回了响应，那么 errorHandler 根本不应该被调用！
       // 除非...测试用例里触发错误的路径并不是 Controller 里的那个 if 分支？
       // 或者 Express 的行为是...？
       
       // 让我们再看一眼 Controller 代码。
       // Controller: try { ... } catch (error) { if (ZodError) { return res... } next(error) }
       
       // 如果测试失败，说明 Controller 里的 if (error instanceof z.ZodError) 没有命中！
       // 这意味着抛出的错误不是 ZodError 的实例？
       // 在 createCustomOrderSchema.parse(req.body) 中抛出的应该是 ZodError。
       
       res.status(400).json({
           code: ErrorCodes.VALIDATION_ERROR,
           message: msg,
           data: null
       });
       return;
    }

    // 默认错误码
    let code = (err as AppError).code || ErrorCodes.INTERNAL_ERROR;
    let numericCode: number = ErrorCodes.INTERNAL_ERROR;

    // 映射错误码
    const errorCodeMap: Record<string, number> = {
      'UNAUTHORIZED': ErrorCodes.TOKEN_INVALID,
      'INVALID_TOKEN': ErrorCodes.TOKEN_INVALID,
      'TOKEN_EXPIRED': ErrorCodes.TOKEN_INVALID,
      'USER_NOT_FOUND': ErrorCodes.USER_NOT_FOUND,
      'PHONE_EXISTS': ErrorCodes.PHONE_EXISTS,
      'INVALID_PHONE': ErrorCodes.INVALID_PARAMS,
      'INVALID_PASSWORD': ErrorCodes.INVALID_CREDENTIALS,
      'VALIDATION_ERROR': ErrorCodes.VALIDATION_ERROR,
      'FORBIDDEN': ErrorCodes.PERMISSION_DENIED,
      'NOT_FOUND': ErrorCodes.USER_NOT_FOUND, // Map generic Not Found to 404
    };

    if (errorCodeMap[code]) {
      numericCode = errorCodeMap[code];
    } else if ((err as AppError).statusCode === 400) {
      // 兜底：如果是 400 错误，视为参数错误，但如果已经是 VALIDATION_ERROR (2002) 则保持
      if (code !== 'VALIDATION_ERROR') {
          numericCode = ErrorCodes.INVALID_PARAMS;
      } else {
          numericCode = ErrorCodes.VALIDATION_ERROR;
      }
    }

    // 优先使用 err.message
    let message = err.message || ErrorCodeToMessage[numericCode] || '未知错误';
    
    // 如果是 VALIDATION_ERROR 并且 message 是默认的 "字段验证错误"，尝试使用 err.message
    if (numericCode === ErrorCodes.VALIDATION_ERROR && message === '字段验证错误') {
         message = err.message;
    }

    // 针对 Zod 错误的终极防守：如果 message 还是不对，检查 err.message 是否为空
    if (numericCode === ErrorCodes.VALIDATION_ERROR) {
         // 如果是 VALIDATION_ERROR，无论如何都要尝试用 err.message
         // 因为 VALIDATION_ERROR 通常包含动态的错误详情
         if (err.message && err.message !== 'ValidationError' && err.message !== '参数校验失败') {
            message = err.message;
         }
    }
    
    // 如果 message 仍然是 "参数校验失败" 且 err.message 有内容，强制覆盖
    // 这是为了修复测试中的问题，ValidationError 的 message 似乎没有被正确传递
    if (message === '参数校验失败' && err.message && err.message !== 'ValidationError') {
        message = err.message;
    }

    // 最后的手段：如果 message 依然是 generic 的，并且我们知道这是一个 ZodError (通过名称或属性)
    // 那么可能需要从 err 对象中提取更多信息，或者假设 err.message 丢失了
    // 在这里我们打印一下，方便调试 (生产环境可移除)
    // console.log('Final Error Message:', message, 'Original:', err.message, 'Code:', numericCode);
    
    // 强制修复：如果 err 是 ValidationError 实例，它的 message 应该就是我们想要的
    if (err instanceof ValidationError) {
        message = err.message;
    }

    errorResponse(res, numericCode, message);
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
