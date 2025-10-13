import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class APIError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((error as any).errors).map((err: any) => err.message).join(', ');
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = '無效的 ID 格式';
  } else if ((error as any).code === 11000) {
    statusCode = 400;
    const field = Object.keys((error as any).keyValue)[0];
    message = `${field} 已存在`;
  }

  res.status(statusCode).json({
    error: true,
    message,
    data: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};