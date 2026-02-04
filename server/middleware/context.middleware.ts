import { Request, Response, NextFunction } from 'express';
import { Context } from '../utils/context.js';
import { getClientIp } from '../utils/request.js';
import { nanoid } from 'nanoid';

export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const store = {
    operatorId: req.user?.id, // Assuming auth middleware runs before this or logic handles partial state
    ipAddress: getClientIp(req),
    requestId: nanoid()
  };

  Context.run(store, () => {
    next();
  });
};
