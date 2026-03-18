import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error:', new Date().toISOString(), ']', err);

  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ success: false, message });
}
