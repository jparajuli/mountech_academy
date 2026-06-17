import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.error("Global Error Handler caught an error:", err);
  } else {
    console.error("Error:", err.message || err);
  }

  const statusCode = err.status || err.statusCode || 500;

  return res.status(statusCode).json({
    error: "An unexpected server error occurred.",
    details: err.message
  });
}
