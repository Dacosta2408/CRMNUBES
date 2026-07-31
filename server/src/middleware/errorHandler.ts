import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] Handler caught exception on ${req.method} ${req.url}:`, err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected server error occurred.";

  res.status(statusCode).json({
    error: {
      message: process.env.NODE_ENV === "production" ? "Server operation failed. Please try again or check server logs." : message,
      code: err.code || "INTERNAL_SERVER_ERROR",
      timestamp: new Date().toISOString()
    }
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
