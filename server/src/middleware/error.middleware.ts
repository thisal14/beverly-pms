import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error:', new Date().toISOString(), ']', err);

  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Fallback for unexpected errors — do not leak internal details
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ success: false, message });
}
