import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err.stack);

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const message = 'Database error';
    error = { message, statusCode: 400 } as ApiError;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = 'Validation error';
    error = { message, statusCode: 400 } as ApiError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 } as ApiError;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
